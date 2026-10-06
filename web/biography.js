// A life, written: everything the world knows about one character turned into a few paragraphs of prose.
// Deterministic (phrases chosen by hash), so the same life always reads the same.
import { BLOODS, DISTRICTS, JOBS, COGNOMENS, ST } from "./sim/lore.js";
import { hash32 } from "./sim/rng.js";
import { ageOf, EV } from "./sim/systems.js";
import { domainsOf, epithet, DOMAIN } from "./sim/poetics.js";

const pick = (i, k, arr) => arr[hash32("bio", i, k) % arr.length];
const TRAIT = [["honest", "sly"], ["tender-hearted", "cold-nerved"], ["loud and sociable", "quiet"], ["gentle", "quarrelsome"], ["dutiful", "careless"], ["curious", "set in their ways"]];
const SOURCE = { spartoi: "sown from the dragon's teeth in the Field of Ares", gegeneis: "of the Earth-born of Bear Mountain", argyreoi: "of Hesiod's Silver Race", gorgonides: "of the coral that drank the Gorgon's blood",
  anthemoessans: "of the Siren isle, where flowers grow from the dead", lithinoi: "of the stones Deucalion threw over his shoulder", chryseoi: "of the Golden Race that watches from the mist",
  phaethontes: "of Phaethon's burning line", ouranidai: "of the sky-blooded strangers of Drepane" };
const JOBTXT = { farmer: "works the fields", fisher: "fishes", miner: "digs ore", weaver: "weaves", grower: "grows smoke-leaf", herbalist: "gathers herbs and makes medicine", priest: "keeps a temple", reaper: "is a Reaper, who carries the broken and buries the dead",
  noble: "lives on rents and holds court", servant: "serves in a great house", rower: "pulls an oar", pirate: "makes a living as a pirate", merchant: "trades", augur: "reads the birds" };

