# The great simulations, mined for The Argo

Compiled 2026-10-06 for rules v9+. This is design research, not a build plan. **Read `docs/RESEARCH.md` and `docs/CULTURE.md` first**: what they already cover (Victoria 3 pops, CK3 traits and stress at a glance, DF facets, RimWorld thoughts and raid points, Epstein, Turchin PSI/asabiya, Henrich, Bentley, Daley–Kendall rumours, Felt-style sifting, Qud per-faction retellings) is only extended here, never re-proposed.

**Tags.** **[V]** = checked this session against a primary source or a datamined wiki (URL inline). **[U]** = from memory or secondary sources; confirm before quoting publicly. Costs are estimates for the current engine (struct-of-arrays, ~11k live of ~13k entities, world-gen 360 days in ~14 s, so roughly 35–40 ms per day today).

**Hard constraints repeated, because they kill most ideas:** $0 hosting, no LLM at runtime, all text procedural, `+ − × ÷` plus `floor/round/sqrt/abs/min/max` and seeded streams, iterate in index order, whole day ≲ 100 ms, state ≈ 1 MB gzipped. Anything that needs per-agent × per-agent data (11k² = 121M cells) or per-agent free-text memories is out unless it is made **sparse and capped**.

---

## 0. What the Argo already has (so we don't re-propose it)

From `HANDOVER.md`, `ROADMAP.md`, `CULTURE.md` and the code (`sim/*.js`):

- **Per agent:** HEXACO (6), ideology (3 axes), identity, radical, obols, 5-good inventory, hunger, sickness, stress, mood, **thought slots** (RimWorld-style `[label, mood, days, stacks]`, 30 kinds), **ties** (fixed slot count, Int8 value), a ring-buffer **bio**, office, vice, cognomen (18 Qud-style epithets), lover, faith, devotion, style, dialect, 6 rumour slots, genes and lineage (`p1`, `p2`, `gen`, `lineage`).
- **World systems:** markets per city, trade flows, caravans, Epstein unrest, D'Hondt Boule with coalitions, ADICO laws, Baron-Ferejohn, offices named after the crew (Tiphys, Lynceus, Orpheus, Aethalides, Medea, Mopsus, Boread, Argus), ostracism, splinter factions, a **points-budget director** with 11 mythic incidents (pall, harpies, plague, sirens, Talos, Doliones, feather-bolts, ghost, Lemnian night of knives, bounty, Prometheus), funerals with Charon's obol, prophets and faiths with schisms, a 360-day calendar, world-level salience **memory** (400 entries, two-stage decay) → festivals and monuments, city-state wars with asabiya, vassals, the Fleece quest and relics with provenance, crafts, fashion, dialect drift, Daley–Kendall rumours with four twist types, per-faction myth retellings.
- **Curation:** a sifter with ~35 story kinds (revenge, rise-and-fall, thrice-broken, feud, prophecy-fulfilled from visor phrases, first Leaf, …) scored salience × rarity, era names, an RSS feed, follow mode, time-lapse, Legends-style biographies and a Codex.
- **Narration:** three voices, several lines per event type, line chosen by `hash(event id)`; names with patronymics and dialect drift.

So the Argo is already past "a sim with a log". Its gaps, judged against the best systems below, are: **(1) persistent personal memory and trauma for deathless beings, (2) hidden information (secrets, curses, unknown killers), (3) persistent antagonists with lairs and appetites, (4) a director that knows which stories are half-told, (5) text that reacts to specifics rather than picking a line by hash, (6) consequences of killing beyond grief (pollution, Furies, trials), and (7) culture that produces artefacts people can read (poems, epitaphs, inscriptions).**

---

## 1. Ten insights that cut across everything

