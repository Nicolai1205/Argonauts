// Hourly chain sync (keyless). Appends new omens to world/omens.json:
//   transfers + burns + EIP-4906 metadata updates of the Argonauts contract (RPC eth_getLogs),
//   and the Maker's deeds: every transaction the deployer sends (Blockscout API), with setTraits decoded to its token.
import fs from "node:fs";
const NFT = "0x387c41b0b2f1128de44db1bcf8baad085f26392c", DEPLOYER = "0xf16e1176d95b35e1e5e425a51d7f231ac352a859";
const DEAD = "0x000000000000000000000000000000000000dead", WETH = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const T_TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const T_META = "0xf8e1a15aba9398e019f0b49df1a4fde98ee17ae345cb5f6b5e2c27f5033e8ce7", T_BATCH = "0x6bd5c950a8d8df17f772f5af37cb3655737899cbf903264b9795592da439661c";
const VENUES = { "0x0000000000000068f116a894984e2db1123eb395": "OpenSea", "0x00000000000000adc04c56bf30ac9d3c0aaf14dc": "OpenSea", "0x6bd83f0c3ddcc5f812de0a9be574fb4303881d72": "Musefacktory",
  "0x6ebe98ac7fe31c2615a0323a43d74b69f4ac206e": "Trade", "0xb2ecfe4e4d61f8790bbb9de2d1259b9e2410cea5": "Blur", "0x000000000000ad05ccc4f10045630fb830b95127": "Blur" };
const LOG_RPCS = ["https://rpc.mevblocker.io", "https://eth.drpc.org", "https://ethereum-rpc.publicnode.com"];
const RPCS = ["https://ethereum-rpc.publicnode.com", "https://eth.drpc.org", "https://rpc.mevblocker.io"];
const W = process.argv[2] || "world", HIST = process.argv[3] || "data/history.json";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function rpc(method, params, pool = RPCS) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const url = pool[attempt % pool.length];
    try {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
      const j = await res.json(); if (j.error) throw new Error(JSON.stringify(j.error)); return j.result;
    } catch (e) { if (attempt === 7) throw e; await sleep(800 * (attempt + 1)); }
  }
}
const hex = (n) => "0x" + n.toString(16), num = (h) => parseInt(h, 16), addr = (t) => "0x" + t.slice(26).toLowerCase();

async function getLogs(from, to, topics) {
  const out = []; let a = from, step = 4000;
  while (a <= to) {
    const b = Math.min(to, a + step - 1);
    try { out.push(...await rpc("eth_getLogs", [{ address: NFT, fromBlock: hex(a), toBlock: hex(b), topics }], LOG_RPCS)); a = b + 1; }
    catch (e) { if (step <= 50) throw e; step = Math.floor(step / 4); }
  }
  return out;
}

