// The Stone in Their Midst and the Iron Clock: the Sown slaughter each other at a thrown stone; Hesiod's Iron Age measured;
// hubris and nemesis; the Agrionia; the Demophon heresy; Theoclymenus' vision; the Lemnian New Fire.
// Sources (docs/research/MYTH.md §1.2, 1.9A, 2.1, 2.3, 2.4, 3.13, 3.15): Ap. 3.1354-1404 and Apd. 1.9.23 (the stone among the
// earthborn); Apd. 3.4.1-2 (Cadmus' eternal year of atonement); Aristotle, Poetics 1454b22 (the spear-mark of the Earth-born);
// WD 174-201 (the Iron race: Aidos and Nemesis leave the earth; children born grey at the temples); Plut. Quaest. Graec. 38
// (the Agrionia and the Minyades); HH Dem. 231-255 (Demophon nursed in the fire); Od. 20.345-357 (Theoclymenus' vision);
// Burkert, "Jason, Hypsipyle and New Fire at Lemnos" (CQ 1970).
import { DISTRICTS, D, ST, TH, J } from "./lore.js";
import { nameOf } from "./narrate.js";

const YEAR = 12, adult = (A, i, day) => !A.kind[i] || day - A.born[i] >= 14 * YEAR;
const alive = (A, i) => i >= 0 && A.status[i] === ST.living;
const P = (A, i, k) => A.pers[i * 6 + k];
export const MARK = { spear: 1, fire: 2, grey: 4 };
const IRON_KINDS = { kinslayer: 3, violated: 3, broken: 2, altar: 2, fell: 2, refused: 1 };

export function initIron(w) {
  w.sown = DISTRICTS.map(() => 10); w.stone = null; w.saleEMA = 0;
  w.iron = { ev: [], tier: 0, index: 0 }; w.doom = []; w.newFire = null; w.demophon = -999;
}
const isSown = (w, A, i) => A.bones[i] === 0 && w.houseFaction.includes(A.faction[i]);
const houseOf = (w, A, i) => w.houseFaction.indexOf(A.faction[i]);

/** a real sale of a Bone token far below the market is a stone thrown into the field */
export function onSale(ctx, i, eth) {
  const { A, w } = ctx; if (!(eth > 0)) return;
  if (A.bones[i] === 0) { const thrown = w.saleEMA > 0 && eth < w.saleEMA * 0.5; w.saleEMA = w.saleEMA ? Math.round((w.saleEMA * 0.95 + eth * 0.05) * 1e6) / 1e6 : eth; if (thrown && !w.stone && DISTRICTS[A.district[i]].kind === "quarter") throwStone(ctx, A.district[i], i, "sale"); }
}
function throwStone(ctx, d, thrower, why) {
  const { w, day } = ctx; (w.stoneAt || (w.stoneAt = {}))[d] = day; w.stone = { d, until: day + 1 + ctx.rr.int(3), thrower, why, broken: [0, 0, 0, 0, 0], since: day };
  ctx.log(ctx.E.stone, thrower, -1, d, 0, "thrown|" + why);
}

