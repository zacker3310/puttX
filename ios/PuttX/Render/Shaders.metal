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
    float k = shade * (1.0 + cp.z * away) * (0.93 + 0.14 * macro);
    // the web's turf is a physical material with a pale-green sheen (0.3): it lifts and softens the
    // felt; its colour comes in the emissive slot, and nothing here glows
    half3 sheen = half3(params.material_constants().emissive_color()) * 0.3h;
    params.surface().set_base_color(base * half(k) + sheen * half(shade));
    params.surface().set_emissive_color(half3(0.0h));

    half3 n = params.textures().normal().sample(tiled, uv).rgb * 2.0h - 1.0h;
    n.xy *= 0.55h;
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
