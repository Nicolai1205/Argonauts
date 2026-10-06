// Beasts and Heroes: monsters with lairs and appetites, hunts, the Pagasaean and funeral games, god-seized makers who
// forge named relics, and the renown of great houses.
// Sources (docs/research/SIMULATIONS.md #6, #12, #13, #15; MYTH.md §3.6, 3.16): Dwarf Fortress megabeasts and strange moods;
// Raph Koster on Ultima Online's dragon that widened its hunt as prey ran out; CK3 dynasty renown and legacies; Il. 23 (the
// funeral games of Patroclus, Antilochus' trick in the chariot race); Ap. 1.1057-1062 (games at Cyzicus' tomb); the sacred
// truce (ekecheiria); Ov. Met. 8 and Apollod. 1.8 (the Calydonian Boar); Paus. 9.19 (the Teumessian Fox).
import { DISTRICTS, D, ST, TH, J, GOODS } from "./lore.js";
import { CITIES } from "./war.js";
import { nameOf } from "./narrate.js";

const YEAR = 12, adult = (A, i, day) => !A.kind[i] || day - A.born[i] >= 14 * YEAR;
const alive = (A, i) => i >= 0 && A.status[i] === ST.living;
const P = (A, i, k) => A.pers[i * 6 + k];
const dist = (a, b) => { const dx = DISTRICTS[a].x - DISTRICTS[b].x, dy = DISTRICTS[a].y - DISTRICTS[b].y; return Math.round(Math.sqrt(dx * dx + dy * dy)); };
const QUARTERS = DISTRICTS.map((d, k) => k).filter((k) => DISTRICTS[k].kind === "quarter" || DISTRICTS[k].kind === "forge" || DISTRICTS[k].kind === "agora");

// the beasts of the archipelago; each returns, under a new name, a long while after it is slain
const BEASTS = [
  { key: "boar", names: ["the Calydonian Boar", "the Boar of Bear Mountain", "the Bristled One"], lair: "bear", tough: 160, prize: "the tusks of", sea: false },
  { key: "fox", names: ["the Teumessian Fox", "the Fox That Cannot Be Caught", "the Red Hunger of Iolcus"], lair: "iolcus", tough: 220, prize: "the brush of", sea: false },
  { key: "birds", names: ["the Stymphalian Flock", "the Bronze-feathered Birds of Ares", "the Featherbolt Swarm"], lair: "forges", tough: 140, prize: "a bronze feather of", sea: false },
  { key: "scylla", names: ["Scylla of the Strait", "the Six-headed Bitch of the Reef", "Krataiis' Daughter"], lair: "reef", tough: 260, prize: "a tooth of", sea: true },
  { key: "serpent", names: ["the Serpent of the Grove of Ares", "the Sleepless Drakon", "Ladon's Kin"], lair: "grove", tough: 240, prize: "a scale of", sea: false },
];
export const HOUSE_LEGACIES = ["Blood of the Sown", "the Pyre-keepers", "the Feasting House", "the Spear-famed"];

export function initHeroes(w) {
  w.beasts = BEASTS.map((b, k) => ({ k, gen: 0, name: b.names[0], lair: D[b.lair], hunger: 30, radius: 140, kills: 0, wounds: 0, alive: true, back: 0, slainBy: -1 }));
  w.game = DISTRICTS.map((d) => (d.kind === "quarter" || d.kind === "grove" || d.kind === "forge" ? 800 : 0));
  w.hunts = []; w.houses = {}; w.moods = []; w.games = { last: -999, champions: [] }; w.truceUntil = -999;
}

/** renown of a house (the lineage an Argonaut founded) */
export function renown(w, A, i, n) {
  if (i < 0) return; const L = A.lineage[i], h = w.houses[L] || (w.houses[L] = { r: 0, legacies: [] }); h.r = Math.max(-500, Math.round(h.r + n));
}
export const legacy = (w, A, i, name) => { const h = w.houses[A.lineage[i]]; return !!(h && h.legacies.includes(name)); };

