// Oracles and the bones of heroes: the beam as Dodona, Delphic prophecy resolved after the fact, Phineus' curse on augurs
// who see too well, and the theft of a broken Minyas' bones (Orestes) to win a war.
// Sources (docs/research/MYTH.md §3.10, 5.4, 1.9E): Hdt. 1.53-55 and 7.140-143 (Croesus; the mule; wooden walls);
// the Dodona lead tablets ("X asks Zeus Naios and Dione whether ..."); Ap. 1.524-527 (the Argo's speaking beam is Dodona oak);
// Ap. 2.178-300 (Phineus, blinded for prophesying too truly, and the Harpies driven off by the Boreads); Hdt. 1.67-68
// (Sparta steals Orestes' bones from Tegea and wins the war).
import { DISTRICTS, D, ST, TH, J, BLOODS } from "./lore.js";
import { nameOf } from "./narrate.js";
import { CITIES } from "./war.js";
import { hash32 } from "./rng.js";

const YEAR = 12, adult = (A, i, day) => !A.kind[i] || day - A.born[i] >= 14 * YEAR;
const alive = (A, i) => i >= 0 && A.status[i] === ST.living;
const cityOf = (d) => (CITIES.includes(d) ? d : D.agora);
const pick = (h, arr) => arr[h % arr.length];
const close = (A, i, j) => { for (let t = 0; t < 8; t++) if (A.tieTo[i * 8 + t] === j && A.tieVal[i * 8 + t] >= 30) return true; return false; };

export function initOracle(w) { w.prophecies = []; w.seers = {}; w.phineus = -1; w.heldBones = []; w.pseq = 0; }

// the ambiguity grammar: each kind binds to whatever happens first that fits it (Croesus' great empire)
const RIDDLE = {
  city: ["If {city} marches, a great city will fall.", "Wooden walls alone will stand, when the spears of {city} are counted.", "Two cities, one field: the one that boasts will weep."],
  death: ["You will not see the vintage, child of {blood}, unless you see it from Asphodel.", "Beware the hand that fed you; beware the bread that was salt.", "When the boneless one climbs the mast, look to your own house."],
  house: ["The house of {name} will be cut down to the root, and a green shoot will rise from the stump.", "A hearth goes cold in {where}; the ash will name its own.", "What the father swore, the daughter pays."],
  gold: ["Gold will come to {where} out of the sea, and it will not be lucky.", "A stranger's purse will open in {where}.", "When the fleece is shorn, the poor man eats."],
  fire: ["Fire will take what you love most, and you will thank it.", "The Pyra is hungry; it will eat from your table.", "What the Maker sowed, the Maker reaps with fire."],
  hunger: ["Lean jars in {where} before the swallow comes.", "{where} will eat its seed-corn and curse the sea.", "The mouth of the Hungry One opens over {where}."],
};
// which events fulfil which kind, and how the priests explain it afterwards
const FITS = {
  city: (e, p) => (e.t === "battle" || e.t === "peace") && (e.x === p.city || (e.s || "").includes(DISTRICTS[p.city].name.replace(/^the /, "").replace(/ & the Agora/, ""))),
  death: (e, p, A) => (e.t === "death" && e.a >= 0 && (e.a === p.who || A.lover[p.who] === e.a || close(A, p.who, e.a))) || (e.t === "lethe" && e.a === p.who),
  house: (e, p, A) => (e.t === "death" && e.a >= 0 && e.a !== p.who && (A.oikos[e.a] === A.oikos[p.who] || (A.lineage[e.a] === A.lineage[p.who] && A.kind[e.a]))) || (e.t === "curse" && e.b === p.who),
  gold: (e, p) => (e.t === "caravan" || e.t === "gold" || e.t === "theoxenia" || e.t === "liturgy") && e.x === p.city,
  fire: (e, p, A, w) => e.t === "burn",
  hunger: (e, p) => (e.t === "famine" || e.t === "crash" || e.t === "harpies" || (e.t === "pharmakos" && e.s === "famine")) && (e.x === p.city || e.x < 0),
};

