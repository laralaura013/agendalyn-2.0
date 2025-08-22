// tools/codemod-safe-map.js
// Varre frontend/src e troca "x.map(" por "asArray(x).map(",
// adicionando o import { asArray } ... quando necessário.

const fs = require("fs");
const path = require("path");

const FRONT_ROOT = path.join(process.cwd(), "frontend", "src");
const UTIL_FILE  = path.join(FRONT_ROOT, "utils", "asArray.js");

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) out.push(p);
  }
  return out;
}

function toPosix(p) { return p.split(path.sep).join("/"); }

function ensureImport(content, filePath) {
  // já tem import do asArray?
  if (/import\s*{\s*asArray\s*}\s*from\s*['"].*asArray['"]\s*;?/.test(content)) return content;

  // calcula caminho relativo até utils/asArray.js
  let rel = path.relative(path.dirname(filePath), UTIL_FILE);
  if (!rel.startsWith(".")) rel = `./${rel}`;
  rel = rel.replace(/\.js$/,""); // importar sem extensão
  rel = toPosix(rel);
  const importLine = `import { asArray } from '${rel}';\n`;

  // insere após o(s) import(s), se houver
  const importBlock = /^(?:\s*import[\s\S]*?from\s+['"].+?['"]\s*;?\s*)+/m;
  const m = content.match(importBlock);
  if (m) {
    const insertPos = m.index + m[0].length;
    return content.slice(0, insertPos) + "\n" + importLine + content.slice(insertPos);
  }
  // sem imports: coloca no topo
  return importLine + content;
}

function transform(content, filePath) {
  const before = content;

  // Substitui LHS.map( por asArray(LHS).map(
  // Evita tocar em Array.prototype.map e casos já protegidos.
  const mapRegex = /([A-Za-z0-9_\)\]\.\?:>]+)\.map\(/g;
  content = content.replace(mapRegex, (match, lhs) => {
    if (lhs.endsWith("prototype") || lhs.includes("asArray(")) return match;
    return `asArray(${lhs}).map(`;
  });

  if (content !== before) {
    content = ensureImport(content, filePath);
  }
  return content;
}

// ---- run ----
if (!fs.existsSync(FRONT_ROOT)) {
  console.error("Pasta não encontrada:", FRONT_ROOT);
  process.exit(1);
}

const files = walk(FRONT_ROOT);
let changed = 0;

for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  const out = transform(src, f);
  if (out !== src) {
    fs.writeFileSync(f, out, "utf8");
    changed++;
    console.log("Protegido .map em:", toPosix(path.relative(process.cwd(), f)));
  }
}

console.log("\nDone. Arquivos modificados:", changed);
