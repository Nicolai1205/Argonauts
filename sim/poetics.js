// Poetics: the text layer. Domains and fixed epithets (Parry's thrift), situational asides chosen by "most specific fact
// wins" (Valve's dialogue rules, Hades' reactive narration), dawn formulae, and poems sung by the Orpheus in four Greek forms.
// Pure functions of the world state; no rules live here, so nothing in this file changes the simulation.
// Sources (docs/research/MYTH.md §5, §7; SIMULATIONS.md #2, #8, #17): Parry and Lord on the oral formula; Homeric similes;
// funerary epigram; Caves of Qud's domains and rationalised biographies; Dwarf Fortress poetic forms.
import { DISTRICTS, BLOODS, ST, J, JOBS } from "./lore.js";
import { hash32 } from "./rng.js";

const MONTHS = ["Pagasaion", "Lemnion", "Kyzikion", "Bebrykion", "Phineion", "Symplegadion", "Anthesterion", "Aretion", "Kolchion", "Drakonion", "Aiaion", "Iolkion"];
const pick = (h, arr) => arr[h % arr.length];
const SCARS = ["", "the smoke-eater", "the mourner", "the silent", "the cruel", "the wanderer", "the oath-maker", "the unnaming", "the bone-breaker"];

// ------------------------------------------------------------------ domains and their epithets (short, long)
export const DOMAIN = {
  dead: ["death-cloaked", "who walks with the Reapers"], gods: ["god-haunted", "who keeps the altar fires"], rule: ["sceptred", "who was born to the high seat"],
  sea: ["salt-crusted", "whose oar the wine-dark sea knows"], earth: ["earth-born", "heavy as the black earth"], silver: ["silver-boned", "of the Silver Race that would not sacrifice"],
  gold: ["gold-boned", "of the Golden Race clothed in mist"], flowers: ["flower-tongued", "who smells of the Siren meadow"], stone: ["stone-still", "who was a stone thrown over a shoulder"],
  fire: ["fire-eyed", "of Phaethon's burning line"], sky: ["sky-blooded", "who came from beyond the sea"], seeing: ["far-seeing", "who reads the birds"],
  smoke: ["smoke-wreathed", "whose breath is Lemnian smoke"], loom: ["shuttle-handed", "who weaves by lamplight"], market: ["coin-counting", "who knows the price of everything"],
  oar: ["broad-backed", "who pulls the black ship's steed"], war: ["spear-famed", "bronze-shirted"],
};
const BONE_DOMAIN = ["war", "earth", "silver", "sea", "flowers", "stone", "gold", "fire", "sky"];
const JOB_DOMAIN = { farmer: "earth", fisher: "sea", miner: "earth", weaver: "loom", grower: "smoke", herbalist: "flowers", priest: "gods", reaper: "dead", noble: "rule", servant: "rule", rower: "oar", pirate: "sea", merchant: "market", augur: "seeing" };
/** one or two domains from blood and trade (Qud: every sultan has domains that explain the shape of his life) */
export function domainsOf(w, i) {
  const A = w.A, a = BONE_DOMAIN[A.bones[i]] || "war", b = JOB_DOMAIN[JOBS[A.job[i]]] || "earth";
  return a === b ? [a] : [a, b];
}
/** the fixed epithet: the same person always gets the same one (Parry's thrift) */
export function epithet(w, i, long = false) { const d = domainsOf(w, i), k = d[hash32("ep", i) % d.length]; return DOMAIN[k][long ? 1 : 0]; }

