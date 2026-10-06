// Society: encounters (intents, ties, ideas, gossip, conversion, contagion, theft), mood and stress, breakdowns, the watch
// and Epstein's civil violence, and allegiance (centroids, defection). Split out of systems.js; behaviour is identical.
import { BLOODS, DISTRICTS, D, J, THOUGHTS, TH } from "./lore.js";
import { TIES, THS } from "./world.js";
import { E, P, bio, clamp, isAdult, isKin, kill, living, setCognomen, think, tie } from "./systems.js";
import { convert, iconoclasm, remember } from "./culture.js";
import { gossip } from "./rumor.js";
import { passRelic, relicsOf } from "./fleece.js";
import { shun } from "./miasma.js";
import { intent } from "./threads.js";
import { lendGrain } from "./voyage.js";
import { quarantined } from "./depth.js";
import { scarOf } from "./memory.js";

// ---------------------------------------------------------------- society
export function social(ctx) {
  const { A, w } = ctx, r = ctx.r("social"), guards = guardCount(ctx);
  const crews = new Array(DISTRICTS.length * 32); for (const i of ctx.live) { const k = A.district[i] * 32 + A.job[i]; (crews[k] || (crews[k] = [])).push(i); }
  A.met.fill(-1); A.metKind.fill(0);
  for (const i of ctx.live) {
    if (A.status[i] || A.jail[i] || !r.chance((0.45 + P(A, i, 2) / 220) * (A.scar[i] === 3 ? 0.5 : 1) * (quarantined(w, A.district[i]) ? 0.6 : 1))) continue;
    let j = -1;
    const roll = r.next();
    if (roll < 0.1 && A.lover[i] >= 0 && living(A, A.lover[i])) j = A.lover[i];                   // the beloved
    else if (roll < 0.6) { const k = r.int(TIES), t = A.tieTo[i * TIES + k]; if (t >= 0 && living(A, t)) j = t; }
    else if (roll < 0.8) { const crew = crews[A.district[i] * 32 + A.job[i]]; if (crew && crew.length > 1) j = crew[r.int(crew.length)]; }   // whoever works beside you
    if (j < 0) { const pool = ctx.byDist[A.district[i]]; if (!pool.length) continue; j = pool[r.int(pool.length)]; }
    if (j === i || j < 0 || A.jail[j] || A.status[j]) continue;
    let dist = 0; for (let k = 0; k < 3; k++) dist += Math.abs(A.ideo[i * 3 + k] - A.ideo[j * 3 + k]);
    const same = A.faction[i] === A.faction[j], kin = A.oikos[i] === A.oikos[j];
    const fa = A.faith[i], fb = A.faith[j], sect = fa === fb ? (A.devotion[i] > 50 && A.devotion[j] > 50 ? 8 : 2) : fa && fb ? -8 : (fa || fb) && (A.devotion[i] > 60 || A.devotion[j] > 60) ? -4 : 0;
    const score = intent(ctx, i, j, r) + (P(A, i, 3) + P(A, j, 3)) / 2 - dist / 6 - shun(A, i, j) + A.fame[j] / 8 - (A.scar[i] === 4 ? 12 : 0) + (same ? 15 : -4) + (kin ? 12 : 0) + (A.lover[i] === j ? 10 : 0) + sect + r.next() * 40 - 20;
    if (score > 20) { convert(ctx, i, j, true); convert(ctx, j, i, true); }
    if (score > 0) gossip(ctx, i, j);
    A.met[i] = j; A.met[j] = A.met[j] < 0 ? i : A.met[j]; const kind = score > 45 ? 1 : score > 20 ? 2 : score > 0 ? 3 : 4; A.metKind[i] = kind; if (A.met[j] === i) A.metKind[j] = kind;
    if (score > 45) {
      tie(ctx, i, j, 6); tie(ctx, j, i, 6); think(ctx, i, TH.a_good_talk); think(ctx, j, TH.a_good_talk);
      const eps = 20 + P(A, i, 5) / 2;
      for (let k = 0; k < 3; k++) { const a = A.ideo[i * 3 + k], b = A.ideo[j * 3 + k]; if (Math.abs(a - b) < eps) { const m = Math.round((b - a) * 0.15); A.ideo[i * 3 + k] = clamp(a + m, -100, 100); A.ideo[j * 3 + k] = clamp(b - m, -100, 100); } }
    } else if (score > 20) { tie(ctx, i, j, 2); tie(ctx, j, i, 2); }
    else if (score > 0) {
      tie(ctx, i, j, -3); tie(ctx, j, i, -3);
      if (!same) { let ax = 0, mx = -1; for (let k = 0; k < 3; k++) { const dd = Math.abs(A.ideo[i * 3 + k] - A.ideo[j * 3 + k]); if (dd > mx) { mx = dd; ax = k; } }
        if (mx > 60) { const s = A.ideo[i * 3 + ax] > A.ideo[j * 3 + ax] ? 3 : -3; A.ideo[i * 3 + ax] = clamp(A.ideo[i * 3 + ax] + s, -100, 100); } }   // repulsion from the out-group
    } else {
      tie(ctx, i, j, -8); tie(ctx, j, i, -10); think(ctx, j, TH.insulted);
      if (r.chance(0.04 * (100 - P(A, i, 3)) / 50)) {
        A.sick[i] = Math.max(A.sick[i], 2); A.sick[j] = Math.max(A.sick[j], 2); tie(ctx, i, j, -20); tie(ctx, j, i, -20);
        if (r.chance(0.03)) ctx.log(E.brawl, i, j, A.district[i]); else ctx.trace(E.brawl, i, j, A.district[i]);
        if (r.chance(0.01)) { kill(ctx, j, "brawl", i); setCognomen(ctx, i, 9); }
      }
    }
    // plague jumps between bodies; the fed feed their friends
    if (A.sick[i] > 2 && !A.sick[j] && !A.immune[j] && r.chance(0.06)) A.sick[j] = 1;
    if (A.hunger[i] > 1 && A.inv[j * 5] > 10) { const k = tieIndex(A, j, i); if (k >= 0 && A.tieVal[j * TIES + k] > 25) { if (isKin(A, i, j) || A.lover[i] === j) { A.inv[j * 5] -= 3; A.inv[i * 5] += 3; } else lendGrain(ctx, j, i, 3); tie(ctx, i, j, 5); } }   // kin give; neighbours lend (WD 349)
    // pirates take
    if (A.job[i] === J.pirate && !same && isAdult(A, i, ctx.day) && A.obols[j] > A.obols[i] * 2 && r.chance(0.12 * (100 - P(A, i, 0)) / 100 * (w.iron && w.iron.tier >= 1 ? 1.2 : 1))) {   // when Aidos leaves the earth, shame no longer stops a thief
      const take = Math.max(1, Math.floor(A.obols[j] / 10)); A.obols[j] -= take; A.obols[i] += take; think(ctx, j, TH.robbed); tie(ctx, j, i, -40);
      if (r.chance(0.05)) { const rl = relicsOf(w, j)[0]; if (rl) passRelic(ctx, rl, i, "stolen"); }
      A.radical[j] = clamp(A.radical[j] + 5, -100, 100);
      if (r.chance(Math.min(0.8, guards[A.district[i]] * 0.08))) { A.jail[i] = 8; if (take > 250 || r.chance(0.004)) ctx.log(E.robbery, i, j, A.district[i], take, "caught"); else { bio(ctx, i, E.robbery, j); ctx.trace(E.robbery, i, j, A.district[i]); } }
      else if (take > 250 || r.chance(0.004)) ctx.log(E.robbery, i, j, A.district[i], take, ""); else { bio(ctx, j, E.robbery, i); ctx.trace(E.robbery, i, j, A.district[i]); }
    }
  }
}
export const tieIndex = (A, i, j) => { for (let k = 0; k < TIES; k++) if (A.tieTo[i * TIES + k] === j) return k; return -1; };

