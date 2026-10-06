// Rumours (Daley-Kendall spreading with mutation, after Talk of the Town) and myths: what people believe, not what happened.
import { DISTRICTS } from "./lore.js";
import { hash32 } from "./rng.js";

export const SLOTS = 6;   // rumours alive at once; per-agent state: 0 ignorant, 1 spreader, 2 stifler
// what a rumour can turn into as it passes from mouth to mouth
const DARK = new Set(["burn", "lemnian", "riot", "plague", "battle"]);
const TWISTS = [
  { k: "grow", fits: (r) => /\d/.test(r.text), say: (r) => `${r.text.replace(/(\d+)/, (m) => String(Math.round(Number(m) * 1.5) + 1))}` },
  { k: "blame", fits: (r) => r.kind !== "ruling" && r.kind !== "prophet", say: (r, w) => `${r.text} They say ${w.faiths[r.blame] ? w.faiths[r.blame].name : "strangers"} were behind it.` },
  { k: "omen", fits: () => true, say: (r) => `${r.text} The augurs say it was foretold.` },
  { k: "martyr", fits: (r) => DARK.has(r.kind), say: (r) => `${r.text} Some already call the dead a martyr.` },
];
export function initRumors(w) { w.rumors = []; }

/** start a rumour from a fact; the blamed faith is the one the teller's people already distrust */
export function seedRumor(ctx, kind, about, district, text, heat) {
  const { A, w } = ctx; let slot = -1;
  for (let k = 0; k < SLOTS; k++) if (!w.rumors[k] || w.rumors[k].dead) { slot = k; break; }
  if (slot < 0) { let old = 0; for (let k = 1; k < SLOTS; k++) if (w.rumors[k].born < w.rumors[old].born) old = k; slot = old; }
  const teller = ctx.byDist[district] && ctx.byDist[district].length ? ctx.byDist[district][hash32(ctx.day, kind) % ctx.byDist[district].length] : about;
  // the blamed: the faith most different from the teller's (a scapegoat), unless the fact names a culprit
  let blame = -1, far = -1; w.faiths.forEach((F, k) => { if (!F.alive || k === A.faith[teller]) return; let d = 0; for (let x = 0; x < 3; x++) d += Math.abs(F.doctrine[x] - w.faiths[A.faith[teller]].doctrine[x]); if (d > far) { far = d; blame = k; } });
  w.rumors[slot] = { id: hash32(ctx.day, kind, about) % 100000, kind, about, district, text, born: ctx.day, heat, blame, twists: [], reach: 1, dead: false, versions: [text] };
  for (let i = 0; i < w.N; i++) A.rumor[i * SLOTS + slot] = 0;
  if (teller >= 0) A.rumor[teller * SLOTS + slot] = 1;
}

