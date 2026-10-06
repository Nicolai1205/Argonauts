# Culture and history over time: research for the next systems

Compiled 2026-10-06.
- **[V]** = checked against a primary source or the actual code.
- **[U]** = from memory or secondary sources; confirm before quoting.

## Cultural evolution (cheap at 10k agents)

| Model | Mechanism | In the Argo |
|---|---|---|
| Boyd & Richerson dual inheritance [U] | Conformist bias Δp = D·p(1−p)(2p−1), D≈0.1–0.3. Also payoff and prestige biases | Customs vector per agent. Each day ~5% sample 3 contacts: conform with probability 0.3, otherwise copy the most prestigious (office or wealth) |
| Henrich's population-size effect [V, paper: [gwern pdf](https://gwern.net/doc/sociology/2004-henrich.pdf)] | Skill changes by Δz = −α + β(γ + ln N); it grows only if N > e^(α/β−γ) | City crafts (ships, bronze, medicine, poetry). A plague or exodus can make a city *forget* a craft: lost golden ages |
| Bentley neutral drift [V, [pubmed](https://pubmed.ncbi.nlm.nih.gov/15306315/)] | Copy a random member or invent with μ≈0.01; gives power-law popularity | Fashions, motifs, slang; a per-city top-10 with turnover |
| Axelrod culture [U] | F features × q traits; interact with probability = similarity | Customs: burial rite, greeting, calendar, cuisine |
| Abrams–Strogatz language death [V, [Nature 2003](https://dmabrams.esam.northwestern.edu/pubs/Abrams%20and%20Strogatz%20-%20Modelling%20the%20dynamics%20of%20language%20death%20-%20Nature%202003.pdf)]; O'Leary naming languages ([code](https://github.com/mewo2/naming-language)) | dx/dt = (1−x)x^a s − x(1−x)^a(1−s), a≈1.31 | Per-city sound changes each season. Names drift over time ("Kerin" becomes "Cheren"), so deep time becomes visible |
| Young conventions [U] | Adaptive play with memory m; conventions tip from one to another | Market day, units, festival dates; calendar reforms |
| Sosis costly ritual [V, [CCR 2003](https://journals.sagepub.com/doi/abs/10.1177/1069397103037002003)] | Costly *sacred* requirements predicted commune survival; secular ones did not | Cult `ritualCost` buys cohesion, but only with a deity |
| Stark network conversion [U]; MODRN ([JASSS](https://www.jasss.org/21/1/4.html)) [V] | Conversion spreads through ties; insecurity raises religiosity | Prophets appear after catastrophes (burns, riots, plague); faiths spread on ties and split by doctrine distance. Note: the Nature 2019 "moralizing gods" paper was **retracted** ([link](https://retractionwatch.com/2021/07/07/critique-topples-nature-paper-on-belief-in-gods/)) |
| Collective memory (Candia et al. 2019) [U, constants are design choices] | Memory decays fast, then slow: s·(a·e^(−t/τ1) + (1−a)·e^(−t/τ2)) | Anniversaries become festivals; monuments fix memory and can be destroyed or rededicated |

## Long-run history
- **Turchin's Political Stress Index** [U]. PSI = MMP × EMP × SFD:
  - MMP, mass mobilisation potential, from needs and wages;
  - EMP, elite mobilisation potential, from aspirants per office;
  - SFD, state fiscal distress, from the budget.
  Drive riot odds from PSI and log it.
- **Asabiya and metaethnic frontiers** [V equations]:
  - On a frontier, S' = S + r0·S(1−S); in the core, S' = S − δS.
  - Power P = A·S̄·e^(−d/h).
  - This drives **wars and leagues between cities**.
- **Turchin et al. 2013, PNAS** [V, [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3799307/)]. Ultrasocial traits plus diffusion of military technology reproduce where large states arose (R² 0.65). Terrain favours defenders.
- **Seshat** [V, [PNAS 2018](https://discovery-pp.ucl.ac.uk/10041342/1/PNAS-2018-Turchin-E144-51.pdf)]. One principal component holds ~¾ of the variation in social complexity. Use it as a **Complexity Index** per city, the headline history chart.
  - Turchin et al. 2022: agriculture and military technology, not moralising gods, drive scale.
- **Greek polis evidence:**
  - Ober, *Rise and Fall of Classical Greece*: cities copy the laws of richer partners.
  - Horden & Purcell, *The Corrupting Sea*: harvest shocks buffered by trade.
  - Gravity trade model: V_ij ∝ S_i·S_j·e^(−d/D) [U].
- **MERCURY** (Brughmans & Poblome, [CoMSES](https://www.comses.net/codebases/4347/releases/1.1.0/)): traceable provenance of goods.

## Map generation (used for the v2 map)
- **Azgaar's Fantasy Map Generator** ([source read](https://github.com/Azgaar/Fantasy-Map-Generator)) [V]:
  - biome = moisture band × temperature band;
  - habitability and movement-cost tables;
  - capitals placed by score with minimum spacing;
  - states grow by Dijkstra flood;
  - roads by A* with a 0.5× discount on existing roads, so trunks merge.
- **O'Leary** ([terrain.js](https://github.com/mewo2/terrain)) [V]: sink filling, flux, erosion rate min(200, 1000·√flux·slope + slope²), and a city score.
- **Red Blob Games:** [terrain from noise](https://www.redblobgames.com/maps/terrain-from-noise/).
- **Next upgrades:** rivers from flux, rain shadows (westerly wind), and roads that merge into trunks.

## Legibility
- **Story sifting:** James Ryan ([thesis](https://escholarship.org/content/qt4vj649w6/qt4vj649w6.pdf)) and Kreminski's Felt and Winnow ([paper](https://mkremins.github.io/publications/AuthoringSifters_TAP.pdf)).
  - Patterns over the event log: revenge, rise and fall, return from death, forgotten craft.
  - Score each match by salience × rarity; the top 3 per day become the front page.
- **Myths that rewrite events:** Caves of Qud (Grinblat & Bucklew, FDG 2017). Each faction keeps its own retelling; show the "official account" next to the fact.
- **Rumours:** Daley–Kendall spreading with mutation per hop. Agents act on what they *believe*.

## Top-10 additions (story value × feasibility)
1. Story sifter + front page.
2. Rivers, rain shadows and trunk roads on the map.
3. Emergent religions: prophets after catastrophes, spread on ties, schisms, ritual cost.
4. City-state wars and leagues: asabiya + Turchin power + terrain defence.
5. Collective memory, festivals and monuments.
6. Dialect drift of names.
7. Generations, as heir titles or a non-NFT commoner class, so secular cycles can run.
8. Rumours and per-faction myths.
9. Henrich crafts + Complexity Index chart.
10. Flow-field crowds (cosmetic).
