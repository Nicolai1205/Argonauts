// The economy: production (seasons, skill, strife, fish), consumption and sickness, services and rents, per-city markets and
// trade, weekly love, migration. Split out of systems.js; behaviour is identical.
import { BASE_PRICE, BLOODS, D, DISTRICTS, FIELD_SEASON, GOODS, J, JOBS, JOB_GOOD, SEA_SEASON, TARGET, TH, YIELD, monthOf } from "./lore.js";
import { TIES } from "./world.js";
import { E, P, YEAR, bio, clamp, isAdult, isKin, kill, living, setCognomen, think, tie, tieIndex } from "./systems.js";
import { cityOf } from "./fleece.js";
import { craftBoost } from "./drift.js";
import { fishMult } from "./statecraft.js";
import { memorize, oathEnds, swear } from "./memory.js";
import { quarantined, recover, skillMult } from "./depth.js";
import { strife, weddingGifts } from "./voyage.js";
import { tradeFlows } from "./trade.js";

// ---------------------------------------------------------------- economy
export function production(ctx) {
  const { A, w, day } = ctx, r = ctx.r("production"), dark = w.director.active.pall === day, out = new Int32Array(DISTRICTS.length);
  const prom = (w.director.active.prometheus || -1) >= day, mo = monthOf(day);
  for (const i of ctx.live) {
    if (A.jail[i] || A.sick[i] || dark || A.status[i]) continue;
    const age = A.kind[i] ? (day - A.born[i]) / YEAR : 30; if (age < 5) continue;
    const job = JOBS[A.job[i]], good = job === "pirate" ? "food" : JOB_GOOD[job]; if (!good) continue;   // pirates fish between raids
    const g = GOODS.indexOf(good), d = A.district[i];
    let q = job === "servant" || job === "rower" ? 2 : job === "merchant" ? 1 : job === "pirate" ? (YIELD.fish || 2) * 0.5 : (YIELD[good] || 1);
    q *= craftBoost(w, d, A.job[i]) * (age < 14 ? 0.5 : age >= 60 ? 0.7 : 1) * (0.8 + P(A, i, 4) / 250) * (w.fertility[d] / 1000) * (A.inv[i * 5 + 3] > 0 ? 1.4 : 1) * (A.mood[i] < -30 ? 0.6 : 1) * strife(A, i) * skillMult(A, i);
    if (prom && g === 4) q *= 2;
    if (g === 0) q *= job === "farmer" ? FIELD_SEASON[mo] : SEA_SEASON[mo] * fishMult(w, d);
    if (w.newFire !== null && w.newFire !== undefined && d === D.lemnos) q *= 0.5;   // every fire on Lemnos is out
    const n = Math.floor(q) + (r.next() < q - Math.floor(q) ? 1 : 0);
    A.inv[i * 5 + g] = Math.min(400, A.inv[i * 5 + g] + n); out[d] += n;
    if (A.inv[i * 5 + 3] > 0 && r.chance(1 / 8)) A.inv[i * 5 + 3]--;
  }
  // soil and sea: regrow toward full, deplete with harvest relative to the district's working population
  for (let d = 0; d < DISTRICTS.length; d++) {
    const cap = Math.max(20, ctx.byDist[d].length * 2.2);
    w.fertility[d] = clamp(Math.round(w.fertility[d] + (1000 - w.fertility[d]) * 0.06 - out[d] * 30 / cap), 150, 1000);
  }
}

export function consumption(ctx) {
  const { A, day } = ctx, r = ctx.r("consume"); let starving = 0;
  for (const i of ctx.live) {
    const b = i * 5;
    if (A.inv[b] > 0) { A.inv[b]--; A.hunger[i] = 0; if (A.inv[b] > 20) think(ctx, i, TH.well_fed); }
    else if (r.chance(DISTRICTS[A.district[i]].res === "food" || DISTRICTS[A.district[i]].res === "fish" ? 0.65 : 0.35)) A.hunger[i] = 0;   // forage, glean, beg a fish
    else { A.hunger[i] = Math.min(255, A.hunger[i] + 1); think(ctx, i, A.hunger[i] > 4 ? TH.starving : TH.hungry); if (A.hunger[i] > 4) starving++;
      if (A.hunger[i] >= 10 && r.chance((A.hunger[i] - 9) * 0.03)) { kill(ctx, i, "starved"); setCognomen(ctx, i, 2); continue; } }
    if (A.vice[i] && r.chance(A.vice[i] === 2 ? 0.6 : 0.5)) { if (A.inv[b + 1] > 0) A.inv[b + 1]--; else think(ctx, i, TH.craving_smoke); }
    if (A.inv[b + 2] > 0 && r.chance(1 / 10)) A.inv[b + 2]--;
    if (A.inv[b + 4] > 0 && P(A, i, 4) > 50 && r.chance(1 / 30)) A.inv[b + 4]--;
    if (A.inv[b] > 60 && r.chance(0.3)) A.inv[b] -= Math.ceil(A.inv[b] / 10);       // grain rots, fish stinks
    if (A.sick[i]) {
      think(ctx, i, TH.sick);
      if (A.inv[b + 4] > 0) { A.inv[b + 4]--; A.sick[i] = Math.max(0, A.sick[i] - 3); if (!A.sick[i]) A.immune[i] = 90; }
      else if (r.chance(0.08 + ctx.w.crafts[A.district[i]][2] / 1000)) recover(A, i); else A.sick[i] = Math.min(60, A.sick[i] + 1);
      if (A.sick[i] >= 6 && r.chance(0.035)) kill(ctx, i, "plague");
    }
  }
  if (starving > ctx.live.length * 0.05 && day % 5 === 0) ctx.log(E.famine, -1, -1, -1, starving);
}

