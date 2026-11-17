/* =========================================================
   Macy Foot spotlight: interactive 3D foot (drag to rotate, colour swatches)
   with the product film as a second view. Falls back to the film alone
   if WebGL or the model is unavailable.
   ========================================================= */
import { loadMesh } from "./mesh.js";

const section = document.getElementById("macy");
const MM = window.DYNALIMB_MEDIA || {};
const MAC = MM.macy || {};

if (section) init();

function init() {
  const video = section.querySelector(".macy-video");
  const canvas = section.querySelector(".macy-canvas");
  const toggle = section.querySelector(".macy-toggle");
  const tabs = [...section.querySelectorAll(".macy-tabs button")];
  const swatches = [...section.querySelectorAll(".macy-swatches button")];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let view = "film", paused = reduce, inView = false, videoLoaded = false, scene3d = null;

  swatches.forEach(b => { b.style.background = b.dataset.color; });
  if (MAC.poster) video.poster = MAC.poster;

  function loadVideo() {
    if (videoLoaded) return; videoLoaded = true;
    [["video/mp4", MAC.mp4], ["video/webm", MAC.webm]].forEach(([type, src]) => {
      if (!src) return;
      const s = document.createElement("source"); s.type = type; s.src = src; video.appendChild(s);
    });
    video.load();
  }

  function sync() {
    section.dataset.view = view;
    tabs.forEach(t => t.setAttribute("aria-pressed", String(t.dataset.view === view)));
    if (view === "film" && inView && !paused) { loadVideo(); const p = video.play(); if (p && p.catch) p.catch(() => {}); }
    else video.pause();
    if (scene3d) scene3d.setRunning(view === "3d" && inView);
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.setAttribute("aria-label", (paused ? "Play " : "Pause ") + (view === "film" ? "video" : "rotation"));
  }

  tabs.forEach(t => t.addEventListener("click", () => { view = t.dataset.view; sync(); }));
  toggle.addEventListener("click", () => { paused = !paused; sync(); });
  swatches.forEach(b => b.addEventListener("click", () => {
    swatches.forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    if (scene3d) scene3d.setColor(b.dataset.color);
    if (view !== "3d" && scene3d) { view = "3d"; sync(); }
  }));

  new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }, { rootMargin: "100px 0px" }).observe(section);

  // Start the 3D view once the section is near; until then (or on failure) show the film
  const near = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    near.disconnect();
    if (!MAC.model) { sync(); return; }
    startFoot(canvas, () => paused, reduce).then(api => {
      scene3d = api;
      section.classList.add("has-3d");
      view = "3d";
      sync();
    }).catch(err => { console.warn("[macy] 3D unavailable:", err); view = "film"; sync(); });
  }, { rootMargin: "150% 0px" });
  near.observe(section);
  sync();
}

async function startFoot(canvas, isPaused, reduce) {
  const THREE = await import("./vendor/three.module.min.js");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 50);

  const f = await loadMesh(THREE, MAC.model, 1 / 100);       // 100 mm = 1 unit
  f.geometry.computeBoundingBox();
  const bb = f.geometry.boundingBox;
  const mat = new THREE.MeshPhysicalMaterial({ color: 0x1b1d22, roughness: 0.38, metalness: 0.05, clearcoat: 0.6, clearcoatRoughness: 0.35 });
  const foot = new THREE.Mesh(f.geometry, mat);
  const holder = new THREE.Group();
  foot.position.y = -bb.min.y - (bb.max.y - bb.min.y) / 2;   // centre vertically
  holder.add(foot);
  scene.add(holder);

  // Soft studio floor glow and reflection-like shadow
  const floorY = -(bb.max.y - bb.min.y) / 2;
  const glow = new THREE.Mesh(new THREE.CircleGeometry(1.7, 64), new THREE.MeshBasicMaterial({ color: 0x15c9d0, transparent: true, opacity: 0.08, depthWrite: false }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = floorY - 0.005; scene.add(glow);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.62, 1.66, 96), new THREE.MeshBasicMaterial({ color: 0x15c9d0, transparent: true, opacity: 0.35, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = floorY; scene.add(ring);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x101020, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(3, 5, 4); scene.add(key);
  const rimL = new THREE.DirectionalLight(0x15c9d0, 2.2); rimL.position.set(-4, 2, -4); scene.add(rimL);
  const fill = new THREE.DirectionalLight(0xffd2b0, 0.8); fill.position.set(-3, -1, 4); scene.add(fill);

  function resize() {
    const r = canvas.getBoundingClientRect();
    renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false);
    camera.aspect = r.width / Math.max(1, r.height);
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize); resize();

  // Drag to rotate (horizontal) and tilt a little (vertical); auto-rotate when idle
  let yaw = -0.6, pitch = 0.18, vYaw = 0, dragging = false, lastX = 0, lastY = 0, lastInteract = -1e9;
  canvas.addEventListener("pointerdown", e => { e.preventDefault(); dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); canvas.classList.add("dragging"); });
  canvas.addEventListener("pointermove", e => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
    vYaw = dx * 0.01; yaw += vYaw; pitch = Math.max(-0.2, Math.min(0.6, pitch + dy * 0.004));
    lastInteract = performance.now();
  });
  const end = () => { dragging = false; canvas.classList.remove("dragging"); };
  canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end);
  canvas.tabIndex = 0;
  canvas.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") { yaw -= 0.25; lastInteract = performance.now(); e.preventDefault(); }
    if (e.key === "ArrowRight") { yaw += 0.25; lastInteract = performance.now(); e.preventDefault(); }
  });

  const target = new THREE.Color(0x1b1d22);
  let running = false, last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!dragging) {
      vYaw *= 0.92; yaw += vYaw;
      if (!isPaused() && !reduce && now - lastInteract > 2500) yaw += dt * 0.35;
    }
    mat.color.lerp(target, Math.min(1, dt * 6));
    holder.rotation.y = yaw;
    const d = 6.2;
    camera.position.set(0, Math.sin(pitch) * d, Math.cos(pitch) * d);
    camera.lookAt(0, -0.05, 0);
    renderer.render(scene, camera);
    if (running) requestAnimationFrame(frame);
  }
  return {
    setRunning(on) {
      if (on === running) return;
      running = on;
      if (on) { last = performance.now(); resize(); requestAnimationFrame(frame); }
    },
    setColor(hex) { target.set(hex); if (!running) frame(performance.now()); }
  };
}
