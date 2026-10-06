# Simulating a society: research for the Argonauts game

What the best games, models and papers say about simulating behaviour, economy and politics, and what each lesson means for us.
Compiled 2026-10-06 from three research passes:
1. strategy and colony-sim games;
2. agent-based modelling and social science;
3. NFT, on-chain and AI-agent worlds.

**Source tags:**
- **[DEV]** the developer or author documented it.
- **[WIKI]** a community wiki, usually datamined. Reliable for numbers, but not official.
- **[PRESS]** a journalist's paraphrase.
- **[unverified]** from memory or a weak summary. Check it before quoting it publicly.

The Paradox forums blocked scraping, so some Paradox dev diaries are cited through Steam mirrors or the wiki.

---

## 0. The verdict in ten lines

1. **No shipped game simulates 10k individual minds with an LLM.**
   - Smallville: 25 agents for two game-days cost "thousands of dollars". [PRESS]
   - Project Sid: past 1,000 agents the server choked.
   - AgentSociety reaches 10k agents only on a cluster.
   - So the core must be **rules-based, deterministic and cheap**, with LLMs only at the edges: narration, a few notable characters, and one call per archetype.
2. **The simulation is raw footage; curation is the product.** James Ryan's "story sifting", the Showrunner model, Dwarf Fortress Legends mode and Caves of Qud's histories all agree. Nobody watches 10k lives; they read the paper.
3. **Personality has to cost something.**
   - CK3: traits weight what a character wants, *and* add stress when it acts against them. That gap is the story engine.
   - Dwarf Fortress: long-term memories re-fire their emotions, so trauma lasts.
4. **Politics comes from material conditions.**
   - Victoria 3: political strength comes from wealth and laws.
   - Radicals and loyalists are sticky per-person memories that only reset on death or a change of status.
   - Movements count raw heads.
5. **Factions should form from drift, not a script.**
   - Frostpunk 2 spawns factions when the city's "Zeitgeist" moves far enough toward an ideology.
   - Stellaris drifts ethics through "attraction".
   - Turchin's elite overproduction gives a principled trigger for splinter factions.
6. **Without a director, simulations settle into boredom or blow up.**
   - RimWorld's storyteller spends a points budget based on what the colony has to lose; its adaptation term grows during calm and resets after a loss.
   - Epstein's rebellion model gives punctuated equilibrium for free.
7. **Closed economies leak or starve.**
   - Ultima Online's wool bank ran dry from hoarding.
   - Axie's token supply inflated 4× faster than it was burned, and the token fell over 99%.
   - Victoria 3's price formula creates and destroys value.
   - So: design the sinks first, decay held stock, use integer money, and check stock-flow consistency every tick.
8. **Depth players can't see reads as noise** (a DF Steam thread calls personality "placebo"). Every number needs a readable cause, like Democracy's traceable causes or Zomboid's moodles.
9. **Holders are patrons, not players.**
   - Influence should be rate-limited nudges, not overrides (Twitch Plays Pokémon, Reigns).
   - A transfer closes one owner's chapter of the character's life, as in the Forgotten Runes Book of Lore.
   - Never make holders burn or migrate (Wolf Game 2.0).
   - Never put claimable real value in sim treasuries (the Nouns fork arbitrage).
10. **Ship the rules, seed and event log.** Dark Forest's "digital physics" and DF's XML export spawned community tools. Fully on-chain simulation is a money pit: Lattice wound down in 2026 and Redstone closed. Keep identity and inputs on-chain, run the simulation off-chain, and let anyone replay it.

---

## 1. Games: how they actually work