export function ironDaily(ctx) {
  const { A, w, day } = ctx, r = ctx.r("iron"), E = ctx.E, dy = ((day % 360) + 360) % 360;

  // ---- the Iron Clock: Hesiod's signs, counted over a year among the Leaves
  for (const e of ctx.ev) {
    if (e.h) continue;
    const k = e.t === "kinslayer" ? "kinslayer" : e.t === "xenoi" && e.s === "violated" ? "violated" : e.t === "oath" && e.s === "broken" ? "broken" : e.t === "supplication" && e.s !== "spared" ? (e.s === "altar" ? "altar" : "refused") : e.t === "mood" && (e.s || "").startsWith("fell") ? "fell" : null;
    if (k) w.iron.ev.push([day, IRON_KINDS[k]]);
  }
  if (day % 7 === 0) {
    w.iron.ev = w.iron.ev.filter(([d]) => day - d < 360);
    const leaves = Math.max(500, w.leafCount || 500), idx = Math.round(w.iron.ev.reduce((s, [, v]) => s + v, 0) * 1000 / leaves);
    w.iron.index = idx; const tier = idx >= 90 ? 3 : idx >= 55 ? 2 : idx >= 30 ? 1 : 0;
    if (tier !== w.iron.tier) { ctx.log(E.iron, -1, -1, D.agora, idx, (tier > w.iron.tier ? "falls|" : "rises|") + tier); w.iron.tier = tier; }
  }

  // ---- sown tension: grudges between the five houses; festivals and peace soften it
  const vend = new Int32Array(DISTRICTS.length);
  for (const e of ctx.ev) if (!e.h && (e.t === "vendetta" || (e.t === "death" && e.b >= 0)) && e.a >= 0 && e.b >= 0 && isSown(w, A, e.a) && isSown(w, A, e.b) && houseOf(w, A, e.a) !== houseOf(w, A, e.b)) vend[e.x >= 0 ? e.x : A.district[e.a]] += 3;
  for (const e of ctx.ev) if (!e.h && e.t === "riot" && e.x >= 0) vend[e.x] += 6;
  for (let d = 0; d < w.sown.length; d++) w.sown[d] = Math.max(0, Math.min(100, w.sown[d] + vend[d] - (ctx.ev.some((e) => e.t === "festival") ? 15 : 1)));
  if (!w.stone) for (let d = 0; d < w.sown.length; d++) if (w.sown[d] > 70 && DISTRICTS[d].kind === "quarter" && day - ((w.stoneAt || {})[d] ?? -999) > 90 && r.chance(0.02)) {
    const pool = (ctx.byDist[d] || []).filter((i) => alive(A, i) && A.radical[i] > 50); throwStone(ctx, d, pool.length ? pool[r.int(pool.length)] : -1, "rumour"); break;
  }

  // ---- the stone in their midst: Sown of one house fall on Sown of another, "like fleet-footed hounds"
  if (w.stone) {
    const S = w.stone, sown = (ctx.byDist[S.d] || []).filter((i) => alive(A, i) && isSown(w, A, i) && adult(A, i, day));
    for (let t = 0; t < Math.min(60, sown.length >> 2); t++) {
      const a = sown[r.int(sown.length)], b = sown[r.int(sown.length)];
      if (a === b || !alive(A, a) || !alive(A, b) || houseOf(w, A, a) === houseOf(w, A, b) || !r.chance(0.5)) continue;
      ctx.kill(b, `the stone in their midst (${w.factions[A.faction[a]].name})`); S.broken[houseOf(w, A, b)]++;
    }
    for (const i of ctx.byDist[S.d] || []) if (alive(A, i) && A.kind[i] && isSown(w, A, i) && day - A.born[i] < 5 * YEAR && r.chance(0.04)) ctx.kill(i, "cut down half-risen");
    w.sown[S.d] = Math.max(0, w.sown[S.d] - 25);
    if (day >= S.until) {
      const total = S.broken.reduce((a, b) => a + b, 0); let best = 0; for (let h = 1; h < 5; h++) if (S.broken[h] < S.broken[best]) best = h;
      const fac = w.factions[w.houseFaction[best]]; fac.legit = Math.min(100, fac.legit + 15);
      ctx.log(E.stone, S.thrower, -1, S.d, total, "after|" + fac.name + "|" + S.broken.join(","));
      if (S.thrower >= 0 && alive(A, S.thrower) && S.why === "rumour") { A.jail[S.thrower] = 96; A.district[S.thrower] = D.grove; A.obols[S.thrower] > 0 && (w.treasury += A.obols[S.thrower], A.obols[S.thrower] = 0); ctx.cognomen(S.thrower, 25); ctx.log(E.stone, S.thrower, -1, D.grove, 96, "bound"); }
      w.stone = null;
    }
  }

  // ---- hubris and nemesis: the one who rises too fast and gives nothing to the gods is struck down (unless Nemesis has left the earth)
  if (((day % 30) + 30) % 30 === 25 && w.iron.tier < 2) {
    let worst = -1, wv = 0;
    for (const i of ctx.live) { if (A.status[i] || A.devotion[i] > 20) continue; if (A.obols[i] > wv && A.obols[i] > 4000 && P(A, i, 0) < 45) { wv = A.obols[i]; worst = i; } }
    if (worst >= 0 && r.chance(0.4)) { const loss = Math.floor(A.obols[worst] * 0.3); A.obols[worst] -= loss; w.treasury += loss; A.stress[worst] = Math.min(600, A.stress[worst] + 150); ctx.renown(worst, -40); ctx.log(E.nemesis, worst, -1, A.district[worst], loss, ""); }
  }

  // ---- the Agrionia (in Kyzikion): the line of the least pious house is chased through the Agora by a priest with a sword
  if (day >= -360 && dy === 75) {
    const dev = w.factions.map(() => [0, 0]); for (const i of ctx.live) if (!A.status[i]) { dev[A.faction[i]][0] += A.devotion[i]; dev[A.faction[i]][1]++; }
    let f = -1, lo = 1e9; dev.forEach(([s, n], k) => { if (n > 100 && w.factions[k].alive && s / n < lo) { lo = s / n; f = k; } });
    if (f >= 0) {
      const fled = ctx.live.filter((i) => alive(A, i) && A.faction[i] === f && adult(A, i, day)), priests = ctx.live.filter((i) => alive(A, i) && A.job[i] === J.priest && A.devotion[i] > 50);
      let struck = -1; if (fled.length && priests.length && r.chance(0.05)) { struck = fled[r.int(fled.length)]; ctx.kill(struck, "struck down at the Agrionia", priests[r.int(priests.length)]); }
      for (const i of ctx.live) if (alive(A, i) && A.faction[i] === f) { A.devotion[i] = Math.min(100, A.devotion[i] + 10); if (r.chance(0.3)) ctx.think(i, TH.terror_at_an_omen); }
      ctx.log(E.agrionia, struck, -1, D.agora, fled.length, w.factions[f].name);
    }
  }

  // ---- the Demophon heresy: a bone parent who has buried too many tries to nurse a Leaf in the fire, to make it deathless
  if (day - w.demophon > 60 && r.chance(0.02)) {
    const cands = ctx.live.filter((i) => alive(A, i) && !A.kind[i] && A.buried[i] >= 3 && A.devotion[i] > 40);
    if (cands.length) {
      const p = cands[r.int(cands.length)]; let child = -1;
      for (let t = 0; t < 8; t++) { const c = A.tieTo[p * 8 + t]; if (c >= 0 && alive(A, c) && (A.p1[c] === p || A.p2[c] === p) && day - A.born[c] < 5 * YEAR) { child = c; break; } }
      if (child >= 0) {
        w.demophon = day; const u = r.next();
        if (u < 0.55) { A.sick[child] = Math.max(A.sick[child], 6); ctx.log(E.demophon, p, child, A.district[p], 0, "seen"); }
        else if (u < 0.85) { ctx.kill(child, "burned in the fire-nursing", p); ctx.log(E.demophon, p, child, A.district[p], 0, "burned"); }
        else { A.mark[child] |= MARK.fire; ctx.log(E.demophon, p, child, A.district[p], 0, "unchanged"); }   // never bone: only quieter
      }
    }
  }

  // ---- Theoclymenus' vision: a seer sees blood on the walls of a cruel house; unless they are cleansed, doom comes in a month
  for (const e of ctx.ev) {
    if (e.h || w.doom.length >= 6) continue;
    const host = e.t === "theoxenia" && e.s === "cursed" ? e.b : e.t === "liturgy" && e.s === "refused" ? e.a : e.t === "xenoi" && e.s === "violated" ? e.a : -1;
    if (host < 0 || !alive(A, host) || w.doom.some((x) => x.i === host) || !r.chance(0.5)) continue;
    const seers = (ctx.byDist[A.district[host]] || []).filter((i) => alive(A, i) && A.job[i] === J.augur); if (!seers.length) continue;
    w.doom.push({ i: host, seer: seers[r.int(seers.length)], day, until: day + 30 }); ctx.log(E.doom, host, w.doom[w.doom.length - 1].seer, A.district[host], 0, "vision");
  }
  for (const x of w.doom.slice()) {
    const i = x.i; if (!alive(A, i) && A.status[i] !== ST.shade) { w.doom.splice(w.doom.indexOf(x), 1); continue; }
    if (A.devotion[i] > 70 || ((A.mystes[i] || A.devotion[i] > 35) && r.chance(0.03))) { w.doom.splice(w.doom.indexOf(x), 1); ctx.log(E.doom, i, x.seer, A.district[i], 0, "averted"); continue; }
    if (day < x.until) continue;
    w.doom.splice(w.doom.indexOf(x), 1);
    if (alive(A, i)) { const loss = Math.floor(A.obols[i] / 2); A.obols[i] -= loss; w.treasury += loss; ctx.kill(i, "the doom Theoclymenus saw"); ctx.log(E.doom, i, x.seer, A.district[i], loss, "fell"); }
  }

  // ---- the Lemnian New Fire (from Lemnion 1): nine days with every fire on Lemnos out, then a ship brings new fire
  if (day >= -360 && dy === 30) { w.newFire = day + 9; ctx.log(E.newfire, -1, -1, D.lemnos, 9, "dark"); }
  if (w.newFire !== null) {
    if (day < w.newFire) { for (const i of ctx.byDist[D.lemnos] || []) if (alive(A, i) && r.chance(0.15)) ctx.think(i, TH.haunted); }
    else { for (const i of ctx.byDist[D.lemnos] || []) if (alive(A, i)) { A.miasma[i] = 0; ctx.think(i, TH.feasted); } ctx.log(E.newfire, -1, -1, D.lemnos, 0, "lit"); w.newFire = null; }
  }
}

/** at birth: the spear-mark of the Earth-born on a Leaf of two Sown parents of one house; grey temples in the last tier of the Iron age */
export function birthMarks(w, A, c, a, b) {
  A.mark[c] = 0;
  if (isSown(w, A, a) && isSown(w, A, b) && houseOf(w, A, a) === houseOf(w, A, b)) A.mark[c] |= MARK.spear;
  if (w.iron && w.iron.tier >= 3) A.mark[c] |= MARK.grey;
}