export function moodStress(ctx) {
  const { A, w, day } = ctx, r = ctx.r("mood");
  for (const i of ctx.live) {
    if (A.status[i]) continue;
    let m = 0, s0 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0, ns = 0;
    for (let k = 0; k < THS; k++) {
      const s = i * THS + k, t = A.thType[s]; if (!t) continue;
      if (A.thUntil[s] < day) { A.thType[s] = 0; continue; }
      const again = (ns > 0 && s0 === t) || (ns > 1 && s1 === t) || (ns > 2 && s2 === t) || (ns > 3 && s3 === t) || (ns > 4 && s4 === t);
      if (ns === 0) s0 = t; else if (ns === 1) s1 = t; else if (ns === 2) s2 = t; else if (ns === 3) s3 = t; else if (ns === 4) s4 = t; ns++;
      m += THOUGHTS[t][1] * (again ? 0.6 : 1);
    }
    const exp = BLOODS[A.bones[i]].wealth;       // Victoria-style expected standard of living per blood
    m += clamp((A.obols[i] / exp - 1) * 12, -20, 15);
    m += A.office[i] >= 0 ? 10 : 0;
    A.mood[i] = clamp(Math.round(m), -100, 100);
    const st = A.stress[i] + (m < 0 ? -m / 8 : -m / 12) - 2;
    A.stress[i] = clamp(Math.round(st), 0, 600);
    // radical / loyal ledger with a deadband
    if (m < -25) A.radical[i] = clamp(A.radical[i] + 1, -100, 100); else if (m > 0 || (A.radical[i] > 0 && !A.hunger[i] && r.chance(0.15))) A.radical[i] = clamp(A.radical[i] - 1, -100, 100);
    if (A.stress[i] > 420) breakdown(ctx, i, r);
  }
}
export function breakdown(ctx, i, r) {
  const { A, w } = ctx; A.stress[i] = 220; think(ctx, i, TH.katharsis); scarOf(ctx, i);
  if (P(A, i, 1) > 65) {
    A.district[i] = D.anthemoessa;
    if (!w.offices.orpheus && r.chance(0.3)) { kill(ctx, i, "answered the Sirens"); return; }
    ctx.log(E.break, i, -1, D.anthemoessa, 0, "walked into the Siren meadow");
  } else if (P(A, i, 3) < 35) {
    const k = r.int(TIES), j = A.tieTo[i * TIES + k]; if (j >= 0 && living(A, j)) { A.sick[j] = Math.max(A.sick[j], 3); tie(ctx, j, i, -50); }
    if (r.chance(0.25)) ctx.log(E.break, i, j, A.district[i], 0, "rampaged"); else { bio(ctx, i, E.break, j); ctx.trace(E.brawl, i, j, A.district[i]); }
  } else if (P(A, i, 0) < 35) {
    const pool = ctx.byDist[A.district[i]].filter((x) => !A.status[x]); if (!pool.length) return; const j = pool[r.int(pool.length)]; const take = Math.floor(A.obols[j] / 5); A.obols[j] -= take; A.obols[i] += take;
    ctx.log(E.break, i, j, A.district[i], take, "stole from a neighbour");
  } else { A.sick[i] = Math.max(A.sick[i], 3); bio(ctx, i, E.break, -1); }
}

