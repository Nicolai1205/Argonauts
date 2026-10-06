// The chronicle: deterministic procedural prose (Caves of Qud / Tracery style). No LLM; the same event always reads the same.
import { DISTRICTS, OFFICES, COGNOMENS, AXES, GOODS } from "./lore.js";
import { hash32 } from "./rng.js";
import { speak } from "./drift.js";

const PRE = ["Agath", "Alk", "Andr", "Antim", "Ari", "Arch", "Chrys", "Dem", "Di", "Eu", "Eur", "Herm", "Hipp", "Kall", "Kle", "Krat", "Lys", "Lyk", "Mel", "Men",
  "Nik", "Phil", "Pol", "Pyth", "Sos", "The", "Tim", "Xen", "Ast", "Kte", "Phaid", "Glauk", "Thras", "Peis", "Neo", "Akest", "Dor", "Ers", "Hyps", "Ikar"];
const SUF = ["on", "os", "ias", "ides", "ippos", "krates", "medes", "nikos", "phon", "stratos", "dotos", "genes", "kles", "laos", "machos", "menes", "doros", "ope", "eia", "ion"];
/** a stable Greek name for every token */
export function nameOf(tok) { const h = hash32("name", tok); return PRE[h % PRE.length] + SUF[(h >>> 8) % SUF.length]; }
/** patronymic from a parent's name: Glaukphon -> Glaukphonides, Archos -> Archides */
export const patronym = (name) => name.replace(/(ippos|os|as|es|is|ias|ope|eia|ion|a|e|o)$/, "") + "ides";
export const ARGO_N = 9999;
/** display name of any entity: tokens "Name #id", Leaves "Name Patronymides ~n" */
export function displayName(A, i, cognomens) {
  if (i < ARGO_N) return `${nameOf(i + 1)} #${i + 1}${A.cognomen[i] ? " " + cognomens[A.cognomen[i]] : ""}`;
  const rules = displayName.dialects ? displayName.dialects[A.dialect[i]] : null, born = A.born[i];
  return `${speak(nameOf(i + 1), rules, born)} ${speak(patronym(nameOf(A.p1[i] + 1)), rules, born)} ~${i - ARGO_N + 1}${A.cognomen[i] ? " " + cognomens[A.cognomen[i]] : ""}`;
}