1. **History as artefact beats history as process, and you need both.** Caves of Qud's sultan generator "first decides that a particular historical event will occur, then it rationalizes a cause based on the states of the historical entities at play" ([Grinblat & Bucklew, FDG 2017](https://www.pcgworkshop.com/archive/grinblat2017subverting.pdf)) [V]. Dwarf Fortress does the reverse: it simulates the process, and history is "a record of that". The Argo already simulates. What it lacks is the **rationalizing layer**: text that takes an event the simulation produced and explains it using whatever state the actors already carry (their domain, their grudges, their faith). That is where coherence comes from at near-zero CPU cost.
2. **A small set of shared properties is what glues random events into a life.** Qud: "Because of the limited number of sultan properties shared across many events, emergent micro-narratives like this one are quite common" [V, same paper]. Ten domains and nineteen event types were enough. The Argo's agents have *too many* numeric properties and *too few* nameable ones. Give each notable 1–2 **domains** and let every line about them reach for those.
3. **Memory has to be scarce, ranked and able to come back.** DF: 8 short-term and 8 long-term slots; a memory "remained in a short-term memory slot for one year" tries promotion; weakest gets overwritten; when recalled it has "a 1:3 chance of being promoted to core memory and causing one or more personality changes" ([DF wiki, Memory (thought)](https://dwarffortresswiki.org/index.php/Memory_(thought))) [V]. Fixed slots are exactly what a typed-array engine wants.
4. **Hidden information is the engine of drama, and it's cheap if sparse.** Talk of the Town gives every character mental models of others made of belief facets with *evidence* (observation, statement, lie, eavesdropping, transference, confabulation, mutation, forgetting) ([Ryan et al., AIIDE 2015](https://ojs.aaai.org/index.php/AIIDE/article/download/12825/12672)) [V]. Too expensive for 11k × 11k. But **per-case belief tables** for a few dozen open mysteries are trivially cheap and recover most of the drama (wrong suspects, wrongful vengeance, the lie that holds).
5. **Partial matches are the most under-used output of a sifter.** Winnow keeps "a pool of partial matches" which "can be narrativized or exposed … prior to their completion" ([Kreminski et al., AIIDE 2021](https://mkremins.github.io/publications/Winnow_AIIDE2021.pdf)) [V]. Loose Ends then treats each partial match as an active *goal* and ranks actions by "the number of active storytelling goals that this action would advance" ([Loose Ends, AIIDE 2022](https://ojs.aaai.org/index.php/AIIDE/article/download/21955/21724/26007)) [V]. For a spectator product this gives two things at once: a **"Brewing" panel** (stories in progress, which is what makes people come back next hour) and a **story-aware director** that nudges the next beat.
6. **Specific beats generic, and the cheapest specificity is rule cascades.** Valve's Left 4 Dead dialogue: facts are a dictionary; a rule is a list of criteria; of all matching rules, pick the one with the most criteria ("the simplest one imaginable – the number of criteria in a rule"); responses can **write facts back** so the next line knows what was said ([Ruskin, GDC 2012](https://cdn.akamai.steamstatic.com/apps/valve/2012/GDC2012_Ruskin_Elan_DynamicDialog.pdf)) [V]. Hades layers essential / conditional / evergreen lines and avoids repeats "until every possible unused option has been expended" ([Kerr on Hades](https://www.christi-kerr.com/post/how-the-dialogue-system-in-hades-rewards-failure)) [V, secondary]. This is the single biggest text-quality upgrade available to the Argo without an LLM.
7. **Precepts make the same event mean different things to different people.** RimWorld ideoligions turn identical acts into opposite thoughts (cannibalism from −20 "abhorrent" to +6 "required (ravenous)"; ritual outcomes drawn from fixed quality bands, e.g. funeral 5% terrible −3 / 15% lackluster −1 / 60% good +5 / 20% heartwarming +8) ([RimWorld wiki, Ideoligion](https://rimworldwiki.com/wiki/Ideoligion)) [V]. WAWLT goes further: characters "use story sifting patterns to make narrative sense of the world… different characters have access to different sifting patterns, they tell themselves different stories" ([Kreminski et al., FDG 2020](https://mkremins.github.io/publications/WAWLT_FDG2020.pdf)) [V]. Subjectivity is a lookup table, not a mind.
8. **Pacing is a curve you can write down.** Cassandra runs a fixed cycle: 4.6 days "on", 6.0 days "off", 1–2 major threats per on-phase (50/50), at least 1.9 days between majors ([RimWorld wiki, Cassandra Classic](https://rimworldwiki.com/wiki/Cassandra_Classic)) [V]. Façade's beat manager picks among eligible beats the one that best fits an Aristotelian tension target ([Mateas & Stern](https://www.cs.uky.edu/~sgware/reading/papers/mateas2005structuring.pdf)) [V, abstract-level]. The Argo's director has a budget but no rhythm. Spectators need **respite** as much as shocks: respite is when love stories, weddings and festivals get read.
9. **Every curse in DF is a broken promise to a god.** Vampires and werebeasts arise when "a deity will curse a worshipper who desecrates their temple or otherwise offends them" ([DF wiki, Vampire](https://dwarffortresswiki.org/index.php/Vampire)) [V]; necromancers are mortals "obsessed with … mortality" who worship a death deity and receive a slab of secrets ([DF wiki, Necromancer](https://dwarffortresswiki.org/index.php/Necromancer)) [V]. Greek myth has the same grammar (Lycaon, Tantalus, Arachne, the Erinyes, *miasma*). The Argo already has gods and offences; it lacks the **curse** as a consequence class.
10. **Curation is the product; legibility is the curation.** Ryan's thesis: emergent output is "narrative material, which must be narrativized through a process of sifting … and narration" ([Curating Simulated Storyworlds](https://escholarship.org/content/qt4vj649w6/qt4vj649w6.pdf)) [V]. The fix for "just one damn thing after another" is not more simulation; it is **(a)** fewer, nameable, persistent things (monsters, curses, vows, mysteries) that the sifter can follow, and **(b)** surfacing *open* threads, not only closed ones.

---

## 2. System by system

Each entry: **Mechanic → Why stories emerge → Algorithm → Cost → Argo mapping → Verdict.**

### 2.1 Dwarf Fortress

#### 2.1.1 World-gen history and Legends mode
- **Mechanic.** World-gen is a full simulation of civilizations, historical figures, sites and artefacts for N years; every state change is written as a typed **historical event** (`hf died`, `artifact created`, `site taken over`, `hf abducted`, …) and grouped into **event collections** (war → battles → duels; abduction; theft; persecution). Legends mode is a browser over figures, sites, entities, artefacts and collections, each page assembled from the events that reference it. Community tools ([Legends Viewer](https://github.com/Parker147/Legends-Viewer)) [U] exist because the XML export is complete.
- **Why stories emerge.** Every page is a *join*: a figure's page lists every event naming them, so readers assemble arcs themselves (apophenia). **Event collections** give hierarchy: "the War of X" contains "the Battle of Y" contains "the duel where Z lost an arm".
- **Algorithm.** Append-only `events[]` with `(year, type, a, b, site, artifact, extra)`; per-entity reverse index built lazily at export time, not in the tick. Collections are just events with a `parent` pointer and start/end.
- **Cost.** Tick: zero beyond logging. Storage: the Argo already keeps a chronicle outside the state (`chronicle/c*.json`), so no change to the 1 MB budget.
- **Argo mapping.** The Argo already has Legends-like biographies. What it lacks is **event collections**: wars, feuds, plagues, monster hunts and vendettas should be first-class containers with their own pages and their own child events, so "the Hunt of the Boar of Bear Mountain" is a page with a beginning, its casualties, its slayer and its relic.
- **Verdict.** Do it, cheap, in the chronicle layer (`advance.mjs` + viewer). Feeds #5 and #8 in the Top 25.

#### 2.1.2 Personality facets, values, needs (extending RESEARCH §1)
- **Mechanic.** ~50 facets (0–100, neutral-heavy), 31 values inherited from the civilization with personal deviation, and *needs* derived from facets/values (pray, socialize, create, fight, be with family) that decay and give focused/distracted states.
- **Why stories emerge.** Needs create **daily wants that differ between characters with the same circumstances**, which is the raw material for divergence.
- **Argo mapping.** The Argo has HEXACO + 3 ideology axes; adding 50 facets would be "placebo" (RESEARCH §0.8). The one transferable piece is **values inherited from the faction with personal deviation that can be permanently shifted by core memories** (see 2.1.3). Store 4 culture values (e.g. *Kleos* glory, *Xenia* hospitality, *Eusebeia* piety, *Sophrosyne* restraint) as Int8 per agent; they gate precepts (2.4.3) and oaths (Top 25 #3).
- **Verdict.** Minimal: 4 bytes per agent. Only worth it if something reads them (#3, #16).

#### 2.1.3 Thoughts and memories rework (2014–2016)
- **Mechanic.** [V, [Memory (thought)](https://dwarffortresswiki.org/index.php/Memory_(thought))] 8 short-term slots, 8 long-term. Short-term entries are grouped by kind; a new memory of the same group overwrites only if stronger. After one year a short-term memory attempts promotion: empty slot → in; else same-group weaker → overwrite; else overwrite the weakest. When a dwarf *revisits* a long-term memory the emotion re-fires (stress again), and with p = 1/3 it becomes a **core memory**, permanently changing facets or values ("this can be for good or bad"). Emotion strength divisors mean weak emotions cannot push a dwarf into extreme stress buckets ([Emotion](https://dwarffortresswiki.org/index.php/Emotion)) [V].
- **Why stories emerge.** **Trauma has a half-life of years and can change who you are.** The dwarf who saw her husband die at the gates becomes, three years later, a different person, and the game can say why.
- **Algorithm (Argo-sized).**
  ```
  LTM slots per agent: K = 3
    ltmKind  Uint8[K]   // grief_child, betrayal, burned_kin, saw_monster, rescued, triumph, oath_broken...
    ltmWho   Int32[K]   // the other party (or -1)
    ltmDay   Int32[K]
    ltmStr   Uint8[K]   // 0..255
  promote(i, kind, who, str):            // called from the few events that matter, not from every thought
    slot = same kind&who ? that : empty ? that : weakest
    if ltmStr[slot] < str: overwrite
  recall(i):                              // weekly, for 1/7 of agents (rotating by index), or on triggers
    k = slot with max(str * anniversaryBoost(day - ltmDay))
    think(i, ltmToThought[kind])          // re-fires as a short thought
    ltmStr[k] = ltmStr[k] * 15 / 16       // fades
    if hash(i, day, k) % 3 == 0 and kindCanCore[kind]: core(i, kind)   // permanent shift, logged to bio
  core(i, kind): adjust pers/ideo/values by a fixed table, e.g. betrayal: A −8, H +4; burned_kin: O −6, identity +10
  ```
  Triggers worth adding: returning to the district where it happened; meeting `ltmWho`; the calendar anniversary (the Argo has a 360-day calendar already).
- **Cost.** 3 × 10 bytes = 30 B/agent → ~390 KB raw for 13k entities, mostly zeros (gzip maybe 60–90 KB). Tick: weekly pass over 1/7 of agents ≈ 1.6k recalls/day, ≈ 0.1 ms.
- **Argo mapping.** This is *the* mechanic for deathless beings. An Argonaut never dies; a Leaf lives ~70 sim-years ≈ 840 real hours ≈ 35 days. So **every Argonaut will bury its children, then its grandchildren**, every month, forever. With LTM + core memories the Sown visibly harden or break across generations: "Nikias #412 has buried eleven children. He no longer names the new ones." That's mythic horror that comes straight out of canon.
- **Verdict.** Top-tier (#4).

#### 2.1.4 Artefacts and strange moods
- **Mechanic.** [V, [Artifact](https://dwarffortresswiki.org/index.php/Artifact)] A dwarf enters a strange mood (fey, secretive, possessed, macabre, fell), claims a workshop, demands specific materials; success yields a named, unique artefact and big skill gain; failure means insanity or death ("each dwarf will produce at most one in their lives (or die trying)"). Artefacts then live in history: stolen, claimed as heirlooms, sought by foreign questers, causes of war.
- **Why stories emerge.** A **deadline with a visible demand** ("she needs bone, she needs a gem, the caravan is late") plus a binary outcome, then an object that outlives its maker and gets fought over.
- **Algorithm.**
  ```
  daily: with tiny p (≈ 1/4000 per eligible crafter, boosted by stress and devotion), pick one crafter
    mood = {kind, demand: [good, qty] from city shortages, until: day+12}
  daily for active moods (≤ 3 at once): if inventory/market can supply demand → consume, forge relic(name grammar, maker, kind)
    else if day ≥ until: kind fey/secretive → "went mad" (cognomen, stress +200, LTM); fell → kills a coworker, then forges from their bones
  ```
- **Cost.** O(active moods) ≈ nothing. State: a 3-entry list.
- **Argo mapping.** "**Seized by Hephaestus**" (fey), "**the Daedalian fit**" (secretive), "**Hecate's hand**" (macabre; demands bone, i.e. a broken Argonaut's fragments from Asphodel), "**the Telchine rage**" (fell). The demand reads the actual market, so a famine city can't feed a mood: the economy shows up in myth. Feeds the existing relic/provenance system in `fleece.js`.
- **Verdict.** High (#12).

#### 2.1.5 Necromancers, vampires, werebeasts (curses)
- **Mechanic.** [V] Necromancer: mortal obsessed with death → worships a death deity → receives a slab of secrets → teaches apprentices → with enough followers (wiki: 50) builds a tower, raises undead, sieges. Vampire: curse for desecration/offence; hides true name and kill list; doesn't eat or sleep; feeds on the unconscious; detectable by anomalies (too many skills, too-old relationships, no eating thoughts). Werebeast: curse; transforms every full moon (DF has 13 full moons a year at a fixed calendar), spreads by bite, flees settlements and raids from a lair ([Werebeast](https://dwarffortresswiki.org/index.php/Werebeast)).
- **Why stories emerge.** **Hidden identity + periodic visible harm + detection by anomaly** is a detective story generator. The necromancer adds an *ideological* threat: mortals who want what the immortals have.
- **Algorithm (curse layer, generic).**
  ```
  curse: Uint8 per agent (0 none, 1 lamia, 2 lykaon, 3 erinys-hounded, ...)   // + curseDay Int32
  onOffence(i, god): p = severity × god zeal → curse[i] = kind  (secret; not shown in UI until revealed)
  lamia (Leaf only, or Argonaut "thirst"): every 6–10 days pick a sleeping/sick victim in district → drain (sick=2, small death p)
        leaves an anomaly flag on the victim's family: "pale", "bitten"; Lynceus office or any augur with high O rolls detection
  lykaon: on the month's full-moon day (fixed day-of-month table), cursed agent attacks within district; bitten adults get the curse with p
  reveal: when anomalies around i exceed threshold or detection roll → event, rumour seeded, trial / hunt / exile
  ```
- **Cost.** One byte + one Int32 per agent; daily work O(cursed) where cursed ≤ ~20.
- **Argo mapping, Greek-faithful.** **Lamiai / Empusai** (blood-drinking daemons that take beautiful form; Philostratus' *Life of Apollonius* 4.25 [U]), **Lycaon's curse** (Zeus turned Lycaon into a wolf for serving human flesh; Ovid *Met.* 1 [U]) on the full moon of each sim-month, **the Erinyes** for kin-slayers (see #1). For bone Argonauts the curse can't kill them, so it **inverts**: a cursed Argonaut hungers and feeds on Leaves. Horror with canon: the deathless preying on their own mortal children.
- **Necromancy analog: the Dragon's Teeth.** Aeëtes gave Jason the teeth of the Ares dragon to sow; armed men sprang up (Apollonius 3.1354ff [U]). A **Leaf obsessed with mortality** (elder, high stress, faith in a Fire/death god, LTM `grief`) seeks the teeth (a relic). If they get one, they sow **Teeth-men**: temporary armed bone-things (entity `kind = 2`, 30–60 day lifespan, no money, no ties) who garrison a tower in the Grove of Ares and raid. The Argo's founding myth turned into its recurring nightmare.
- **Verdict.** Curses high (#7); Dragon's Teeth medium (#19, more code).

#### 2.1.6 Megabeasts and sieges
- **Mechanic.** [V, [Megabeast](https://dwarffortresswiki.org/index.php/Megabeast)] Megabeasts claim lairs, accumulate kill lists, gain names and sometimes worship "out of fear"; attacks are gated on wealth and population thresholds (e.g. 100,000☼ wealth, 80 dwarves); successive Ages (Myth → Legends → Heroes) see more of them killed, so the world tames.
- **Why stories emerge.** A **persistent named antagonist** with a growing body count, a home you can point at, and an **attractor** (your wealth) is the cleanest serial story there is. Its death is a dated, nameable event that mints a hero and an artefact.
- **Argo mapping.** See UO ecology (2.20) for the appetite model. Monsters from the voyage and its neighbours: the **Calydonian Boar**, the **Teumessian Fox**, the **Stymphalian flock** (feather-bolts already exist as an incident), **Talos** (already an incident), the **sleepless Colchian dragon** (guardian of the Fleece, ties into `fleece.js`), **Scylla** at a sea lane, the **Harpies** (already an incident). Promote 3–5 of these from one-off incidents to **entities with lairs**.
- **Verdict.** Top tier (#6).

#### 2.1.7 Poetic, musical and dance forms
- **Mechanic.** Per-culture generated forms; "you can't compose a poem of a variety you aren't familiar with … once you learn the rules, the quality will depend on your skills" ([Poetic form](https://dwarffortresswiki.org/index.php/Poetic_form)) [V]. In play, form descriptions read like [U]: *"The X is a poetic form originating in [civ]. The poem is used to [mood/purpose]. It has N stanzas of M lines; each line has K syllables; the rhyme scheme is …; the form is often used to express Y about Z"*. Dance forms list groupings, music accompaniment and steps.
- **Why stories emerge.** Forms are **cultural fingerprints** that travel with people, get performed at feasts and outlive the city that made them. They're also free texture for the Legends view.
- **Algorithm.** A form = a struct `{name, origin city, purpose (lament/boast/curse/hymn/satire), meter (hexameter-like/elegiac/iambic), stanza count, refrain y/n, subject preference (dead, gods, a rival city, the sea)}` generated once per city at founding from the city seed, then mutated by the existing Bentley drift. A **poem** = `{form, composer, subject event id}`; text realised by grammar at narration time.
- **Cost.** ~15 cities × 3 forms × a few bytes. Tick: compose ~1 poem/day from the sifter's top story (only notable performers: the Orpheus office, priests, singers).
- **Argo mapping.** Orpheus is already an office. Make poems **load-bearing**: an event that becomes a poem has its world-memory decay **slowed** (the epic preserves memory; Candia's two-stage decay in `culture.js` gets a third, slower tier). Satires (iambics, after Archilochus, whose verses were said to drive Lycambes' daughters to suicide [U]) lower the target's legitimacy. Laments at a Leaf's funeral raise mourners' katharsis.
- **Verdict.** Medium-high (#17): small CPU, large texture, interlocks with memory, festivals and politics.

#### 2.1.8 Myth generation (2019+ work)
- **Mechanic.** Bay 12's dev plan lists creation-myth generation: "Detailed chronology of creation … cosmic eggs and primordial chaos … Generated explanations for death, the afterlife and the origins of magic fully integrated into the myth" ([Bay 12 dev page](https://www.bay12games.com/dwarves/dev.html)) [V].
- **Argo mapping.** The Argo's creation is *real*: the on-chain Sowing (26 Aug 2026), the Maker, the burns. Per-faith creation myths are a natural extension of `rumor.js`'s faith templates: each faith tells **why the Leaves die and the Sown don't**, generated from its deity (the Fire-that-Unmakes says: "the Leaves are the fire's tithe"). This is text, not state. Low cost, good Codex material. Folded into #8.

### 2.2 Caves of Qud: sultans and gossip
- **Mechanic.** [V, paper above] Five periods, one sultan each. Init sets name, birth region and a **domain** (10 domains; ice, time, …). ~12 events chosen *serially* from 19 event types, each **parameterized by current state** and each **modifying state** (allies, profession, named items, places). Each event picks a *rationalizing property* at random from a candidate list (e.g. challenge-sultan uses allied factions / profession / domains), rerolling if empty, and **inventing a value if none exists**; the text is from a Tracery-like grammar keyed by domain: `<domains :sultan$domains[random]:practices :!random>` → "encasing things in ice". Places and named items become world entities ("Frostycus Catsfriend" is lost at a later battle). The future-work section proposes exactly what the Argo already does: "events could generate multiple, conflicting gospels from different perspectives".
- **Gossip / water ritual.** In play, NPCs trade history snippets for reputation. Knowledge is currency; the journal sorts snippets chronologically so the biography "coheres" as you collect them.
- **Why stories emerge.** (1) Domain repetition reads as character. (2) Rationalization reuses *recent* state, so consecutive events look causally linked (cats → battle to liberate cats). (3) Named items and renamed places leave physical traces of the story.
- **Argo mapping.**
  - **Domains for every Argonaut, derived from on-chain traits** (Bones → stone/gold/coral/flower/silver/fire/sky; Cloak → death/clergy/royalty; Crown → sea/war; artifact traits). Store nothing: domain = f(token traits). Every narration line about a notable consults `domains(a)` for epithets, weapons, places and reasons.
  - **Rationalized reasons.** When the engine produces "A killed B in a brawl", the narrator picks a *reason* from A's state in priority order: an open grudge with B → a tie value < −30 → B's faction rival → A's faith precept → A's domain ("over the right to the coral beds"). Ruskin-style specificity (2.27) chooses among them.
  - **Renaming.** A city sacked by X becomes "X's Ash" in one faction's mouth (per-faction place names in the retelling layer); a battle names the field.
  - **Named weapons and objects** generated at victories and lost at defeats: hooks into relics.
- **Cost.** Text layer only.
- **Verdict.** Top tier (#8), and almost free.

### 2.3 Crusader Kings 3
(Traits, opinion decay, stress thresholds and schemes' breach chance are in RESEARCH §1. New material below.)

#### 2.3.1 Stress coping mechanisms and break traits
- **Mechanic.** [V, [CK3 wiki, Stress](https://ck3.paradoxwikis.com/Stress)] Levels at 100/200/300; first crossing of each triggers a mental break; level 1 gives a **coping-mechanism** trait (each "+20% Stress Loss" plus a stress-relief decision on a 3-year cooldown); level 2 adds Melancholic, Arbitrary, Eccentric, Witch; level 3 adds Wrathful, Lunatic, Murderer, death or abdication; at 400 a level-3 break is forced and stress −100; breaks at most once per 5 years. The wiki lists which act stresses which trait (Compassionate: imprison, execute, torture…; Just: imprison without reason; Honest: fabricate hook, start murder…).
- **Why stories emerge.** Breaks **permanently mark** a character with a visible habit that then generates its own events (the drunkard's debts, the flagellant's scars, the lunatic's decrees).
- **Argo mapping.** `breakdown()` exists; make its outcome **permanent and visible**: `scar` Uint8 per agent from a table of Greek-flavoured coping habits: *the smoke-eater* (Lemnos smoke, raises demand), *the mourner* (sits at the Pyra, joins every funeral), *the flagellant of bone* (Argonauts who break their own fingers: they re-knit, so it's a spectacle), *the oath-maker* (swears vows compulsively; feeds #3), *the wanderer* (migrates every season), *the cruel* (brawls), *the silent* (stops forming ties). Each gives a stress-relief action on a cooldown and a portrait/figure tell in the viewer.
- **Cost.** 1–2 bytes/agent; zero extra loop (done inside existing mood pass).
- **Verdict.** High feasibility (#14).

#### 2.3.2 Secrets and hooks
- **Mechanic.** [V, [CK3 wiki, Secrets/Hooks](https://ck3.paradoxwikis.com/Secret)] Secret types (murder, attempted murder, lover, deviant, witch, non-believer, embezzlement, illegitimate child…). Discovered by events or a spymaster task. Exposure applies penalties by severity (criminal → imprisonment option). **Blackmail** turns a secret into a hook: weak (once) if shunned, strong if criminal; strong hooks force acceptance, block the target from joining factions or declaring war on the holder, 5-year cooldown. If the target refuses, the secret is exposed.
- **Why stories emerge.** Asymmetric knowledge → leverage → coerced votes, quiet betrayals, and exposures at the worst moment.
- **Argo mapping.** The Argo has the facts already (adultery is possible via `lover`; murders, thefts, embezzlement by office holders; secret faith after conversion bans). Add:
  ```
  secrets: global list, cap 256: {kind, owner, victim, day, knowers: Int32[≤4]}
  daily (inside social encounters): if j is a knower of a secret of k and (i,j) tie > 40 → p spread knower; if i has low H → blackmail: hook i→k
  hooks: per agent one slot hookOn Int32, hookStr Uint8
  politics(): when k is a Boule member and hookOn[i]==k, k votes i's way (strong) or +bias (weak)
  exposure: knower with high H and low tie to k, or rumour system picks it up → public event, legitimacy/ostracism/trial
  ```
- **Cost.** ≤ 256 secrets × ~30 B; one hook slot (5 B) per agent. Tick: checks only inside encounters already happening.
- **Verdict.** High (#9). Interlocks with rumours, ostracism, D'Hondt/coalitions, trials (#10).

#### 2.3.3 Schemes
- Monthly breach rolls (RESEARCH). For the Argo, schemes are best expressed as **vows with a plan** (#3) plus Winnow-style partial matches (#5). Don't build a second scheme system.

#### 2.3.4 Lifestyles and focuses
- **Mechanic.** A character picks one lifestyle (diplomacy, martial, stewardship, intrigue, learning) and earns XP toward perk trees.
- **Argo mapping.** The Argo's `job` already plays this role. Skip.

#### 2.3.5 Dynasty renown and legacies
- **Mechanic.** [V, [CK3 wiki, Dynasty](https://ck3.paradoxwikis.com/Dynasty)] Renown accrues per member by rank (barony +0.12 … empire +2/month); splendour levels at 300/1,000/2,000/4,000/7,000/… renown change birth prestige and marriage value; legacies cost 250, then +500 each, five per track (Warfare, Law, Guile, Blood, Erudition, Glory, Kin…); **cadet branches** split from the founding house, e.g. when a member refuses a forced conversion; the strongest house head becomes dynasty head if 10% stronger.
- **Why stories emerge.** Families become **actors with memory and ambition** across generations, and branches give you family feuds with a cause.
- **Argo mapping.** `lineage` exists (founded by an Argonaut). Add a per-lineage record `{renown, legacies bitmask, head, cadetOf}`. Renown from: office, victories, relics held, poems composed about members, monster kills. Legacies at 250/750/1,250…: e.g. *Blood of the Sown* (Leaves of this line get +5 years life expectancy), *Oarsmen* (crafts skill), *Guest-friends* (+xenia ties with another lineage), *Oath-keepers* (#3 vows rarely break). **Cadet split** when a Leaf converts to a faith their lineage head despises, or when a feud runs inside a family. Every Argonaut is a dynastic founder; legacies make 9,999 dynasties legible by giving each a few named perks.
- **Cost.** One object per lineage with ≥ 1 living Leaf (hundreds). Monthly update.
- **Verdict.** High (#13).

#### 2.3.6 Cultures and innovations; trait inheritance
- Innovations (spread by era and by neighbours) are covered by Henrich crafts and Ober law imitation in CULTURE.md. Trait inheritance is covered by Leaf genetics. Skip.

### 2.4 RimWorld

#### 2.4.1 Storyteller pacing
- **Mechanic.** [V] Cassandra: 10.6-day cycle (4.6 on, 6.0 off), 1–2 majors per on-phase, ≥ 1.9 days between majors, ~8.5 majors per year. Raid points scale with wealth and colonists; adaptation (RESEARCH §1). Phoebe stretches the gaps; Randy is the uniform-random baseline.
- **Why stories emerge.** **Rhythm creates rising action and denouement**; respite lets consequences (grief, rebuilding, weddings) be seen.
- **Argo mapping.** The director now accumulates points and fires on `p = 0.3` once ≥ 10 points: memoryless, so storms of incidents and long droughts are both possible. Replace with a **season-cycle director**: a 30-day month = one "act": days 1–8 quiet (only bounties, festivals, omens of the coming threat), 9–20 rising (minor incidents, the monster stirs, the scheme forms), 21–26 climax (1–2 major incidents, ≥ 2 days apart), 27–30 aftermath (funerals, trials, poems). Measure **actual tension** T = weighted (deaths, riots, wars, hungry) over 7 days; choose incidents to move T toward the act's target, Façade-style. On-chain burns and sales are *uncontrolled* shocks; the director treats them as major beats and **cancels its own climax** when the chain supplies one (the Maker is the true storyteller).
- **Cost.** Trivial.
- **Verdict.** High (#11).

#### 2.4.2 Mood and mental breaks
- Covered (thoughts with stacks; breaks at 35/20/5%). The one missing piece is **inspirations** (positive breaks: "inspired creativity", "inspired trade"), which RimWorld uses to keep high mood eventful. Map to Argo: high-mood days roll inspirations that feed strange moods (#12), poems (#17) and generous acts (reputation, #22). Folded into those.

#### 2.4.3 Ideoligion memes, precepts, rituals, certainty
- **Mechanic.** [V, [Ideoligion](https://rimworldwiki.com/wiki/Ideoligion)] Up to 4 memes; ~19 mandatory issues each with a stance (Abhorrent … Required); each stance maps actions to thoughts; certainty drops on conversion attempts and flips belief at 0%; ritual quality bands as quoted above; conversion rituals offset certainty from +20% (terrible) to −100% (masterful).
- **Why stories emerge.** Faith becomes **behavioural**: the same funeral is pious to one and sacrilege to another; colonists of two creeds can't share a table.
- **Argo mapping.** Argo faiths have a 3-axis doctrine and a deity drawn from the catastrophe. Add **5 precept issues with 3–4 stances each**, drawn at prophet time from doctrine + deity:
  1. **The dead Leaf**: burn on the Pyra / bury whole / give to the sea / keep the bones in the house.
  2. **Broken bone** (an Argonaut in Asphodel): tend them / leave them to the Mender / it's a judgement.
  3. **The Maker's fire** (burns): holy apotheosis / atrocity / indifferent.
  4. **Guest-right (xenia)** toward other bloods: sacred / conditional / none.
  5. **Leaves and the Sown together** (Argonaut–Leaf love/marriage): blessed / forbidden.
  Each event checks the actor's and witnesses' faith precepts → thought (+/−) and devotion change. **Rituals** (funeral, festival, purification, oath-swearing) roll quality = f(priest devotion, obols spent, crowd size) and draw from a RimWorld-like band table.
- **Cost.** 5 bytes per faith; one table lookup per relevant event. Cheap.
- **Verdict.** High (#16). Makes funerals, burns and inter-blood love divisive.

### 2.5 Ultima Ratio Regum (Mark R. Johnson)
- **Mechanic.** [U] Generates nations, religions (with procedurally generated holy books, rituals, iconography), heraldry by culture, ideologies, and a conspiracy the player uncovers via clues hidden across generated books, paintings and architecture. Johnson's paper "Towards Qualitative Procedural Generation" (cited by Grinblat as [8]) argues for generating *meaning-bearing* content (religion, art, culture) rather than terrain.
- **Why stories emerge.** **Everything is a clue**: artefacts are written by the culture that made them and encode its beliefs.
- **Argo mapping.** Heraldry per lineage (from palette and Bones, rendered in the viewer, not state) and per-faith iconography; **inscriptions on monuments written in the founder faith's voice** (ties to #8, #18). Ruthless note: URR has been in development since 2011; copy outputs, not scope.
- **Verdict.** Text/visual only; folded into #8 and #18.

### 2.6 Songs of Syx
- **Mechanic.** [U] Tens of thousands of individually simulated citizens in a city-builder; species with distinct needs and preferences; happiness drives immigration/emigration and riots; nobles with their own opinions; aggregate stats plus individuals on demand. Proof that 10k+ individually simulated agents run in real time on one CPU core when the per-agent work is tiny.
- **Argo mapping.** Migration as release valve is already in. The lesson is engineering: **aggregate where you can, individualize what the viewer clicks**. Supports the Argo's existing struct-of-arrays approach.
- **Verdict.** No new mechanic.

### 2.7 Victoria 3
Covered in RESEARCH §1 (pops, SoL deadband, clout, sticky radicals, movements). One addition: **political movements with a demanded law** that grow by headcount and escalate (petition → agitation → revolt). The Argo has splinter factions and Epstein riots; a **movement object** `{law demanded, supporters count, escalation stage}` would make riots *about something*. Folded into #20.

### 2.8 Kenshi
- **Mechanic.** [U, [Kenshi wiki, World States](https://kenshi.fandom.com/wiki/World_States)] Killing, imprisoning or freeing key faction leaders flips **world states**: towns change owners, become ruins, are resettled by other factions; factions collapse or radicalise. Irreversible.
- **Why stories emerge.** **The world remembers big deeds physically.** Players see the ruin they caused.
- **Argo mapping.** A small table of irreversible world flags: `city.ruinedBy`, `office.extinct` (if the last holder of a crew office is burned on-chain, the office is "vacant forever", a hole in the Boule), `monster.slainBy`, `temple.desecratedBy`. Each flag changes map art and text permanently. Cheap and very legible. (#21)

### 2.9 Shadows of Doubt
- **Mechanic.** [V, [DevBlog 8](https://colepowered.com/shadows-of-doubt-devblog-8-simulating-a-city/)] Each citizen's day (4–10 journeys) is pre-planned in a batch before the day starts; "there will never be more than a handful of citizens requiring deviations", which are computed live. Citizens record sightings of who they saw; evidence decays; killers have a modus operandi and pick victims by routine; later versions add lying.
- **Why stories emerge.** **Witnesses are a by-product of routine.** Because everyone has a schedule, a murder at 2 am in the Reef has a knowable list of people who were nearby.
- **Argo mapping.** The Argo's walking skeletons already have personal daily rhythms (visual). The sim side can get witnesses cheaply: for a crime in district d, witnesses = agents in d whose job/rhythm puts them outdoors at that hour (hash-based), capped at 5. Those witnesses seed the belief table of the mystery (#10).
- **Verdict.** Folded into #10.

### 2.10 Wildermyth
- **Mechanic.** [V-secondary, [turnbasedlovers interview](https://turnbasedlovers.com/10-turns-interview/with-wildermyth-developer); [TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/Wildermyth)] Hand-written events declare **role targets** like a play ("a leader, a hothead and a goofball", "a loner and their lover"); the engine casts heroes whose personality stats and relationships fit; choices permanently transform heroes (a wolf arm, a crystal eye); heroes age and retire into a legacy pool usable in later campaigns.
- **Why stories emerge.** The **casting** makes authored scenes feel personal; **permanent transformations** become visible scars of story.
- **Argo mapping.** Storylets with casting (#15). Permanent transformations exist naturally for bone beings: each re-knitting leaves a mark (the Argo already counts deaths; add a visible `scar` mark per breaking: a fused jaw, a coral growth, a gold seam). Viewer only, derived from bio.
- **Verdict.** Folded into #15 and #14.

### 2.11 Talk of the Town and Bad News (James Ryan et al.)
- **Mechanic.** [V, AIIDE 2015 paper] Town simulated for decades of daily routines with utility-based action selection; each character holds **mental models** of people and places as **belief facets** (name, appearance, occupation, home, whereabouts), each with *value, predecessor, evidence list, strength (sum of evidence), accuracy*. Evidence types: reflection, observation, transference (misattribution via feature overlap), confabulation, lie, statement, eavesdropping, mutation, forgetting. **Salience** depends on relationship to subject (co-worker > stranger), friendship, romance and job prestige; it decides what is talked about ("the n highest-scoring entities are then brought up … n determined by the strength of the characters' relationship and … extroversion") and how likely a belief is to mutate or be forgotten. Bad News is the performance version: a Wizard-of-Oz actor plays townsfolk while a player tries to notify the next of kin of a death.
- **Why stories emerge.** **People act on beliefs, and beliefs are wrong in patterned ways.** Mistaken identity, the lie that sticks, the informant who misremembers.
- **What's feasible.** Full mental models: 11k × (others they know) × facets = impossible. The Argo already did the cheap version for *rumours* (6 slots per agent). The next cheap step is **per-case belief tables** (#10): only for *open mysteries* (an unwitnessed killing, a stolen relic, who desecrated the temple), store `{case, suspect, believer count by faction, top believers[8]}`. Gossip encounters move belief between suspects using Ryan's evidence weights (observation 1.0 > statement 0.6 > rumour 0.3; lies from low-H agents who are themselves suspects). Revenge then targets **the believed** culprit, not the true one: wrongful vengeance becomes a sifter pattern.
- **Verdict.** High (#10).

### 2.12 Comme il Faut / Prom Week
- **Mechanic.** [V, [Samuel et al.](http://www.ben-samuel.com/wp-content/uploads/2015/09/TCIAIG-social-story-worlds-with-comme-il-faut.pdf)] 18 characters; 3 directed 0–100 networks (buddy, romance, cool); 34 statuses (temporary, can be directed: "angry at", "has a crush on"); 44 permanent traits; a **Social Facts Database** recording every exchange with labels (cool, lame, romantic, failed romance, gross, funny, bad ass, mean, nice, taboo, rude, embarrassing, misunderstood); a **Cultural Knowledge Base** of objects with likes/dislikes; **social exchanges** with an intent, preconditions, initiator influence rules (does I want to?), responder influence rules (does R accept?), instantiations (performances with their own preconditions and text) and effects; **microtheories** (shared rule sets keyed by a predicate); **trigger rules** that fire after exchanges ("two-timer" status if dating two people). Over 5,000 influence rules.
- **Why stories emerge.** **Volition is computed from history**: because the SFDB remembers that Zack embarrassed Monica, every later exchange between them is coloured by it, and the labels make history queryable.
- **Feasibility.** 5,000 hand rules is the cost of a small team; volition over all pairs is O(n²). But the *architecture* scales down: on each encounter the Argo already has (i, j), score ~8 intents with ~40 weighted rules over existing state (tie, faction, faith, lover, hook, recent labels), pick one, roll accept, apply effects, write an SFDB label to both bios.
- **Argo mapping.** (#25) Intents: *befriend, insult, court, recruit-to-faith, recruit-to-faction, accuse, confide-secret, swear-guest-friendship (xenia)*. Labels into bio as compact codes ("kind", "cruel", "shameful", "pious", "treacherous") that also drive public reputation (#22). Microtheory example: "Has-been-insulted-by(j)" adds +3 to *insult back*, +2 to *accuse*, −4 to *befriend*.
- **Verdict.** Medium-high: rework of `social()`, ~0.3–0.8 ms/day.

### 2.13 Versu (Evans & Short)
- **Mechanic.** [V, [Evans & Short, IEEE TCIAIG 2014](https://cs.uky.edu/~sgware/reading/papers/evans2014versu.pdf)] Agents act within **social practices** (a dinner, a conversation, a game), several running concurrently, each a reified object that *provides affordances* to its role-holders and keeps its own state; personality traits are represented "as conditionals" over desires; exclusion logic for state. Kreminski's [Praxish](https://mkremins.github.io/publications/Praxish_AIIDE2023.pdf) is a modern reconstruction.
- **Why stories emerge.** **Situations, not agents, carry the script**: a symposium knows that toasts happen, insults are possible, someone may get too drunk; the characters bring the specifics.
- **Argo mapping.** Practices are **storylets with duration and roles**: *the Symposium* (nightly in the Agora among notables: toasts, oaths, seductions, insults; wine makes outcomes extreme), *the Funeral Games* (after a notable's death: footrace, wrestling, a prize relic; Iliad 23), *the Trial* (Areopagus: accuser, accused, witnesses, jurors), *the Wedding* (procession, dowry from obols, ill omens), *the Siege Council*, *the Hunt* (for a monster). Each instance holds `{type, day, roles[], stage}` and runs a few stages over 1–3 days. Folded into #15; the Trial specifically into #10.
- **Verdict.** Use the concept; never the logic engine.

### 2.14 Façade
- **Mechanic.** [V, [Mateas & Stern 2005](https://www.cs.uky.edu/~sgware/reading/papers/mateas2005structuring.pdf)] ~200 authored beats with preconditions, effects on story values, and a tension value; the beat manager picks, among eligible beats, the one that best matches a target Aristotelian tension curve.
- **Argo mapping.** The director's incident chooser (#11). Each incident gets a `tension` weight; per act the target curve is known; choose `argmin |T_now + tension − target(day)|` among affordable eligible incidents, ties broken by stream. That's ten lines of code.

### 2.15 The Sims: motives and advertisements
- **Mechanic.** [U] Motives (hunger, energy, fun, social, hygiene, bladder, comfort, room) decay; objects **advertise** how much each motive they satisfy; a Sim scores adverts by current motive deficits with a curve that makes urgent needs dominate, then picks among the top few with randomness. Personality scales adverts.
- **Argo mapping.** Already used conceptually ("adverts on places, jobs and characters", RESEARCH). Concrete use now: **districts advertise** (temple: devotion, Agora: social/trade, Pyra: grief relief, Lemnos: smoke) and each agent's evening destination (visual + encounter partner pool) follows the best advert. This makes encounters *thematic*: grieving people meet at the Pyra, zealots at the temple. Cheap; it re-weights the existing encounter pairing. Folded into #25.

### 2.16 Black & White
- **Mechanic.** [U] The creature is a BDI agent (Evans) whose desires are learned from the player's slaps and strokes via decision trees/perceptrons; it generalises ("don't eat villagers" → "don't eat people").
- **Argo mapping.** Nobody steers the Argo, so there's no trainer. The transferable idea is **cultural learning from observed consequences**: a city that saw a monster slain by spearmen favours spearmen next time; a faith whose prophet was burned learns to fear fire. The existing Henrich/Bentley machinery covers this. Skip.

### 2.17 EVE Online
- **Mechanic.** An in-house economist publishes a **Monthly Economic Report** (faucets vs sinks, mineral price indices, destruction by region) ([MER](https://www.eveonline.com/news/view/monthly-economic-report)) [U]. Destruction is the main sink; regional markets with hauling.
- **Argo mapping.** The Argo has the economy and conserved money; publish it. **"The Agora Report"** each sim-month: price index per good and city, faucets (gold from Colchis) vs sinks (Charon's obol, monuments), Gini, top fortunes, ruined houses, pirate skim. Text and charts only (#23).

### 2.18 Sugarscape and Axelrod
- **Sugarscape** (in RESEARCH). One extra: **seasons that flip which half of the map is fertile** create migration waves and trade, the cheapest engine of drama in the whole model. The Argo has seasons and per-district fertility; make fertility seasonally asymmetric across the map (north harvest vs south harvest) so trade and caravans have a rhythm. Small tweak; not in the top 25.
- **Axelrod tournaments.** Strategy ecologies (tit-for-tat, Pavlov) between pirates and merchants are elegant but invisible to spectators. Skip.

### 2.19 Turchin: secular cycles
- **Mechanic.** [V, [Secular Cycles](https://peterturchin.com/books/secular-cycles)] Demographic-structural theory: expansion → stagflation → crisis → depression; population presses on carrying capacity, real wages fall, elites multiply (elite overproduction), the state's fiscal base erodes, then instability, often with a ~2-generation "fathers-and-sons" oscillation inside the disintegrative phase [U]. PSI is in CULTURE.md.
- **Why stories emerge.** **Long, legible eras** with a structural cause: you can see the Age of Plenty become the Age of Knives coming.
- **Argo mapping.** The Leaves give the Argo real demography for the first time; a 1-sim-year = 12-real-hours clock means a Leaf generation (~25 years) is ~12 real days, so a secular cycle (~150–250 years) plays out over **2–4 real months**. That is exactly the right timescale for a live show. Build the **aspirant pool**: Leaves of rich lineages (top decile obols or renown) are "aspirants"; offices are fixed (8 crew + Boule seats). PSI = (aspirants/offices) × (hungry share) × (treasury stress). PSI drives: cadet splits (#13), schemes and vows against office-holders (#3), splinter factions, and the director's tension baseline. (#20)

### 2.20 Ultima Online's original ecology
- **Mechanic.** [V-secondary, [Koster, UO's resource system](https://www.raphkoster.com/?p=517), [part 2](https://www.raphkoster.com/?p=519), [Did players destroy the UO ecology?](https://www.raphkoster.com/?p=46439)] A central resource bank fed spawns; creatures had food needs; predators hunted prey in widening circles from a lair; the famous dragon example: if players hunted out the deer near a lair, "the dragon might end up finding meat at a local village". It was cut in beta, and at launch players killed everything the moment it spawned.
- **Why stories emerge.** **A causal chain from small, boring acts (over-hunting) to a spectacular consequence (a dragon in the village)**, legible after the fact.
- **Why it failed, and why that doesn't apply.** Thousands of human players optimised against it. The Argo has no players. The ecology can run as designed.
- **Argo mapping.** Each monster lair has `hunger` (0–100) and `radius`; each district has `game` (prey stock) that regrows logistically and is depleted by hunters (a job share) and the monster. Daily: monster eats from game within radius; if short, hunger rises and radius widens; when radius covers a district with people and hunger > 60 → attack (kills Leaves, breaks Argonauts, takes livestock = food inventory). Feeding it (offerings) or slaying it (a hunt practice) resets. (#6)

### 2.21 Spore / DF ecosystems
- **Mechanic.** [U] DF: vermin and wildlife populations per region with sapient hunting; Spore's ecosystem phase uses food-web balancing with simple predator/prey counts.
- **Argo mapping.** Only the predator/prey count per district for #6. Anything more is invisible.

### 2.22 Stanford Generative Agents (non-LLM analogues)
- **Mechanic.** [V, [arXiv 2304.03442](https://arxiv.org/abs/2304.03442)] Memory stream; retrieval = recency (decay 0.995/h) + importance + relevance; **reflection** triggered when the summed importance of recent observations exceeds 150, producing higher-level inferences stored back in memory; hierarchical day plans re-planned on surprise.
- **What survives without an LLM.**
  - *Importance* = a table per event kind (the Argo already has salience in `remember`).
  - *Reflection* = **a threshold on accumulated importance that fires a rule-based conclusion**. The conclusions don't need language; they are new state: a **vow**, a grudge promoted to LTM, a conversion, a decision to migrate.
  - *Planning* = a vow's plan steps (find, travel, confront).
- **Argo mapping.** `importanceAcc` Uint16 per agent; when it crosses 150 (in Argo units), run `reflect(i)`: inspect LTM and recent bio, choose among a small rule set: *swear vengeance on ltmWho*, *swear to find the lost child*, *renounce faith*, *swear never to set foot in district X*, *seek the Teeth* (necromancy, #19). Reset accumulator. (#3)

### 2.23 Tracery, Expressionist, Kate Compton, Voyageur, the Parrigues
- **Tracery** [V, [github.com/galaxykate/tracery](https://github.com/galaxykate/tracery)]: JSON grammar of symbols → expansions, modifiers (`.capitalize`, `.a`, `.s`), and **actions that push state** (`[hero:#name#]`) so a name stays consistent through a story.
- **Expressionist** (Ryan, Seither, Mateas, Wardrip-Fruin, ICIDS 2016) [U]: a Tracery-like grammar where **production rules are tagged with markup** (e.g. `#tension:high`, `#speaker:priest`); generation is **targeted**: ask for an expansion that satisfies a set of required tags and avoids forbidden ones, and the tool precomputes which paths can produce which tag sets. This is the right model for the Argo: "give me a line about a death, register:mythic, cause:fire, relationship:parent-of-victim, must mention: domain(a)".
- **Kate Compton, "So you want to build a generator"** [U; [tumblr](https://galaxykate0.tumblr.com/post/139774965871/so-you-want-to-build-a-generator)]: the **10,000 bowls of oatmeal** problem: outputs can be mathematically unique and *perceptually identical*; aim for **perceptual differentiation** (people remember distinct features), not uniqueness; build an "artist in a box" by listing what a human expert would vary; constrain the possibility space before sampling.
- **Voyageur (Bruno Dias)** [V, [Game Developer](https://www.gamedeveloper.com/design/procedural-meaning-pragmatic-procgen-in-voyageur)]: a **tagged grammar**: "Phrases are supposed to not contradict the model, but they are also scored more highly if they bring up an aspect of the model that hasn't been mentioned yet, or if they correspond to a randomly-chosen focal point"; statements "meant to mostly stand alone … can be placed in any order"; "supply a limited number of salient details"; "Recombination, not branching"; mood tags keep tone consistent.
- **The Annals of the Parrigues (Emily Short, NaNoGenMo 2015)** [V-secondary, [itch.io](https://inthewalls.itch.io/parrigues); [Karth](https://procedural-generation.isaackarth.com/2016/02/15/the-annals-of-the-parrigues-as-ive-noted-travel.html)]: a procedural travel guide organised by five aesthetic "principles" (Salt, Mushroom, Beeswax, Venom, Egg); [U] she describes salience-based choice of what to describe and **deliberate repetition of motifs across chapters** so the reader builds a sense of a culture.
- **Synthesis for the Argo (#2).** Narration should be: (1) **fact dictionary** per event (actor/victim facts, relationship facts, place facts, history facts from bio/LTM/sift memory); (2) **tagged line bank** where each line declares criteria; (3) **specificity scoring** (Ruskin: more satisfied criteria wins) + **novelty bonus** (Voyageur: prefers aspects not yet mentioned in this day's chronicle) + **focus** (the actor's domain); (4) **played-once memory** per (line, actor) (Hades); (5) **motif persistence** (Parrigues): each city has 3 recurring images (gulls, smoke, salt-crust) the narrator reuses; (6) Tracery-style **variables** to keep names and objects consistent within a paragraph. All of this runs in `advance.mjs` narration, not in the tick, and needs only a small `played` set in `sift.json`.

### 2.24 Kreminski: Felt, Winnow, WAWLT, Loose Ends; Ryan's curationism (deeper)
- **Felt** (ICIDS 2019) [U]: sifting patterns as Datalog-ish queries over a DataScript DB; *actions* in WAWLT have preconditions that **are sifting patterns** (an action "reconcile" requires a prior "betrayal" between the pair).
- **Winnow** [V]: incremental acceptors over partial matches with `unless-event` clauses (a pattern dies if an intervening event matches, e.g. the guest leaves town before the host harms them); benchmarks show the cost grows with pool size (avg 13 ms/event at 10 partial matches, 912 ms at 1,000, in their JS implementation), so **cap the pool and hand-compile the patterns** (the Argo's sifter is already hand-written JS, which is the right call).
- **Loose Ends** [V]: partial matches past 33% completion surface as **goals**; actions are ranked by how many goals they would advance + 0.5 if only possible because of a goal + random 0–0.5.
- **WAWLT** [V]: impressions with **pointers to their cause event**; one character's charge toward another = sum of impressions. Subjectivity = which sifting patterns a character has access to.
- **Ryan's curationism** [V]: the simulation produces a *chronicle*; a *sifter* extracts material; a *narrator* tells it; and his architecture also has an *experiencer* and *chronicler*. The Argo has all four roles; what it lacks is (a) **partial-match surfacing** and (b) **multiple narrators with different sifters** (WAWLT subjectivity at the faction level: the Gorgonides sifter looks for martyrdom patterns; the Chryseoi sifter for lineage glory).
- **Argo mapping (#5).**
  ```
  threads: list cap 64 of {pattern, bindings, stage, lastDay, deadline}
  on each event: for each thread: if unless-match → drop; if next-kernel-match → advance (fork if pattern allows)
                 for each pattern's first kernel: if match → new thread (dedupe by bindings)
  each day: viewer gets "Brewing" = top 5 threads by (pattern weight × stage/total × fame of actors)
  director/agents: when choosing among stochastic outcomes that a thread names (who an avenger targets,
                   whether a lover returns), add a bias  β · advances(thread)  — Loose Ends' rule, small β so the sim stays honest
  ```
  Patterns: *vendetta* (harm → kin of victim vows → avenger reaches harmer's district → strike), *Romeo* (love across feuding lineages → one dies → the other at the Pyra), *the long return* (Argonaut broken → re-knits → finds lover remarried), *Oedipal* (a Leaf exiled young returns as a stranger and kills a parent unknowingly; needs mystery #10), *the curse revealed*, *the monster's widening circle*, *the hubris arc* (rise → boast poem → fall), *the betrayed host* (Winnow's breakHospitality, verbatim in Greek dress: xenia broken).
- **Cost.** ≤ 64 threads × events/day (~200–600) ≈ 40k cheap checks ≈ 1 ms. Keep it outside the tick in `sift.js` *for surfacing*; only the tiny bias needs to be in the tick, and it must be computed from state stored in `w` (threads live in world state for determinism).

### 2.25 Emily Short's storylets / quality-based narrative
- **Mechanic.** [V-secondary, [Storylets: You Want Them](https://emshort.blog/2019/11/29/storylets-you-want-them/), [Beyond Branching](https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/)] A storylet = **prerequisites** over qualities + **content** + **effects** on qualities. Selection modes: quality-based (all that qualify), **salience-based** (the most specific qualifying one, as in Ruskin), waypoint (toward a target state), deck-based (draw from a shuffled qualifying pool). Failure modes: grinding, content exhaustion, incoherence when storylets don't share state.
- **Argo mapping (#15).** ~40 storylets, each `{roles: [predicate per role], where, cooldown, weight, effects, text lines}`; once per day, per district, draw ≤ 1 qualifying storylet by deck order; cast roles from agents in the district (Wildermyth). Examples: *The Doubter and the Believer* at an omen; *Two Sown, One Leaf* (two Argonauts claim the same orphan); *The Bone-Setter* (a Leaf tends a broken Argonaut in Asphodel; tie +30, possible love across the mortal line); *The Price of Bread* (a hungry Leaf steals from a rich Argonaut's house; precepts decide whether it's forgiven); *The Grave-Robber* (someone takes an oar from a grave; miasma). Effects write to existing state (ties, thoughts, LTM, vows, secrets).

### 2.26 Hades and Valve: reactive narration
Covered in 1.6 and 2.23. Concretely for the Argo, the *chronicle voice* and the **Argo's speaking beam** (which already quotes visor phrases) are the two "characters" that should react. The beam can comment on the day with essential/conditional/evergreen tiers: essential = an on-chain burn; conditional = "the third burn this month", "a Leaf of the line of #412 died where #412's first child died"; evergreen = visor phrases. Played-once memory makes long-term watchers notice that the beam *never repeats itself until it has said everything*.

### 2.27 NetHack
- **Mechanic.** [U, [NetHack wiki, Bones](https://nethackwiki.com/wiki/Bones)] When you die, the level may be saved as a **bones file**; a later game can load it, with your ghost and your cursed possessions waiting.
- **Argo mapping.** The Argo's "unburied" and "ghost" incidents are halfway. The NetHack insight is **the dead leave a place-bound hazard tied to their possessions**: a Leaf who dies unburied with relics leaves a **shade** bound to the spot; anyone who takes the relics is haunted (thought + LTM) until rites are done; if a shade's grievance is a murder, it **names its killer** to the next augur who passes (feeds #10). Folded into #24.

### 2.28 What makes a simulation compelling to watch
- **Ant farms and Conway.** Pure emergence is hypnotic for minutes, not days. People watch Life for gliders: **named, persistent, moving structures**. → The Argo's monsters, curses, vows and mysteries are its gliders.
- **The Sims as reality TV.** [U] Players stage dramas; YouTube "100 baby challenge" and Legacy challenges work because of **a fixed premise with a visible clock** (one family, ten generations). → The Argo has the best possible clock: Leaves age a year every 12 real hours. Surface **generation counters** per lineage and a "Legacy" view.
- **Dwarf Fortress community storytelling.** [U] "Boatmurdered" and "Bronzemurder" are *retellings*: one player curates and illustrates. Legends Viewer and DF Storyteller exist because the raw data is browsable. → Keep exporting everything; make **every page linkable**; let the Codex be the Bronzemurder.
- **Twitch Plays / Saltybet** (RESEARCH §3). For a watch-only world, the analogue is **prediction**: show the "Brewing" threads with *odds* computed from the sim ("the Boar's circle reaches Iolcus in ~3 days"; "the vendetta of the line of #77 is 2 of 4 steps along"). No betting, no money: just questions the viewer wants answered next hour.
- **Ryan's dissertation.** Narrativization is the scarce work; the spectator should be served **arcs with open ends**, cast lists, and recaps.
- **Rules of thumb for the Argo's front page:** one thing that **ended** today, one thing that **started**, one thing **about to happen**; one face; one place on the map that changed.

---
## 3. Ranked TOP 25 new mechanics for the Argo

**Score** = watchability impact (1–5) × feasibility under the constraints (1–5). **Tick cost** is extra time per sim day at ~11k live agents (budget ~100 ms; today ~35–40 ms). **State** is extra raw bytes in `state.json` (13k entities); gzip is typically 4–8× smaller for mostly-zero arrays. Every new per-agent array goes in `LAYOUT`, is initialised in `bear()`, and needs a `VERSION` bump. Every new system skips `A.status[i] !== 0` and iterates in index order.

**Interlock key.** Loops are named so you can see which mechanics feed each other:
- **[P] Pollution loop:** killing → miasma → plague/famine/Erinyes → purification, scapegoats, trials.
- **[M] Memory loop:** events → long-term memory → vows, scars, poems → new events.
- **[N] Narrative loop:** threads in progress → director bias → events → reactive narration → front page.
- **[H] Hidden-knowledge loop:** secrets, curses, mysteries → gossip/rumours → exposure → trials, exile, revenge.
- **[S] Status loop:** renown, aspirants, hooks, offices → schemes, cadet splits, ostracism.
- **[W] Wild loop:** prey, monsters, hunts, relics, heroes.
Existing systems are referred to by name (director, rumours, faiths, sifter, funerals, ostracism, offices, relics, festivals/memory, unrest, wars).

---

### #1 Miasma and Katharsis (pollution, the Erinyes, the scapegoat) — score 25 (5×5) — loops P, H
- **Inspiration.** Greek religion's *miasma* (Robert Parker, *Miasma*, 1983 [U]); the Erinyes pursuing kin-slayers (Aeschylus, *Eumenides* [U]); the *pharmakos* scapegoat expelled at the Thargelia [U]; DF curses as consequences of offence; RimWorld precepts.
- **Spec.** Every killing, every unburied body and every desecration adds **miasma** to the killer and to the district (`miasma[d]`, integer). District miasma decays slowly (×15/16 weekly) and **multiplies the director's plague/famine/harpy odds there** and adds a city-wide thought ("the city is unclean"). A **kin-slaying** (victim shares lineage, or is a parent/child) makes the killer **Erinys-hounded**: stress +40/day, can't hold office, and the hounding spreads miasma wherever they go, until they are purified. **Katharsis** is a ritual at a temple or the Pyra costing obols (a money sink, invariant-safe via the existing destroy path) with quality bands (RimWorld): masterful cleans killer and district, terrible doubles it. When a city's miasma crosses a high threshold and the director's plague fires, the Boule may vote a **pharmakos**: expel the two lowest-reputation residents (an ostracism variant), cleansing the city at once.
- **State.** `miasma` Uint8 per agent (13 KB); `curse` byte reused for Erinys (#7); `w.miasma[15]`.
- **Tick cost.** ~0.1 ms (event hooks + one weekly decay loop).
- **New stories.** The murderer who brings plague on his own city; the mother hounded by Furies for a mercy killing; scapegoats chosen from the friendless; the priest who sells false purifications (secret, #9); a city that ignores its unburied dead and is visited by harpies. Every death now has a moral afterlife.
- **Interlocks.** director (odds), funerals (unburied → miasma), faiths/precepts (#16 decide what pollutes), ostracism (pharmakos), unrest, trials (#10), shades (#24), money sink (Charon-like).

### #2 Reactive narration engine (facts → most-specific line, played-once) — score 25 (5×5) — loop N
- **Inspiration.** Valve's fuzzy pattern-matched dialogue ([Ruskin 2012](https://cdn.akamai.steamstatic.com/apps/valve/2012/GDC2012_Ruskin_Elan_DynamicDialog.pdf)); Hades' essential/conditional/evergreen tiers and no-repeat rule; Voyageur's novelty and focus scoring; Expressionist's tagged, targeted generation; Qud's rationalization.
- **Spec.** For every chronicled event, `narrate.js` builds a **fact dictionary**: event type, cause, actor/victim kind (Argonaut/Leaf), ages, relationship between them (lover, parent, sworn enemy, coworker, hook-holder), counts ("third death in this lineage this month"), place facts ("where the victim's mother burned"), LTM and vow facts, the actor's **domains** (#8) and the narrator voice. Lines in the bank declare **criteria** (`{t:'death', cause:'starved', victimKind:'leaf', parentIsArgonaut:true}`); among matching lines pick **max criteria count**, then the one not yet used for this actor (played-once ledger keyed `(lineId, actor)` kept for 360 days), then novelty (mentions an aspect not yet used today), then `hash`. Lines can set **facts** that later lines test (e.g. "first famine death in Lemnos" marks Lemnos so the next one reads "again"). Grammar variables keep names and epithets consistent in a paragraph.
- **State.** No tick state. `played` set in `sift.json` (cap ~20k keys, rolling).
- **Tick cost.** 0 in the tick; narration of ~300 events/day × ~50 candidate lines ≈ 15k checks ≈ <2 ms in `advance.mjs`.
- **New stories.** Not new events: *new readings*. The same death becomes "Nikias starved in Lemnos, in the same lane where his grandmother starved forty years ago. His father, who is bone, carried him to the Pyra and has carried four before him." That is where a spectator's sense of "this world remembers" comes from.
- **Interlocks.** Consumes everything; especially LTM (#4), vows (#3), domains (#8), threads (#5).

### #3 Oaths on the Styx (vows from reflection) — score 20 (5×4) — loops M, N, S
- **Inspiration.** Generative Agents' reflection threshold (importance sum > 150) ([arXiv](https://arxiv.org/abs/2304.03442)); Frostpunk 2's promises with deadlines; CK3 schemes and hooks; Greek oaths sworn by the Styx, which even gods may not break (Hesiod, *Theogony* 775–806 [U]).
- **Spec.** Each agent accumulates `impAcc` from salient events that touch them (a kin death, a betrayal, a burn in their lineage). Crossing a threshold calls `reflect(i)`, which chooses one vow from a rule table using LTM and personality: **vengeance** on X, **find** a lost child/relic, **never return** to district Y, **restore** a ruined temple/city, **keep a lineage alive** (bear heirs), **serve** a faith until death, **win** an office. A vow has a target, a deadline (e.g. 120 days), and a 2–4 step plan that biases the agent's existing choices (migration toward the target's district, encounters with the target, saving obols). Fulfilment → renown (#13), a poem (#17), katharsis. Breaking or expiring → `oath_broken` LTM, miasma, and with a chance a **curse** (#7) from the god sworn by. Argonauts may hold vows for centuries: a deathless avenger hunting a mortal's descendants down the generations.
- **State.** `vowKind` Uint8, `vowTarget` Int32, `vowUntil` Int32, `vowStep` Uint8, `impAcc` Uint16 ≈ 12 B/agent ≈ 156 KB raw (mostly zero).
- **Tick cost.** ~0.3 ms (accumulate on events; vow agents ≲ 5% take a biased step).
- **New stories.** Generational vendettas with a clear "why"; the Leaf who vowed to rebuild the Reef temple and died at 71 with it half-built (and her son took up the vow); oath-breakers cursed into wolves; vows read aloud at symposia (#15).
- **Interlocks.** LTM (#4) feeds it; threads (#5) track it; curses (#7), renown (#13), poems (#17), scars (#14: "the oath-maker"), migration, wars (city-level vows of revenge for sacks).

### #4 The Weight of Leaves: long memory and core memories for the deathless — score 20 (5×4) — loop M
- **Inspiration.** DF thoughts-and-memories rework (8+8 slots, 1-year promotion, 1/3 core-memory personality change) ([DF wiki](https://dwarffortresswiki.org/index.php/Memory_(thought))); WAWLT impressions with cause pointers.
- **Spec.** Three LTM slots per agent `{kind, who, day, strength}` filled by a short list of heavy events (child died, beloved died, betrayed, burned kin seen on the Pyra, saw a monster kill, broke an oath, was saved by someone). Weekly, a rotating seventh of agents **recall** their strongest memory (boosted on calendar anniversaries, at the place it happened, or on meeting `who`): it re-fires as a thought and fades ×15/16. With p = 1/3 a recalled memory becomes **core**: a permanent fixed shift (grief: X −3, E +3; betrayal: A −6; rescue: A +5, tie to rescuer +20) recorded in the bio. Argonauts also keep a **`buried` counter** (Leaves of their own line they've outlived) that raises the chance of grief cores and, past thresholds, of a scar (#14) such as "no longer names the new ones".
- **State.** 30 B/agent ≈ 390 KB raw (sparse); `buried` Uint16.
- **Tick cost.** ~0.1–0.2 ms.
- **New stories.** The hardening of the immortals, visible in the numbers and narrated; anniversaries that re-open wounds ("on the day his first daughter burned, #412 does not leave the house"); personality drift over real months that a holder can watch on their own token.
- **Interlocks.** vows (#3), scars (#14), narration (#2), festivals (anniversaries), poems (#17), rumours (who remembers what).

### #5 Threads in progress ("Brewing") + story-aware director — score 20 (5×4) — loop N
- **Inspiration.** Winnow partial matches and `unless` clauses; Loose Ends goal-ranked actions; Ryan's curationism; Façade.
- **Spec.** Convert 8–12 of the sifter's patterns into **incremental acceptors** with explicit kernel steps and kill conditions (vendetta, cross-lineage love, the long return, the betrayed host, the curse revealed, the monster's widening circle, the hubris arc, the oath's deadline). Keep ≤ 64 live threads in world state, deduplicated by bindings. The viewer shows a **Brewing** panel (top 5 by weight × completion × fame) with the next expected beat, and story pages show open threads on a character. Where the engine makes a stochastic choice that a live thread names (whom an avenger meets, whether a revenge attempt happens this week), it adds a small bias `β` (e.g. +20% relative) toward advancing it, Loose Ends-style, logged so it's auditable.
- **State.** ≤ 64 × ~40 B in `w`.
- **Tick cost.** ~0.5–1 ms (event × thread checks).
- **New stories.** Not new kinds; **more completed arcs** and a reason to come back next hour. Cliffhangers.
- **Interlocks.** Everything the sifter reads; vows (#3) are threads by construction; monsters (#6) and mysteries (#10) expose stages.

### #6 Monsters with lairs and appetites — score 20 (5×4) — loop W, P
- **Inspiration.** DF megabeasts (lairs, kill lists, wealth thresholds, slayers become heroes); UO's dragon that widens its hunting circle when prey runs out ([Koster](https://www.raphkoster.com/?p=46439)); RimWorld threat scaling.
- **Spec.** 3–5 named monster entities (Calydonian Boar on Bear Mountain, Teumessian Fox near Iolcus, the Stymphalian flock at the forges, Scylla on a sea lane, the sleepless Colchian dragon by the Fleece). Each has `lair, hunger, radius, kills[], wounds, slainBy`. Districts have `game` (prey) regrowing logistically and depleted by hunters and the monster. Daily: eat from game in radius; if short, hunger rises and radius grows; when it covers a populated district and hunger > 60, it **attacks** (kills Leaves, breaks Argonauts, eats food stock, adds miasma). Cities respond with offerings (food sink, resets hunger) or a **Hunt** practice (#15): a cast of champions from offices, renown and vows; outcome from strength vs wounds, casualties logged; the slayer gets a cognomen, a relic (hide, tusk), renown and a poem. A slain monster can return (bone-born, Ares' creatures) after a long interval with a new name, so the world never runs out of gliders.
- **State.** 5 × ~60 B + `game[15]`.
- **Tick cost.** <0.05 ms.
- **New stories.** The slow approach of the Boar toward a famine town; the hunt that killed four heroes and failed; the bone champion broken and re-knit three times against the same beast; the faith that starts worshipping the Fox.
- **Interlocks.** director (monsters replace generic incidents), relics/Fleece (the dragon guards it), renown (#13), poems (#17), miasma (#1), vows (#3), trade (lanes closed by Scylla), crafts (hunting skill).

### #7 Curses: Lamiai, Lycaon's wolves, the hungry bone — score 20 (5×4) — loops H, P
- **Inspiration.** DF vampires/werebeasts (curse for offence; hidden identity; periodic transformation; detection by anomaly) ([Vampire](https://dwarffortresswiki.org/index.php/Vampire), [Werebeast](https://dwarffortresswiki.org/index.php/Werebeast)); Lycaon (Ovid, *Met.* 1 [U]); Lamia/Empusa [U].
- **Spec.** A **curse** byte (secret) is laid by a god when an agent breaks an oath (#3), desecrates a temple or grave, or kills a guest (xenia). *Lamia* (Leaves): every 6–10 days drains a sick or sleeping neighbour (sick=2, small death chance), leaving anomaly marks on victims. *Lykaon*: on each month's full-moon day (a fixed calendar table), attacks in the district; bitten adults get the curse with p. *The hungry bone* (Argonauts): cannot die, so the curse inverts into a hunger that feeds on Leaves of other lines. Detection: the Lynceus office, augurs (high O) and witnesses roll against accumulated anomalies; a reveal seeds a rumour, can open a mystery (#10) or a trial, and ends with exile, purification (#1) or, for Leaves, the Pyra.
- **State.** `curse` Uint8, `curseDay` Int32 (65 KB raw); anomaly count per district.
- **Tick cost.** <0.1 ms (only cursed agents act; ≤ ~20).
- **New stories.** Who is the wolf of Iolcus; the wrong woman burned for a lamia's deeds; the immortal who feeds on his rival's grandchildren; curse lineages; the full moon as a monthly event the audience waits for.
- **Interlocks.** vows (#3), miasma (#1), mysteries (#10), offices (Lynceus), rumours, precepts (#16: some faiths protect the cursed), threads (#5).

### #8 Domains and mythic biographies (Qud rationalization) — score 20 (4×5) — loops N, M
- **Inspiration.** Caves of Qud's domain-parameterised gospels and ex-post rationalization ([paper](https://www.pcgworkshop.com/archive/grinblat2017subverting.pdf)); DF myth generation; URR culture-voiced artefacts.
- **Spec.** Derive 1–2 **domains** per Argonaut from on-chain traits (Bones → stone, gold, coral, flower, silver, fire, sky, earth; Cloak/Crown/Artifact → death, sea, war, song, royalty…); Leaves inherit one from each parent (so domains drift down lineages). Each domain has grammar rules (practices, weapons, omens, places, curses, epithets). Biographies are written as **gospels**: each bio entry rationalized by state (a grudge, a faith, else the domain), named objects minted at victories and lost at defeats, places renamed by the winner's faction. Each faction narrates the same gospel with its own bias (the Argo already has retellings), and **tomb/stele inscriptions** use the dead's domain.
- **State.** None (derived), plus optional named-object list in relics.
- **Tick cost.** 0 (text layer).
- **New stories.** Coherent mythic lives for 9,999 tokens: "#3010 of the coral, who drowned the Reef's harbour-master over the right to the coral beds…". Holders get a legend that reads like a myth, not a log.
- **Interlocks.** narration (#2), epitaphs (#18), poems (#17), relics, faith myths.

### #9 Secrets and hooks — score 16 (4×4) — loops H, S
- **Inspiration.** CK3 secrets, blackmail, weak/strong hooks ([CK3 wiki](https://ck3.paradoxwikis.com/Secret)).
- **Spec.** A capped global list of secrets (adultery, murder, embezzlement by office-holders, secret apostasy, curse, a Leaf fathered by someone else) with up to four knowers. Knowledge spreads only inside existing encounters (tie > 40). A knower with low Honesty-Humility **blackmails**: a weak hook (one forced favour) or strong hook (repeatable, monthly cooldown) on the owner. Hooks bias Boule votes, office appointments and coalition choices; refusing blackmail exposes the secret. A knower with high H, or a rumour that reaches the secret, **exposes** it publicly: legitimacy loss, ostracism candidacy, a trial (#10), or divorce/cadet split (#13).
- **State.** ≤ 256 × 30 B; `hookOn` Int32 + `hookStr` Uint8 per agent (65 KB).
- **Tick cost.** ~0.1 ms.
- **New stories.** The Tiphys voting against his own coalition for reasons nobody sees, until the chronicle reveals the blackmail; the honest Leaf who exposed her own father; secret lineages.
- **Interlocks.** politics, ostracism, rumours, mysteries (#10), dynasties (#13), reputation (#22), threads.

### #10 Whodunit: open mysteries, belief tables and the Areopagus — score 16 (4×4) — loops H, P
- **Inspiration.** Talk of the Town belief facets and evidence types ([Ryan et al.](https://ojs.aaai.org/index.php/AIIDE/article/download/12825/12672)); Shadows of Doubt witnesses-by-routine; Aeschylus' Areopagus.
- **Spec.** Unwitnessed or ambiguous harms (night killings, Lemnian murders, thefts of relics, desecrations, curse attacks) open a **case** (cap 32) with the true culprit hidden. Witnesses (≤ 5 from the district's night-roaming jobs) seed beliefs; each gossip encounter between a believer and a listener moves belief toward a suspect with evidence weights (sighting 1.0, statement 0.6, rumour 0.3, a lie by a guilty low-H suspect pointing at a scapegoat from a distrusted faith). Per case keep `{suspect → score}` for ≤ 4 suspects and the top 8 believers. Vengeance, vows (#3) and exposure target **the believed** culprit. When belief concentrates, a **trial** practice runs: jurors drawn from the Boule's factions vote by tie, faith and hooks; verdicts can be wrong; ties acquit (Athena's vote).
- **State.** ≤ 32 × ~120 B.
- **Tick cost.** ~0.1 ms.
- **New stories.** Wrongful executions and the truth later revealed by a shade (#24) or a deathbed confession; feuds started on a lie; the lineage that knows it was framed.
- **Interlocks.** secrets (#9), curses (#7), miasma (unpunished killing keeps the city unclean), rumours, reputation (#22), threads.

### #11 Tension-cycle storyteller (acts, respite, Façade targeting) — score 16 (4×4) — loop N
- **Inspiration.** Cassandra's 4.6/6.0-day cycle and ≥ 1.9-day spacing ([wiki](https://rimworldwiki.com/wiki/Cassandra_Classic)); Façade's tension-curve beat selection.
- **Spec.** Make each 30-day month an **act**: quiet (days 1–8), rising (9–20), climax (21–26), aftermath (27–30). Measure tension `T` over 7 days (deaths, riots, wars, hunger, monster attacks). The director picks, among affordable incidents, the one whose tension weight moves `T` closest to the act's target; climax allows 1–2 majors ≥ 2 days apart; quiet and aftermath only allow gentle incidents (bounty, festival, omen of what's coming, a monster sighted). **On-chain burns and rulings override**: when the Maker strikes, the director shifts into aftermath for that city (the chain is the true storyteller).
- **State.** A few numbers in `w.director`.
- **Tick cost.** ~0.
- **New stories.** Readable seasons ("the Month of the Boar"), quiet weeks where weddings, births and poems surface, climaxes that land.
- **Interlocks.** director, monsters (#6), threads (#5), festivals, chain omens.

### #12 Strange moods and named artefacts — score 16 (4×4) — loops W, M
- **Inspiration.** DF strange moods (fey/secretive/possessed/macabre/fell; succeed → named artefact, fail → madness or death) ([wiki](https://dwarffortresswiki.org/index.php/Artifact)).
- **Spec.** Rarely (≲ 1 per 10 days world-wide, boosted by inspiration, devotion and stress), a crafter is **seized** ("by Hephaestus", "the Daedalian fit", "Hecate's hand", "the Telchine rage"). The mood demands goods drawn from what is scarce in their city (and, for Hecate's hand, *bone* from a broken Argonaut in Asphodel, a horror beat). If demands are met within 12 days a **named relic** is forged (grammar: maker's domain + material + epithet) and enters the existing provenance system; if not: madness (cognomen, scar), or for a fell mood, a killing whose victim's bones become the artefact.
- **State.** ≤ 3 active moods in `w`; relics already exist.
- **Tick cost.** ~0.
- **New stories.** Artefacts whose making is a story, later stolen, inherited, captured in war, sought by the Fleece hunters; a famine town where the god-seized smith goes mad because no one would sell him bronze.
- **Interlocks.** market/trade (demands), relics/Fleece, crafts (Henrich), miasma (fell), mysteries (stolen relics), renown.

### #13 Dynasty renown, legacies and cadet houses — score 16 (4×4) — loop S
- **Inspiration.** CK3 renown, legacies (250, +500 each), cadet branches, dynasty head by strength ([wiki](https://ck3.paradoxwikis.com/Dynasty)).
- **Spec.** Each lineage (founded by an Argonaut) gets `{renown, legacies, head, cadetOf}`. Renown from offices held, monsters slain, vows kept, relics held, poems about members, wars won; lost by exposures and curses. Thresholds unlock up to five **legacies** chosen by the head's personality from a small set (Blood of the Sown: +5 yr Leaf lifespan; Oarsmen: craft bonus; Guest-friends: xenia with another lineage; Oath-keepers; Pyre-keepers: cheaper katharsis). A **cadet house** splits off when a member converts against the head's faith, a feud runs inside the family, or an aspirant is denied (#20); cadets get their own name (patronymic + domain) and inherit a grudge.
- **State.** One record per active lineage (hundreds), monthly update.
- **Tick cost.** ~0.05 ms.
- **New stories.** Great houses rising and splitting over generations; the house whose legacy is grief; Argonaut founders watching their descendants war.
- **Interlocks.** aspirants (#20), hooks (#9), vows (#3), poems (#17), offices, marriage/love.

### #14 Scars: permanent coping habits from breakdowns — score 16 (4×4) — loop M
- **Inspiration.** CK3 coping-mechanism and break traits ([wiki](https://ck3.paradoxwikis.com/Stress)); Wildermyth's visible transformations.
- **Spec.** When an agent breaks (existing `breakdown()`), with p they gain a permanent **scar** from a table chosen by personality: smoke-eater, mourner (attends every funeral), bone-flagellant (Argonauts break their own fingers; they re-knit), oath-maker, wanderer, the cruel, the silent. Each gives a stress-relief action on a cooldown and its own event lines. Physical re-knit marks (fused jaw, gold seam, coral growth) accrue per breaking for Argonauts and are drawn by the viewer from `deaths`.
- **State.** `scar` Uint8 (13 KB).
- **Tick cost.** ~0 (inside the mood pass).
- **New stories.** Characters you can recognise at a glance by their habits; the mourner who has attended 300 funerals; the cruel man's string of brawls.
- **Interlocks.** LTM (#4), vows (#3), market (smoke demand), social (silent/cruel), miasma (cruel).

### #15 Practices and storylets with casting (symposium, funeral games, wedding, hunt, trial) — score 16 (4×4) — loops N, M
- **Inspiration.** Versu social practices ([Evans & Short](https://cs.uky.edu/~sgware/reading/papers/evans2014versu.pdf)); Wildermyth role casting; Emily Short's storylets; Iliad 23 funeral games.
- **Spec.** ~40 storylets and ~6 practices, each declaring roles (predicates on agents), place, cooldown, stages and effects on existing state. Once per day per district at most one storylet is drawn from a qualifying deck; practices (symposium, funeral games for notables, wedding, hunt, trial, siege council) run 1–3 days with stages. Casting picks agents who satisfy role predicates (the Doubter, the Believer, the Rival, the Lover). Effects write ties, thoughts, LTM, vows, secrets, relics and renown.
- **State.** Active practice list (≤ 10) + per-storylet cooldown day.
- **Tick cost.** ~0.2 ms.
- **New stories.** Authored-feeling set pieces with emergent casts: the wrestling match at a hero's funeral games won by the man who killed him; the symposium where an oath is sworn drunk; the wedding cursed by a guest-slaying.
- **Interlocks.** vows (#3), monsters' hunts (#6), trials (#10), poems (#17), secrets (#9), relics.

### #16 Precepts and ritual quality — score 16 (4×4) — loops P, M
- **Inspiration.** RimWorld memes/precepts/rituals/certainty ([wiki](https://rimworldwiki.com/wiki/Ideoligion)); WAWLT subjectivity.
- **Spec.** Each faith gets 5 precept stances drawn at founding from doctrine and deity: the dead Leaf (burn / bury whole / sea / keep bones), broken bone (tend / leave to the Mender / judgement), the Maker's fire (apotheosis / atrocity / indifferent), xenia (sacred / conditional / none), Sown–Leaf love (blessed / forbidden). Events look up actor and witness precepts → thoughts, devotion and miasma. Rituals (funeral, festival, katharsis, oath, wedding) draw a quality band from priest devotion, obols and crowd size (terrible/poor/good/excellent with fixed mood effects).
- **State.** 5 bytes per faith.
- **Tick cost.** ~0.05 ms.
- **New stories.** The funeral that scandalises half the street; love between a Leaf and an Argonaut forbidden by one faith and blessed by another; burns read as martyrdom or punishment.
- **Interlocks.** faiths/schisms (precept divergence becomes a schism cause), miasma (#1), curses (#7), love, funerals.

### #17 Generated poetic forms, epics and satire — score 15 (5×3) — loops M, S
- **Inspiration.** DF poetic/musical/dance forms generated per culture ([wiki](https://dwarffortresswiki.org/index.php/Poetic_form)); Archilochus' iambic satire [U]; Homeric epic as memory.
- **Spec.** Each city generates 2–3 forms at founding (purpose: lament, boast, hymn, satire; meter label; stanza pattern; refrain; preferred subject) that drift with fashion. The Orpheus office, priests and inspired agents compose **poems** about the sifter's top stories; a poem is `{form, composer, subject event}` with text realised by grammar at narration time. Effects: the subject event gets a **slower world-memory decay** (sung history lasts); boasts add renown, satires cut a target's legitimacy and add stress; laments at funerals add katharsis. Festivals perform the city's canonical poems.
- **State.** ~45 forms × ~16 B; poems list capped (~200) in `w`.
- **Tick cost.** ~0.
- **New stories.** Poems that keep the memory of a massacre alive for generations in one city and let it fade in another; a satirist driving an office-holder out; dead poets' forms surviving their city's fall.
- **Interlocks.** memory/festivals, renown (#13), reputation (#22), sifter, offices (Orpheus).

### #18 Epitaphs and stelai for every dead Leaf — score 15 (5×3) — loops M, N
- **Inspiration.** DF engravings and slabs; Greek funerary epigram formulas ("Stranger, go tell…", "Here lies…", the speaking stone) [U]; NetHack's tombstones.
- **Spec.** Every Leaf death writes a short **epitaph** built from facts (age, lineage, cause, domain, the parent who is bone, the poem if any) in the dead's faith's voice, inscribed on a grave in Asphodel that the viewer can hover. Rich families buy a **stele** (obols destroyed, like monuments) with a longer inscription; iconoclasm (existing) can smash them. A small number of steles become **monuments of memory** (existing system).
- **State.** None beyond existing grave data; steles as a small list.
- **Tick cost.** ~0.
- **New stories.** A walkable graveyard of thousands of readable lives; the mother whose stele was smashed by a rival faith.
- **Interlocks.** narration (#2), domains (#8), funerals, monuments, faiths, iconoclasm.

### #19 The Dragon's Teeth (necromancy of the Leaves) — score 12 (4×3) — loops W, M
- **Inspiration.** DF necromancers (mortality obsession → death god → slab → apprentices → tower → undead sieges) ([wiki](https://dwarffortresswiki.org/index.php/Necromancer)); Aeëtes' dragon teeth and the Sown Men [U].
- **Spec.** An old, grieving Leaf devoted to a fire or death faith may vow (#3) to escape death and seek the **Teeth** (relics placed in the Fleece/dragon lair or forged by a macabre mood). With a tooth they **sow Teeth-men**: temporary armed bone entities (`kind = 2`, no money, no ties, crumble after 30–60 days) who garrison a tower in the Grove of Ares, raid, and draw a war response. Apprentices learn from the sower; a slain sower's teeth are relics that others covet. Leaves can never truly become Sown: the arc always ends in failure, which is the point.
- **State.** Teeth-men in the entity store (cap ~60); tower record.
- **Tick cost.** ~0.1 ms when active.
- **New stories.** Mortals' revolt against mortality using the Argo's own founding myth; the tower in the Grove; a Leaf necromancer's grandchildren hunted for the teeth.
- **Interlocks.** vows, relics/Fleece, wars, miasma, faiths, monsters.

### #20 Aspirants and the secular cycle (elite overproduction made visible) — score 12 (4×3) — loop S
- **Inspiration.** Turchin and Nefedov's secular cycles and elite overproduction ([book](https://peterturchin.com/books/secular-cycles)); Victoria 3 movements.
- **Spec.** Each month count **aspirants** (adult Leaves in the top decile of obols or renown) against fixed elite positions (8 crew offices + Boule seats). PSI = aspirant ratio × hungry share × treasury stress (CULTURE.md). High PSI raises the odds of vows to win office (#3), schemes, cadet splits (#13), splinter factions and **movements** (`{law demanded, supporters, stage}` escalating petition → agitation → riot). Show PSI and the phase (expansion, stagflation, crisis, depression) as the headline history chart.
- **State.** A few world numbers; movement list ≤ 8.
- **Tick cost.** ~0.1 ms monthly.
- **New stories.** Ages with structural causes the viewer can see coming over 2–4 real months; the generation of disappointed rich children who burned the Agora.
- **Interlocks.** politics, unrest, dynasties, vows, director baseline.

### #21 Irreversible world states — score 12 (4×3) — loops S, W
- **Inspiration.** Kenshi world states ([wiki](https://kenshi.fandom.com/wiki/World_States)).
- **Spec.** A small table of one-way flags with map and text consequences: a city sacked becomes "X's Ash" (ruin art, renamed in the victors' tongue) until resettled; a crew office whose last holder is burned on-chain stays **vacant forever** (a hole in the Boule, mourned at its festival); a slain monster's lair becomes a shrine; a desecrated temple stays cursed until a katharsis of masterful quality. Flags are listed in the Codex as "What cannot be undone".
- **State.** A few dozen bytes.
- **Tick cost.** ~0.
- **New stories.** Scars on the map that outlive everyone; the long project to reclaim a ruin.
- **Interlocks.** wars, monsters, chain burns, miasma, monuments.

### #22 Public reputation from gossip — score 12 (4×3) — loops H, S
- **Inspiration.** CiF's Social Facts Database labels ([Samuel et al.](http://www.ben-samuel.com/wp-content/uploads/2015/09/TCIAIG-social-story-worlds-with-comme-il-faut.pdf)); Beta reputation (RESEARCH §2); Qud's water ritual.
- **Spec.** Acts write **labels** (kind, cruel, pious, treacherous, brave, shameful) into a 3-slot per-agent reputation ring with strength; encounters spread labels with decay (like rumours, but about persons). Reputation biases ties, encounter intents (#25), votes, jurors (#10) and pharmakos selection (#1). Cognomens can be earned from strong labels.
- **State.** 6 B/agent (78 KB).
- **Tick cost.** ~0.1 ms.
- **New stories.** The undeserved bad name that follows a family; redemption arcs; the scapegoat chosen by gossip.
- **Interlocks.** social, trials, miasma, politics, cognomens.

### #23 The Agora Report and the Almanac — score 12 (3×4) — loop N
- **Inspiration.** EVE's Monthly Economic Report; Turchin's charts; Seshat's complexity index.
- **Spec.** Each sim-month, generate a report page and RSS item: price indices per city and good, faucets (gold from Colchis) vs sinks (Charon's obol, steles, katharsis), Gini, richest and ruined houses, pirate skim, miasma by city, PSI and phase, monster positions, open cases, vows nearing deadline. Written in a dry "economist of the Agora" voice with procedural commentary.
- **State.** None in the tick.
- **Tick cost.** 0 (in `advance.mjs`).
- **New stories.** The macro story for people who like numbers; famine warnings; bubbles.
- **Interlocks.** economy, PSI (#20), miasma (#1), monsters (#6).

### #24 Shades and bones (the restless dead) — score 12 (4×3) — loops P, H
- **Inspiration.** NetHack bones files and ghosts ([wiki](https://nethackwiki.com/wiki/Bones)); DF ghosts of the unburied; Greek belief that the unburied cannot cross (Elpenor in *Odyssey* 11 [U]).
- **Spec.** A Leaf who dies unburied, murdered, or with relics on them leaves a **shade** bound to the place (cap ~24). Shades haunt passers-by (thought), torment whoever took their relics (LTM, stress), add miasma until rites are done, and, if murdered, **name their killer** to the next augur or priest who passes (evidence that can close a mystery, #10, or prove a verdict wrong). Rites cost obols; the Anthesteria (existing) makes all shades walk.
- **State.** ≤ 24 × ~20 B.
- **Tick cost.** ~0.
- **New stories.** Ghosts demanding their oars; a wrongful execution revealed by a shade; relic-thieves driven mad.
- **Interlocks.** funerals, miasma, mysteries, relics, festivals.

### #25 Social exchanges for encounters (CiF-lite volition) — score 12 (4×3) — loops H, S, M
- **Inspiration.** Comme il Faut / Prom Week social exchanges, influence rules, microtheories, trigger rules; The Sims' advertisements for where people go.
- **Spec.** Replace the generic outcome of an encounter with **intent selection**: score ~8 intents (befriend, insult, court, recruit to faith, recruit to faction, accuse, confide a secret, swear guest-friendship) with ~40 weighted influence rules over existing state (ties, faction, faith, lover, hooks, reputation labels, LTM about the other, scars). The responder accepts or rejects by its own rules; effects change ties, thoughts and labels; trigger rules apply after (e.g. two lovers → "two-timer" secret). Evening destinations follow district **adverts** (temple for zealots, Pyra for mourners, Agora for traders), so encounters become thematic.
- **State.** None new (uses #9, #22).
- **Tick cost.** ~0.3–0.8 ms (replaces part of `social()`).
- **New stories.** Insult chains that become feuds for a visible reason; conversions by persuasion; guest-friendships across bloods that later get betrayed.
- **Interlocks.** secrets, reputation, vows, love, faiths, mysteries.

---

### Interlock map (what feeds what)

```
                 chain burns / rulings ──────────────┐
                                                     v
 #6 monsters ──attacks──> deaths ──> #1 MIASMA ──> director odds (#11) ──> plague/famine/harpies
     ^                     │  │          │                                    │
     │ hunts (#15)          │  │          ├─> Erinyes ─> #3 vows broken? ──> #7 CURSES ──> more deaths
     │                     │  │          └─> pharmakos (ostracism) <── #22 reputation
     │                     │  └─> #24 shades ──names killer──> #10 MYSTERIES <── #9 secrets
     │                     v                                       │
     │                #4 LONG MEMORY ──reflection──> #3 VOWS ──> threads (#5) ──bias──> events
     │                     │   └─> #14 scars                         │
     │                     └─> #17 poems ──slow decay──> festivals/memory
     │                                         └─> #13 renown <── #20 aspirants/PSI
     └── relics/Fleece <── #12 strange moods                │
                                                           v
                            #2 REACTIVE NARRATION + #8 DOMAINS + #18 EPITAPHS  ──> front page, Brewing, Legends
```

**Strongest feedback loops (build these together):**
1. **#1 + #7 + #10 + #24 + #16** (pollution and justice): killings pollute, pollution summons plague and Furies, curses and shades produce mysteries, mysteries end in trials whose errors leave the city unclean. Self-sustaining, Greek to the bone, and almost all of it is event hooks on systems that exist.
2. **#4 + #3 + #5 + #2** (memory and narrative): trauma becomes vows, vows become threads, threads are surfaced and nudged, narration tells them with specifics. This is the loop that makes long-term watchers feel the world has continuity.
3. **#6 + #15 + #12 + #13 + #17** (heroes): monsters force hunts, hunts mint heroes, relics, renown and poems; renown drives dynasties.
4. **#9 + #20 + #22 + #25** (status): hooks, aspirants and reputation make politics personal.

### Suggested build order (rules versions)
- **v10, "The Unclean City":** #1, #16, #24, #11 (one bump: miasma + precepts + shades + act-cycle director). Text-only #2 and #8 can ship any time without a bump.
- **v11, "Long Memory":** #4, #3, #14, #5.
- **v12, "Beasts and Heroes":** #6, #15, #12, #13, #17, #18.
- **v13, "What Is Hidden":** #7, #9, #10, #22, #25.
- **v14, "Discord":** #20, #21, #19, #23.

### Budget check (all 25)
Estimated extra tick time ≈ 4–6 ms/day (dominated by #25, #5, #3), i.e. the day stays well under 50 ms. Extra raw state ≈ 0.8–0.9 MB at 13k entities, mostly zero-filled per-agent slots (#4 LTM 390 KB, #3 vows 156 KB, #22 78 KB, hooks 65 KB, curses 65 KB); after gzip roughly +120–200 KB. That pushes the gzipped state toward ~1.2 MB, so **pair v11 with the planned compaction**: archive Leaves dead > 360 days out of `state.json` into the chronicle, which also stops the arrays growing forever. Alternatively shrink LTM to 2 slots and store days as Int16 offsets from a per-agent epoch.

---

## 4. What not to build (ruthless list)

- **Full Talk-of-the-Town mental models for everyone**: O(n × known) facets, hundreds of MB. Use per-case tables (#10).
- **CiF with thousands of rules over all pairs**: authoring cost and O(n²) volition. Use the encounter-local version (#25).
- **DF's 50 facets / 31 values for everyone**: invisible; RESEARCH already flags "placebo". At most 4 culture values if precepts or vows read them.
- **Generative Agents' memory streams with retrieval by relevance**: relevance needs embeddings. Keep importance + recency + fixed slots.
- **Axelrod strategy ecologies between pirates and merchants**: correct and invisible.
- **Black & White creature learning**: nobody trains it in a watch-only world.
- **A real food web (Spore/DF wildlife)**: only a prey count per district, for monsters.
- **Ultima Ratio Regum-scale culture generation**: copy its outputs (inscriptions, heraldry), not its scope.
- **Anything that needs `Math.exp/log/pow/sin` in state**: use multiplication tables and the existing `ln()`; decay as `×15/16` integer steps.
- **Player or holder steering**: out of scope by design. Prediction/odds displays (#5) give the participatory feeling without inputs.

## 5. Engineering notes for whoever builds these

- **Event hooks over new loops.** #1, #7, #9, #10, #12, #16, #24 all trigger on events the engine already logs. Implement them as handlers inside `kill()`, `funerals()`, encounters and `applyOmens()`, not as new 11k loops.
- **Rotating cohorts.** Weekly per-agent work (LTM recall, reputation decay) runs for agents with `i % 7 === day % 7`: same total cost as before, spread evenly, and deterministic.
- **Caps everywhere.** Secrets 256, cases 32, threads 64, shades 24, monsters 5, moods 3, practices 10, Teeth-men 60. Every list evicts by a deterministic rule (lowest strength, then oldest, then lowest id).
- **Secrets must stay secret in the viewer** until revealed in-world: put hidden fields behind a "revealed" flag, and let the chronicle say "unknown hands" until a reveal event. That's the whole pleasure of #7 and #10.
- **Determinism traps.** Iterating object keys of a `{}` keyed by numbers is ordered, but keyed by strings is insertion-ordered: always iterate arrays. Never let viewer-side code feed back into state.
- **Text lives outside the tick.** #2, #8, #17 text, #18 and #23 run in `advance.mjs` / `narrate.js`. Only the facts they need (counts, flags) live in state.
- **Persist provenance.** Add this doc to the parent DB via `python -m argonauts persist` (the user's rule), and cite the mechanic's source in code comments as the existing files do.

## 6. Sources (all URLs used above)

Primary or datamined, checked this session [V]:
- Grinblat & Bucklew, *Subverting Historical Cause & Effect: Generation of Mythic Biographies in Caves of Qud*, FDG 2017 — https://www.pcgworkshop.com/archive/grinblat2017subverting.pdf (also https://dl.acm.org/doi/pdf/10.1145/3102071.3110574; wiki https://wiki.cavesofqud.com/wiki/Sultan_histories; GDC slides https://gdcvault.com/play/mediaProxy.php?sid=1025379)
- Ryan, Summerville, Mateas, Wardrip-Fruin, *Toward Characters Who Observe, Tell, Misremember, and Lie*, AIIDE 2015 — https://ojs.aaai.org/index.php/AIIDE/article/download/12825/12672
- Ryan, *Curating Simulated Storyworlds* (PhD, UCSC 2018) — https://escholarship.org/content/qt4vj649w6/qt4vj649w6.pdf ; Emily Short's chapter notes — https://emshort.blog/2019/05/28/curating-simulated-storyworlds-james-ryan-ch-6f/
- Kreminski et al., *Winnow*, AIIDE 2021 — https://mkremins.github.io/publications/Winnow_AIIDE2021.pdf ; code https://github.com/mkremins/winnow
- Kreminski et al., *Why Are We Like This?: The AI Architecture of a Co-Creative Storytelling Game*, FDG 2020 — https://mkremins.github.io/publications/WAWLT_FDG2020.pdf
- *Loose Ends: A Mixed-Initiative Creative Interface for Playful Storytelling*, AIIDE 2022 — https://ojs.aaai.org/index.php/AIIDE/article/download/21955/21724/26007
- Samuel, McCoy, Treanor, Reed, Mateas, Wardrip-Fruin, *Social Story Worlds With Comme il Faut*, IEEE TCIAIG — http://www.ben-samuel.com/wp-content/uploads/2015/09/TCIAIG-social-story-worlds-with-comme-il-faut.pdf ; *Prom Week: Designing past the game/story dilemma* — http://www.fdg2013.org/program/papers/paper13_mccoy_etal.pdf
- Evans & Short, *Versu—A Simulationist Storytelling System*, IEEE TCIAIG 2014 — https://cs.uky.edu/~sgware/reading/papers/evans2014versu.pdf ; Praxish — https://mkremins.github.io/publications/Praxish_AIIDE2023.pdf
- Mateas & Stern, *Structuring Content in the Façade Interactive Drama Architecture*, AIIDE 2005 — https://www.cs.uky.edu/~sgware/reading/papers/mateas2005structuring.pdf
- Ruskin, *AI-driven Dynamic Dialog through Fuzzy Pattern Matching*, GDC 2012 — https://cdn.akamai.steamstatic.com/apps/valve/2012/GDC2012_Ruskin_Elan_DynamicDialog.pdf ; https://www.gdcvault.com/play/1015528/AI-driven-Dynamic-Dialog-through
- Dias, *Procedural meaning: Pragmatic procgen in Voyageur* — https://www.gamedeveloper.com/design/procedural-meaning-pragmatic-procgen-in-voyageur
- Jefferies, *Shadows of Doubt DevBlog 8: Simulating a City* — https://colepowered.com/shadows-of-doubt-devblog-8-simulating-a-city/
- Dwarf Fortress wiki — Memory (thought) https://dwarffortresswiki.org/index.php/Memory_(thought) ; Emotion https://dwarffortresswiki.org/index.php/Emotion ; Necromancer https://dwarffortresswiki.org/index.php/Necromancer ; Vampire https://dwarffortresswiki.org/index.php/Vampire ; Werebeast https://dwarffortresswiki.org/index.php/Werebeast ; Artifact https://dwarffortresswiki.org/index.php/Artifact ; Megabeast https://dwarffortresswiki.org/index.php/Megabeast ; Poetic form https://dwarffortresswiki.org/index.php/Poetic_form ; Bay 12 dev page https://www.bay12games.com/dwarves/dev.html
- CK3 wiki — Stress https://ck3.paradoxwikis.com/Stress ; Secrets/Hooks https://ck3.paradoxwikis.com/Secret ; Dynasty https://ck3.paradoxwikis.com/Dynasty
- RimWorld wiki — Ideoligion https://rimworldwiki.com/wiki/Ideoligion ; Cassandra Classic https://rimworldwiki.com/wiki/Cassandra_Classic ; AI Storytellers https://rimworldwiki.com/wiki/AI_Storytellers
- Turchin & Nefedov, *Secular Cycles* — https://peterturchin.com/books/secular-cycles
- Park et al., *Generative Agents* — https://arxiv.org/abs/2304.03442
- Koster on UO's resource system and ecology — https://www.raphkoster.com/?p=517 , https://www.raphkoster.com/?p=519 , https://www.raphkoster.com/?p=46439

Secondary or unverified [U] (confirm before quoting): Hades dialogue system (https://www.christi-kerr.com/post/how-the-dialogue-system-in-hades-rewards-failure ; https://culturedvultures.com/supergiant-hades-word-count-dialogue/ ; GDC 2021 talk https://www.youtube.com/watch?v=m5KJSAj4afg); Emily Short, *Storylets: You Want Them* (https://emshort.blog/2019/11/29/storylets-you-want-them/) and *Beyond Branching* (https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/); *The Annals of the Parrigues* (https://inthewalls.itch.io/parrigues ; https://procedural-generation.isaackarth.com/2016/02/15/the-annals-of-the-parrigues-as-ive-noted-travel.html); Kate Compton, *So you want to build a generator* (https://galaxykate0.tumblr.com/post/139774965871/so-you-want-to-build-a-generator); Tracery (https://github.com/galaxykate/tracery); Expressionist (Ryan et al., ICIDS 2016); Wildermyth casting (https://turnbasedlovers.com/10-turns-interview/with-wildermyth-developer); Kenshi world states (https://kenshi.fandom.com/wiki/World_States); EVE MER (https://www.eveonline.com/news/view/monthly-economic-report); NetHack bones (https://nethackwiki.com/wiki/Bones); Legends Viewer (https://github.com/Parker147/Legends-Viewer); Ultima Ratio Regum (https://www.markrjohnsongames.com/game/); Songs of Syx; The Sims motives; Black & White; Parker, *Miasma* (1983); classical passages (Hesiod *Theogony* 775–806; Ovid *Met.* 1; Apollonius *Argonautica* 3; Aeschylus *Eumenides*; *Odyssey* 11; *Iliad* 23).
