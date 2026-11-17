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