// three voices; every event type has several lines per voice, picked by the event id
const T = {
  death: {
    "died of old age": ["{a} died of old age at {v}, surrounded by the bones who sowed them. The Leaves fall; the Sown remain.", "Old age took {a} at {v}. They burn on the Pyra tonight and the family keeps the ashes.", "{a} lived {v} years, which is long for a Leaf. The Argonauts who knew them as a child have not aged a day."],
    "died in infancy": ["A child of the {fa}, {a}, died before their fifth year. The Sown parents do not understand grief, and learn it.", "{a} lived only {v} years. As is the generation of leaves, so is that of men."],
    "a sudden fever": ["A fever took {a} at {v}. Leaves fall early sometimes.", "{a}, only {v}, burned with fever for a night and then on the Pyra."],
    starved: ["{a} starved in {where}. The grain was in the stores; {a} had no obols to reach it.", "Hunger took {a} of the {fa}. Nobody kept count of the days.", "{a} lay down by the road in {where} and the crows were patient."],
    plague: ["The Gorgon-snake's sickness rotted {a} from within, as it rotted Mopsus in Libya.", "{a} died of the fever. The herbalists had no more of the Prometheion to sell.", "The flesh fell from {a} before the bones did. The plague moves on through {where}."],
    "cut down in the riot": ["{a} was cut down when the Reapers broke the crowd in {where}.", "A Reaper's blade found {a} in the riot. {fa} will remember the face that held it."],
    brawl: ["{b} beat {a} to death over an insult in {where}.", "A quarrel in {where} ended with {a} in the dust and {b} walking away."],
    "answered the Sirens": ["{a} heard the song from Anthemoessa and walked into the meadow of bones. Like Butes, {a} did not look back.", "The Sirens sang and {a} of the {fa} answered. The flowers there grow from such as {a}."],
    "slain by an ally in the dark": ["In the dark, {b} took {a} for an enemy and killed an ally, as Jason killed King Cyzicus.", "{a} died at a friend's hand in the night; at dawn both sides saw what they had done."],
    "murdered in the night of knives": ["{a} was murdered in the night of knives. In the morning the killers told visitors the dead had only gone away.", "The Lemnian deed came to {where}: {a} died in bed, by a hand that had broken bread with {a}."],
    _: ["{a} died ({s}).", "Death came for {a} of the {fa} in {where}."],
  },
  return: ["{a}'s bones re-knit in the Asphodel Meadow and walked back to {where}. Only fire unmakes the Sown.", "Like Aethalides, who passes between the living and the dead, {a} rose from Asphodel and returned to {where}.", "{a} was broken and is whole again ({v}×). The {fa} made room at the fire, but no one sat close."],
  birth: ["{a} and {b} sowed a child in {where}: {c}. A Leaf, born to bone.", "A child for the {fa}: {c}, born to {a} and {b}. It will grow old; its parents will not.", "{c} was born in {where} to {a} and {b}{first}."],
  comeofage: ["{a} came of age."],
  prophet: ["{a} came down from {where} with a new god: {god}. Those who follow call themselves {people}.", "After what happened, {a} began to preach {god}. By evening, {people} had a name and a first congregation."],
  convert: ["{a} took up the faith of {s}, brought to it by {b}.", "{b} spoke to {a} late into the night; by morning {a} belonged to {s}."],
  faithdies: ["The last of {s} has gone. Their god goes unworshipped."],
  temple: ["{s} raised a temple in {where}.", "In {where}, {s} built their god a house of stone."],
  faithschism: ["{a} broke away from {s2} and founded {s1}.", "Schism: {s1}, led by {a}, no longer prays with {s2}."],
  festival: ["{s}: {v} Minyans keep the day.", "The city keeps {s}. {v} feast."],
  monument: ["The Boule raised {s} in {where}.", "In {where} a stone now stands: {s}."],
  iconoclasm: ["Rioters led by {a} tore down {s} in {where}.", "{s} lies in pieces in {where}; {a} struck the first blow."],
  war: ["War: {s}. The levies march.", "{s} has begun. Spears are counted in both cities."],
  battle: ["A battle in {where}: {w1} carried the field. {d1} Leaves dead, {b1} Argonauts broken.", "Battle at {where} in {w0}: {w1} won the day. The Pyra will be busy: {d1} Leaves dead, {b1} Argonauts broken."],
  peace: ["{w0} is over: {w2}. {d1} Leaves died; {b1} Argonauts were broken.", "Peace: {w2}. That ends {w0}."],
  revolt: ["{s}: the vassal rises against its lord.", "Revolt! {s}."],
  incident: ["{s}", "Bad blood at the border: {s}"],
  craft: ["{s}. Their masters are spoken of across the sea.", "{s}: apprentices arrive from other cities to learn."],
  craftlost: ["{s}. Too few practise it now; the old masters die and take the knowledge with them.", "{s}, like the Tasmanians who forgot the fishhook."],
  dialect: ["In {where} they have begun to say {s}. The old people complain.", "The speech of {where} drifts: {s}."],
  rumor: ["The story has changed in the telling. In {where} they now say: \"{s}\"", "Heard in {where}, from {a}: \"{s}\""],
  rumorend: ["The talk has died down. {v} heard it; the last version was: \"{s}\"", "Nobody repeats it any more ({v} heard): \"{s}\""],
  burn8985: ["{a} did not go to the Pyra like the others. The Maker built a barrel of oil for {a} alone, and it burns beside the pyre; the smoke is black and smells of the old world."],
  burn: ["{a} was given to the Pyra. The bones burn bright on the shore; {b} inherits what was left.", "On the chain they sent {a} to the dead address. On the shore the Pyra took {a}, and the smoke went up for days.", "{a} of the {fa} burns. Ash falls on {where}, and Charon is owed nothing; the fire took it all."],
  ostologia: ["The fire under {a} has gone out. The bones were gathered and an oar was planted on the mound in the Asphodel Meadow.", "Ostologia for {a}: ash raked, bones gathered, oar set upright. Elpenor asked for no more."],
  xenia: ["{a} was exchanged under the law of xenia and now sleeps under a stranger's roof.", "A swap at the Agora: {a} passed hand to hand, a hostage of guest-friendship."],
  gold: ["{a} was sold for {eth} ETH. Gold from Colchis now weighs in {a}'s purse.", "A new house paid {eth} ETH for {a}. In the Agora they say whatever the Fleece touches turns to coin."],
  beam: ["The beam of Dodona in the Argo's prow spoke with a human voice: \"{s}\". Every Minyan turned toward {dir}.", "The Argo speaks. Over the whole archipelago, one sentence: \"{s}\". The augurs tear their robes; some Minyans weep, some grin.", "The ship's oak spoke again, \"{s}\", and the city's mind shifted toward {dir}."],
  ruling: ["The Maker reached into the world and remade {a}. What was is unwritten; what is was decreed.", "A ruling of the Maker fell on {a}. The {fa} call it a blessing; others call it a theft of fate."],
  deed: ["The Maker worked the loom of the world ({v} deeds). Small things changed that no one can name.", "There was movement in the Maker's workshop today; {v} threads were pulled."],
  star: ["A new star was set in the sky above the Argo. The Mopsus says it is shaped like a contract.", "The Maker raised a new tower of stone ({s}). Its purpose is not yet spoken."],
  toll: ["The Death-clock tolled once over the Asphodel Meadow. The Reapers looked up from their spades.", "The DeadClock spoke. Somewhere a fire's age was written down."],
  riot: ["{where} rose: {v} Minyans in the street, led by {a}. {r}", "Riot in {where}. {a} threw the first stone, like Jason among the Sown, and {v} followed. {r}", "Hunger and grievance spilled into {where}: {v} rioters, {a} at their head. {r}"],
  defect: ["{a} left the {bfa} and swore to {s}.", "{a} turned their back on their blood and joined {s}. Their old kin spit when the name is spoken."],
  schism: ["The {pfa} split. {a} founded {s} and took the disaffected along.", "A schism: {a} walked out of the {pfa} with followers behind and named them {s}."],
  dissolve: ["{s} is no more; its last members crept back to their blood.", "{s} dissolved like salt in the sea."],
  election: ["The Boule sat. The coalition is now: {s}.", "New seats in the Boule: {s} hold the helm."],
  law: ["New law: {s}", "The Boule decreed: {s}"],
  office: ["{a} became {s}, {role}.", "The office of {s} ({role}) passed to {a}."],
  ostracism: ["The ekklesia scratched {a}'s name on {v} bone shards. {a} is ostracized for sixty days.", "Ostrakismos: {a} is cast out. Hated by many, missed by few."],
  funeral: ["{b} buried {a}. Two obols for Charon, one for the spade.", "Prothesis, ekphora, a coin under the tongue: {a} is properly dead."],
  unburied: ["{a} lies unburied nine days in Asphodel; there was no coin for Charon. Like Patroclus, {a} cannot cross.", "No one paid {a}'s fare. The shade wanders the meadow and the living hear it at night."],
  break: ["{a} broke: {s}.", "Stress cracked {a}, who {s}."],
  brawl: ["{a} and {b} fought in {where}. Both limp now; neither will forget.", "An insult, a fist, blood in {where}: {a} and {b}."],
  robbery: ["{a} robbed {b} of {v} obols in {where}{caught}.", "Pirate's work: {a} took {v} obols from {b}{caught}."],
  pall: ["A Pall of Darkness fell on the world: black chaos from heaven, no stars, no fire. Nothing was made tomorrow.", "The light went out. For a day the Minyans rowed blind."],
  harpies: ["Harpies came over {where} and fouled the stores: {v} rations ruined.", "Wings in {where}. The Harpies took what they could and befouled the rest, {v} rations gone."],
  plague: ["Plague in {where}. A snake bred from the Gorgon's blood bit {a}, and {v} already sicken.", "The rot came to {where}: {v} fall ill. The herbalists raise their prices."],
  sirens: ["The Sirens sang from Anthemoessa. {v} answered and did not come back.", "No Orpheus sang over the waves, and the Sirens took {v} of the weary."],
  sirens_sung: ["The Sirens sang, and {a}, the Orpheus, sang louder. None of the {v} who heard them was taken.", "{a} drowned the Siren song with the lyre; {v} who would have leapt stayed aboard."],
  talos: ["Talos walks the Clashing Rocks again. Trade through the strait costs a third more.", "The bronze giant guards the strait. Prices in the Agora rise."],
  doliones: ["The Night of the Doliones repeated in {where}: {s1} and {s2} fought each other in the dark. {v} dead. At dawn, joint mourning.", "Allies mistook each other in {where}: {s1} against {s2}. {v} fell. The games for the dead last three days."],
  featherbolts: ["The birds of Ares shot their feathers over {where}; {v} were wounded.", "Feather-bolts rained on {where}. The Gegeneis raised their shields too late."],
  ghost: ["A shade rose from its tomb over {where} to look at the living. No one slept.", "The dead walked {where} at night. Children say it was looking for its fare."],
  lemnian: ["The Lemnian deed: {s} murdered {v} of their neighbours in {where} in a single night. {a} was seen washing their hands.", "Night of knives in {where}. {s} left {v} dead in their beds and told the morning they had gone to Thrace."],
  bounty: ["A bountiful season in {where}: the soil gave double and the {fa} feasted.", "The fields of {where} overflowed. For once, nobody was hungry there."],
  prometheus: ["Screams from the Caucasus: the eagle is at Prometheus' liver again. Anthemoessa's herbalists harvest the Prometheion while the earth bellows.", "Prometheus screamed all day. The Gegeneis shut their doors; the Medea's guild doubled its pharmaka."],
  famine: ["Famine: {v} Minyans go hungry.", "{v} Minyans are starving while the granaries stand full."],
  crash: ["Bread costs {price} obols in the Agora, triple the old price.", "The price of food has tripled: {price} obols a ration."],
  fleece: ["The Golden Fleece: {s}. ({a})", "News of the Fleece-bearer {a}: {s}."],
  exile_end: ["{a} returned from exile to {where}.", "The sixty days are over; {a} came home."],
  budget: ["The Boule split the treasury: {v} obols in dole, with the {s} as proposer taking the lion's share.", "Budget day. {s} proposed, and {v} obols went to the coalition's hungry and loyal."],
  migrate: ["{v} Minyans left trades that no longer fed them and went where {s} sells.", "A migration: {v} hands follow the price of {s}."],
  dole: ["The grain dole fed {v} hungry Minyans today, paid from the treasury.", "{v} bowls of barley from the Boule's stores."],
  hostage: ["{a} is held in escrow, a hostage of the Agora."],
  love: ["{a} and {b} fell in love in {where}. The {fa} pretend not to notice.", "In {where}, {a} and {b} have become each other's whole world.", "{a} carved {b}'s name into a rib-bone and gave it away. They walk together at dusk now."],
  heartbreak: ["{a} and {b} are done. Nobody in {where} dares mention it.", "The love between {a} and {b} curdled into silence."],
  cognomen: ["{a} is now called {c}."],
};
const DIRS = (code) => { const ax = Math.floor(code / 2), up = code % 2 === 0; return AXES[ax][up ? 0 : 1]; };

