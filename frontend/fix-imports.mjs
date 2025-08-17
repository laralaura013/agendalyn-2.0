// fix-imports.mjs (ESM, sem emojis para evitar bug no console)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// __dirname em ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Altere aqui os arquivos que deseja saneamento
const targets = [
  "src/pages/Clients.jsx",
  "src/pages/Orders.jsx",
  "src/pages/SettingsPage.jsx",
  "src/pages/Schedule.jsx",
  "src/pages/Cashier.jsx",
];

function resolveFromRoot(p) {
  return path.resolve(__dirname, p);
}

function dedupeImports(filePath) {
  const abs = resolveFromRoot(filePath);
  if (!fs.existsSync(abs)) {
    console.log("[fix-imports] Arquivo não encontrado: " + filePath);
    return;
  }

  let src = fs.readFileSync(abs, "utf8");
  const lines = src.split("\n");

  const keep = [];
  const seen = new Set();
  const lucideSpecifiers = new Set();

  for (const line of lines) {
    const trimmed = line.trim();

    // Junta todos os imports de lucide-react em um só
    const lucideMatch = trimmed.match(
      /^import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]lucide-react['"];?$/
    );
    if (lucideMatch) {
      const specs = lucideMatch[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      specs.forEach((s) => lucideSpecifiers.add(s));
      continue; // não mantemos agora; reescrevemos um único depois
    }

    // Ignora duplicatas exatas de api/toast
    if (
      trimmed === "import api from '../services/api';" ||
      trimmed === 'import api from "../services/api";' ||
      trimmed === "import toast from 'react-hot-toast';" ||
      trimmed === 'import toast from "react-hot-toast";'
    ) {
      if (seen.has(trimmed)) continue;
      seen.add(trimmed);
      keep.push(line);
      continue;
    }

    // De resto: se for import e já existir identicamente, pula
    if (trimmed.startsWith("import ")) {
      if (seen.has(trimmed)) continue;
      seen.add(trimmed);
      keep.push(line);
      continue;
    }

    // Não-import: mantém
    keep.push(line);
  }

  // Insere import único do lucide-react (se havia algo)
  if (lucideSpecifiers.size > 0) {
    const importIndex = keep.findIndex((l) => l.trim().startsWith("import "));
    const spec = Array.from(lucideSpecifiers).sort().join(", ");
    const lucideLine = "import { " + spec + " } from 'lucide-react';";
    if (importIndex >= 0) {
      keep.splice(importIndex + 1, 0, lucideLine);
    } else {
      keep.unshift(lucideLine);
    }
  }

  const out = keep.join("\n");
  fs.writeFileSync(abs, out, "utf8");
  console.log("[fix-imports] Imports saneados: " + filePath);
}

for (const t of targets) dedupeImports(t);
console.log("[fix-imports] Concluído");
