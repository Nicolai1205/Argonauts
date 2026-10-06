// Assemble the GitHub Pages site: web/ at the root, the engine in sim/, the seed and sprites in data/, the live world in world/.
// Usage: node tools/build_site.mjs [worldDir] [outDir]
import fs from "node:fs";
const W = process.argv[2] || "world", OUT = process.argv[3] || "_site";
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync("web", OUT, { recursive: true });
fs.cpSync("sim", `${OUT}/sim`, { recursive: true });
fs.mkdirSync(`${OUT}/data`, { recursive: true });
for (const f of ["seed.json", "fleet.bin.gz"]) fs.copyFileSync(`data/${f}`, `${OUT}/data/${f}`);
fs.cpSync(W, `${OUT}/world`, { recursive: true });
fs.writeFileSync(`${OUT}/.nojekyll`, "");
console.log("site ->", OUT);
