// Discord: weather (rain, drought, flood, storm), colonies sent out by lot, orators before the Boule votes, and Turchin's
// political stress index. Plus one thing that cannot be undone: an office whose holder the chain burns stays empty for ever.
// Sources (docs/research/MYTH.md §4.3, 5.8; SIMULATIONS.md #20, #21): Hdt. 4.150-158 (Thera's seven-year drought, colonists
// chosen by lot, one brother of each pair, shot at from the shore if they came back; Battus the oikist); Il. 2.144-146 (the
// assembly roars like the Icarian sea) and 2.211-277 (Thersites); WD (maxims); Turchin and Nefedov, Secular Cycles (2009);
// Kenshi's world states.
import { DISTRICTS, D, ST, TH, J, monthOf } from "./lore.js";

const YEAR = 12, adult = (A, i, day) => !A.kind[i] || day - A.born[i] >= 14 * YEAR;
const alive = (A, i) => i >= 0 && A.status[i] === ST.living;
const P = (A, i, k) => A.pers[i * 6 + k];
const RAIN_SEASON = [150, 140, 120, 100, 80, 60, 50, 60, 90, 120, 140, 150];   // wet winters, dry summers
const RIVER = new Set(["ares", "iolcus", "strand", "bear"].map((k) => D[k]));
const LAND = DISTRICTS.map((d, k) => k).filter((k) => ["quarter", "grove", "forge"].includes(DISTRICTS[k].kind));

export function initDiscord(w) {
  w.rain = DISTRICTS.map(() => 100); w.anom = DISTRICTS.map(() => 0); w.dry = DISTRICTS.map(() => 0);
  w.colonies = []; w.psi = { v: 0, phase: "expansion", hist: [] }; w.vacant = {};
}

export function discordDaily(ctx) {
  const { A, w, day } = ctx, r = ctx.r("discord"), E = ctx.E, mo = monthOf(day);

  // ---- weather: each district's rain wanders around the season, with anomalies that persist (an AR(1) process)
  for (const d of LAND) {
    w.anom[d] = Math.round((w.anom[d] * 0.97 + (r.next() - 0.5) * 12) * 10) / 10;
    w.rain[d] = Math.max(0, Math.min(250, Math.round(RAIN_SEASON[mo] + w.anom[d] * 3)));
    if (w.rain[d] < 45) { w.dry[d]++; w.fertility[d] = Math.max(150, Math.round(w.fertility[d] * 0.985)); }
    else w.dry[d] = Math.max(0, w.dry[d] - 2);
    if (w.dry[d] === 20) ctx.log(E.weather, -1, -1, d, w.rain[d], "drought");
    if (w.dry[d] === 60) ctx.log(E.weather, -1, -1, d, w.dry[d], "drought-long");
    if (w.rain[d] > 200 && RIVER.has(d) && r.chance(0.08)) {   // the river comes over its banks
      let lost = 0; for (const i of ctx.byDist[d] || []) if (alive(A, i) && r.chance(0.2)) { const q = A.inv[i * 5] >> 1; A.inv[i * 5] -= q; lost += q; }
      const v = (ctx.byDist[d] || []).filter((i) => alive(A, i)); let dead = 0; for (let t = 0; t < 3 && v.length; t++) if (r.chance(0.3)) { ctx.kill(v[r.int(v.length)], "drowned in the flood"); dead++; }
      ctx.log(E.weather, -1, -1, d, lost, "flood|" + dead);
    }
  }
  // winter storms at sea (read by trade: a stormy day doubles the risk of wrecks)
  w.storm = (mo === 11 || mo === 0 || mo === 1) && r.chance(0.12) ? day : w.storm;
  if (w.storm === day && r.chance(0.15)) ctx.log(E.weather, -1, -1, D.agora, 0, "storm");

  // ---- apoikia: a long drought sends a tenth of the city out by lot, under an oikist, to the emptiest land
  for (const d of LAND) {
    if (w.dry[d] < 45 || w.colonies.some((c) => c.from === d && day - c.day < 180)) continue;
    const pop = (ctx.byDist[d] || []).filter((i) => alive(A, i) && adult(A, i, day)); if (pop.length < 200 || !r.chance(0.05)) continue;
    const dest = LAND.filter((k) => k !== d && w.dry[k] < 10).map((k) => [k, (ctx.byDist[k] || []).length]).sort((a, b) => a[1] - b[1] || a[0] - b[0])[0]; if (!dest) continue;
    const goers = pop.filter(() => r.chance(0.1)).filter((i) => i !== w.fleece && A.office[i] < 0);
    if (goers.length < 15) continue;
    const oik = goers.slice().sort((x, y) => (P(A, y, 2) + P(A, y, 4) + A.fame[y]) - (P(A, x, 2) + P(A, x, 4) + A.fame[x]) || x - y)[0];
    for (const i of goers) { ctx.trip(i, d, dest[0], "colony"); A.district[i] = dest[0]; ctx.think(i, TH.exiled); }
    ctx.cognomen(oik, 16); ctx.renown(oik, 80);
    w.colonies.push({ from: d, to: dest[0], oik, day, n: goers.length, members: goers.slice(0, 120) });
    if (w.colonies.length > 30) w.colonies.shift();
    ctx.log(E.colony, oik, -1, dest[0], goers.length, "sent|" + DISTRICTS[d].name);
  }
  // those who sail home before their time are driven off from the shore with stones (Hdt. 4.156)
  if (day % 7 === 0) for (const c of w.colonies) {
    if (day - c.day > 60 || c.checked) continue;
    const back = c.members.filter((i) => alive(A, i) && A.district[i] === c.from);
    if (back.length >= 3) { for (const i of back) { A.district[i] = c.to; A.stress[i] = Math.min(600, A.stress[i] + 80); } c.checked = true; ctx.log(E.colony, back[0], c.oik, c.from, back.length, "driven"); }
  }

  // ---- the political stress index, monthly: too many would-be elites (fifteen times the common purse), hungry commons, an empty treasury
  if (((day % 30) + 30) % 30 === 29) {
    const ad = ctx.live.filter((i) => alive(A, i) && adult(A, i, day)); const ob = ad.map((i) => A.obols[i]).sort((a, b) => b - a);
    const median = ob[ob.length >> 1] || 1, asp = ad.filter((i) => A.obols[i] >= median * 15).length, hungry = ad.filter((i) => A.hunger[i]).length / Math.max(1, ad.length);
    const v = Math.round((asp / 68) * (0.5 + hungry * 10) * (w.treasury < 5000 ? 1.5 : 1) * 10) / 10;
    const prev = w.psi.v; w.psi.hist.push([day, v]); if (w.psi.hist.length > 60) w.psi.hist.shift();
    const phase = v > 7 ? (v >= prev ? "crisis" : "depression") : v > 4 ? "stagflation" : "expansion";
    if (phase !== w.psi.phase) ctx.log(E.psi, -1, -1, D.agora, Math.round(v * 10), phase);
    w.psi.v = v; w.psi.phase = phase;
  }
}

