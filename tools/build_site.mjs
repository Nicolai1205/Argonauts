// Assemble the GitHub Pages site: web/ at the root, the engine in sim/, the seed and sprites in data/, the live world in world/.
// Usage: node tools/build_site.mjs [worldDir] [outDir]
import fs from "node:fs";
const W = process.argv[2] || "world", OUT = process.argv[3] || "_site";
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync("web", OUT, { recursive: true });
fs.cpSync("sim", `${OUT}/sim`, { recursive: true });
fs.mkdirSync(`${OUT}/data`, { recursive: true });
for (const f of ["seed.json", "fleet.bin.gz", "art.json"]) fs.copyFileSync(`data/${f}`, `${OUT}/data/${f}`);
fs.cpSync(W, `${OUT}/world`, { recursive: true });
fs.writeFileSync(`${OUT}/.nojekyll`, "");
// cache-busting: every module import and the entry script carry the build id, so a deploy never mixes old and new code
const BUILD = Date.now().toString(36);
const bust = (file) => { const t = fs.readFileSync(file, "utf8").replace(/((?:from|import)\s*["'])(\.{1,2}\/[^"']+?\.js)(["'])/g, `$1$2?v=${BUILD}$3`); fs.writeFileSync(file, t); };
for (const dir of [OUT, `${OUT}/sim`]) for (const f of fs.readdirSync(dir)) if (f.endsWith(".js")) bust(`${dir}/${f}`);
const html = fs.readFileSync(`${OUT}/index.html`, "utf8").replace('src="app.js"', `src="app.js?v=${BUILD}"`).replace('href="style.css"', `href="style.css?v=${BUILD}"`);
fs.writeFileSync(`${OUT}/index.html`, html);
console.log("site ->", OUT);