/** called for every conversation: spreaders tell the ignorant; meeting someone who already knows makes a spreader stop */
export function gossip(ctx, i, j) {
  const { A, w } = ctx;
  for (let k = 0; k < SLOTS; k++) {
    const R = w.rumors[k]; if (!R || R.dead) continue;
    const si = A.rumor[i * SLOTS + k], sj = A.rumor[j * SLOTS + k];
    if (si === 1 && sj === 0) { A.rumor[j * SLOTS + k] = 1; R.reach++; believe(ctx, j, R, k); }
    else if (si === 1 && sj !== 0) { if (ctx.rr.chance(0.5)) A.rumor[i * SLOTS + k] = 2; }
    else if (sj === 1 && si === 0) { A.rumor[i * SLOTS + k] = 1; R.reach++; believe(ctx, i, R, k); }
  }
}
function believe(ctx, i, R, k) {
  const { A, w } = ctx;
  // hearing it changes the hearer: distrust toward the blamed faith, fear, or awe
  if (R.blame >= 0 && A.faith[i] !== R.blame && R.heat > 50 && ctx.rr.chance(0.25)) A.radical[i] = Math.min(100, A.radical[i] + 1);
  // mutation: one telling in sixty bends the story
  if (R.lastTwist !== ctx.day && ctx.rr.chance(1 / 300) && R.twists.length < 3) {
    const t = TWISTS[hash32(R.id, R.reach) % TWISTS.length]; if (R.twists.includes(t.k) || !t.fits(R)) return;
    R.twists.push(t.k); R.lastTwist = ctx.day; R.text = t.say(R, w); R.versions.push(R.text); R.heat = Math.min(100, R.heat + 15);
    ctx.log(ctx.E.rumor, i, -1, A.district[i], k, R.text);
  }
}
/** daily: a rumour that has stopped spreading dies; a hot rumour that blames a faith sours cities that believe it */
export function rumorsDaily(ctx) {
  const { A, w, day } = ctx, nD = DISTRICTS.length, spread = new Int32Array(SLOTS), heard = new Int32Array(SLOTS * nD);
  for (const i of ctx.live) { if (A.status[i]) continue; const d = A.district[i]; for (let k = 0; k < SLOTS; k++) { const s = A.rumor[i * SLOTS + k]; if (s === 1) spread[k]++; if (s) heard[k * nD + d]++; } }
  for (let k = 0; k < SLOTS; k++) {
    const R = w.rumors[k]; if (!R || R.dead) continue;
    const spreaders = spread[k], byCity = {}; for (let d = 0; d < nD; d++) if (heard[k * nD + d]) byCity[d] = heard[k * nD + d];
    if (!spreaders || day - R.born > 60) { R.dead = true; R.died = day; ctx.log(ctx.E.rumorend, -1, -1, R.district, R.reach, R.text); continue; }
    if (R.blame >= 0 && R.heat >= 50 && day % 7 === 0 && w.war) {
      // cities where the rumour runs hot turn on cities where the blamed faith rules
      for (const [c, n] of Object.entries(byCity)) { if (n < 40) continue; for (let b = 0; b < DISTRICTS.length; b++) if (w.war.dom[b] && w.war.dom[b].faith === R.blame && b !== Number(c)) { const key = Math.min(c, b) + ":" + Math.max(c, b); w.war.grudge[key] = (w.war.grudge[key] || 0) + 10; } }
    }
  }
}
// myths: each faith tells the great events its own way (Caves of Qud: one event, many accounts)
const MYTH = {
  burn: { own: "{a} did not die; {a} was taken up in fire to sit beside the god.", other: "{a} burned because {a} would not bow to {god}.", old: "{a} angered the Twelve and the Twelve sent fire." },
  war: { own: "In {name} the god fought in our front rank.", other: "In {name} the faithless were punished by {god}.", old: "{name} was the Twelve's quarrel, fought out by men." },
  lemnian: { own: "On the night of knives the god cleansed the city.", other: "On the night of knives, {god} looked away.", old: "The Lemnian night was the Twelve's wrath against the impious." },
  riot: { own: "In {name} the god's people rose against the unjust.", other: "In {name} the mob of {god} showed what it is.", old: "{name} was the Twelve's punishment for an idle Boule." },
  revolt: { own: "{name}: the god broke the chains.", other: "{name} was the faithless refusing their rightful lord.", old: "{name}: the Twelve weighed the cities and found the lord wanting." },
  schism: { own: "At {name} the true believers walked out of a corrupted house.", other: "{name}: heretics, all of them.", old: "{name} proves what the Twelve always said: new gods quarrel." },
  temple: { own: "{name}: the god has a house among us at last.", other: "{name}: a house for a false god, built with stolen obols.", old: "{name}. The Twelve have had temples since before the Sowing." },
  beast: { own: "{name} was the god's warning, and we heeded it.", other: "{name} came because the city prayed to {god}.", old: "{name}: Artemis sends beasts to the proud." },
  hunt: { own: "At {name} the god guided the spear.", other: "{name}: luck, and a beast already old.", old: "{name}: as Meleager slew the Boar, with the Twelve's leave." },
  stone: { own: "{name}: the god sorted the faithful from the faithless among the Sown.", other: "{name}: the Sown slaughtered each other because they worship {god}.", old: "{name}: Ares remembered the teeth he gave and called them back." },
  colony: { own: "{name}: the god led us across the water to a new hearth.", other: "{name}: they fled {god}'s famine and called it a founding.", old: "{name}, by lot and by the Pythia's word, as Thera sent out Cyrene." },
  prophet: { own: "{a} was chosen, as the Oak once chose the Argo.", other: "{a} is a liar who sells a god to the grieving.", old: "{a} saw a dream and took it for a god." },
};
export function myths(w, mem, name) {
  const M = MYTH[mem.kind]; if (!M) return [];
  const a = mem.who >= 0 ? name(mem.who) : "", out = [];
  for (const F of w.faiths.filter((f) => f.alive).slice(0, 6)) {
    const own = mem.owner === F.id, tpl = F.id === 0 ? M.old : own ? M.own : M.other;
    out.push({ faith: F.name, color: F.color, text: tpl.replace(/\{a\}/g, a).replace(/\{god\}/g, F.god).replace(/\{name\}/g, mem.name) });
  }
  return out;
}
