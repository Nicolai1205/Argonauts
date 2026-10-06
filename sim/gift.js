// The Gift and the Duty: liturgies and antidosis, inherited guest-friendship, theoxenia, the Boule's grain fleet.
// Sources (docs/research/MYTH.md §3.1, 3.8, 2.1.6, 4.3): the Athenian liturgy system and antidosis (Dem. 42; Lysias 21);
// Il. 6.119-236 (Glaukos and Diomedes lower their spears over their grandfathers' xenia); WD 122-126 (the Golden Race,
// "watchers ... givers of wealth"); Od. 17.485-487 (gods walk as strangers); the Cyrene grain stele (SEG 9.2).
// Every transfer is hand to hand or through the treasury, so the money invariant holds.
import { DISTRICTS, D, ST, TH, J, BASE_PRICE } from "./lore.js";
import { CITIES } from "./war.js";
import { carriage } from "./trade.js";

const YEAR = 12, adult = (A, i, day) => !A.kind[i] || day - A.born[i] >= 14 * YEAR;
const P = (A, i, k) => A.pers[i * 6 + k];
const cityOf = (d) => (CITIES.includes(d) ? d : D.agora);
const CHRYSEOI = 6;
export const XENIA_CAP = 4000;

export function initGift(w) { w.xenia = {}; w.convoy = {}; w.liturgy = { year: [], kleos: {} }; }

// ------------------------------------------------------------------ xenia: a guest-bond between two houses, passed to heirs
const xkey = (a, b) => (a < b ? a + ":" + b : b + ":" + a);
/** a real sale binds the old house and the new one */
export function bindXenia(w, a, b, day) {
  if (a === b || a <= 0 || b <= 0) return;
  const k = xkey(a, b); if (w.xenia[k] === undefined) { w.xenia[k] = day; w.xeniaN = (w.xeniaN || 0) + 1; } else return;
  if (w.xeniaN > XENIA_CAP + 500) {   // prune in batches: the oldest bonds lapse
    const ks = Object.keys(w.xenia); ks.sort((p, q) => w.xenia[p] - w.xenia[q] || (p < q ? -1 : 1));
    for (let t = 0; t < ks.length - XENIA_CAP; t++) delete w.xenia[ks[t]]; w.xeniaN = XENIA_CAP;
  }
}
export const xenoi = (w, a, b) => a !== b && w.xenia[xkey(a, b)] !== undefined;
/** partners of each house, built once per call site */
export function xeniaIndex(w) { const ix = new Map(); for (const k of Object.keys(w.xenia)) { const [a, b] = k.split(":").map(Number); (ix.get(a) || ix.set(a, []).get(a)).push(b); (ix.get(b) || ix.set(b, []).get(b)).push(a); } return ix; }

/** in battle, guest-friends on opposite sides who recognise each other lower their spears; returns the spared */
export function spareXenoi(ctx, pool, enemyCity) {
  const { A, w } = ctx; if (!pool.length) return new Set();
  const houses = new Map(); for (const i of ctx.live) if (!A.status[i] && A.district[i] === enemyCity && !houses.has(A.oikos[i])) houses.set(A.oikos[i], i);
  const ix = xeniaIndex(w), spared = new Set(); let first = null;
  for (const i of pool) { const ps = ix.get(A.oikos[i]); if (!ps) continue; for (const p of ps) if (houses.has(p)) { spared.add(i); if (!first) first = [i, houses.get(p)]; break; } }
  if (first) ctx.log(ctx.E.xenoi, first[0], first[1], enemyCity, spared.size, "spears");
  return spared;
}

/** violating a guest or a host: the worst stain */
export function xeniaViolated(ctx, v, k) { const A = ctx.A; return xenoi(ctx.w, A.oikos[v], A.oikos[k]); }