function services(ctx) {
  const { A, w } = ctx, r = ctx.r("services"), SERV = new Set([J.priest, J.reaper, J.servant, J.rower, J.augur, J.merchant]);
  const workers = DISTRICTS.map(() => []), all = [];
  for (const i of ctx.live) if (!A.status[i] && !A.jail[i] && SERV.has(A.job[i])) { workers[A.district[i]].push(i); all.push(i); }
  if (!all.length) return;
  const lords = {}, allLords = [];
  for (const i of ctx.live) if (!A.status[i] && A.job[i] === J.noble && isAdult(A, i, ctx.day)) { (lords[cityOf(A.district[i])] || (lords[cityOf(A.district[i])] = [])).push(i); allLords.push(i); }
  if (allLords.length) for (const i of ctx.live) {
    if (A.status[i] || A.obols[i] < 30 || !JOB_GOOD[JOBS[A.job[i]]] || A.job[i] === J.servant || A.job[i] === J.rower || !r.chance(1 / 3)) continue;
    const ls = lords[cityOf(A.district[i])] || allLords, j = ls[r.int(ls.length)]; A.obols[i]--; A.obols[j]++;
  }
  for (const i of ctx.live) {
    if (A.status[i]) continue;
    const exp = BLOODS[A.bones[i]].wealth, floor = exp >> 1, spare = A.obols[i] - floor; if (spare < 40) continue;
    if (A.obols[i] > exp * 5) { const lit = Math.floor((A.obols[i] - exp * 5) / 400); if (lit > 0) { A.obols[i] -= lit; w.treasury += lit; } }   // leitourgia: the rich fund the city
    const pay = Math.max(1, Math.floor(spare / 80));
    const pool = workers[A.district[i]].length ? workers[A.district[i]] : all, j = pool[r.int(pool.length)];
    if (j === i) continue; A.obols[i] -= pay; A.obols[j] += pay;
    if (A.job[j] === J.priest && A.ideo[i * 3 + 2] > 20) tie(ctx, i, j, 1);
  }
}
export function market(ctx) {
  services(ctx);
  const { A, w } = ctx, r = ctx.r("market"), Pm = w.cprices, vol = [0, 0, 0, 0, 0], wsum = [0, 0, 0, 0, 0], nD = DISTRICTS.length;
  // who trades today, in which market, and what they need (none of this changes while the markets run; stock and purses do)
  const el = [], em = [], ned = [];
  for (const i of ctx.live) {
    if (A.jail[i] || A.status[i] || !isAdult(A, i, ctx.day)) continue;
    el.push(i); em.push(cityOf(A.district[i])); ned.push(A.vice[i] ? TARGET[1] : 0, JOB_GOOD[JOBS[A.job[i]]] ? 1 : 0, A.sick[i] ? 2 : P(A, i, 4) > 50 ? 1 : 0);
  }
  const wm = new Float64Array(w.N);
  for (let g = 0; g < 5; g++) {
    // every city keeps its own market; the small grounds trade at Pagasae
    const sellers = new Array(nD), buyers = new Array(nD), S = new Int32Array(nD), Dm = new Int32Array(nD);
    for (let e = 0; e < el.length; e++) {
      const i = el[e], m = em[e];
      const have = A.inv[i * 5 + g], need = g === 0 ? TARGET[0] : g === 1 ? ned[e * 3] : g === 3 ? ned[e * 3 + 1] : g === 4 ? ned[e * 3 + 2] : TARGET[g];
      if (have > need + 2) { const q = Math.min(have - need - 1, 25); (sellers[m] || (sellers[m] = [])).push(i, q); S[m] += q; }
      else if (have < need) {
        // willingness to pay, as a multiple of the base price: urgency and wealth (demand answers price)
        let wmax = g === 0 ? (A.hunger[i] ? 6 : 2.5) : g === 1 ? 3 : g === 2 ? 1.6 : g === 3 ? 1.4 : (A.sick[i] ? 6 : 1.3);
        if (A.obols[i] > BLOODS[A.bones[i]].wealth * 4) wmax *= 2;
        wm[i] = wmax; (buyers[m] || (buyers[m] = [])).push(i, need - have); if (Pm[m][g] * w.priceMult <= BASE_PRICE[g] * wmax) Dm[m] += need - have;
      }
    }
    for (let mk = 0; mk < nD; mk++) {
      if (!sellers[mk] && !buyers[mk]) continue;
      const sl = sellers[mk] || [], by = buyers[mk] || [], s0 = S[mk], d0 = Dm[mk];
      vol[g] += s0 + d0; wsum[g] += Pm[mk][g] * (s0 + d0);
      const pe = Pm[mk][g] * w.priceMult; if (!sl.length || !by.length) continue;
      const bo = []; for (let k = 0; k < by.length; k += 2) bo.push(k); r.shuffle(bo);
      const so = []; for (let k = 0; k < sl.length; k += 2) so.push(k); r.shuffle(so);
      let sp = 0;
      for (const bk of bo) {
        const i = by[bk]; if (pe > BASE_PRICE[g] * wm[i]) continue; let want = Math.min(by[bk + 1], Math.floor(A.obols[i] / Math.max(1, Math.ceil(pe))));
        while (want > 0 && sp < so.length) {
          const sk = so[sp], j = sl[sk], q = Math.min(want, sl[sk + 1]);
          if (q <= 0) { sp++; continue; }
          const pay = Math.max(1, Math.round(pe * q)); if (pay > A.obols[i]) break;
          const tax = Math.floor(pay * w.taxPermille / 1000);
          A.obols[i] -= pay; A.obols[j] += pay - tax; w.treasury += tax;
          A.inv[i * 5 + g] += q; A.inv[j * 5 + g] -= q; sl[sk + 1] -= q; want -= q;
          if (sl[sk + 1] <= 0) sp++;
        }
        by[bk + 1] = want;
      }
      // the grain dole: when the Boule leans to the Commons, the treasury buys bread for the hungry poor
      if (g === 0 && w.grainDole && w.treasury > 0) {
        let fed = 0;
        for (const bk of bo) {
          const i = by[bk]; if (!A.hunger[i] || A.obols[i] >= Math.ceil(pe)) continue;
          while (sp < so.length && sl[so[sp] + 1] <= 0) sp++; if (sp >= so.length) break;
          const sk = so[sp], j = sl[sk], q = Math.min(3, sl[sk + 1]), pay = Math.max(1, Math.round(pe * q)); if (pay > w.treasury) break;
          w.treasury -= pay; A.obols[j] += pay; A.inv[i * 5] += q; A.inv[j * 5] -= q; sl[sk + 1] -= q; fed++;
        }
        if (fed > 50 && ctx.day % 10 === 0) ctx.log(E.dole, -1, -1, mk, fed);
      }
    }
    // what the city could not settle at home goes on the road
    const left = { sellers: {}, buyers: {}, wmax: wm };
    const anyLeft = (a) => { for (let k = 1; k < a.length; k += 2) if (a[k] > 0) return true; return false; };
    for (let mk = 0; mk < nD; mk++) { if (sellers[mk] && anyLeft(sellers[mk])) left.sellers[mk] = sellers[mk]; if (buyers[mk] && anyLeft(buyers[mk])) left.buyers[mk] = buyers[mk]; }
    tradeFlows(ctx, g, left);
    // prices answer what is still unsettled after the city market and the roads: unmet demand raises, unsold stock lowers
    for (let mk = 0; mk < nD; mk++) {
      if (!sellers[mk] && !buyers[mk]) continue;
      let unmet = 0, unsold = 0; const sl = sellers[mk] || [], by = buyers[mk] || [];
      for (let k = 1; k < sl.length; k += 2) unsold += sl[k];
      for (let k = 0; k < by.length; k += 2) { const i = by[k]; if (Pm[mk][g] * w.priceMult <= BASE_PRICE[g] * wm[i] && A.obols[i] >= Math.ceil(Pm[mk][g] * w.priceMult)) unmet += by[k + 1]; }
      const old = Pm[mk][g]; let p = unmet + unsold === 0 ? old + (BASE_PRICE[g] - old) * 0.05 : old * (1 + 0.06 * clamp((unmet - unsold) / Math.max(unmet, unsold, 1), -1, 1));   // a quiet market drifts back to the old price
      p = clamp(p, BASE_PRICE[g] * 0.3, BASE_PRICE[g] * 6); Pm[mk][g] = Math.round(p * 1000) / 1000;
      if (g === 0 && Pm[mk][0] > BASE_PRICE[0] * 3 && old <= BASE_PRICE[0] * 3) ctx.log(E.crash, -1, -1, mk, Math.round(Pm[mk][0] * 100), "food");
    }
    if (vol[g]) w.prices[g] = Math.round(wsum[g] / vol[g] * 1000) / 1000;
  }
  let pir = 0; for (const i of ctx.live) if (A.job[i] === J.pirate && !A.status[i]) pir++; w.pirates = pir;
}