// ---------------------------------------------------------------- unrest (Epstein civil violence)
export function guardCount(ctx) {
  const { A, w } = ctx; const g = new Int32Array(DISTRICTS.length);
  if (w.guardLevel === 0) return g;
  for (const i of ctx.live) if (A.job[i] === J.reaper && !A.jail[i] && !A.status[i] && isAdult(A, i, ctx.day)) g[A.district[i]] += w.guardLevel;
  if (w.watch) for (let d = 0; d < g.length; d++) g[d] += (w.watch[d] || 0) * w.guardLevel;
  return g;
}
export function unrest(ctx) {
  const { A, w } = ctx, r = ctx.r("unrest"), guards = guardCount(ctx), prev = w.activePrev || [];
  const active = DISTRICTS.map(() => []);
  for (const i of ctx.live) {
    if (A.jail[i] || A.status[i] || !isAdult(A, i, ctx.day)) continue;
    const H = clamp((A.hunger[i] * 12 + Math.max(0, -A.mood[i])) / 100, 0, 1);
    const L = w.factions[A.faction[i]].legit / 100;
    const G = H * (1 - L) + A.radical[i] / 400 + Math.min(0.08, ((w.psi && w.psi.v) || 0) / 150);
    const R = (P(A, i, 1) * 0.6 + P(A, i, 4) * 0.4) / 100, d = A.district[i];
    const Pa = Math.min(1, 2.3 * guards[d] / ((prev[d] || 0) + 1));
    if (G - R * Pa > 0.1) active[d].push(i);
  }
  w.activePrev = active.map((a) => a.length);
  for (let d = 0; d < DISTRICTS.length; d++) {
    const a = active[d], pop = ctx.byDist[d].length;
    if (a.length < 15 || a.length < pop * 0.1 || (w.riotCool && w.riotCool[d] > ctx.day) || !r.chance(Math.min(0.5, a.length / pop))) continue;
    (w.riotCool || (w.riotCool = DISTRICTS.map(() => 0)))[d] = ctx.day + 12 + r.int(24);
    w.unrestSeason = (w.unrestSeason || 0) + 1;
    let dead = 0, jailed = 0, looted = 0;
    for (const i of a) {
      A.radical[i] = clamp(A.radical[i] + 8, -100, 100);
      const v = ctx.byDist[d][r.int(pop)]; if (!A.status[v] && A.inv[v * 5] > 4 && A.obols[v] > A.obols[i]) { const q = Math.ceil(A.inv[v * 5] / 3); A.inv[v * 5] -= q; A.inv[i * 5] += q; looted += q; }
      if (r.chance(0.004)) { kill(ctx, i, "cut down in the riot"); dead++; }
      else if (jailed < guards[d] * 3 && r.chance(0.5)) { A.jail[i] = 10; jailed++; }
    }
    const inA = new Set(a); for (const i of ctx.byDist[d]) if (!inA.has(i) && !A.status[i] && r.chance(0.5)) think(ctx, i, TH.fear_of_the_mob);
    const lead = a.reduce((b, i) => (A.radical[i] > A.radical[b] ? i : b), a[0]); setCognomen(ctx, lead, 8);
    ctx.log(E.riot, lead, -1, d, a.length, JSON.stringify({ dead, jailed, looted })); iconoclasm(ctx, d, lead);
    if (dead || a.length > 150) remember(w, ctx.day, "riot", lead, 30 + dead * 5, `the rising of ${DISTRICTS[d].name.replace(/^the /, "")}`, A.faith[lead]);
  }
}

