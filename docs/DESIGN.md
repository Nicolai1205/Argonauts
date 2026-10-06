# The Argo: design v1

**Decided 2026-10-06:**
- **Autonomous** (nobody steers it) and **live** (it runs on the real clock).
- On-chain activity (new traits, animations, transfers, trades, burns) acts only as *omens* that drive events.
- Tone: **mythic + horror + realism**.
- **$0 to run**: no LLM API and no local model (see [FEASIBILITY.md](FEASIBILITY.md)).
- Names come from the real myths (see [LORE.md](LORE.md)).

A living society of 9,977 Argonauts. Every character has needs, a personality, a wallet, friends, grudges, a faction and a vote.
- Research basis: [RESEARCH.md](RESEARCH.md).
- Seed numbers: `game/seed_profile.py` → `game/seed/seed_profile.json` (snapshot taken 2026-10-06).

## 1. Principles

1. **The chain is canon.**
   - Traits, owners, sales, burns, rulings and visor phrases all come from the real data.
   - The simulation adds lives *around* those facts and never contradicts them.
2. **A deterministic core; no LLM at runtime.**
   - state = f(seed, rules version, ordered inputs).
   - Anyone can replay a run and verify the hash at the end of each era.
3. **Simulate everything, but show the stories.**
   - A showrunner pass sifts the event log into a daily chronicle.
   - Every number has a readable cause.
4. **Nobody steers.**
   - Holders are houses (*oikoi*), not players.
   - The chain only sends omens.
   - No forced burns.
   - No claimable real value inside the simulation.
5. **Sinks before faucets.**
   - Integer money.
   - A stock-flow invariant checked every tick.

## 2. Who the Argonauts are: the seed

### Factions = Bones (the "blood")
Social identity theory says even an arbitrary visual trait produces in-group bias, so Bones is a sound seed for factions. Each faction's "culture" is what it over-wears relative to the whole fleet, measured as lift.

| Bones | Living | Culture (top over-represented outfits) | Faction (myth name, see LORE.md) |
|---|---|---|---|
| Bone | 4,468 | Clergy/Ivory cloaks, designer glasses, vape, Bubblegum/Violet; Influencer/Socialite personas | **Spartoi, the Sown**: the numerous, fashionable, consumerist mass. Biggest bloc in any headcount vote |
| Prehistoric | 2,492 | **Death** and Clergy cloaks, Aegean Beanie, Bandana, Dior/Prada | **Gegeneis, the Earth-born**: reapers and priests, tradition and mortality |
| Silver | 1,295 | Royalty/Death cloaks, bare heads, Shades, Offwhite/Punkblue | **Argyreoi, the Silver Race**: restrained merchant-gentry |
| Coral | 800 | *No cloak, nothing on*, Oarsman's Band, Siren/Storm; Purists and Deckhands | **Gorgonides, the Gorgon-born**: working sailors and purists. Labour |
| Floral | 500 | Ivory/Servant cloaks, Corsair, 3D Glasses, Seafoam/MuseGreen | **Anthemoessans, of the Siren isle**: growers, servants and dreamers. Care/ecology |
| Petrified | 300 | **Royalty** cloak, Bandana, Shades | **Laoi Lithinoi, the Stone People**: ancient aristocrats with a rebellious streak; static (never animate) |
| Gold | 88 | Bare, Clergy, Oarsman's Band, Lavender | **Chryseoi, the Golden Race**: the oligarchs. A tiny elite holding a large share of wealth |
| Radioactive | 25 | Servant/Death cloaks, Glasses/3D Glasses | **Phaethontes, the Blazing Ones**: mutants, outcasts, prophets |
| Alien | 9 | — | **Ouranidai, the Sky-blooded**: not from this world; diplomatic wildcards |

**What the data shows:** the rare tiers mostly go **bare**, while the common tiers are dressed up. That gives a built-in culture war: an ascetic elite versus a consumer mass.

### Cross-cutting identities ("some go beyond bones")
Each of these is a second axis of membership that can outweigh faction (an Axelrod-style culture vector).

- **Cloak = estate or vocation:**
  - Death → Reapers' guild (funerals, the graveyard, the obol trade)
  - Clergy → the Temple
  - Royalty → nobility
  - Servant/Ivory → servants' brotherhood
- **Crown = crew or subculture:**
  - Oarsman's Band → Rowers' union
  - Bandana → rebels
  - Corsair → pirates
  - Beanies → hipster artisans
  - Purphat → the fops
  - Golden Fleece (×1) → **the Prize**, the quest object everyone wants