// weekly: love forms when two are each other's strongest bond; it ends when the bond sours
export function love(ctx) {
  const { A } = ctx, best = new Int32Array(ctx.N).fill(-1), bv = new Int8Array(ctx.N);
  for (let s = 0; s < A.tieVal.length; s++) { const v = A.tieVal[s]; if (v > 0) A.tieVal[s] = v - (v > 60 ? 2 : 1); else if (v < 0) A.tieVal[s] = v + 1; }   // unreinforced bonds fade (CK3 opinion decay)
  for (const i of ctx.live) for (let k = 0; k < TIES; k++) { const j = A.tieTo[i * TIES + k], v = A.tieVal[i * TIES + k]; if (j >= 0 && v > bv[i]) { bv[i] = v; best[i] = j; } }
  for (const i of ctx.live) {
    if (A.status[i]) continue;
    const l = A.lover[i];
    if (l >= 0) { const k = tieIndex(A, i, l); if (k < 0 || A.tieVal[i * TIES + k] < 30) { A.lover[i] = -1; if (A.lover[l] === i) A.lover[l] = -1; think(ctx, i, TH.heartbroken); oathEnds(ctx, i, "love", false); oathEnds(ctx, l, "love", true); if (living(A, l)) memorize(ctx, l, 4, i, 70); if (living(A, l)) think(ctx, l, TH.heartbroken); if (i < l) ctx.log(E.heartbreak, i, l, A.district[i]); } continue; }
    const j = best[i]; if (j < 0 || j < i || best[j] !== i || !isAdult(A, i, ctx.day) || !isAdult(A, j, ctx.day) || isKin(A, i, j) || bv[i] < 69 || bv[j] < 69 || A.lover[j] >= 0 || !living(A, j)) continue;
    A.lover[i] = j; A.lover[j] = i; think(ctx, i, TH.in_love); think(ctx, j, TH.in_love); ctx.log(E.love, i, j, A.district[i]);
    if (ctx.rr.chance(A.scar[i] === 6 ? 0.9 : 0.3)) swear(ctx, i, j, "love", 360);
    if (A.kind[i] && A.kind[j]) weddingGifts(ctx, i, j);
  }
}