export function oracleDaily(ctx) {
  const { A, w, day } = ctx, r = ctx.r("oracle"), E = ctx.E, dy = ((day % 360) + 360) % 360;

  // Dodona: on a day the beam speaks, the city brings questions scratched on lead
  if (ctx.ev.some((e) => e.t === "beam")) {
    const phrase = (ctx.ev.find((e) => e.t === "beam") || {}).s || "";
    const askers = [];
    for (let t = 0; t < 400 && askers.length < 3; t++) {
      const i = ctx.live[r.int(ctx.live.length)]; if (A.status[i] || !adult(A, i, day) || askers.includes(i)) continue;
      const q = A.avenge[i] ? ["whether it is better to take vengeance on", A.avenge[i] - 1] : A.lover[i] < 0 && A.mood[i] < 0 ? ["whether anyone will ever love them", -1] : w.curses[A.lineage[i]] ? ["whether the curse on their house will ever lift", -1] : A.hunger[i] ? ["whether to leave for another city", -1] : null;
      if (q) askers.push(i), ctx.log(E.dodona, i, q[1], A.district[i], hash32(phrase, i) % 3, q[0]);
    }
  }

  // Delphi, on the seventh of each month: the great and the frightened ask the god
  if ((dy % 30 === 6 || dy % 30 === 21) && w.prophecies.length < 40) {
    const cands = [];
    for (const k of Object.keys(w.offices || {})) { const i = w.offices[k]; if (alive(A, i)) cands.push(i); }
    for (const war of (w.war && w.war.wars) || []) for (const c of [war.a, war.b]) { const p = ctx.byDist[c] || []; for (let t = 0; t < 5 && p.length; t++) { const i = p[r.int(p.length)]; if (alive(A, i) && adult(A, i, day)) { cands.push(i); break; } } }
    for (let t = 0; t < 3; t++) { const i = ctx.live[r.int(ctx.live.length)]; if (alive(A, i) && adult(A, i, day) && A.obols[i] > 200) cands.push(i); }
    const who = cands.length ? cands[r.int(cands.length)] : -1;
    if (who >= 0) {
      const city = cityOf(A.district[who]), atWar = ((w.war && w.war.wars) || []).some((x) => x.a === city || x.b === city);
      const kinds = atWar ? ["city", "city", "death", "fire"] : w.curses[A.lineage[who]] ? ["house", "death", "fire"] : ["death", "house", "gold", "fire", "hunger", "city"];
      const kind = kinds[r.int(kinds.length)];
      const seers = ctx.live.filter((i) => !A.status[i] && A.job[i] === J.augur && adult(A, i, day) && cityOf(A.district[i]) === city);
      const seer = seers.length ? seers[r.int(seers.length)] : -1;
      const tpl = pick(r.int(1000), RIDDLE[kind]);
      const text = tpl.replace("{city}", DISTRICTS[city].name).replace("{where}", DISTRICTS[city].name).replace("{blood}", w.factions[A.faction[who]].name).replace("{name}", nameOf(A.lineage[who] + 1));
      ctx.trip(who, A.district[who], D.mist, "pilgrim"); const id = ++w.pseq; w.prophecies.push({ id, day, who, kind, city, seer, text, until: day + 180 });
      ctx.log(E.oracle, who, seer, city, id, "given|" + text);
    }
  }

  // prophecies close when the world matches them (the first fitting event claims it) or lapse
  if (w.prophecies.length) {
    const keep = [];
    for (const p of w.prophecies) {
      const hit = ctx.ev.find((e) => !e.h && e.d === day && FITS[p.kind](e, p, A, w));
      if (hit && day > p.day) {
        ctx.log(E.oracle, p.who, hit.a >= 0 ? hit.a : -1, hit.x >= 0 ? hit.x : p.city, day - p.day, "fulfilled|" + p.text + "|" + hit.t);
        if (p.seer >= 0) { const n = (w.seers[p.seer] = (w.seers[p.seer] || 0) + 1); if (n >= 3 && w.phineus < 0 && alive(A, p.seer)) { w.phineus = p.seer; ctx.log(E.phineus, p.seer, -1, A.district[p.seer], n, "blinded"); } }
        continue;
      }
      if (day >= p.until) {
        const m = (w.memory || []).filter((x) => x.day > p.day && x.day <= day).sort((a, b) => b.s0 - a.s0 || a.day - b.day)[0];
        if (m && r.chance(0.5)) { ctx.log(E.oracle, p.who, m.who >= 0 ? m.who : -1, p.city, day - p.day, "reread|" + p.text + "|" + m.name); if (p.seer >= 0) w.seers[p.seer] = (w.seers[p.seer] || 0) + 1; continue; }
        if (r.chance(0.3)) ctx.log(E.oracle, p.who, p.seer, p.city, day - p.day, "lapsed|" + p.text); if (p.seer >= 0 && w.seers[p.seer]) w.seers[p.seer]--; continue; }
      keep.push(p);
    }
    w.prophecies = keep;
  }

  // Phineus: Zeus blinds the seer who tells too much; the Harpies foul his table until the Boreads drive them off
  if (w.phineus >= 0) {
    const ph = w.phineus;
    if (A.status[ph] === 2 || A.status[ph] === 3) w.phineus = -1;
    else if (A.status[ph] === ST.living) {
      A.inv[ph * 5] = A.inv[ph * 5] >> 1; if (r.chance(0.3)) ctx.think(ph, TH.starving);
      const b = w.offices && w.offices.boread; if (alive(A, b) && r.chance(0.015)) { w.phineus = -1; w.seers[ph] = 0; ctx.tie(ph, b, 40); ctx.log(E.phineus, ph, b, A.district[ph], 0, "freed"); }
    }
  }

  // the bones of heroes: a city at war takes the bones of a broken enemy champion out of Asphodel, so it cannot re-knit (Orestes)
  for (const war of (w.war && w.war.wars) || []) {
    if (!r.chance(0.01) || w.heldBones.length >= 6) continue;
    const thief = r.chance(0.5) ? war.a : war.b, foe = thief === war.a ? war.b : war.a;
    const pool = []; for (let i = 0; i < 9999; i++) if (A.status[i] === ST.shade && BLOODS[A.bones[i]].home === foe && (A.cognomen[i] || A.office[i] >= 0 || A.deaths[i] >= 2) && !w.heldBones.some((h) => h.i === i)) pool.push(i);
    if (!pool.length) continue;
    const i = pool[r.int(pool.length)];
    w.heldBones.push({ i, city: thief, foe, day, ransom: 200 + A.deaths[i] * 50 }); A.until[i] = day + 100000;
    ctx.log(E.bones, i, -1, thief, 200 + A.deaths[i] * 50, "taken");
    if (w.war.S) w.war.S[thief] = Math.min(0.98, w.war.S[thief] + 0.03);
  }
  if (w.heldBones.length) {
    const keep = [];
    for (const h of w.heldBones) {
      const i = h.i; if (A.status[i] !== ST.shade) continue;
      // kin ransom the bones; after a season they are buried as a hero in the thief city, and re-knit there
      let payer = -1; for (let t = 0; t < 8; t++) { const j = A.tieTo[i * 8 + t]; if (alive(A, j) && A.tieVal[i * 8 + t] > 30 && A.obols[j] >= h.ransom) { payer = j; break; } }
      const thieves = ctx.byDist[h.city] || [];
      if (payer >= 0 && thieves.length && r.chance(0.05)) { const t0 = thieves[r.int(thieves.length)]; A.obols[payer] -= h.ransom; A.obols[t0] += h.ransom; A.until[i] = day + 1; ctx.log(E.bones, i, payer, h.city, h.ransom, "ransomed"); continue; }
      if (day - h.day > 90) { A.until[i] = day + 1; ctx.log(E.bones, i, -1, h.city, 0, "hero"); continue; }
      keep.push(h);
    }
    w.heldBones = keep;
  }
}