export function heroesDaily(ctx) {
  const { A, w, day } = ctx, r = ctx.r("heroes"), E = ctx.E, dy = ((day % 360) + 360) % 360;
  const pop = DISTRICTS.map((x, d) => (ctx.byDist[d] || []).filter((i) => !A.status[i]).length);

  // ---- prey regrows; the beasts eat, hunger, range wider, and come down on the towns
  for (let d = 0; d < w.game.length; d++) if (w.game[d] || DISTRICTS[d].kind === "quarter") w.game[d] = Math.max(0, Math.min(1000, Math.round(w.game[d] + 30 * (1 - w.game[d] / 1000) - pop[d] / 200)));
  for (const b of w.beasts) {
    const B = BEASTS[b.k];
    if (!b.alive) { if (day >= b.back) { b.alive = true; b.gen++; b.name = B.names[b.gen % B.names.length]; b.hunger = 40; b.radius = 140; b.wounds = 0; b.kills = 0; ctx.log(E.beast, -1, -1, b.lair, b.gen, "wakes|" + b.name); } continue; }
    let ate = 0; for (let d = 0; d < w.game.length; d++) if (w.game[d] > 100 && dist(b.lair, d) <= b.radius) { const t = Math.min(25, w.game[d] - 100); w.game[d] -= t; ate += t; }
    if (ate < 60) { b.hunger = Math.min(100, b.hunger + 2); b.radius = Math.min(650, b.radius + 15); } else { b.hunger = Math.max(0, b.hunger - 3); b.radius = Math.max(140, b.radius - 5); }
    if (b.hunger < 50 || !r.chance(0.2)) continue;
    const targets = QUARTERS.filter((d) => pop[d] > 40 && dist(b.lair, d) <= b.radius && (!B.sea || ["reef", "drepane", "agora", "lemnos", "anthemoessa"].includes(DISTRICTS[d].key)));
    if (!targets.length) continue;
    const d = targets[r.int(targets.length)], pool = (ctx.byDist[d] || []).filter((i) => !A.status[i] && (!B.sea || [J.fisher, J.rower, J.pirate, J.merchant].includes(A.job[i])));
    let dead = 0, broken = 0;
    for (let t = 0; t < 2 + r.int(4) && pool.length; t++) { const v = pool[r.int(pool.length)]; if (A.status[v]) continue; ctx.kill(v, `taken by ${b.name}`); if (A.kind[v]) dead++; else broken++; }
    for (const i of pool) if (r.chance(0.3)) { A.inv[i * 5] = A.inv[i * 5] >> 1; ctx.think(i, TH.terror_at_an_omen); }
    b.hunger = Math.max(0, b.hunger - 45); b.kills += dead + broken;
    ctx.log(E.beast, -1, -1, d, dead * 100 + broken, "attack|" + b.name);
    if (!w.hunts.some((h) => h.beast === b.k)) w.hunts.push({ beast: b.k, city: d, day: day + 2 + r.int(4) });
  }

  // ---- the hunt: the city casts its boldest; strength against the beast's toughness (less each wound it carries)
  for (const h of w.hunts.slice()) {
    if (day < h.day) continue; w.hunts.splice(w.hunts.indexOf(h), 1);
    const b = w.beasts[h.beast]; if (!b.alive) continue;
    const bold = (i) => P(A, i, 2) + (100 - P(A, i, 1)) + P(A, i, 4) / 2 + (A.office[i] >= 0 ? 40 : 0) + (A.scar[i] === 4 ? 25 : 0) + (legacy(w, A, i, "the Spear-famed") ? 30 : 0);
    const cands = (ctx.byDist[h.city] || []).filter((i) => alive(A, i) && adult(A, i, day) && !A.jail[i]).sort((x, y) => bold(y) - bold(x) || x - y).slice(0, 40);
    const band = []; for (let t = 0; t < 6 && cands.length; t++) band.push(cands.splice(r.int(Math.min(cands.length, 12)), 1)[0]);
    if (band.length < 2) continue;
    const strength = band.reduce((s, i) => s + bold(i), 0) / 3, tough = BEASTS[b.k].tough * (1 - Math.min(0.6, b.wounds * 0.15));
    let fell = 0; for (const i of band) if (r.chance(0.18)) { ctx.kill(i, `killed hunting ${b.name}`); fell++; }
    const lead = band.filter((i) => A.status[i] === ST.living).sort((x, y) => bold(y) - bold(x) || x - y)[0] ?? band[0];
    if (r.next() < strength / (strength + tough)) {
      b.alive = false; b.slainBy = lead; b.back = day + 150 + r.int(150);
      ctx.cognomen(lead, 23); renown(w, A, lead, 120); for (const i of band) if (i !== lead) renown(w, A, i, 25);
      for (const i of band) if (A.status[i] === ST.living) ctx.memorize(i, 5, lead, 60);
      ctx.forgeRelic(`${BEASTS[b.k].prize} ${b.name.replace(/^the /, "the ")}`, "trophy", lead, `slew ${b.name}`);
      ctx.log(E.hunt, lead, -1, h.city, fell, "slain|" + b.name + "|" + band.length);
    } else { b.wounds++; b.hunger = Math.max(0, b.hunger - 20); ctx.log(E.hunt, lead, -1, h.city, fell, "failed|" + b.name + "|" + band.length); }
  }

  // ---- funeral games for the great dead of renowned houses (Il. 23)
  if (day - (w.games.funeral || -999) >= 20) for (const e of ctx.ev) {
    if (e.t !== "death" || e.h || e.a < 9999) continue; const h = w.houses[A.lineage[e.a]];
    if (h && h.r >= 300) { w.games.funeral = day; runGames(ctx, r, `the funeral games of ${nameOf(e.a + 1)}`, A.district[e.a] < D.pyra ? A.district[e.a] : D.agora, e.a); break; }
  }
  // ---- games: the Pagasaean Games every 48 days (four Leaf-years), with a sacred truce
  if (((day % 48) + 48) % 48 === 24) runGames(ctx, r, "the Pagasaean Games", D.agora, -1);

  // ---- strange moods: a maker seized by a god demands what the city lacks, and makes a thing with a name, or goes mad
  if (w.moods.length < 3 && r.chance(0.05)) {
    const makers = ctx.live.filter((i) => !A.status[i] && adult(A, i, day) && [J.weaver, J.miner, J.herbalist, J.grower, J.augur, J.priest].includes(A.job[i]) && !w.moods.some((m) => m.i === i));
    if (makers.length) {
      const i = makers[r.int(makers.length)], c = CITIES.includes(A.district[i]) ? A.district[i] : D.agora;
      let g = 0, hi = 0; for (let k = 0; k < 5; k++) { const v = w.cprices[c][k]; if (v > hi) { hi = v; g = k; } }
      const kind = A.stress[i] > 300 ? 3 : A.devotion[i] > 60 ? 2 : P(A, i, 5) > 60 ? 0 : 1;
      w.moods.push({ i, kind, g, need: 4 + r.int(6), have: 0, day });
      ctx.log(E.mood, i, -1, A.district[i], kind, MOODS[kind] + "|" + GOODS[g]);
    }
  }
  for (const m of w.moods.slice()) {
    const i = m.i; if (!alive(A, i)) { w.moods.splice(w.moods.indexOf(m), 1); continue; }
    // gather: from their own stores, then by buying from anyone in the quarter who has it
    const take = Math.min(m.need - m.have, A.inv[i * 5 + m.g]); A.inv[i * 5 + m.g] -= take; m.have += take;
    if (m.have < m.need) { const pool = ctx.byDist[A.district[i]] || []; for (let t = 0; t < 20 && m.have < m.need; t++) { const j = pool[r.int(pool.length)]; if (j === i || A.status[j] || A.inv[j * 5 + m.g] < 2) continue; const price = Math.ceil(w.cprices[CITIES.includes(A.district[i]) ? A.district[i] : D.agora][m.g] * 2); if (A.obols[i] < price) break; A.obols[i] -= price; A.obols[j] += price; A.inv[j * 5 + m.g]--; m.have++; } }
    if (m.kind === 2 && m.have >= m.need && !m.bone) {   // Hecate's hand: the work wants bone, and only the Meadow has it
      const shades = []; for (let x = 0; x < 9999; x++) if (A.status[x] === ST.shade) shades.push(x);
      if (shades.length) { const s = shades[r.int(shades.length)]; A.until[s] += 30; m.bone = s + 1; }
    }
    if (m.have >= m.need || (day - m.day >= 12 && m.have * 2 >= m.need && m.kind !== 3)) {
      w.moods.splice(w.moods.indexOf(m), 1);
      const name = relicName(r, A, i, m); ctx.forgeRelic(name, "artefact", i, MOODS[m.kind].replace(/^the /, "made in the ") );
      renown(w, A, i, 60); ctx.log(E.mood, i, m.bone ? m.bone - 1 : -1, A.district[i], m.kind, "made|" + name);
    } else if (day - m.day >= 12) {
      w.moods.splice(w.moods.indexOf(m), 1);
      if (m.kind === 3) {   // the fell mood: someone dies, and the thing is made of them anyway
        const pool = (ctx.byDist[A.district[i]] || []).filter((j) => j !== i && alive(A, j)); if (pool.length) { const v = pool[r.int(pool.length)]; ctx.kill(v, "made into a relic", i); const name = `the ${["lyre strung with the sinews", "cup made from the skull", "flute cut from the shin", "necklace of the teeth"][r.int(4)]} of ${nameOf(v + 1)}`; ctx.forgeRelic(name, "artefact", i, "made in the Telchine rage"); ctx.log(E.mood, i, v, A.district[i], m.kind, "fell|" + name); continue; }
      }
      A.scar[i] = A.scar[i] || 3; ctx.cognomen(i, 24); A.stress[i] = Math.min(600, A.stress[i] + 200);
      ctx.log(E.mood, i, -1, A.district[i], m.kind, "mad|" + GOODS[m.g]);
    }
  }

  // ---- renown: houses drift, earn legacies at thresholds, lose them to shame
  if (((day % 30) + 30) % 30 === 20) for (const L of Object.keys(w.houses)) {
    const h = w.houses[L]; h.r = Math.round(h.r * 0.98);
    const want = h.r >= 1000 ? 3 : h.r >= 500 ? 2 : h.r >= 200 ? 1 : 0;
    if (want > h.legacies.length && h.legacies.length < HOUSE_LEGACIES.length) {
      const founder = Number(L), choices = HOUSE_LEGACIES.filter((x) => !h.legacies.includes(x)), pickK = (P(A, founder, 3) + P(A, founder, 2) + founder) % choices.length;
      h.legacies.push(choices[pickK]); ctx.log(E.legacy, founder, -1, A.district[founder] < D.pyra ? A.district[founder] : D.agora, Math.round(h.r), choices[pickK]);
    }
    if (h.r < 50 && !h.legacies.length) delete w.houses[L];
  }
}

