// src/pages/Clients.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { UserPlus, Edit3 as Edit, Trash2, RefreshCw, Search } from "lucide-react";
import api from "../services/api";

const fmtPhone = (v) => {
  const s = String(v || "").replace(/\D/g, "");
  if (s.length === 11) return `(${s.slice(0, 2)}) ${s.slice(2, 7)}-${s.slice(7)}`;
  if (s.length === 10) return `(${s.slice(0, 2)}) ${s.slice(2, 6)}-${s.slice(6)}`;
  return v || "—";
};

const Clients = () => {
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await api.get("/clients");
      setClients(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erro ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return clients;
    return clients.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      const phone = (c.phone || "").toLowerCase();
      return name.includes(t) || email.includes(t) || phone.includes(t);
    });
  }, [clients, q]);

  const handleNew = () => navigate("/dashboard/clients/new");
  const handleEdit = (id) => navigate(`/dashboard/clients/${id}/edit`);

  const handleDelete = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este cliente?")) return;
    // otimista
    const prev = clients;
    setClients((list) => list.filter((c) => c.id !== id));

    await toast.promise(
      api.delete(`/clients/${id}`),
      {
        loading: "Excluindo...",
        success: "Cliente excluído.",
        error: (e) => e?.response?.data?.message || "Erro ao excluir cliente.",
      }
    ).catch(() => setClients(prev));
  };

  return (
    <div className="min-h-screen px-4 pt-4 pb-20 sm:px-6 md:px-8">
      {/* Header / ações */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h1 className="text-2xl md:text-3xl font-bold">Clientes</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchClients}
            className="px-3 py-2 rounded bg-white border hover:bg-gray-50 flex items-center gap-2"
            title="Recarregar"
          >
            <RefreshCw size={18} />
            Atualizar
          </button>
          <button
            onClick={handleNew}
            className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
          >
            <UserPlus size={18} />
            Novo Cliente
          </button>
        </div>
      </div>

      {/* Busca */}
      <div className="mb-3">
        <div className="relative">
          <input
            className="w-full border rounded-lg px-3 py-2 pl-9"
            placeholder="Buscar por nome, e-mail ou telefone"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Search size={16} className="absolute left-3 top-2.5 text-gray-500" />
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-4 text-gray-500 text-sm">Carregando clientes…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Nenhum cliente encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium text-gray-600">Nome</th>
                  <th className="px-4 py-3 font-medium text-gray-600">E-mail</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Telefone</th>
                  <th className="px-4 py-3 font-medium text-gray-600 w-32">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3">{c.name || "—"}</td>
                    <td className="px-4 py-3">{c.email || "—"}</td>
                    <td className="px-4 py-3">{fmtPhone(c.phone)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(c.id)}
                          className="p-1.5 rounded border hover:bg-gray-50"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 rounded border hover:bg-gray-50 text-rose-600"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Cards em telas muito pequenas (opcional) */}
            <div className="sm:hidden p-2 space-y-2">
              {filtered.map((c) => (
                <div key={`m-${c.id}`} className="border rounded p-3">
                  <div className="font-medium">{c.name || "—"}</div>
                  <div className="text-xs text-gray-600">{c.email || "—"}</div>
                  <div className="text-xs text-gray-600">{fmtPhone(c.phone)}</div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleEdit(c.id)}
                      className="px-2 py-1 text-xs rounded border hover:bg-gray-50"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="px-2 py-1 text-xs rounded border hover:bg-gray-50 text-rose-600"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Clients;
