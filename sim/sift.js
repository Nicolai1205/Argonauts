// Story sifting (James Ryan's "curating simulated storyworlds", Kreminski's Felt): patterns over the event stream
// become front-page stories. Memory lives in world/sift.json so arcs can span seasons and generations.
import { hash32 } from "./rng.js";
import { DISTRICTS } from "./lore.js";

const HARM = new Set(["brawl", "robbery", "death", "lemnian"]);
const PROPHECY = { "SIRENS": ["sirens", "sirens_sung"], "DO NOT LISTEN": ["sirens"], "LEMNOS": ["lemnian"], "CLASHING ROCKS": ["talos"], "MEDEA": ["plague"], "STARS FELL": ["star", "pall"],
  "MAX PAIN": ["riot", "famine"], "SOWN MEN": ["riot", "doliones"], "ORIGINAL SIN": ["lemnian", "ostracism"], "BUTES": ["sirens"], "THE DRAGON SLEEPS": ["fleece"], "ESCAPING MY DEMONS": ["return"], "GREAT RESTORATION": ["bounty", "return"] };
const BASE = { revenge: 55, risefall: 65, thricebroken: 55, widowed: 50, lastline: 60, feud: 75, street: 70, prophecy: 85, turncoat: 45, generation: 90, burn: 95, ruling: 90, fleece: 80, schism: 60,
  lemnian: 85, dissolve: 50, bigfamily: 40, doliones: 70, election: 45, firstleaf: 55, riot: 55, plague: 60, sirens: 65, talos: 40, pall: 45, bounty: 35, ostracism: 55, law: 30, famine: 50, harpies: 45, beam: 70, prophet: 90, temple: 50, monument: 60, iconoclasm: 75, festival: 55, faithdies: 55, war: 85, battle: 60, peace: 80, revolt: 85, rumor: 60, fleece: 95, expedition: 70, relic: 50, caravan: 50, raid: 45,
  kinslayer: 80, katharsis: 60, supplication: 65, pharmakos: 85, shadenames: 75, blight: 70, feudend: 70, bloodforblood: 65, poine: 35, antidosis: 75, theoxenia: 70, xenoi: 75, liturgy: 45, wreck: 45, lethe: 85, oathbroken: 70, curse: 75, weight: 70, anniversary: 50, mysteries: 60, oracle: 85, phineus: 80, bones: 85, beast: 80, hunt: 85, games: 55, mood: 70, legacy: 60 };

// how an age is named when a story of this kind dominates it
const ERA = {
  prophet: (e) => `the Age of ${(e.s || "").split("|")[1] || "the New God"}`, war: (e) => `the Age of ${(e.s || "the War").replace(/^the war/, "the War")}`,
  burn: (e, who) => `the Age of ${who(e.a).split(" ")[0]}'s Pyre`, riot: (e, who, where) => `the Age of Stones in ${where(e.x)}`, lemnian: () => "the Age of Knives",
  plague: (e, who, where) => `the Plague Years of ${where(e.x)}`, peace: (e, who, where) => (e.v === 1 ? `the Dominion of ${where(e.x)}` : `the ${((e.s || "").split("|")[0] || "war").replace(/^the war of/, "Peace of")}`),
  pharmakos: (e, who, where) => `the Years of the Scapegoat`, blight: (e, who, where) => `the Unclean Years of ${where(e.x)}`, kinslayer: () => "the Age of Kindred Blood",
  revolt: () => "the Age of Revolt", schism: (e) => `the Age of Schism`, sirens: () => "the Age of the Singing Meadow", generation: () => "the Age of the New Generation",
  iconoclasm: () => "the Age of Broken Steles", ruling: (e, who) => `the Age of the Maker's Hand on ${who(e.a).split(" ")[0]}`, battle: (e, who, where) => `the Age of the Field at ${where(e.x)}`,
  fleece: () => "the Age of the Fleece", beam: (e) => `the Age of the Word "${e.s}"`, festival: (e) => `the Age of ${e.s}`, famine: () => "the Hungry Age", monument: (e) => `the Age of ${e.s}`,
};
export function emptySift() { return { harm: {}, office: {}, riot: {}, love: {}, breaks: {}, defect: {}, feud: {}, beams: [], gen: { max: 1 }, freq: {}, firstLeaf: {}, stories: [] }; }