// ------------------------------------------------------------------ monthly duties
export function giftMonthly(ctx) {
  const { A, w, day } = ctx, r = ctx.r("gift"), E = ctx.E;
  const byCity = {}, hungry = {}, rowers = {};
  for (const i of ctx.live) {
    if (A.status[i] || A.jail[i]) continue; const c = cityOf(A.district[i]);
    (byCity[c] || (byCity[c] = [])).push(i);
    if (A.hunger[i] || A.inv[i * 5] < 2) (hungry[c] || (hungry[c] = [])).push(i);
    if (A.job[i] === J.rower && adult(A, i, day)) (rowers[c] || (rowers[c] = [])).push(i);
  }
  const cities = Object.keys(byCity).map(Number).sort((a, b) => a - b);
  const year = Math.floor((day + 360000) / 360);
  if (w.liturgy.y !== year) { w.liturgy.y = year; w.liturgy.year = []; }

  for (const c of cities) {
    const pop = byCity[c], hs = (hungry[c] || []).sort((x, y) => A.hunger[y] - A.hunger[x] || x - y);
    const obs = pop.map((i) => A.obols[i]).sort((x, y) => x - y), median = obs[obs.length >> 1] || 0;
    const line = Math.max(800, median * 8);
    // who is named: the very rich of the city, and every Chryseos of means (the givers of wealth)
    const named = pop.filter((i) => adult(A, i, day) && (A.obols[i] > line || (A.bones[i] === CHRYSEOI && A.obols[i] > 1000))).sort((x, y) => A.obols[y] - A.obols[x] || x - y).slice(0, 12);
    if (!named.length) continue;
    const famine = hs.length > pop.length * 0.06 || w.cprices[c][0] > BASE_PRICE[0] * 2.5;
    const raided = (w.raidsAt && w.raidsAt[c] > day - 30);
    const kind = famine ? "sitonia" : raided ? "trierarchy" : "choregia";
    let total = 0, top = -1, topPaid = 0, refused = -1;
    for (const i of named) {
      let payer = i;
      // antidosis: the named may point at a richer neighbour who was not named; take the duty, or swap estates
      if (r.chance(0.04)) {
        const richer = pop.filter((j) => j !== i && adult(A, j, day) && !named.includes(j) && A.obols[j] > A.obols[i] * 0.8 && A.obols[j] <= A.obols[i] * 3);
        if (richer.length) {
          const j = richer[r.int(richer.length)];
          if (r.chance(0.12)) { const t = A.obols[i]; A.obols[i] = A.obols[j]; A.obols[j] = t; ctx.log(E.antidosis, i, j, c, A.obols[i], "swap"); }
          else { payer = j; ctx.log(E.antidosis, i, j, c, 0, "took"); }
        }
      }
      // the shameless refuse; the city remembers
      if (P(A, payer, 0) < 22 && A.bones[payer] !== CHRYSEOI && r.chance(0.35)) {
        for (let t = 0; t < 12; t++) { const j = pop[r.int(pop.length)]; if (j !== payer) ctx.tie(j, payer, -25); }
        if (refused < 0) refused = payer; continue;
      }
      const cost = Math.max(40, Math.floor(A.obols[payer] * 0.03));
      const spent = kind === "sitonia" ? buyGrain(ctx, payer, c, cost, hs, r) : kind === "trierarchy" ? wages(ctx, payer, rowers[c] || [], cost, r) : wages(ctx, payer, pop.filter((j) => A.obols[j] < median), cost, r);
      total += spent; if (spent > topPaid) { topPaid = spent; top = payer; }
      // kleos: the city thanks its givers
      if (spent > 0) { for (let t = 0; t < 6; t++) { const j = pop[r.int(pop.length)]; if (j !== payer) ctx.tie(j, payer, 6); } ctx.think(payer, TH.honoured_by_the_city); w.liturgy.kleos[payer] = (w.liturgy.kleos[payer] || 0) + spent; ctx.renown(payer, spent / 40); }
    }
    if (kind === "trierarchy" && total > 0) w.convoy[c] = day + 30;
    if (kind === "choregia" && total > 0) for (const i of pop) if (r.chance(0.5)) ctx.think(i, TH.feasted);
    if (total > 0) { w.liturgy.year.push([c, kind, total, top]); if (w.liturgy.year.length > 40) w.liturgy.year.shift(); }
    if (top >= 0 && (total >= 400 || kind === "sitonia")) ctx.log(E.liturgy, top, -1, c, total, kind);
    if (refused >= 0) ctx.log(E.liturgy, refused, -1, c, 0, "refused");
  }

  // the Boule's grain fleet: a hoarding treasury buys bread for its hungriest city
  if (w.treasury > 40000) {
    let worst = -1, ws = 0; for (const c of cities) { const s = (hungry[c] || []).length / byCity[c].length; if (s > ws) { ws = s; worst = c; } }
    if (worst >= 0 && ws > 0.05) { const spent = buyGrain(ctx, -2, worst, Math.floor(w.treasury * 0.08), hungry[worst], r); if (spent > 0) ctx.log(E.liturgy, -1, -1, worst, spent, "boule"); }
  }

  // xenia: guest-friends send gifts across the sea (Il. 6.215-231: "let us exchange armour")
  const keys = Object.keys(w.xenia); if (keys.length) {
    const houses = new Map(); for (const i of ctx.live) if (!A.status[i] && adult(A, i, day)) { const o = A.oikos[i]; if (!houses.has(o)) houses.set(o, i); }
    for (let t = 0; t < 30; t++) {
      const [a, b] = keys[r.int(keys.length)].split(":").map(Number), x = houses.get(a), y = houses.get(b); if (x === undefined || y === undefined) continue;
      const g = Math.min(20, Math.floor(A.obols[x] / 20)); if (g > 0) { A.obols[x] -= g; A.obols[y] += g; }
      ctx.tie(x, y, 12); ctx.tie(y, x, 12);
      if (t === 0 && g >= 10) ctx.log(E.xenoi, x, y, A.district[y], g, "gift");
    }
  }

  // theoxenia: a Chryseos walks as a beggar and knocks on doors (Od. 17.485-487)
  const watchers = ctx.live.filter((i) => !A.status[i] && A.bones[i] === CHRYSEOI && adult(A, i, day) && A.obols[i] > 300);
  if (watchers.length && r.chance(0.6)) {
    const g = watchers[r.int(watchers.length)], quarters = cities.filter((c) => c !== A.district[g] && byCity[c].length > 50);
    if (quarters.length) {
      const c = quarters[r.int(quarters.length)], pool = byCity[c]; let best = -1, worst = -1;
      for (let t = 0; t < 3; t++) {
        const h = pool[r.int(pool.length)]; if (!adult(A, h, day) || h === g) continue;
        const kind = P(A, h, 3) + P(A, h, 0) / 2 + (A.inv[h * 5] > 4 ? 15 : 0) - (A.hunger[h] ? 20 : 0) + r.int(30);
        if (kind > 95 && A.inv[h * 5] > 0) { A.inv[h * 5]--; A.inv[g * 5]++; if (best < 0) best = h; }
        else if (kind < 45 && worst < 0) worst = h;
      }
      if (best >= 0) { const gift = Math.min(400, Math.floor(A.obols[g] / 8)); A.obols[g] -= gift; A.obols[best] += gift; ctx.think(best, TH.touched_by_the_maker); ctx.tie(best, g, 30); ctx.memorize(best, 11, g, 75); ctx.log(E.theoxenia, g, best, c, gift, "blessed"); }
      else if (worst >= 0) { A.sick[worst] = Math.max(A.sick[worst], 3); ctx.think(worst, TH.haunted); ctx.tie(g, worst, -40); ctx.log(E.theoxenia, g, worst, c, 0, "cursed"); }
    }
  }
}

