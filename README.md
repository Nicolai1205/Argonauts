# The Argo

An autonomous, live world for the 9,999 [Argonauts](https://opensea.io/collection/argonauts), the on-chain skeletons of the Musefacktory.

Every Argonaut lives on its own. Each one works a trade, eats, buys and sells, talks, makes friends and enemies, votes, riots, changes allegiance, breaks under stress, dies and sometimes comes back. Nobody steers it.

- **Live:** one real hour is one day of the voyage. Day 0 was 2026-10-06 00:00 UTC.
- **Autonomous:** the only outside force is the chain.
- **Mythic, horror, realism:** names and events come from Apollonius' *Argonautica*, Hesiod and Ovid.
- **Free to run:** no servers and no AI model. A GitHub Action advances the world every hour, and GitHub Pages hosts it.

## How the chain drives the world

| On-chain | In the world |
|---|---|
| Sale or transfer | The Argonaut moves to a new house; the price arrives as gold from Colchis (obols) |
| Swap-contract trade | Exchange of hostages under *xenia* |
| Burn (transfer to `0x…dead`) | Death. The body lies on **the Pyra** for the five real days its art shows fire, then is buried in **the Asphodel Meadow** with an oar on the mound |
| Renderer `setTraits` | A ruling of the Maker: the character is remade |
| `setRenderer` / metadata refresh | The Argo's speaking beam (from Dodona's oak) says one of the visor phrases, and the whole city's beliefs shift |
| Any other deployer transaction | The Maker works the loom: new contracts become new stars |

## Factions

Bloods follow the **Bones** trait:

| Bones | Faction | Meaning |
|---|---|---|
| Bone | **Spartoi** | the Sown, men grown from dragon's teeth. Split into the five houses of Thebes: Echion, Udaeus, Chthonius, Hyperenor, Pelorus |
| Prehistoric | **Gegeneis** | the Earth-born |
| Silver | **Argyreoi** | Hesiod's Silver Race |
| Coral | **Gorgonides** | the Gorgon-born |
| Floral | **Anthemoessans** | of the Sirens' flowery isle |
| Petrified | **Laoi Lithinoi** | the Stone People |
| Gold | **Chryseoi** | the Golden Race |
| Radioactive | **Phaethontes** | the Blazing Ones |
| Alien | **Ouranidai** | the Sky-blooded |

Splinter factions break away when a blood loses faith in the Boule and its rich have too few seats (Turchin's elite overproduction). See `docs/LORE.md` for the sources.

**Taking this over?** Start with [`docs/HANDOVER.md`](docs/HANDOVER.md), then [`docs/ROADMAP.md`](docs/ROADMAP.md).

## How it works

- `sim/` is a deterministic engine (plain ES modules) that runs the same in Node and the browser.
  - **Daily systems:** production, needs, a market with tax and a grain dole, social ties and opinion dynamics, mood and stress, Epstein-style unrest, weekly migration and defection, seasonal politics (D'Hondt seats, coalition, Ostrom-grammar laws, Baron-Ferejohn budget, offices, ostracism, schisms), a RimWorld-style director, and funerals with Charon's obol.
  - **Money:** conserved and checked every day.
- `tools/sync.mjs` reads new chain events keyless: RPC logs plus the Blockscout API for the deployer's transactions.
- `tools/advance.mjs` advances from the last checkpoint and writes the narrated chronicle.
- `web/` holds the viewer. It loads the checkpoint and catches up to the current hour in your browser with the same engine.
- `data/seed.json` and `data/history.json` are compiled from the Argonauts research database: every token's traits, its minter, and every transfer since launch, replayed as a 360-day prehistory. Replaying history ends with every Argonaut in its real current owner's house.
- `docs/` holds the research, design, lore and the case for running at no cost.

```
npm run tick        # sync + advance + build _site locally
```