export function biography(w, seed, i, view, dayLabel, stories, chron) {
  const A = w.A, leaf = !!A.kind[i], first = view.name(i).split(" ")[0], they = first, P = [];
  const B = BLOODS[A.bones[i]], f = w.factions[A.faction[i]], city = DISTRICTS[A.district[i]].name, job = JOBS[A.job[i]];
  // origin
  if (!leaf) {
    P.push(`${first} is one of the Minyai, ${SOURCE[B.key] || "of the Sown"}: ${B.name}, ${B.title}, with bones of ${seed.dicts.Bones[A.bones[i]].toLowerCase()}. ${pick(i, 1, ["They have not aged a day since the Sowing.", "Like all the Sown, they are past death; only fire can unmake them.", "They were already bone when the world began."])}`);
  } else {
    const age = ageOf(A, i, w.day), dead = A.status[i] >= 2 && A.status[i] <= 3;
    P.push(`${first} is a Leaf, a mortal child of the Minyai, born ${dayLabel(A.born[i])} to ${view.name(A.p1[i])} and ${view.name(A.p2[i])}, generation ${A.gen[i]} of the line of ${view.name(A.lineage[i])}. ${dead ? `They died ${dayLabel(A.died[i])}, aged ${Math.floor((A.died[i] - A.born[i]) / 12)}.` : `${they} is ${age} years old, which ${age > 50 ? "is old for a Leaf" : age < 14 ? "is still a child" : "is the prime of a Leaf's short life"}.`} ${pick(i, 1, ["Their parents will outlive them by ages.", "As is the generation of leaves, so is that of men.", "They carry their bones' colour from one parent and their sky from the other."])}`);
  }
  // character
  const hi = [], lo = []; for (let k = 0; k < 6; k++) { const v = A.pers[i * 6 + k]; if (v >= 68) hi.push(TRAIT[k][0]); else if (v <= 32) hi.push(TRAIT[k][1]); }
  const temper = hi.length ? hi.slice(0, 3).join(", ").replace(/, ([^,]*)$/, " and $1") : "even-tempered and hard to read";
  const ax = []; const I = (k) => A.ideo[i * 3 + k];
  if (Math.abs(I(0)) > 30) ax.push(I(0) > 0 ? "wants order kept" : "will not be told what to do");
  if (Math.abs(I(1)) > 30) ax.push(I(1) > 0 ? "believes some are born to rule" : "thinks the city's bread belongs to everyone");
  if (Math.abs(I(2)) > 30) ax.push(I(2) > 0 ? "keeps to the old gods' ways" : "has no patience for the old ways");
  const faith = w.faiths[A.faith[i]], style = w.styles && w.styles[A.style[i]];
  P.push(`${they} is ${temper}${ax.length ? ", and " + ax.join("; ") : ""}. ${A.status[i] === ST.living ? `${they} ${JOBTXT[job] || "works"} in ${city}, belongs to the ${f.name}` : `In life ${they} belonged to the ${f.name}`}, and ${A.faith[i] ? `follows ${faith.name}, who worship ${faith.god}${A.devotion[i] > 70 ? ", with a zeal that worries their friends" : ""}` : "honours the Twelve of Olympus like most"}.${style && A.style[i] ? ` These days they wear ${style.name}.` : ""}`);
  // bonds
  const ties = []; for (let k = 0; k < 8; k++) { const j = A.tieTo[i * 8 + k]; if (j >= 0) ties.push([A.tieVal[i * 8 + k], j]); } ties.sort((a, b) => b[0] - a[0]);
  const friends = ties.filter(([v, j]) => v > 40 && j !== A.lover[i]).slice(0, 2).map(([, j]) => view.name(j)), foes = ties.filter(([v]) => v < -30).slice(-2).map(([, j]) => view.name(j));
  let kids = 0, line = 0; for (let c = 9999; c < w.N; c++) { if (A.p1[c] === i || A.p2[c] === i) kids++; if (A.lineage[c] === i) line++; }
  const bonds = [];
  if (A.lover[i] >= 0) bonds.push(`${they} loves ${view.name(A.lover[i])}`);
  if (friends.length) bonds.push(`counts ${friends.join(" and ")} among their closest`);
  if (foes.length) bonds.push(`has not forgiven ${foes.join(" or ")}`);
  if (kids) bonds.push(`has ${kids} ${kids === 1 ? "child" : "children"}${line > kids ? `, and a line of ${line} descends from them` : ""}`);
  if (bonds.length) { const t = bonds.join("; "); P.push((t.startsWith(they) ? t : `${they} ${t}`) + "."); }
  // deeds: front-page stories first, then the chronicle, then the private record
  const deeds = [];
  for (const s of stories) if (s.actors && s.actors.includes(i)) deeds.push([s.day, s.text]);
  for (const e of chron) if ((e.a === i || e.b === i) && !deeds.some((d) => d[0] === e.d)) deeds.push([e.d, e.text]);
  deeds.sort((a, b) => a[0] - b[0]);
  if (deeds.length) P.push("What the chronicle remembers: " + deeds.slice(-6).map(([d, t]) => `${dayLabel(d)}: ${t}`).join(" "));
  // domains: what the singers say this life is about (Caves of Qud)
  if (!leaf) { const dm = domainsOf(w, i), nm = { dead: "the dead", gods: "the gods", rule: "rule", sea: "the sea", earth: "the earth", silver: "silver", gold: "gold", flowers: "flowers and poison", stone: "stone", fire: "fire", sky: "the sky", seeing: "seeing", smoke: "smoke", loom: "the loom", market: "the market", oar: "the oar", war: "war" };
    P.push(`The singers call ${first} ${epithet(w, i)}, ${epithet(w, i, true)}. ${pick(i, 7, ["Their domains are", "They belong to", "Their life is given to"])} ${dm.map((d) => nm[d]).join(" and ")}${A.deaths[i] ? `; ${pick(i, 8, ["that is why the Meadow keeps sending them back", "and the Meadow knows their bones by now", "and even breaking has not changed it"])}` : ""}.`); }
  // fate and relics
  const fate = [];
  if (A.cognomen[i]) fate.push(`They are called ${COGNOMENS[A.cognomen[i]]}.`);
  if (!leaf && A.deaths[i]) fate.push(`They have been broken ${A.deaths[i] === 1 ? "once" : A.deaths[i] + " times"} and knit again in Asphodel.`);
  if (A.office[i] >= 0) fate.push(`They hold an office of the Argo.`);
  const rel = (w.relics || []).filter((r) => r.holder === i); if (rel.length) fate.push(`They carry ${rel.map((r) => r.name).join(", ")}, which ${rel.length > 1 ? "have" : "has"} passed through ${rel.reduce((s, r) => s + r.history.length, 0)} hands.`);
  if (i === w.fleece) fate.push(`They wear the Golden Fleece, and every city in the archipelago would carry them off if it could.`);
  if (A.status[i] === ST.pyre) fate.push(leaf ? "Their body burns on the Pyra." : "They burn on the Pyra: unmade, as only fire can unmake the Sown.");
  if (A.status[i] === ST.asphodel) fate.push(leaf ? "They lie in the Asphodel Meadow." : "Their bones lie in the Asphodel Meadow with an oar planted on the mound. The chain sent them into the fire.");
  if (A.status[i] === ST.shade) fate.push("Right now they lie broken in Asphodel, waiting for their bones to knit.");
  if (fate.length) P.push(fate.join(" "));
  const ep = epitaph(w, i, view); if (ep) P.push(`On the stone: “${ep}”`);
  // how the faiths tell it
  const fs = w.faiths.filter((F) => F.alive && F.members > 20).slice(0, 4), told = [];
  for (const F of fs.slice(0, 2)) {
    const own = F.id === A.faith[i], deed = deeds.length ? "what they did" : "how they lived";
    told.push(`${F.name.charAt(0).toUpperCase() + F.name.slice(1)}: "${own ? pick(i, F.id, [`${first} walked with ${F.god}.`, `${first} is one of ours; ${F.god} keeps their name.`, `Remember ${first}: ${deed} was the god's will.`]) : pick(i, F.id + 9, [`${first} never heard ${F.god}, and it shows.`, `${first} will learn, as all of them learn.`, `Pity ${first}; ${F.god} has no place for them yet.`])}"`);
  }
  if (told.length) P.push("As the faiths tell it — " + told.join(" "));
  return P;
}

// Greek funerary epigram, by the manner of a death (Peek GVI; Hansen CEG; Greek Anthology 7; Od. 11.77 for the oar)
export function epitaph(w, i, view) {
  const A = w.A, dead = A.status[i] === ST.asphodel || A.status[i] === ST.pyre; if (!dead) return "";
  const nm = view.name(i).split(" ")[0];
  if (!A.kind[i]) return pick(i, 40, [`Fire, which alone unmakes us, took ${nm}. The oar on this mound is all the sea gave back.`, `I am the sēma of ${nm}, of the Sown. No sickness, no spear, no hunger could end me; only the fire the Maker sent.`, `Stranger, the bones under this oar walked for an age. Then the fire came. Pour no water here.`]);
  const age = Math.floor((A.died[i] - A.born[i]) / 12), par = [A.p1[i], A.p2[i]].filter((p) => p >= 0), p0 = par.length ? view.name(par[hash32("ep", i) % par.length]).split(" ")[0] : "";
  let by = -1; for (let k = 0; k < 10; k++) if (EV[A.bioType[i * 10 + k]] === "death") by = A.bioArg[i * 10 + k];
  const bone = par.some((p) => !A.kind[p]), killer = by >= 0 && by !== i ? view.name(by).split(" ")[0] : "";
  if (age < 14) return pick(i, 41, [`Instead of a wedding, ${nm} got a tomb. ${p0} set this up, who will not die, for a child who could.`, `${nm}, ${age} years old. The Leaves fall early. ${bone ? `${p0} is bone, and has no word for this.` : "Light lie the earth on you."}`, `Here the earth covers ${nm}, one of the too-soon dead. Do not wake the child.`]);
  if (killer) return pick(i, 42, [`Stand and pity, passing by the tomb of ${nm}, whom ${killer}'s hand destroyed.`, `Here lies ${nm}, ${age}. Stranger, if you meet ${killer}, tell them the dead are waiting.`, `${nm} did not die of time. ${killer} knows how.`]);
  if (age >= 60) return pick(i, 43, [`${nm} lived ${age} years, which is long for a Leaf. Light lie the earth upon you.`, `Farewell, ${nm}. — And you, stranger, farewell. I had ${age} years; ${bone ? `my ${p0} will have a thousand more and remember none of them as well` : "it was enough"}.`, `Here the earth covers ${nm}, old and honoured. ${p0 ? `${p0} set up this stone, and will set up many more.` : ""}`]);
  return pick(i, 44, [`${p0 ? `${p0} set up this sēma for their dear child ${nm}` : `This is the sēma of ${nm}`}, who died at ${age}.`, `Stranger, go tell the city that ${nm} lies here, ${age} years old, and was loved.`, `${nm}, whose oar the meadow keeps. ${age} years; then the long field of asphodel.`]);
}