// weekly: hands leave trades that no longer feed them (Songs of Syx: migration is the release valve)
export function migration(ctx) {
  const { A, w } = ctx, r = ctx.r("migrate"); let n = 0;
  const ratio = w.prices.map((p, g) => p / BASE_PRICE[g]);
  let best = 0; for (let g = 1; g < 5; g++) if (ratio[g] > ratio[best]) best = g;
  const where = DISTRICTS.map((d, k) => k).filter((k) => DISTRICTS[k].res === GOODS[best] || (best === 0 && DISTRICTS[k].res === "fish"));
  for (const i of ctx.live) {
    if (A.status[i] || A.jail[i] || !isAdult(A, i, ctx.day) || i === w.fleece || quarantined(w, A.district[i])) continue;
    const good = JOB_GOOD[JOBS[A.job[i]]]; if (!good || JOBS[A.job[i]] === "servant" || JOBS[A.job[i]] === "rower") continue;
    const g = GOODS.indexOf(good), own = w.cprices[cityOf(A.district[i])][g] / BASE_PRICE[g]; if (ratio[best] < 1.4 || g === best || own > 0.7 || A.obols[i] > BLOODS[A.bones[i]].wealth / 2 || !r.chance(0.08 + P(A, i, 5) / 600)) continue;
    const d = where[r.int(where.length)], res = DISTRICTS[d].res;
    ctx.trip(i, A.district[i], d, "migrate"); A.district[i] = d; A.skill[i] >>= 1; A.job[i] = res === "food" ? J.farmer : res === "fish" ? J.fisher : res === "ore" ? J.miner : res === "cloth" ? J.weaver : res === "smoke" ? J.grower : J.herbalist; n++;
    bio(ctx, i, E.migrate, d);
  }
  if (n > 40) ctx.log(E.migrate, -1, -1, where[0], n, GOODS[best]);
}

