# PuttX realistic look: research and recipes (three.js r170 core, iPad at 60 fps)

How this was done. I read `SPEC.md`, `docs/RESEARCH.md`, `courses/c01.look.js` and the render section of `src/game.js`. Someone else is editing the working tree right now, and it already has a first realism pass in it. I checked every API name in the snippets against `node_modules/three` (version 0.170.0). I measured draw calls in headless Chromium with SwiftShader at 1024x768, using a scratch build of the working tree. The snippets use the game's own helpers (`groundH`, `holeBounds`, `rng32`, `cachedCanvas`, `texOf`, `normalCanvas`, `fbm`, `reducedMotion`, `BALL_R`, `CUP_R`, `RIM_RHO`).

---

## 0. Where the working tree stands now

**Already in `src/game.js`, so don't redo it:**
- `turfMaterial()` is a `MeshPhysicalMaterial` with sheen, a canvas normal map and vertex colours.
- `floorShade()` bakes per-vertex AO at wall bases, posts and step feet. It also bakes static mowing stripes and a slow mottle.
- `WALL_KIND_OF` picks a wall material per world (steel, stone, wood, brick, paint, marble). Each kind has a canvas map, a normal map, and UVs in metres via `scaleBoxUV`.
- `edgingGroup()` lays a mulch or river-rock strip around the course.
- `skyEnvironment()` builds a PMREM from a 256x128 equirect canvas and sets it as `scene.environment`.
- Ice and water are physical materials with clearcoat.
- The ball is `MeshPhysicalMaterial` with clearcoat and a bump-map dimple texture.
- The 120 m ground plane has vertex-colour mottle.

**Measured draw calls per frame (shadow pass included), 61 holes (holes 1 and 18 of every course):**

| Build | Avg calls | Max calls (hole) | Programs | Unique materials in last hole |
|---|---|---|---|---|
| committed `index.html` | 57.2 | 154 (2-18) | 19 | 91 |
| working tree | 60.8 | 155 (2-18) | 21 | 99 |

- Prop meshes are the bulk. Hole 5-1 has 253 prop meshes, 153 of them casting shadows. Hole 2-18 has 107 prop meshes. Frustum culling hides most of them in the aim view (5-1 draws only 20 calls there). The wide views (title orbit, intro, overview) are the worst case. SwiftShader frame times are not meaningful, which `tests/perf-check.cjs` also says.