### Victoria 3: aggregated pops, a market and interest groups
- **Pops are buckets, not people.** There is one pop per profession × culture × religion × workplace in each state, with tens of thousands in play. [WIKI](https://vic3.paradoxwikis.com/Pops)
  - Individuals inside a pop can support different interest groups (IGs). [DEV DD#6](https://steamcommunity.com/games/529340/announcements/detail/2981928042001763297)
- **Standard of living (SoL).** Each wealth level buys a needs package.
  - Wealth rises when income is above 102% of the next level's package cost and falls when it is below 98% of current spending. That **deadband** stops wealth flapping back and forth.
  - Expected SoL is 5, 10 and 15 for the lower, middle and upper strata.
  - A pop living below its expected SoL radicalises by 0.2% per level of shortfall per month. [WIKI](https://vic3.paradoxwikis.com/Standard_of_living)
- **Price** = base × [1 + 0.75 · clamp((BUY−SELL)/min(BUY,SELL), ±1)], so prices stay between 25% and 175% of base.
  - The formula is **not conservative**: it creates or destroys value. [WIKI](https://vic3.paradoxwikis.com/Market)
- **Clout** is an IG's share of total political strength. A wealthy aristocrat in an oligarchy can carry ~1000× the strength of a labourer.
  - IGs become Powerful at 20% and drop out at 18% (hysteresis).
  - Movements count raw headcount, and loyalists never join them. [DEV DD#14](https://steamcommunity.com/games/529340/announcements/detail/2965046519078918004), [DD#41](https://www.paradoxinteractive.com/games/victoria-3/news/dev-diary-41-revolutions)
  - Falling SoL makes more radicals than rising SoL makes loyalists. [DEV DD#65](https://www.paradoxinteractive.com/games/victoria-3/news/victoria-3-dev-diary-65-patch-1-1-pt1)
- **Tick model.**
  - Each system runs on its own cadence: yearly, monthly, weekly, daily or per tick.
  - A parallel step is followed by a sort, so results stay deterministic.
  - Cost scales with the *number of objects*, not population. [DEV DD#76](https://www.paradoxinteractive.com/games/victoria-3/news/dev-diary-76-performance)
- **Lessons.**
  - "Players don't want to micromanage factories", so investment became autonomous. [DEV DD#71](https://www.paradoxinteractive.com/games/victoria-3/news/dev-diary-71-autonomous-investment-in-1-2)
- **Steal:**
  - sticky radical/loyal ledgers;
  - deadbands;
  - movements counted by heads;
  - per-system cadences.

### Frostpunk 1 and 2: scarcity forces moral trade-offs
- **FP1:** two meters, Hope and Discontent, plus an irreversible Book of Laws.
  - The endgame Purpose laws delete the Hope meter, which drains the tension. [analysis](https://gamedesignthinking.com/frostpunk-players-decisions/)
- **FP2 factions and communities.**
  - Communities hold one ideology and can be persuaded.
  - Factions hold three ideologies and never vote against them.
  - The axes are Adaptation/Progress, Equality/Merit and Tradition/Reason.
  - A faction is spawned by drift in the city's Zeitgeist.
  - Trust is the population-weighted sum of group relations. [WIKI](https://frostpunk-2.game-vault.net/wiki/Communities_and_Factions)
- **FP2 council and tension.**
  - Council votes need 51 or more of 100 delegates; delegates who are Hesitant are the swing votes.
  - **Negotiated deals become time-limited promises.** Breaking one costs relations. [PRESS](https://www.pcgamesn.com/frostpunk-2/council)
  - Tension comes from cold, hunger and crime, and the UI darkens as it rises.
- **Failure mode.** Becoming "Captain" bypasses politics entirely. [PRESS](https://game8.co/games/Frostpunk-2/archives/474296)
- **Steal:**
  - promises as debts with deadlines;
  - persuadable communities versus three-axis factions that won't bend;
  - Zeitgeist-spawned factions;
  - no dominant bypass route.

### Crusader Kings 3: characters as stacks of modifiers
- **Traits.** About 30 traits in opposing pairs; a character usually has up to 3.
  - A shared trait gives +10 to +20 opinion; an opposite trait gives −10 to −15.
  - Each trait adds to 9 AI values (boldness, greed, energy, sociability, rationality, honor, zeal, …). [WIKI](https://ck3.paradoxwikis.com/Traits)
- **Interactions** are scripted as `ai_potential` → `ai_will_do` (a probability) → `ai_frequency` (the performance knob).
- **Opinion** is a sum of modifiers, most of which decay to 0. [WIKI](https://ck3.paradoxwikis.com/Opinion)
- **Stress** comes from acting against one's own traits.
  - At 100, 200 and 300 the character has a mental break, which can add new traits such as Lunatic.
  - At 400 a break is forced. [WIKI](https://ck3.paradoxwikis.com/Stress)
- **Dread** drifts toward a trait-set "natural" level. A Terrified character accepts deals it would normally refuse.
- **Schemes** have a monthly breach chance; 5 breaches mean failure. Agents join based on their opinion of the schemer and their personality. [WIKI](https://ck3.paradoxwikis.com/Schemes)
- **Failure mode.** Late-game lag grows with the number of characters.
- **Steal:**
  - each trait gives both an AI weight and a stress cost when violated;
  - opinions decay;
  - each action declares how often it is evaluated.

### Dwarf Fortress: deep psychology plus generated history
- **Facets.** About 50 personality facets on 0–100, with 78% of values in the neutral 40–60 band.
  - Facets also drive *macro* events. For example, ambitious, confident leaders declare more wars during world generation. [WIKI](http://www.dwarffortresswiki.org/index.php/Personality_facet)
- **Values.** 31 values on −50..50, inherited from the civilisation with personal deviations. [WIKI](https://dwarffortresswiki.org/index.php/Personality_value)
- **Needs** are derived from facets and values, with weights 1, 2, 5 and 10.
- **Memory and stress.**
  - Short-term memory slots get overwritten; long-term memories **re-fire their emotion** when recalled.
  - A breakdown needs both short- and long-term stress to be high.
  - Long-term stress moves by at most about 20k a year, so recovery takes years. [WIKI](https://dwarffortresswiki.org/index.php/Stress)
- **History.** World generation is "a giant zero-player strategy game… history is just a record of that" (Tarn Adams). [WIKI](https://dwarffortresswiki.org/index.php/World_generation)
- **Regrets.**
  - The polymorphic item system "was ultimately a mistake"; he would use components instead.
  - "at the edge of what we can support in agents". [DEV](https://stackoverflow.blog/2021/07/28/700000-lines-of-code-20-years-and-one-developer-how-dwarf-fortress-is-built/)
- **Steal:**
  - long-term memories that re-fire;
  - neutral-heavy facet distributions;
  - history as a typed log you can browse in a "Legends" view.

### RimWorld: a story generator with a drama director
- **Thoughts** are records of {mood value, duration, stack limit, stack multiplier}.
  - The mood bar lags its target: +12/h going up, −8/h going down.
  - Breaks happen at 35%, 20% and 5% mood. [WIKI](https://rimworldwiki.com/wiki/Mood), [WIKI](https://rimworldwiki.com/wiki/Mental_break)
- **Storyteller** raid points = (wealth + colonists) × difficulty × adaptation.
  - Adaptation grows while the colony is unharmed and resets after deaths.
  - Randy adds a ×0.5–1.5 jitter. [WIKI](https://rimworldwiki.com/wiki/Combat_power)
- **Design philosophy (Tynan Sylvester).** "A story generator, not a game."
  - Apophenia: keep systems simple and let players read meaning into them.
  - Cut needs that don't produce stories. [DEV GDC 2017](https://gdcvault.com/play/1024232/-RimWorld-Contrarian-Ridiculous-and)
- **Failure mode.** Players game the wealth-based budget by keeping wealth low.
- **Steal:**
  - the thought record format;
  - a separate director that injects shocks scaled by what the world has to lose.

### Shorter entries
| Game | Mechanism | Steal |
|---|---|---|
| Stellaris | Ethics *attraction*: pops drift toward attractive ethics; factions have an approval score | Ideology drifts rather than flips |
| Tropico 6 | 4 pairs of opposing factions; every citizen can be bribed, jailed or killed | Paired opposites, so every policy angers someone |
| Democracy 4 [DEV](https://positech.co.uk/cliffsblog/2020/06/23/democracy-4-the-fixed-income-rewrite) | "Everything is a neuron": clamped weighted sums. Regret: percentage-only effects made a bus pass worth $15k to a banker | Typed effects (absolute vs relative); traceable causes |
| The Sims | Objects *advertise* how well they satisfy each need; utility AI scores the adverts | Put adverts on places, jobs and characters, so new content needs no change to agent logic |
| Black & White | BDI creature; desires learned from the player's rewards and punishments | Community "training" of a character |
| EVE Online | An in-house economist publishing reports; destruction as the main sink | Publish an economic report; design sinks first |
| Ultima Online [DEV Koster](https://www.raphkoster.com/?p=46439) | Ecology on a central resource bank. It died from hoarding ("ran out of wool"), and its AI was too expensive | Decay on held stock |
| Caves of Qud [DEV GDC](https://gdcvault.com/play/1024990/Procedurally-Generating-History-in-Caves) | Generate events first, then rationalise them with grammars; every event told twice (a neutral gospel and a flattering tomb inscription) | Biased chronicles from rival factions; cognomens |
| Shadows of Doubt [DEV](https://colepowered.com/?p=34142) | Each citizen's day pre-planned in a batch; only deviations re-simulated; sightings and memory decay; lying to avoid incrimination | Batch-plan, simulate the exceptions |
| Ostranauts | Every entity is a bag of conditions; interactions and standing pledges | One generic, data-driven schema |
| Wildermyth | Hand-written event templates with role slots, cast from heroes who fit | Templates cast from matching Argonauts |
| Kenshi | Faction relations on −100..100; one-way world-state switches when a leader dies | Irreversible flips |
| Songs of Syx | Happiness drives immigration and emigration | Migration as a release valve |
| Anno 1800 | Basic needs drive growth; luxury needs drive happiness | Split survival goods from status goods |
| Banished | Demographic death spiral | Watch age cohorts |
| Prison Architect / Zomboid | Hidden reputations revealed over time; readable "moodles" | Legible state |
| Alpha Centauri | Factions *are* ideologies; Social Engineering | Fixed faction agendas and aversions |
| Suzerain / Disco Elysium [DEV](https://discoelysium.com/devblog/2019/11/13/the-political-alignment-system) | Hidden ideology counters; 4 statements trigger an "initiation" into an ideology | Ideology crystallises from small acts |
| WorldBox | Kingdoms form, war, rebel and split; the god intervenes | The time-lapse border map is the money shot |

**James Ryan, *Curating Simulated Storyworlds*.** "Overgenerate and curate". Story-sifting queries pull arcs out of the event log; raw simulation output is mostly trivia. [summary](https://emshort.blog/2019/05/28/curating-simulated-storyworlds-james-ryan-ch-6f/)

---

## 2. Science: agent-based modelling of societies

### Tooling
| Tool | Note | Our use |
|---|---|---|
| AnyLogic | Hybrid: agent-based models with statecharts, system dynamics, and discrete events. Commercial; web only via its cloud | Borrow the ideas: life-cycle statecharts and stock-flow macro accounts |
| NetLogo | Teaching standard; its library includes Rebellion, Sugarscape, Schelling, El Farol and Voting | Reference implementations to check our versions against |
| Mesa 3 [JOSS](https://www.theoj.org/joss-papers/joss.07668/10.21105.joss.07668.pdf) | Python AgentSet, batch_run | Optional offline parameter sweeps |
| Agents.jl, Repast, MASON, GAMA | Fast or heavy; not for the web | — |
| AgentTorch [arXiv 2409.10568](https://arxiv.org/abs/2409.10568) | Tensor ABM, 8.4M agents; **"LLM archetypes"**: ~100 LLM calls stand in for millions of agents | The archetype layer |

**For our scale:** 10k agents × ~50 fields is about 500k numbers, which is trivial in typed arrays. A struct-of-arrays engine in TypeScript/JS (bitECS-style) runs in a Web Worker and in Node from **one codebase**. SharedArrayBuffer needs COOP/COEP headers that a hosted artifact page can't set, so use one worker and pass buffers to it.

### Classic models
| Model | Mechanism | Argonaut use |
|---|---|---|
| Schelling (1971) | Agents move when their neighbourhood falls below a same-type share τ; mild preferences produce strong segregation | Faction quarters emerge; show the dissimilarity index |
| Sugarscape (Epstein & Axtell 1996) | Vision, metabolism, regrowing resources; trade at price p = √(MRS_A·MRS_B); culture bit-tags; combat, credit, disease | **Economy template**; culture tags make crossing factions natural |
| Axelrod culture (1997) | Neighbours interact with probability equal to their similarity and copy one trait; local convergence, global diversity | A second identity axis (style) that cuts across bones |
| Iterated Prisoner's Dilemma (Axelrod 1984) | Tit-for-tat, generous tit-for-tat and Pavlov win; cooperation needs repeat play (continuation probability w > (T−R)/(T−P)) | Trade and favour strategies; in-group repeat play makes cohesion |
| Deffuant / Hegselmann-Krause | Agents move toward opinions within ε; roughly 1/(2ε) clusters form | Polarisation engine; leaders are low-ε zealots |
| Flache et al. 2017 [JASSS](https://www.jasss.org/20/4/2.html) | True bipolarisation needs **repulsion** from out-group opinions | Add out-group repulsion |
| Noisy voter / q-voter | Copy neighbours; noise keeps diversity | Baseline rate of random defection |
| El Farol / Santa Fe artificial stock market | Ecologies of forecasting rules never settle; a fast learning rate gives fat tails | Speculation, festival crowds |
| Anasazi (Axtell et al. 2002) | Validated against real history; the honest failure to explain total abandonment | Drive "climate" from a real on-chain signal |
| **Epstein civil violence (2002)** [PNAS](https://www.pnas.org/doi/10.1073/pnas.092080199) | Grievance G = H(1−L) for hardship H and legitimacy L; arrest probability P = 1−e^{−k·C/A} with k≈2.3; join if G − R·P > T (T≈0.1) | **Rebellion engine**; punctuated outbursts |
| **Turchin SDT** | Political stress Ψ = mass mobilisation × elite mobilisation × state fiscal distress; elite overproduction | Fixed number of elite seats; frustrated aspirants found splinter factions |
| Acemoglu-Robinson | Elites choose repress / concede / democratise against the threat of revolution; the "narrow corridor" | The ruling faction's seasonal choice; regime type emerges |
| **Ostrom ADICO** | A rule = Attribute, Deontic, aIm, Condition, Or-else | **Laws as data**: executable *and* readable by an LLM |
| Boids / Helbing social force | Separation, alignment, cohesion | Purely visual crowds: marches, riots, festivals |

### Cognition
- **Utility AI** (Dave Mark): score = Σ w_k(personality)·f_k(state), chosen by softmax with temperature β. This is the default for all 10k agents.
- **HTN / GOAP:** plans for rare macro actions (coup, founding a guild, migration).
- **BDI:** only for notable characters, and as the schema the LLM fills in.
- **HEXACO** (Big Five plus Honesty-Humility). Evidence-backed links:
  - Openness → liberal, less in-group bias.
  - Agreeableness → cooperation.
  - Honesty-Humility → doesn't exploit others.
  - Neuroticism → grievance.
  - Extraversion → more social ties.
- **Moral Foundations** (Care, Fairness, Loyalty, Authority, Sanctity, Liberty): the ideology vector. Loyalty and Authority set how strongly faction identity binds.
- **Schwartz values:** choice of vocation (power/achievement → merchant or politician).
- **OCC emotions:** a light appraisal step that produces anger, fear and gratitude, which decay. Anger feeds Epstein grievance.
- **Social identity theory** (Tajfel): even arbitrary groups produce in-group bias. This **justifies Bones as a faction seed**.
  - Defection when (status gap) × permeability × (1 − identity strength) exceeds a threshold.
- **Networks:** homophily, preferential attachment, triadic closure; rewire as opinions change (Holme-Newman).
- **Trust:** Beta reputation (α+1)/(α+β+2); public reputation spreads by gossip, which can be biased (propaganda).

### Economy
- **ACE** (Tesfatsion): no auctioneer; prices emerge from trades.
- **Zero-intelligence traders** (Gode & Sunder 1993): random but budget-constrained traders in a double auction reach ~97–99% efficiency. The market *institution* does the work.
- **Money emergence** (Kiyotaki-Wright): the most saleable good tips into being money.
- **Inequality:** kinetic exchange gives Boltzmann wealth; heterogeneous saving gives a Pareto tail. The **yard-sale model always condenses to oligarchy** unless redistribution χ beats the advantage of wealth ζ (Boghosian, [SciAm 2019](https://www.scientificamerican.com/article/is-inequality-inevitable/)). So χ (the tax rate) is a political variable.
- **Stock-flow consistency** (Godley-Lavoie): every flow has a source and a destination. Check the invariant every tick and use integer money.
- **EURACE:** credit creates endogenous crises (later).

### Politics
- **Voting rule as a constitutional parameter.** Plurality pushes toward two blocs (Duverger); approval voting or instant runoff lets many factions survive. Median voter in one dimension; McKelvey chaos in two or more.
- **Coalitions:** minimal connected winning coalitions; offices split in proportion to seats (Gamson); **Banzhaf power** as a dashboard stat.
- **Baron-Ferejohn bargaining:** the proposer keeps 1 − δ(n−1)/(2n). Use it for the treasury split; excluded factions gain grievance.
- **Granovetter thresholds:** cascades depend on the distribution of thresholds. Use for riot joining and defection.
- **Kuran preference falsification:** separate **private and public** opinion, so factions collapse "suddenly".

### Validation
- **Pattern-oriented modelling:** match several stylised facts at once:
  - a Pareto wealth tail;
  - fat-tailed returns;
  - starting faction sizes equal to the real Bones counts;
  - defection of a few percent per era;
  - punctuated rebellion.
- **Ablations:** switch a mechanism off and check that the phenomenon disappears.
- **Ensembles:** run 30–100 seeds and show fan charts.
- **Runaway feedback to watch for:** yard-sale oligarchy, hubs swallowing the network, wealth buying votes. Control them with taxes, mortality and inheritance splits, diminishing returns and caps.
- **Boring equilibrium:** add noise, population turnover, shocks, learning ecologies, repulsion and fixed elite seats.
- LLMs bias toward agreeable consensus, so keep conflict mechanics in the rules.

---

## 3. AI societies and on-chain worlds

| Project | Facts | Lesson |
|---|---|---|
| Generative Agents / Smallville [arXiv 2304.03442](https://arxiv.org/abs/2304.03442) | Memory stream; retrieval = recency (0.995/h) + importance + relevance; reflection when summed importance reaches 150; hierarchical plans. 25 agents, ~thousands of $ | Keep the data structures; compute them with rules |
| 1,000 People [arXiv 2411.10109](https://arxiv.org/abs/2411.10109) [unverified-live] | Agents built from interviews replicated survey answers ~85% as well as the people themselves did two weeks later | A rich biography beats a stereotype: build bios from on-chain history |
| Project Sid [arXiv 2411.00114](https://arxiv.org/abs/2411.00114) | PIANO modules plus a cognitive bottleneck; roles specialised; tax laws amended by vote; a seeded religion spread; gems became currency. Hallucinations cascade | Use its measures as a dashboard (role entropy, law changes, meme reach) |
| AgentSociety [arXiv 2502.08691](https://arxiv.org/abs/2502.08691) | 10k LLM agents, ~5M interactions, on Ray; studied UBI, polarisation, hurricanes | The closest analogue, and it needs a cluster, hence our hybrid |
| Humanoid Agents [arXiv 2310.05418](https://arxiv.org/abs/2310.05418) | Numeric needs, emotions and closeness feed LLM planning | Keep numbers cheaply; put them into words only when calling the LLM |
| OASIS [arXiv 2411.11581](https://arxiv.org/abs/2411.11581) | 1M agents on a social platform; recommender algorithm as a policy knob | Town-square feed: hot-score vs interest ranking drives polarisation |
| Concordia (DeepMind) [arXiv 2312.03664](https://arxiv.org/abs/2312.03664) | An LLM "Game Master" adjudicates agents' intents against the environment | **Our pattern:** the engine is physics; a GM turns notable characters' intents into engine inputs |
| a16z AI Town [repo](https://github.com/a16z-infra/ai-town) | Tick loop applies queued *inputs*; LLM calls run async and come back as inputs | **Input queue**: state = f(seed, ordered inputs) |
| Fable Showrunner | Sim footage edited into episodes | The editor is the product |
| Parallel Colony | NFTs with ERC-6551 wallets acting as AI agents; slow and rescoped | Notional wallets only; the 6551 address can serve as a stable ID |
| Virtuals / ElizaOS | Revenue fell from ~$500k/day to <$500/day in 3 months [PRESS](https://cointelegraph.com/news/ai-agents-virtual-revenue-plunge-token-price-decline); Eliza "character files" | No token per agent; use character sheets |
| Dark Forest [Naavik](https://naavik.co/deep-dives/dark-forest-beacon-of-light/) | ZK fog of war; plugins; "digital physics" | Publish the rules, seed and log |
| Lattice MUD / Redstone | Wound down April 2026 [PRESS](https://www.chaincatcher.com/en/article/2258693) | Don't run the simulation on-chain |
| Loot / Chain Runners | Sparse traits left for the community to interpret; on-chain SVG; CC0; an AI watching the city | Map traits through a public table; leave gaps for lore |
| Wolf Game | Predator/prey factions made great drama. The 2.0 relaunch required burns, was halted, and the CEO resigned [PRESS](https://decrypt.co/314859/wolf-game-halted-solana-relaunch-backlash) | Asymmetric factions yes; forced burns never |
| Axie | Token issued 4× faster than burned; fell 99.9% | Sinks, audited every tick |
| CryptoKitties | Uncapped breeding diluted everything | Offspring as non-token entities that can die; the original 10k are "Gen-0" |
| Aavegotchi | Kinship +1 per daily pet | Patron kinship from cheap repeated visits; it biases, doesn't power up |
| Nouns | Forks drained treasury value (472 Nouns left with ~5.1k ETH) [PRESS](https://decrypt.co/197400/nouns-fork-disgruntled-nft-holders-exit-27-million-from-treasury) | Use the *forms* (proposals, quorum, schism) with notional treasuries |
| Moonbirds | Nesting tenure resets on sale [unverified exact rule] | Patron tenure resets; the character's age never does |
| **Forgotten Runes Book of Lore** | Lore is editable while you hold the token and frozen after a transfer; the Cult can "strike" lore | **A transfer closes the patron's chapter** |
| Decentraland / Sandbox | "38 DAU" [PRESS] | A world needing human density dies; our 10k agents *are* the population |
| WorldBox | Kingdoms form, war, rebel and split; huge time-lapse YouTube genre | Border-map timelapse |
| Saltybet | Play-money bets on AI-vs-AI fights, running for years | Play-money prediction markets on sim outcomes |
| Twitch Plays Pokémon [arXiv 1408.4925](https://arxiv.org/pdf/1408.4925.pdf) | Switching to democracy needed 80% of votes, back to anarchy 50% | Holder votes: aggregated, rate-limited, with hysteresis |
| Ultima Ratio Regum | Procedural culture (heraldry, religions); in development since 2011 | Faction heraldry from palettes, but watch the scope |

**Delivery notes.**
- Use seeded PRNGs (sfc32 or xoshiro128**) with **one stream per system**.
- Use integer or fixed-point state (`Math.exp`/`pow` precision varies between browsers).
- Iterate in tokenId order.
- Event-source the simulation and hash the state at the end of each era.
- Emit EIP-4906 only if state is ever written back to metadata.
