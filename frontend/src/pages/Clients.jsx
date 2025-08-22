// src/pages/Clients.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  UserPlus,
  Edit3 as Edit,
  Trash2,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Download,
  Upload,
  Link as LinkIcon,
  RotateCcw,
  GitMerge,
  CheckSquare,
  Square,
  MessageCircle,
  XCircle
} from "lucide-react";
import api from "../services/api";


import { asArray } from '../utils/asArray';
const fmtPhone = (v) => {
  const s = String(v || "").replace(/\D/g, "");
  if (!s) return "—";
  if (s.length === 11) return `(${s.slice(0, 2)}) ${s.slice(2, 7)}-${s.slice(7)}`;
  if (s.length === 10) return `(${s.slice(0, 2)}) ${s.slice(2, 6)}-${s.slice(6)}`;
  return v;
};
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : "—");
const waLink = (phone, name) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  const txt = encodeURIComponent(`Olá ${name?.split(" ")[0] || ""}!`);
  return `https://wa.me/55${digits}?text=${txt}`;
};

export default function Clients() {
  const navigate = useNavigate();

  // dados
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // busca/filtros
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(""); // '', 'active', 'inactive'
  const [tag, setTag] = useState("");
  const [uf, setUf] = useState("");
  const [city, setCity] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);

  // paginação
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // seleção / merge
  const [selected, setSelected] = useState(new Set());
  const [mergeIds, setMergeIds] = useState([]);

  const fetchClients = async (opts = {}) => {
    setLoading(true);
    try {
      const params = {
        page,
        pageSize,
        q,
        status: status || undefined,
        tag: tag || undefined,
        uf: uf || undefined,
        city: city || undefined,
        includeDeleted: includeDeleted ? "1" : undefined,
        ...opts,
      };
      const { data } = await api.get("/clients", { params });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erro ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const filteredCount = useMemo(() => items.length, [items]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleSearch = async () => {
    setPage(1);
    await fetchClients({ page: 1 });
  };

  const handleNew = () => navigate("/dashboard/clients/new");
  const handleEdit = (id) => navigate(`/dashboard/clients/${id}/edit`);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const clearFilters = () => {
    setQ(""); setStatus(""); setTag(""); setUf(""); setCity(""); setIncludeDeleted(false);
    setPage(1);
    fetchClients({ page: 1, q: "", status: undefined, tag: undefined, uf: undefined, city: undefined, includeDeleted: undefined });
  };

  const handleSoftDelete = async (id) => {
    if (!window.confirm("Mover cliente para a lixeira?")) return;
    await toast.promise(api.delete(`/clients/${id}`), {
      loading: "Movendo...",
      success: "Cliente movido para a lixeira.",
      error: "Não foi possível mover.",
    });
    fetchClients();
  };

  const handleRestore = async (id) => {
    await toast.promise(api.post(`/clients/${id}/restore`), {
      loading: "Restaurando...",
      success: "Cliente restaurado.",
      error: "Não foi possível restaurar.",
    });
    fetchClients();
  };

  const handleBulkSoftDelete = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Mover ${selected.size} cliente(s) para a lixeira?`)) return;
    await toast.promise(api.post('/clients/bulk/soft-delete', { ids: Array.from(selected) }), {
      loading: "Movendo...",
      success: "Clientes movidos para a lixeira.",
      error: "Falha ao mover.",
    });
    setSelected(new Set());
    fetchClients();
  };

  const handleBulkRestore = async () => {
    if (selected.size === 0) return;
    await toast.promise(api.post('/clients/bulk/restore', { ids: Array.from(selected) }), {
      loading: "Restaurando...",
      success: "Clientes restaurados.",
      error: "Falha ao restaurar.",
    });
    setSelected(new Set());
    fetchClients();
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        ...(q ? { q } : {}),
        ...(status ? { status } : {}),
        ...(tag ? { tag } : {}),
        ...(uf ? { uf } : {}),
        ...(city ? { city } : {}),
        ...(includeDeleted ? { includeDeleted: "1" } : {}),
      });
      const { data } = await api.get(`/clients/export.csv?${params.toString()}`, { responseType: "blob" });
      const blob = new Blob([data], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `clientes_${ts}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível exportar o CSV.");
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await toast.promise(api.post('/clients/import.csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }), {
        loading: "Importando...",
        success: "Importação concluída!",
        error: "Falha ao importar CSV.",
      });
      e.target.value = "";
      fetchClients();
    } catch {
      e.target.value = "";
    }
  };

  const addMergeId = (id) => {
    setMergeIds((arr) => {
      const exists = arr.includes(id);
      if (exists) return arr.filter((x) => x !== id);
      if (arr.length >= 2) return [arr[1], id];
      return [...arr, id];
    });
  };

  const handleMerge = async () => {
    if (mergeIds.length !== 2) {
      toast.error("Selecione exatamente 2 clientes para mesclar.");
      return;
    }
    const [a, b] = mergeIds;
    const winnerId = window.prompt(`Informe o ID vencedor:\n${a}\n${b}`, a);
    if (!winnerId || ![a, b].includes(winnerId)) {
      toast.error("ID vencedor inválido.");
      return;
    }
    const loserId = winnerId === a ? b : a;

    await toast.promise(api.post('/clients/merge', { winnerId, loserId }), {
      loading: "Mesclando...",
      success: "Clientes mesclados.",
      error: (e) => e?.response?.data?.message || "Falha ao mesclar.",
    });
    setMergeIds([]);
    fetchClients();
  };

  return (
    <div className="min-h-screen px-4 pt-4 pb-20 sm:px-6 md:px-8">
      {/* Header / ações */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h1 className="text-2xl md:text-3xl font-bold">Clientes</h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => fetchClients()} className="px-3 py-2 rounded bg-white border hover:bg-gray-50 flex items-center gap-2">
            <RefreshCw size={18} /> Atualizar
          </button>

          {/* Import CSV */}
          <label className="px-3 py-2 rounded bg-white border hover:bg-gray-50 flex items-center gap-2 cursor-pointer">
            <Upload size={18} /> Importar CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleImport} />
          </label>

          <button onClick={handleExport} className="px-3 py-2 rounded bg-white border hover:bg-gray-50 flex items-center gap-2">
            <Download size={18} /> Exportar CSV
          </button>

          <button onClick={handleNew} className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2">
            <UserPlus size={18} /> Novo Cliente
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border rounded-lg p-3 mb-3">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <div className="relative md:col-span-2">
            <input
              className="w-full border rounded-lg px-3 py-2 pl-9"
              placeholder="Buscar por nome, e-mail, telefone, CPF ou cidade/UF"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Search size={16} className="absolute left-3 top-2.5 text-gray-500" />
          </div>
          <select className="border rounded-lg px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Status (todos)</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </select>
          <input className="border rounded-lg px-3 py-2" placeholder="Tag" value={tag} onChange={(e) => setTag(e.target.value)} />
          <input className="border rounded-lg px-3 py-2 uppercase" placeholder="UF" value={uf} maxLength={2} onChange={(e) => setUf(e.target.value.toUpperCase())} />
          <input className="border rounded-lg px-3 py-2" placeholder="Cidade" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="flex items-center gap-3 mt-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={includeDeleted} onChange={(e) => setIncludeDeleted(e.target.checked)} />
            Incluir lixeira
          </label>
          <button onClick={handleSearch} className="px-3 py-1.5 rounded bg-white border hover:bg-gray-50 flex items-center gap-2">
            <LinkIcon size={16} /> Aplicar
          </button>
          <button onClick={clearFilters} className="px-3 py-1.5 rounded bg-white border hover:bg-gray-50 flex items-center gap-2">
            <XCircle size={16} /> Limpar
          </button>
        </div>
      </div>

      {/* Barra de ações em massa */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <button
          onClick={handleBulkSoftDelete}
          disabled={selected.size === 0}
          className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
        >
          <Trash2 size={16} /> Excluir selecionados
        </button>
        <button
          onClick={handleBulkRestore}
          disabled={selected.size === 0}
          className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
        >
          <RotateCcw size={16} /> Restaurar selecionados
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleMerge}
            disabled={mergeIds.length !== 2}
            className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
            title={mergeIds.length === 2 ? `Mesclar ${mergeIds[0]} + ${mergeIds[1]}` : "Selecione 2 para mesclar"}
          >
            <GitMerge size={16} /> Mesclar selecionados (2)
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-4 text-gray-500 text-sm">Carregando clientes…</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-gray-500">Nenhum cliente encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left">
                  <th className="px-4 py-3">
                    <div className="w-4 h-4" />
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600">Cliente</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Contato</th>
                  <th className="px-4 py-3 font-medium text-gray-600">CPF</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Nascimento</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Sexo</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Cidade/UF</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Última visita</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Atendimentos</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-600">WhatsApp</th>
                  <th className="px-4 py-3 font-medium text-gray-600 w-40">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {asArray(items).map((c) => {
                  const isSelected = selected.has(c.id);
                  const mergeSelected = mergeIds.includes(c.id);
                  return (
                    <tr key={c.id} className={c.deletedAt ? "opacity-60" : ""}>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleSelect(c.id)}
                          title={isSelected ? "Desmarcar" : "Selecionar"}
                          className="p-1.5 rounded border hover:bg-gray-50"
                        >
                          {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                        <button
                          onClick={() => addMergeId(c.id)}
                          title={mergeSelected ? "Remover da mesclagem" : "Selecionar para mesclar"}
                          className={`ml-2 p-1.5 rounded border hover:bg-gray-50 ${mergeSelected ? "bg-purple-50 border-purple-300" : ""}`}
                        >
                          <GitMerge size={16} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {c.avatarUrl ? (
                            <img src={c.avatarUrl} alt={c.name} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200" />
                          )}
                          <div className="flex flex-col">
                            <span className="font-medium">{c.name || "—"}</span>
                            {c.tags && c.tags.length > 0 && (
                              <span className="text-[11px] text-purple-700">{c.tags.join(", ")}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-700">{c.email || "—"}</div>
                        <div className="text-xs text-gray-600">{fmtPhone(c.phone)}</div>
                      </td>
                      <td className="px-4 py-3">{c.cpf || "—"}</td>
                      <td className="px-4 py-3">{fmtDate(c.birthDate)}</td>
                      <td className="px-4 py-3">
                        {c.gender === "MALE" ? "Masculino" : c.gender === "FEMALE" ? "Feminino" : c.gender === "OTHER" ? "Outro" : "—"}
                      </td>
                      <td className="px-4 py-3">{c.city ? `${c.city} / ${c.state || ""}` : "—"}</td>
                      <td className="px-4 py-3">{fmtDate(c.lastVisit)}</td>
                      <td className="px-4 py-3">{c.appointmentsCount ?? 0}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${c.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                          {c.isActive ? (<><ToggleRight size={14} /> Ativo</>) : (<><ToggleLeft size={14} /> Inativo</>)}
                        </span>
                        {c.deletedAt && <div className="text-[11px] text-rose-600 mt-1">Lixeira</div>}
                      </td>
                      <td className="px-4 py-3">
                        {waLink(c.phone, c.name) ? (
                          <a
                            href={waLink(c.phone, c.name)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border hover:bg-gray-50 text-green-700"
                          >
                            <MessageCircle size={14} /> Abrir
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleEdit(c.id)} className="p-1.5 rounded border hover:bg-gray-50" title="Editar">
                            <Edit size={16} />
                          </button>
                          {c.deletedAt ? (
                            <button onClick={() => handleRestore(c.id)} className="p-1.5 rounded border hover:bg-gray-50 text-emerald-700" title="Restaurar">
                              <RotateCcw size={16} />
                            </button>
                          ) : (
                            <button onClick={() => handleSoftDelete(c.id)} className="p-1.5 rounded border hover:bg-gray-50 text-rose-600" title="Mover p/ lixeira">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Paginação */}
            <div className="flex items-center justify-between p-3 border-t text-sm">
              <div>
                {filteredCount} de {total} clientes
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-2 py-1 border rounded disabled:opacity-50">
                  <ChevronLeft size={16} />
                </button>
                <span>Página {page} / {totalPages}</span>
                <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} className="px-2 py-1 border rounded disabled:opacity-50">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Cards mobile (opcional) */}
            <div className="sm:hidden p-2 space-y-2">
              {asArray(items).map((c) => (
                <div key={`m-${c.id}`} className={`border rounded p-3 ${c.deletedAt ? "opacity-60" : ""}`}>
                  <div className="font-medium">{c.name || "—"}</div>
                  <div className="text-xs text-gray-600">{c.email || "—"} • {fmtPhone(c.phone)}</div>
                  <div className="text-xs text-gray-600">{c.city ? `${c.city}/${c.state || ""}` : "—"}</div>
                  <div className="text-xs text-gray-600">Última: {fmtDate(c.lastVisit)} • Atend.: {c.appointmentsCount ?? 0}</div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleEdit(c.id)} className="px-2 py-1 text-xs rounded border hover:bg-gray-50">Editar</button>
                    {c.deletedAt ? (
                      <button onClick={() => handleRestore(c.id)} className="px-2 py-1 text-xs rounded border hover:bg-gray-50 text-emerald-700">Restaurar</button>
                    ) : (
                      <button onClick={() => handleSoftDelete(c.id)} className="px-2 py-1 text-xs rounded border hover:bg-gray-50 text-rose-600">Lixeira</button>
                    )}
                    {waLink(c.phone, c.name) && (
                      <a href={waLink(c.phone, c.name)} target="_blank" rel="noreferrer" className="px-2 py-1 text-xs rounded border hover:bg-gray-50 text-green-700">
                        WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
