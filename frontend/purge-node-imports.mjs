// purge-node-imports.mjs
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { globby } from "globby";

const GLOB = [
  "src/**/*.jsx",
  "src/**/*.tsx",
];

function purge(code) {
  let out = code;
  out = out.replace(/^\s*import\s+.*\s+from\s+['"]fs['"];\s*$/gm, "");
  out = out.replace(/^\s*import\s+.*\s+from\s+['"]path['"];\s*$/gm, "");
  // também versão require() (se alguém colou):
  out = out.replace(/^\s*const\s+.*=\s*require\(['"]fs['"]\);\s*$/gm, "");
  out = out.replace(/^\s*const\s+.*=\s*require\(['"]path['"]\);\s*$/gm, "");
  // comprime linhas em branco
  out = out.replace(/\n{3,}/g, "\n\n");
  return out;
}

(async () => {
  const files = await globby(GLOB);
  let changed = 0;
  for (const f of files) {
    const abs = resolve(f);
    if (!existsSync(abs)) continue;
    const src = readFileSync(abs, "utf8");
    const out = purge(src);
    if (out !== src) {
      writeFileSync(abs, out, "utf8");
      console.log(`[purge-node-imports] Limpou: ${f}`);
      changed++;
    }
  }
  console.log(`[purge-node-imports] Concluído (${changed} arquivos alterados).`);
})();
