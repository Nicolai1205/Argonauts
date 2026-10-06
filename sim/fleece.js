// The Golden Fleece quest, and relics that remember every hand they passed through.
import { DISTRICTS, D, ST } from "./lore.js";
import { CITIES } from "./war.js";

const dist = (a, b) => Math.hypot(DISTRICTS[a].x - DISTRICTS[b].x, DISTRICTS[a].y - DISTRICTS[b].y);
const short = (k) => DISTRICTS[k].name.replace(/^the /, "").replace(/ & the Agora/, "");
export const cityOf = (d) => (CITIES.includes(d) ? d : D.agora);

export function initQuest(w) {
  const b = w.fleece, A = w.A;
  w.quest = { city: b >= 0 ? cityOf(A.district[b]) : D.agora, faction: b >= 0 ? A.faction[b] : 0, since: w.day, expeditions: [], history: [] };
  w.relics = [];
}

// ------------------------------------------------------------------ relics
export function forgeRelic(ctx, name, kind, holder, how) {
  const { w, day } = ctx; if (holder < 0) return null;
  const r = { id: w.relics.length, name, kind, born: day, holder, history: [[day, holder, how]] };
  w.relics.push(r); ctx.log(ctx.E.relic, holder, -1, ctx.A.district[holder], r.id, name); return r;
}
export function passRelic(ctx, r, to, how) {
  if (!r || to < 0 || r.holder === to) return; r.holder = to; r.history.push([ctx.day, to, how]); if (r.history.length > 40) r.history.splice(1, 1);
  if (how !== "inherited") ctx.log(ctx.E.relicpass, to, -1, ctx.A.district[to], r.id, `${r.name}|${how}`); else ctx.trace(ctx.E.relicpass, to, -1, ctx.A.district[to]);
}
export const relicsOf = (w, i) => (w.relics || []).filter((r) => r.holder === i);
/** a dying Leaf's relics go to the eldest living child, else the beloved, else the strongest bond */
export function inheritRelics(ctx, i) {
  const { A, w } = ctx, mine = relicsOf(w, i); if (!mine.length) return;
  let heir = -1, born = 1e9; for (let c = 9999; c < w.N; c++) if ((A.p1[c] === i || A.p2[c] === i) && A.status[c] === ST.living && A.born[c] < born) { born = A.born[c]; heir = c; }
  if (heir < 0 && A.lover[i] >= 0 && A.status[A.lover[i]] === ST.living) heir = A.lover[i];
  if (heir < 0) { let bv = 0; for (let k = 0; k < 8; k++) { const j = A.tieTo[i * 8 + k]; if (j >= 0 && A.tieVal[i * 8 + k] > bv && A.status[j] === ST.living) { bv = A.tieVal[i * 8 + k]; heir = j; } } }
  for (const r of mine) passRelic(ctx, r, heir >= 0 ? heir : r.holder, heir >= 0 ? "inherited" : "buried with them");
}
/** relics held in a beaten city are carried off by the victors' champion */
export function captureRelics(ctx, loserCity, champion) {
  const { A, w } = ctx; if (champion < 0) return;
  for (const r of w.relics) if (A.district[r.holder] === loserCity && r.kind !== "cradle" && ctx.rr.chance(0.5)) passRelic(ctx, r, champion, `taken as spoil from ${short(loserCity)}`);
}
export function champion(ctx, city) {
  const { A } = ctx; let best = -1, bv = -1e9;
  for (const i of ctx.byDist[city] || []) { if (A.status[i] || (A.kind[i] && ctx.day - A.born[i] < 16 * 12)) continue; const v = (100 - A.pers[i * 6 + 1]) + A.pers[i * 6 + 2] / 2 + (A.office[i] >= 0 ? 30 : 0) + (A.job[i] === 7 ? 20 : 0) + (i % 13); if (v > bv) { bv = v; best = i; } }
  return best;
}