- **Sight = worldview:**
  - designer brands → status-seekers
  - Digital → the techno-cult or ship's computer
  - 3D → dreamers and visionaries
  - Eye Patch → pirates
  - Glasses → scholars
  - Shades → the cool
- **Artifact = vice/need.** Woodpipe and Vape add a "smoke" need; Dragon's Breath vapes are a luxury good.
- **Relic Gold (unclaimed print)** → a starting endowment of wealth.
- **Palette = temperament.** We already have per-palette colour-emotion scores (Ou et al. 2004: heat, activity, weight) in `analysis_out/persona.json`; these map to HEXACO personality. For example:
  - activity → Extraversion
  - heat → low Neuroticism or high Agreeableness
  - weight → Conscientiousness
- **Token persona** (The Reaper, The Priest, The Rebel, …; 21 rules in `report/persona.py`) → starting vocation and narrative archetype.

Personality = a deterministic hash of tokenId plus those trait offsets. It is canonical and reproducible, with a neutral-heavy distribution, as in Dwarf Fortress.

### Houses (*oikoi*, from the holders)
- 2,342 holder wallets become **houses**:
  - 1,269 hold a single Argonaut;
  - 1,073 are multi-character houses;
  - the largest holds 950.
- **932 houses span several bones tiers.** They hold 8,352 characters (84% of living tokens), so most Argonauts already sit in a cross-faction house. This is the main force that cuts across factions: house loyalty versus blood loyalty.
- Bones co-holding (e.g. 553 houses hold both Bone and Prehistoric) seeds affinity between factions.
- Past trades seed relationships and debts. For example, trade volume by bones is 11.4k Bone sales versus 204 Gold sales.

## 3. The world map: the Argo and its isles

Districts are named from the voyage. LORE.md holds the full list.
- Pagasae docks and the Agora.
- Field of Ares (Spartoi).
- Bear Mountain (Gegeneis).
- Anthemoessa (Anthemoessans).
- The Reef (Gorgonides).
- Burning Lake of Eridanus (Phaethontes).
- Drepane (Ouranidai).
- Mist-terraces (Chryseoi).
- Deucalion's Strand (Laoi Lithinoi).
- **Grove of Ares**, where the single Golden Fleece hangs and the serpent sleeps.
- The Symplegades strait.
- The Chalybes forges.
- The **Pyra** (bonfire).
- The **Asphodel Meadow** (graveyard).

Factions cluster through a Schelling-style relocation rule, so quarters emerge rather than being drawn.

**Bonfire and Graveyard (user decision, 2026-10-06).** Both follow the real burn lifecycle in the DeadClock contract:
- **Bonfire, the Pyra:** tokens burned 0–5 days ago, while their art shows fire. #8985's "Burn8985" oil barrel (deployed but not wired) sits beside it as an omen.
- **Graveyard, the Asphodel Meadow:**
  - cold (5–10 d) and fading (10–30 d) Argonauts;
  - once the art is plain ground at 30 d, a permanent headstone, with an oar planted on the mound as Elpenor asks. Its epitaph comes from the character's Legends page.
- **Today:** all 22 burns are 29–30 days old, so the first 14 headstones settle tonight and the last, #2713, around 10 Oct.
- **Rules for the dead:**
  - Ghosts keep a voice in the chronicle; they can haunt or bless their faction.
  - Reapers run the funerals.
  - Each funeral costs an **obol**, Charon's fee. This is a natural money sink.
- **Simulation-only deaths** (duels, plague, Harpy famine) never touch the token. The character becomes a *Shade*, retired from the living simulation and given an empty tomb in the **Kenotaphion** row.
  - If its rites are skipped, it wanders, as Patroclus did, and that seeds horror events.
  - Only on-chain burns reach the Pyra.
  - Funeral pipeline: prothesis → ekphora → pyra → choai, with the **Aethalides** (archivist of the dead) keeping the rolls.

## 4. Each Argonaut's life (the agent model)

- **Needs:** subsistence, shelter, smoke (if it has a vice), belonging, status, meaning.
  - Following Anno, survival needs drive growth and status needs drive happiness and politics.
  - Higher needs only matter once subsistence is met.
- **Thoughts** (RimWorld format): value, duration, stack limit, stack multiplier.
  - Mood follows its target with lag.
  - Breaks happen at thresholds: sulking, binges, desertion, violence.
- **Memory** (DF + Smallville):
  - a short-term ring;
  - ~5 long-term core memories that re-fire their emotion (betrayal, being sold to a new oikos, a friend burned).
