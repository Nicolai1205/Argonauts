// Trade between cities: after each city's own market, unmet demand is met from other cities' leftover supply at landed
// prices (price x carriage). Haulers of the selling city earn the carriage; wars close routes; pirates skim the sea lanes.
// The economics are flows of many small boats and mule-trains; caravans on the map are the visible part of those flows.
import { DISTRICTS, D, GOODS, BASE_PRICE, J, monthOf, SEA_CLOSED, SEA_RISKY } from "./lore.js";
import { CITIES, atWar } from "./war.js";
import { rocksShut } from "./voyage.js";
import { quarantined } from "./depth.js";

const dist = (a, b) => { const dx = DISTRICTS[a].x - DISTRICTS[b].x, dy = DISTRICTS[a].y - DISTRICTS[b].y; return Math.round(Math.sqrt(dx * dx + dy * dy)); };   // integer: replays identically in every engine
const ISLAND = new Set(["drepane", "lemnos", "anthemoessa", "eridanus"].map((k) => D[k]));
export const sea = (a, b) => ISLAND.has(a) || ISLAND.has(b);
const short = (k) => DISTRICTS[k].name.replace(/^the /, "").replace(/ & the Agora/, "");
export function initTrade(w) { w.cprices = DISTRICTS.map(() => BASE_PRICE.slice()); w.caravans = []; w.tradeLog = { sent: 0, raided: 0, volume: 0 }; }
export const carriage = (w, a, b) => 1.15 + dist(a, b) / 2000 + (sea(a, b) ? 0.08 : 0) + (w.war && w.war.rel[a][b] < -30 ? 0.25 : 0);