/** render one event; view = { name(i), faction(i)->name, factionById(k)->name } */
const BROKEN = ["{a} was broken in {where} ({s}). The bones lie scattered in Asphodel and will knit again; only fire unmakes the Sown.",
  "{a} of the {fa} fell ({s}). Their bones go to the Asphodel Meadow to mend.", "Broken, not dead: {a} ({s}). The Reapers carry the pieces to Asphodel."];
export function narrate(e, view) {
  const h = hash32("tx", e.i, e.t);
  let set = e.t === "burn" && e.a === 8984 ? T.burn8985 : e.t === "death" && e.a >= 0 && e.a < 9999 && !["answered the Sirens"].includes(e.s) ? BROKEN : T[e.t]; if (!set) return `${e.t} (${e.s || ""})`;
  if (!Array.isArray(set)) set = set[e.s] || set._;
  let tpl = set[h % set.length];
  const who = (i) => (i >= 0 ? view.name(i) : "someone");
  let riot = "";
  if (e.t === "riot") { try { const x = JSON.parse(e.s); riot = `${x.dead ? x.dead + " fell. " : ""}${x.jailed ? x.jailed + " were jailed" : "No Reaper stood in their way"}, and ${x.looted} rations were looted.`; } catch { } }
  const [s1, s2] = (e.s || "").split("|");
  const map = {
    a: who(e.a), b: who(e.b), c: e.t === "birth" ? who(e.v) : (e.t === "cognomen" ? COGNOMENS[e.v] : ""), first: e.s === "first" ? ", the first Leaf of their line" : "", where: e.x >= 0 ? DISTRICTS[e.x].name : "the archipelago", fa: e.a >= 0 ? view.faction(e.a) : "Minyans",
    bfa: e.a >= 0 ? view.blood(e.a) : "", pfa: e.a >= 0 ? view.blood(e.a) : "", s: e.s || "", v: e.v, r: riot, s1, s2,
    god: e.t === "prophet" ? (e.s || "").split("|")[1] : "", people: e.t === "prophet" ? (e.s || "").split("|")[0] : "",
    w0: ["battle", "peace"].includes(e.t) ? (e.s || "").split("|")[0] : "", w1: e.t === "battle" ? (e.s || "").split("|")[1] : "", w2: e.t === "peace" ? (e.s || "").split("|")[1] : "",
    d1: ["battle", "peace"].includes(e.t) ? (e.s || "").split("|")[e.t === "battle" ? 2 : 2] : "", b1: ["battle", "peace"].includes(e.t) ? (e.s || "").split("|")[3] : "",
    eth: (e.v / 100).toFixed(2), price: (e.v / 100).toFixed(1), dir: e.t === "beam" ? DIRS(e.v) : "", caught: e.s === "caught" ? ", and the Reapers caught them" : "",
    role: e.t === "office" ? OFFICES[e.v].role : "",
  };
  const out = tpl.replace(/\{(\w+)\}/g, (_, k) => (map[k] !== undefined ? map[k] : ""));
  return out.charAt(0).toUpperCase() + out.slice(1);
}

