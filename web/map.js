// The world map: a 256x256 tile square, deterministic value-noise terrain, Whittaker-style biomes plus mythic ones,
// cities placed on fitting ground, roads by A* over a terrain cost grid. Visual only: the sim does not read it.
import { hash32 } from "./sim/rng.js";

export const SIZE = 256, TILE = 32;              // world units per tile; world is 8192 x 8192
// city sites (tile coords) and the ground each one needs around it
export const SITES = {
  agora: { x: 128, y: 134, r: 4, ground: "harbor" }, ares: { x: 96, y: 104, r: 14, ground: "farmland" }, bear: { x: 58, y: 56, r: 10, ground: "mountain" },
  forges: { x: 36, y: 100, r: 5, ground: "hills" }, strand: { x: 42, y: 170, r: 6, ground: "beach" }, iolcus: { x: 112, y: 176, r: 8, ground: "city" },
  grove: { x: 80, y: 206, r: 4, ground: "darkforest" }, lemnos: { x: 178, y: 212, r: 9, ground: "volcanic" }, pyra: { x: 150, y: 146, r: 3, ground: "ash" },
  asphodel: { x: 196, y: 152, r: 6, ground: "asphodel" }, anthemoessa: { x: 222, y: 230, r: 7, ground: "flowers" }, reef: { x: 176, y: 74, r: 8, ground: "coral" },
  mist: { x: 126, y: 38, r: 4, ground: "mist" }, eridanus: { x: 226, y: 108, r: 4, ground: "burning" }, drepane: { x: 234, y: 34, r: 5, ground: "forest" },
};
export const BIOME = {
  deep: "#0b1a33", sea: "#12284a", shallow: "#1d4166", coral: "#2f6a7a", beach: "#cdbb8a", grass: "#56743f", farmland: "#8a8a45", forest: "#2f5233", darkforest: "#1d3324",
  hills: "#6c6a46", mountain: "#7b7466", snow: "#d9dde3", mist: "#b8c2cf", marsh: "#3f5a4a", scrub: "#9b8a5a", volcanic: "#3b302c", ash: "#4a3a33", burning: "#7a3a12",
  flowers: "#8a5f86", asphodel: "#8e9496", city: "#6d6457", harbor: "#7a6e5c",
};

// value noise from an integer lattice hash; smoothstep with + and * only (deterministic everywhere)
const LAT = new Map(), lat = (x, y, s) => { const k = (s * 1024 + x + 256) * 1024 + y + 256; let v = LAT.get(k); if (v === undefined) { v = hash32("n", s, x, y) / 4294967296; LAT.set(k, v); } return v; };   // lattice values are asked for millions of times: hash each once
function vnoise(x, y, s) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = lat(x0, y0, s), b = lat(x0 + 1, y0, s), c = lat(x0, y0 + 1, s), d = lat(x0 + 1, y0 + 1, s);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
const fbm = (x, y, s, o = 5) => { let v = 0, amp = 0.5, f = 1, n = 0; for (let k = 0; k < o; k++) { v += vnoise(x * f, y * f, s + k) * amp; n += amp; amp *= 0.5; f *= 2; } return v / n; };
const bump = (x, y, cx, cy, r) => { const d2 = ((x - cx) ** 2 + (y - cy) ** 2) / (r * r); return d2 >= 1 ? 0 : (1 - d2) * (1 - d2); };