// ------------------------------------------------------------------ asides: the most specific true thing about this moment
const HARM = new Set(["death", "vendetta", "brawl", "robbery", "kinslayer", "supplication", "poine"]);
const ASIDE_ON = new Set(["death", "vendetta", "brawl", "robbery", "love", "birth", "return", "heartbreak", "break", "kinslayer", "supplication", "poine", "office", "hunt", "theoxenia", "lethe", "oath", "katharsis"]);
const isKin = (A, i, j) => A.p1[i] === j || A.p2[i] === j || A.p1[j] === i || A.p2[j] === i || (A.kind[i] && A.kind[j] && A.p1[i] >= 0 && (A.p1[i] === A.p1[j] || A.p2[i] === A.p2[j]));
export function aside(e, w, first) {
  if (!w || !ASIDE_ON.has(e.t) || e.a < 0 || hash32("as", e.i) % 3 === 0) return "";
  const A = w.A, a = e.a, b = e.b, h = hash32("aside", e.i), C = [];
  const fa = first(a), fb = b >= 0 ? first(b) : "";
  const add = (score, text) => C.push([score, text]);
  if (b >= 0 && HARM.has(e.t)) {
    if (A.lover[a] === b || A.lover[b] === a) add(5, "They had been lovers.");
    if (isKin(A, a, b)) add(5, "It was their own blood.");
    if (w.xenia) { const k = A.oikos[a] < A.oikos[b] ? A.oikos[a] + ":" + A.oikos[b] : A.oikos[b] + ":" + A.oikos[a]; if (w.xenia[k] !== undefined) add(4, "Their houses had broken bread as guest-friends."); }
    if (A.kind[b] && w.day - A.born[b] < 14 * 12 && A.status[b] >= 2) add(4, `${fb} was a child.`);
  }
  if (A.fury && A.fury[a]) add(4, `The Erinyes were at ${fa}'s back.`);
  if (w.curses && w.curses[A.lineage[a]]) add(3, `${fa} is of a cursed line.`);
  if (A.buried && A.buried[a] >= 5) add(3, `${fa} has buried ${A.buried[a]} of their own Leaves.`);
  if (A.lethe && A.lethe[a] >= 2) add(3, `${fa} has drunk from Lethe ${A.lethe[a]} times and remembers little.`);
  if (A.scar && A.scar[a]) add(2, `${fa} is ${SCARS[A.scar[a]]} now.`);
  if (A.fame && A.fame[a] > 40) add(2, `${fa}'s name is known across the archipelago.`);
  if (A.fame && A.fame[a] < -40) add(2, `They spit at ${fa}'s name in the Agora.`);
  if (A.mystes && A.mystes[a] && e.t === "return") add(4, `${fa} is an initiate, and came back remembering.`);
  if (e.x >= 0 && w.dry && w.dry[e.x] >= 20) add(2, `${DISTRICTS[e.x].name.replace(/^./, (c) => c.toUpperCase())} had not seen rain in ${w.dry[e.x]} days.`);
  const mo = Math.floor((((e.d % 360) + 360) % 360) / 30);
  if (mo === 11 || mo === 0) add(1, `It was the ox-flaying cold of ${MONTHS[mo]}.`);
  if (mo === 4 || mo === 5) add(1, "It was harvest, when the Pleiades rise.");
  if (!C.length) return "";
  const best = Math.max(...C.map((c) => c[0])), top = C.filter((c) => c[0] === best);
  if (best < 2 && h % 5) return "";   // the commonplace is said only now and then
  return " " + top[h % top.length][1];
}

// ------------------------------------------------------------------ dawn formulae for the front page
const DAWN = ["When early-born, rosy-fingered Dawn appeared", "Dawn rose from her bed beside lordly Tithonus", "Saffron-robed Dawn spread over all the earth", "When the light came up over the wine-dark sea",
  "Dawn came golden-throned out of the stream of Ocean", "As the morning star rose, that comes to herald light", "When the sun left the lovely mere and sprang into the brazen sky", "Out of the mist over the Mist-terraces came the day"];
export const dawn = (day) => pick(hash32("dawn", day), DAWN);