/** voice of an event, used to colour the chronicle */
export const VOICE = { death: "horror", burn: "horror", unburied: "horror", plague: "horror", lemnian: "horror", ghost: "horror", sirens: "horror", doliones: "horror", harpies: "horror",
  featherbolts: "horror", prometheus: "horror", ostologia: "myth", return: "myth", beam: "myth", ruling: "myth", star: "myth", toll: "myth", deed: "myth", pall: "myth", talos: "myth",
  sirens_sung: "myth", xenia: "myth", gold: "realism", riot: "realism", election: "realism", law: "realism", office: "realism", ostracism: "realism", budget: "realism", famine: "realism",
  crash: "realism", migrate: "realism", dole: "realism", defect: "realism", schism: "realism", dissolve: "realism", robbery: "realism", brawl: "realism", break: "realism", funeral: "myth",
  bounty: "myth", fleece: "myth", exile_end: "realism", love: "myth", heartbreak: "realism", birth: "myth", comeofage: "realism", prophet: "myth", convert: "myth", faithdies: "myth", temple: "myth", faithschism: "myth", festival: "myth", monument: "myth", iconoclasm: "realism", war: "realism", battle: "horror", peace: "realism", revolt: "realism", incident: "realism", craft: "realism", craftlost: "realism", dialect: "realism", rumor: "horror", rumorend: "realism" };
