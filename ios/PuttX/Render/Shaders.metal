// RealityKit surface shaders for what a stock material cannot do (src/game.js patchTurf, ground):
// the turf's mowing stripes, macro mottle and baked contact shade, and the ground's baked shade.
// The baked shade (the web's grey vertex colour) arrives in uv1.x.
#include <metal_stdlib>
#include <RealityKit/RealityKit.h>
using namespace metal;

constexpr sampler tiled(address::repeat, filter::linear, mip_filter::linear, max_anisotropy(8));

static float h21(float2 p) { return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453); }
static float vnoise(float2 p) {
    float2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + float2(1, 0)), f.x), mix(h21(i + float2(0, 1)), h21(i + float2(1, 1)), f.x), f.y);
}

/// how much of the detail a pixel can hold: 1 near, 0 where a pixel spans a feature of `size` metres
static float detail(float2 wp, float size) { float w = length(fwidth(wp)); return clamp(1.5 - w / size * 2.0, 0.0, 1.0); }

/// custom_parameter: (along.x, along.z, stripe strength, stripe width)
[[visible]]
void turfSurface(realitykit::surface_parameters params) {
    auto geo = params.geometry();
    float2 uv = geo.uv0();
    uv.y = 1.0 - uv.y;
    float shade = geo.uv1().x;
    float3 wp = geo.world_position();
    float4 cp = params.uniforms().custom_parameter();
    float2 along = normalize(cp.xy + float2(1e-6, 0));

    half3 tex = params.textures().base_color().sample(tiled, uv).rgb;
    half3 base = tex * half3(params.material_constants().base_color_tint());

    // mowing stripes: each band's blades lean the way it was cut, light leaning away, dark toward you
    float2 across = float2(-along.y, along.x);
    float mown = clamp(sin(dot(wp.xz, across) * M_PI_F / cp.w) * 6.0, -1.0, 1.0);
    float3 toCamera = -geo.view_direction();
    float2 toCam = normalize(toCamera.xz + float2(1e-4, 0));
    float away = -mown * dot(along, toCam);
    float macro = vnoise(wp.xz * 0.35) * 0.6 + vnoise(wp.xz * 1.7) * 0.4;
    // blades: fine streaks laid the way the band was mown, and patches greener or straw-tipped, faded
    // out where a pixel holds more than a blade so the far turf never shimmers
    float bladeNear = detail(wp.xz, 0.006);
    float2 q = float2(dot(wp.xz, along), dot(wp.xz, across));
    float blade = (vnoise(float2(q.x * 90.0, q.y * 900.0)) - 0.5) * bladeNear;
    float tuft = (vnoise(wp.xz * 26.0) - 0.5) * detail(wp.xz, 0.03);
    float patch = smoothstep(0.35, 0.85, vnoise(wp.xz * 0.9 + 11.0));
    float k = shade * (1.0 + cp.z * away) * (0.93 + 0.14 * macro) * (1.0 + 0.16 * blade + 0.1 * tuft);
    // the web's turf is a physical material with a pale-green sheen (0.3): it lifts and softens the
    // felt; its colour comes in the emissive slot, and nothing here glows
    half3 sheen = half3(params.material_constants().emissive_color()) * 0.3h;
    base = mix(base, base * half3(1.12h, 1.06h, 0.78h), half(patch * 0.22));
    params.surface().set_base_color(base * half(k) + sheen * half(shade));
    params.surface().set_emissive_color(half3(0.0h));

    half3 n = params.textures().normal().sample(tiled, uv).rgb * 2.0h - 1.0h;
    n.xy *= 0.55h;
    n.xy += half2(half(blade * 0.35), half(tuft * 0.25));
    params.surface().set_normal(float3(normalize(n)));
    float rough = params.material_constants().roughness_scale() + 0.06 * (0.5 - macro) - 0.04 * away;
    params.surface().set_roughness(half(clamp(rough, 0.0, 1.0)));
    params.surface().set_metallic(0.0h);
}