// ---- the Boule's orators: the strongest blocs put up a speaker before the vote (Il. 2; MYTH §5.8)
const GNOME = ["a bad neighbour is as great a plague as a good one is a blessing", "the fool learns by suffering", "the half is more than the whole", "spare at the middle of the jar",
  "Justice beats Outrage when she comes at last to the end of the race", "he harms himself who harms another", "whoever takes no thought for tomorrow eats seed-corn in the winter", "the gods hide a man's living from him"];
const PROPOSE = [["the Reapers walk the streets by night", "the Reapers go back to their graves"], ["the treasury feed the hungry", "every house feed itself"], ["the temples get their tithe", "the temples fend for themselves"]];
export function orators(ctx, r) {
  const { A, w, day } = ctx, E = ctx.E;
  const blocs = w.factions.map((f, k) => k).filter((k) => w.factions[k].alive && w.factions[k].clout > 0).sort((a, b) => w.factions[b].clout - w.factions[a].clout || a - b).slice(0, 3);
  for (const k of blocs) {
    let best = -1, bv = -1e9; for (const i of ctx.live) if (alive(A, i) && adult(A, i, day) && A.faction[i] === k && !A.miasma[i]) { const v = P(A, i, 2) + A.fame[i] + (A.office[i] >= 0 ? 30 : 0) + (i % 13); if (v > bv) { bv = v; best = i; } }
    if (best < 0) continue;
    const f = w.factions[k], ax = Math.abs(f.ideo[0]) >= Math.abs(f.ideo[1]) && Math.abs(f.ideo[0]) >= Math.abs(f.ideo[2]) ? 0 : Math.abs(f.ideo[1]) >= Math.abs(f.ideo[2]) ? 1 : 2;
    const prop = PROPOSE[ax][f.ideo[ax] >= 0 ? 0 : 1];
    const mem = (w.memory || []).slice().sort((a, b) => b.s0 - a.s0 || a.day - b.day)[r.int(Math.min(5, (w.memory || []).length || 1))];
    const q = (P(A, best, 2) + P(A, best, 5)) / 200 + A.fame[best] / 300 + (r.next() - 0.5) * 0.4, heckled = r.chance(0.12);
    const effect = Math.max(0.85, Math.min(1.2, 1 + (q - 0.5) * 0.3 - (heckled ? 0.05 : 0)));
    f.clout = f.clout * effect;
    const resp = heckled ? "heckle" : q > 0.65 ? "roar" : q < 0.35 ? "silence" : "murmur";
    ctx.log(E.speech, best, -1, D.agora, Math.round(q * 100), [f.name, mem ? mem.name : "the Sowing", prop, GNOME[r.int(GNOME.length)], resp].join("|"));
  }
}

/** the chain burned an office-holder: that office is never filled again */
export function vacate(ctx, key) { const { w, day } = ctx; if (w.vacant[key] === undefined) { w.vacant[key] = day; ctx.log(ctx.E.vacant, -1, -1, D.agora, day, key); } }
