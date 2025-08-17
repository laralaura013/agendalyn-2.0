// remove-adminlayout.mjs (ESM)
// Varre src/pages/**.jsx e remove import AdminLayout e <AdminLayout>...</AdminLayout>

import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PAGES_DIR = path.join(ROOT, "src", "pages");

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (e.isFile() && /\.jsx?$/.test(e.name)) {
      files.push(full);
    }
  }
  return files;
}

function stripAdminLayout(code) {
  let changed = false;
  let out = code;

  // 1) remove import AdminLayout ... from '.../components/layouts/AdminLayout'
  const importRegex =
    /import\s+AdminLayout\s+from\s+["'][.^/]*\/?components\/layouts\/AdminLayout["'];?\s*\r?\n?/g;
  if (importRegex.test(out)) {
    out = out.replace(importRegex, "");
    changed = true;
  }

  // 2) remove <AdminLayout> e </AdminLayout> (com atributos ou espaços)
  const openTag = /<\s*AdminLayout(\s+[^>]*)?>\s*/g;
  const closeTag = /\s*<\/\s*AdminLayout\s*>\s*/g;
  if (openTag.test(out) || closeTag.test(out)) {
    out = out.replace(openTag, "");
    out = out.replace(closeTag, "");
    changed = true;
  }

  return { out, changed };
}

async function run() {
  try {
    const all = await walk(PAGES_DIR);
    const targets = all.filter((f) => f.endsWith(".jsx"));
    if (targets.length === 0) {
      console.log("[remove-adminlayout] Nenhum .jsx encontrado em src/pages");
      return;
    }

    for (const file of targets) {
      const src = await fs.readFile(file, "utf8");
      const { out, changed } = stripAdminLayout(src);
      if (changed) {
        // backup .bak uma vez
        const bak = file + ".bak";
        try {
          await fs.access(bak);
        } catch {
          await fs.writeFile(bak, src, "utf8");
        }
        await fs.writeFile(file, out, "utf8");
        console.log(`[remove-adminlayout] Limpo: ${path.relative(ROOT, file)}`);
      }
    }
    console.log("[remove-adminlayout] Concluído.");
  } catch (e) {
    console.error("[remove-adminlayout] Erro:", e);
    process.exit(1);
  }
}

run();