/// custom_parameter: (texture tiles across the plane, camera x, camera z, fog far); the fog colour
/// comes in the emissive slot. The web fogs the distance toward the horizon, linearly from 0.29 of far.
[[visible]]
void groundSurface(realitykit::surface_parameters params) {
    auto geo = params.geometry();
    float4 cp = params.uniforms().custom_parameter();
    float2 uv = geo.uv0() * cp.x;
    uv.y = 1.0 - uv.y;
    float shade = geo.uv1().x;
    float d = distance(geo.world_position().xz, cp.yz);
    float fog = cp.w > 0.0 ? clamp((d - cp.w * 0.29) / (cp.w * 0.71), 0.0, 1.0) : 0.0;
    half3 tex = params.textures().base_color().sample(tiled, uv).rgb;
    params.surface().set_base_color(tex * half3(params.material_constants().base_color_tint()) * half(shade * (1.0 - fog)));
    params.surface().set_emissive_color(half3(params.material_constants().emissive_color()) * half(fog));
    half3 n = params.textures().normal().sample(tiled, uv).rgb * 2.0h - 1.0h;
    params.surface().set_normal(float3(normalize(n)));
    params.surface().set_roughness(1.0h);
    params.surface().set_metallic(0.0h);
}

/// src/game.js waveMat: the pin flag ripples away from the pole, more the further out it reaches
[[visible]]
void flagWave(realitykit::geometry_parameters params) {
    float3 p = params.geometry().model_position();
    float t = params.uniforms().time(), k = p.x / 0.22;
    params.geometry().set_model_position_offset(float3(0.0, -0.01 * k * k, sin(p.x * 28.0 - t * 6.0) * 0.012 * k));
}

// MARK: the real-world surfaces (iOS only): sand, mud and water grown from the zone's own colour,
// with detail made in world space so it never tiles, and faded out where a pixel covers more than
// the detail (far away or edge on) so it never sparkles.

static float fbm(float2 p) { return vnoise(p) * 0.5 + vnoise(p * 2.03 + 17.1) * 0.25 + vnoise(p * 4.01 + 31.7) * 0.125 + vnoise(p * 8.07 + 5.3) * 0.0625; }
/// a height field's slope by finite differences, for a bump normal
static float2 slope(float (*f)(float2), float2 p, float e) { return float2(f(p + float2(e, 0)) - f(p - float2(e, 0)), f(p + float2(0, e)) - f(p - float2(0, e))) / (2.0 * e); }
static float sandH(float2 p) {
    // wind ripples a few centimetres apart, bent by a slow warp so no two run straight
    float warp = vnoise(p * 1.3) * 3.0 + vnoise(p * 4.1) * 0.8;
    float r = sin(dot(p, float2(0.8, 0.6)) * 105.0 + warp * 6.2832);
    return (r * 0.5 + 0.5) * 0.0018 + fbm(p * 22.0) * 0.0012;
}
static float mudH(float2 p) { return fbm(p * 9.0) * 0.006 + vnoise(p * 41.0) * 0.0012; }
/// two swells and a chop, drifting against each other
static float waterH(float2 p, float t) {
    return sin(dot(p, float2(0.94, 0.34)) * 9.0 + t * 1.6) * 0.0016
         + sin(dot(p, float2(-0.42, 0.91)) * 13.0 + t * 2.1) * 0.0011
         + (vnoise(p * 7.0 + float2(t * 0.21, t * 0.13)) - 0.5) * 0.004
         + (vnoise(p * 23.0 - float2(t * 0.35, -t * 0.27)) - 0.5) * 0.0016;
}
/// the tangent-space normal for a world-space height slope (tangent is +x, bitangent -z on these meshes)
static float3 bumpN(float2 s, float k) { return normalize(float3(-s.x * k, s.y * k, 1.0)); }
/// the sky a surface mirrors at a grazing angle (Schlick, water's 2% at normal incidence)
static float fresnel(float3 n, float3 v) { return 0.02 + 0.98 * pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 5.0); }