- **Traits (CK3):** personality gives utility weights *and* a stress cost for acting against them. Stress thresholds mutate traits ("the Broken", "the Zealot").
- **Values:** a Moral Foundations vector (Care, Fairness, Loyalty, Authority, Sanctity, Liberty), inherited from the faction, with personal deviation.
  - Opinion has two layers, **private** and **public** (Kuran).
  - Ideology crystallises from repeated acts (Disco Elysium).
- **Radical/loyal ledger (Vic3):** written on material step-changes; it only resets on death or a change of status.
- **Decisions:**
  - Utility AI over *advertisements* (The Sims), carried by places, jobs and other agents, chosen by softmax.
  - Daily plans are made in a batch, and only deviations are simulated (Shadows of Doubt).
  - Each interaction declares how often it is evaluated (CK3).
- **Relationships:**
  - opinion modifiers that decay;
  - Beta-reputation trust;
  - friend / rival / lover / mentor (Wildermyth);
  - a gossip network that rewires with homophily.

## 5. Economy

- **Currency: the obol**, originally an iron spit. A funeral costs one obol for Charon. Integer amounts; minted only by the treasury and by named faucets.
- **Goods and resources:**
  - fish/grain (subsistence);
  - timber and ore;
  - cloth (cloaks);
  - glass (sights);
  - smoke (tobacco and vape oil);
  - relics.
  - Resources regrow on isle tiles (Sugarscape); vision and metabolism come from traits.
- **Trade:**
  - bilateral trades at p = √(MRS_A·MRS_B);
  - a double auction in the Agora with zero-intelligence traders whose markup depends on personality;
  - prices clamped in a 25–175% band, but with a **conservative** clearing rule (no money creation, unlike Victoria 3).
- **Sinks:**
  - upkeep and decay on held stock (the UO lesson);
  - taxes;
  - tithes;
  - funeral obols;
  - festivals;
  - war costs;
  - bribes.
- **Inequality dial:** yard-sale exchange with redistribution χ set by politics. Show the Gini coefficient and Lorenz curve live.
- **Real market as climate:** the real Argonauts floor and volume (from `sales`) drive harvest yields and merchant sentiment (the Anasazi pattern).

## 6. Politics

- **The Boule:** a fixed number of seats. Making seats scarce creates Turchin-style elite competition.
- **Clout:**
  - share of political strength = f(wealth, enfranchisement law), as in Victoria 3;
  - thresholds with hysteresis: Powerful at 20%, dropping out below 18%;
  - Banzhaf power shown next to seat share.
- **Laws:**
  - Laws are ADICO tuples, e.g. "[Reef members] [must] [tithe 10% of catch] [each season] [or be fined 2×]".
  - Proposals are voted on; the voting rule is itself a law (plurality ⇒ two blocs; approval ⇒ many factions).
- **Seasonal budget:** Baron-Ferejohn bargaining among faction leaders. Factions left out of the split gain grievance.
- **Deals:** negotiations become **tracked promises with deadlines** (Frostpunk 2). Broken promises raise grievance.
- **Unrest:**
  - Epstein grievance G = hardship × (1 − legitimacy);
  - riots cascade by Granovetter thresholds;
  - guards are the Reapers' or the Court's men.
- **New factions:**
  - Factions split or form through Zeitgeist drift (Frostpunk 2).
  - Frustrated elite aspirants (Turchin) can split off: "the Silver Reformers", "the Bandana Front".
  - Schisms follow the Nouns-fork pattern; the notional treasury is split.
- **Regime type is endogenous.** Each season the ruling coalition chooses to repress, concede or extend the vote (Acemoglu-Robinson).

## 7. Gods, omens and the real world (on-chain inputs)

