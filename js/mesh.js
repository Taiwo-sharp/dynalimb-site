/* Loads the compact .bin meshes made from STL files (see media/models).
   Format: u32 vertCount, u32 indexCount, f32[3] bbox size (mm),
           i16 positions quantised over the half-bbox (centred), u16|u32 indices.
   STL is Z-up; returned geometry is three.js Y-up, centred, scaled by `unitsPerMM`. */
export async function loadMesh(THREE, url, unitsPerMM) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url + " " + r.status);
  const buf = await r.arrayBuffer();
  const dv = new DataView(buf);
  const n = dv.getUint32(0, true), ic = dv.getUint32(4, true);
  const size = [dv.getFloat32(8, true), dv.getFloat32(12, true), dv.getFloat32(16, true)];
  const q = new Int16Array(buf, 20, n * 3);
  let off = 20 + n * 6; if (off % 4) off += 4 - (off % 4);
  const index = n < 65536 ? new Uint16Array(buf, off, ic) : new Uint32Array(buf, off, ic);
  const s = unitsPerMM;
  const pos = new Float32Array(n * 3);
  for (let v = 0; v < n; v++) {
    const x = q[v * 3] / 32767 * size[0] / 2, y = q[v * 3 + 1] / 32767 * size[1] / 2, z = q[v * 3 + 2] / 32767 * size[2] / 2;
    pos[v * 3] = x * s; pos[v * 3 + 1] = z * s; pos[v * 3 + 2] = -y * s;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  geometry.computeVertexNormals();
  return { geometry, positions: pos, count: n, sizeMM: size };
}

/* Crease-aware normals: smooth across gentle curves, keep sharp edges sharp
   (slots, sole rim, adapter). Returns a new non-indexed geometry. */
export function creasedGeometry(THREE, geometry, creaseDeg = 35) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const p = g.getAttribute("position").array;
  const triCount = p.length / 9;
  const fn = new Float32Array(triCount * 3);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  for (let t = 0; t < triCount; t++) {
    a.fromArray(p, t * 9); b.fromArray(p, t * 9 + 3); c.fromArray(p, t * 9 + 6);
    e1.subVectors(b, a); e2.subVectors(c, a); e1.cross(e2);      // length = 2x area: area-weighted
    fn[t * 3] = e1.x; fn[t * 3 + 1] = e1.y; fn[t * 3 + 2] = e1.z;
  }
  // group corners by position
  const groups = new Map();
  const key = i => Math.round(p[i] * 1e4) + "," + Math.round(p[i + 1] * 1e4) + "," + Math.round(p[i + 2] * 1e4);
  for (let v = 0; v < triCount * 3; v++) {
    const k = key(v * 3);
    let list = groups.get(k);
    if (!list) groups.set(k, (list = []));
    list.push(v);
  }
  const cosLim = Math.cos(creaseDeg * Math.PI / 180);
  const normals = new Float32Array(p.length);
  const unit = t => { const x = fn[t * 3], y = fn[t * 3 + 1], z = fn[t * 3 + 2], l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
  for (const list of groups.values()) {
    const units = list.map(v => unit((v / 3) | 0));
    for (let i = 0; i < list.length; i++) {
      const ui = units[i];
      let nx = 0, ny = 0, nz = 0;
      for (let j = 0; j < list.length; j++) {
        const uj = units[j];
        if (ui[0] * uj[0] + ui[1] * uj[1] + ui[2] * uj[2] < cosLim) continue;
        const tj = (list[j] / 3) | 0;
        nx += fn[tj * 3]; ny += fn[tj * 3 + 1]; nz += fn[tj * 3 + 2];
      }
      const l = Math.hypot(nx, ny, nz) || 1;
      normals[list[i] * 3] = nx / l; normals[list[i] * 3 + 1] = ny / l; normals[list[i] * 3 + 2] = nz / l;
    }
  }
  g.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  return g;
}

/* Highest point of a mesh (e.g. the pyramid adapter on top of a foot). */
export function topPoint(positions, count) {
  let best = 0;
  for (let v = 1; v < count; v++) if (positions[v * 3 + 1] > positions[best * 3 + 1]) best = v;
  // average the vertices within a hair of the top to get the adapter centre
  const yTop = positions[best * 3 + 1], eps = Math.abs(yTop) * 0.02 + 1e-4;
  let sx = 0, sz = 0, k = 0;
  for (let v = 0; v < count; v++) if (yTop - positions[v * 3 + 1] < eps) { sx += positions[v * 3]; sz += positions[v * 3 + 2]; k++; }
  return { x: sx / k, y: yTop, z: sz / k };
}
