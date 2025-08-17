import fs from "fs";

const file = "src/pages/Schedule.jsx"; // caminho correto dentro da pasta frontend
let src = fs.readFileSync(file, "utf-8");

// 1. Adicionar import ResponsivePage se não existir
if (!src.includes("ResponsivePage")) {
  src = src.replace(
    /import {[^}]+} from "lucide-react";/,
    (m) => m + `\nimport ResponsivePage from "../components/layouts/ResponsivePage";`
  );
}

// 2. Adicionar handleAction antes do return
if (!src.includes("const handleAction")) {
  src = src.replace(
    /\/\*\* ------- RENDER ------- \*\//,
    `// ⚡ Handlers extras para MobileShell
  const handleAction = (id) => {
    if (id === "schedule") openEmptyModal();
    if (id === "share-link") {
      navigator.clipboard.writeText(window.location.origin + "/agendar");
      toast.success("Link de agendamento copiado!");
    }
    if (id === "open-order") toast("Abrir comanda (implementar navegação)");
    if (id === "waitlist") {
      setOpenWaitlist(true);
      const ac = new AbortController();
      fetchWaitlist(ac.signal);
    }
  };

  /** ------- RENDER ------- */`
  );
}

// 3. Envolver o return
if (!src.includes("<ResponsivePage")) {
  src = src.replace(
    /return\s*\(\s*<div([\s\S]*?)<\/div>\s*\);/,
    `return (
    <ResponsivePage title="Agenda" currentTab="agenda" showActions onAction={handleAction}>
      <div$1</div>
    </ResponsivePage>
  );`
  );
}

fs.writeFileSync(file, src, "utf-8");
console.log("✅ Schedule.jsx atualizado com sucesso!");
