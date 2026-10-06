"""Compile the Argonauts world seed from the local research DB (../../../data/argonauts.db).
Writes into the game repo:
  data/seed.json      per-token columns (traits, persona, oikos, palette emotion, shipmate ties), oikoi, dictionaries
  data/history.json   pre-genesis omens: every non-mint transfer/sale (ts, token, from, to, eth, venue), metadata updates,
                      the Maker's deeds (deployer txs via keyless Blockscout), the two known rulings
  data/fleet.bin.gz   24x24 sprites of all 9,999 tokens ('ARGP' format from report/fleetpix.py)
Run locally whenever the DB is refreshed; the hourly GitHub job takes over from history.json's last block."""
import base64, json, pathlib, sqlite3, urllib.request, time
import pandas as pd
game = pathlib.Path(__file__).resolve().parents[2]; root = game.parent
con = sqlite3.connect(root / "data" / "argonauts.db")
DEAD = "0x000000000000000000000000000000000000dead"; ZERO = "0x" + "0" * 40
DEPLOYER = "0xf16e1176d95b35e1e5e425a51d7f231ac352a859"
T = pd.read_sql("select token_id,Bones,Palette,Cloak,Crown,Sight,Artifact,Relic from token_stats where token_id between 1 and 9999 order by token_id", con).set_index("token_id").fillna("none")
own = pd.read_sql("select token_id,owner,from_ts from token_ownership where to_block is null and token_id between 1 and 9999", con).set_index("token_id")
T = T.join(own)
anim = pd.read_sql("select token_id,d_g from token_anim", con).set_index("token_id"); T["breath"] = anim.d_g.reindex(T.index).fillna(0).astype(int)
tp = json.load(open(root / "analysis_out" / "token_persona.json")); T["persona"] = [tp["persona"][str(t)] for t in T.index]
pe = {p["palette"]: p for p in json.load(open(root / "analysis_out" / "persona.json"))["palettes"]}
names = dict(con.execute("select address,name from names where name is not null"))
BONES = ["Bone", "Prehistoric", "Silver", "Coral", "Floral", "Petrified", "Gold", "Radioactive", "Alien"]
assert set(T.Bones) <= set(BONES)
dicts = {c: sorted(set(T[c])) for c in ("Palette", "Cloak", "Crown", "Sight", "Artifact", "persona")}
dicts["Bones"] = BONES
# oikoi = current holder wallets (+ the dead address); index 0 reserved for the dead
burned = T.owner == DEAD
holders = T[~burned].owner.value_counts()
minter = pd.read_sql("select token_id,minter from mints", con).set_index("token_id").minter.reindex(T.index)
assert minter.notna().all()
SPECIAL = {DEAD: "the Pyre", "0x6bd83f0c3ddcc5f812de0a9be574fb4303881d72": "the Agora stalls (market escrow)",
           "0x6ebe98ac7fe31c2615a0323a43d74b69f4ac206e": "the hostages of xenia (swap escrow)"}
addrs = [DEAD] + list(holders.index) + sorted(set(minter) - set(holders.index) - {DEAD})
oikoi = [{"addr": a, "name": SPECIAL.get(a) or names.get(a)} for a in addrs]
oix = {o["addr"]: i for i, o in enumerate(oikoi)}
burn_ts = dict(con.execute("select token_id, ts from transfers where to_addr=?", (DEAD,)))
# shipmates: tokens that shared a previous (not current) holder -> up to 4 deterministic ties per token
O = pd.read_sql("select token_id,owner from token_ownership where token_id between 1 and 9999 and to_block is not null", con)
O = O[O.owner != ZERO]
by_owner = O.groupby("owner").token_id.apply(lambda s: sorted(set(s)))
mates = {t: set() for t in T.index}
for w, toks in by_owner.items():
    if len(toks) < 2: continue
    for i, t in enumerate(toks):  # ring neighbours within that wallet's past holdings (deterministic, bounded)
        for d in (1, 2):
            u = toks[(i + d) % len(toks)]
            if u != t and len(mates[t]) < 4: mates[t].add(u)