// ---------------------------------------------------------------- allegiance
export function centroids(ctx) {
  const { A, w } = ctx; const sum = w.factions.map(() => [0, 0, 0, 0]);
  for (const i of ctx.live) { if (A.status[i]) continue; const f = sum[A.faction[i]]; f[0] += A.ideo[i * 3]; f[1] += A.ideo[i * 3 + 1]; f[2] += A.ideo[i * 3 + 2]; f[3]++; }
  w.factions.forEach((f, k) => { f.members = sum[k][3]; if (sum[k][3]) f.ideo = [0, 1, 2].map((x) => Math.round(sum[k][x] / sum[k][3])); });
}
export function defection(ctx) {
  const { A, w } = ctx, r = ctx.r("defect"); let n = 0;
  const cnt = new Int32Array(w.factions.length);
  for (const i of ctx.live) {
    if (A.status[i] || !isAdult(A, i, ctx.day)) continue;
    cnt.fill(0); let pos = 0;
    for (let k = 0; k < TIES; k++) { const j = A.tieTo[i * TIES + k]; if (j >= 0 && A.tieVal[i * TIES + k] >= 15 && living(A, j)) { cnt[A.faction[j]]++; pos++; } }
    if (pos < 3) continue;
    const own = A.faction[i]; let g = -1, c = 0;
    for (let f = 0; f < cnt.length; f++) if (f !== own && w.factions[f].alive && cnt[f] > c) { c = cnt[f]; g = f; }
    if (g < 0) continue;
    let theta = A.identity[i] / 100 * 0.6 + 0.25; if (A.radical[i] > 30) theta -= 0.15; if (w.factions[own].legit < 30) theta -= 0.1;
    const dOwn = idist(A, i, w.factions[own].ideo), dNew = idist(A, i, w.factions[g].ideo);
    if (c / pos > theta && dNew + 10 < dOwn && r.chance(0.5)) {
      A.faction[i] = g; A.identity[i] = Math.max(5, A.identity[i] - 20); n++;
      if (g >= w.baseFactions || (w.factions[g].blood !== A.bones[i] && r.chance(0.35))) ctx.log(E.defect, i, -1, A.district[i], g, w.factions[g].name);
      else ctx.trace(E.defect, i, -1, A.district[i]);
      if (w.factions[g].blood !== A.bones[i] && A.cognomen[i] === 0 && r.chance(0.1)) A.cognomen[i] = 15;
    }
  }
}
export const idist = (A, i, c) => Math.abs(A.ideo[i * 3] - c[0]) + Math.abs(A.ideo[i * 3 + 1] - c[1]) + Math.abs(A.ideo[i * 3 + 2] - c[2]);

