# What's possible with $0: running an autonomous, live world without an LLM budget

Constraints (2026-10-06):
- Autonomous: nobody steers it.
- Live: it keeps going on its own.
- On-chain events only act as *omens* that drive real-world events.
- Tone: mythic, horror and realism.
- No API money and no machine for local models.

**Short answer: all of it is possible.** The things that make the best simulations work (Dwarf Fortress, RimWorld, Caves of Qud, WorldBox) don't need an LLM at runtime. They are deterministic rules plus procedural text. An LLM is a garnish, and we can get one for free in the two places it helps.

## 1. The simulation engine: free

- It is a deterministic TypeScript engine (see DESIGN.md §10). It runs in the **viewer's browser**, and in Node for checkpoints.
- **Speed estimate (unmeasured):** 10k agents × a daily tick should be milliseconds per tick, so a whole simulated year should take seconds.
- **Art: free.** The real on-chain SVGs of all 9,999 tokens are already in the DB and packed for the browser (`report/art/`). Characters appear on the map as themselves. Dead-state art (fire, cold, fade) comes from the char renderer we already ported.

## 2. "Live" without a server

The world is a **pure function of (seed, rules version, real clock, chain-input log)**.
- Nothing has to run 24/7. Whoever opens the page computes the world forward from the last checkpoint to *now*, the way an idle game handles time passing.
- Because the computation is deterministic, every viewer sees the same world.
- The world keeps living while nobody is watching; it is simply computed when observed.
- Time scale proposal: **1 real hour = 1 sim day**. A sim year then passes in ~15 real days, so every visit shows something new.

## 3. Feeding in chain events: who fetches them?

The page needs a small, growing `inputs.json`, a digest of new sales, transfers, burns, `setTraits` rulings, renderer and animation changes, and new contracts from the deployer. Three ways to make it, all with $0 in running costs:

| Option | How | Pros | Cons |
|---|---|---|---|
| **A. GitHub Actions + GitHub Pages** (recommended for "autonomous") | An hourly cron job pulls logs through the keyless RPC we already use, appends to inputs.json, writes a checkpoint and commits. Pages serves the site | Fully autonomous and independent: no Mac, no Claude, $0 (public repo: free minutes; private: 2,000 min/month) | Needs a GitHub repo; the site lives at `<you>.github.io/…`, not claude.ai |
| B. claude.ai artifact + a daily scheduled Claude routine (`/schedule`) | A cloud Claude agent runs the chain sync daily, writes inputs and checkpoints into the artifact's `db`, and could also write the day's chronicle itself | Stays on the artifact you already share; Claude narration with no API key | Uses your Claude plan's routine allowance; daily rather than hourly; depends on Claude to run |
| C. Your Mac (launchd cron) | `python -m argonauts update` → `game/chain_inputs.py` → push to A or B | Reuses the existing pipeline | Only runs while the Mac is awake |

Artifact pages are sandboxed. I *believe* they can't call arbitrary RPC endpoints from the browser (not yet tested), so on claude.ai the chain data has to be pushed in. GitHub Pages has no such limit, so the page can even fetch the newest blocks itself.

## 4. Words without an LLM

1. **Procedural grammars** (Tracery / Caves of Qud style). This is the main narrator.
   - I write one large corpus now, in this session, which costs you nothing at runtime: templates for every event type in three voices (myth, horror, realism), epithets and cognomens, epitaphs, faction chronicle voices (each faction tells the same event its own way), prophecies and Gazette headlines.
   - Templates have role slots filled by the real characters and their real traits ("#4211 of the Sown, wearer of the Death-cloak…").
   - This is what Qud and Dwarf Fortress do. At scale it reads as better than LLM prose because it is consistent and never hallucinates.
2. **Public-domain source texts.** These are scraped once and stored in the DB for provenance:
   - Seaton's 1912 *Argonautica* (Project Gutenberg)
   - Evelyn-White's Hesiod
   - Frazer's Apollodorus
   - Ovid's *Metamorphoses* in More's translation
   They give real names, epithets and turns of phrase. A small **Markov "oracle"** trained on them produces eerie, half-coherent prophecies, and that broken quality suits horror.
3. **The speaking beam of the Argo** (optional, free to you). In myth, the Argo had a beam from Dodona's oracle oak that could speak.
   - On the claude.ai artifact, an "Ask the beam" button can use the `sample` capability: the **viewer's own Claude account** answers, using that character's Legends page as context.
   - You pay nothing. It is non-canon (it never changes the world), so determinism holds.
4. **Not recommended:**
   - In-browser models (WebLLM / transformers.js) mean 0.3–2 GB downloads and need WebGPU.
   - Free-tier cloud LLM APIs are fragile, and none of this needs them.

## 5. Bottom line

$0 at runtime for engine, art, chain sync, hosting and narration. The one decision is **where it lives**: GitHub Pages (fully autonomous) or the claude.ai artifact plus a daily routine (stays in your current setup, and can borrow Claude for the chronicle and the speaking beam).