**Pixel load on device.** `resizeRenderer()` sets pixel ratio to `min(2, devicePixelRatio * stageScale)`.
- A 1024x768 iPad at DPR 2 gives ratio 1.71, so a 2048x1195 buffer (2.45 MP).
- An 11-inch iPad Air is 2360x1640 px ([Apple](https://www.apple.com/ipad-air/specs/)), so 1180x820 CSS. That gives ratio 1.97, so a 2360x1377 buffer (3.25 MP).
- The turf covers most of those pixels, so the turf shader is where cost goes.

---

## 1. Ranked recipes (most realism per unit of cost first)

| # | Recipe | Realism | Cost on iPad |
|---|---|---|---|
| 1 | One world-space HDR sky for both background and IBL, rebalanced ambient, tone mapping A/B | very high | 1 draw call, 1 PMREM per world |
| 2 | Ball contact shadow, crisper sun shadow, tight light-space shadow fit | very high | 1 draw call, no shader cost |
| 3 | Turf: view-dependent mowing stripes, world-space macro variation, roughness variation | high | about 10 ALU ops per turf pixel |
| 4 | Ball: even dimple normal map, clearcoat that follows the dimples | high | tiny (the ball is about 50 px across) |
| 5 | Cup as one lathe: rim radius, cut turf band, painted band, liner, ferrule socket; a numbered flag | high | fewer draw calls than today |
| 6 | Borders: base grime, end grain, cap rail; merge props | medium-high | saves draw calls |
| 7 | Water: real IOR, two-phase normals, shore tint and alpha; waterfalls | medium-high | 1 extra texture fetch on water |
| 8 | Surroundings: instanced tufts, flowers, shrubs, rocks | medium | 3 to 5 draw calls per hole |
| 9 | Subtle fringe band; analytic floor normals | medium | build time only |
| 10 | Dusk (floodlit) variant separate from neon night | medium | decals, not lights |

### Recipe 1. One sky for background and image-based light

**Why.** `scene.background = skyTexture(...)` is a 2D texture. three.js draws a 2D background as a screen-space quad (`gl_Position = vec4(position.xy, 1.0, 1.0)` in `ShaderLib.background`, [r170 source](https://github.com/mrdoob/three.js/blob/r170/src/renderers/shaders/ShaderLib/background.glsl.js)). So the horizon slides when the camera pitches, and it never lines up with the lawn.

The working-tree IBL comes from a separate 8-bit canvas, so it holds no HDR energy. A world-space dome fixes both problems, and the same dome can feed the PMREM:
- `PMREMGenerator.fromScene(scene, sigma, near, far)` exists in r170 and defaults to a 256 face size ([docs](https://threejs.org/docs/pages/PMREMGenerator.html)).
- In r170 it renders with tone mapping off into a HalfFloat target ([r170 PMREMGenerator](https://github.com/mrdoob/three.js/blob/r170/src/extras/PMREMGenerator.js)), so values above 1 survive.
- `Scene.environment` lights every physical material ([Scene docs](https://threejs.org/docs/pages/Scene.html)).
- The gradient-dome idea is the same as the official hemisphere example ([webgl_lights_hemisphere](https://raw.githubusercontent.com/mrdoob/three.js/r170/examples/webgl_lights_hemisphere.html)).

```js
/* one sky: the visible dome and the IBL come from the same shader (colours are THREE.Color, so linear) */
const SKY = { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, ground: { value: new THREE.Color() },
  sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color(1, 0.93, 0.8) }, disc: { value: 1 } };
const skyMat = new THREE.ShaderMaterial({
  uniforms: SKY, side: THREE.BackSide, depthWrite: false,
  vertexShader: `varying vec3 vDir;
    void main() { vDir = position; gl_Position = ( projectionMatrix * modelViewMatrix * vec4( position, 1.0 ) ).xyww; }`,
  fragmentShader: `uniform vec3 top, horizon, ground, sunDir, sunCol; uniform float disc; varying vec3 vDir;
    void main() {
      vec3 d = normalize( vDir );
      vec3 c = d.y > 0.0 ? mix( horizon, top, pow( d.y, 0.5 ) ) : mix( horizon, ground, pow( -d.y, 0.3 ) );
      float s = max( dot( d, sunDir ), 0.0 );
      c += sunCol * ( pow( s, 8.0 ) * 0.25 + pow( s, 64.0 ) * 0.6 );      /* glow: kept in the IBL */
      c += sunCol * smoothstep( 0.9995, 0.9998, s ) * 20.0 * disc;        /* the disc: main view only */
      gl_FragColor = vec4( c, 1.0 );
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` });
const skyGeo = new THREE.SphereGeometry(100, 32, 16);
const skyDome = new THREE.Mesh(skyGeo, skyMat); skyDome.frustumCulled = false; skyDome.renderOrder = 1000; /* drawn last, at the far plane */
const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(skyGeo, skyMat));
let envRT = null, envKey = '';
function setSky(look) {
  SKY.top.value.set(look.sky[0]); SKY.horizon.value.set(look.sky[1]); SKY.ground.value.set(look.ground || '#55603f');
  SKY.sunDir.value.copy(sun.position).sub(sun.target.position).normalize();
  const key = look.sky.join() + (look.ground || '') + (look.night ? 'n' : '');
  if (key !== envKey) {                       /* once per look, never per frame */
    SKY.disc.value = 0;                       /* the DirectionalLight already gives the sun's highlight */
    const pm = new THREE.PMREMGenerator(renderer);
    if (envRT) envRT.dispose();
    envRT = pm.fromScene(envScene, 0.02, 0.1, 200); pm.dispose(); envKey = key;
  }
  SKY.disc.value = look.night ? 0 : 1;
  scene.environment = envRT.texture; scene.background = null;
}
/* renderFrame: skyDome.position.copy(camera.position); */
```

**Light balance.** Once the IBL carries the sky, `HemisphereLight` adds a second flat ambient term on top. That washes out slopes. A starting point to tune on device:

```js
hemi.intensity = 0.3; scene.environmentIntensity = 1.0; sun.intensity = 3.0;
renderer.toneMapping = THREE.AgXToneMapping;  /* A/B against ACESFilmicToneMapping on the iPad */
renderer.toneMappingExposure = 1.1;
```

**Tone mapping.**
- ACES shifts hue more than you may want ([three.js forum, pmndrs maintainer](https://discourse.threejs.org/t/pmndrs-post-processing-tone-mapping-guidance/59374/2)).
- AgX is less saturated than ACES by design ([forum](https://discourse.threejs.org/t/is-agx-tonemapping-implemented-correctly/60609)). AgX came in r160 ([release](https://github.com/mrdoob/three.js/releases/tag/r160)).
- Khronos PBR Neutral came in r162 ([release](https://github.com/mrdoob/three.js/releases/tag/r162)). It keeps base colours with no hue shift ([Khronos spec](https://github.com/KhronosGroup/ToneMapping/blob/main/PBR_Neutral/README.md)). It suits product renders, not a warm sunny scene.
- For "warm and sunny", try AgX plus a warm sun and a slightly warm horizon, or keep ACES and lower the saturated look colours.

**Sun colour.** Midday sun is about 5500 K, and golden hour is about 3500 K ([Digital Camera World](https://www.digitalcameraworld.com/features/what-and-when-is-golden-hour-photography), [Wikiwand: Golden hour](https://www.wikiwand.com/en/articles/Golden_hour_(photography))). A late-afternoon tint like the working tree's `0xffe6c4` sits between the two. The working tree's sun is about 44 degrees up, which gives good modelling on slopes. Keep it.

### Recipe 2. Shadows that sit things on the ground

1. **The radius setting does nothing today.** `initRenderer` sets `sun.shadow.radius = 4` with `PCFSoftShadowMap`. In r170 the `SHADOWMAP_TYPE_PCF_SOFT` branch never reads `shadowRadius` for directional lights ([r170 shadowmap_pars_fragment](https://github.com/mrdoob/three.js/blob/r170/src/renderers/shaders/ShaderChunk/shadowmap_pars_fragment.glsl.js), confirmed in the forum: [three.js discourse](https://discourse.threejs.org/t/webgpu-shadow-tests-and-findings/82561)). Use `PCFShadowMap` to control softness. Its 17 taps cost about the same as the soft path.
2. **Real sun shadows are crisp.** The sun's disc is about 31.5 to 32.5 arcminutes across ([Wikipedia: Angular diameter](https://en.wikipedia.org/wiki/Angular_diameter)). So the penumbra is about 0.009 times the distance to the caster: about 2 mm for a 15 cm wall. Use a small radius:
   ```js
   renderer.shadowMap.type = THREE.PCFShadowMap;
   sun.shadow.radius = 1.5; sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.01;
   sun.shadow.intensity = 0.92;   /* LightShadow.intensity exists in r170 */
   ```
   `normalBias` offsets the lookup along the normal to cure acne at grazing light ([LightShadow docs](https://threejs.org/docs/pages/LightShadow.html)).
3. **Fit the shadow box tightly in light space, not with a square of `ext + 1.5`.** Fitting the projection to the scene's corners in light space gives more texels for the same map size ([Microsoft: Common Techniques to Improve Shadow Depth Maps](https://learn.microsoft.com/en-us/windows/win32/dxtecharts/common-techniques-to-improve-shadow-depth-maps)). With a static box per hole there is no shimmer. If you later make the box follow the ball, snap its centre to whole texels (same article).
   ```js
   const _m = new THREE.Matrix4(), _p = new THREE.Vector3();
   function fitSun(h, sunDir) {               /* call in buildHoleScene; the box stays fixed for the hole */
     const B = holeBounds(h), c = new THREE.Vector3(B.cx, 0, B.cz);
     sun.target.position.copy(c); sun.position.copy(c).addScaledVector(sunDir, 12);
     sun.updateMatrixWorld(); sun.target.updateMatrixWorld();
     const cam = sun.shadow.camera; cam.position.copy(sun.position); cam.lookAt(c); cam.updateMatrixWorld();
     _m.copy(cam.matrixWorld).invert();
     let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
     for (const x of [B.x0 - 0.4, B.x1 + 0.4]) for (const y of [-0.6, 0.9]) for (const z of [B.z0 - 0.4, B.z1 + 0.4]) {
       _p.set(x, y, z).applyMatrix4(_m);
       x0 = Math.min(x0, _p.x); x1 = Math.max(x1, _p.x); y0 = Math.min(y0, _p.y); y1 = Math.max(y1, _p.y); z0 = Math.min(z0, _p.z); z1 = Math.max(z1, _p.z);
     }
     const half = Math.max(x1 - x0, y1 - y0) / 2, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;   /* square texels */
     Object.assign(cam, { left: mx - half, right: mx + half, bottom: my - half, top: my + half, near: Math.max(0.1, -z1 - 0.5), far: -z0 + 0.5 });
     cam.updateProjectionMatrix();
   }
   ```
   The perf test requires one 1024 map. For a typical hole the texel is about 1 cm, and the ball is 5.1 cm across, so the map alone can't show the dark contact core under the ball. Step 4 handles that.
4. **Contact shadow under the ball.** The three.js manual describes this "fake shadow" plane: transparent, `depthWrite: false`, lifted slightly to avoid z-fighting, fading with height ([three.js manual: Shadows](https://threejs.org/manual/en/shadows.html)).
   ```js
   const contact = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({
     map: canvasTex(64, 64, x => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
       g.addColorStop(0, 'rgba(0,0,0,0.6)'); g.addColorStop(0.45, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }),
     transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, toneMapped: false }));
   contact.renderOrder = 2; scene.add(contact);
   const _up = new THREE.Vector3(0, 1, 0), _n = new THREE.Vector3();
   /* in syncBall, after the ball mesh moves */
   const h = play.hole, gy = groundH(h, b.x, b.z), lift = b.y - gy, k = clamp(1 - lift / 0.12, 0, 1);
   contact.visible = ballMesh.visible && lift > -0.005 && k > 0.02;            /* hidden in the cup, a tube, or high air */
   contact.position.set(b.x, gy + 0.0015, b.z); contact.scale.setScalar(BALL_R * (2.4 + 3 * (1 - k)));
   contact.material.opacity = k;
   const e = 0.02; _n.set(groundH(h, b.x - e, b.z) - groundH(h, b.x + e, b.z), 2 * e, groundH(h, b.x, b.z - e) - groundH(h, b.x, b.z + e)).normalize();
   contact.quaternion.setFromUnitVectors(_up, _n);
   ```
   The same decal under the putter head and the flagstick ferrule costs one draw call each.

### Recipe 3. Turf that reads as a real green

**Facts that set the targets:**
- **Stripes depend on the viewer.** Blades bent away from you look lighter, blades bent toward you look darker, and mowing direction sets the bend ([Lawn Solutions Australia](https://lawnsolutionsaustralia.com.au/lawn-care/lawn-mowing/getting-those-stripes-in-your-lawn/), [Wright Mfg](https://wrightmfg.com/articles/secrets-to-striping-lawns/)). So when the player drags the course to aim and the camera turns, real stripes swap light and dark. Stripes baked into vertex colours never do that.
- **Stripe width.** Greens are cut with walk-behind mowers that cut 21 inches (53.3 cm) ([Toro Greensmaster 1021](https://www.toro.com/en-gb/product/04830)). PuttX's ball is about 1.2 times real size (comment on `BALL_R`), so 0.6 to 0.75 m wide bands look right. The working tree uses 0.75.
- **Brightness.** Green grass has albedo about 0.25 ([Wikipedia: Albedo](https://en.wikipedia.org/wiki/Albedo)). The default felt `#36803a` has a linear luminance of about 0.17, so it is not too bright. Keep the felt dark: it also protects render-check's 3:1 ball contrast.
- **Synthetic putting turf** has a pile of about 1/4 to 5/8 inch in nylon or polypropylene ([Greatmats](https://greatmats.com/the-best-artificial-grass-for-indoor-outdoor-putt-putt-courses.php), [Southwest Greens](https://southwestgreens.com/collections/golf-en)). That is the scale of the blade speckle in `turfCanvas`, so the canvas resolution is right.

**One shader patch on the existing `turfMaterial`.** It adds view-dependent stripes, macro variation in world space to break the 0.67 m tile, and roughness variation. Chunk names were checked against r170 `ShaderLib.physical`. `cameraPosition` is declared in the fragment prefix ([r170 WebGLProgram](https://github.com/mrdoob/three.js/blob/r170/src/renderers/webgl/WebGLProgram.js)). `roughnessFactor` is the variable set by `roughnessmap_fragment` ([r170 chunk](https://github.com/mrdoob/three.js/blob/r170/src/renderers/shaders/ShaderChunk/roughnessmap_fragment.glsl.js)).

```js
const TURF_U = { uAlong: { value: new THREE.Vector2(0, 1) }, uStripeW: { value: 0.7 }, uStripeK: { value: 0.13 } };
function patchTurf(mat) {
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, TURF_U);                      /* shared objects: change .value any time, no recompile */
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vWXZ;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWXZ = ( modelMatrix * vec4( transformed, 1.0 ) ).xz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec2 vWXZ; uniform vec2 uAlong; uniform float uStripeW, uStripeK;
        float h21( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
        float vnoise( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
          return mix( mix( h21( i ), h21( i + vec2( 1, 0 ) ), f.x ), mix( h21( i + vec2( 0, 1 ) ), h21( i + vec2( 1, 1 ) ), f.x ), f.y ); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 across = vec2( -uAlong.y, uAlong.x );
        float mown = clamp( sin( dot( vWXZ, across ) * PI / uStripeW ) * 6.0, -1.0, 1.0 );  /* +1 / -1: which way this band was cut */
        vec2 toCam = normalize( cameraPosition.xz - vWXZ + 1e-4 );
        float away = -mown * dot( uAlong, toCam );                                          /* > 0: blades lean away from the eye */
        float macro = vnoise( vWXZ * 0.35 ) * 0.6 + vnoise( vWXZ * 1.7 ) * 0.4;
        diffuseColor.rgb *= ( 1.0 + uStripeK * away ) * ( 0.93 + 0.14 * macro );`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = clamp( roughnessFactor + 0.06 * ( 0.5 - macro ) - 0.04 * away, 0.0, 1.0 );`);
  };
  mat.customProgramCacheKey = () => 'turf-v1';
}
/* buildHoleScene: TURF_U.uAlong.value.set(cupX - teeX, cupZ - teeZ).normalize(); TURF_U.uStripeK.value = look.night ? 0 : 0.13; */
```

- **Remove the baked stripe term** from `floorShade()` (`band`/`stripe`), or stripes appear twice. Keep its AO and mottle.
- **Sheen.** The sheen lobe models back-scatter from fibres ([KHR_materials_sheen](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_sheen/README.md)), which fits turf. The same spec scales the base layer down to conserve energy. So a bright cream `sheenColor` (the working tree lerps 45% toward `#fff6d8`) greys the green at grazing angles. Start from a pale yellow-green (about `#cfe39a`), `sheen` 0.35 to 0.45, `sheenRoughness` 0.4, and raise the base albedo slightly if it dims.
- **Slopes.** Real greens show slope through light and shade, not tint. The 5 to 7 cm grid plus a 44-degree sun already shades slopes. Two upgrades help:
  - Compute normals analytically from `groundH`, with central differences of plus and minus 2 cm, instead of `computeVertexNormals()`. That avoids dark seams where the grid is cut round the cup and at tier lips.
  - Leave slope tint out entirely. It would compete with the slope-reading grid already on the backlog (RESEARCH item 8).
- **Fringe or collar band, subtle and visual only.** On real greens the collar is cut a little higher than the green and has no set width ([Golfdom](https://golfdom.com/?p=37534)). PuttX is wordless, and players read surfaces by look, so a collar must not look like a slow zone.
  - Use a narrow band (4 to 6 cm) only where a floor edge has no wall.
  - Store the weight in a separate `fringe` vertex attribute.
  - Darken by 8 to 10%, add 0.05 roughness and 0.3 more normal scale.

### Recipe 4. The ball

- Real balls carry 300 to 500 dimples; 336 is common, and the 2021 Pro V1 has 388 ([Golf Monthly](https://www.golfmonthly.com/features/how-many-dimples-are-there-on-a-golf-ball), [Golf Digest](https://golfdigest.com/story/titleist-prov1-prov1x-2021)).
- The gloss comes from one or two clear urethane topcoats ([US6872423B2](https://patents.google.com/patent/US6872423)), so the clearcoat should follow the dimples.
- The current `dimpleTexture()` has two problems:
  - It is a UV grid, so dimples pinch at the poles.
  - It is a bump map that goes through `canvasTex()`, which marks it sRGB. Data textures must stay `NoColorSpace` ([three.js manual: Color management](https://threejs.org/manual/en/color-management.html)). Bump maps also shade from screen-space derivatives (`perturbNormalArb`, `dHdxy_fwd` in r170), which shimmers on a small, fast-rolling ball.

```js
/* dimples on a Fibonacci sphere (even spacing, no pole pinch), baked to a tangent-space normal map
   for SphereGeometry's UVs: canvas pixel (i, j) -> phi = 2 pi i / W, theta = pi j / H */
function dimpleNormalCanvas(n = 336, W = 512, H = 256) {
  return cachedCanvas('dimples:' + n, W, H, (x) => {
    const ga = Math.PI * (3 - Math.sqrt(5)), C = [];
    for (let i = 0; i < n; i++) { const y = 1 - 2 * (i + 0.5) / n, r = Math.sqrt(1 - y * y); C.push([Math.cos(i * ga) * r, y, Math.sin(i * ga) * r]); }
    const R = 0.48 * Math.sqrt(8 * Math.PI / (Math.sqrt(3) * n));      /* just under half the hex spacing */
    const Hh = new Float32Array(W * H);
    for (let j = 0; j < H; j++) {
      const th = (j + 0.5) / H * Math.PI, st = Math.sin(th), ct = Math.cos(th), cand = C.filter(c => Math.abs(c[1] - ct) < R);
      for (let i = 0; i < W; i++) {
        const ph = (i + 0.5) / W * Math.PI * 2, dx = -Math.cos(ph) * st, dz = Math.sin(ph) * st;
        let best = 4; for (const c of cand) { const e = (dx - c[0]) ** 2 + (ct - c[1]) ** 2 + (dz - c[2]) ** 2; if (e < best) best = e; }
        const t = Math.sqrt(best) / R; Hh[j * W + i] = t < 1 ? -(1 - t * t) : 0;
      }
    }
    const at = (i, j) => Hh[Math.min(H - 1, Math.max(0, j)) * W + ((i + W) % W)];
    paint(x, W, H, (u, v, i, j) => {
      const st = Math.max(0.15, Math.sin((j + 0.5) / H * Math.PI)), k = 3.0;
      const gx = (at(i + 1, j) - at(i - 1, j)) * k / st, gy = (at(i, j + 1) - at(i, j - 1)) * k, l = Math.hypot(gx, gy, 1);
      return [(-gx / l * 0.5 + 0.5) * 255, (gy / l * 0.5 + 0.5) * 255, (1 / l * 0.5 + 0.5) * 255];   /* same sign convention as normalCanvas */
    });
  });
}
const dimples = texOf(dimpleNormalCanvas(), false); dimples.wrapT = THREE.ClampToEdgeWrapping;
ballMesh.material = new THREE.MeshPhysicalMaterial({ map: ballTexture(GEAR.ball), normalMap: dimples, normalScale: new THREE.Vector2(0.9, 0.9),
  roughness: 0.45, clearcoat: 1, clearcoatRoughness: 0.07, clearcoatNormalMap: dimples, clearcoatNormalScale: new THREE.Vector2(0.6, 0.6) });
```

- The canvas is cached, so the build runs once (tens of ms, thanks to the theta-band pruning).
- I checked the working tree's `normalCanvas` sign convention against the canvas `flipY`. It is right for OpenGL (green up), and this code matches it.
- At the aim camera (about 1.6 m away, from `cameraGoal`), the ball is about 52 px on a 2048x1195 buffer. Dimples are about 5 px apart, so they read as texture. In the sink swoop (0.55 m) they read as dimples.

### Recipe 5. The cup, flagstick and flag

**Real specs:**
- The hole is 4.25 in (108 mm) wide and at least 4 in deep, and the liner sits at least 1 in below the surface ([CaddieHQ, from the USGA/R&A rules](https://www.caddiehq.com/resources/what-are-the-dimensions-of-a-golf-hole)).
- Tournaments paint the exposed soil above the liner white ([USGA Green Section](https://www.usga.org/content/usga/home-page/course-care/green-section-record/60/03/painting-hole-locations---by-the-numbers.html)).
- A flagstick may end in a slender metal ferrule at its base ([USGA decision 17](https://www.usga.org/etc/designs/usga/content/rule-book/decision-17.html)). Cups have a ferrule socket in the floor ([patent](https://ipiq.io/patents/1938163)).
- Mini and backyard flags are numbered nylon, about 6x8 in, on poles about 30 in to 3 ft tall ([Golfer Hive review of KINGTOP](https://golferhive.com/kingtop-putting-green-flags-review/), [Wayfair Watsy set](https://www.wayfair.com/outdoor/pdp/watsy-backyard-mini-golf-flagstick-set-wtsy1000.html)).

**Scaling.** PuttX's cup is 0.198 m, which is 1.83 times real. The real 25 mm drop to the liner becomes about 46 mm, against `CUT = 0.018` today. Match the rim to the sim: the working tree's sim has a rounded rim of `RIM_RHO = 0.008` and a 6 mm dish.

**One lathe, one draw call, AO baked in.** It replaces today's soil, liner, lip, bottom and drain meshes.

```js
function cupLathe(look) {
  const R = CUP_R, rho = RIM_RHO, band = 0.046, pile = 0.007, pts = [];
  for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI / 2; pts.push(new THREE.Vector2(R + rho * (1 - Math.sin(a)), -rho * (1 - Math.cos(a)))); }
  pts.push(new THREE.Vector2(R, -band), new THREE.Vector2(R - 0.003, -band - 0.002), new THREE.Vector2(R - 0.003, -CUP_SINK + 0.01),
    new THREE.Vector2(R - 0.012, -CUP_SINK), new THREE.Vector2(0.0001, -CUP_SINK));   /* top to bottom: normals face into the hole */
  const g = new THREE.LatheGeometry(pts, 64), P = g.attributes.position, col = [], turf = new THREE.Color(look.felt), c = new THREE.Color();
  for (let i = 0; i < P.count; i++) {
    const y = P.getY(i), deep = Math.min(1, -y / CUP_SINK);
    if (y > -pile) c.copy(turf);                         /* cut blades */
    else if (y > -band) c.set(look.night ? '#2b2620' : '#f2efe6');   /* painted soil band */
    else c.set('#f4f1ea');                               /* plastic liner */
    c.multiplyScalar(0.3 + 0.7 * (1 - deep) ** 1.5);     /* baked occlusion: darker toward the floor */
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }));
}
```

- Add the ferrule socket and three drain holes as a 128 px canvas decal on the floor disc.
- Give the flagstick a 2 cm metal ferrule cylinder at its base (`metalness: 0.9`, `roughness: 0.3`).

**Numbered, waving flag** (numerals are allowed on screen):

```js
const FX_TIME = { value: 0 };   /* renderFrame: if (!reducedMotion()) FX_TIME.value += dt; */
function flagMesh(num, hex) {
  const t = canvasTex(256, 160, x => { x.fillStyle = hex; x.fillRect(0, 0, 256, 160); x.fillStyle = '#fffdf7';
    x.font = '900 112px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(num), 128, 86); });
  const g = new THREE.PlaneGeometry(0.22, 0.14, 12, 4).translate(0.11, -0.07, 0);
  const patch = sh => {
    sh.uniforms.uT = FX_TIME;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float k = position.x / 0.22; transformed.z += sin( position.x * 28.0 - uT * 6.0 ) * 0.012 * k; transformed.y -= 0.01 * k * k;`);
  };
  const m = new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.8 });
  m.onBeforeCompile = sh => { patch(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>',
      'diffuseColor *= texture2D( map, gl_FrontFacing ? vMapUv : vec2( 1.0 - vMapUv.x, vMapUv.y ) );');   /* readable from both sides */
  };
  m.customProgramCacheKey = () => 'flag-v1';
  const mesh = new THREE.Mesh(g, m), d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  d.onBeforeCompile = patch; d.customProgramCacheKey = () => 'flag-depth-v1';
  mesh.customDepthMaterial = d; mesh.castShadow = true;   /* the shadow waves too */
  return mesh;
}
```

### Recipe 6. Borders (walls) and props

**Real construction:**
- Borders are commonly 2x6 pressure-treated boards, concrete poured as a slab, pavers, or HDPE. The surface is outdoor carpet glued to plywood or concrete ([Instructables](https://www.instructables.com/Miniature-Golf-Putt-Putt-Course), [This Old House](https://www.thisoldhouse.com/how-to/how-to-build-miniature-golf-course), [US3858887A](https://patents.google.com/patent/US3858887A/OSRAM), [US10463936B1 edging block](https://patents.google.com/patent/US10463936)).
- Adventure courses add waterfalls, streams, rockwork and planting ([Parks & Rec Business on a Harris course](https://www.parksandrecbusiness.com/articles/2004/08/11/giant-miniature-part-ii-2)).

**What to add to the working tree's `wallCanvas` kinds:**
1. **Base grime and AO on the wall itself.** Darken the bottom 3 to 5 cm and add moss or dust. Do it in the canvas along v: with `scaleBoxUV`, v counts from the box bottom in 0.5 m units, and the box bottom is 3 cm under the lowest ground. Cost: zero.
2. **End grain for timber.** Remap the two end faces' UVs (BoxGeometry faces 4 and 5) into a corner of the atlas that holds rings. Use one texture, not a material array: material arrays add a draw call per group.
3. **A cap rail.** Make it slightly wider than the wall (6 mm overhang), with its top 0.5 mm above `segTop` so it doesn't z-fight. Build all caps as one merged mesh. render-check still sees one BoxGeometry per segment.
4. **Per-block variation** for stone and brick, using a packed ORM texture. r170 reads AO from `.r`, roughness from `.g` and metalness from `.b` ([aomap](https://github.com/mrdoob/three.js/blob/r170/src/renderers/shaders/ShaderChunk/aomap_fragment.glsl.js), [roughnessmap](https://github.com/mrdoob/three.js/blob/r170/src/renderers/shaders/ShaderChunk/roughnessmap_fragment.glsl.js)), so one canvas feeds all three. Since r151, `aoMap` reads UV channel 0 by default via `Texture.channel`; no `uv2` needed ([forum](https://discourse.threejs.org/t/lightmap-uses-wrong-uv-in-loaded-gltf-model/57434)).
5. **Edge wear on painted steel.** Add brighter, less rough streaks along the top rows of the canvas.
6. **Per-world choice.** The working tree's table is sensible. Suggested refinements:
   - 2 Desert: sandstone blocks
   - 3 Jungle: mossy stone (moss in the base grime)
   - 4 Snow: timber with a white cap rail
   - 5 Pirate: weathered planks
   - 6 Volcano: dark basalt
   - 7 Castle: brick
   - 8 Space: brushed steel
   - 9 Candy: glossy paint (clearcoat 0.5 only if the budget allows)
   - 10 Sky: marble
   - A concrete curb (grey with aggregate speckle) is a good extra kind for Construction.

**Merge props into one mesh each.** This is the biggest draw-call cut (5-1 has 253 prop meshes). three.js core has no `mergeGeometries` (it lives in the addons), so here is a core-only bake:

```js
/* a prop built from many small meshes -> one mesh; each part's colour goes into vertex colours (both linear) */
function bakeProp(group, rough = 0.6) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert(), m = new THREE.Matrix4(), nm = new THREE.Matrix3(), v = new THREE.Vector3();
  const pos = [], nor = [], col = [], idx = [];
  group.traverse(o => {
    if (!o.isMesh || Array.isArray(o.material)) return;
    m.multiplyMatrices(inv, o.matrixWorld); nm.getNormalMatrix(m);
    const g = o.geometry, P = g.attributes.position, N = g.attributes.normal, c = o.material.color, base = pos.length / 3;
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i).applyMatrix4(m); pos.push(v.x, v.y, v.z);
      v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.push(v.x, v.y, v.z); col.push(c.r, c.g, c.b);
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(base + g.index.getX(i)); else for (let i = 0; i < P.count; i++) idx.push(base + i);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
  const out = new THREE.Mesh(g, PROP_MAT || (PROP_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough })));
  out.castShadow = true; out.position.copy(group.position); out.rotation.copy(group.rotation); out.scale.copy(group.scale);
  out.userData = group.userData; return out;
}
let PROP_MAT = null;
```

- Call it in `scatterProps` after `look.prop(r)`. Identical props (cones, barrels) can go further into one `InstancedMesh` per kind ([InstancedMesh docs](https://threejs.org/docs/pages/InstancedMesh.html)).
- Leave movers alone: they animate.

### Recipe 7. Water and waterfalls

- Water's Fresnel reflectance at normal incidence is about 0.02 ([Schlick's approximation](https://en.wikipedia.org/wiki/Schlick%27s_approximation), [course notes listing F0 water 0.020](https://wp.faculty.wmi.amu.edu.pl/CGP2.pdf)). With `MeshPhysicalMaterial`, set `ior: 1.333`, which gives F0 = ((1.333 - 1) / (1.333 + 1))^2 = 0.020.
- Drop `clearcoat` on water. It adds a second specular lobe on top of an already glossy base. Keep clearcoat for ice (a wet film over frost).
- **Two-phase normals.** Sampling at two offsets and blending gives endless, unbroken motion ([Valve GDC 2011, Portal 2 water](https://www.hlportal.de/files/GDC2011_BronwenGrimes_NonstandardTextures.pdf), [Catlike Coding: Texture Distortion](https://catlikecoding.com/unity/tutorials/flow/texture-distortion/)).

```js
function waterMaterial(look) {
  const n = texOf(normalCanvas('ripple', 128, fbm(83, 4, 3), 3), false);
  const m = new THREE.MeshPhysicalMaterial({ color: look.water, roughness: 0.05, metalness: 0, ior: 1.333, normalMap: n,
    normalScale: new THREE.Vector2(0.4, 0.4), transparent: true, envMapIntensity: 1.2, vertexColors: true });
  m.onBeforeCompile = sh => {
    sh.uniforms.uT = FX_TIME;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uT;')
      .replace('vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;',
        `vec3 mapN = normalize( texture2D( normalMap, vNormalMapUv + uT * vec2( 0.031, 0.017 ) ).xyz * 2.0 - 1.0
                              + texture2D( normalMap, vNormalMapUv * 1.7 - uT * vec2( 0.023, -0.029 ) ).xyz * 2.0 - 1.0 );`);
  };
  m.customProgramCacheKey = () => 'water-v1';
  return m;
}
```

- **Shore tint and see-through edges.** Give the water grid an RGBA `color` attribute. In r170, `vertexAlphas` switches on automatically when the colour attribute has 4 components ([r170 WebGLPrograms](https://github.com/mrdoob/three.js/blob/r170/src/renderers/webgl/WebGLPrograms.js)).
  - Per vertex, estimate the distance to the zone edge by probing `zoneAt` outward in 8 directions.
  - Map it to colour: lighter, alpha about 0.55 at the shore, down to deep and alpha about 0.92.
  - Add a 1 to 2 cm foam brightening at the very edge.
- **Waterfalls.** Use a curved ribbon with a scrolling streak canvas (vertical white streaks in alpha), an additive mist billboard at the foot, and two expanding ripple rings in the pool. All of it is decorative, so freeze it under `prefers-reduced-motion`.
- **Skip planar reflections.** They would render the scene a second time. The sky IBL carries enough.

### Recipe 8. Surroundings

**Grass tufts.** Use solid thin triangles, not alpha-tested cards. On Apple GPUs, alpha-test and discard meshes undercut hidden surface removal, and Apple advises drawing them after opaque meshes ([WWDC20 "Harness Apple GPUs with Metal"](https://developer.apple.com/videos/play/wwdc2020/10602/)). PowerVR advises against discard on tile-based GPUs in general ([Imagination](https://docs.imgtec.com/starter-guides/powervr-architecture/html/topics/rules/do-not-use-discard.html)). Point blade normals up so tufts light like the ground they stand on (the GPU Gems grass chapter's approach, as summarised by [Chalmers](https://www.cse.chalmers.se/edu/year/2018/course/TDA361/Advanced%20Computer%20Graphics/Rendering%20Countless%20Blades%20of%20Waving%20Grass.pdf), [GPU Gems ch. 7](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-7-rendering-countless-blades-waving-grass)).

```js
function tuftGeometry() {
  const pos = [], col = [], nor = [], r = rng32(5);
  for (let k = 0; k < 7; k++) {
    const a = k / 7 * Math.PI * 2 + r() * 0.5, lean = 0.25 + r() * 0.35, hgt = 0.05 + r() * 0.05, w = 0.004, cx = Math.cos(a), cz = Math.sin(a);
    pos.push(-cz * w, 0, cx * w, cz * w, 0, -cx * w, cx * hgt * lean, hgt, cz * hgt * lean);
    col.push(0.3, 0.4, 0.16, 0.3, 0.4, 0.16, 0.72, 0.82, 0.42);
    nor.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return g;
}
function tufts(h, count = 500) {
  const mesh = new THREE.InstancedMesh(tuftGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 }), count);
  const r = rng32([...h.key].reduce((a, c) => a * 31 + c.charCodeAt(0), 11)), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
  let n = 0;
  for (let tries = 0; n < count && tries < count * 8; tries++) {
    const { x, z } = pickLawnSpot(h, r);     /* outside every floor, 0.1 to 0.8 m from it, clear of props (the c01Tidy test) */
    if (x === undefined) continue;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6.28); s.setScalar(0.7 + r() * 0.8); p.set(x, -0.03, z);
    mesh.setMatrixAt(n, m4.compose(p, q, s)); mesh.setColorAt(n++, c.setHSL(0.24 + r() * 0.06, 0.45, 0.42 + r() * 0.12));
  }
  mesh.count = n; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere(); mesh.castShadow = false; mesh.receiveShadow = true; return mesh;
}
```

- **Flowers:** two `InstancedMesh`es. One holds petals (a 10-segment circle with alternating radii, tinted per instance from white, yellow, red and violet). The other holds the yellow centre plus stem.
- **Shrubs:** `IcosahedronGeometry(1, 2)` with seeded noise pushed along the normals and vertex colours darker at the base, 6 to 20 per hole. These may cast shadows.
- **River rock:** `DodecahedronGeometry(1, 0)` scaled to 3 to 8 cm and flattened in y, 150 to 400 per hole, sprinkled on the working tree's edging strip so it gains parallax. No shadows.
- **Paths:** crazy paving from a jittered-grid Voronoi canvas (mortar on cell borders) on a ribbon from the edge of the scene to the tee.
- **Lawn:** reuse the turf's `vnoise` macro chunk on `groundMaterial` to break its 2.5 m tile. Leave sheen off.
- Every scatter must honour "nothing stuffed into anything": reuse the footprint test in `c01Tidy`. Seed with `rng32(hole key)` so screenshots and tests stay stable.

### Recipe 9. Shading hygiene that is nearly free

- Analytic floor normals from `groundH` (see Recipe 3).
- Cache GPU textures per world, not per hole. `texOf()` makes a new `CanvasTexture` on every hole, which re-uploads and rebuilds mips. The working tree's `disposeGroup` already skips textures with `userData.keep`.
- Share materials. `mat()` creates a new material per call, giving 99 unique materials in one hole.

### Recipe 10. A real dusk next to neon night

Keep neon night as it is: it is a saved product mode in SPEC. For a realistic floodlit dusk:
- Sky uniforms to a deep blue gradient, no disc.
- The one shadow light becomes a cool, high floodlight.
- Lamp pools are warm additive radial decals on the turf, not `PointLight`s. Each extra light adds work to every lit pixel.
- Keep the scene's light count constant between holes. Changing which features a material uses forces a program rebuild, which "might be quite slow and induce jerkiness". The manual suggests dummy values instead, such as zero-intensity lights ([three.js manual: How to update things](https://threejs.org/manual/pages/how-to-update-things.html)).
- Set `TURF_U.uStripeK` to 0 and lower the sheen.

---

## 2. Performance budget on iPad

**What the suites already enforce:**
- Pixel ratio no more than 2, one 1024 shadow map, and fewer than 400k triangles (`tests/perf-check.cjs`).
- The white ball against the felt at 3:1 or better (`tests/render-check.cjs`).

**Suggested additions:**
- **Draw calls:** under 120 in the worst wide view (title orbit or overview), shadow pass included. Assert `renderer.info.render.calls` in perf-check with `play.overview = true`. Fewer, larger draw calls are faster ([MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)). Recipes 6 and 8 are the levers.
- **Shadow casters:** only walls, posts, movers, ball, putter, flagstick and big props. Grass, rocks, decals and small scenery get `castShadow = false`.
- **Textures:**
  - Colour maps at most 512 x 512, normal and ORM maps 256 x 256.
  - Mip chains add about 33% ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)), so a 512 x 512 RGBA map is about 1.4 MB on the GPU.
  - Aim for under 16 MB of textures per hole.
  - `texOf` caps anisotropy at 8. On the full-screen turf, 4 may be enough: test it.
- **Fragment cost** ([MeshPhysicalMaterial docs](https://threejs.org/docs/pages/MeshPhysicalMaterial.html): physical costs more per pixel and each feature adds cost):
  - Turf: physical with sheen, since it is the surface the player studies.
  - Ball: clearcoat (about 50 px, so negligible).
  - Ice: clearcoat.
  - Everything else: `MeshStandardMaterial`.
  - Lambert is cheaper, but `scene.environment` only feeds physical materials ([Scene docs](https://threejs.org/docs/pages/Scene.html)), so Lambert props would sit in different light. Use it only for tufts.
- **Resolution:** keep MSAA (`antialias: true`). Apple GPUs resolve MSAA in tile memory, which saves bandwidth ([Apple: MSAA](https://developer.apple.com/tutorials/data/documentation/metal/improving-edge-rendering-quality-with-multisample-antialiasing-msaa.md)). If frame time stays above budget, drop the pixel ratio instead. Rendering to a smaller back buffer is the standard trade ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)), and the three.js manual warns that high-DPI rendering multiplies the work ([responsive manual](https://threejs.org/manual/pages/responsive.html)).
  ```js
  const PR_STEPS = [1, 0.85, 0.72]; let prStep = 0, slow = 0, fast = 0;
  function adaptResolution(dtMs) {          /* hysteresis: setPixelRatio reallocates the drawing buffer */
    if (dtMs > 18.5) { slow++; fast = 0; } else { fast++; slow = 0; }
    const step = slow > 90 && prStep < 2 ? prStep + 1 : fast > 600 && prStep > 0 ? prStep - 1 : prStep;
    if (step !== prStep) { prStep = step; slow = fast = 0; renderer.setPixelRatio(Math.min(2, devicePixelRatio * stageScale) * PR_STEPS[prStep]); renderer.setSize(1200, 700, false); }
  }
  ```
- **Hitch control:**
  - Call `renderer.compileAsync(scene, camera)` (present in r170) during the intro fly-in, so programs compile before the first frame needs them. The non-blocking compile query behind it is the recommended path ([MDN, KHR_parallel_shader_compile](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)).
  - Build PMREMs once per look.
- **Measure on a real iPad.** Safari runs WebGL on Metal through ANGLE, and users reported frame-rate drops when "WebGL via Metal" became the default around iOS 15.4 ([WebKit list](https://lists.webkit.org/pipermail/webkit-unassigned/2023-April/1100579.html)). SwiftShader numbers do not transfer.

---

## 3. Pitfalls

1. `PCFSoftShadowMap` ignores `shadow.radius` for directional lights in r170, so today's `radius = 4` does nothing ([r170 chunk](https://github.com/mrdoob/three.js/blob/r170/src/renderers/shaders/ShaderChunk/shadowmap_pars_fragment.glsl.js)).
2. `canvasTex()` marks every canvas sRGB, including the ball's bump map. Normal, bump, roughness and ORM data must stay `NoColorSpace` ([color management](https://threejs.org/manual/en/color-management.html)). `texOf(c, false)` in the working tree is correct for normals.
3. A 2D `scene.background` is screen-space ([r170 background shader](https://github.com/mrdoob/three.js/blob/r170/src/renderers/shaders/ShaderLib/background.glsl.js)): the horizon won't track the camera. Use the dome in Recipe 1.
4. `HemisphereLight` plus `scene.environment` double the ambient light and flatten slopes. Lower the hemisphere light.
5. `onBeforeCompile` needs a stable `customProgramCacheKey`. Without one, three.js caches one program per callback. A random key recompiles every frame ([PR 17567](https://github.com/mrdoob/three.js/pull/17567), [forum](https://discourse.threejs.org/t/onbeforecompile-fires-only-once-although-i-set-needsupdate-true/38614.md)).
6. Vertex changes made in `onBeforeCompile` don't reach the shadow pass. Directional shadows use `object.customDepthMaterial` (r170 `WebGLShadowMap`), so the flag, grass sway or anything else that animates its vertices needs a patched depth material.
7. Toggling fog, vertex colours, texture presence, `transparent` or `side` on a material that has already rendered triggers a rebuild and a hitch ([manual](https://threejs.org/manual/pages/how-to-update-things.html)). Decide these per look at build time, and keep the light count constant.
8. Alpha-tested foliage (discard) works against Apple's hidden surface removal ([WWDC20](https://developer.apple.com/videos/play/wwdc2020/10602/)). Use solid geometry for tufts.
9. Sheen scales the base layer down ([KHR sheen](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_sheen/README.md)), and a cream sheen greys the green. Re-run render-check's 3:1 test after every turf change.
10. Baked stripes plus shader stripes show twice. Remove `band`/`stripe` from `floorShade()`.
11. Small shiny things sparkle. When normals average out in mips, the average gets shorter, which signals that roughness should rise ([NVIDIA, Toksvig: Mipmapping Normal Maps](https://developer.download.nvidia.com/whitepapers/2006/Mipmapping_Normal_Maps.pdf)). Keep `normalScale` modest on water and dimples, and avoid bump maps on moving objects.
12. The GLSL `sin` hash loses precision at large coordinates. Holes sit within a few tens of metres, so it is fine. Don't use it on the 120 m ground at full scale without a noise texture.
13. The sim stays untouched. Render randomness must be seeded (`rng32`), never `Math.random()` inside the sim, and render code must never write sim state.
14. Tests depend on structure:
    - render-check counts `BoxGeometry` children of `walls` against `h.segs.length` and checks their tops against `segTop`.
    - `nightDecor` filters `BoxGeometry` walls, replaces `floor.material.map`, and finds the ground by `PlaneGeometry` plus `renderOrder === -1`.
    - Merging walls or changing these types breaks both. Add caps as a separate mesh, or update the tests in the same change.
15. Neon night: `nightDecor` swaps the turf map for the neon carpet. Set `uStripeK = 0` and lower the sheen there, or the black-light carpet will show mown stripes.
16. The render cup must match the sim cup (`RIM_RHO`, `DISH_R`, `DISH_D` in the working tree), or the ball will visibly float or sink at the rim.
17. Reduced motion freezes everything decorative: flag wave, water scroll, waterfall, grass sway, drifting neon. Conveyor chevrons carry gameplay information (direction), so keep them visible: show them static rather than hide them.
18. `LatheGeometry` normals face the way the profile runs. List points top to bottom so they face into the cup. If the inside renders black, the order is reversed.
19. Text on a `DoubleSide` flag reads mirrored from behind. Flip the UVs on `!gl_FrontFacing`, as in Recipe 5.
20. Changing the tone mapper changes every look colour and the ball-on-felt contrast. Re-tune exposure and rerun render-check before judging.
21. PMREM targets and generators allocate GPU memory. Dispose the old `envRT` and the generator, and never regenerate per frame ([forum](https://discourse.threejs.org/t/bad-performances-when-animating-a-pmremgenerator-environment/48043)).
22. `MeshPhysicalMaterial` looks wrong without an environment map ([docs](https://threejs.org/docs/pages/MeshPhysicalMaterial.html)). Set `scene.environment` before the first frame of every hole.

---

## 4. Toybox stays in the DOM; the 3D world goes real

- **The DOM UI keeps every toybox rule:**
  - the `--v-*` tokens (`src/shell.html` uses `--v-yellow-line`, `--v-surface`, `--v-accent-green` and others)
  - flat `0 6px 0` shadows and big radii
  - numerals and symbols only
  - tap targets of at least 64 px at 1024x768
  - none of the realism work touches HUD, swing pad, cards, map or shop
- **Gameplay signs in 3D stay toybox too.** These are the aim line and ring, tube colour rims and exit arrows, drain spirals, conveyor chevrons, the lost-ball sparkle, the ghost ball and the pin-pull feedback. Draw them with `MeshBasicMaterial({ toneMapped: false })` so AgX, ACES or exposure changes never wash them out.
- **Surfaces must stay distinguishable at a glance:** felt, fast, ice, sand, mud, water and push zones. The game has no words, so realism must not make sand look like mud or a fringe look like a slow zone. Add a contrast check between felt and each zone colour next to the existing ball-on-felt test.
- **The equipped ball keeps its shop colours** (base, band, mark). Dimples and clearcoat sit on top. The ball is the player's identity and must stay readable at 3:1.

---

## Sources

**three.js r170 code checked directly**
- [shadowmap_pars_fragment](https://github.com/mrdoob/three.js/blob/r170/src/renderers/shaders/ShaderChunk/shadowmap_pars_fragment.glsl.js)
- [aomap_fragment](https://github.com/mrdoob/three.js/blob/r170/src/renderers/shaders/ShaderChunk/aomap_fragment.glsl.js)
- [roughnessmap_fragment](https://github.com/mrdoob/three.js/blob/r170/src/renderers/shaders/ShaderChunk/roughnessmap_fragment.glsl.js)
- [background shader](https://github.com/mrdoob/three.js/blob/r170/src/renderers/shaders/ShaderLib/background.glsl.js)
- [PMREMGenerator](https://github.com/mrdoob/three.js/blob/r170/src/extras/PMREMGenerator.js)
- [WebGLPrograms](https://github.com/mrdoob/three.js/blob/r170/src/renderers/webgl/WebGLPrograms.js)
- [WebGLProgram](https://github.com/mrdoob/three.js/blob/r170/src/renderers/webgl/WebGLProgram.js)
- [hemisphere example](https://raw.githubusercontent.com/mrdoob/three.js/r170/examples/webgl_lights_hemisphere.html)
- Releases [r160](https://github.com/mrdoob/three.js/releases/tag/r160) and [r162](https://github.com/mrdoob/three.js/releases/tag/r162)

**three.js docs and manual**
- [MeshPhysicalMaterial](https://threejs.org/docs/pages/MeshPhysicalMaterial.html)
- [PMREMGenerator](https://threejs.org/docs/pages/PMREMGenerator.html)
- [Scene](https://threejs.org/docs/pages/Scene.html)
- [LightShadow](https://threejs.org/docs/pages/LightShadow.html)
- [HemisphereLight](https://threejs.org/docs/pages/HemisphereLight.html)
- [InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html)
- [Shadows manual](https://threejs.org/manual/en/shadows.html)
- [Responsive manual](https://threejs.org/manual/pages/responsive.html)
- [Color management](https://threejs.org/manual/en/color-management.html)
- [How to update things](https://threejs.org/manual/pages/how-to-update-things.html)

**three.js forum and PRs**
- [Tone mapping guidance](https://discourse.threejs.org/t/pmndrs-post-processing-tone-mapping-guidance/59374/2)
- [AgX thread](https://discourse.threejs.org/t/is-agx-tonemapping-implemented-correctly/60609)
- [Shadow tests](https://discourse.threejs.org/t/webgpu-shadow-tests-and-findings/82561)
- [aoMap channel](https://discourse.threejs.org/t/lightmap-uses-wrong-uv-in-loaded-gltf-model/57434)
- [PMREM per frame](https://discourse.threejs.org/t/bad-performances-when-animating-a-pmremgenerator-environment/48043)
- [PR 17567](https://github.com/mrdoob/three.js/pull/17567)
- [onBeforeCompile thread](https://discourse.threejs.org/t/onbeforecompile-fires-only-once-although-i-set-needsupdate-true/38614.md)

**Rendering technique**
- [Khronos PBR Neutral](https://github.com/KhronosGroup/ToneMapping/blob/main/PBR_Neutral/README.md)
- [KHR_materials_sheen](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_sheen/README.md)
- [Microsoft shadow techniques](https://learn.microsoft.com/en-us/windows/win32/dxtecharts/common-techniques-to-improve-shadow-depth-maps)
- [Inigo Quilez texture repetition](https://iquilezles.org/articles/texturerepetition)
- [NVIDIA Toksvig](https://developer.download.nvidia.com/whitepapers/2006/Mipmapping_Normal_Maps.pdf)
- [GPU Gems ch. 7](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-7-rendering-countless-blades-waving-grass)
- [Chalmers slides](https://www.cse.chalmers.se/edu/year/2018/course/TDA361/Advanced%20Computer%20Graphics/Rendering%20Countless%20Blades%20of%20Waving%20Grass.pdf)
- [Valve GDC 2011 water](https://www.hlportal.de/files/GDC2011_BronwenGrimes_NonstandardTextures.pdf)
- [Catlike Coding flow](https://catlikecoding.com/unity/tutorials/flow/texture-distortion/)
- [Schlick's approximation](https://en.wikipedia.org/wiki/Schlick%27s_approximation)
- [F0 table](https://wp.faculty.wmi.amu.edu.pl/CGP2.pdf)
- [Book of Shaders patterns](https://thebookofshaders.com/09/)
- [Book of Shaders noise](https://thebookofshaders.com/11/)
- [Sobel height to normal](https://github.com/MircoWerner/BumpToNormalMap/blob/main/bumptonormalmap.py)

**Hardware and browser**
- [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
- [Apple WWDC20 10602](https://developer.apple.com/videos/play/wwdc2020/10602/)
- [Apple MSAA](https://developer.apple.com/tutorials/data/documentation/metal/improving-edge-rendering-quality-with-multisample-antialiasing-msaa.md)
- [Imagination: do not use discard](https://docs.imgtec.com/starter-guides/powervr-architecture/html/topics/rules/do-not-use-discard.html)
- [WebKit report](https://lists.webkit.org/pipermail/webkit-unassigned/2023-April/1100579.html)
- [iPad Air specs](https://www.apple.com/ipad-air/specs/)

**Real greens, cups and courses**
- [CaddieHQ hole dimensions](https://www.caddiehq.com/resources/what-are-the-dimensions-of-a-golf-hole)
- [USGA painted holes](https://www.usga.org/content/usga/home-page/course-care/green-section-record/60/03/painting-hole-locations---by-the-numbers.html)
- [USGA flagstick decision](https://www.usga.org/etc/designs/usga/content/rule-book/decision-17.html)
- [Ferrule socket patent](https://ipiq.io/patents/1938163)
- [Golfdom collars](https://golfdom.com/?p=37534)
- [Toro Greensmaster 1021](https://www.toro.com/en-gb/product/04830)
- [Lawn Solutions Australia](https://lawnsolutionsaustralia.com.au/lawn-care/lawn-mowing/getting-those-stripes-in-your-lawn/)
- [Wright Mfg](https://wrightmfg.com/articles/secrets-to-striping-lawns/)
- [Greatmats](https://greatmats.com/the-best-artificial-grass-for-indoor-outdoor-putt-putt-courses.php)
- [Southwest Greens](https://southwestgreens.com/collections/golf-en)
- [Instructables](https://www.instructables.com/Miniature-Golf-Putt-Putt-Course)
- [This Old House](https://www.thisoldhouse.com/how-to/how-to-build-miniature-golf-course)
- [US3858887A](https://patents.google.com/patent/US3858887A/OSRAM)
- [US10463936B1](https://patents.google.com/patent/US10463936)
- [Parks & Rec Business](https://www.parksandrecbusiness.com/articles/2004/08/11/giant-miniature-part-ii-2)
- [Golfer Hive](https://golferhive.com/kingtop-putting-green-flags-review/)
- [Wayfair Watsy](https://www.wayfair.com/outdoor/pdp/watsy-backyard-mini-golf-flagstick-set-wtsy1000.html)
- [Golf Monthly dimples](https://www.golfmonthly.com/features/how-many-dimples-are-there-on-a-golf-ball)
- [Golf Digest Pro V1](https://golfdigest.com/story/titleist-prov1-prov1x-2021)
- [US6872423B2](https://patents.google.com/patent/US6872423)

**Light and colour**
- [Wikipedia: Albedo](https://en.wikipedia.org/wiki/Albedo)
- [Wikipedia: Angular diameter](https://en.wikipedia.org/wiki/Angular_diameter)
- [Digital Camera World](https://www.digitalcameraworld.com/features/what-and-when-is-golden-hour-photography)
- [Wikiwand: Golden hour](https://www.wikiwand.com/en/articles/Golden_hour_(photography))

The measurement scripts and the scratch build lived in a scratch folder during the research and are not kept in the repo. Nothing in the repo was changed by the research.