import React, { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";


import { asArray } from '../../utils/asArray';
export default function CancellationReasonsPage() {
  const [reasons, setReasons] = useState([]);
  const [input, setInput] = useState("");

  const addReason = () => {
    if (!input.trim()) return;
    setReasons((prev) => [...prev, { id: crypto.randomUUID(), name: input.trim() }]);
    setInput("");
  };

  const removeReason = (id) => {
    setReasons((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Motivos de Cancelamento</h1>
      </div>

      <p className="text-sm text-gray-600 mt-2">
        Stub temporário para destravar o deploy. Integração com a API pode ser ligada depois.
      </p>

      <div className="mt-6 grid gap-3 sm:flex">
        <input
          type="text"
          placeholder="Ex.: Cliente não compareceu"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full sm:max-w-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <button
          onClick={addReason}
          className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 bg-violet-600 text-white hover:bg-violet-700 transition"
        >
          <Plus size={18} /> Adicionar
        </button>
      </div>

      <ul className="mt-6 divide-y rounded-lg border">
        {reasons.length === 0 && (
          <li className="p-4 text-sm text-gray-500">Nenhum motivo cadastrado.</li>
        )}
        {asArray(reasons).map((r) => (
          <li key={r.id} className="flex items-center justify-between p-4">
            <span>{r.name}</span>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded hover:bg-gray-100" title="Editar (stub)">
                <Pencil size={18} />
              </button>
              <button
                onClick={() => removeReason(r.id)}
                className="p-2 rounded hover:bg-gray-100 text-red-600"
                title="Excluir"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
