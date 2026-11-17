/* =========================================================
   "From scan to step" — scroll-driven 3D socket
   Act 1 (scan):   points sweep into the socket shape
   Act 2 (design): wireframe, trimline and measured circumferences
   Act 3 (print):  solid socket built layer by layer, then turns
   three.js is only downloaded when the section comes near the viewport.
   ========================================================= */
const section = document.getElementById("process");
const M = (window.DYNALIMB_MEDIA || {}).process || {};

if (section) init();

function init() {
  const steps = [...section.querySelectorAll(".pstep")];
  const rail = [...section.querySelectorAll(".process-rail span")];
  const clips = [...section.querySelectorAll(".process-clip")];
  const toggle = section.querySelector(".process-toggle");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
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
  const stepFor = p => (p < 0.34 ? 0 : p < 0.66 ? 1 : 2);

  let inView = false;
  new IntersectionObserver(([e]) => {
    inView = e.isIntersecting;
    if (!inView) clips.forEach(f => f.querySelector("video") && f.querySelector("video").pause());
    else { activeStep = -1; setStep(reduce ? 2 : stepFor(progress())); }
  }).observe(section);

  if (!reduce) addEventListener("scroll", () => { const p = progress(); setIntro(p < 0.05); setStep(stepFor(p)); }, { passive: true });
  setIntro(!reduce && progress() < 0.05);
  setStep(reduce ? 2 : stepFor(progress()));

  toggle.addEventListener("click", () => {
    paused = !paused;
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.setAttribute("aria-label", paused ? "Play animation" : "Pause animation");
    const cur = activeStep; activeStep = -1; setStep(cur);
  });
  if (reduce) toggle.hidden = true;

  // Load three.js + the model only when the section is within a screen of view
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
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);

  /* ---------- Model ---------- */
  const buf = await fetch(M.model).then(r => { if (!r.ok) throw new Error("model " + r.status); return r.arrayBuffer(); });
  const dv = new DataView(buf);
  const n = dv.getUint32(0, true), ic = dv.getUint32(4, true);
  const size = [dv.getFloat32(8, true), dv.getFloat32(12, true), dv.getFloat32(16, true)];
  const q = new Int16Array(buf, 20, n * 3);
  let off = 20 + n * 6; if (off % 4) off += 4 - (off % 4);
  const index = n < 65536 ? new Uint16Array(buf, off, ic) : new Uint32Array(buf, off, ic);

  const H = 3.0;                          // model height in scene units
  const s = H / size[2];                  // scene units per mm
  const pos = new Float32Array(n * 3);
  for (let v = 0; v < n; v++) {           // STL Z-up -> three Y-up
    const x = q[v * 3] / 32767 * size[0] / 2, y = q[v * 3 + 1] / 32767 * size[1] / 2, z = q[v * 3 + 2] / 32767 * size[2] / 2;
    pos[v * 3] = x * s; pos[v * 3 + 1] = z * s; pos[v * 3 + 2] = -y * s;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geom.setIndex(new THREE.BufferAttribute(index, 1));
  geom.computeVertexNormals();
  const minY = -H / 2, maxY = H / 2;

  const group = new THREE.Group();
  scene.add(group);
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
  group.add(points);

  // Scanner sweep ring
  const sweep = new THREE.Mesh(
    new THREE.RingGeometry(0.78, 0.84, 96),
    new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  sweep.rotation.x = -Math.PI / 2;
  group.add(sweep);

  /* Act 2: wireframe, trimline, measured circumferences */
  const wire = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color: TEAL, wireframe: true, transparent: true, opacity: 0, depthWrite: false }));
  group.add(wire);

  // Trimline: highest vertex in each angular bucket around the long axis
  const B = 160, top = new Array(B).fill(null);
  for (let v = 0; v < n; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    const b = Math.floor(((Math.atan2(z, x) + Math.PI) / (Math.PI * 2)) * B) % B;
    if (!top[b] || y > top[b][1]) top[b] = [x, y, z];
  }
  const rim = top.filter(Boolean);
  const rimPts = rim.map((p, i) => {          // light smoothing
    const a = rim[(i - 1 + rim.length) % rim.length], c = rim[(i + 1) % rim.length];
    return new THREE.Vector3((a[0] + 2 * p[0] + c[0]) / 4 * 1.02, (a[1] + 2 * p[1] + c[1]) / 4 + 0.01, (a[2] + 2 * p[2] + c[2]) / 4 * 1.02);
  });
  rimPts.push(rimPts[0].clone());
  const trimGeom = new THREE.BufferGeometry().setFromPoints(rimPts);
  const trim = new THREE.Line(trimGeom, new THREE.LineBasicMaterial({ color: 0x7ff6fa, transparent: true, opacity: 0 }));
  trimGeom.setDrawRange(0, 0);
  group.add(trim);

  // Circumference rings at two heights, measured from the real mesh
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
    group.add(line);
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
  group.add(solid);

  // Glowing "nozzle" ring at the print height
  const nozzle = new THREE.Mesh(
    new THREE.RingGeometry(0.0, 0.7, 64),
    new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  nozzle.rotation.x = -Math.PI / 2;
  group.add(nozzle);

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
    // Push the model right on desktop (text sits left), up on phones (text sits below)
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize);
  resize();

  /* Animation */
  const ramp = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
  const ease = t => t * t * (3 - 2 * t);
  let shown = reduce ? 1 : progress();
  let idle = 0, last = performance.now(), running = false, lift = 0;
  const introStart = performance.now();   // opening sweep on first view, before any scrolling

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const target = reduce ? 1 : progress();
    shown += (target - shown) * Math.min(1, dt * 6);     // damped, cinematic catch-up
    const p = shown;
    // Frame the model: right of the text on desktop; on phones, high while the intro text is up
    lift += (((mobile && p < 0.05) ? 0.24 : -0.03) - lift) * Math.min(1, dt * 4);
    if (mobile) camera.setViewOffset(W, Hh, 0, Hh * lift, W, Hh);
    else camera.setViewOffset(W, Hh, -W * 0.17, 0, W, Hh);
    if (!isPaused()) idle += dt * 0.12;

    const intro = reduce ? 0 : ease(Math.min(1, (now - introStart) / 3000)) * 0.45;
    const scan = Math.max(ease(ramp(p, 0.02, 0.30)), intro);
    pMat.uniforms.uScan.value = scan;
    pMat.uniforms.uFade.value = 1 - ramp(p, 0.36, 0.48);
    points.visible = pMat.uniforms.uFade.value > 0.01;
    sweep.position.y = maxY - (maxY - minY) * scan;
    sweep.material.opacity = scan > 0 && scan < 1 ? 0.85 : 0;

    wire.material.opacity = ramp(p, 0.32, 0.42) * 0.13 - ramp(p, 0.70, 0.80) * 0.06 - ramp(p, 0.90, 0.97) * 0.07;
    wire.visible = wire.material.opacity > 0.005;

    const tr = ramp(p, 0.42, 0.56);
    trimGeom.setDrawRange(0, Math.floor(rimPts.length * tr));
    trim.material.opacity = tr > 0 ? 1 - ramp(p, 0.74, 0.82) : 0;

    const ringOn = ramp(p, 0.50, 0.58) * (1 - ramp(p, 0.68, 0.74));
    rings.forEach(r => { r.line.material.opacity = ringOn; r.label.style.opacity = ringOn; });

    const pr = ramp(p, 0.68, 0.94);
    const cy = minY - 0.02 + (H + 0.04) * ease(pr);
    clip.constant = cy;
    shaderRef.uClipY.value = cy;
    shaderRef.uPrinting.value = pr > 0 && pr < 1 ? 1 : 0;
    solid.visible = pr > 0;
    nozzle.position.y = cy;
    nozzle.material.opacity = pr > 0 && pr < 1 ? 0.22 : 0;

    // Camera: slow orbit + gentle descent through the acts
    const ang = -0.7 + p * 2.4 + idle;
    const elev = 0.55 - p * 0.35;
    const dist = (mobile ? 14 : 9.4) - ease(ramp(p, 0.3, 0.6)) * 0.8;
    scene.fog.near = dist - 2; scene.fog.far = dist + 6;
    camera.position.set(Math.sin(ang) * dist, elev * dist * 0.5, Math.cos(ang) * dist);
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);

    // Pin measurement labels to their rings
    if (ringOn > 0.01) rings.forEach(r => {
      v3.copy(r.anchor).applyMatrix4(group.matrixWorld).project(camera);
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