const MOODS = ["the Daedalian fit", "Hephaestus' fever", "Hecate's hand", "the Telchine rage"];
const MAT = ["bronze", "cloth", "ore", "smoke-leaf", "the healing herb"];
function relicName(r, A, i, m) {
  const form = [["loom-weight", "shuttle", "veil", "sail"], ["anvil", "brooch", "greave", "tripod"], ["bone flute", "mask", "knife", "lamp"], ["helm", "spear", "shield", "chain"]][m.kind][r.int(4)];
  const ep = ["that hums at night", "that never cools", "of the twelve suns", "no hand can lift twice", "that weeps in the rain", "that shows the dead", "that the Sirens fear", "of the Sowing"][r.int(8)];
  return `the ${["bread-and-bronze", "smoke-wound", "woven", "bronze", "herb-bound"][m.g]} ${form} of ${nameOf(i + 1)}, ${ep}`;
}

/** the games: foot-race, wrestling, boxing, chariot, archery at a dove, the iron throw (Il. 23) */
export function runGames(ctx, r, name, where, honoured) {
  const { A, w, day } = ctx, E = ctx.E;
  w.truceUntil = day + 3;
  const entrants = []; const tries = Math.min(ctx.live.length, 3000);
  for (let t = 0; t < tries && entrants.length < 24; t++) { const i = ctx.live[r.int(ctx.live.length)]; if (alive(A, i) && adult(A, i, day) && !entrants.includes(i) && (A.kind[i] ? day - A.born[i] < 40 * YEAR : true) && P(A, i, 2) > 45) entrants.push(i); }
  if (entrants.length < 8) return;
  const EVENTS = [["the foot-race", (i) => P(A, i, 4) + (A.kind[i] ? 25 : 0)], ["the wrestling", (i) => (100 - P(A, i, 3)) + P(A, i, 4)], ["the boxing", (i) => (100 - P(A, i, 1)) + (100 - P(A, i, 3))],
    ["the chariot race", (i) => P(A, i, 5) + Math.sqrt(Math.max(0, A.obols[i]))], ["the archery at the dove", (i) => P(A, i, 4) + P(A, i, 5) / 2], ["the iron throw", (i) => (100 - P(A, i, 1)) + P(A, i, 2) / 2]];
  const results = [];
  for (const [ev, sc] of EVENTS) {
    const field = []; for (let t = 0; t < 6; t++) field.push(entrants[r.int(entrants.length)]);
    const ranked = [...new Set(field)].map((i) => [i, sc(i) + r.int(60) + (legacy(w, A, i, "the Spear-famed") ? 15 : 0)]).sort((x, y) => y[1] - x[1] || x[0] - y[0]);
    if (ranked.length < 2) continue;
    const [win, second] = [ranked[0][0], ranked[1][0]];
    renown(w, A, win, 30); ctx.think(win, TH.honoured_by_the_city); if (w.treasury >= 30) { w.treasury -= 30; A.obols[win] += 30; }
    results.push([ev, win, second]);
    if (ev === "the boxing" && r.chance(0.08)) ctx.kill(second, "died in the boxing at the games");   // the games' dead are not murdered: no stain (Draco)
    if (ev === "the chariot race" && r.chance(0.25)) { ctx.tie(second, win, -35); ctx.log(E.games, win, second, where, 0, "dispute|" + name); }
  }
  w.games.last = day; const top = results.find((x) => x[0] === "the foot-race") || results[0];
  w.games.champions.unshift([day, top[1], name]); w.games.champions = w.games.champions.slice(0, 20);
  ctx.log(E.games, top[1], honoured, where, results.length, "held|" + name + "|" + results.map(([ev, i]) => `${ev}:${i}`).join(","));
}
