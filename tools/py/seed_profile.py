"""Profile the real collection as seed data for the Argonauts society sim.
Factions = Bones tier; cross-cutting identities = Cloak (estate), Crown (guild/crew), Sight, Artifact, Palette.
Holders = patrons/households; wallets spanning several bones tiers = cross-faction ties.
Writes game/seed/seed_profile.json."""
import json, pathlib, sqlite3
import pandas as pd
root = pathlib.Path(__file__).resolve().parents[3]
con = sqlite3.connect(root / "data" / "argonauts.db")
DEAD = "0x000000000000000000000000000000000000dead"
T = pd.read_sql("select token_id,Bones,Palette,Cloak,Crown,Sight,Artifact,Relic from token_stats where token_id between 1 and 9999", con).set_index("token_id").fillna("none")
own = pd.read_sql("select token_id,owner from token_ownership where to_block is null and token_id between 1 and 9999", con).set_index("token_id")
T = T.join(own)
tp = json.load(open(root / "analysis_out" / "token_persona.json"))
T["persona"] = T.index.map(lambda t: tp["persona"].get(str(t)))
live = T[T.owner != DEAD]
out = {"tokens": len(T), "live": len(live), "burned": int((T.owner == DEAD).sum()), "holders": int(live.owner.nunique())}
out["bones"] = live.Bones.value_counts().to_dict()
# what each faction wears, as lift vs fleet (identifies faction "culture")
cult = {}
for col in ("Cloak", "Crown", "Sight", "Artifact", "Palette", "persona"):
    base = live[col].value_counts(normalize=True)
    for b, g in live.groupby("Bones"):
        if len(g) < 25: continue
        lift = (g[col].value_counts(normalize=True) / base).dropna()
        lift = lift[g[col].value_counts().reindex(lift.index) >= 5]
        cult.setdefault(b, {})[col] = lift.sort_values(ascending=False).head(3).round(2).to_dict()
out["faction_culture_lift"] = cult
# cross-faction households: wallets holding 2+ bones tiers
W = live.groupby("owner").agg(n=("Bones", "size"), tiers=("Bones", "nunique"))
out["households"] = {"single_token": int((W.n == 1).sum()), "multi_token": int((W.n > 1).sum()), "multi_tier": int((W.tiers > 1).sum()),
                     "tokens_in_multi_tier": int(W.n[W.tiers > 1].sum()), "largest": int(W.n.max())}
# bones co-holding matrix (how many wallets hold both tiers) -> seed for inter-faction affinity
tiers = list(out["bones"])
hold = live.groupby(["owner", "Bones"]).size().unstack(fill_value=0) > 0
out["coholding"] = {a: {b: int((hold[a] & hold[b]).sum()) for b in tiers if b != a} for a in tiers}
# trade ties: past sales between wallets, counted by bones of the traded token -> economic links
S = pd.read_sql("select token_id,seller,buyer,price_eth from sales where buyer is not null and seller is not null", con)
S = S.join(T.Bones, on="token_id")
out["trades_by_bones"] = S.groupby("Bones").agg(n=("token_id", "size"), eth=("price_eth", "sum")).round(2).to_dict("index")
out["estates_x_bones"] = pd.crosstab(live.Bones, live.Cloak).to_dict("index")
pathlib.Path(pathlib.Path(__file__).resolve().parent / "seed_out" / "seed_profile.json").write_text(json.dumps(out, indent=1, default=int))
print(json.dumps({k: out[k] for k in ("tokens", "live", "burned", "holders", "bones", "households")}, indent=1, default=int))
for b, c in cult.items(): print(b, {k: list(v)[:2] for k, v in c.items()})
print(pd.DataFrame(out["coholding"]).fillna(0).astype(int).to_string())
print(pd.DataFrame(out["trades_by_bones"]).T.to_string())
