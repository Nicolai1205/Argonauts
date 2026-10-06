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
    vengeance: ["{b} killed {a} in {where}: blood for blood. The feud goes on, or it ends here.", "{a} died on {b}'s blade in {where}. It was owed, {b} says."],
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
  relic: ["A relic is made: {s}, held by {a}.", "{a} now carries {s}."],
  relicpass: ["{r1} passed to {a}: {r2}.", "{a} now holds {r1} ({r2})."],
  expedition: ["{e1} {e2}. Their champion is {a}.", "The war-band of {e1}, led by {a}, {e2}."],
  fleecetaken: ["{a} of {e1} carried the Fleece-bearer {b} out of {e2}. The Golden Fleece now shines over {e1}.", "The Fleece is taken! {a} brought {b} from {e2} to {e1}. In {e2} they are already sharpening spears."],
  caravan: ["Grain from {e1} reached starving {e2}: {v} rations.", "A fleet of grain-ships from {e1} came into {e2} with {v} rations; the bread queues shortened."],
  raid: ["Pirates fell on the {e3} from {e1} to {e2} and took {e4} loads.", "{a} and the pirates took {e4} loads of {e3} off the {e1}–{e2} run."],
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
  watch: ["The Tiphys sent {v} Reapers from {s} to keep the watch in {where}.", "{v} Reapers marched out of {s} with lanterns and staves, bound for the angry streets of {where}."],
  dole: ["The grain dole fed {v} hungry Minyans today, paid from the treasury.", "{v} bowls of barley from the Boule's stores."],
  hostage: ["{a} is held in escrow, a hostage of the Agora."],
  love: ["{a} and {b} fell in love in {where}. The {fa} pretend not to notice.", "In {where}, {a} and {b} have become each other's whole world.", "{a} carved {b}'s name into a rib-bone and gave it away. They walk together at dusk now."],
  heartbreak: ["{a} and {b} are done. Nobody in {where} dares mention it.", "The love between {a} and {b} curdled into silence."],
  cognomen: ["{a} is now called {c}."],
  kinslayer: ["{a} spilled kindred blood: {b}. The hearth of their house is cold tonight, and the Erinyes have the scent.", "Kin-murder in {where}. {a} killed {b}, their own blood. Nobody will eat from {a}'s hand now."],
  erinyes: ["The Erinyes have found {a}. Dog-faced, snake-haired, dripping from the eyes: only {a} can see them, and {a} cannot stop seeing them.", "{a} wakes screaming in {where}. The Kindly Ones, who are not kind, are crouched at the foot of the bed."],
  katharsis: { _: ["{a} sat silent at {b}'s hearth with a sword in the earth, and was washed in a piglet's blood. The stain is lifted.", "{b} purified {a} with sea-water, sulphur and the blood of a suckling pig, as Circe once purified Jason. {a} may enter the temples again."],
    furies: ["{a} crawled to {b}'s altar with the Furies at their heels. Blood on blood, water on blood, sulphur and laurel: by dawn the Erinyes had gone back under the earth.", "After {v} stains and many nights of hounding, {a} was cleansed by {b}. The dogs of the earth have lost the scent."],
    kindly: ["The Erinyes let {a} go at last. Some say they were bribed with honey and black ewes; some say they were simply bored. They are called the Kindly Ones, to be safe.", "{a} slept a whole night without screaming. The Furies have turned away, as they turned from Orestes."] },
  poine: { leaf: ["{a} paid {b} {v} obols, the price of a Leaf's life. The elders weighed it and called it straight. The blood is settled, if not forgotten.", "The blood-price for a mortal child: {v} obols, counted out by {a} into {b}'s hands before the elders in {where}."],
    bone: ["{a} paid {b} {v} obols for breaking their kin. Half the price of a Leaf: bone knits, and the law knows it.", "The elders of {where} set the price for broken bone at {v} obols. {a} paid it; {b} took it, and spat."] },
  vendetta: { sworn: ["{a} swore by the Styx to repay {b} in blood. They have stopped eating with the family.", "{a} refused the blood-price. {b} has been seen checking over their shoulder in {where}."],
    feud: ["The feud runs on: {a} has sworn vengeance on {b}. Blood {v} times now between these houses.", "Again: {a} against {b}. In {where} they count the feud in funerals; this is its {v}th."],
    wounded: ["{a} caught {b} alone in {where} and left them bleeding. Not dead. Not yet.", "{a} struck at {b} in {where}. The wound will close; the debt has not."] },
  supplication: { spared: ["{a} fell at {b}'s feet and clasped their knees, as Priam clasped Achilles'. {b} raised them up. The blood between them is set aside.", "Before everyone in {where}, {a} took {b} by the knees and the chin and begged. {b} wept, and spared them."],
    refused: ["{a} clasped {b}'s knees and begged for life. {b} kicked free.", "{a} begged {b} for mercy in the street. {b} walked away without a word."],
    altar: ["{a} took refuge at the altar and clasped {b}'s knees there. {b} refused them at the god's own table. The stain of it is on {b} now.", "Refused at the altar: {b} turned away {a}, a suppliant under the god's protection. The priests have covered their heads."] },
  restless: { murdered: ["The shade of {a} has not gone down to Asphodel. It stands at crossroads in {where}, wanting {b}.", "{a} was killed and has not stopped walking. Doors in {where} are painted with pitch, and {b} sleeps badly."],
    untimely: ["{a} died before their time and walks the lanes of {where} at dusk, one of the aōroi, the too-soon dead.", "Mothers in {where} hang buckthorn on the doors: the child {a} is restless, and comes to the window at night."],
    anthesteria: ["On the last day of the Anthesteria the households of the archipelago swept their doors and cried: Out, Keres! The Anthesteria is over! {v} restless shades went back down.", "Pots of seed-porridge for Hermes of the Underworld, and then the cry at the doors: {v} wandering dead are laid to rest until next year."] },
  liturgy: { sitonia: ["{a} answered the city's hunger: {v} obols of grain bought and carried to the hungry of {where}. The Boule named them; they paid beyond the minimum.", "The liturgy of grain fell to {a} this month. {v} obols of barley went from their jars to the bread-queues of {where}."],
    trierarchy: ["{a} paid the rowers of {where} for a month of convoy: {v} obols. The pirates will find the lanes guarded.", "A trierarchy for {a}: {v} obols in wages, a hull caulked and manned, and a month of safe water for {where}."],
    choregia: ["{a} paid for the chorus and the feast in {where}: {v} obols into the hands of the poor who sang.", "{where} danced at {a}'s expense this month. {v} obols, and the city will remember the name."],
    refused: ["{a} was named to a liturgy in {where} and refused it. Doors close when {a} walks past.", "{a} would not pay the city's due. In {where} they spit when the name is spoken."],
    boule: ["The Boule's grain fleet put into {where}: {v} obols of bread from the treasury for the hungry.", "From the treasury, {v} obols of grain for {where}, where the queues were longest."] },
  antidosis: { took: ["Named to a liturgy, {a} pointed at {b}: richer, and not named. {b} grumbled, and paid.", "Antidosis in {where}: {a} challenged {b} to take the duty, and {b} took it rather than open the storerooms."],
    swap: ["Antidosis in {where}: {a} challenged {b} to take the liturgy or exchange estates. {b} chose the exchange. {a} now holds {v} obols, and {b} {a}'s old house.", "The rarest thing in the law: {a} and {b} swapped their whole estates rather than settle who should pay the city."] },
  xenoi: { spears: ["On the field at {where}, {a} and {b} saw each other across the spears. Their houses are guest-friends. They lowered their weapons, as Glaukos and Diomedes did, and {v} were spared.", "Guest-friendship held in battle at {where}: {a} would not strike the house of {b}, and {v} of the levy walked away alive."],
    gift: ["{a} sent {b} a guest-gift of {v} obols across the sea. Their houses have been xenoi since a sale on the chain.", "A gift between guest-friends: {v} obols from {a} to {b}, and a promise of a bed if ever either is exiled."],
    violated: ["{a} killed {b}, though their two houses are bound by guest-friendship. Zeus Xenios saw it. This is the worst stain there is.", "Guest-murder: {a} spilled the blood of {b}, whose house has shared bread and salt with theirs. The priests will not say the killer's name."] },
  theoxenia: { blessed: ["A beggar knocked at {b}'s door in {where} and was fed. In the morning the beggar was gone, and {v} obols were under the bowl. The beggar was {a}, of the Golden Race.", "{b} gave their bread to a ragged stranger. The stranger was {a}, a Chryseos walking in disguise, and {b} is {v} obols richer."],
    cursed: ["{b} drove a beggar from the door in {where} with a stick. The beggar was {a}, of the Golden Race, and {b} has been sick since.", "A stranger asked {b} for water and was refused. That night {b} fell ill. The stranger, {a}, watches from the mist."] },
  wreck: ["A ship carrying {e3} from {e1} to {e2} went down in the swell: {v} loads lost, and the crew washed up on the rocks.", "The sea took {v} loads of {e3} on the run from {e1} to {e2}. Out of season, as Hesiod warned: a perilous thing."],
  lethe: { beloved: ["{a} came back from Asphodel and looked at {b} as at a stranger. The shade drank from the white cypress spring; whatever was between them is under the water now.", "She came back and did not know him: {a} walked out of the Meadow and past {b} in the street. {v} bonds forgotten, and the beloved among them."],
    child: ["{a} re-knit and came home, and did not know their own child, {b}. The Leaf stood at the door and was asked its name.", "Lethe took the child from {a}'s memory: {b} called after them in {where} and {a} did not turn."],
    memory: ["{a} came back from Asphodel remembering everything: the asphodel, the dark, the password at the spring of Memory. Initiates say less, after.", "{a} re-knit and asked first for the people they loved, by name. The initiated drink from the lake of Memory."] },
  oath: { vengeance: ["{a} swore on the Styx, the oath that binds the gods, to have {b}'s life.", "By black Styx and the Erinyes who witness oaths: {a} will take {b}, or let their house be cursed."],
    love: ["{a} swore to {b} by Hera of the yoke: a year and a day, and longer.", "{a} and {b} broke a knucklebone in two and each kept half: an oath."],
    broken: ["{a} broke their oath to {b}. The wax images melt: may their seed flow away like these. The curse is on the line of {a} for three generations.", "Oath-breaker: {a} did not keep faith with {b}. There is a curse now on every Leaf of {a}'s line, as on Glaucus' house, of which nothing remains."] },
  curse: { fulfilled: ["{a} died young, of a cursed line. It is the {v}th death since {b} broke their oath. The old women count them.", "The curse on {b}'s line took {a}. Nobody in {where} is surprised any more."],
    lifted: ["The curse on the line of {a} has lifted after {v} deaths. Three generations, as the oath said.", "Whatever was owed for {b}'s broken oath has been paid: the curse on the house of {a} is spent."] },
  weight: ["{a} has outlived {v} of their own Leaves now. The latest was {b}. The Sown do not age; they only accumulate.", "{a} buried {b}: the {v}th child of their line they have carried to the Pyra. They have started to leave the names out of their prayers."],
  memory: { "core-": ["Something hardened in {a} today, remembering {s}.", "{a} keeps returning to it: {s}. It has changed them."], "core+": ["Something in {a} softened for good today, remembering {s}.", "{a} thinks often of {s}, and is gentler for it."], _: ["{v} years ago today: {s}. {a} has not forgotten {b}.", "On this day, {v} years ago, {s}. {a} walks to the same place every year."] },
  scar: { _: ["{a} broke, and came out of it {s}.", "Something in {a} healed crooked: they are {s} now."] },
  mysteries: { _: ["The mysteries of the Kabeiroi: {v} were initiated this year, with the rites that may not be spoken, and given the password for the spring of Memory.", "{v} Minyans went down into the hall of the Great Gods and came up initiated. When they break, they will remember."],
    kin: ["The mysteries: {v} initiated. Each had to confess the worst thing they had done. {a} confessed to kindred blood, aloud, before the Great Gods, and was initiated anyway.", "{v} initiates this year. The priests heard {a} confess to killing their own kin, and still poured the water of Memory."],
    blood: ["The mysteries: {v} initiated. {a} confessed to blood on their hands before the Great Gods. Somebody in the hall wrote it down.", "{v} took the rites. Asked their worst deed, {a} named a killing. The Kabeiroi do not judge; the listeners do."] },
  shadenames: ["In {where} the shade of {a} came to the window and named its killer: {b}. Everyone heard.", "A dead child's voice in the well at {where}, saying one name, over and over: {b}."],
  pharmakos: { _: ["In {where} the sickness would not lift, so they chose two of the least, {a} and {b}, fed them figs and barley, beat them with squill and drove them out of the gates. The city is clean now. So they say.", "The pharmakos: {a} and {b}, chosen because nobody would miss them, were led around {where} and cast out to carry its stain away."],
    famine: ["Hunger in {where}, so the old rite: {a} and {b} were garlanded, struck with fig branches, and driven past the boundary stones. Two fewer mouths, and the gods appeased.", "{where} had nothing left to give the gods but two of its own. {a} and {b} were driven out with the city's hunger on their backs."] },
  blight: ["The god is angry with {where}. Too many unpurged killers walk its streets, and the fever has come, as it came to Thebes in Oedipus' day.", "Blight in {where}: {v} stains of unwashed blood, and the sickness follows the blood."],
  feudend: { fire: ["{a} went into the fire, and with them the old feud against the house of {b}. Fire cleanses everything the Sown carry.", "The feud between the house of {a} and the house of {b} burned on the Pyra. {v} killings; it is finished."], _: ["The feud between {a} and {b} is over."] },
};
const DIRS = (code) => { const ax = Math.floor(code / 2), up = code % 2 === 0; return AXES[ax][up ? 0 : 1]; };

