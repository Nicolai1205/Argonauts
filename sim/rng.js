// Deterministic randomness. Only + - * / and integer ops are used in the simulation (no Math.exp/log/sin/pow),
// because ECMAScript leaves transcendental precision to the engine and the browser must replay exactly what Node did.

/** 32-bit string/number hash (cyrb53-style mix folded to u32). */
export function hash32(...parts) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (const p of parts) {
    const s = String(p);
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677);
    }
    h1 = Math.imul(h1 ^ 0x9e3779b9, 2246822507); h2 = Math.imul(h2 ^ 0x7f4a7c15, 3266489909);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  return h1 >>> 0;
}

/** sfc32 generator. A fresh stream per (world seed, day, system) keeps systems independent of each other's draws. */
export function stream(...parts) {
  let a = hash32(...parts, "a"), b = hash32(...parts, "b"), c = hash32(...parts, "c"), d = hash32(...parts, "d");
  const next = () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    const t = (a + b | 0) + d | 0;
    d = d + 1 | 0; a = b ^ b >>> 9; b = c + (c << 3) | 0; c = c << 21 | c >>> 11; c = c + t | 0;
    return (t >>> 0) / 4294967296;
  };
  for (let i = 0; i < 12; i++) next();
  const r = {
    next,
    int: (n) => Math.floor(next() * n),            // 0..n-1
    range: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    /** roughly normal 0..100 around mu (sum of three uniforms) */
    bell: (mu, spread) => mu + (next() + next() + next() - 1.5) * spread,
    weighted(items, w) { let t = 0; for (const x of w) t += x; let u = next() * t; for (let i = 0; i < items.length; i++) { u -= w[i]; if (u < 0) return items[i]; } return items[items.length - 1]; },
    shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; },
  };
  return r;
}

/** deterministic per-entity uniform in [0,1) without a stream */
export const unit = (...parts) => hash32(...parts) / 4294967296;
