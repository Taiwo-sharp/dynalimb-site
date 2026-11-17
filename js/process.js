/* =========================================================
   "From scan to step" — scroll-driven 3D socket (opens the page)
   Act 1 (scan):   points sweep into the socket shape
   Act 2 (design): wireframe, trimline and measured circumferences
   Act 3 (print):  solid socket built layer by layer
   Act 4 (walk):   pylon + Macy Foot attach, the finished leg walks
   three.js is only downloaded when the section comes near the viewport.
   ========================================================= */
import { loadMesh, topPoint } from "./mesh.js";

const section = document.getElementById("process");
const M = (window.DYNALIMB_MEDIA || {}).process || {};

// Scroll timeline: acts 1-3 use the first 75%, act 4 the rest
const P3 = 0.75;
const stepFor = p => (p >= P3 ? 3 : p / P3 < 0.34 ? 0 : p / P3 < 0.66 ? 1 : 2);

if (section) init();

function init() {
  const steps = [...section.querySelectorAll(".pstep")];
  const rail = [...section.querySelectorAll(".process-rail span")];
  const clips = [...section.querySelectorAll(".process-clip")];
  const toggle = section.querySelector(".process-toggle");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lastStep = steps.length - 1;
  let paused = reduce;
  let activeStep = -1;

  // Clip sources come from the media manifest
  clips.forEach((fig, i) => {
    const c = (M.clips || [])[i];
    const v = fig.querySelector("video");
    if (!c || !v) { fig.remove(); return; }
    if (c.poster) v.poster = c.poster;
    [["video/webm", c.webm], ["video/mp4", c.mp4]].forEach(([type, src]) => {
      if (!src) return;
      const s = document.createElement("source"); s.type = type; s.src = src; v.appendChild(s);
    });
  });

  if (reduce) section.classList.add("is-static");

  function setIntro(on) { section.classList.toggle("at-intro", on); }

  function setStep(i) {
    if (i === activeStep) return;
    activeStep = i;
    steps.forEach((s, k) => s.classList.toggle("is-active", k === i));
    rail.forEach((r, k) => r.classList.toggle("is-on", k <= i));
    clips.forEach(fig => {
      const on = +fig.dataset.step === i;
      fig.classList.toggle("is-active", on);
      const v = fig.querySelector("video");
      if (!v) return;
      if (on && !paused && inView) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
      else v.pause();
    });
  }

  // Scroll progress through the pinned section, 0..1
  function progress() {
    const r = section.getBoundingClientRect();
    const total = section.offsetHeight - innerHeight;
    return total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1;
  }

  let inView = false;
  new IntersectionObserver(([e]) => {
    inView = e.isIntersecting;
    if (!inView) clips.forEach(f => f.querySelector("video") && f.querySelector("video").pause());
    else { activeStep = -1; setStep(reduce ? lastStep : stepFor(progress())); }
  }).observe(section);

  if (!reduce) addEventListener("scroll", () => { const p = progress(); setIntro(p < 0.05); setStep(stepFor(p)); }, { passive: true });
  setIntro(!reduce && progress() < 0.05);
  setStep(reduce ? lastStep : stepFor(progress()));

  toggle.addEventListener("click", () => {
    paused = !paused;
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.setAttribute("aria-label", paused ? "Play animation" : "Pause animation");
    const cur = activeStep; activeStep = -1; setStep(cur);
  });
  if (reduce) toggle.hidden = true;

  // Load three.js + the models only when the section is within a screen of view
  const near = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    near.disconnect();
    startScene({ progress, isPaused: () => paused, reduce }).catch(err => {
      console.warn("[process] 3D unavailable:", err);
      section.classList.add("no-3d"); section.classList.remove("at-intro");
    });
  }, { rootMargin: "100% 0px" });
  near.observe(section);
}

