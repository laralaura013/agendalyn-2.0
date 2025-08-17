// patch-all.js
import fs from "fs";
import path from "path";

const files = [
  "src/pages/Schedule.jsx",
  "src/pages/Cashier.jsx",
  "src/pages/Orders.jsx",
  "src/pages/Clients.jsx",
  "src/pages/SettingsPage.jsx",
];

const commonImports = [
  `import api from '../services/api';`,
  `import toast from 'react-hot-toast';`,
  `import { Plus, Download, RefreshCw, CheckCircle2, XCircle, Edit3, Trash2 } from 'lucide-react';`,
];

function ensureImports(content, imports) {
  let result = content;
  imports.forEach((imp) => {
    if (!result.includes(imp)) {
      result = imp + "\n" + result;
    }
  });
  return result;
}

function updateFile(file) {
  const filePath = path.resolve(file);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ Arquivo não encontrado: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, "utf8");
  let updated = false;

  // 1. Garante imports
  const beforeImports = content;
  content = ensureImports(content, [
    `import AdminLayout from '../components/layouts/AdminLayout';`,
    ...commonImports,
  ]);
  if (content !== beforeImports) updated = true;

  // 2. Envolve return em AdminLayout se ainda não estiver
  if (/return\s*\(([\s\S]*?)\);/.test(content) && !content.includes("<AdminLayout>")) {
    content = content.replace(
      /return\s*\(([\s\S]*?)\);/,
      `return (
  <AdminLayout>
$1
  </AdminLayout>
);`
    );
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`✅ ${file} atualizado com sucesso!`);
  } else {
    console.log(`ℹ️ ${file} já estava atualizado.`);
  }
}

// Executa para todos
files.forEach(updateFile);

console.log("🎉 Patch final aplicado!");