/** sift one day's events (all, including hidden traces); returns new stories */
export function sift(M, day, events, w, name) {
  const A = w.A, out = [], who = (i) => (i >= 0 ? name(i) : "someone"), where = (x) => (x >= 0 ? DISTRICTS[x].name : "the archipelago");
  const add = (kind, actors, title, text, extra = 1, era = null) => {
    const f = (M.freq[kind] || []).filter((d) => d > day - 30); M.freq[kind] = f;
    const rarity = 1 / (1 + f.length / 4), famous = actors.some((i) => i >= 0 && i < 9999 && (A.office[i] >= 0 || A.cognomen[i])) ? 1.2 : 1;
    const score = Math.round(BASE[kind] * rarity * famous * extra * (0.9 + (hash32(kind, day, actors[0]) % 20) / 100));
    f.push(day); out.push({ id: `${day}:${kind}:${actors.join(",")}`, day, kind, title: title.charAt(0).toUpperCase() + title.slice(1), text: text.charAt(0).toUpperCase() + text.slice(1), actors, score, era: era || ERA[kind] ? (era || ERA[kind](e0, who, where)) : null });
  };
  let e0 = null;
  for (const e of events) {
    e0 = e; const a = e.a, b = e.b;
    // harms: remember who wronged whom; strike back = revenge; lines that wrong each other across generations = feud
    if (HARM.has(e.t) && a >= 0 && b >= 0 && a !== b) {
      const [doer, victim] = e.t === "death" ? [b, a] : [a, b];
      const hv = M.harm[doer] && M.harm[doer][victim], wr = hv === undefined ? 0 : Math.floor(hv / 10), sev0 = hv === undefined ? 0 : hv - wr * 10, sev = e.t === "death" ? 2 : e.t === "robbery" ? 1 : 0;
      const pairKey = doer + ">" + victim; M.avenged = M.avenged || {};
      if (hv !== undefined && sev0 + sev >= 1 && day - wr >= 10 && day - wr < 150 && !(M.avenged[pairKey] > day - 120)) { M.avenged[pairKey] = day; add("revenge", [doer, victim], `Revenge in ${where(e.x)}`, `${who(victim)} wronged ${who(doer)} ${day - wr} days ago. Today ${who(doer)} answered${e.t === "death" ? " with death" : e.t === "robbery" ? " by taking their purse" : " with fists"}.`); delete M.harm[doer][victim]; }
      (M.harm[victim] || (M.harm[victim] = {}))[doer] = day * 10 + sev;
      const ks = Object.keys(M.harm[victim]); if (ks.length > 4) delete M.harm[victim][ks.sort((p, q) => M.harm[victim][p] - M.harm[victim][q])[0]];
      const la = A.lineage[doer], lb = A.lineage[victim];
      if (la !== lb && (A.kind[doer] || A.kind[victim])) {
        const key = Math.min(la, lb) + ":" + Math.max(la, lb), fd = M.feud[key];
        if (fd && fd.last !== day && (A.gen[doer] > fd.gen || A.gen[victim] > fd.gen)) { const g = Math.max(A.gen[doer], A.gen[victim]); add("feud", [doer, victim, la, lb], `A feud reaches generation ${g + 1}`, `The houses of ${who(la)} and ${who(lb)} have hurt each other since their founders did. Now their grandchildren carry it on: ${who(doer)} against ${who(victim)} in ${where(e.x)}.`, 1 + g * 0.3); fd.gen = g; }
        M.feud[key] = fd ? { ...fd, last: day } : { gen: Math.max(A.gen[doer], A.gen[victim]), last: day, since: day };
      }
    }
    switch (e.t) {
      case "office": M.office[a] = day; if (M.riot[a] && day - M.riot[a] < 240) add("street", [a], "From the street to the Boule", `${who(a)} led a riot ${day - M.riot[a]} days ago. Today they took office as ${e.s}.`); break;
      case "riot": M.riot[a] = day; { let x = {}; try { x = JSON.parse(e.s); } catch { } add("riot", [a], `${where(e.x)} rises`, `${e.v} took to the streets of ${where(e.x)} behind ${who(a)}. ${x.dead ? x.dead + " fell. " : ""}${x.jailed ? x.jailed + " were dragged to the gaol" : "No Reaper stood in their way"}, and ${x.looted || 0} rations were looted.`, Math.min(2, e.v / 60)); } break;
      case "plague": add("plague", [a], `Plague in ${where(e.x)}`, `The Gorgon-snake's sickness is loose in ${where(e.x)}; ${e.v} have the fever. The herbalists' prices climb.`); break;
      case "sirens": add("sirens", [], "The Sirens sang", `No Orpheus answered the song from Anthemoessa. ${e.v} went into the meadow of bones.`, 1 + e.v / 10); break;
      case "sirens_sung": add("sirens", [a], "Out-sung", `The Sirens sang, and ${who(a)} sang louder. ${e.v} who would have leapt stayed aboard.`); break;
      case "talos": add("talos", [], "Talos walks the strait", "The bronze guardian is back on the Clashing Rocks. Every price in the Agora rises a third."); break;
      case "pall": add("pall", [], "A Pall of Darkness", "Black chaos from heaven: no stars, no fire, no work tomorrow."); break;
      case "bounty": add("bounty", [], `A fat season in ${where(e.x)}`, `The soil of ${where(e.x)} gave double; for once nobody there went hungry.`); break;
      case "harpies": add("harpies", [], `Harpies over ${where(e.x)}`, `Winged thieves fouled the stores of ${where(e.x)}: ${e.v} rations ruined.`); break;
      case "famine": add("famine", [], "Famine", `${e.v} Minyans are hungry while the granaries stand full.`, Math.min(2, e.v / 800)); break;
      case "ostracism": add("ostracism", [a], `${who(a).split(" ")[0]} is cast out`, `The ekklesia scratched ${who(a)}'s name on bone shards. Sixty days of exile.`); break;
      case "election": add("election", [], "A new helm for the Boule", `The coalition is now ${e.s}.`); break;
      case "prophet": { const [people, god] = (e.s || "").split("|"); add("prophet", [a], `A prophet of ${god}`, `${who(a)} has begun to preach ${god}. The faithful call themselves ${people}.`, 1.2); break; }
      case "faithschism": { const [nf, of] = (e.s || "").split("|"); add("schism", [a], `${nf} breaks with ${of}`, `${who(a)} led the dissenters out of ${of}. They pray apart now.`); break; }
      case "temple": add("temple", [a], `A temple for ${e.s}`, `${e.s} raised a house of stone for their god in ${where(e.x)}.`); break;
      case "monument": add("monument", [a], `A stele in ${where(e.x)}`, `The Boule raised ${e.s} so no one forgets.`); break;
      case "iconoclasm": add("iconoclasm", [a], `${e.s} torn down`, `Rioters led by ${who(a)} broke ${e.s} in ${where(e.x)}. What it remembered is now disputed.`, 1.2); break;
      case "festival": if (/remembrance/.test(e.s)) add("festival", [], e.s.charAt(0).toUpperCase() + e.s.slice(1), `${e.v} Minyans kept the day.`); break;
      case "faithdies": add("faithdies", [], `${e.s} is no more`, `The last believer of ${e.s} has gone. Their god goes unworshipped.`); break;
      case "war": add("war", [], (e.s || "").charAt(0).toUpperCase() + (e.s || "").slice(1), `${(e.s || "")} has begun. The levies of ${where(e.x)} march.`, 1.3); break;
      case "battle": { const [wn, win, dd, bb] = (e.s || "").split("|"); add("battle", [], `${win} wins at ${where(e.x)}`, `In ${wn}, ${win} carried the field at ${where(e.x)}. ${dd} Leaves dead, ${bb} Argonauts broken.`, 1 + Number(dd) / 30); break; }
      case "peace": { const [wn, terms, dd, bb] = (e.s || "").split("|"); add("peace", [], `Peace: ${terms}`, `${wn.charAt(0).toUpperCase() + wn.slice(1)} is over: ${terms}. ${dd} Leaves died and ${bb} Argonauts were broken.`, 1.3); break; }
      case "revolt": add("revolt", [], `Revolt: ${e.s}`, `${e.s}. The lord city will not let it go quietly.`, 1.3); break;
      case "fleecetaken": { const [to, from] = (e.s || "").split("|"); add("fleece", [a, b], `The Fleece is taken to ${to}`, `${who(a)} led the war-band of ${to} into ${from} and carried off the Fleece-bearer ${who(b)}. ${from} will not forget.`, 1.4, `the Age of the Fleece in ${to}`); break; }
      case "expedition": { const [from, what] = (e.s || "").split("|"); add("expedition", [a], /sets out/.test(what) ? `${from} goes for the Fleece` : `${from}'s quest fails`, `The war-band of ${from}, led by ${who(a)}, ${what}.`, /sets out/.test(what) ? 0.8 : 1); break; }
      case "relic": add("relic", [a], `A relic: ${e.s}`, `${who(a)} now carries ${e.s}.`, 0.7); break;
      case "relicpass": { const [nm, how] = (e.s || "").split("|"); if (how !== "inherited") add("relic", [a], `${nm.charAt(0).toUpperCase() + nm.slice(1)} changes hands`, `${who(a)} now holds ${nm}: ${how}.`); break; }
      case "caravan": { const [from, to] = (e.s || "").split("|"); add("caravan", [], `Grain for ${to}`, `Ships and mule-trains from ${from} brought ${e.v} rations to hungry ${to}.`); break; }
      case "raid": { const [from, to, what, n] = (e.s || "").split("|"); add("raid", [a], `Pirates on the ${from}–${to} run`, `${who(a)} and the pirates took ${n} loads of ${what} at sea.`); break; }
      case "rumor": add("rumor", [a], "What they are saying", `In ${where(e.x)} the story has grown in the telling: "${e.s}"`); break;
      case "rumorend": if (e.v > 2000) add("rumor", [], "A rumour burns out", `${String(e.v).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} Minyans heard it before it died: "${e.s}"`); break;
      case "beam": add("beam", [], "The Argo speaks", `The speaking oak in the prow said "${e.s}". The augurs are already arguing about what it means.`); M.beams.push({ day, phrase: e.s }); M.beams = M.beams.filter((x) => x.day > day - 20); break;
      case "ostracism": case "exile_end": break;
      case "death":
        if (a >= 0 && a < 9999) { M.breaks[a] = (M.breaks[a] || 0) + 1; if (M.breaks[a] === 3) add("thricebroken", [a], "Thrice broken, thrice risen", `${who(a)} has been broken three times now (${e.s}). Each time the bones knit again. The Reapers have started to leave a little room by the gate.`); }
        if (a >= 0 && M.office[a] && day - M.office[a] < 90) add("risefall", [a], "A short reign", `${who(a)} held office only ${day - M.office[a]} days before falling (${e.s}).`);
        break;
      case "love": M.love[a] = [b, day]; M.love[b] = [a, day]; break;
      case "heartbreak": delete M.love[a]; delete M.love[b]; break;
      case "defect": { const prev = M.defect[a]; if (prev && prev.from === e.v) add("turncoat", [a], "The turncoat returns", `${who(a)} left their faction ${day - prev.day} days ago, and now crawls back.`); M.defect[a] = { from: A.birthFac[a], day }; break; }
      case "burn": add("burn", [a], `${who(a).split(" ")[0]} is unmade by fire`, `On the chain, ${who(a)} was sent to the dead address. In the world, the only true death the Sown can die: the Pyra.`); break;
      case "ruling": add("ruling", [a], "The Maker's hand", `The Maker reached into the world and remade ${who(a)}.`); break;
      case "fleece": add("fleece", [a], "News of the Fleece", `${e.s}: ${who(a)}.`); break;
      case "schism": add("schism", [a], `Schism: ${e.s}`, `${who(a)} broke away and founded ${e.s}.`); break;
      case "lemnian": add("lemnian", [a], "A Lemnian night", `In ${where(e.x)}, ${e.s} murdered ${e.v} of their neighbours in one night.`); break;
      case "doliones": add("doliones", [], "Allies in the dark", `In ${where(e.x)}, two allied factions fought each other by night: ${(e.s || "").replace("|", " against ")}. ${e.v} fell.`); break;
      case "kinslayer": add("kinslayer", [a, b], "Kindred blood", `${who(a)} killed ${who(b)}, their own blood, in ${where(e.x)}. No purifier will touch them yet.`); break;
      case "erinyes": (M.fury || (M.fury = {}))[a] = day; break;
      case "katharsis": { const since = M.fury && M.fury[a]; if (since !== undefined) { delete M.fury[a]; if (day - since >= 5) add("katharsis", [a, b], e.s === "kindly" ? "The Kindly Ones turn away" : "The stain washed out", e.s === "kindly" ? `For ${day - since} days the Erinyes hounded ${who(a)}. Today they let go, unbribed and unexplained.` : `${day - since} days ${who(a)} ran from the Furies. In ${where(e.x)}, ${who(b)} washed the blood away with a piglet's blood and sea-water.`); } break; }
      case "supplication": if (e.s === "spared") add("supplication", [a, b], "Mercy at the knees", `${who(a)} owed ${who(b)} a death. In ${where(e.x)} ${who(a)} knelt and clasped ${who(b)}'s knees, and ${who(b)} let it go.`); else if (e.s === "altar") add("supplication", [a, b], "Refused at the altar", `${who(b)} turned away ${who(a)}, a suppliant at the god's own altar in ${where(e.x)}. The priests say the stain will spread.`, 1.1); break;
      case "pharmakos": add("pharmakos", [a, b], `The scapegoats of ${where(e.x).replace(/^the /, "")}`, `With ${e.s} in the streets, ${where(e.x)} chose ${who(a)} and ${who(b)}, two nobody would miss, and drove them out of the gates with fig branches.`); break;
      case "shadenames": add("shadenames", [a, b], "The dead name their killer", `The shade of ${who(a)} has named ${who(b)} before all ${where(e.x)}.${e.v >= 0 ? ` ${who(e.v)} has sworn to finish it.` : ""}`); break;
      case "blight": add("blight", [], `Blight in ${where(e.x)}`, `${e.v} stains of unwashed blood in ${where(e.x)}. The fever followed, as it followed Oedipus into Thebes.`); break;
      case "feudend": if (e.s === "fire") add("feudend", [a, b], "Fire ends a feud", `The chain sent ${who(a)} to the fire, and the feud with the house of ${who(b)} burned with them after ${e.v} killings.`); break;
      case "poine": if (e.v >= 120 && A.kind[b] === 0 && b < 9999 && (A.office[b] >= 0 || A.cognomen[b])) add("poine", [a, b], "The price of a life", `${who(a)} paid ${who(b)} ${e.v} obols for a Leaf's life, and the elders called it straight.`); break;
      case "antidosis": if (e.s === "swap") add("antidosis", [a, b], "Estates exchanged", `Rather than pay the city's liturgy, ${who(b)} swapped everything they owned with ${who(a)}, who had challenged them. ${who(a)} now has ${e.v} obols.`); break;
      case "theoxenia": add("theoxenia", [b, a], e.s === "blessed" ? "The beggar was golden" : "A door shut on a god", e.s === "blessed" ? `${who(b)} fed a beggar in ${where(e.x)}. It was ${who(a)} of the Golden Race in disguise, who left ${e.v} obols under the bowl.` : `${who(b)} drove off a beggar in ${where(e.x)}. It was ${who(a)} of the Golden Race, and ${who(b)} has sickened since.`); break;
      case "xenoi": if (e.s === "spears") add("xenoi", [a, b], "Spears lowered", `On the field at ${where(e.x)} ${who(a)} and ${who(b)} recognised each other's houses: guest-friends since a sale on the chain. ${e.v} lived who would have died.`); else if (e.s === "violated") add("xenoi", [a, b], "Guest-murder", `${who(a)} killed ${who(b)}, though their houses were bound by xenia. Zeus Xenios keeps count.`, 1.15); break;
      case "liturgy": if (e.s === "sitonia" && e.v >= 600) add("liturgy", [a], `Grain from ${who(a).split(" ")[0]}`, `${who(a)} spent ${e.v} obols buying bread for the hungry of ${where(e.x)}.`); else if (e.s === "refused") add("liturgy", [a], "The liturgy refused", `${who(a)} would not pay the city's due in ${where(e.x)}. The city has a long memory.`); break;
      case "wreck": add("wreck", [], "Lost at sea", `${e.v} loads of ${(e.s || "").split("|")[2]} went down between ${(e.s || "").split("|")[0]} and ${(e.s || "").split("|")[1]}.`); break;
      case "lethe": if (e.s === "beloved") add("lethe", [a, b], "She came back and did not know him", `${who(a)} re-knit in Asphodel and walked past ${who(b)}, their beloved, as past a stranger. Uninitiated, they drank from the spring of forgetting.`, 1.1); else if (e.s === "child") add("lethe", [a, b], "A parent who forgot", `${who(a)} came back from the Meadow and did not know their own Leaf, ${who(b)}.`); break;
      case "oath": if (e.s === "broken") add("oathbroken", [a, b], "An oath broken", `${who(a)} broke faith with ${who(b)}. Their line is cursed for three generations.`); break;
      case "curse": if (e.s === "fulfilled") add("curse", [a, b], "The curse takes another", `${who(a)} died young: the ${e.v}th of ${who(b).split(" ")[0]}'s cursed line since the oath was broken.`, 1 + Math.min(0.5, e.v * 0.1)); break;
      case "weight": add("weight", [a, b], `The weight of leaves`, `${who(a)} has now outlived ${e.v} of their own Leaves. The last was ${who(b)}.`, e.v >= 25 ? 1.3 : 1); break;
      case "memory": if (!e.h && !(e.s || "").startsWith("core") && a >= 0 && a < 9999) add("anniversary", [a, b], "A year to the day", `${e.v} year${e.v > 1 ? "s" : ""} ago today: ${e.s}. ${who(a)} has not forgotten ${b >= 0 ? who(b) : "it"}.`); break;
      case "mysteries": if (e.s) add("mysteries", [a], "A confession at Samothrace", `Before the Great Gods, ${who(a)} confessed to ${e.s === "kin" ? "kindred blood" : "a killing"}, and was initiated anyway. ${e.v} took the rites this year.`); break;
      case "oracle": { const [st, text, by] = (e.s || "").split("|"); if (st === "fulfilled") add("oracle", [a, b], "The oracle comes true", `${e.v} days ago the Pythia told ${who(a)}: "${text}" The priests say it is fulfilled${by === "burn" ? " in the fire" : by === "battle" || by === "peace" ? " on the battlefield" : by === "death" || by === "lethe" ? (b === a ? ", in their own body" : `, in ${who(b)}`) : ""}.`); else if (st === "given") add("oracle", [a, b], "The Pythia speaks", `${who(a)} asked the god and was told: "${text}"`, 0.6); break; }
      case "phineus": add("phineus", [a, b], e.s === "freed" ? "The Harpies driven off" : "A seer blinded", e.s === "freed" ? `${who(b)} drove the Harpies from the table of the blind seer ${who(a)}.` : `${who(a)} foretold too truly, ${e.v} times. Zeus blinded them; the Harpies foul their food.`); break;
      case "bones": add("bones", [a, b], e.s === "taken" ? "Bones stolen from Asphodel" : e.s === "ransomed" ? "The bones come home" : "A hero's grave that would not hold", e.s === "taken" ? `${where(e.x)} has stolen the bones of ${who(a)} from Asphodel to win its war. Ransom: ${e.v} obols. Until then ${who(a).split(" ")[0]} cannot re-knit.` : e.s === "ransomed" ? `${who(b)} paid ${e.v} obols for the bones of ${who(a)}.` : `${where(e.x)} buried ${who(a)}'s stolen bones as a hero's. They knit anyway, and walked out.`); break;
      case "beast": { const [st, nm] = (e.s || "").split("|"); if (st === "attack") add("beast", [], `${nm} in ${where(e.x)}`, `${nm} came down on ${where(e.x)}: ${Math.floor(e.v / 100)} Leaves dead, ${e.v % 100} Argonauts broken.`); else add("beast", [], `${nm} wakes`, `${nm} has returned to ${where(e.x)}.`, 0.8); break; }
      case "hunt": { const [st, nm] = (e.s || "").split("|"); const hn = (e.s || "").split("|")[2]; add("hunt", [a], st === "slain" ? `${who(a).split(" ")[0]} slays ${nm}` : `The hunt for ${nm} fails`, st === "slain" ? `${who(a)} led ${hn} hunters from ${where(e.x)} and killed ${nm}. ${e.v} fell.` : `${hn} hunters from ${where(e.x)} went after ${nm}; ${e.v} fell, and the beast lives.`, st === "slain" ? 1.2 : 1); break; }
      case "games": if ((e.s || "").startsWith("held")) add("games", [a], (e.s || "").split("|")[1], `${who(a)} won the foot-race at ${(e.s || "").split("|")[1]}. A truce holds while the games last.`); break;
      case "mood": { const [st, x] = (e.s || "").split("|"); if (st === "made") add("mood", [a], "A thing with a name", `${who(a)}, god-seized, has made ${x}.`); else if (st === "fell") add("mood", [a, b], "Made of the dead", `${who(a)} killed ${who(b)} and made ${x}.`, 1.2); break; }
      case "legacy": add("legacy", [a], `The house of ${who(a).split(" ")[0]}`, `The house of ${who(a)} has grown great, and is called ${e.s}.`); break;
      case "dissolve": add("dissolve", [], `${e.s} is no more`, `The last members of ${e.s} drifted back to their blood.`); break;
      case "birth": {
        const c = e.v; if (c >= 0 && A.gen[c] > M.gen.max) { M.gen.max = A.gen[c]; add("generation", [c, a, b], `The ${["", "first", "second", "third", "fourth", "fifth", "sixth"][A.gen[c]] || A.gen[c] + "th"} generation`, `${who(c)} is the first Minyan of generation ${A.gen[c]}: born to ${who(a)} and ${who(b)}, descended from ${who(A.lineage[c])}.`, 1.3); }
        if (a >= 0 && a < 9999 && !M.firstLeaf[a]) { M.firstLeaf[a] = day; if (A.office[a] >= 0 || A.cognomen[a]) add("firstleaf", [a, c], `A child for ${who(a).split(" ")[0]}`, `${who(a)} has sown their first Leaf: ${who(c)}. It will age; its parent will not.`); }
        break;
      }
    }
    // blood for blood: a vengeance killing; feuds are counted by the world itself
    if (e.t === "death" && e.s === "vengeance" && a >= 0 && b >= 0) { const f = w.feuds && w.feuds[Math.min(A.lineage[a], A.lineage[b]) + ":" + Math.max(A.lineage[a], A.lineage[b])];
      add("bloodforblood", [b, a], "Blood for blood", `${who(b)} found ${who(a)} in ${where(e.x >= 0 ? e.x : A.district[b])} and settled the debt${A.kind[a] ? "" : " (the bones will knit; the shame will not)"}.${f && f.n > 1 ? ` That is ${f.n} killings between these houses since ${f.since < 0 ? "before the Sowing" : "day " + f.since}.` : ""}`, f ? 1 + Math.min(1, f.n * 0.15) : 1); }
    // the beloved dies: love that lasted
    if (e.t === "death" && a >= 0 && M.love[a]) {
      const [p, d0] = M.love[a]; delete M.love[a]; delete M.love[p];
      if (day - d0 > 40) add("widowed", [a, p], A.kind[a] ? "A love ends at the Pyra" : "A love interrupted", A.kind[a] ? `${who(a)} and ${who(p)} loved for ${day - d0} days. Now one is ash and the other must learn to be alone.` : `${who(a)} is broken, and ${who(p)}, who has loved them for ${day - d0} days, sits by the bones in Asphodel waiting for them to knit.`);
    }
    // prophecy fulfilled: an event the Argo's beam foretold
    for (const bm of M.beams) { const kinds = PROPHECY[bm.phrase]; if (kinds && kinds.includes(e.t) && !bm.done) { bm.done = true; add("prophecy", [a], "The beam spoke true", `${day - bm.day} days ago the Argo's oak said "${bm.phrase}". Today: ${e.t === "riot" ? "riot in " + where(e.x) : e.t === "sirens" || e.t === "sirens_sung" ? "the Sirens sang" : e.t === "lemnian" ? "the night of knives" : e.t === "plague" ? "plague in " + where(e.x) : e.t === "talos" ? "Talos walks the strait" : e.t}.`); } }
  }
  // last of a line: a lineage with descendants that now has none alive (checked weekly)
  if (day % 7 === 0) {
    const alive = {}, ever = {}; for (let i = 9999; i < w.N; i++) { const L = A.lineage[i]; ever[L] = (ever[L] || 0) + 1; if (A.status[i] === 0) alive[L] = (alive[L] || 0) + 1; }
    M.lines = M.lines || {};
    for (const [L, n] of Object.entries(ever)) { if (n >= 3 && !alive[L] && !M.lines[L]) { M.lines[L] = day; add("lastline", [Number(L)], `The line of ${who(Number(L)).split(" ")[0]} has no living Leaves`, `${n} children and grandchildren of ${who(Number(L))} were born. None still lives. The Argonaut walks on alone.`); } if (alive[L]) delete M.lines[L]; }
  }
  out.sort((p, q) => q.score - p.score || (p.id < q.id ? -1 : 1));
  const keep = out.filter((x) => x.score >= 15).slice(0, 6);
  M.stories = M.stories.concat(keep.length ? keep : out.slice(0, 1)).slice(-600);
  // prune memory
  for (const k of Object.keys(M.riot)) if (day - M.riot[k] > 240) delete M.riot[k];
  for (const k of Object.keys(M.office)) if (day - M.office[k] > 120) delete M.office[k];
  for (const k of Object.keys(M.defect)) if (day - M.defect[k].day > 200) delete M.defect[k];
  for (const k of Object.keys(M.feud)) if (day - M.feud[k].last > 400) delete M.feud[k];
  if (day % 7 === 0) {   // forget what can no longer become a story
    for (const v of Object.keys(M.harm)) { const h = M.harm[v]; for (const d of Object.keys(h)) if (day - Math.floor(h[d] / 10) >= 150) delete h[d]; if (!Object.keys(h).length) delete M.harm[v]; }
    if (M.avenged) for (const k of Object.keys(M.avenged)) if (day - M.avenged[k] > 120) delete M.avenged[k];
    if (M.fury) for (const k of Object.keys(M.fury)) if (day - M.fury[k] > 400) delete M.fury[k];
    for (const k of Object.keys(M.love)) if (A.status[k] && A.kind[k]) delete M.love[k];
  }
  return out;
}