// ------------------------------------------------------------------ the quest for the Fleece
export function quest(ctx) {
  const { A, w, day } = ctx, Q = w.quest, b = w.fleece, r = ctx.r("quest"); if (b < 0 || !w.war) return;
  // the bearer stays with whoever holds the Fleece (unless broken or burned)
  if (A.status[b] === ST.living) { A.district[b] = Q.city; A.faction[b] = Q.faction; }
  // expeditions on the road arrive and try their luck
  for (const x of Q.expeditions.slice()) {
    if (day < x.arrive) continue;
    Q.expeditions.splice(Q.expeditions.indexOf(x), 1);
    const party = x.party.filter((i) => A.status[i] === ST.living);
    if (!party.length) continue;
    if (A.status[b] !== ST.living || Q.city !== x.target) { ctx.log(ctx.E.expedition, x.champion, -1, x.from, 0, `${short(x.from)}|returned empty-handed: the Fleece was gone`); continue; }
    const att = party.reduce((s, i) => s + (100 - A.pers[i * 6 + 1]) / 50 + (A.kind[i] ? 0 : 0.5), 0) * (1 + w.war.S[x.from]);
    const def = (w.war.power[Q.city] * 0.04 + 3) * (DEF[DISTRICTS[Q.city].key] || 1) * (1 + w.war.S[Q.city]);
    if (r.next() < att / (att + def)) {
      const from = Q.city; Q.history.unshift({ day, from, to: x.from, by: x.champion, how: "carried off" }); Q.history = Q.history.slice(0, 40);
      Q.city = x.from; Q.faction = A.faction[x.champion]; Q.since = day; A.cognomen[x.champion] = 7;
      ctx.log(ctx.E.fleecetaken, x.champion, b, x.from, from, `${short(x.from)}|${short(from)}`);
      ctx.remember(w, day, "fleece", x.champion, 85, `the taking of the Fleece by ${short(x.from)}`, A.faith[x.champion]);
      forgeRelic(ctx, `the shears that cut the Fleece from ${short(from)}`, "trophy", x.champion, "forged in the taking");
      const k = Math.min(from, x.from) + ":" + Math.max(from, x.from); w.war.grudge[k] = (w.war.grudge[k] || 0) + 60;
    } else {
      let fell = 0; for (const i of party) if (r.chance(0.35)) { ctx.kill(i, `cut down trying to take the Fleece`); fell++; }
      ctx.log(ctx.E.expedition, x.champion, -1, Q.city, fell, `${short(x.from)}|was thrown back from ${short(Q.city)}; ${fell} fell`);
      const k = Math.min(Q.city, x.from) + ":" + Math.max(Q.city, x.from); w.war.grudge[k] = (w.war.grudge[k] || 0) + 25;
    }
  }
  if (day % 7) return;
  // holding the Fleece: cohesion and pride at home, envy abroad
  w.war.S[Q.city] = Math.min(0.98, w.war.S[Q.city] + 0.02);
  for (const i of ctx.byDist[Q.city] || []) if (!A.status[i] && r.chance(0.3)) ctx.think(i, ctx.TH.feasted);
  // a cohesive, envious city sends a champion and a war-band down the road
  if (A.status[b] !== ST.living || Q.expeditions.length >= 2) return;
  for (const c of CITIES) {
    if (c === Q.city || w.war.lord[c] !== c || w.war.S[c] < 0.3 || w.war.rel[c][Q.city] > 10 || w.war.power[c] < 0.6 * w.war.power[Q.city] || !r.chance(0.15)) continue;
    const ch = champion(ctx, c); if (ch < 0) continue;
    const band = (ctx.byDist[c] || []).filter((i) => i !== ch && !A.status[i] && (!A.kind[i] || day - A.born[i] >= 16 * 12) && A.pers[i * 6 + 1] < 45).slice(0, 40);
    const party = [ch]; for (let t = 0; t < 8 && band.length; t++) party.push(band.splice(r.int(band.length), 1)[0]);
    const days = Math.max(2, Math.ceil(dist(c, Q.city) / 110));
    Q.expeditions.push({ from: c, target: Q.city, champion: ch, party, left: day, arrive: day + days });
    ctx.log(ctx.E.expedition, ch, -1, c, party.length, `${short(c)}|sets out for ${short(Q.city)} to take the Fleece`);
    break;
  }
}
const DEF = { bear: 1.5, mist: 1.6, forges: 1.3, drepane: 1.45, lemnos: 1.3, anthemoessa: 1.3, eridanus: 1.25, reef: 1.1, strand: 1.05, iolcus: 1.1, ares: 1.0, agora: 1.15 };