/** render one event; view = { name(i), faction(i)->name, factionById(k)->name } */
const BROKEN = ["{a} was broken in {where} ({s}). The bones lie scattered in Asphodel and will knit again; only fire unmakes the Sown.",
  "{a} of the {fa} fell ({s}). Their bones go to the Asphodel Meadow to mend.", "Broken, not dead: {a} ({s}). The Reapers carry the pieces to Asphodel."];
export function narrate(e, view) {
  const h = hash32("tx", e.i, e.t);
  let set = e.t === "burn" && e.a === 8984 ? T.burn8985 : e.t === "death" && e.a >= 0 && e.a < 9999 && !["answered the Sirens"].includes(e.s) ? BROKEN : T[e.t]; if (!set) return `${e.t} (${e.s || ""})`;
  if (!Array.isArray(set)) set = set[e.s] || set[(e.s || "").split(":")[0]] || set._;
  let tpl = set[h % set.length];
  const who = (i) => (i >= 0 ? view.name(i) : "someone");
  let riot = "";
  if (e.t === "riot") { try { const x = JSON.parse(e.s); riot = `${x.dead ? x.dead + " fell. " : ""}${x.jailed ? x.jailed + " were jailed" : "No Reaper stood in their way"}, and ${x.looted} rations were looted.`; } catch { } }
  const [s1, s2] = (e.s || "").split("|");
  const map = {
    a: who(e.a), b: who(e.b), c: e.t === "birth" ? who(e.v) : (e.t === "cognomen" ? COGNOMENS[e.v] : ""), first: e.s === "first" ? ", the first Leaf of their line" : "", where: e.x >= 0 ? DISTRICTS[e.x].name : "the archipelago", fa: e.a >= 0 ? view.faction(e.a) : "Minyans",
    bfa: e.a >= 0 ? view.blood(e.a) : "", pfa: e.a >= 0 ? view.blood(e.a) : "", s: e.t === "memory" ? (e.s || "").replace(/^core[+-]:/, "") : e.s || "", v: e.v, r: riot, s1, s2,
    god: e.t === "prophet" ? (e.s || "").split("|")[1] : "", people: e.t === "prophet" ? (e.s || "").split("|")[0] : "",
    w0: ["battle", "peace"].includes(e.t) ? (e.s || "").split("|")[0] : "", w1: e.t === "battle" ? (e.s || "").split("|")[1] : "", w2: e.t === "peace" ? (e.s || "").split("|")[1] : "",
    d1: ["battle", "peace"].includes(e.t) ? (e.s || "").split("|")[e.t === "battle" ? 2 : 2] : "", b1: ["battle", "peace"].includes(e.t) ? (e.s || "").split("|")[3] : "",
    e1: ["expedition", "fleecetaken", "caravan", "raid", "wreck"].includes(e.t) ? (e.s || "").split("|")[0] : "", e2: ["expedition", "fleecetaken", "caravan", "raid", "wreck"].includes(e.t) ? (e.s || "").split("|")[1] : "",
    e3: e.t === "raid" || e.t === "wreck" ? (e.s || "").split("|")[2] : "", e4: e.t === "raid" ? (e.s || "").split("|")[3] : "", r1: e.t === "relicpass" ? (e.s || "").split("|")[0] : "", r2: e.t === "relicpass" ? (e.s || "").split("|")[1] : "",
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
  crash: "realism", migrate: "realism", dole: "realism", watch: "realism", kinslayer: "horror", erinyes: "horror", katharsis: "myth", poine: "realism", vendetta: "realism", supplication: "myth", restless: "horror", shadenames: "horror", pharmakos: "horror", blight: "horror", feudend: "myth", liturgy: "realism", lethe: "horror", oath: "myth", curse: "horror", weight: "horror", memory: "myth", scar: "realism", mysteries: "myth", antidosis: "realism", xenoi: "myth", theoxenia: "myth", wreck: "realism", defect: "realism", schism: "realism", dissolve: "realism", robbery: "realism", brawl: "realism", break: "realism", funeral: "myth",
  bounty: "myth", fleece: "myth", exile_end: "realism", love: "myth", heartbreak: "realism", birth: "myth", comeofage: "realism", prophet: "myth", convert: "myth", faithdies: "myth", temple: "myth", faithschism: "myth", festival: "myth", monument: "myth", iconoclasm: "realism", war: "realism", battle: "horror", peace: "realism", revolt: "realism", incident: "realism", craft: "realism", craftlost: "realism", dialect: "realism", rumor: "horror", rumorend: "realism", relic: "myth", relicpass: "myth", expedition: "myth", fleecetaken: "myth", caravan: "realism", raid: "realism" };
