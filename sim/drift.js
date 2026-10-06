// Cultural drift: crafts that can be lost (Henrich 2004), fashions that wander (Bentley 2004), dialects that split names.
import { DISTRICTS, J } from "./lore.js";
import { hash32 } from "./rng.js";
import { CITIES } from "./war.js";

/** natural log from + - * / only (ECMAScript leaves Math.log precision to the engine; the world must replay bit-for-bit) */
export function ln(x) {
  if (x <= 0) return -Infinity; let k = 0; while (x > 2) { x /= 2; k++; } while (x < 1) { x *= 2; k--; }
  const y = (x - 1) / (x + 1), y2 = y * y; let s = 0, t = y; for (let n = 1; n < 40; n += 2) { s += t / n; t *= y2; }
  return 2 * s + k * 0.6931471805599453;
}

export const CRAFTS = [
  { key: "ships", name: "shipwrighting", jobs: [J.rower, J.fisher] }, { key: "bronze", name: "bronze-casting", jobs: [J.miner] },
  { key: "healing", name: "healing", jobs: [J.herbalist] }, { key: "song", name: "song and the lyre", jobs: [J.priest, J.augur] },
  { key: "weaving", name: "weaving", jobs: [J.weaver] }, { key: "augury", name: "augury", jobs: [J.augur] },
];
export function initDrift(w) {
  w.crafts = DISTRICTS.map((d, k) => CRAFTS.map((c, ci) => 30 + (hash32("craft", k, ci) % 40)));
  w.styles = [{ id: 0, name: "plain undyed cloth", color: "#9a917f", born: -99999 }];
  w.dialect = DISTRICTS.map(() => []);
  const A = w.A; for (let i = 0; i < w.N; i++) A.style[i] = 0;
}
// Henrich: mean skill moves by -alpha + beta*(gamma + ln N); below the threshold population the craft decays
const ALPHA = 2.6, BETA = 0.55, GAMMA = 0.5772;
export function crafts(ctx) {
  const { A, w, day } = ctx; if (day % 7) return;
  const n = DISTRICTS.map(() => CRAFTS.map(() => 0));
  for (const i of ctx.live) { if (A.status[i] || (A.kind[i] && day - A.born[i] < 14 * 12)) continue; const d = A.district[i]; CRAFTS.forEach((c, ci) => { if (c.jobs.includes(A.job[i])) n[d][ci]++; }); }
  const rel = w.war.rel;
  for (const a of CITIES) CRAFTS.forEach((c, ci) => {
    let eff = n[a][ci]; for (const b of CITIES) if (b !== a && rel[a][b] > 20) eff += 0.3 * n[b][ci];       // trade partners share their masters
    if (!w.craftsSeeded) w.crafts[a][ci] = Math.max(5, Math.min(90, Math.round(20 + 14 * ln(eff + 1))));
    const before = w.crafts[a][ci], delta = eff < 1 ? -ALPHA : -ALPHA + BETA * (GAMMA + ln(eff));
    const now = Math.max(0, Math.min(100, before + delta));
    w.crafts[a][ci] = Math.round(now * 100) / 100;
    if (before < 80 && now >= 80) ctx.log(ctx.E.craft, -1, -1, a, ci, `${DISTRICTS[a].name} masters ${c.name}`);
    if (before >= 25 && now < 25) ctx.log(ctx.E.craftlost, -1, -1, a, ci, `the art of ${c.name} is being lost in ${DISTRICTS[a].name}`);
  });
  w.craftsSeeded = true;
}
/** productivity multiplier from a city's craft for a job (0.75 .. 1.35) */
export function craftBoost(w, district, job) { for (let ci = 0; ci < CRAFTS.length; ci++) if (CRAFTS[ci].jobs.includes(job)) return 0.75 + w.crafts[district][ci] / 100 * 0.6; return 1; }

// Bentley neutral drift: most copy a friend's style; a few invent; popularity follows a power law and the top list turns over
const ADJ = ["murex-dyed", "bone-bead", "ash-grey", "saffron", "knotted", "Lemnian", "owl-stamped", "salt-bleached", "ivory-pinned", "serpent-hemmed", "kohl-ringed", "barley-straw", "sea-glass", "Colchian", "tarred", "rattling"];
const ITEM = ["sashes", "necklaces", "anklets", "hoods", "braids", "girdles", "fillets", "earrings", "cloak-pins", "tattoos", "rib-charms", "skull-paint"];
export function fashion(ctx) {
  const { A, w, day } = ctx, r = ctx.r("fashion");
  for (const i of ctx.live) {
    if (A.status[i] || !r.chance(0.05)) continue;
    if (r.chance(0.003 * (A.pers[i * 6 + 5] / 50))) {
      const id = w.styles.length, h = hash32("style", id, day);
      w.styles.push({ id, name: `${ADJ[h % ADJ.length]} ${ITEM[(h >>> 8) % ITEM.length]}`, color: `hsl(${h % 360},${55 + (h >>> 16) % 30}%,${45 + (h >>> 20) % 20}%)`, born: day, by: i, city: A.district[i] });
      A.style[i] = id; continue;
    }
    const k = r.int(8), j = A.tieTo[i * 8 + k]; if (j >= 0 && !A.status[j]) A.style[i] = A.style[j];
  }
  if (day % 30 === 0) {   // the fashion of the season, per city
    const top = {}; for (const i of ctx.live) if (!A.status[i] && A.style[i]) { const d = A.district[i]; (top[d] || (top[d] = {}))[A.style[i]] = (top[d][A.style[i]] || 0) + 1; }
    w.fashion = {}; for (const [d, m] of Object.entries(top)) { let b = 0, bv = 0; for (const [s, c] of Object.entries(m)) if (c > bv) { bv = c; b = Number(s); } w.fashion[d] = { style: b, n: bv }; }
    if (w.styles.length > 600) w.styles = w.styles.map((s) => s);  // ids are stable; old styles stay as history
  }
}

// dialects: each city slowly gathers sound changes; Leaves are named in the speech of their birth city
const RULES = [["k", "ch"], ["ph", "f"], ["th", "t"], ["os$", "o"], ["es$", "is"], ["ai", "e"], ["eu", "ev"], ["ias$", "ia"], ["kr", "gr"], ["pt", "tt"], ["x", "ks"], ["on$", "oun"], ["ei", "i"], ["^Hy", "I"], ["mm", "m"], ["ip", "ib"], ["ll", "l"], ["ou", "u"], ["ae", "e"], ["ch", "sh"]];
export function dialects(ctx) {
  const { w, day } = ctx, r = ctx.r("dialect"); if (day % 7) return;
  for (const c of CITIES) if (r.chance(0.04)) { const rule = RULES[r.int(RULES.length)]; if (!w.dialect[c].some((x) => x[0] === rule[0])) { w.dialect[c].push([rule[0], rule[1], day]); ctx.log(ctx.E.dialect, -1, -1, c, 0, `${rule[0].replace(/[$^]/g, "")}→${rule[1]}`); } }
}
/** a name as spoken in a city at a given day */
export function speak(name, rules, day) { let s = name; for (const [a, b, d] of rules || []) if (d <= day) { const re = new RegExp(a, "g"); s = s.replace(re, b); } return s.charAt(0).toUpperCase() + s.slice(1); }