/** match leftover buyers of each city with leftover sellers of the others (called by the market for each good) */
export function tradeFlows(ctx, g, left) {
  const { A, w, day } = ctx, r = ctx.r("trade" + g), P = w.cprices, flows = [];
  const haulers = ctx.haulers || (ctx.haulers = (() => { const h = {}; for (const i of ctx.live) if (!A.status[i] && !A.jail[i] && (A.job[i] === J.merchant || A.job[i] === J.rower)) (h[A.district[i]] || (h[A.district[i]] = [])).push(i); return h; })());
  for (const b of Object.keys(left.buyers).map(Number).sort((x, y) => P[y][g] - P[x][g] || x - y)) {   // goods run first to the dearest market
    const buyers = left.buyers[b];
    const mo = monthOf(day), sources = Object.keys(left.sellers).map(Number).filter((a) => a !== b && !atWar(w.war, a, b) && w.war.rel[a][b] > -60 && !(sea(a, b) && SEA_CLOSED(mo)) && !rocksShut(w, a, b) && !quarantined(w, a) && !quarantined(w, b)).sort((x, y) => P[x][g] * carriage(w, x, b) - P[y][g] * carriage(w, y, b) || x - y);
    for (const a of sources) {
      const landed = P[a][g] * carriage(w, a, b) * w.priceMult; if (landed >= P[b][g] * 1.02) break;   // no profit in the road
      const sl = left.sellers[a]; let moved = 0, fees = 0;
      const ptr = left.ptr || (left.ptr = {}); let p0 = ptr[a] || 0;
      for (let bk = 0; bk < buyers.length; bk += 2) {
        let want = buyers[bk + 1]; const i = buyers[bk]; if (want <= 0) continue;
        if (landed > BASE_PRICE[g] * left.wmax[i]) continue;
        while (p0 < sl.length && sl[p0 + 1] <= 0) p0 += 2; ptr[a] = p0; if (p0 >= sl.length) break;   // sold-out sellers are skipped for good
        for (let sk = p0; sk < sl.length && want > 0; sk += 2) {
          const j = sl[sk], q = Math.min(want, sl[sk + 1]); if (q <= 0) continue;
          const pay = Math.max(1, Math.round(landed * q)), toSeller = Math.min(pay, Math.round(P[a][g] * q)); if (pay > A.obols[i]) break;
          A.obols[i] -= pay; A.obols[j] += toSeller; fees += pay - toSeller; A.inv[i * 5 + g] += q; A.inv[j * 5 + g] -= q; sl[sk + 1] -= q; want -= q; moved += q;
        }
        buyers[bk + 1] = want;
      }
      if (!moved) continue;
      // the carriage goes to the haulers of the selling city (or the Boule when there are none)
      const hs = haulers[a]; if (hs && hs.length) { const each = Math.floor(fees * 0.75 / Math.min(5, hs.length)); for (let k = 0; k < Math.min(5, hs.length); k++) A.obols[hs[r.int(hs.length)]] += each; w.treasury += fees - each * Math.min(5, hs.length); } else w.treasury += fees;
      // a ship lost in the spring or autumn swell
      if (sea(a, b) && (SEA_RISKY(mo) || w.storm === day) && r.chance(w.storm === day ? 0.12 : 0.05)) { let gone = Math.ceil(moved * 0.5); const g0 = gone; for (let bk = 0; bk < buyers.length && gone > 0; bk += 2) { const i = buyers[bk], t = Math.min(gone, A.inv[i * 5 + g]); A.inv[i * 5 + g] -= t; gone -= t; }
        if (g0 >= 100 && !ctx._wreck && !(w.wreckDay > day - 10)) { ctx._wreck = 1; w.wreckDay = day; ctx.log(ctx.E.wreck, -1, -1, b, g0, `${short(a)}|${short(b)}|${GOODS[g]}`); } }
      // pirates skim the sea lanes: busiest in high summer, kept off by a liturgist's convoy
      let lost = 0; const convoy = (w.convoy && (w.convoy[a] > day || w.convoy[b] > day)) ? 0.4 : 1, summer = mo >= 4 && mo <= 8 ? 1.5 : 1;
      if (sea(a, b) && (w.pirates || 0) > 0 && r.chance(Math.min(0.1, (w.pirates || 0) / 15000 * convoy * summer * (w.talos && w.talos.alive ? 0.5 : 1)))) { const pir = ctx.live.filter((i) => A.job[i] === J.pirate && !A.status[i]); if (pir.length) { lost = Math.ceil(moved * 0.2); const p = pir[r.int(pir.length)];
        for (let bk = 0; bk < buyers.length && lost > 0; bk += 2) { const i = buyers[bk], t = Math.min(lost, A.inv[i * 5 + g]); A.inv[i * 5 + g] -= t; A.inv[p * 5 + g] += t; lost -= t; }
        lost = Math.ceil(moved * 0.2); w.tradeLog.raided++; (w.raidsAt || (w.raidsAt = {}))[a] = day; w.raidsAt[b] = day; if (lost >= 60 && !ctx._raidLogged) { ctx._raidLogged = 1; ctx.log(ctx.E.raid, p, -1, b, g, `${short(a)}|${short(b)}|${GOODS[g]}|${lost}`); } } }
      flows.push([a, b, moved]); w.tradeLog.volume += moved;
    }
  }
  // the visible caravans: the larger flows set out on the roads and sea lanes for the map
  for (const [a, b, q] of flows) {
    if (q < 15) continue;
    const days = Math.max(1, Math.ceil(dist(a, b) / 140));
    w.caravans.push({ from: a, to: b, g, q, left: day, arrive: day + days, sea: sea(a, b) }); w.tradeLog.sent++;
    w.reliefLog = w.reliefLog || {};
    if (g === 0 && P[b][0] > BASE_PRICE[0] * 2.5 && q >= 40 && !(w.reliefLog[b] > day - 15)) (w.reliefLog[b] = day, ctx.log(ctx.E.caravan, -1, -1, b, q, `${short(a)}|${short(b)}|${GOODS[g]}`));
  }
}
/** daily: caravans that have reached their city leave the map */
export function caravans(ctx) { const { w, day } = ctx; w.caravans = w.caravans.filter((c) => c.arrive > day).slice(-80); }