async function startScene({ progress, isPaused, reduce }) {
  const canvas = section.querySelector(".process-canvas");
  const labelsEl = section.querySelector(".process-labels");
  const THREE = await import("./vendor/three.module.min.js");

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) { throw new Error("WebGL not available"); }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.localClippingEnabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x050a24, 6, 13);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);

  /* ---------- Models (same mm scale for socket and foot) ---------- */
  const sock = await loadMesh(THREE, M.model, 1);       // scale fixed below once size is known
  const H = 3.0, s = H / sock.sizeMM[2];                  // socket height = 3 scene units
  sock.geometry.scale(s, s, s);
  const pos = sock.positions;                             // scaled in place by geometry.scale
  const n = sock.count;
  const geom = sock.geometry;
  const minY = -H / 2, maxY = H / 2;

  // Pivot at the top of the socket (the knee) so the finished leg can swing
  const group = new THREE.Group(); scene.add(group);
  const rig = new THREE.Group(); rig.position.y = maxY; group.add(rig);
  const inner = new THREE.Group(); inner.position.y = -maxY; rig.add(inner);
  const TEAL = new THREE.Color(0x15c9d0);

  /* Act 1: point cloud that sweeps into shape */
  const start = new Float32Array(n * 3), rnd = new Float32Array(n);
  for (let v = 0; v < n; v++) {
    const a = Math.random() * Math.PI * 2, r = 2.2 + Math.random() * 2.5, h = (Math.random() - 0.5) * 5;
    start[v * 3] = Math.cos(a) * r; start[v * 3 + 1] = h; start[v * 3 + 2] = Math.sin(a) * r;
    rnd[v] = Math.random();
  }
  const pGeom = new THREE.BufferGeometry();
  pGeom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  pGeom.setAttribute("aStart", new THREE.BufferAttribute(start, 3));
  pGeom.setAttribute("aRand", new THREE.BufferAttribute(rnd, 1));
  const pMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uScan: { value: 0 }, uFade: { value: 1 }, uPix: { value: renderer.getPixelRatio() }, uMinY: { value: minY }, uMaxY: { value: maxY }, uColor: { value: TEAL } },
    vertexShader: `
      attribute vec3 aStart; attribute float aRand;
      uniform float uScan, uPix, uMinY, uMaxY, uFade;
      varying float vA, vGlow;
      void main(){
        float h = (position.y - uMinY) / (uMaxY - uMinY);
        float local = clamp((uScan * 1.6 - (1.0 - h) - aRand * 0.2) / 0.4, 0.0, 1.0);
        float e = local * local * (3.0 - 2.0 * local);
        vec3 p = mix(aStart, position, e);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uPix * (2.6 + (1.0 - e) * 2.4) * (6.0 / -mv.z);
        vA = mix(0.35, 1.0, e) * uFade;
        vGlow = 1.0 - abs(e - 0.5) * 2.0;
      }`,
    fragmentShader: `
      uniform vec3 uColor; varying float vA, vGlow;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d) * vA;
        gl_FragColor = vec4(mix(uColor, vec3(1.0), vGlow * 0.6), a);
      }`
  });
  const points = new THREE.Points(pGeom, pMat);
  inner.add(points);

  const sweep = new THREE.Mesh(
    new THREE.RingGeometry(0.78, 0.84, 96),
    new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  sweep.rotation.x = -Math.PI / 2;
  inner.add(sweep);

  /* Act 2: wireframe, trimline, measured circumferences */
  const wire = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color: TEAL, wireframe: true, transparent: true, opacity: 0, depthWrite: false }));
  inner.add(wire);

  const B = 160, top = new Array(B).fill(null);
  for (let v = 0; v < n; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    const b = Math.floor(((Math.atan2(z, x) + Math.PI) / (Math.PI * 2)) * B) % B;
    if (!top[b] || y > top[b][1]) top[b] = [x, y, z];
  }
  const rim = top.filter(Boolean);
  const rimPts = rim.map((p, i) => {
    const a = rim[(i - 1 + rim.length) % rim.length], c = rim[(i + 1) % rim.length];
    return new THREE.Vector3((a[0] + 2 * p[0] + c[0]) / 4 * 1.02, (a[1] + 2 * p[1] + c[1]) / 4 + 0.01, (a[2] + 2 * p[2] + c[2]) / 4 * 1.02);
  });
  rimPts.push(rimPts[0].clone());
  const trimGeom = new THREE.BufferGeometry().setFromPoints(rimPts);
  const trim = new THREE.Line(trimGeom, new THREE.LineBasicMaterial({ color: 0x7ff6fa, transparent: true, opacity: 0 }));
  trimGeom.setDrawRange(0, 0);
  inner.add(trim);

  function ringAt(frac) {
    const y0 = minY + H * frac, band = H * 0.012, RB = 72, rad = new Array(RB).fill(0);
    for (let v = 0; v < n; v++) {
      const y = pos[v * 3 + 1]; if (Math.abs(y - y0) > band) continue;
      const x = pos[v * 3], z = pos[v * 3 + 2];
      const b = Math.floor(((Math.atan2(z, x) + Math.PI) / (Math.PI * 2)) * RB) % RB;
      rad[b] = Math.max(rad[b], Math.hypot(x, z));
    }
    const filled = rad.map((r, i) => r || rad[(i + 1) % RB] || rad[(i - 1 + RB) % RB]);
    const pts = filled.map((r, i) => { const a = (i + 0.5) / RB * Math.PI * 2 - Math.PI; return new THREE.Vector3(Math.cos(a) * r * 1.05, y0, Math.sin(a) * r * 1.05); });
    let per = 0; for (let i = 0; i < RB; i++) { const a = filled[i], b = filled[(i + 1) % RB], th = Math.PI * 2 / RB; per += Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(th)); }
    pts.push(pts[0].clone());
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.05, gapSize: 0.035, transparent: true, opacity: 0 }));
    line.computeLineDistances();
    inner.add(line);
    const anchor = pts.reduce((a, b) => (b.x > a.x ? b : a));
    const label = document.createElement("span");
    label.className = "process-label";
    label.textContent = "Circumference " + Math.round(per / s) + " mm";
    labelsEl.appendChild(label);
    return { line, anchor: anchor.clone(), label };
  }
  const rings = [ringAt(0.35), ringAt(0.62)];

  /* Act 3: solid socket printed layer by layer */
  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), minY);
  const solidMat = new THREE.MeshStandardMaterial({ color: 0xdfe6ea, roughness: 0.5, metalness: 0.05, side: THREE.DoubleSide, clippingPlanes: [clip] });
  const shaderRef = { uClipY: { value: minY }, uPrinting: { value: 0 }, uLayers: { value: 140 / H } };
  solidMat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, shaderRef);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vWY;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWY = (modelMatrix * vec4(transformed, 1.0)).y;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vWY; uniform float uClipY, uPrinting, uLayers;")
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        float ln = abs(fract(vWY * uLayers) - 0.5);
        diffuseColor.rgb *= mix(0.82, 1.0, smoothstep(0.0, 0.18, ln));
        float edge = 1.0 - smoothstep(0.0, 0.05, uClipY - vWY);
        totalEmissiveRadiance += vec3(0.08, 0.79, 0.82) * edge * uPrinting * 1.6;`);
  };
  const solid = new THREE.Mesh(geom, solidMat);
  inner.add(solid);

  const nozzle = new THREE.Mesh(
    new THREE.RingGeometry(0.0, 0.7, 64),
    new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  nozzle.rotation.x = -Math.PI / 2;
  group.add(nozzle);

  /* Act 4: pylon + Macy Foot, then walking */
  const pylonLen = 170 * s, pylonR = 15 * s;
  const pylon = new THREE.Mesh(
    new THREE.CylinderGeometry(pylonR, pylonR, pylonLen, 32),
    new THREE.MeshStandardMaterial({ color: 0xb8c2cc, metalness: 0.9, roughness: 0.28 })
  );
  pylon.position.y = minY - pylonLen / 2;
  pylon.visible = false;
  inner.add(pylon);

  let foot = null, footHome = new THREE.Vector3(), toeDir = 1, floorY = minY - pylonLen - 1;
  if (M.foot) {
    try {
      const f = await loadMesh(THREE, M.foot, s);
      const tp = topPoint(f.positions, f.count);             // pyramid adapter
      // Toe points away from the adapter along the foot's length (Z)
      toeDir = tp.z > 0 ? -1 : 1;
      foot = new THREE.Mesh(f.geometry, new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.45, metalness: 0.1, transparent: true }));
      footHome.set(-tp.x, minY - pylonLen - tp.y, -tp.z);
      foot.position.copy(footHome);
      foot.visible = false;
      inner.add(foot);
      f.geometry.computeBoundingBox();
      floorY = footHome.y + f.geometry.boundingBox.min.y;
    } catch (e) { console.warn("[process] foot model unavailable:", e); }
  }

  // Treadmill floor: a grid that scrolls under the walking leg
  const grid = new THREE.GridHelper(40, 80, 0x15c9d0, 0x15c9d0);
  grid.material.transparent = true; grid.material.opacity = 0; grid.material.depthWrite = false;
  grid.position.y = floorY - 0.01;
  scene.add(grid);
  const floorGlow = new THREE.Mesh(
    new THREE.CircleGeometry(1.6, 64),
    new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  floorGlow.rotation.x = -Math.PI / 2; floorGlow.position.y = floorY;
  scene.add(floorGlow);

  /* Lights */
  scene.add(new THREE.HemisphereLight(0xbfe9ff, 0x0a1342, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 4, 5); scene.add(key);
  const rimL = new THREE.DirectionalLight(0x15c9d0, 2.4); rimL.position.set(-4, 2, -3); scene.add(rimL);
  const warm = new THREE.PointLight(0xffb27a, 6, 10); warm.position.set(2, -2, 3); scene.add(warm);

  /* Layout */
  const v3 = new THREE.Vector3();
  let W = 0, Hh = 0, mobile = false;
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); Hh = Math.max(1, r.height);
    mobile = W < 900;
    renderer.setSize(W, Hh, false);
    camera.aspect = W / Hh;
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize);
  resize();

  /* Animation */
  const ramp = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
  const ease = t => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  let shown = reduce ? 1 : progress();
  let idle = 0, gaitT = 0, last = performance.now(), running = false, lift = 0;
  const introStart = performance.now();

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const target = reduce ? 1 : progress();
    shown += (target - shown) * Math.min(1, dt * 6);
    const pAll = shown;
    const p = Math.min(1, pAll / P3);                     // acts 1-3 timeline
    const w = ramp(pAll, P3 + 0.01, 0.97);               // act 4 timeline
    if (!isPaused()) idle += dt * 0.12;

    lift += ((!mobile ? 0 : pAll < 0.05 ? 0.24 : pAll >= P3 ? 0.16 : -0.03) - lift) * Math.min(1, dt * 4);
    if (mobile) camera.setViewOffset(W, Hh, 0, Hh * lift, W, Hh);
    else camera.setViewOffset(W, Hh, -W * 0.17, 0, W, Hh);

    // Act 1
    const intro = reduce ? 0 : ease(Math.min(1, (now - introStart) / 3000)) * 0.45;
    const scan = Math.max(ease(ramp(p, 0.02, 0.30)), intro);
    pMat.uniforms.uScan.value = scan;
    pMat.uniforms.uFade.value = 1 - ramp(p, 0.36, 0.48);
    points.visible = pMat.uniforms.uFade.value > 0.01;
    sweep.position.y = maxY - (maxY - minY) * scan;
    sweep.material.opacity = scan > 0 && scan < 1 ? 0.85 : 0;

    // Act 2
    wire.material.opacity = ramp(p, 0.32, 0.42) * 0.13 - ramp(p, 0.70, 0.80) * 0.06 - ramp(p, 0.90, 0.97) * 0.07;
    wire.visible = wire.material.opacity > 0.005;
    const tr = ramp(p, 0.42, 0.56);
    trimGeom.setDrawRange(0, Math.floor(rimPts.length * tr));
    trim.material.opacity = tr > 0 ? 1 - ramp(p, 0.74, 0.82) : 0;
    trim.visible = trim.material.opacity > 0.01;
    const ringOn = ramp(p, 0.50, 0.58) * (1 - ramp(p, 0.68, 0.74));
    rings.forEach(r => { r.line.material.opacity = ringOn; r.line.visible = ringOn > 0.01; r.label.style.opacity = ringOn; });

    // Act 3
    const pr = ramp(p, 0.68, 0.94);
    const cy = pr >= 1 ? 100 : minY - 0.02 + (H + 0.04) * ease(pr);
    clip.constant = cy;
    shaderRef.uClipY.value = cy;
    shaderRef.uPrinting.value = pr > 0 && pr < 1 ? 1 : 0;
    solid.visible = pr > 0;
    nozzle.position.y = cy;
    nozzle.material.opacity = pr > 0 && pr < 1 ? 0.22 : 0;

    // Act 4: assemble, then walk
    const asm = ease(ramp(w, 0, 0.4));
    pylon.visible = asm > 0;
    pylon.scale.y = Math.max(0.001, ease(ramp(w, 0, 0.2)));
    pylon.position.y = minY - pylonLen * pylon.scale.y / 2;
    if (foot) {
      const fIn = ease(ramp(w, 0.12, 0.4));
      foot.visible = fIn > 0;
      foot.position.set(footHome.x, footHome.y - (1 - fIn) * 1.2, footHome.z);
      foot.material.opacity = fIn;
    }
    const walkAmp = ease(ramp(w, 0.4, 0.62));
    if (walkAmp > 0 && !isPaused()) gaitT += dt * 1.6;
    const swing = Math.sin(gaitT * Math.PI) * 0.32 * walkAmp;
    rig.rotation.x = swing * toeDir;
    if (foot) foot.rotation.x = -swing * toeDir * 0.75;   // keep the sole near flat to the floor
    const floorOn = ramp(w, 0.3, 0.55);
    grid.material.opacity = floorOn * 0.22;
    floorGlow.material.opacity = floorOn * 0.12;
    if (walkAmp > 0 && !isPaused()) grid.position.z = ((grid.position.z - toeDir * dt * 0.9 * walkAmp) % 0.5 + 0.5) % 0.5 - 0.25;

    // Camera: orbit through acts 1-3, then swing round to a side view for the walk
    const ang3 = -0.7 + p * 2.4 + idle;
    const side = Math.atan2(1, 0) + (toeDir > 0 ? 0 : Math.PI) - 0.35;  // profile, slightly three-quarter
    const camW = ease(ramp(w, 0.05, 0.45));
    const ang = lerp(ang3, side + Math.sin(idle * 0.6) * 0.15, camW);
    const elev = lerp(0.55 - p * 0.35, 0.12, camW);
    let dist = (mobile ? 14 : 9.4) - ease(ramp(p, 0.3, 0.6)) * 0.8;
    dist = lerp(dist, mobile ? 19 : 14, camW);
    const lookY = lerp(0, (floorY + maxY) / 2 + 0.25, camW);
    scene.fog.near = dist - 2; scene.fog.far = dist + 7;
    camera.position.set(Math.sin(ang) * dist, lookY + elev * dist * 0.5, Math.cos(ang) * dist);
    camera.lookAt(0, lookY, 0);

    renderer.render(scene, camera);

    if (ringOn > 0.01) rings.forEach(r => {
      v3.copy(r.anchor).applyMatrix4(inner.matrixWorld).project(camera);
      const lx = Math.min((v3.x * 0.5 + 0.5) * W + 12, W - r.label.offsetWidth - 10);
      r.label.style.transform = `translate(${lx}px, ${(-v3.y * 0.5 + 0.5) * Hh - 10}px)`;
    });

    if (running) requestAnimationFrame(frame);
  }

  function setRunning(on) {
    if (on === running) return;
    running = on;
    if (on) { last = performance.now(); requestAnimationFrame(frame); }
  }
  new IntersectionObserver(([e]) => setRunning(e.isIntersecting)).observe(section);
  section.classList.add("has-3d");
  if (reduce) { running = false; frame(performance.now()); }
  else setRunning(section.getBoundingClientRect().top < innerHeight && section.getBoundingClientRect().bottom > 0);
}