| On-chain event | In the simulation |
|---|---|
| Sale or transfer | The Argonaut leaves one oikos for another (adoption or sale into service). The old oikos's chapter of its life freezes; bonds and grudges carry over; age continues |
| Swap-contract trade | An exchange of hostages under *xenia* (guest-law) |
| Animation or program change | "The stars move": the sky signs shift; augurs (the Mopsus) read them |
| Burn | Death: bonfire → graveyard; funeral; inheritance; faction mourning or rejoicing |
| Renderer `setTraits` (#8393, #7920) | **A ruling of the Maker** (ACK, the god of this world): a character is remade, with an omen and a pilgrimage |
| `setRenderer` / art changes (8 so far) | **The Argo speaks**: the Dodona beam's voice is heard by everyone; an age turns |
| Visor phrases (41) | Slogans and prophecies: "MAX PAIN", "HERACLES, SON OF HELIOS". The Digital-visor cult reads them |
| Burn8985 contract | A prophecy of fire hanging over #8985 |
| Swap-contract trades with the artist | Audiences with the god |
| Golden Fleece (1 token) | The Quest: factions compete for its favour |

## 8. Director and chronicle

- **Storyteller (RimWorld):**
  - a points budget scaled by what's at stake;
  - an adaptation term that grows in calm and resets after loss;
  - it injects storms, plagues, pirate raids, scandals and droughts.
- **Event log:** typed events (actor, target, place, artifact, cause), as in DF Legends. Every Argonaut gets a Legends page that is a query over the log.
- **Story sifting** (Ryan): pattern queries find the arcs (betrayal, rise and fall, feud, defection, reversal of fortune).
- **Cognomens** (Qud), e.g. "#4211 the Twice-Exiled".
- **The chronicle, sung by the Orpheus:**
  - a daily digest;
  - rival **faction editions** of the same events (gospel vs tomb);
  - an economic report (EVE).

## 9. Words with $0 (no LLM at runtime)

1. **Procedural grammars**, Tracery- or Qud-style. A large corpus is written once (in a Claude Code session; no API cost).
   - Every event type, in three voices: myth, horror and realism.
   - Rival faction editions of each event.
   - Epithets, epitaphs and prophecies.
2. **Public-domain texts:** Seaton's Argonautica (1912), Hesiod, Frazer's Apollodorus and Ovid.
   - Mined for names and phrases.
   - A small Markov oracle generates half-coherent prophecies.
3. **Optional, the speaking beam:** on the claude.ai artifact, an "ask the beam" button uses the viewer's own Claude account through the `sample` capability.
   - It never changes the world, so determinism holds.

## 10. Architecture

- **One TypeScript codebase:**
  - runs headless in Node (batch runs, calibration, CI) and in a browser Web Worker (live view);
  - struct-of-arrays over typed arrays;
  - sfc32 PRNG with one stream per system;
  - iteration in tokenId order;
  - integer money.
- **Cadence:**
  - 1 tick = 1 day for needs, actions and trade;
  - economy settles weekly;
  - politics runs per season (~30 days);
  - the director runs daily.
- **Inputs:** an input queue (the AI Town pattern) fed only by the chain sync (omens).
  - Snapshots every season; state hash at the end of each era.
- **Data flow:**
  - `game/compile_seed.py` reads `data/argonauts.db` and writes `game/seed/agents.json` (a frozen, versioned seed).
  - The engine writes the event log and snapshots.
  - `persist` stores everything.
- **Viewer** (later an artifact):
  - map with faction borders over time;
  - Legends pages that reuse the real on-chain SVGs;
  - the chronicle;
  - dashboards: Gini, Ψ, Banzhaf power, segregation index, Zeitgeist.

## 11. Calibration targets and checks

- Starting faction sizes equal the real Bones counts.
- Defection: a few percent per era.
- Wealth: a Pareto tail; compare with real holder concentration (the largest house holds 950).
- Unrest: punctuated (long calm, rare bursts), not a periodic script.
- **Ablations:** switch a mechanism off and check its phenomenon disappears.
- **Ensembles:** 30+ seeds per release.
- **Invariants every tick:** money conserved except named faucets and sinks; no NaN; agent counts reconcile with the chain.

## 12. Roadmap

| Milestone | Deliverable |
|---|---|
| M0 Seed | `compile_seed.py` → agents.json (traits, personality, house, faction, culture vector, relationships from trade history) |
| M1 Core | Needs, thoughts, utility AI, economy and sinks, invariants; headless 1-year run in seconds |
| M2 Society | Network, opinions with repulsion, private/public views, defection cascades, Schelling quarters |
| M3 Politics | Council, clout, ADICO laws, budget bargaining, promises, Epstein unrest, splinter factions |
| M4 Story | Director, typed log, sifting, cognomens, chronicle with faction editions, Legends pages |
| M5 Viewer | Browser artifact: map with bonfire and graveyard, timelapse, character pages using the real art |
| M6 Words | Grammar corpus (myth/horror/realism), Markov oracle, optional speaking beam |
| M7 Live | Daily chain sync feeding inputs (sales, burns, rulings); a new chronicle every day |

## 13. Settled and open

**Settled:**
- Autonomous.
- Live.
- Mythic + horror + realism.
- $0 to run.
- Names from myth.

**Open:**
1. Hosting:
   - GitHub Pages + Actions, which is fully autonomous and runs hourly; or
   - the claude.ai artifact + a daily routine.
2. Time scale: 1 real hour = 1 sim day is the proposal.
