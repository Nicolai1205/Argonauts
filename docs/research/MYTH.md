# MYTH: source-mined events, rites and grammars for The Argo

Compiled 2026-10-06 for rules v10+. This file adds to `docs/LORE.md`; it does not repeat it. Anything LORE already lists (the nine bloods, the 24 horror events, the funeral pipeline, the offices) is only cross-referenced here.

**How to read this file**
- **Citations.** `Ap.` = Apollonius, *Argonautica*; `Apd.` = Apollodorus, *Library*; `Od.`/`Il.` = Homer; `Th.`/`WD` = Hesiod, *Theogony*/*Works and Days*; `HH` = Homeric Hymn; `P.` = Pindar, *Pythian*; `VF` = Valerius Flaccus; `OA` = *Orphic Argonautica*; `Eur. Med.` / `Sen. Med.` = Euripides / Seneca, *Medea*; `Paus.` = Pausanias; `Hdt.` = Herodotus.
- **Checked lines.** Line numbers marked **[V]** were checked against a Theoi or Perseus text in this session. Unmarked numbers are standard references. **≈** = from memory; check before quoting in-game. **[LATE]** = a source after the 2nd c. CE, or a modern folk tradition.
- **Mechanic blocks.** Each one gives **Trigger · State · Effect · Stories · Chain tie · Horror**. Every rule is deterministic, using integers, `stream(seed, day, sys)` and index order, so it fits HANDOVER §3.
- **Chain signals.** In the "Chain tie" lines, the on-chain signals are:
  - **BURN**: an on-chain burn, the only true death of a Minyas;
  - **SALE**: a marketplace sale ("gold from Colchis");
  - **XFER**: any transfer, meaning adoption or sale into a new oikos;
  - **RULING**: `setTraits`/MetadataUpdate, "the Maker's finger";
  - **BEAM**: a renderer change, when the beam speaks;
  - **DEED**: any other deployer transaction.
- **Bone versus Leaf.** Throughout, "bone" means a deathless Minyas: broken, then re-knit in Asphodel. "Leaf" means a mortal child.

---

## 0. Five big ideas this research produced

1. **The Spartoi are made to kill each other, and the sources tell you how.** A thrown stone (Ap. 3.1365–1376 [V]), a "spear-mark" birthmark that marks the line (Arist. *Poet.* 1454b22), five survivors who become the noble houses (Apd. 3.4.1), and an "eternal year" of servitude to atone for killing Ares' serpent (Apd. 3.4.2). See §1.2.
2. **Hesiod's Five Ages are already our cast list.** Gold = Chryseoi, Silver = Argyreoi, Bronze = the extinct Chalkeioi, Heroes = the Minyai themselves (the "god-like race of hero-men who are called demigods", WD 156–173), and **Iron = the Leaves**. Hesiod even supplies a doomsday condition for the Iron Race, which becomes a world-health metric (§2.3).
3. **Fire is ambiguous in the myths, and that is our horror engine.** Fire *unmakes* the Minyai, yet in two myths it *makes* mortals deathless: Demeter burns Demophon (HH Dem. 231–255) and Thetis burns Achilles (Ap. 4.869–879 ≈). A heresy that passes Leaves through fire to turn them into bone is exactly sourced and exactly horrible (§2.4).
4. **The Orphic gold tablets turn the Asphodel re-knit into a choice.** On the road down there are two springs: Lethe beside a white cypress, and the lake of Memory. Broken Argonauts who drink Lethe come back without their bonds; initiates come back remembering (§3.9).
5. **Liturgies are the sourced fix for inequality.** Athens made its richest households pay for warships, choruses and feasts, and let a man who was named challenge a richer one to swap estates (*antidosis*). This answers the Gini watch item (§3.8).

---

## 1. The Argonautic tradition

### 1.1 Apollonius, *Argonautica*: an episode atlas

Texts: Book 1 https://www.theoi.com/Text/ApolloniusRhodius1.html · Book 2 https://www.theoi.com/Text/ApolloniusRhodius2.html · Book 3 https://www.theoi.com/Text/ApolloniusRhodius3.html · Book 4 https://www.theoi.com/Text/ApolloniusRhodius4.html

**Book 1 (Iolcus → Mysia)**

| Episode | Lines | What happens | Already in canon? |
|---|---|---|---|
| Catalogue of heroes | 1.23–233 | 55-odd heroes, each with father, home and one gift | Offices (LORE) |
| Departure sacrifice to Apollo Embasios / Ekbasios | 1.402–447 [V] | Jason asks for a safe voyage there and back; **Idmon reads the flame and foretells his own death** | Idmon office |
| Idas' drunken boast; **Orpheus' cosmogony song stops the quarrel** | 1.460–518 ≈ | Song ends a fight between crew | New |
| The Dodona beam | 1.519–528 [V] | Athena fits a speaking beam of Dodona oak into the stem | BEAM |
| Jason's cloak (ekphrasis) | 1.721–767 ≈ | Seven scenes woven by Athena: Cyclopes forging the thunderbolt, Thebes walled by Amphion, Aphrodite with Ares' shield, a cattle raid, a chariot race, Apollo shooting Tityos, Phrixus' ram | New: an item description grammar |
| **Lemnos** | 1.609–909 [V] | Aphrodite's wrath; husbands take Thracian captives; the women kill *all* males "that they might pay no retribution"; Hypsipyle spares Thoas in a chest; the crew stays a year and fathers children | Lemnian event (LORE) |
| **Samothrace** | 1.915–921 [V] | "initiation… the rites that may not be uttered" | New (§3.10) |
| Cyzicus: the Earthborn of Bear Mountain | 1.936–1011 [V] | Six-handed giants are killed and laid out "like long timbers" | Gegeneis |
| **Night battle with the Doliones** | 1.1012–1077 [V] | Blown back in the dark, guest kills host; Cleite hangs herself; the nymphs' tears make a spring; three circuits of the tomb and games | Doliones event |
| The halcyon omen and Rhea's rite on Dindymum | 1.1078–1152 [V] | Twelve days wind-bound; a halcyon tells Mopsus to appease the Mother; the youths dance armed and clash their shields "so that the ill-omened cry might be lost"; a spring bursts from the dry peak, the "spring of Jason" | New |
| **Hylas** | 1.1207–1357 [V] | A water-nymph draws him into the spring; Heracles and Polyphemus are left behind; Telamon accuses Jason; Glaucus rises from the sea to explain; Heracles takes hostages from Cius to go on searching | Visor HYLAS |

**Book 2 (Bebrycia → Colchis)**

| Episode | Lines | Mechanic seed |
|---|---|---|
| **Amycus' boxing toll** | 2.1–163 [V] | A border duel to the death |
| **Phineus**: Harpies, the Boreads, Iris' oath by Styx, the prophecy and the dove | 2.178–536 [V] | A seer punished for telling too much |
| Aristaeus and the Etesian winds: a Sirius sacrifice on Ceos | 2.500–527 ≈ | A weather rite |
| **Symplegades**: dove sent ahead, tail-feathers clipped; Athena's push; the rocks rooted for ever | 2.549–606 [V]; Apd. 1.9.22 | A first passage changes the world for good |
| **Thynias**: Apollo walks by at dawn and the island quakes; the paean "Hie Paieon"; an oath of concord at the altar | 2.669–719 [V] | Epiphany, plus a sworn bond between the crew |
| Mariandyni: King Lycus' xenia; the Acherusian cave with its "icy breath"; **Idmon killed by a boar; Tiphys dies** | 2.720–898 [V] | Seer and helmsman die; succession |
| **Sthenelus' ghost** stands on his barrow; libations | 2.911–929 [V] | Ghost event (LORE #8) |
| Sinope tricks Zeus out of his vow | 2.946–954 ≈ | Oath-loophole lore |
| Amazons; **Chalybes** ("cleave the iron-bearing land and exchange their wages for daily sustenance"); **Tibareni couvade**; **Mossynoeci**, who do in public what others do in private and **starve their king for a day if he judges wrongly** | 2.962–1029 [V] | Wage labour; inverted customs; accountable kings |
| **Island of Ares**: feather-bolts; helmets, shield-roof and shouting | 2.1030–1089 [V] | Featherbolts (LORE) |
| Sons of Phrixus shipwrecked and rescued | 2.1090–1230 | Kin from abroad |
| **Prometheus' eagle** passes; his scream | 2.1242–1259 [V] | Prometheus (LORE) |
| Arrival on the Phasis: Jason pours honey and wine "to Earth, the gods of the land and the souls of dead heroes" | 2.1271–1275 ≈ | Rite of entry |

**Book 3 (Colchis)**

| Episode | Lines | Mechanic seed |
|---|---|---|
| **Colchian burial law**: no fire, no mound; men in raw oxhides hung from trees, women buried | 3.194–210 [V] | Funeral variants (LORE #9) |
| Aeetes' palace: four Hephaestean springs of milk, wine, oil and water, hot in winter | 3.215–229 ≈ | A Chryseoi luxury good |
| Eros' arrow "burned like a brand" in Medea | 3.275–298 ≈ | The love system's "smite" |
| Aeetes sets the tasks: the bronze-hoofed fire-bulls, four plough-gates, the teeth, "reaping by evening" | 3.401–421 ≈ | Ordeal |
| Medea's night: a chest of drugs and the thought of suicide, undone by dawn | 3.744–824 ≈ | A crisis that turns at sunrise |
| **The Prometheion**: cut at night, the earth bellows | 3.828–866 [V] | LORE #11 |
| **The Hecate rite**: midnight, bathe in the river, dark robe, round pit, ewe burned whole, honey, do not turn back | 3.1026–1062 [V]; done at 3.1191–1224 | Hecate rises crowned with serpents and torch-lit oak boughs; the hounds of hell bark |
| **The sowing and the stone** | 3.1278–1407 [V] | See §1.2 |

**Book 4 (the return)**

| Episode | Lines | Mechanic seed |
|---|---|---|
| The serpent's hiss wakes mothers, who clutch their newborns | 4.127–138 ≈ | A city-wide fear omen |
| Medea's song and a juniper sprig put the serpent to sleep; the Fleece "like the lightning of Zeus" | 4.145–182 | Visor THE DRAGON SLEEPS |
| **Apsyrtus**: ambush at a temple; *maschalismos*; "thrice licked up blood and thrice spat the pollution" | 4.452–481 [V] | LORE #12 |
| **The beam speaks** of Zeus' wrath | 4.576–591 [V] | BEAM |
| Eridanus: Phaethon's lake, the Heliades' amber tears | 4.594–626 [V] | The Phaethontes' good: amber |
| Aethalia: pebbles that hold the heroes' sweat | 4.654–658 ≈ | Relics |
| **Circe**: dreams of blood on her walls; her drugs catch fire and she puts them out with blood; **beasts "of mixed limbs" follow her**; a silent supplication at the hearth with a sword fixed in the ground; the **piglet katharsis** | 4.662–717 [V] | Katharsis (LORE #14) |
| **Sirens**: Butes leaps; Aphrodite snatches him to Lilybaeum | 4.891–921 [V] | Butes (LORE) |
| Planctae: Thetis and the Nereids toss the ship like a ball | 4.922–981 [V] | Rescue |
| **Drepane**: the buried sickle of Cronos; the Phaeacians sprung from Ouranos' blood; **Alcinous' judgment**; Arete's night warning; the wedding in Macris' cave on the Fleece | 4.982–1222 [V] | §1.6 |
| **Syrtis**: stranded, the heroes wrap their heads in cloaks and wait to die; Libyan heroines appear | 4.1223–1336 ≈ | A despair state |
| **Carrying the Argo twelve days and nights** across the desert | 4.1370–1392 [V] | Mass labour |
| Hesperides turned to trees; Heracles' spring | 4.1393–1484 [V] | — |
| Canthus killed by a shepherd over sheep; **Mopsus killed by a snake born of Gorgon blood** | 4.1485–1536 [V] | Mopsus (LORE) |
| **Triton's clod** for Euphemus | 4.1537–1622 [V] | Colony token (§3.12) |
| **Talos** | 4.1638–1693 [V] | LORE #18 |
| **Black chaos; Anaphe**; the ribald water-throwing jest at Apollo Aegletes' altar | 4.1694–1730 [V] | Pall (LORE); a laughter rite |
| Euphemus' dream: the clod becomes a girl, then the island Calliste/Thera | 4.1731–1764 ≈ | Colony |
| Aegina water-carrying race | 4.1765–1772 ≈ | Games |

### 1.2 The Sown: everything the sources give us (core Spartoi mechanic)

**Sources**
- **Apollonius.** Jason ploughs four plough-gates, sows the teeth, and the earthborn rise "over all the field… bristled with sturdy shields and double-pointed spears and shining helmets".
  - He takes a boulder, "a dread quoit of Ares", which four youths could not lift, and throws it into their midst.
  - They "like fleet-footed hounds leaped upon one another and slew with loud yells; and on earth their mother they fell beneath their own spears, like pines or oaks, which storms of wind beat down" (Ap. 3.1354–1376 [V]).
  - Jason then reaps the rest. Some had risen only to the belly, some to the shoulders; others were just standing, others were running to battle. The furrows fill with blood like irrigation channels (3.1377–1404 ≈).
- **Apollodorus** says the same: "when he saw a knot of them he was to throw stones into their midst" (Apd. 1.9.23 [V], https://www.theoi.com/Text/Apollodorus1.html).
- **Cadmus at Thebes.** The five survivors are Echion, Udaeus, Chthonius, Hyperenor and Pelorus. Cadmus had killed Ares' serpent and served Ares "for an eternal year", that is eight years, as atonement (Apd. 3.4.1–2, https://www.theoi.com/Text/Apollodorus3.html).
- **The birthmark.** Aristotle lists among recognition tokens "the spear which the Earth-born bear" (*Poetics* 1454b22, http://www.perseus.tufts.edu/hopper/text?doc=Aristot.+Poet.+1454b). It is a spear-shaped birthmark carried by the Theban Spartoi line. Plutarch (*De sera num.* 563a ≈) has a man whose child is born with it.
- **Valerius Flaccus** retells the same compulsion in VF 7.

**Mechanic: The Stone in Their Midst** (refines LORE horror #1)
- **Trigger** (any one):
  - A rumour (`rumor.js`) whose content blames one Spartoi house for a loss reaches ≥ 30% of the Spartoi in one district while house tension is high (mean inter-house opinion < −20).
  - A **SALE** of a Bone-blood token far below the floor, below 50% of the 30-day median: "a stone thrown into the field".
  - A war's attacker targets a Spartoi-majority city and has `guile` above a threshold, so it throws a stone instead of fighting.
- **State:**
  - `house` per Spartoi agent (it already exists);
  - per district, `sownTension` (0–100), which rises with rumours and falls with shared festivals.
- **Effect:**
  - For 1–3 days, Spartoi in that district attack *only other Spartoi of other houses*, with pair chance ∝ tension.
  - Bones break and go to Asphodel; Leaves of Spartoi blood can truly die.
  - Spartoi Leaves born during the event are "half-risen": infant mortality ×3 (the farmer reaping half-grown shoots).
  - The thrower, whether a city or an agent, gets cognomen "the Stone-thrower" and wins the district.
  - Afterwards the house with the most unbroken members gains "Survivor House" prestige for a generation. This is Cadmus' five, played out again.
- **Stories:** "On the 9th of Kolchion someone threw a stone at the Field of Ares, and by evening the house of Udaeus had broken two hundred of Pelorus' sons. No one knows whose hand it was." The rumour system then gives each faction its own account of who threw it.
- **Atonement:** the agent who started it (the rumour originator, if traced) is bound to an **eternal year** (8 sim-years = 96 days) of servitude to the Grove of Ares, with no wealth, under a "bound to Ares" status. This makes a Cadmus arc.
- **Spear-mark:** Spartoi Leaves whose two parents are both Spartoi of the same house get `spearmark = 1`. It is a recognition token (§3.14) and a vote in house succession, and the mark's line can go extinct (a "last of the spear" sift pattern).
- **Horror:** brothers butchering each other at a word; furrows full of marrow; children cut down half-risen.

### 1.3 Pindar, *Pythian* 4 (462 BCE)

Text: http://www.perseus.tufts.edu/hopper/text?doc=Pind.+P.+4

- **The colony prophecy.** Medea foretells that a clod of Libyan earth, given by a god in disguise (Eurypylus/Triton), will found cities. The clod is washed overboard at night by careless servants, so the colony is delayed by many generations (to Battus, 17th in line).
- **The oracle to Pelias.** Beware "the man of one sandal", who comes down from the mountain to the sunny plain.
- **Jason's arrival.** Two spears, a leopard skin and uncut hair; the crowd takes him for Apollo or Ares.
- **Jason's settlement offer to Pelias.** "I leave you the flocks and the golden herds of cattle and the fields… but the sceptre and the throne, release them to me." This is a sourced *negotiation template*: split movable wealth from office.
- **The ghost.** Phrixus' ghost asks for his soul to be brought home, together with the Fleece.
- **The serpent** "surpasses a ship of fifty oars".
- **Lemnos.** Contests for a cloak with the Lemnian women: athletic courtship, and the bloodline that later colonises.
- **The iynx.** Aphrodite gives Jason the **iynx**, a wryneck bird bound to a four-spoked wheel, a love-charm. This is a craftable item for the Anthemoessans.

**Mechanics**
- **Delayed founding.** A colony token can be lost. If an Euphemus-office holder's clod-relic is lost in a shipwreck or theft, the colony he would found is postponed for N generations, then fulfilled by a descendant. The sift engine then gets "prophecy fulfilled after 17 generations".
- **Settlement speeches.** Pindar's offer is a grammar: `I leave you [movables]; but [office] give back to me.`

### 1.4 Apollodorus 1.9.16–28: the variants that matter

Text: https://www.theoi.com/Text/Apollodorus1.html [V]
- **Hylas** was "ravished away by nymphs on account of his beauty".
- **Amycus** died of a blow to the elbow in Apollodorus.
- **Talos** is the most precise version: "a single vein extending from his neck to his ankles, and a bronze nail rammed home". Medea "promised to make him immortal and then drew out the nail". So the immortality bargain is itself the trap.
- **Pelias.** Medea cuts up a ram and boils it into a lamb, then persuades Pelias' daughters to mince and boil their father.
- **Corinth.** The robe "consumed with fierce fire"; Mermerus and Pheres are killed; a chariot of winged dragons from the Sun.
- **Heracles.** Apd. 1.9.19 records that **Herodorus** said Heracles never sailed (he was a slave to Omphale). It also gives **Pherecydes'** version: Heracles was put ashore at Aphetae because "the Argo declared with a human voice that she could not bear his weight".

**Mechanic: The Beam Refuses**
- **Trigger:** a renderer change (BEAM) on a day when one oikos holds more than X% of all living tokens, or when a single agent's wealth is more than 50× the median.
- **Effect:** the beam names the heavy one. That agent or house is "put ashore": it loses office and is barred from the Boule for one season. It does not lose property.
- **Stories:** "The beam said: she cannot bear his weight."
- **Chain tie:** BEAM, plus concentration of holders. This turns real-world whale concentration into myth.

### 1.5 *Orphic Argonautica* (4th c. CE+) **[LATE]**

Translation: https://www.jasoncolavito.com/the-orphic-argonautica1.html. A first-person telling by Orpheus.

**Unique material**
- **The ship won't launch.** The Argo sticks in the sand "entwined in dried seaweed" until Orpheus sings.
- **Song contest.** Orpheus and Chiron compete; Orpheus sings a cosmogony.
- **The gate rite at Colchis.** It is the most lurid rite in the tradition:
  - a three-sided pit;
  - a pyre of juniper, cedar, boxthorn and black poplar;
  - **three black puppies** stuffed with copper sulphate, soapwort and alkanet;
  - then Pandora and **Hecate of Tartarus** rise: a body of iron, three heads (horse, mad dog, lion), with the Erinyes and torches.
- **The serpent.** Orpheus, not Medea, sings it to sleep.
- **The return.** A northern route past the Macrobii and Cimmerians to **Ierne** (Ireland).

**Mechanics**
- **Song moves stuck things.** If a caravan or fleet is "becalmed" (§4.2), an Orpheus-office holder can spend a day singing to release it. The office earns its keep.
- **Rite recipe as event.** The puppy rite is a black-market Hecate cult act at the Phaethontes' Burning Lake. It opens "the gate", a one-time quest unlock at the Grove, and draws Erinyes, which add miasma city-wide (§3.2).

### 1.6 Valerius Flaccus (Flavian Latin, unfinished)

Text: https://www.theoi.com/Text/ValeriusFlaccus1.html [V]
- **The death of Aeson and Alcimede** (VF 1.730–851). Pelias' soldiers are coming. Aeson performs a black rite under a cypress, curses Pelias ("let accursed fear ravish his maddened heart"), and **both parents drink bull's blood** and die before the soldiers break in. Alcimede has first raised Cretheus' ghost to ask after Jason.
- **Neptune's rebuke:** "Thou, Argo, hast devised death for unhappy nations" (VF 1.640s ≈).
- **Other material:** the Colchian civil war (Aeetes against his brother Perses) fills books 5–6 ≈, and VF 7 retells Medea's love and the Sown. Both are in https://www.theoi.com/Text/ValeriusFlaccus7.html.

**Mechanics**
- **Defiant parental death.** When a tyrant (an office-holder with high Order and low Care) orders a house's arrest, elderly Leaf parents may take poison *first* and curse him. The curse joins the oath/curse layer (§3.4) and raises unrest against the ruler.
- **Civil war of brothers.** When two siblings hold offices in the same city, a Perses/Aeetes split becomes possible.

### 1.7 Euripides' *Medea* (431 BCE) and Seneca's *Medea*

Texts: Euripides http://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.01.0114 · Seneca https://www.theoi.com/Text/SenecaMedea.html

**Euripides**
- **Oath-breaking.** Medea invokes Themis and Zeus "steward of oaths" against Jason, who broke his marriage oath (Eur. Med. 160–170 ≈).
- **Symbola.** Jason offers to send **symbola** to his guest-friends so they will take her in (≈ 610–615). This is a primary source for guest-tokens.
- **Supplication of Aegeus.** Medea grasps his knees; he swears by **Earth and Helios** to shelter her and names his own penalty (709–758 ≈).
- **The robe.** The "flesh dripped from her bones like resin from a pine-torch"; Creon embraces his daughter and sticks to her (1136–1221 ≈, http://www.perseus.tufts.edu/hopper/text?doc=Eur.+Med.+1136).
- **The chorus.** "Back to their sources flow the streams of holy rivers" (410 ≈): order inverted when men break oaths.
- **The escape.** A chariot from Helios (1317ff).

**Seneca**
- **The Argo as original sin.** The chorus (301–379 ≈) treats the Argo as the first violation: "too bold was he who first in so frail a boat broke the treacherous seas". It ends with a prophecy that ages will come when Ocean loosens its bonds and **Thule** is no longer the world's end.
  - The visor phrase **ORIGINAL SIN** is in the collection's art, and Seneca gives it a sourced meaning: *the voyage itself was the crime.*
- **Incantation catalogue** (670–848 ≈): serpents, poisons, and her own blood offered to Hecate.
- **Self-naming.** "Medea superest" ("Medea remains", 166) and "Medea nunc sum" ("now I am Medea", 910 ≈).
- **Last line.** Jason's: "bear witness, wherever you ride, that there are no gods" (1026–1027).

**Mechanics**
- **Oath-breaker's robe.** When a house breaks a sworn marriage or alliance (§3.4), the wronged party, if a Medea-office holder or pharmakon guild member, may send a "gift" that kills the new partner and whoever embraces them. Leaves die; bone breaks.
- **"No gods" apostasy.** After a catastrophe that a faith promised to prevent, its highest member may renounce it with Jason's line. A faith-schism trigger.
- **The ORIGINAL SIN omen.** When the beam speaks ORIGINAL SIN, sea trade is cursed for 3 days: pirate rates double and the shipwreck chance rises.

### 1.8 Herodorus of Heraclea and the Pontic cults

Herodorus wrote a mythographic *Argonautica* (c. 400 BCE, fragments only, cited by Apd. 1.9.19 and the Apollonius scholia). His local Pontic angle surfaces in Ap. 2.844–850 ≈:
- Apollo ordered the colonists of **Heraclea Pontica** to found their city around **Idmon's barrow** and honour him as its protector.
- An olive grows on the tomb.
- But they honour Agamestor instead.

**Mechanic: The Wrong Hero**
- A new city or colony must pick a guardian dead hero from the Asphodel rolls.
- If it picks someone other than the omen-indicated dead (the shade with the highest `kleos` in that district), a resentful-hero penalty applies: small hauntings, and a 5% harvest malus until a shrine is built.

---
### 1.9 Argonautic episodes as recurring world mechanics

Each entry adds what the existing director incident lacks: a **recurring, stateful** rule.

**A. Lemnian New Fire.**
- **Source:** Philostratus, *Heroicus* 53.5–7 ≈ **[LATE]**, analysed by Burkert, "Jason, Hypsipyle and New Fire at Lemnos", *CQ* 1970 (https://www.jstor.org/stable/637502). Once a year every fire on Lemnos was put out for nine days to atone for the murders. A ship brought new fire from Delos, and it could not land before the rites were complete.
- **Trigger:** each year in Lemnion, days 1–9.
- **State:** `fireOut[city]`.
- **Effect:**
  - Lemnos does no cooking or forging: cloth and ore output stop and food spoils faster.
  - If any Lemnian murder (the existing `lemnian` event) happened that year, the fire ship comes late (+3 days).
  - On day 10 a ship sails Pyra → Lemnos (draw it). Arrival brings a festival and katharsis to the whole island.
- **Chain tie:** a **BURN** during the dark days is read as "the new fire came from the wrong pyre". A double haunting follows.
- **Horror:** nine nights without a hearth on the island of the husband-killers.

**B. The Night Battle field.**
- **Source:** Ap. 1.1012–1077 [V]. Compare Paus. 1.32.4 (http://www.perseus.tufts.edu/hopper/text?doc=Paus.+1.32.4): at Marathon "every night you can hear horses neighing and men fighting", and anyone who goes on purpose to watch is harmed.
- **Trigger:** any battle where allies (relations > +20) fought by mistake. These come from the existing `doliones` event or from war fog, e.g. an alliance changed the same week.
- **State:** a `nightField` site with founding day and dead count.
- **Effect:**
  - Every anniversary there are three days of joint mourning (Ap. has three days of lament).
  - A spring named after the widow appears on the map.
  - Agents who walk there at night get `haunted`; on purpose, double.
- **Stories:** "Cleite's Spring" place names, built procedurally.

**C. Hylas' Spring.**
- **Source:** Ap. 1.1207–1357 [V]. Strabo 12.4.3 ≈ records an annual festival at Cius where people roam the mountains **calling Hylas' name**.
- **Trigger:** a young Leaf (12–18, "beautiful", i.e. high charisma) drawing water alone at a river or spring tile, at chance 1/20,000 per day.
- **Effect:**
  - The Leaf vanishes. Narrate it as a death with no body: an *aoros* (§3.11) with a kenotaph.
  - The household searches for 3 days and work stops.
  - Every year on that date the lineage "calls the name" three times.
  - If the household head is a hero-type (strength trait), they may abandon their post. This mirrors Heracles leaving the crew: they leave office.
- **Visor tie:** the beam phrase HYLAS raises the chance ×20 that day.

**D. Amycus' Toll (border boxing).**
- **Source:** Ap. 2.1–163 [V]; Apd. 1.9.20.
- **Trigger:** a caravan or migrant group crosses into a hostile city (rel < −30) with a "toll king": an office-holder with high strength and low Agreeableness.
- **Effect:**
  - The caravan's champion (a Dioscuri-office holder, or else the strongest member) must box.
  - Deterministic outcome = strength + skill + `stream` noise.
  - The loser breaks (bone) or dies (Leaf).
  - If the toll king dies, his city's border opens for a season. The victor is "crowned with laurel" (2.159).
- **Stories:** a duel chronicle with taunts (§5.6).

**E. Phineus' Curse (the over-accurate seer).**
- **Source:** Ap. 2.178–240 [V]. Phineus is punished for revealing Zeus' mind "to the end".
- **State:** `augurHits[i]`, the count of fulfilled prophecies (sift already scores "prophecy fulfilled").
- **Trigger:** an augur or seer with more than 5 hits in a year.
- **Effect:**
  - The **Harpies** visit that household specifically: food stores are halved each week until two Boread-office holders "chase" them (a weekly enforcement roll).
  - Afterwards the seer, now grateful, gives one true prophecy: a free, correct forecast of next season's worst event, which the narrator can quote.
- **Horror:** a starving blind man and the stench on his table (2.228–233).

**F. Symplegades: the First Passage.**
- **Source:** Ap. 2.549–606 [V]: once a ship passed, the rocks were fated to stand fixed for ever.
- **Trigger:** a dangerous strait or sea-lane, marked `clashing = 1`, sinks 30% of convoys.
- **Effect:**
  - Before committing, a convoy may "send the dove": a small boat that costs 1 cargo unit. If it gets through, the convoy's odds rise. The dove's "tail-feathers clipped" result means a near miss: go now.
  - The first convoy ever to pass sets `clashing = 0` permanently. The lane opens for good, and its pilot becomes a named founder with a monument.
- **Chain tie:** the beam phrase CLASHING ROCKS on a day of convoy departure = the rocks close again (`clashing = 1`) for one season.

**G. The Mossynoecian Law (accountable king).**
- **Source:** Ap. 2.1026–1029 [V].
- **Rule:** an ADICO law a city can adopt: "if the archon judges wrongly, the people shut him up and he fasts that day."
- **Measurement:** a "wrong judgment" is a ruling whose outcome made the median citizen worse off (unrest rose within 7 days).
- **Effect:** the ruler is jailed for one day (no food), loses popularity, and the city gains legitimacy.
- **Spread:** cities that use it drift to the inverted customs (public/private swap) as a fashion meme in `drift.js`.

**H. The Alcinous Ruling (Phaeacian arbitration).**
- **Source:** Ap. 4.1096–1169 [V]. "If she be yet a maid I decree that they carry her back… but if she shares a husband's bed, I will not separate her." Arete leaks the rule at night, and the couple marry before dawn on the Fleece.
- **Trigger:** two cities in a dispute (a captive, a defector, a relic) that both have relations ≥ −50 with Drepane refer it to the **Ouranidai**.
- **Effect:**
  - Drepane announces a *conditional* ruling based on a state fact (married? enrolled in a phratry? resident ≥ 30 days?).
  - The disputed party then gets one night to change that fact (marry, enrol, buy land), with a chance set by an "Arete" character's sympathy.
  - The ruling resolves deterministically at dawn.
- **Stories:** loopholes and night weddings. The Ouranidai become judges whose fairness is *procedural*.

**I. Carrying the Ship.**
- **Source:** Ap. 4.1370–1392 [V].
- **Trigger:** a drought (§4.3) leaves a river-port city's boats stranded.
- **Effect:** the guild can choose to carry the city's ships overland to the next water: 12 days with no other work. Success depends on how many hands join.
- **Stories:** a monument, "The Twelve Days", and a shared memory that strongly raises asabiya.

**J. Talos' Circuit.**
- **Source:** Ap. 4.1638–1693 [V]; Apd. 1.9.26 [V]. Talos runs around Crete three times a day and throws stones at ships.
- **Rule:** a city may raise a "Talos": a bronze guardian, its most expensive monument.
- **Effect:**
  - Pirate raids and border incidents against that city drop to zero.
  - Talos has **one nail**. If a Medea-office holder of an enemy city "promises immortality", rolling her guile against the city's Lynceus watchman, the nail is drawn and Talos falls.
  - The city loses its protection and the monument becomes ruins.
- **Phaethontes tie:** their "evil eye" counts double against him (Ap. 4.1665ff).

**K. Circe's Hearth (katharsis service).**
- **Source:** Ap. 4.662–717 [V]. Circe performs the rite *before she even knows the crime*, then sends the polluted away when she learns it.
- **Rule:** the Medea/pharmakon office runs a purification service (§3.2). It costs obols, and the obols go to the purifier, so money is conserved.
- **Twist:** after the rite, the purifier learns the crime. If it was kin-killing, the client is expelled from her district. Purification does not bring welcome.
- **Horror:** the "mixed-limb" beasts that follow Circe become a rare Anthemoessa omen when her office is held by a high-zeal Hecate worshipper.

**L. Syrtis Despair.**
- **Source:** Ap. 4.1278–1304 ≈.
- **Trigger:** a city in famine for 10 or more days with no import route.
- **Effect:** "veiled heads". Workers stop working (output ×0.5) and wait to die, until an outside omen (a horse from the sea, i.e. a SALE or a merchant caravan arriving) breaks the spell.

---

## 2. Homer, Hesiod and the Hymns

### 2.1 *Odyssey*, book by book

Texts: https://www.theoi.com/Text/HomerOdyssey1.html … `HomerOdyssey24.html`.

| Book | Episode (lines) | Mechanic seed |
|---|---|---|
| 1 | Athena as Mentes is fed before being asked her name (1.123–124) | **The xenia order**: food first, questions after |
| 2 | Ithacan assembly; **Penelope's web**, woven by day and undone by night for three years (2.93–110); twin eagles tear at each other over the assembly (2.146–176) | Stalling; bird omens |
| 3 | Nestor's beach sacrifice of 81 bulls: 9 companies of 500 (3.5–9); "are you pirates?" asked without shame (3.71–74) | Feast economy; piracy normal |
| 4 | Helen's Egyptian **nepenthe** (4.219–232); wrestling **Proteus** in seal skins (4.351–570) | A grief-erasing drug |
| 5 | Calypso's detention; building the raft with 20 trees, axe, adze and auger (5.234–261); Ino's veil | Shipbuilding; captivity |
| 6–7 | Supplication of Nausicaa (6.141–185) and **Arete** (7.142ff); Alcinous' always-fruiting orchard (7.112–132) | Hiketeia via the woman of the house |
| 8 | Demodocus' songs; games; Euryalus' insult and the apology gift (8.158–415) | Insult → compensation |
| 9 | **Cicones** raid, then a counter-attack because the men linger (9.39–61); **Lotus-eaters** (9.82–104); **Cyclops** and "Nobody" (9.105–566) | Greed delay; addiction; the name-trick |
| 10 | **Aeolus' bag**, opened by jealous crew (10.1–79); **Laestrygonians** spear men "like fish" in a closed harbour (10.80–132); **Circe**, moly, swine (10.133–574); Elpenor falls from the roof drunk (10.552–560) | Envy of hoards; harbour trap |
| 11 | **Nekyia** [V]: cubit pit, milk-and-honey, wine, water, barley; vow of a barren heifer; black ram for Teiresias; the sword keeps the dead from the blood; Elpenor's oar; Achilles would "rather be a hireling… than lord over all the dead" (11.489–491); Ajax's silence (11.563) | Necromancy (§3.11) |
| 12 | **Sirens** (12.39–54, 158–200); **Scylla** takes six men, one per head (12.245–259); **Charybdis** three times a day; **Cattle of the Sun**: hides crawl and meat lows on the spits (12.394–396) | Fixed toll; sacred herds; the horror omen |
| 13 | Poseidon **turns the Phaeacian ship to stone** at the harbour mouth for carrying strangers (13.159–169) | Punished hospitality; the Lithinoi |
| 14 | Eumaeus' xenia; the Cretan lie-tale (14.199–359) | False biographies |
| 15 | **Theoclymenus**, a seer fleeing a homicide, supplicates on the ship (15.223–281) | Fugitive suppliant |
| 17 | Argos the dog recognises his master and dies (17.290–327); the gods walk as strangers "beholding violence and righteousness" (17.485–487) | Theoxenia |
| 18 | Beggars box: Irus (18.1–107) | Low-status duel |
| 19 | The scar: Eurycleia (19.386–475); **gates of horn and ivory** (19.560–567) | Recognition; true and false dreams |
| 20 | **Theoclymenus' vision** (20.345–357): suitors laugh "with jaws not their own", meat dabbled with blood, walls dripping blood, porch full of ghosts going down to Erebus, the sun perished from heaven | **The single best horror set-piece in Homer** |
| 21 | The bow and the twelve axes | Contest of succession |
| 22 | Slaughter; maids hanged "like thrushes" (22.465–473); house **fumigated with sulphur** (22.481–494) | Katharsis after bloodshed |
| 23 | The bed test: the bed built round a living olive (23.177–204) | A secret-knowledge token |
| 24 | Suitors' shades gibber "like bats" (24.5–9); Laertes' orchard trees as a token (24.336–344); the kin-feud ended by divine amnesty, "let them forget the slaying" (24.482–486) | Feud ends in amnesty |

**Odyssey mechanics**

1. **Theoclymenus' Vision (doom foresight).**
   - **Trigger:** an augur or seer is a guest (xenia) in a house whose members have high hubris (§3.15), e.g. a faction feasting during a famine elsewhere.
   - **Effect:**
     - The seer speaks 20.351–357 almost verbatim: "the walls drip blood".
     - The hosts mock (`laughter`), and that sets a hidden 7–20 day doom timer on the house: a raid, plague or ostracism, whichever system fires first is credited.
     - The sifter pairs the vision with its fulfilment.
   - **Horror:** the best in Homer.
2. **Penelope's Web (stalling to prevent forced remarriage or seizure).**
   - **Trigger:** a widowed Leaf heiress (§3.7) is pressed by suitors, or a household threatened with forced sale/annexation.
   - **Effect:** a "weave" state: each day the household gains time at the cost of production. A disloyal servant (low loyalty bond) reveals the trick after N days, ending it.
   - **Stories:** "Three years she wove a shroud for Laertes."
3. **Aeolus' Bag (envy of a sealed hoard).**
   - **Trigger:** a rich agent travelling with poorer companions who see a sealed container (a relic or treasury).
   - **Effect:** the companions may open it; their envy is set by the wealth gap. The wind escapes: the caravan is blown back to its origin and loses its cargo days.
4. **Cattle of Helios (sacred herds).**
   - **State:** each temple and the Phaethontes' Burning Lake keep `sacredStock`.
   - **Trigger:** famine in that city.
   - **Effect:** the hungry may eat the sacred stock. Immediate food, but then:
     - "the hides crawled, the meat lowed on the spits";
     - a horror omen for 6 days;
     - a guaranteed storm, shipwreck or plague within 7 days for everyone who ate. Leaves die; bone breaks.
   - **Phaethontes tie:** they are Helios' line (LORE), so their herd is the most sacred.
5. **The Stone Ship.**
   - **Trigger:** an Ouranidai house gives passage to a fugitive (an exile, an ostracized agent).
   - **Effect:** with chance ∝ the fugitive's crimes, the returning ship turns to stone in the harbour mouth. It becomes a permanent map landmark that reduces harbour capacity.
   - **Lithinoi tie:** the Laoi Lithinoi revere these ships as kin.
6. **Theoxenia (gods and Golden Watchers in disguise).**
   - **Sources:** Od. 17.485–487; WD 122–126: the Golden Race are "clothed in mist… watchers of judgments and cruel deeds… givers of wealth" (https://www.theoi.com/Text/HesiodWorksDays.html).
   - **Rule:** Chryseoi agents occasionally travel *incognito*, with `disguised = 1` and the appearance of a poor beggar, and lodge with random households.
   - **Effect:** hospitality is scored on food given, insults and violence.
     - The generous are rewarded with gold from the Chryseoi's own purse (a transfer, so conserved) and "the Watcher's favour".
     - The cruel get a curse, or a later ostracism vote steered by the watcher.
   - **Stories:** Philemon and Baucis (Ov. *Met.* 8.611–724) and Irus/Antinous. "She gave the beggar her last loaf. The beggar was a Chryseos."
7. **The Bow (contest of succession).** When an office has no heir and several claimants, hold a deterministic three-stage contest (string, aim, endurance), drawn from the claimants' traits. An exiled former holder may enter in disguise and win, causing a purge (22) and a sulphur-katharsis.
8. **Suitors' Shades.** The dead of a massacre go to Asphodel "gibbering like bats". A sound cue and narrator flavour for mass-death shades.

### 2.2 *Iliad*: honour, death and the body

Texts: https://www.theoi.com/Text/HomerIliad1.html … e.g. `HomerIliad18.html`, `HomerIliad23.html`.

- **Chryses (1.11–52).** A priest's ransom is refused; Apollo shoots mules and dogs first, then men, and "the pyres of the dead burned thick". Mechanic: **dishonour of a priest → plague**, with livestock first as the warning stage.
- **Geras dispute (1.101–311).** The leader takes a subordinate's prize, and the best fighter withdraws. Mechanic: **the Wrath of the Champion.** If an office-holder strips a champion's honour (prize, office or bond), the champion refuses war duty until compensation is offered, as in the embassy of Book 9. Their city's war power falls by their share.
- **Thersites (2.211–277).** The commoner who speaks the truth in assembly is beaten, and the crowd laughs. Mechanic: an assembly event in which a low-status speaker with high Liberty criticises the Tiphys. Outcomes are "beaten" (an authority win) or "heard" (a start to unrest).
- **Glaukos and Diomedes (6.119–236).** They find inherited guest-friendship on the battlefield, refuse to fight, and swap armour, gold for bronze ("a hundred oxen's worth for nine"). This drives §3.1 inherited xenia.
- **Achilles' two fates (9.410–416).** A short life with eternal kleos, or a long one without it. Mechanic: an agent attribute `doomChoice`. Leaves with high status-need take risky actions that trade life expectancy for `kleos`.
- **Blood-price on the shield (18.497–508).** Two men dispute the poinē for a slain man; elders judge on a staff; two talents of gold go to whoever "speaks the straightest judgment". This is the core of §3.5.
- **Kēr on the shield (18.535–538).** "In blood-red cloak, dragging a dead man by the feet." See also *Shield of Heracles* 248–257: the Kēres gnash their teeth, fight over the fallen and drink their black blood (https://www.theoi.com/Text/HesiodShield.html).
- **Sarpedon (16.431–683).** Zeus weeps bloody rain; Sleep and Death carry the body home. Mechanic: **body recovery.** The body of a beloved commander who dies far away can be "carried home" by twin agents (the Sleep/Death pair of the Reapers' guild). Otherwise the dead becomes *ataphos*.
- **Kerostasia (22.209–213).** Already in LORE (#22).
- **Funeral games (23).** Chariot race, boxing, wrestling, foot-race, armed duel, the iron weight (*solos*), whose prize is the lump itself, "enough iron for five years" (23.826–835), archery at a dove tied to a mast, and spear-throwing. Text: https://www.theoi.com/Text/HomerIliad23.html. See §3.6.
- **Priam's supplication and ransom (24.468–676).** He kisses "the terrible man-slaying hands"; ransom; a twelve-day truce; three laments (24.723–776). See §3.3 and §5.5.
- **Niobe (24.602–617).** Already in LORE (Lithinoi).
- **Leaves (6.146).** Canon.

### 2.3 Hesiod: Theogony and Works and Days

Texts: https://www.theoi.com/Text/HesiodTheogony.html · https://www.theoi.com/Text/HesiodWorksDays.html [V]

**The Five Ages mapped onto the world** (WD 109–201)

| Age | Hesiod | The Argo |
|---|---|---|
| Gold (109–126) | Lived like gods; died "as though overcome with sleep"; became "pure spirits… clothed in mist… watchers… givers of wealth" | **Chryseoi**: watchers (Theoxenia, §2.1.6) and liturgy-payers (§3.8) |
| Silver (127–142) | 100 years a child at its mother's side, then brief foolish adulthood; would not sacrifice; Zeus hid them | **Argyreoi**: long dependency, short prime; an impiety malus |
| Bronze (143–155) | From ash-trees; bronze houses and tools; "destroyed by their own hands"; nameless | **Chalkeioi**: extinct; the self-destruction fate |
| Heroes (156–173) | "A god-like race of hero-men… called demigods"; some fell at Thebes and Troy; others live on the **Isles of the Blest** | **The Minyai** as a whole: the voyage generation |
| Iron (174–201) | Toil and sorrow; "the father will not agree with his children… nor guest with host"; might is right; oaths broken; **Aidos and Nemesis leave the earth**; Zeus destroys them "when they come to have grey hair on the temples at their birth" | **The Leaves** |

**Mechanic: The Iron Clock** (a world-health metric)
- **State:** a rolling 360-day `ironIndex`, built from the rates of five things Hesiod names:
  1. parent–child feuds (an opinion of kin < −50);
  2. xenia violations (§3.1);
  3. broken oaths (§3.4);
  4. unavenged violence against the old;
  5. "the bad man injures the better with crooked words and swears an oath on them" (WD 193–194): perjury in rulings.
- **Effects by tier:**
  - **Tier 1, "Aidos departs":** shame no longer stops theft; crime rates ×1.2.
  - **Tier 2, "Nemesis departs":** no divine punishment events. The hubris → nemesis loop (§3.15) switches off, so the powerful act freely.
  - **Tier 3, "Grey temples":** every Leaf born is drawn with grey temples (a cosmetic gene). The sifter declares "Zeus' sign", and the director's catastrophe budget is raised for a year.
  - **Reset:** a Golden-Age "reversal" requires a generation of just rulings (WD 225–237: in the just city "the earth bears them victual in plenty… the women bear children like their parents").
- **Bone/Leaf split:** the Iron clock counts Leaves only. The bone-race is "the race of heroes", and only its *children* are Iron.
- **Horror:** babies born grey.

**Further Works and Days mechanics**
- **Dike's city versus Hybris' city (WD 225–247).**
  - In the just city: plenty, peace, no famine.
  - In the unjust: "often even a whole city suffers for a bad man… famine and plague together, the people perish, women do not bear".
  - Mechanic: the city fertility multiplier tracks a `justice` stock, the share of rulings and judgments rated fair. It ties to existing ADICO laws and to Gini.
- **The 30,000 watchers of Zeus (WD 252–255),** "clothed in mist". The Chryseoi again: a count of 88 Gold tokens as "the watchers".
- **Two Strifes (WD 11–26).** Good strife is competitive envy that makes the potter vie with the potter; bad strife makes war. Mechanic: rivalry ties between same-job neighbours *raise* productivity (×1.05) unless the rivalry turns to hatred (< −60).
- **Neighbours (WD 342–351).** "A bad neighbour is as great a plague as a good one is a great blessing" [V]; "measure back with the same measure, or better if you can". Mechanic: a **grain loan** between neighbours, repaid with interest. Failure to repay degrades the tie, while repaying "better" strengthens it.
- **The hawk and the nightingale (WD 202–212).** The first Greek fable (*ainos*). A template for tyrant speeches: "Wretch, why do you cry out? One far stronger holds you."
- **The farmer's year (WD 383–617) [V].** See §4.1.
- **Sailing (WD 618–694).** "Fifty days after the solstice" is the safe window [V]. Spring sailing starts "when the leaves on the topmost shoot of a fig-tree are as large as a crow's footprint" [V: Theoi translates the print as a cow's; most translators read "crow"]. Laying the ship up: haul it ashore, pack stones around it, pull the bilge plug, and hang the rudder over the smoke (624–629).
- **The Days (WD 765–828) [V].**
  - "On a fifth day, they say, the **Erinyes assisted at the birth of Horkos** (Oath), whom Eris bore to trouble the forsworn" (802–804).
  - Avoid the 13th of the waxing month for sowing (780).
  - The month has three decades: waxing, middle and waning.
  - See §3.13 and the calendar appendix.
- **Taboos (WD 724–759).**
  - Don't pour libations with unwashed hands.
  - Don't urinate facing the sun.
  - Don't cross a river without praying and washing.
  - Don't cut your nails at a feast.
  - Don't put the ladle on the mixing-bowl.
  - Don't sit a 12-day-old boy on a sacred thing.
  - This is a ready list for **personal pieties** (an agent's quirks) and for "omen of transgression" incidents.

**Theogony mechanics**
- **Mekone (Th. 535–557).** Prometheus divides the ox. Men get the meat in the stomach; the gods get "**white bones** wrapped in glistening fat". Ever since, men burn the bones for the gods.
  - Canon hook: the Minyai *are* bone, the gods' own portion. Proposed faith-myth (for `rumor.js` templates): "We are the portion Prometheus set aside; that is why fire takes us back."
  - Mechanic: at each sacrifice festival the burnt portion is a relic-bone offering, and Spartoi priests take precedence.
- **The children of Night (Th. 211–232).** Moros, Ker, Thanatos, Hypnos, the Oneiroi, Momos, Oizys, the Hesperides, the Moirai, the Kēres, Nemesis, Apate, Philotes, Geras, Eris. Then Eris' brood: Ponos, Lethe, Limos, the Algea, Hysminai, Makhai, Phonoi, Androktasiai, Neikea, Pseudea, Logoi, Amphillogiai, Dysnomia, Atē, **Horkos**. A ready-made, sourced naming set for **personified incidents** (e.g. "the Limos of Year 3", "a Dysnomia in Iolcus").
- **The oath by Styx (Th. 775–806).** A god who swears falsely by Styx's water "lies breathless a full year… no ambrosia… then nine years cut off from the gods' councils". Mechanic: the **Great Oath**, the strongest oath an office-holder can swear (§3.4). Breaking it costs 1 sim-year in a coma-like `breathless` state and **9 years barred from office**, with no exceptions.
- **The Muses' warning (Th. 27–28).** "We know how to speak many false things as though they were true." This licenses the rumour system's mutated accounts as Muse-speech.

### 2.4 Homeric Hymns

Texts: https://www.theoi.com/Text/HomericHymns1.html (I–III) [V], https://www.theoi.com/Text/HomericHymns2.html (IV onward).

- **Hymn to Demeter (II).**
  - Demeter mourns as an old woman, Doso, and nurses **Demophon**. By night "she would hide him like a brand in the heart of the fire" to make him deathless, until his mother sees and screams (231–255).
  - Then the famine: a year of no harvest, which would have wiped out mankind and the gods' honours (305–313).
  - Persephone's **pomegranate seed** binds her to the underworld.
  - The founding of the Mysteries: "Happy is he among men who has seen these things" (480–482).
  - Mechanics:
    - **The Demophon Heresy (horror).** A Phaethontes- or Hecate-aligned faith teaches that a Leaf passed through fire at night becomes bone (deathless). When it spreads to a household:
      - parents "brand" an infant;
      - by chance, it dies (it is a Leaf);
      - rarely, it *appears* to survive. A deterministic 1/500, flagged as "the fire-nursed child", which is mythic but never actually deathless. The sim can never make a Leaf bone, since canon has only the chain do that.
      - The sifter tracks the cult's body count.
      - An Ancaeus/Lynceus office may suppress it.
      - The Thetis variant (Ap. 4.869–879 ≈) gives the father's intervention.
    - **Demeter's Withholding.** If the Thesmophoria (§3.13) is skipped or desecrated, as in war, the seed fails: the next harvest in that region is ×0.3.
    - **The Pomegranate.** A Leaf who eats at the Asphodel feast during Anthesteria (an existing festival) is bound to die within the year: a doom tag that the sifter pairs with fulfilment.
- **Hymn to Hermes (IV).** The newborn steals Apollo's cattle, walks them backwards, invents the lyre from a tortoise ("living, you shall be a spell against mischievous witchcraft; dying, you shall sing sweetly", 37–38 ≈), cuts the meat into 12 portions, and gets out of an oath by literal truth. Mechanic: thieves with a "Hermes" trait reverse their tracks (they can't be traced) and swear technically true oaths (§3.4), so oath-breach can't be proven.
- **Hymn to Pythian Apollo (III).** Apollo kills the she-dragon, and the corpse **rots** in the sun: "Pytho" from *pythein*, "to rot" (363–374 ≈). Mechanic: when a monster or guardian is killed (Talos falls, the Grove serpent dies), the site becomes "Pytho". A rot miasma in the district for 9 days, then the site becomes an oracle (§3.10).
- **Hymn to Aphrodite (V).** **Tithonus**: granted deathlessness but not agelessness; he shrivels, his voice "flows on endlessly", and he is shut in a room (218–238 ≈).
  - Canon reflection: the Minyai are deathless but never age, so they are what Tithonus wanted.
  - Mechanic for Leaves: if a Leaf ever gains a "Maker's blessing" (a RULING on its *Argonaut* parent the day the Leaf is born), it becomes a "Tithonid". It lives past 100 but declines cognitively, and is kept in a room. Horror flavour, with no rule break.
- **Hymn to Dionysus (VII).** Pirates seize the god; vines grow over the mast; the god becomes a lion; the pirates leap into the sea as dolphins. Mechanic: pirates who capture a priest or prophet of a manic faith may suffer a "dolphin" event, with the pirate ship lost.

---
## 3. Greek social and religious mechanics

### 3.1 Xenia: guest-friendship, inherited
- **Sources:**
  - Il. 6.119–236 (Glaukos and Diomedes: grandfathers' guest-friendship binds grandsons);
  - Od. 1.123–124 (feed first, ask later);
  - Zeus Xenios;
  - Eur. Med. 610–615 ≈ (*symbola* sent to guest-friends).
  - Real practice: the **symbolon** was a knucklebone or tally broken in two, one half for each house, matched generations later. Overview: https://en.wikipedia.org/wiki/Xenia_(Greek).
- **State:** `xenos` links between oikoi (a sparse map `w.xenia: [oikosA, oikosB, sinceDay, symbolonId]`); a relic flag on the token-halves.
- **Trigger:**
  - created when an agent travels (migration, caravan, war embassy) and is fed by a host household;
  - also created by a **SALE**: the seller's and buyer's oikoi become xenoi. Every real trade forges a guest-bond, so the chain *literally* seeds the xenia graph.
- **Effects:**
  - xenoi shelter each other's exiles and refugees, won't fight each other in war (they may refuse the levy, Glaukos-style), and swap gifts;
  - the bond passes to heirs;
  - violation (killing, robbing or betraying a guest or host) is the worst miasma and a strong Iron-clock input (§2.3).
- **Stories:**
  - "Their grandfathers ate at one table; on the field at Iolcus they saw the matching bones and lowered their spears."
  - The Doliones night battle becomes *the* xenia tragedy.
- **Horror:** Polyphemus and Lycaon as anti-hosts. The Philinnion revenant (§3.11) is a guest-friend horror.

### 3.2 Miasma and katharsis
- **Sources:**
  - R. Parker, *Miasma* (1983);
  - Draco's homicide law (IG I³ 104): involuntary killers go into exile unless the victim's father, brothers and sons all agree to pardon (*aidesis*);
  - Orestes cleansed by piglet blood (Aesch. *Eum.* 280–283, http://www.perseus.tufts.edu/hopper/text?doc=Aesch.+Eum.+280);
  - Circe (Ap. 4.693–717 [V]): the polluted sit silent at the hearth, eyes down, a sword fixed in the ground;
  - Odysseus' sulphur (Od. 22.481–494);
  - plague from a single polluter (Oedipus; WD 240).
- **Existing:** a `katharsis` thought exists. Miasma is only named in LORE, not built.
- **State:** `miasma[i]` (0–3), plus `cityMiasma[c]` = Σ over polluted residents who haven't been cleansed.
- **Triggers:** killing (any), kin-killing (+3), killing a guest (+3), breaking a Great Oath, touching an unburied corpse, a birth or death in a sanctuary.
- **Effects:**
  - polluted agents are shunned (social encounters ×0.5) and can't hold office;
  - `cityMiasma` above a threshold → raised chance of plague and blight (Oedipus);
  - kin-killers draw **Erinyes** (§3.16);
  - cleansing costs obols paid to the purifier (money conserved): piglet katharsis for 0–2, exile plus katharsis for 3;
  - Draco's *aidesis* gives the victim's kin a vote; refusal forces exile for a year.
- **Chain tie:** a **BURN** of a token whose oikos had been in a feud = "the fire cleansed the house" (city miasma −).
- **Stories:** the polluted wanderer seeking a purifier (a Theoclymenus arc) is a strong sift pattern.

### 3.3 Hiketeia: supplication
- **Sources:**
  - J. Gould, "Hiketeia", *JHS* 93 (1973) (https://www.jstor.org/stable/631455);
  - Il. 1.500–502 (Thetis takes Zeus' knees and chin);
  - Il. 21.64–119 (Lycaon refused);
  - Il. 24.477–479 (Priam kisses Achilles' hands);
  - Od. 6–7 (supplicating the queen);
  - Eur. Med. 709–758 ≈ (Medea to Aegeus);
  - altar asylum. Overview: https://en.wikipedia.org/wiki/Hiketeia.
- **Rule:**
  - an agent facing death, ruin or exile performs a **gesture of contact**: knees, hand or chin, or a hearth or altar.
  - The supplicandus accepts with a chance from Care, the faith's protection of suppliants, and the bystanders' gaze (public supplication is harder to refuse).
- **Accepting:** the suppliant becomes a protected dependent.
- **Refusing:** for a supplicant at an altar, refusal gives the refuser miasma 2 and nemesis.
- **Use cases:**
  - a defeated war captain;
  - a defaulting debtor;
  - a mother asking for a child's body (§3.5 ransom);
  - an exiled house asking for land.
- **Stories:** "He took the knees of the man who had killed his son."

### 3.4 Oaths and curses
- **Sources:**
  - Il. 3.276–301: the oath-sacrifice; wine poured with "as this wine is poured, so may their brains be poured on the ground, and their children's";
  - Hesiod WD 219 (Horkos runs beside crooked judgments) and WD 802–804 (Horkos born with the Erinyes) [V];
  - Th. 775–806 (the Styx oath);
  - **Hdt. 6.86** (http://www.perseus.tufts.edu/hopper/text?doc=Hdt.+6.86): Glaucus of Sparta merely *asked* Delphi whether he could perjure himself to keep a deposit, and his line was wiped out ("there is no descendant of Glaucus, nor any hearth");
  - the **Cyrene founders' oath** (SEG 9.3, 4th-c. copy of a 7th-c. decree ≈): wax images were burned with the curse "may he who breaks this oath melt and flow away like these images, himself and his seed and his property";
  - the Ephebic oath.
- **State:**
  - `oaths: [swearer, counterparty, kind, gods, stake, day]`;
  - kinds: marriage, alliance, treaty (ADICO already), loan, testimony, Great Oath (Styx).
- **Effects of breach:**
  - the curse falls on the swearer's lineage, as a `cursedLine` tag with generations remaining (3 for ordinary, 7 for Styx-grade);
  - lineage fertility −;
  - the sift pattern "the curse fulfilled";
  - Glaucus rule: *asking* the oracle (§3.10) about breaking an oath counts as a breach.
- **Chain tie:**
  - a **RULING** that changes a token's traits on the day its holder's oath falls due = "the Maker witnessed the oath";
  - a **BURN** of a swearer's token = "he melted like the wax".
- **Horror:** the wax effigies; the extinction of a hearth.

### 3.5 Blood-feud, blood-price and the Erinyes
- **Sources:**
  - Il. 9.632–636 (a man accepts blood-price even for a brother or son);
  - **Il. 18.497–508** (the arbitration scene);
  - Draco IG I³ 104;
  - Aesch. *Eumenides* (the Erinyes hound the kin-slayer; the Areopagus replaces the feud);
  - Od. 24.482–486 (amnesty).
- **State:** `feud[lineageA][lineageB]` (score, last blood, owed poinē).
- **Mechanic:** after a killing, the victim's lineage chooses:
  - (a) **vengeance**: kill the killer or a kinsman, which escalates the score;
  - (b) **poinē**: accept a blood-price set by the city elders (Boule) in obols, paid killer → victim's heirs (conserved);
  - (c) **exile** of the killer (Draco).
- **Choice weights:** kin honour, wealth, faith, the killer's miasma.
- **Elders:** the "speaks straightest" elder earns `kleos` (the two talents on the shield).
- **The Erinyes:** an unresolved kin-killing spawns pursuit. The killer's mood drains daily, and an escape needs katharsis plus a court acquittal.
- **Bone/Leaf:** killing a Minyas only breaks it, so the feud is about *dishonour*, and the poinē for bone is half. Killing a Leaf is true murder, so the feud runs at full weight. This difference in moral weight comes straight from canon.

### 3.6 The agōn: games
- **Sources:**
  - Il. 23 (funeral games, https://www.theoi.com/Text/HomerIliad23.html);
  - Od. 8 (Phaeacian games);
  - Ap. 1.1057–1062 [V] (games at Cyzicus' tomb);
  - the Panhellenic **periodos**: Olympia (4-yearly, olive crown), Pythia (4-yearly, laurel), Isthmia (2-yearly, pine/celery), Nemea (2-yearly, wild celery);
  - the **ekecheiria** sacred truce;
  - victors honoured with statues and sometimes hero cult (Theagenes, §3.10).
- **Mechanic:**
  - a 4-sim-year cycle (every 48 days) of "Pagasaean Games" at Pagasae, plus funeral games for any high-`kleos` death;
  - events from Il. 23: chariot, boxing, wrestling, foot-race, armed duel, the *solos* throw, archery at a dove;
  - deterministic scoring: trait + training + `stream`;
  - prizes: a tripod, a woman's craft (handle as "a weaver's contract"), an iron lump (an ore stock);
  - **truce**: wars pause during games (the ekecheiria);
  - victors gain kleos and a statue tile;
  - bone champions can't die in armed duels (they break), so Leaves dominate the foot-race "for a life".
- **Stories:** Antilochus' trick in the chariot race (23.402–611) gives a "cheating dispute" event in which the elders arbitrate.

### 3.7 Oikos continuity: dowry, epiklēros, adoption, phratry
- **Sources:**
  - **epiklēros**: a daughter without brothers must marry her father's nearest agnate so the estate stays in the line (Isaeus; [Arist.] *Ath. Pol.* 56.6; https://en.wikipedia.org/wiki/Epikleros);
  - the **Gortyn Code** (cols. VII–VIII, the *patroiokos* rules; https://en.wikipedia.org/wiki/Gortyn_code);
  - **adoption** to save an oikos (Isaeus 2 and 7);
  - the **Apatouria** (month Pyanepsion): fathers present children to the **phratry**, and on the third day, *Koureotis*, an oath of legitimacy and the sacrifices *meion* and *koureion* (Overview: https://en.wikipedia.org/wiki/Apatouria).
- **Mechanics:**
  - **Heiress rule:** a Leaf heiress with no brothers is pressed to marry the nearest kinsman. This drives Penelope's web (§2.1.2), elopements and Alcinous-style rulings.
  - **Adoption:** a childless elder Leaf may adopt an adult of another house to keep the line. The chain already treats **XFER** as adoption (LORE, "Houses"), so make it symmetric: Leaf adoption mirrors token transfer.
  - **Phratry enrolment:** at the yearly Apatouria every Leaf born that year is enrolled. If kin contest the father's oath, the child is "unenrolled": no inheritance and no vote. A 2nd-generation identity crisis.
  - **Dowry:** a transfer at marriage that comes back if the marriage ends. This is a conserved wealth circulation that can *lower* Gini.

### 3.8 Liturgies and antidosis: the Gini fix
- **Sources:**
  - the trierarchy (equip and command a warship for a year), choregia (fund a chorus), gymnasiarchia, **hestiasis** (feast the tribe), *architheoria* (lead a sacred embassy); later the *eisphora* war-tax;
  - **antidosis**: a man named to a liturgy may challenge a richer man to take it on *or swap entire estates* (https://fhw.gr/chronos/05/en/politics/330leitourgies.html; https://garycorby.com/blog//2011/03/liturgy-and-joy-of-antidosis.html).
  - Prestige came from performing beyond the minimum (Lysias 21).
- **Mechanic** (directly answers HANDOVER §7, "Inequality"):
  - Each year in Hekatombaion (or month 1), each city names its top-K richest oikoi to liturgies, scaled so total cost ≈ 2–4% of top-decile wealth:
    - **Trierarchy:** pays rowers' wages for a convoy escort, which cuts pirate skimming in `trade.js` for a year.
    - **Choregia:** funds a festival. Obols go to performers (poor agents), and the city gets a mood bonus.
    - **Hestiasis:** buys food at market for the poorest households; a direct famine relief, the fix for Lemnos and the forges.
    - **Sitonia:** imports grain to a famine city at landed price.
  - Money moves from rich to poor through purchases, so the **invariant holds**.
  - **Antidosis:** a named oikos may challenge a richer non-named one. The challenged one either takes the liturgy or the estates are *swapped* (rare, ≤1 per year, deterministic). If neither, the Boule decides.
  - **Kleos:** lavish performers earn prestige and votes. Refusers get hubris (§3.15) and an ostracism weight.
- **Canon fit:** the **Chryseoi are "givers of wealth"** (WD 126). Liturgy is their natural duty, and dodging it is a betrayal of their blood.

### 3.9 Mystery cults: Eleusis, Samothrace, the Orphics
- **Eleusis.**
  - Sources: HH Dem. 473–482; the *synthema* (password), "I fasted, I drank the kykeon, I took from the chest, worked it, put it in the basket…" (Clement, *Protr.* 2.21 ≈).
  - Initiates are "happy" in death. Lesser Mysteries in Anthesterion, Greater in Boedromion: day 1 gathering; day 2 "**Initiates to the sea!**", with each one washing a piglet; the procession on the 19th with the cry "Iakch' ō Iakche"; the night of the Telesterion.
- **Samothrace and the Kabeiroi.**
  - Sources: Ap. 1.915–921 [V]: the crew are initiated, "the rites that may not be uttered". Initiates were believed safe at sea (Diod. 5.49.5–6 ≈).
  - Candidates were asked to confess the worst deed of their life (Plut. *Lac. apophth.* 217d, 229d ≈, the Lysander and Antalcidas anecdotes).
- **The Orphic gold tablets** (Petelia, Hipponion, 4th c. BCE+; overview https://en.wikipedia.org/wiki/Orphic_Gold_Tablets — the URL was rate-limited when checked).
  - The soul is told: "you will find on the left of the house of Hades a spring, and beside it a **white cypress**; do not approach it. You will find another, from the **lake of Memory**, cold water flowing forth."
  - It must say: "**I am a child of Earth and starry Sky**, but my race is of heaven… I am parched with thirst and perishing; give me quickly cold water from the lake of Memory."
- **Mechanic A: Lethe at the Asphodel re-knit** (signature).
  - When a broken Minyas re-knits (the existing 20–60 day shade → living transition), it "drinks".
  - Uninitiated: **Lethe**. It loses a deterministic 30–70% of bond strengths and its beloved link, forgets feuds (feud scores halve), and keeps faction and house. It may fail to recognise its own Leaf children: a strong sift pattern, "she came back and did not know him".
  - Initiated (Orphic or Samothracian faith members, or those who paid the rite): **Mnemosyne**. It keeps everything and gains +prestige ("remembers Asphodel").
  - Twice-broken Argonauts accumulate Lethe: the "hollow ones".
  - **Chain tie:** a **RULING** on a token while it is in Asphodel = "the Maker gave it Memory to drink" (automatic Mnemosyne).
  - **Horror:** the beloved who returns a stranger.
- **Mechanic B: Samothracian protection.** Initiates' ships get −50% shipwreck and pirate loss. The initiation requires **confession**: the agent's worst logged deed is narrated publicly. Costly signalling (Sosis), and the confession can trigger revenge.
- **Mechanic C: Eleusinian piglets.** A yearly mass katharsis wipes miasma ≤1 for initiates. The "Initiates to the sea!" procession is drawn at Pagasae.

### 3.10 Oracles, hero cult and relic bones
- **Delphi.**
  - Procedure: consultations on the 7th of the month (originally once a year, later monthly); the *pelanos* fee; a goat sprinkled with cold water must shiver all over or there is no consultation (Plut. *De def. or.* 437a–b ≈); *promanteia* (priority rights) as an honour.
  - Ambiguity:
    - Croesus, "if you cross the Halys, you will destroy a great empire" (Hdt. 1.53);
    - "when a **mule** becomes king of the Medes" (Hdt. 1.55);
    - "**wooden walls**" (Hdt. 7.140–143).
- **Dodona.**
  - The rustling oak and doves; the **Selloi** "with unwashed feet who sleep on the ground" (Il. 16.233–235).
  - More than 4,000 **lead question tablets**, phrased as yes/no: e.g. "Lysanias asks Zeus Naios and Dione **whether** the child Annyla carries is not his" (https://www.greeknewsagenda.gr/ancient-voices-on-lead-the-tablets-of-the-dodona-oracle-and-the-timeless-search-for-answers-to-human-concerns/).
  - The Argo's beam *is* Dodona oak (Ap. 1.524–527 [V]).
- **Trophonius** at Lebadea (Paus. 9.39, https://www.theoi.com/Text/Pausanias9B.html). You descend into the hole feet first, come back terrified, and are sat on the Chair of Memory; folk saying: such people never laugh again.
- **Hero cult and bones.**
  - **Orestes' bones** were stolen by Sparta from Tegea so Sparta would win the war (Hdt. 1.67–68, http://www.perseus.tufts.edu/hopper/text?doc=Hdt.+1.67), a giant's coffin 7 cubits long. Cimon brought Theseus' bones home (Plut. *Thes.* 36).
  - **Cleomedes of Astypalaea** (Paus. 6.9.6–8, http://www.perseus.tufts.edu/hopper/text?doc=Paus.+6.9.6): an Olympic boxer kills his opponent and is denied the prize; maddened, he pulls down a school roof on 60 boys, hides in a chest, and the chest is found empty. The Pythia: "Cleomedes is the last of the heroes; honour him."
  - **Theagenes' statue** (Paus. 6.11.6–9): it falls on a man who was flogging it, is tried for murder and thrown into the sea; famine follows until it is fished up and worshipped (https://en.wikipedia.org/wiki/Theagenes_of_Thasos).
  - **The Hero of Temesa** (Paus. 6.6.7–11) demanded a virgin each year until the boxer Euthymus beat him.
- **Mechanic A: the Beam as Dodona.**
  - Every **BEAM** event (renderer change) is an oracle day. Agents queue lead-tablet questions: whether to marry, migrate or go to war, chosen from their pending decisions.
  - The beam's visor phrase is the answer, interpreted per question by a deterministic lookup (phrase → yes/no/ambiguous by hash).
  - The sifter records which questions were "answered true" later.
- **Mechanic B: Delphic consultations.**
  - Cities consult monthly on the 7th, before war, colony or plague responses.
  - The answer comes from an **ambiguity grammar** (§5.4) that is *always resolved after the fact*: the template binds to two candidate referents, e.g. "a great city will fall", and whichever falls first in the event log claims it.
  - This is the Croesus mechanic, and it is free.
- **Mechanic C: bone relics.**
  - A broken Minyas in Asphodel is vulnerable: rival factions may **steal its bones** (Orestes) to gain war power.
  - Its re-knit is then *delayed* until the bones are returned. A hostage-of-the-dead mechanic that only works because the Minyai are bone.
  - **Horror:** a body held for ransom so it cannot come back to life.
- **Mechanic D: dead athletes and statues.**
  - A games champion who kills in the ring is denied the prize, may go berserk (Cleomedes), and is then worshipped.
  - Statues that fall and kill are put on trial and thrown into the sea; famine follows until they are restored (Theagenes).
  - Pairs with the **Bouphonia** (§3.13), where the axe is tried and drowned.

### 3.11 The restless dead and necromancy
- **Categories** (S. I. Johnston, *Restless Dead*, 1999):
  - **aōroi**: the untimely dead, especially the unmarried;
  - **biaiothanatoi**: the violently dead;
  - **ataphoi**: the unburied.
- **Ritual binding:** curse tablets were deposited in their graves to recruit them.
- **Revenant stories:**
  - **Philinnion** (Phlegon of Tralles, *Mirabilia* 1, https://en.wikipedia.org/wiki/Phlegon_of_Tralles): a dead girl visits her parents' *guest*, a young man, every night for months. When discovered she falls dead again, her tomb is found empty except for his gifts, and she is burned outside the walls.
  - **Polycritus** (Phlegon, *Mir.* 2): a ghost returns, devours his own deformed child, and the child's severed head prophesies.
- **Necromancy:**
  - Od. 11 (pit rite [V]);
  - the **Nekyomanteion of Ephyra/Acheron** (https://en.wikipedia.org/wiki/Necromanteion_of_Acheron);
  - Periander asks Melissa's ghost at the Acheron (Hdt. 5.92η, already in LORE #23);
  - Darius' ghost raised in Aesch. *Persians* 681ff.
- **Mechanic: the Restless Leaf.** Every Leaf death gets a `restless` category:
  - aōros (under 20, unmarried);
  - biaiothanatos (killed in a riot, war, feud or duel);
  - ataphos (funeral skipped; the existing `unburied` flag is used for shades).
- **Effects:**
  - Restless dead feed haunting events in their home district.
  - They are the **raw material for curse tablets** (§3.12): a district with many aōroi has more curses.
  - Rare **Philinnion revenant**: an aōros girl whose household had a guest at the time of death returns to that guest for N nights. The guest gets mood swings and "in love". Exposure brings a burning outside the walls and a xenia rupture between the houses.
- **Necromancy:**
  - A grieving agent with high Openness, or a Hecate faith member, may go to the Acherusian cave (an existing place) to ask a dead kinsman a question.
  - Cost: a black ram (a food stock) plus one day.
  - The answer is one *true* hidden fact from the event log (who threw the stone, who stole the bones). A revelation mechanic that feeds feuds.
- **Bone tie:** broken Minyai in Asphodel *can answer* necromancers lucidly, since they will come back. A Leaf asking its broken Argonaut parent for advice is a uniquely Argo story.

### 3.12 Curse tablets (katadesmoi)
- **Sources:**
  - Gager, *Curse Tablets and Binding Spells* (1992);
  - https://en.wikipedia.org/wiki/Curse_tablet;
  - Faraone on the performative twist and piercing of the lead.
- **Formulae:**
  - "**I bind** (*katadō*) X and his tongue and his hands and his feet and his work";
  - "**I register** (*katagraphō*) X before Hermes Katochos and Persephone";
  - "as this lead is cold and useless, so may X be cold and useless";
  - "may his tongue be bound before the jurors";
  - the target named with the *mother's* name (later magical papyri).
- **Deposit sites:** graves of aōroi, wells, sanctuaries of Demeter. A nail through the folded lead; lead figurines with bound arms.
- **Mechanic:**
  - An agent with a grudge (opinion < −70) plus access (a Hecate faith, a pharmakon guild, or Lemnian wives' smoke trade) writes a tablet.
  - It is deposited in a restless grave in the district (§3.11), so curses need aōroi.
  - Effects, by deterministic chance: rival's court case lost, business output −20%, love lost, illness.
  - Discovery: the Lynceus office may find a tablet (an existing audit role), which exposes the curser and gives them miasma 1 and feud +.
- **Chain tie:** a **RULING** on the target's token reverses the binding ("the Maker cut the knot").
- **Horror:** neighbourhoods poisoned by quiet lead; tablets found in children's graves.

### 3.13 The festival calendar
Real Attic festivals, mapped onto the existing voyage months (`culture.js` MONTHS). Months: https://en.wikipedia.org/wiki/Attic_calendar.

| Festival (Attic month) | Rite | Argo mechanic |
|---|---|---|
| **Panathenaia** (Hekatombaion 28) | Robe (peplos) for the goddess, procession, games | The Fleece procession: the Grove's guardians parade; Pagasaean Games year |
| **Genesia** (Boedromion 5) | State festival for dead parents | Asphodel visiting day; Leaves tend graves (+memory) |
| **Eleusinian Mysteries** (Boedromion 15–23) | §3.9 | Initiation window |
| **Thesmophoria** (Pyanepsion 11–13) | Women only. Piglets thrown into the *megara* pits; the rotted remains are brought up by "bailers" and mixed into seed-corn; day 2 *Nesteia* fast; day 3 *Kalligeneia*. https://en.wikipedia.org/wiki/Thesmophoria | Seed-blessing: next harvest ×1.1 if kept; skipped → Demeter's Withholding (§2.4). Men who spy are attacked (Battus' castration story ≈ Aelian fr.) |
| **Apatouria** (Pyanepsion) | Phratry enrolment | §3.7 |
| **Pyanepsia / Oschophoria** (Pyanepsion 7) | Bean stew; the *eiresiōnē* branch hung on doors | Harvest-home; a bean-good food sink |
| **Haloa** (Posideon) | Threshing-floor women's feast | Women's faction mood |
| **Lenaia** (Gamelion) | Wine and comedy | Satire of office-holders: −popularity for the most hubristic |
| **Anthesteria** (Anthesterion 11–13) | Pithoigia (jars opened), **Choes** (silent drinking contest, each man with his own jug, a custom founded for polluted Orestes), **Chytroi** (seed-pots for Hermes Chthonios). Buckthorn chewed, doors pitched; "**Out the door, Kēres, it is no longer Anthesteria**" | Already exists; add Choes silence (no gossip that day) and doors pitched (haunting −) |
| **City Dionysia** (Elaphebolion) | Tragedy contests; choregia | Liturgy showcase (§3.8) |
| **Thargelia** (Thargelion 6–7) | **Pharmakos**: two ugly or poor men, fed then beaten with squills and driven out (Hipponax frs.; https://en.wikipedia.org/wiki/Pharmakos) | Scapegoat rite: in famine or plague a city expels its two lowest-status members; city miasma resets. Horror: who gets chosen |
| **Skira; Dipolieia/Bouphonia** (Skirophorion 14) | An ox is killed at Zeus' altar; the killer flees; a trial; the **knife is found guilty and thrown into the sea** (Paus. 1.24.4, 1.28.10) | Annual "trial of the axe": shifts blame for a year's worst killing onto an object; reduces feud for the unresolved |
| **Adonia** (summer, private) | Women grow quick-withering "gardens of Adonis" on rooftops | Anthemoessans' holy days: a flower sink; lament |
| **Agrionia** at Orchomenus (Boeotian) | Descendants of the **Minyades** (the "Oleiai", murderesses) are chased by the priest with a sword; once a priest, Zoilus, killed one (Plut. *Quaest. Graec.* 38; https://en.wikipedia.org/wiki/Agrionia) | See below |

**The Minyades and the Agrionia: a must-build.**
- **The myth.** The daughters of **Minyas**, king of Orchomenus and eponym of the *Minyai*, refused Dionysus' rites and stayed at their looms. They were driven mad, tore apart one sister's child (Hippasus), and became bats (Ant. Lib. 10; Ov. *Met.* 4.1–415, https://www.theoi.com/Text/OvidMetamorphoses4.html; https://en.wikipedia.org/wiki/Minyades).
- **The rite.** At the Agrionia, women of their line fled and the priest chased them with a sword.
- **Mechanic:** a yearly rite in the Minyai's own name.
  - The female line of the most impious Minyai house (the lowest festival attendance) is chased through the Agora.
  - Usually symbolic; a deterministic 1/20 chance that the "priest" (a zealous office-holder) truly strikes. A Leaf dies or a Minyas breaks.
  - The house's festival attendance afterwards rises (fear works).
- **Horror:** bats over the looms. The canon name *Minyai* carries this myth already.

### 3.14 Recognition tokens (anagnōrisis)
- **Sources:**
  - Aristotle *Poet.* 1454b19–30 lists the kinds: signs (scars, necklaces, the Spartoi spear-mark), contrived tokens, memory, reasoning;
  - Od. 19 (the scar), 23 (the bed), 24 (the orchard trees);
  - symbola (§3.1).
- **Mechanic:**
  - Every agent carries one or two private recognition facts: a scar from a logged injury, a secret shared with a beloved, a symbolon half.
  - Re-knit Minyai who drank Lethe (§3.9), exiles returning, and disguised Watchers (§2.1.6) are recognised only when a counterparty's memory matches a token.
- **Stories:** "The old nurse washed his feet and found the boar-scar."

### 3.15 Hubris → nemesis → atē; phthonos
- **Sources:**
  - Hdt. 1.32: Solon, "call no man happy until he is dead";
  - Hdt. 3.40–43: **Polycrates' ring**. Amasis warns that unbroken luck invites divine envy; Polycrates throws away his best ring; it comes back inside a fish; Amasis breaks off the friendship; Polycrates is later crucified;
  - Il. 19.91–94: Atē walks on men's heads.
- **Mechanic:**
  - `fortune[i]`, a run-length of consecutive good outcomes (trades, wins, offices).
  - Above a threshold, the agent may make a **Polycrates offering**: destroy a cherished relic (a money/relic sink).
  - If the offering "returns" (a deterministic 1/6), doom is certain within the season.
  - Hubris acts (humiliating inferiors, refusing a liturgy, desecration) add to a `nemesis` debt that the director pays down as targeted catastrophe.
  - Turned off at Iron-clock tier 2 (§2.3).

### 3.16 Horror bestiary (sourced)

| Creature | Source | Behaviour → mechanic |
|---|---|---|
| **Kēres** | Il. 18.535–538; *Shield* 248–257 (drink the blood of the fallen) | Battlefield after-event: wounded Leaves in a lost battle may die overnight ("the Kēres came") |
| **Erinyes** | Aesch. *Eum.*; WD 803 [V] | Pursue kin-slayers and oath-breakers (§3.2, §3.5) |
| **Empusa** | Ar. *Frogs* 288–295 (shape-shifting; one leg of bronze, one of dung); Philostratus *VA* 4.25 (the bride of Menippus, a lamia who fattens youths to eat them); https://www.theoi.com/Phasma/Empousai.html | Rare: a "too-perfect" lover appears to a lonely Leaf; their health declines; an exposer (a philosopher/augur) unmasks her and the household dissolves into dust |
| **Lamia** | Diod. 20.41 ≈; Duris | A queen whose children were killed; she takes others' infants; she removes her own eyes to sleep. Infant-death spikes in famine get attributed to Lamia |
| **Mormo** and **Gello** | Gello: Sappho fr. 178 ≈, an untimely-dead girl who steals children (https://en.wikipedia.org/wiki/Gello) | Nursery bogeys: Leaves' child-mortality narration |
| **Harpies** | Ap. 2 [V] | Exists |
| **Stymphalian / Ares birds** | Ap. 2.1030ff [V] | Exists |
| **Talos** | Ap. 4 [V] | §1.9J |
| **The Hero of Temesa** | Paus. 6.6.7–11 | A resentful shade demands a yearly tribute (§3.10) |
| **Ephialtes** (nightmare) | — | Sleep-paralysis thoughts |
| **Vrykolakas** | [LATE] Leo Allatius (1645), Byzantine/modern Greek; https://en.wikipedia.org/wiki/Vrykolakas | Excommunicated, unburied or cursed dead swell and walk. **Bone does not rot**, so Leaves only: a body that won't decay after a curse (§3.12) |
| **Mixed-limb beasts** | Ap. 4.672–681 [V], Empedoclean | Circe omen (§1.9K) |
| **Kampe, Typhon's brood** | Th. 820–880 | Reserved for rare apocalyptic weather |

---

## 4. Economy realism

### 4.1 Hesiod's farming year (WD 383–617 [V]) as a production calendar
Map onto the 360-day year (12 × 30). Peak multipliers apply to `food` yield and labour demand.
- **Pleiades rise, early May:** **harvest**, the reaping peak. Food ×1.6 and all hands on the field ("strip to sow, strip to plough, strip to reap", WD 391).
- **Summer, Sirius:** rest in shade and drink "Bibline wine" (582–596 [V]). Low work and festivals; also the **threshing** and winnowing, then store the grain in jars.
- **Arcturus rising, 50 days after the winter solstice:** prune vines before the swallow arrives (564–570).
- **Grape harvest when Orion and Sirius are mid-heaven** (609–614): wine.
- **Pleiades set, November:** **plough and sow** (384, 448 [V]); sowing at the crane's cry. Labour peak; food yield nil.
- **Winter, Lenaion:** "bad days, all of them, that flay oxen" (504ff). Food draws on stores, cloth demand rises, and the Boreas wind brings hunger and cold deaths for the old (Leaf mortality ×1.2).
- **Storage rule:** WD 368–369, "spare at the middle of the jar". Thrift as an agent trait.

### 4.2 Sea season and sailing
- **The safe window:** Hesiod's late-summer 50 days (663 [V]), with a risky spring window (678 [V]). The Roman *mare clausum* roughly 11 Nov – 10 Mar (Vegetius 4.39 **[LATE]**, 4th c. CE).
- **Mechanic:**
  - Sea trade ×0 in the closed season, ships laid up per WD 624–629;
  - spring sailing at shipwreck risk ×3;
  - peak traffic late summer.
  - Pirate activity peaks with traffic: Thuc. 1.5 says piracy was once no disgrace, and Od. 3.71–74 asks "are you pirates?" without offence.
- **Becalmed:** Ap. 1.1078–1152 [V] (12 days wind-bound until a rite) and Aulis. A becalmed fleet needs a rite: the Rhea armed dance, or song (§1.5).

### 4.3 Goods, routes, drought, famine
- **Bronze Age cargo** (the Uluburun wreck, c. 1300 BCE; https://en.wikipedia.org/wiki/Uluburun_shipwreck): ~10 t copper oxhide ingots, ~1 t tin, glass ingots, terebinth resin, ebony, ivory, amber, ostrich eggs, Canaanite jars of olives, gold and silver scrap, figs and pomegranates. **Proposed new goods:** amber (Eridanus, Ap. 4.608–610 [V]), tin, resin, purple dye (Reef), wine.
- **Black Sea:**
  - Colchian gold panned with fleeces (Strabo 11.2.19, already in LORE);
  - **Chalybes iron**, exchanged "for daily sustenance" (Ap. 2.1002–1008 [V]); Xenophon met the Chalybes (*Anab.* 5.5.1 ≈);
  - Pontic grain, salted tunny, hides, honey, wax and slaves (later classical Athens depended on Pontic grain).
- **Drought → colony.** Hdt. 4.151 ≈: Thera went seven years without rain, so Delphi ordered the Cyrene colony; colonists were chosen by lot, one brother from each pair.
  - **Mechanic:** a multi-year drought in a city triggers an **apoikia** draft by lot. The emigrants sail with an oikist (the Euphemus office) and sacred fire from the city hearth. If they come back before the time, they are shot at from the shore (Hdt. 4.156 ≈).
- **Famine relief:**
  - The **Cyrene grain stele** (SEG 9.2, c. 330–326 BCE) lists ~805,000 medimnoi sent to 41 communities (Athens 100,000; Olympias 60,000…). A real-shaped template for a "grain gift" chronicle entry.
  - Grain officials (*sitophylakes*) policed prices.
  - Cleomenes of Naucratis cornered the Egyptian grain trade (Ps.-Arist. *Oec.* 2.1352a ≈): a hoarder villain.
  - **Mechanic:** sitophylax office (anti-hoarding price caps); a hoarder archetype; grain gifts between cities raise relations (Pindar-style praise).
- **Shipbuilding:** Od. 5.234–261 (tools and timber); the Argo built of Pelion pine by Argus with Athena (Ap. 1.18–19, 111–114 ≈); a trireme takes ~170 rowers (the thetes). The `Argus` office with ship-craft (Henrich) is already present.

---

## 5. Procedural poetics: grammars without an LLM

### 5.1 Parry–Lord: the formula *is* a generative grammar
- **Definition.** Milman Parry: a formula is "a group of words which is regularly employed under the same metrical conditions to express a given essential idea" (https://www-current.chs.harvard.edu/?p=228153).
- **Thrift (economy).** For a given idea in a given slot there is usually one formula.
- **Lord**, *The Singer of Tales* (1960): singers compose live from formulae plus **type-scenes** (arming, feasting, sacrifice, arrival, supplication, assembly, bathing, dream, lament).
- **Implementation:** each noun has an **epithet ladder** keyed by slot length: short / medium / long, matching Homer's metrical sizes, e.g. "Achilles" / "swift Achilles" / "swift-footed brilliant Achilles".
  - The narrator picks by deterministic hash and "slot" (sentence position).
  - Thrift is enforced: the same entity in the same position always gets the same epithet. Homer does this, and it gives a strong oral feel.
  - Agents earn epithets from logged deeds (extending the existing COGNOMENS), and the epithet *becomes formulaic* after 3 uses.

**Type-scene skeletons** (for narrate.js)
- **Sacrifice** (Il. 1.458–469): *prayed → sprinkled barley → drew back the necks → slaughtered → flayed → cut thigh-pieces → wrapped in fat, double-folded → raw bits on top → burned on split wood → poured wine → tasted the innards → cut the rest, spitted, roasted → feasted; "nor did any heart lack the equal feast"*.
- **Arrival/xenia** (Od. 1, 4): *stood at the threshold → host saw and was indignant the guest waited → took his hand, took his spear → seated him → handmaid brought water in a golden ewer over a silver basin → table, bread, meats → "when they had put from them the desire for food and drink" → question: "Who are you, from where? Where is your city and your parents?"*
- **Death in battle:** *X struck Y [place] → bronze passed through → "darkness covered his eyes" / "his limbs were loosed" / "he fell with a thud and his armour clanged upon him" → [optional obituary: from [place], son of [father], who [detail]; his parents will not receive him back].*
- **Assembly:** *summoned by heralds → the staff placed in hand → "Hear me, …" → speech → the people roared like waves → rose and scattered.*
- **Dawn line:** "When early-born, rosy-fingered Dawn appeared…" (Od. 2.1 and passim). Each sim-day can open with one of a dozen dawn formulae.

### 5.2 Catalogues
- **Pattern** (Il. 2 Ships, Ap. 1.23–233, Hesiodic *Catalogue of Women*): `[Name], son of [Father], who dwelt in [Place]; with him came [N] [ships/men]; [one deed or doom].`
- **"Or such as…"** (*ē hoiē*) is the Hesiodic link-phrase for chaining entries.
- **Use:** Legends pages, war musters, and the yearly roll of the dead kept by the Aethalides.

### 5.3 Similes
- **Template:** "As when [nature scene], so [action]."
- **Sourced banks:**
  - **Falling:** "as an oak falls, or a poplar, or a tall pine" (Il. 13.389); "like pines or oaks which storms beat down" (Ap. 3.1374 ≈).
  - **Swarm:** "as flies about milk-pails in spring" (Il. 2.469).
  - **Leaves:** Il. 6.146.
  - **Crowd:** "as the waves of the sea" (Il. 2.144).
  - **Fire:** "as fire through a forest" (Il. 2.455).
  - **Hounds:** Ap. 3.1373 ≈.
  - **Butcher and bull:** Ap. 4.464 [V].
  - **Bats:** Od. 24.6.
  - **Thrushes in a net:** Od. 22.468.
  - **Like long trees just hewn:** Ap. 1.1003 ≈.

### 5.4 Oracle verse
- **Shapes:**
  1. **Conditional:** "But when [X], then [Y]": "when a mule is king of the Medes" (Hdt. 1.55); "beware the man of one sandal" (Apd. 1.9.16 [V]).
  2. **Riddle-object:** "Wooden walls alone shall stand"; "the heavy one the ship cannot bear".
  3. **Bivalent statement:** "If you [act], a great [entity] will fall."
  4. **Address:** "Wretches, why sit you? Flee to the ends of the earth" (Hdt. 7.140 ≈).
- **Generation:** pick a shape. Fill X with an *improbable but possible* future world-state from the state vocabulary (a mule = a hybrid-blood office-holder; a one-sandalled man = an agent with a missing-item trait). Register the prophecy, and let the sifter close it when the event log matches.

### 5.5 Lament and epitaph
- **Goos (personal lament)**, from Il. 24.725–775 and 19.287–300. Structure:
  1. **address** to the dead ("Husband, you were lost from life young");
  2. **reproach** ("and you leave me a widow in the halls");
  3. **past** ("you were always gentle to me");
  4. **future** for the mourner and children ("now the child will…", "who will…");
  5. closing **refrain**, the women's wail ("and the women moaned in answer").
- **Thrēnos** is the formal dirge led by professional singers (24.720–722).
- **Epitaphs.** Real funerary-epigram patterns (Peek, *GVI*; Hansen, *CEG*; *Greek Anthology* bk 7, https://www.attalus.org/poetry/anth7b.html):
  - **Monument speaks:** "I am the sēma of [Name]…"
  - **"Stranger, tell…":** "Stranger, go tell the Spartans that here we lie, obeying their words" (Simonides, AP 7.249).
  - **Passer-by halt:** "Stand and pity, passing by the tomb of dead [Name], whom raging Ares destroyed fighting in the front ranks" (the Kroisos kouros base, *CEG* 27 ≈).
  - **Parent set it up:** "[Father] set up this monument for his dear son [Name]…"
  - **Aōros theme:** "Instead of a marriage, [Name] got a tomb" (common for girls).
  - **Chaire exchange:** "Farewell (*chaire*), [Name]." / the dead replies: "and you, stranger, farewell."
  - **Earth formula:** "The earth here covers [Name]…"; "Light lie the earth upon you."
  - **Oar:** "[Name], whose oar the meadow keeps" (from Elpenor, Od. 11.77).
- **Rule:** Leaves get type by death category (§3.11): aōroi get the marriage-tomb formula, war dead the passer-by-halt formula. Burned Minyai get a fire variant: "Fire, which alone unmakes us, took [Name]."

### 5.6 Boasts, taunts, flyting
- **Euchos** (victor's boast over the fallen): Il. 16.745–750, Patroclus mocks Cebriones' fall as a diver's leap; Il. 14.454–457, 21.122–135.
- **Pattern:** "Lie there, [Name]; now [mocking image of his fall]; [your parents will not bury you / dogs and birds will tear you]."
- **Taunt before a duel** (Il. 20.178–258, Achilles and Aeneas): genealogy-boasting. "I know your race, you know mine… but words are cheap; let's try with bronze."

### 5.7 Hymn and prayer structure
- **Hymn structure** (Homeric Hymns [V]):
  1. **Invocation:** "I begin to sing of [god], [epithets]…";
  2. **attributes and cult places:** "who holds [places]";
  3. **pars epica:** a myth;
  4. **farewell plus transition:** "And so farewell, [god]; and I will remember you and another song too".
- **Prayer**, "da-quia-dedi" (Chryses, Il. 1.37–42):
  1. "Hear me, [epithet], who [protect place]";
  2. "if ever I [roofed your temple / burned fat thigh-bones of bulls and goats]";
  3. "grant me this wish: [request]".
- **Use:** faith rituals and prophets' calls, with the god-slot filled from the faith's deity (the "Fire-that-Unmakes" etc.).

### 5.8 Assembly speech (for the roadmap's "elections with speeches")
- **Skeleton:**
  1. take the staff;
  2. "Hear me, [men of city] / [blood-name]";
  3. **appeal to precedent** (a myth or chronicle event: "remember the night of the Doliones");
  4. **proposal**;
  5. **gnomic clincher** (a WD maxim: "a bad neighbour is a great plague");
  6. **threat or oath**.
- **Responses:**
  - "and they all fell silent";
  - "the assembly roared like the long waves of the Icarian sea" (Il. 2.144–146);
  - Thersites interruption (§2.2).
- **Ainos (fable)** is the persuasion device (hawk and nightingale).

---
## 6. Top 25 lore mechanics, ranked (impact × fit)

- **Impact** = how many stories per sim-year a spectator can read, plus systemic reach.
- **Fit** = faithful to the sources, and tied to the chain canon or the bone/Leaf split.
- Scores are 1–5 each.
- **Cost:** S = a day or less, M = a few days, L = a week.

| # | Mechanic | § | I | F | Cost | Why |
|---|---|---|---|---|---|---|
| 1 | **Liturgies + antidosis** (trierarchy, hestiasis, sitonia) | 3.8 | 5 | 5 | M | Fixes Gini and the Lemnos/forges famine while conserving money; Chryseoi as "givers of wealth" |
| 2 | **The Stone in Their Midst** (Spartoi self-slaughter, spear-mark, eternal year) | 1.2 | 5 | 5 | M | The 4,468-strong core faction gets its defining myth; SALE-triggered |
| 3 | **Lethe/Mnemosyne at re-knit** | 3.9 | 5 | 5 | S | Makes every bone-break matter; Leaves who aren't recognised; RULING = Memory |
| 4 | **Inherited xenia from SALE** (symbola, refusal to fight) | 3.1 | 5 | 5 | M | Every real trade forges a guest-bond; war and refugees get texture |
| 5 | **Miasma/katharsis + Erinyes** | 3.2 | 5 | 5 | M | LORE names it but it isn't built; gates offices, plague, Circe service |
| 6 | **Blood-feud vs poinē (bone half-price)** | 3.5 | 5 | 5 | M | Feuds across generations; the bone/Leaf moral asymmetry in one rule |
| 7 | **The Iron Clock** (Five Ages; grey-templed births) | 2.3 | 4 | 5 | S | World-health metric with a sourced apocalypse sign |
| 8 | **Oaths + Glaucus/Styx curses on lineages** | 3.4 | 4 | 5 | M | Long-tail "curse fulfilled" stories; ADICO treaties get teeth |
| 9 | **Beam as Dodona oracle** (lead-tablet questions on BEAM) | 3.10 | 4 | 5 | S | Renderer changes become citywide question days |
| 10 | **Delphic ambiguity grammar** (resolved after the fact) | 3.10, 5.4 | 4 | 5 | S | Prophecies that always come true, at no cost |
| 11 | **Theoxenia** (disguised Chryseoi testing hospitality) | 2.1.6 | 4 | 5 | S | Rare-blood agents get a role; moral stories |
| 12 | **Bone relic theft** (Orestes; delayed re-knit) | 3.10 | 4 | 5 | M | Only possible with deathless bone; a hostage-of-the-dead mechanic |
| 13 | **Restless Leaf dead + curse tablets** | 3.11–12 | 4 | 4 | M | Horror engine fed by real death categories |
| 14 | **Hesiodic farming year + sea season** | 4.1–4.2 | 4 | 4 | S | Seasons the spectator can see; trade pulses; winter deaths |
| 15 | **Funeral & Pagasaean Games** (Il. 23 events, truce) | 3.6 | 4 | 4 | M | Recurring spectacle; kleos; cheating disputes |
| 16 | **Minyades / Agrionia** | 3.13 | 3 | 5 | S | A rite in the Minyai's own name; yearly dread |
| 17 | **Demophon heresy** (fire-nursing of Leaves) | 2.4 | 3 | 5 | S | The darkest sourced horror; never breaks canon |
| 18 | **Theoclymenus' vision** (doom timer on hubristic hosts) | 2.1.1 | 3 | 5 | S | Homer's best horror set-piece; pairs with any catastrophe |
| 19 | **Supplication** (knees, altar; refusal → miasma) | 3.3 | 3 | 5 | S | Gives the losers of wars and feuds a move |
| 20 | **Lemnian New Fire** (9 dark days) | 1.9A | 3 | 4 | S | A yearly ritual for a famine island; ship drawn on the map |
| 21 | **Symplegades first passage** | 1.9F | 3 | 4 | S | One-time world change; founder monument |
| 22 | **Apoikia by lot in drought** (oikist, sacred fire, delayed clod) | 4.3, 1.3 | 4 | 4 | L | New cities; an outlet for overpopulation; Euphemus office |
| 23 | **Thargelia pharmakos** (scapegoat expulsion) | 3.13 | 3 | 4 | S | Grim social-choice horror in crises |
| 24 | **Phineus' curse** on over-accurate augurs | 1.9E | 3 | 4 | S | Ties the sifter's "prophecy fulfilled" back into the sim |
| 25 | **Alcinous ruling** (Ouranidai conditional arbitration) | 1.9H | 3 | 4 | M | Gives the 9 Aliens a role; night-before loopholes |

**Honourable mentions:**
- Wrath of the Champion (Il. 1/9);
- Mossynoecian law;
- Cattle of Helios;
- the Beam Refuses (whale put ashore);
- the Stone Ship;
- Penelope's web;
- Polycrates' ring;
- Bouphonia axe-trial;
- Talos guardian;
- Philinnion revenant;
- Hylas' spring.

---

## 7. Vocabulary appendix: grammar-ready lists

Transliterations are simplified; *italics* in-game optional.

### 7.1 Epithets of gods

| God | Epithets |
|---|---|
| Zeus | cloud-gatherer, aegis-bearing, loud-thundering, far-seeing, son of Kronos, father of gods and men, Xenios (of guests), Hikesios (of suppliants), Horkios (of oaths), Ktesios (of the store-room), Meilichios (the appeasable), Phyxios (of fugitives; Phrixus' god) |
| Hera | white-armed, ox-eyed, golden-throned, queen |
| Athena | grey-eyed (glaukōpis), Pallas, Tritogeneia, Atrytone (unwearying), driver of spoils |
| Apollo | far-shooter, silver-bowed, Phoibos, Lykeios, Paian, Embasios/Ekbasios (of embarking/landing), Aigletes (gleaming), Smintheus (of mice) |
| Artemis | of the wild beasts, arrow-pouring, Hekate's sister-name |
| Hermes | Argeiphontes (Argus-slayer), guide (diaktoros), Chthonios, Katochos (binder), Psychopompos, luck-bringer |
| Poseidon | earth-shaker, earth-holder, dark-haired, Asphaleios |
| Hephaestus | lame-footed, famed craftsman, both-feet-crooked |
| Ares | man-slaying, blood-stained, shield-piercer, Enyalios, insatiate of war |
| Aphrodite | Cyprian (Kypris), foam-born, laughter-loving, golden, of Kythera |
| Demeter | lovely-haired, of the bright fruit, Thesmophoros (law-bringer), Chloe (green shoot) |
| Persephone | dread, holy, Kore |
| Hades | Aidoneus, host-of-many, Zeus Katachthonios, the hateful one |
| Hecate | only-begotten (mounogenes, Ap. 3.1035 ≈), daughter of Perses, Brimo (the angry), torch-bearer, of the crossroads (trioditis), nurse of youths |
| Helios | Hyperion, all-seeing, tireless |
| Dionysus | Bromios (roarer), Bakcheus, Lyaios (loosener), Eiraphiotes (insewn), Agrionios (savage) |
| Dawn | rosy-fingered, saffron-robed, early-born, golden-throned |
| Night | swift, ambrosial, black, deadly (oloē), mother of Moros |

### 7.2 Epithets of the sea, ships and the world
- **Sea:** wine-dark (oinops), unharvested (atrygetos), loud-roaring (polyphloisbos), grey (polios), misty (ēeroeis), fish-full, broad-backed, salt (hals), boundless, harbourless (on Pontus = "Axeinos", the "inhospitable", before "Euxeinos").
- **Ship:** black, hollow, swift, well-benched, curved, well-oared, sea-faring, blue-prowed, red-cheeked (miltoparēos), fifty-oared; *Argo*: of the speaking oak, much-sung (pasimelousa, Od. 12.70).
- **Earth:** life-giving, broad-pathed, many-nourishing, black; "Earth, mother of all".
- **Sky:** starry, brazen, iron.
- **Wind:** Boreas (north, Thracian), Zephyros (west, gentle), Notos (south, rain), Euros (east), Argestes (Ap. 2.993 ≈), the Etesians.
- **Men and peoples:** bronze-shirted, long-haired, horse-taming, spear-famed, well-greaved.

### 7.3 Death and battle formulae
- "darkness covered his eyes"
- "his limbs were loosed"
- "his spirit flew from his limbs and went to Hades, bewailing its fate, leaving manhood and youth"
- "he fell with a thud, and his armour clanged upon him"
- "he bit the dust"
- "the bronze passed clean through"
- "black death and mighty fate seized him"
- "he filled up the measure of his fate" (Ap. 1.1035 ≈)
- "like a falling oak"
- "the Kēres of death"
- "Hypnos and Thanatos, twin brothers"
- "his soul, like smoke, went beneath the earth" (Il. 23.100)
- **Bone variants:** "his bones unknit"; "he fell to the Meadow to mend"; "fire, which alone unmakes, took him".

### 7.4 Speech and narration formulae
- **Speech tags:** "and he spoke winged words"; "answering, he addressed him"; "looking darkly from under his brows"; "what word has escaped the fence of your teeth?"; "so he spoke, and they all fell silent".
- **Questions and prayers:** "who are you among men, and from where? Where are your city and your parents?"; "hear me, …".
- **Transitions:** "but come, let us…"; "when they had put from them the desire for food and drink"; "these things lie on the knees of the gods".

### 7.5 Places: the full Argonautic route (for new districts, lanes, names)
- **Departure:** Iolcus, Pagasae, Mt Pelion, Aphetae.
- **Out to the Propontis:** Lemnos (Myrine), Samothrace (Electris), the Hellespont, Abarnis, Cyzicus/Arcton Oros (Bear Mountain), Dindymum, Chytus harbour, Mysia, Cius, Bebrycia.
- **Through the Bosporus:** Salmydessus (Phineus), the Cyanean Rocks/Symplegades, Thynias.
- **Along the Pontus:** the Mariandyni, the Acherusian headland, the river Lycus, Sthenelus' tomb, Sinope, Halys, Iris, Themiscyra (the Amazons), Chalybia, the Tibareni, the Mossynoeci, Ares' isle (Aretias).
- **Colchis:** Philyra's isle, Mt Caucasus, the Phasis, Aea, the plain of Circe (the hanging dead), the Field of Ares, the Grove of Ares.
- **Return west:** the Ister, the Brygean isles, the Hyllean land, the Eridanus, the Rhodanus, the Celts' lakes, the Stoechades, Aethalia, Aeaea (Circe), Anthemoessa, the Planctae, Thrinacia, Drepane (Phaeacia), the Ceraunian mountains, the Syrtis, Lake Tritonis, the Garden of the Hesperides.
- **Last legs:** Crete (Dicte, Talos), Anaphe, Aegina, Calliste/Thera.
- **Odyssean:** Ismarus, the Lotus land, the Cyclopes' isle, Aeolia, Telepylos (Laestrygonians), Aeaea, Ocean's stream, Persephone's grove of black poplars and willows, Ogygia, Scheria, Ithaca, Phorcys' harbour, the Cave of the Nymphs.
- **Underworld:** Acheron, Pyriphlegethon, Cocytus, Styx, Lethe, the lake of Memory, the white cypress, the meadow of asphodel, Erebus, Tartarus, the gate of horn, the gate of ivory, the Isles of the Blest, the Elysian plain.

### 7.6 Creatures and daimones
Kēres, Erinyes (Alecto, Megaera, Tisiphone; euphemistically Eumenides, Semnai), Harpies (Aello, Ocypete, Celaeno), Empousa, Lamia, Mormo, Gello, Akko, Ephialtes, Sirens, Scylla, Charybdis, Talos, the Hydra, Ladon, the Colchian drakōn, Typhon, Echidna, Kampe, Cyclopes, Laestrygonians, Gegeneis, the Stymphalian birds, the Gorgons (Stheno, Euryale, Medusa), the Graiai, the Moirai (Clotho the spinner, Lachesis the allotter, Atropos the unturnable), Thanatos, Hypnos, the Oneiroi, Geras, Oizys (misery), Limos (famine), Loimos (plague), Atē, Nemesis, Aidos, Dike, Eunomia, Dysnomia, Horkos, Phobos, Deimos, Eris, the Algea, Ponos, Lethe, Momos, Apate.

### 7.7 Months
- **Attic** (from midsummer): Hekatombaion, Metageitnion, Boedromion, Pyanepsion, Maimakterion, Posideon, Gamelion, Anthesterion, Elaphebolion, Mounichion, Thargelion, Skirophorion.
- **Others, for dialect cities:**
  - Delphian: Apellaios, Boukatios, Heraios, Daidaphorios, Poitropios, Amalios, Bysios, Theoxenios, Endyspoitropios, Herakleios, Ilaios, Agyeios;
  - Spartan (partial): Karneios, Hekatombeus, Gerastios, Artemisios;
  - Boeotian: Bukatios, Hermaios, Prostaterios, Agrionios, Theilouthios, Homoloios, Hippodromios, Panamos, Pamboiotios, Damatrios, Alalkomenios.
- **Day naming:**
  - first decade "of the waxing month (histamenou)", middle "mid-month (mesountos)", last "of the waning month (phthinontos)", counted *backwards* in the last decade;
  - *noumēnia* = the 1st; *henē kai nea* = "old and new", the last day;
  - "the holy seventh" (Apollo); "on a fifth day the Erinyes attended Horkos' birth" [V];
  - unlucky days: *apophrades*.
- **Recommendation:** keep the voyage months for the main city and give conquered or dialect cities Boeotian or Delphian names through `drift.js`.

### 7.8 Festivals
Panathenaia, Genesia, Eleusinia (Greater/Lesser Mysteries), Thesmophoria (Anodos, Nesteia, Kalligeneia), Apatouria (Dorpia, Anarrhysis, Koureotis), Pyanepsia, Oschophoria, Haloa, Lenaia, Anthesteria (Pithoigia, Choes, Chytroi), City Dionysia, Rural Dionysia, Thargelia, Plynteria, Skira, Dipolieia/Bouphonia, Kronia, Synoikia, Adonia, Agrionia, Karneia, Hyakinthia, Gymnopaidiai, Olympia, Pythia, Isthmia, Nemea, Theoxenia, Lemnian New Fire, the Hylas-calling.

### 7.9 Ritual verbs and nouns (for event logs and prose)
- **Sacrifice:** *thuein* (to sacrifice and burn for the gods); *sphazein* (to cut the throat); *enagizein* (to offer to the dead or heroes: burnt whole, nothing eaten); *holokautein* (to burn whole); *aparchē* (first-fruits); *thusia*; *hiera* (victims); *splanchna* (the innards tasted); *mēria* (thigh-bones).
- **Libations and cries:** *spendein* (to pour a libation); *choai* (libations to the dead); *loibē*; *ololugē* (the women's ritual scream at the stroke); *paian* (the healing cry "iē paiēon").
- **Prayer, oath, supplication:** *euchesthai* (to pray or vow, also to boast); *horkizein* (to put on oath); *epiorkein* (to forswear); *hiketeuein* (to supplicate); *gounousthai* (to clasp knees).
- **Purity:** *kathairein* (to purify); *hagnizein* (to sanctify); *miainein* (to pollute).
- **Magic:** *katadein* (to bind); *katagraphein* (to register a curse); *pharmakeuein*; *epaeidein* (to sing a spell over).
- **Mysteries:** *mueisthai* (to be initiated); *epopteia* (the final vision); *synthēma* (the password).
- **The dead and the ship:** *psychagōgein* (to lead up souls); *nekuia*; *anagnōrisis* (recognition); *xenizein* (to entertain a guest); *nostos* (homecoming); *kleos aphthiton* (imperishable fame); *timē*; *geras* (prize of honour); *poinē* (blood-price); *atē*; *phthonos* (divine envy); *aidōs* (shame); *nemesis*; *themis* (customary right); *dikē*.

### 7.10 Hesiodic kennings (riddle-names, WD; ready-made for a "bard speech" register)
- **anosteos**, "the Boneless One" = octopus (WD 524). *For a bone-people this is the worst insult: use it for Leaves as a slur from Minyai zealots.*
- **pheresoikos**, "House-carrier" = snail (571).
- **hēmerokoitos**, "Day-sleeper" = thief (605).
- **pentozos**, "the Five-branch" = hand (742).
- **idris**, "the Knowing One" = ant (778).
- **Further bard-register kennings** (Homeric):
  - "the black ship's steed" = the oar;
  - "the hollow-bellied" = the ship;
  - "fence of teeth" = mouth;
  - "the fruit of the field" = grain;
  - "bone-marrow life" = the strength of youth (*aiōn*);
  - "the pale-green fear".

### 7.11 Name parts (extends `narrate.js`)
- **Patronymic suffixes:** -idēs / -iadēs (masc.), -is / -ias (fem.).
- **Honorific ethnic adjectives:** -aios / -ios.
- **Name elements:**
  - *Kleo-/-klēs* (fame); *Tim-* (honour); *Nik-* (victory); *Alk-* (strength); *Phil-/-philos*; *Theo-/-theos*; *Eu-* (good); *Arist-* (best); *Hippo-* (horse); *Polu-* (many); *Andro-/-anōr* (man); *Lao-* (people, and stone: the Lithinoi pun);
  - *Spart-/Sparto-* (sown); *Chthon-* (earth); *Pelōr-* (monster); *Oste-* (bone: coin *Osteas*, *Ostodōros* for Minyai-born Leaves); *Phyll-* (leaf: *Phyllis*, *Phyllodoros*, as Leaf-marking names);
  - *Argyr-* (silver); *Chrys-* (gold); *Pyr-* (fire: *Pyrrhos*, *Pyrrha*, *Pyrrhias*, for children born the day of a BURN).

---

## 8. Open questions for the builder
1. **Lethe at re-knit:** should it hit only bonds, or also ideology (resetting radical/loyal ledgers)? The source supports "forget everything", so the harshest version is the most faithful.
2. **Demophon heresy:** its 1/500 "apparent survivor" must be clearly flagged in narration as *believed* deathless. Canon says only the chain makes bone.
3. **Liturgy rate:** tune so Gini settles at 0.45–0.55 (the classical Athenian estimate is 0.70+ for land and lower for income). The trierarchy should visibly reduce pirate skimming.
4. **Agrionia lethal chance:** 1/20 per year fits Plutarch (one remembered killing), but the tone needs a check.
5. **Lines marked ≈ or [LATE]** must be checked before they are quoted verbatim in-game.