// ------------------------------------------------------------------ the Orpheus sings: four forms for four kinds of story
const SIM = {
  fall: ["as an oak falls, or a poplar, or a tall pine on the mountain", "like pines the storm beats down", "as leaves fall when the wind scatters them"],
  crowd: ["as the long waves of the Icarian sea", "as flies about the milk-pails in spring", "as bees pour from a hollow rock"],
  fire: ["as fire runs through a mountain forest", "as the Pyra takes the dry oar-wood", "as the Burning Lake takes the birds that fly over it"],
  grief: ["as the nightingale mourns her son at the edge of spring", "as a hawk-robbed swallow cries over the empty nest", "as the sea moans on the shingle all night"],
  glory: ["as the morning star outshines the others", "as a lion goes down among the cattle", "as the sun climbs the brazen sky"],
};
const FORM = {
  lament: ["death", "widowed", "lastline", "plague", "curse", "blight", "beast", "pharmakos", "restless", "demophon", "wreck", "weight", "lethe", "bloodforblood", "kinslayer", "doom", "stone"],
  praise: ["hunt", "games", "battle", "peace", "liturgy", "legacy", "generation", "firstleaf", "theoxenia", "supplication", "colony", "relic", "mood"],
  hymn: ["oracle", "prophet", "temple", "ruling", "burn", "beam", "prophecy", "festival", "mysteries", "katharsis", "fleece", "expedition"],
  blame: ["nemesis", "secret", "trial", "wrongman", "oathbroken", "antidosis", "riot", "ostracism", "tablet", "turncoat", "revenge", "agrionia", "iron", "psi"],
};
const BLAME_DEED = { revenge: "paid back a wrong with a wrong", nemesis: "grew fat on the city's bread", oathbroken: "swore an oath with a crooked tongue", trial: "stood on the hill of Ares", wrongman: "was judged by men who could not see",
  secret: "kept a thing in the dark", antidosis: "would sooner lose a house than pay the city", tablet: "wrote a neighbour's name on lead", turncoat: "changed colours like the cuttlefish", riot: "threw the first stone in the street",
  ostracism: "was written on the potsherds", agrionia: "fled the priest's sword", iron: "was born into the Iron race", psi: "wanted a seat that was not there" };
const LAMENT_LINE = { lethe: "you came back from the Meadow a stranger", weight: "you have outlived your own Leaves again", curse: "your line is cursed, and still you walk", stone: "brother broke brother in the furrows",
  wreck: "the sea took the ship and the grain", restless: "you cannot go down to the Meadow", bloodforblood: "blood was paid with blood", kinslayer: "your hand found your own blood", doom: "the walls dripped blood, as the seer said", demophon: "you were held in the fire to be made deathless" };