async function main() {
  const hist = JSON.parse(fs.readFileSync(HIST));
  fs.mkdirSync(W, { recursive: true });
  const cursorFile = `${W}/cursor.json`, omensFile = `${W}/omens.json`;
  const cursor = fs.existsSync(cursorFile) ? JSON.parse(fs.readFileSync(cursorFile)) : { logBlock: hist.logBlock, deedBlock: hist.deedBlock };
  const omens = fs.existsSync(omensFile) ? JSON.parse(fs.readFileSync(omensFile)) : [];
  const seen = new Set(omens.map((o) => o.id).concat(hist.omens.slice(-3000).map((o) => o.id)));
  const head = num(await rpc("eth_blockNumber", [], LOG_RPCS)) - 6, fresh = [];
  const tsCache = {}; const tsOf = async (b) => (tsCache[b] ??= num((await rpc("eth_getBlockByNumber", [hex(b), false])).timestamp));
  // ---- logs
  if (head > cursor.logBlock) {
    const logs = await getLogs(cursor.logBlock + 1, head, [[T_TRANSFER, T_META, T_BATCH]]);
    const byTx = {};
    for (const l of logs) (byTx[l.transactionHash] ||= []).push(l);
    for (const [tx, ls] of Object.entries(byTx)) {
      const transfers = ls.filter((l) => l.topics[0] === T_TRANSFER && l.topics.length === 4);
      let eth = 0, venue = "transfer";
      if (transfers.length) {
        const [rcpt, t] = await Promise.all([rpc("eth_getTransactionReceipt", [tx]), rpc("eth_getTransactionByHash", [tx])]);
        for (const l of rcpt.logs) if (VENUES[l.address.toLowerCase()]) { venue = VENUES[l.address.toLowerCase()]; break; }
        let wei = BigInt(t.value || "0x0");
        if (wei === 0n) for (const l of rcpt.logs) if (l.address.toLowerCase() === WETH && l.topics[0] === T_TRANSFER) { const to = addr(l.topics[2]); if (transfers.some((x) => addr(x.topics[1]) === to)) wei += BigInt(l.data); }
        if (venue !== "transfer") eth = Number(wei / 10n ** 12n) / 1e6 / transfers.length;
      }
      for (const l of ls) {
        const id = `${tx}:${num(l.logIndex)}`; if (seen.has(id)) continue;
        const b = num(l.blockNumber), ts = await tsOf(b);
        if (l.topics[0] === T_TRANSFER) {
          const from = addr(l.topics[1]), to = addr(l.topics[2]), tok = num(l.topics[3]);
          if (from === "0x0000000000000000000000000000000000000000") continue;
          fresh.push({ id, ts, block: b, k: to === DEAD ? "burn" : "transfer", tok, from, to, eth: Math.round(eth * 1e5) / 1e5, venue });
        } else if (l.topics[0] === T_META) fresh.push({ id, ts, block: b, k: "metadata", tok: num(l.data.slice(0, 66)), batch: false });
        else fresh.push({ id, ts, block: b, k: "metadata", tok: null, batch: true });
      }
    }
    cursor.logBlock = head;
  }
  // ---- the Maker's deeds
  let url = `https://eth.blockscout.com/api/v2/addresses/${DEPLOYER}/transactions`, params = "", done = false, maxB = cursor.deedBlock;
  while (!done) {
    const d = await (await fetch(url + params, { headers: { "user-agent": "argonauts-world" } })).json();
    for (const t of d.items || []) {
      if (t.block_number <= cursor.deedBlock) { done = true; break; }
      maxB = Math.max(maxB, t.block_number);
      if (t.status !== "ok" || seen.has(t.hash)) continue;
      const o = { id: t.hash, ts: Math.floor(Date.parse(t.timestamp) / 1000), block: t.block_number, k: "deed", method: t.method || (t.created_contract ? "create" : "call"),
        to: ((t.to || {}).hash || (t.created_contract || {}).hash || "").toLowerCase(), tx: t.hash };
      if (o.method === "setTraits") {
        const full = await (await fetch(`https://eth.blockscout.com/api/v2/transactions/${t.hash}`, { headers: { "user-agent": "argonauts-world" } })).json();
        const p = ((full.decoded_input || {}).parameters || []).find((x) => /^uint\d+$/.test(x.type)); o.tok = p ? Number(p.value) : null;
      }
      fresh.push(o);
    }
    if (!d.next_page_params) break;
    params = "?" + new URLSearchParams(d.next_page_params).toString(); await sleep(400);
  }
  cursor.deedBlock = maxB;
  fresh.sort((a, b) => a.block - b.block || a.id.localeCompare(b.id));
  fs.writeFileSync(omensFile, JSON.stringify(omens.concat(fresh)));
  fs.writeFileSync(cursorFile, JSON.stringify(cursor));
  console.log(`sync: +${fresh.length} omens (log head ${cursor.logBlock}, deeds to ${cursor.deedBlock})`, fresh.slice(0, 5).map((o) => `${o.k}:${o.tok ?? o.method}`).join(" "));
}
main().catch((e) => { console.error(e); process.exit(1); });