export function generate() {
  const N = SIZE, elev = new Float32Array(N * N), moist = new Float32Array(N * N), biome = new Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let e = fbm(x / 64, y / 64, 11) * 0.75 + fbm(x / 16, y / 16, 23, 3) * 0.25;
    e = e * 0.5 + bump(x, y, 110, 118, 165) * 0.44 + bump(x, y, 60, 150, 90) * 0.12;          // the mainland fills most of the square
    for (const [cx, cy, r, h] of [[178, 212, 26, 0.75], [222, 230, 20, 0.6], [234, 34, 20, 0.62], [176, 74, 30, 0.35], [226, 108, 24, 0.55], [196, 152, 26, 0.45]]) e += bump(x, y, cx, cy, r) * h;
    e -= bump(x, y, 142, 146, 20) * 0.5 + bump(x, y, 162, 124, 24) * 0.32 + bump(x, y, 156, 186, 20) * 0.3 + bump(x, y, 200, 196, 26) * 0.3;  // the gulf of Pagasae
    e += bump(x, y, 150, 147, 6) * 0.35;                                                   // the Pyra's headland
    e += bump(x, y, 58, 56, 34) * 0.5 + bump(x, y, 126, 38, 20) * 0.55 + bump(x, y, 36, 100, 18) * 0.22;      // Bear Mountain, the Mist, the forge hills
    e -= bump(x, y, 96, 104, 40) * 0.12;                                                   // the Field of Ares lies low
    e += bump(x, y, 178, 212, 8) * 0.35;                                                   // Lemnos' cone
    const edge = Math.min(x, y, N - 1 - x, N - 1 - y); if (edge < 14) e -= (14 - edge) * 0.03;
    elev[y * N + x] = e; moist[y * N + x] = fbm(x / 40, y / 40, 77, 4);
  }
  const SEA = 0.5;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, e = elev[i], m = moist[i], t = 1 - y / N * 0.55 - Math.max(0, e - SEA) * 1.4;    // north is colder; height cools
    let b;
    if (e < SEA - 0.12) b = "deep"; else if (e < SEA - 0.03) b = "sea"; else if (e < SEA) b = "shallow";
    else if (e < SEA + 0.02) b = "beach";
    else if (e > SEA + 0.5 || (e > SEA + 0.42 && t < 0.4)) b = "snow";
    else if (e > SEA + 0.34) b = "mountain"; else if (e > SEA + 0.24) b = "hills";
    else if (m > 0.62) b = t > 0.6 ? "marsh" : "darkforest"; else if (m > 0.5) b = "forest"; else if (m < 0.36) b = "scrub"; else b = "grass";
    biome[i] = b;
  }
  // mythic grounds around their cities override the climate
  for (const [k, s] of Object.entries(SITES)) {
    const R = s.r + (k === "ares" ? 10 : k === "reef" ? 6 : 4);
    for (let y = s.y - R; y <= s.y + R; y++) for (let x = s.x - R; x <= s.x + R; x++) {
      if (x < 0 || y < 0 || x >= N || y >= N) continue; const d2 = (x - s.x) ** 2 + (y - s.y) ** 2, i = y * N + x, land = elev[i] >= SEA;
      const wob = hash32("w", x, y) % 5;
      if (d2 > (R + wob - 2) ** 2) continue;
      if (s.ground === "coral") { if (!land || biome[i] === "beach") biome[i] = "coral"; continue; }
      if (!land && s.ground !== "harbor") { if (d2 < (s.r) ** 2) { elev[i] = SEA + 0.03; } else continue; }
      if (s.ground === "harbor" || s.ground === "city") { if (d2 <= s.r * s.r) biome[i] = "city"; else if (land && s.ground === "city") biome[i] = biome[i] === "beach" ? "beach" : "farmland"; continue; }
      if (s.ground === "mountain") { if (biome[i] !== "snow") biome[i] = d2 < (s.r * 0.6) ** 2 ? "hills" : "mountain"; continue; }
      if (s.ground === "mist") { biome[i] = d2 < s.r * s.r ? "mist" : "snow"; continue; }
      if (s.ground === "burning") { biome[i] = d2 < (s.r * 0.8) ** 2 ? "burning" : "volcanic"; continue; }
      biome[i] = s.ground === "beach" && d2 < (s.r * 0.6) ** 2 ? "grass" : s.ground;
    }
  }
  for (const s of Object.values(SITES)) for (let y = s.y - 2; y <= s.y + 2; y++) for (let x = s.x - 2; x <= s.x + 2; x++) if (elev[y * N + x] < SEA) elev[y * N + x] = SEA + 0.02;
  return { elev, moist, biome, SEA, roads: roads(elev, biome, SEA), rivers: rivers(elev, moist, biome, SEA) };
}

// rivers: fill pits (priority flood from the sea), let rain run downhill (D8), and draw where enough water gathers
function rivers(elev, moist, biome, SEA) {
  const N = SIZE, filled = Float32Array.from(elev), done = new Uint8Array(N * N), q = [];
  for (let i = 0; i < N * N; i++) if (elev[i] < SEA) { done[i] = 1; q.push(i); }
  const D8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  // breadth-first from the sea, raising pits so every land tile has a path down (an approximation of Planchon-Darboux)
  for (let h = 0; h < q.length; h++) { const c = q[h], cx = c % N, cy = (c / N) | 0;
    for (const [dx, dy] of D8) { const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= N || y >= N) continue; const n = y * N + x; if (done[n]) continue; done[n] = 1; if (filled[n] <= filled[c]) filled[n] = filled[c] + 1e-5; q.push(n); } }
  const order = q.slice().reverse(), flux = new Float32Array(N * N), down = new Int32Array(N * N).fill(-1);
  for (const c of order) { if (elev[c] < SEA) continue; let best = -1, bh = filled[c]; const cx = c % N, cy = (c / N) | 0;
    for (const [dx, dy] of D8) { const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= N || y >= N) continue; const n = y * N + x; if (filled[n] < bh) { bh = filled[n]; best = n; } } down[c] = best; }
  for (const c of order) { if (elev[c] < SEA) continue; flux[c] += 0.4 + moist[c]; if (down[c] >= 0) flux[down[c]] += flux[c]; }
  const out = []; for (let i = 0; i < N * N; i++) if (elev[i] >= SEA && flux[i] > 55 && down[i] >= 0 && biome[i] !== "city") out.push([i, down[i], Math.min(1, flux[i] / 400)]);
  return out;
}

