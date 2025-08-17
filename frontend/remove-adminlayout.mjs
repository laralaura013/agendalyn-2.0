// remove-adminlayout.mjs  (Node 18+ / ESM)
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { globby } from "globby";

const GLOB = [
  "src/pages/**/*.jsx",
  "!src/pages/**/__tests__/**",
  "!src/pages/**/test/**",
];

function stripAdminLayout(code) {
  let out = code;

  // remove import AdminLayout ...
  out = out.replace(
    /^import\s+AdminLayout\s+from\s+["'].*?["'];?\s*$/gm,
    ""
  );

  // remove <AdminLayout> e </AdminLayout>
  out = out.replace(/<AdminLayout\s*>/g, "");
  out = out.replace(/<\/AdminLayout>/g, "");

  // limpeza de linhas em branco duplas
  out = out.replace(/\n{3,}/g, "\n\n");
  return out;
}

(async () => {
  const files = await globby(GLOB);
  if (!files.length) {
    console.log("[remove-adminlayout] Nenhum arquivo encontrado.");
    process.exit(0);
  }
  let changed = 0;
  for (const f of files) {
    const abs = resolve(f);
    if (!existsSync(abs)) continue;
    const src = readFileSync(abs, "utf8");
    const out = stripAdminLayout(src);
    if (out !== src) {
      writeFileSync(abs, out, "utf8");
      console.log(`[remove-adminlayout] Atualizado: ${f}`);
      changed++;
    }
  }
  console.log(`[remove-adminlayout] Concluído (${changed} arquivos alterados).`);
})();