const formOf = (kind) => Object.keys(FORM).find((f) => FORM[f].includes(kind)) || "praise";
/** each city sings in its own manner (Dwarf Fortress poetic forms): a name, a measure and a refrain */
export function cityForm(k) {
  const h = hash32("form", k);
  return {
    name: pick(h, ["the long dirge", "the rowing-song", "the threshing chant", "the bone-measure", "the reed-lament", "the night-hymn", "the shield-song", "the loom-song"]),
    measure: pick(h >>> 4, ["in falling threes", "in six heavy feet", "in short breaths", "in pairs, call and answer", "in a single unbroken line"]),
    refrain: pick(h >>> 8, ["Ai, ai, the Leaves.", "Only fire unmakes.", "Pull, and the sea forgets.", "The Meadow keeps the oar.", "Hear us, earth, mother of all.", "And the women wailed in answer.", "Bone remembers."]),
  };
}
/** a short poem for a front-page story; actors named by first name only */
export function poem(story, w, first) {
  const f = formOf(story.kind), h = hash32("poem", story.id), a = story.actors && story.actors[0] >= 0 ? first(story.actors[0]) : null;
  const b = story.actors && story.actors[1] >= 0 ? first(story.actors[1]) : null, where = (story.text.match(/in (the [A-Z][\w' ]+|[A-Z][\w']+)/) || [])[1] || "the archipelago";
  const ep = a && story.actors[0] < 9999 && w ? epithet(w, story.actors[0]) : "mortal";
  const L = [];
  if (f === "lament") {
    L.push(a ? `${a}, ${ep}, ${LAMENT_LINE[story.kind] || `you were lost from life ${pick(h, ["too young", "too soon", "before the vintage", "in a hard season"])}`},` : `Who will count the dead of ${where}?`);
    const special = !!LAMENT_LINE[story.kind];
    L.push(special ? `and ${b || "the city"} ${pick(h >>> 3, ["will not forget it", "keeps the ash", "wakes at night remembering", "has no word for it"])}.` : `and you leave ${b ? b : "us"} ${pick(h >>> 3, ["alone in the halls", "to the long nights", "to the bread-queue and the cold hearth", "to keep your oar on the mound"])}.`);
    L.push(special ? `It came ${pick(h >>> 5, SIM.fire)};` : `You fell ${pick(h >>> 5, SIM.fall)};`);
    L.push(`and we ${pick(h >>> 7, ["mourn", "cry out", "sing"])} ${pick(h >>> 9, SIM.grief)}.`);
  } else if (f === "praise") {
    L.push(a ? `Sing, ${pick(h, ["Muse", "daughter of Memory", "oak of Dodona"])}, of ${a}, ${ep},` : `Sing of ${where}, and of the day,`);
    L.push(`${pick(h >>> 3, ["who went out", "who stood up", "who did not turn back"])} ${pick(h >>> 5, SIM.glory)},`);
    L.push(`and the people roared ${pick(h >>> 7, SIM.crowd)}.`);
    L.push(`${pick(h >>> 9, ["Let the tripod stand in the hall.", "Let the Leaves remember it when we are bone.", "Let the oar be carved with it.", "Pour the wine; it is done."])}`);
  } else if (f === "hymn") {
    L.push(`I begin to sing of ${pick(h, ["the Maker, who sows and burns", "Zeus Naios, who speaks in the oak", "Phoibos, far-shooter", "Hecate of the crossroads", "the Great Gods of Samothrace"])},`);
    L.push(`who ${pick(h >>> 3, ["touched", "remembered", "turned towards", "did not forget"])} ${a || where}, ${pick(h >>> 5, ["and the oak trembled", "and the visors spoke", "and the fire answered", "and the doves flew right"])}.`);
    L.push(`${pick(h >>> 7, ["Hear me, if ever I burned the fat thigh-bones for you:", "Hear me, who hold the Mist-terraces:", "Hear me, binder and loosener:"])}`);
    L.push(`${pick(h >>> 9, ["keep the fire from our bones.", "give us back the ones Lethe took.", "let the Leaves outlive their parents' grief.", "and so farewell; I will remember you, and another song too."])}`);
  } else {
    L.push(`${pick(h, ["Listen, you who sit on the benches:", "I will tell you a story, Boule, a fable:", "Day-sleeper, thief, I know your name:"])}`);
    L.push(a ? `${a} ${BLAME_DEED[story.kind] || pick(h >>> 3, ["laughed with jaws not their own", "counted obols while the Leaves went hungry"])},` : `The hawk said to the nightingale: one far stronger holds you,`);
    L.push(`${pick(h >>> 5, ["but Justice runs beside the crooked judgement,", "but the half is more than the whole,", "but Horkos runs beside the oath-breaker,", "but the gods hide a man's living from him,"])}`);
    L.push(`${pick(h >>> 7, ["and the Agora will remember it when the stone falls.", "and the fool learns by suffering.", "and Nemesis has a long memory.", "and the boneless one climbs the mast at last."])}`);
  }
  return { form: f, lines: L };
}

/** the month as a catalogue (Il. 2; the Hesiodic "or such as..."): one line for each of the month's greatest stories */
export function catalogue(stories, first) {
  const top = stories.slice().sort((a, b) => b.score - a.score || a.day - b.day).slice(0, 7);
  if (!top.length) return [];
  const lines = [`Sing, daughter of Memory, the month just gone, and who did what in it:`];
  top.forEach((x, k) => { const a = x.actors && x.actors[0] >= 0 ? first(x.actors[0]) : null, t = x.title.charAt(0).toLowerCase() + x.title.slice(1);
    lines.push(`${k === 0 ? "first" : "or such as"}: ${t}${a ? ", " + a : ""};`); });
  lines.push("these the month carried down to the sea, and the sea forgets nothing it is sung.");
  return lines;
}