col = lambda c: [dicts[c].index(v) for v in T[c]]
emo = lambda k: [round(pe.get(p, {}).get(k, 0.0), 3) for p in T.Palette]
seed = {"version": 1, "built": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "n": len(T), "dicts": dicts,
        "bones": [BONES.index(b) for b in T.Bones], "palette": col("Palette"), "cloak": col("Cloak"), "crown": col("Crown"), "sight": col("Sight"),
        "artifact": col("Artifact"), "persona": col("persona"), "relic": [int(r == "Gold") for r in T.Relic], "breath": T.breath.tolist(),
        "oikos": [oix[o] for o in T.owner], "oikosStart": [oix[m] for m in minter], "burnTs": [int(burn_ts.get(t, 0)) if b else 0 for t, b in zip(T.index, burned)],
        "heat": emo("heat"), "activity": emo("activity"), "weight": emo("weight"),
        "mates": [sorted(mates[t]) for t in T.index], "oikoi": oikoi}
# ---- history omens ----
S = pd.read_sql("select tx_hash,log_index,block,ts,token_id,seller,buyer,price_eth,venue,currency,unpriced from sales order by block,log_index", con)
H = []
for r in S.itertuples():
    kind = "burn" if r.buyer == DEAD else "transfer"
    eth = 0.0 if (r.unpriced or r.currency not in ("ETH", "WETH")) else round(float(r.price_eth or 0), 5)
    H.append({"id": f"{r.tx_hash}:{r.log_index}", "ts": int(r.ts), "block": int(r.block), "k": kind, "tok": int(r.token_id), "from": r.seller, "to": r.buyer, "eth": eth, "venue": r.venue})
for tx, li, blk, ts, ev, args in con.execute("select tx_hash,log_index,block,ts,event,args_json from nft_events where event in ('BatchMetadataUpdate','MetadataUpdate') order by block"):
    a = json.loads(args); H.append({"id": f"{tx}:{li}", "ts": ts, "block": blk, "k": "metadata", "tok": a.get("_tokenId"), "batch": "_fromTokenId" in a})
# the Maker's deeds from Blockscout (keyless), full paginated history of the deployer
url = f"https://eth.blockscout.com/api/v2/addresses/{DEPLOYER}/transactions"; params = ""; deeds = []
while True:
    d = json.load(urllib.request.urlopen(urllib.request.Request(url + params, headers={"User-Agent": "argonauts-world"}), timeout=60))
    for t in d["items"]:
        if t.get("status") != "ok": continue
        deeds.append({"id": t["hash"], "ts": int(pd.Timestamp(t["timestamp"]).timestamp()), "block": t["block_number"], "k": "deed", "method": t.get("method") or ("create" if t.get("created_contract") else "call"),
                      "to": ((t.get("to") or {}).get("hash") or (t.get("created_contract") or {}).get("hash") or "").lower(), "tx": t["hash"]})
    nxt = d.get("next_page_params")
    if not nxt: break
    params = "?" + "&".join(f"{k}={v}" for k, v in nxt.items()); time.sleep(0.5)
for d in deeds:  # which token did each ruling touch? decoded input from Blockscout
    if d["method"] != "setTraits": continue
    tx = json.load(urllib.request.urlopen(urllib.request.Request(f"https://eth.blockscout.com/api/v2/transactions/{d['tx']}", headers={"User-Agent": "argonauts-world"}), timeout=60))
    params = (tx.get("decoded_input") or {}).get("parameters") or []
    ints = [p["value"] for p in params if p.get("type", "").startswith("uint") and not p.get("type", "").endswith("]")]
    d["tok"] = int(ints[0]) if ints else None; d["args"] = params; time.sleep(0.4)
H += deeds
rul = json.load(open(root / "analysis_out" / "hidden.json"))["rulings"]
H.sort(key=lambda h: (h["block"], h.get("tok") or 0, h["k"]))
last_block = max(h["block"] for h in H)
log_block = max(h["block"] for h in H if h["k"] != "deed"); deed_block = max(h["block"] for h in H if h["k"] == "deed")
hist = {"logBlock": log_block, "deedBlock": deed_block, "lastBlock": last_block, "lastTs": max(h["ts"] for h in H), "rulings": [{"tok": r["tok"], "table": r["table"], "ruled": r["ruled"]} for r in rul], "omens": H}
(game / "data").mkdir(exist_ok=True)
(game / "data" / "seed.json").write_text(json.dumps(seed, separators=(",", ":")))
(game / "data" / "history.json").write_text(json.dumps(hist, separators=(",", ":")))
(game / "data" / "fleet.bin.gz").write_bytes(base64.b64decode((root / "report" / "pix" / "fleet.txt").read_bytes()))
print(f"seed: {len(T)} tokens, {len(oikoi)} oikoi, {int(burned.sum())} burned; history: {len(H)} omens ({len(deeds)} deeds) to block {last_block}")
print({k: sum(1 for h in H if h['k'] == k) for k in ('transfer', 'burn', 'metadata', 'deed')})