/// water's look, for a lagoon zone or the sea round the course
static void water(realitykit::surface_parameters params, float fog) {
    auto geo = params.geometry();
    float3 wp = geo.world_position();
    float t = params.uniforms().time();
    float near = detail(wp.xz, 0.25);
    float e = 0.004;
    float2 s = float2(waterH(wp.xz + float2(e, 0), t) - waterH(wp.xz - float2(e, 0), t), waterH(wp.xz + float2(0, e), t) - waterH(wp.xz - float2(0, e), t)) / (2.0 * e);
    s *= mix(0.25, 1.0, near);
    float3 v = normalize(-geo.view_direction());
    float3 nw = normalize(float3(-s.x, 1.0, -s.y));
    float fr = fresnel(nw, v);
    // deep in the troughs, a touch paler on the crests where the light gets through
    half3 deep = half3(params.material_constants().base_color_tint());
    float crest = clamp(waterH(wp.xz, t) * 220.0 + 0.5, 0.0, 1.0);
    // a shallow lagoon: clear and saturated, a touch paler on the crests where the light gets through
    half3 body = deep * half(0.95 + 0.3 * crest);
    half luma = dot(body, half3(0.2126h, 0.7152h, 0.0722h));
    body = max(mix(half3(luma), body, 1.35h), 0.0h);
    half3 sky = half3(params.material_constants().emissive_color());
    half3 fogC = half3(params.material_constants().emissive_color());
    // the sky's mirror is held to a sheen: the lit model adds the sun's glint and the sky's light itself
    params.surface().set_base_color(body * half(1.0 - fr * 0.4) * half(1.0 - fog));
    params.surface().set_emissive_color(mix(sky * half(fr * 0.22), fogC, half(fog)));
    params.surface().set_normal(bumpN(s, 1.0));
    params.surface().set_roughness(half(mix(0.12, 0.04, near)));
    params.surface().set_metallic(0.0h);
    params.surface().set_specular(0.3h);
}

/// custom_parameter: (kind 0 sand, 1 mud, 2 water, unused, unused, unused). The zone's colour is the tint;
/// for water the sky it mirrors comes in the emissive slot.
[[visible]]
void zoneSurface(realitykit::surface_parameters params) {
    auto geo = params.geometry();
    float3 wp = geo.world_position();
    float kind = params.uniforms().custom_parameter().x;
    if (kind > 1.5) { water(params, 0.0); return; }
    half3 tint = half3(params.material_constants().base_color_tint());
    params.surface().set_emissive_color(half3(0.0h));
    params.surface().set_metallic(0.0h);
    if (kind < 0.5) {
        // sand: ripples catching the light, single grains, drier and paler in drifts
        float near = detail(wp.xz, 0.02), fine = detail(wp.xz, 0.004);
        float2 s = slope(sandH, wp.xz, 0.002) * near;
        float grain = (h21(floor(wp.xz * 900.0)) - 0.5) * fine;
        float drift = fbm(wp.xz * 1.6);
        float crest = clamp(sandH(wp.xz) / 0.003, 0.0, 1.0);
        // a real beach's beige under the world's colour, so it reads as sand and not paint
        half3 base = mix(tint, half3(0.62h, 0.5h, 0.34h), 0.35h);
        half3 c = base * half(0.84 + 0.22 * drift + 0.14 * crest * near + 0.16 * grain);
        c = mix(c, c * half3(1.06h, 1.02h, 0.92h), half(drift * 0.5));
        params.surface().set_base_color(c);
        params.surface().set_normal(bumpN(s, 2.6));
        params.surface().set_roughness(0.96h);
        return;
    }
    // mud: lumpy and matte where it has dried, dark glassy puddles in the hollows
    float near = detail(wp.xz, 0.03);
    float wet = smoothstep(0.5, 0.56, fbm(wp.xz * 3.2 + 3.7));
    float2 s = slope(mudH, wp.xz, 0.002) * near * (1.0 - wet);
    float lump = fbm(wp.xz * 9.0);
    half3 c = tint * half(0.7 + 0.55 * lump);
    c = mix(c, c * half3(1.1h, 1.04h, 0.9h), half(smoothstep(0.55, 0.8, lump) * 0.6 * (1.0 - wet)));
    c = mix(c, tint * 0.42h, half(wet));
    params.surface().set_base_color(c);
    params.surface().set_normal(bumpN(s, 1.0));
    params.surface().set_roughness(half(mix(0.88, 0.06, wet)));
    params.surface().set_clearcoat(half(wet));
    params.surface().set_clearcoat_roughness(0.05h);
}

/// the sea round an island course: water to the horizon, fogged as the ground is.
/// custom_parameter: (unused, camera x, camera z, fog far); the sky in the emissive slot.
[[visible]]
void seaSurface(realitykit::surface_parameters params) {
    auto geo = params.geometry();
    float4 cp = params.uniforms().custom_parameter();
    float d = distance(geo.world_position().xz, cp.yz);
    float fog = cp.w > 0.0 ? clamp((d - cp.w * 0.29) / (cp.w * 0.71), 0.0, 1.0) : 0.0;
    water(params, fog);
}