// roads: A* over a cost grid between cities; sea lanes (dashed) where a road would have to swim
const LINKS = [["agora", "ares"], ["agora", "iolcus"], ["agora", "pyra"], ["ares", "bear"], ["ares", "forges"], ["forges", "strand"], ["iolcus", "strand"], ["iolcus", "grove"],
  ["ares", "mist"], ["pyra", "asphodel"], ["agora", "reef"], ["asphodel", "eridanus"], ["agora", "lemnos"], ["lemnos", "anthemoessa"], ["reef", "drepane"], ["bear", "forges"]];
function roads(elev, biome, SEA) {
  const N = SIZE, cost = (i) => { const b = biome[i]; return elev[i] < SEA ? 40 : b === "mountain" ? 9 : b === "snow" ? 14 : b === "hills" ? 4 : b === "darkforest" || b === "marsh" ? 5 : b === "forest" ? 3 : b === "burning" ? 30 : 1; };
  const out = [], used = new Uint8Array(N * N);   // tiles already walked by an earlier road are cheaper: roads merge into trunks
  for (const [a, b] of LINKS) {
    const A = SITES[a], B = SITES[b], start = A.y * N + A.x, goal = B.y * N + B.x;
    const g = new Float32Array(N * N).fill(Infinity), from = new Int32Array(N * N).fill(-1), done = new Uint8Array(N * N); g[start] = 0;
    const h = (i) => Math.abs((i % N) - B.x) + Math.abs(Math.floor(i / N) - B.y);
    // binary min-heap of (f, insertion order, node); the order breaks ties so every engine draws the same road
    const hf = [], hs = [], hn = []; let seq = 0;
    const less = (a, b) => hf[a] < hf[b] || (hf[a] === hf[b] && hs[a] < hs[b]);
    const swap = (a, b) => { let t = hf[a]; hf[a] = hf[b]; hf[b] = t; t = hs[a]; hs[a] = hs[b]; hs[b] = t; t = hn[a]; hn[a] = hn[b]; hn[b] = t; };
    const push = (f, n) => { let k = hf.length; hf.push(f); hs.push(seq++); hn.push(n); while (k > 0) { const p = (k - 1) >> 1; if (!less(k, p)) break; swap(k, p); k = p; } };
    const pop = () => { const n = hn[0], last = hf.length - 1; swap(0, last); hf.pop(); hs.pop(); hn.pop(); let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < hf.length && less(l, m)) m = l; if (r < hf.length && less(r, m)) m = r; if (m === k) break; swap(k, m); k = m; } return n; };
    push(h(start), start);
    while (hf.length) {
      const cur = pop(); if (done[cur]) continue; done[cur] = 1; if (cur === goal) break;
      const cx = cur % N, cy = Math.floor(cur / N);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
        const ni = ny * N + nx; if (done[ni]) continue;
        const ng = g[cur] + cost(ni) * (used[ni] && elev[ni] >= SEA ? 0.45 : 1) * (dx && dy ? 1.414 : 1);
        if (ng < g[ni]) { g[ni] = ng; from[ni] = cur; push(ng + h(ni), ni); }
      }
    }
    const path = []; for (let c = goal; c >= 0; c = from[c]) { path.push([c % N, Math.floor(c / N), elev[c] < SEA]); if (c === start) break; }
    out.push({ a, b, path: path.reverse() });
    for (const [x, y] of path) used[y * N + x] = Math.min(255, used[y * N + x] + 1);
  }
  out.used = used;
  return out;
}

/** paint the terrain into a SIZE x SIZE canvas (1 px per tile) with hillshade */
export function paint(map) {
  const N = SIZE, c = document.createElement("canvas"); c.width = N; c.height = N;
  const g = c.getContext("2d"), img = g.createImageData(N, N), px = img.data;
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const cache = {};
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, b = map.biome[i], col = cache[b] || (cache[b] = rgb(BIOME[b]));
    const e = map.elev[i], ex = map.elev[Math.min(N * N - 1, i + 1)], ey = map.elev[Math.min(N * N - 1, i + N)];
    let shade = map.elev[i] >= map.SEA ? 1 + (e - ex + e - ey) * 6 : 1 + (e - map.SEA) * 0.8;
    shade *= 0.94 + (hash32("g", x, y) % 13) / 100;
    px[i * 4] = Math.min(255, col[0] * shade); px[i * 4 + 1] = Math.min(255, col[1] * shade); px[i * 4 + 2] = Math.min(255, col[2] * shade); px[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0); return c;
}