/** buy bread at the city's price (or import it at landed price) for the hungry; payer -2 = the treasury */
function buyGrain(ctx, payer, c, budget, hungryList, r) {
  const { A, w } = ctx; if (!hungryList || !hungryList.length || budget <= 0) return 0;
  const fund = () => (payer === -2 ? w.treasury : A.obols[payer]), pay = (n) => { if (payer === -2) w.treasury -= n; else A.obols[payer] -= n; };
  budget = Math.min(budget, fund());
  // sellers: home first, then the cheapest landed city
  const srcs = [c].concat(CITIES.filter((x) => x !== c).sort((x, y) => w.cprices[x][0] * carriage(w, x, c) - w.cprices[y][0] * carriage(w, y, c) || x - y));
  let spent = 0, k = 0;
  for (const s of srcs) {
    if (spent >= budget || k >= hungryList.length) break;
    const price = Math.max(1, Math.ceil(w.cprices[s][0] * (s === c ? 1 : carriage(w, s, c)))), base = Math.max(1, Math.ceil(w.cprices[s][0]));
    const sellers = (ctx.grainSellers || (ctx.grainSellers = (() => { const m = {}; for (const j of ctx.live) if (!A.status[j] && A.inv[j * 5] > 12) (m[cityOf(A.district[j])] || (m[cityOf(A.district[j])] = [])).push(j); return m; })()))[s] || [];
    for (const j of sellers) {
      while (A.inv[j * 5] > 12 && k < hungryList.length && spent + price * 3 <= budget) {
        const i = hungryList[k++]; if (A.status[i]) continue;
        A.inv[j * 5] -= 3; A.inv[i * 5] += 3; pay(price * 3); A.obols[j] += base * 3; w.treasury += (price - base) * 3; spent += price * 3;
      }
      if (spent + price * 3 > budget || k >= hungryList.length) break;
    }
  }
  return spent;
}

/** pay wages from a liturgist to workers (rowers for a convoy, the poor for a chorus) */
function wages(ctx, payer, workers, budget, r) {
  const A = ctx.A; if (!workers.length || budget <= 0) return 0;
  budget = Math.min(budget, A.obols[payer]); const n = Math.min(workers.length, 20), each = Math.floor(budget / n); if (each <= 0) return 0;
  for (let t = 0; t < n; t++) { const j = workers[r.int(workers.length)]; A.obols[j] += each; }
  A.obols[payer] -= each * n; return each * n;
}
