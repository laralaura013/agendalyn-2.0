// src/pages/Services.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshCcw,
  Plus,
  Search,
  Download,
  Upload,
  Filter,
  ArrowUpDown,
  Edit3 as Edit,
  Trash2,
  Clock,
  Tag,
  ToggleLeft,
  ToggleRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";
import Modal from "../components/dashboard/Modal";
import ServiceForm from "../components/forms/ServiceForm";
import { asArray } from "../utils/asArray";

const toBRL = (v) =>
  Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const SORTS = [
  { value: "name", label: "Nome" },
  { value: "price", label: "Preço" },
  { value: "duration", label: "Duração" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const Services = () => {
  /* ---------------- state base ---------------- */
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  /* ---------------- filtros & busca ---------------- */
  const [q, setQ] = useState("");
  const [qDeb, setQDeb] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("ALL"); // ALL | ACTIVE | INACTIVE

  // faixa preço (inputs) → ao clicar "Aplicar" viram efetivos
  const [priceMinInput, setPriceMinInput] = useState("");
  const [priceMaxInput, setPriceMaxInput] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  /* ---------------- ordenação & paginação ---------------- */
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc"); // asc | desc
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  /* ---------------- auxiliares ---------------- */
  const [categories, setCategories] = useState([]);
  const [staff, setStaff] = useState([]);

  /* ---------------- modais ---------------- */
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  /* ---------------- debounce busca ---------------- */
  useEffect(() => {
    const t = setTimeout(() => setQDeb(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  /* ---------------- básicos (selects) ---------------- */
  const loadBasics = useCallback(async () => {
    try {
      const [cats, st] = await Promise.allSettled([
        api.get("/categories"),
        api.get("/staff"),
      ]);
      setCategories(
        cats.status === "fulfilled"
          ? asArray(cats.value?.data?.items || cats.value?.data)
          : []
      );
      setStaff(
        st.status === "fulfilled"
          ? asArray(st.value?.data?.items || st.value?.data)
          : []
      );
    } catch {
      setCategories([]);
      setStaff([]);
    }
  }, []);

  useEffect(() => {
    loadBasics();
  }, [loadBasics]);

  /* ---------------- fetch com fallback ---------------- */
  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        pageSize,
        q: qDeb || undefined,
        categoryId: categoryId || undefined,
        isActive: status === "ALL" ? undefined : status === "ACTIVE" ? "1" : "0",
        sortBy,
        sortDir,
        minPrice: minPrice !== "" ? Number(minPrice) : undefined,
        maxPrice: maxPrice !== "" ? Number(maxPrice) : undefined,
      };

      const res = await api.get("/services", { params });
      const payload = res?.data;

      // --- server paginado (esperado: {items, total}) ---
      if (payload && (Array.isArray(payload.items) || Number.isFinite(payload.total))) {
        setItems(asArray(payload.items));
        setTotal(Number(payload.total || asArray(payload.items).length));
        return;
      }

      // --- fallback: backend retornou array simples; paginamos e filtramos no cliente ---
      const full = Array.isArray(payload) ? payload : asArray(payload?.items);
      // filtros client
      const filtered = full.filter((s) => {
        const txt = (s.name || "").toLowerCase();
        if (qDeb && !txt.includes(qDeb.toLowerCase())) return false;
        if (categoryId && String(s.categoryId || s.category?.id || "") !== categoryId) return false;
        if (status !== "ALL") {
          const isActive = !!s.isActive;
          if (status === "ACTIVE" && !isActive) return false;
          if (status === "INACTIVE" && isActive) return false;
        }
        const p = Number(s.price || 0);
        if (minPrice !== "" && p < Number(minPrice)) return false;
        if (maxPrice !== "" && p > Number(maxPrice)) return false;
        return true;
      });

      // ordenação client
      const dir = sortDir === "asc" ? 1 : -1;
      filtered.sort((a, b) => {
        const av = a?.[sortBy] ?? "";
        const bv = b?.[sortBy] ?? "";
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      });

      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      setTotal(filtered.length);
      setItems(filtered.slice(start, end));
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível carregar os serviços.");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    qDeb,
    categoryId,
    status,
    sortBy,
    sortDir,
    minPrice,
    maxPrice,
  ]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const showingFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(total, page * pageSize);

  /* ---------------- sorted (ajuste visual) ---------------- */
  const sorted = useMemo(() => {
    // normalmente servidor já ordena; ainda assim garantimos consistência visual
    const arr = asArray(items).slice();
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      const av = a?.[sortBy] ?? "";
      const bv = b?.[sortBy] ?? "";
      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * dir;
      }
      return String(av).localeCompare(String(bv)) * dir;
    });
    return arr;
  }, [items, sortBy, sortDir]);

  /* ---------------- ações CRUD ---------------- */
  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (svc) => {
    setEditing(svc);
    setFormOpen(true);
  };
  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const askDelete = (svc) => {
    setToDelete(svc);
    setConfirmOpen(true);
  };
  const cancelDelete = () => {
    setToDelete(null);
    setConfirmOpen(false);
  };
  const confirmDelete = async () => {
    if (!toDelete?.id) return;
    await toast.promise(api.delete(`/services/${toDelete.id}`), {
      loading: "Excluindo serviço...",
      success: "Serviço excluído!",
      error: (e) => e?.response?.data?.message || "Falha ao excluir.",
    });
    setToDelete(null);
    setConfirmOpen(false);
    fetchServices();
  };

  const handleSave = async (payload) => {
    const isEditing = Boolean(editing?.id);
    const req = isEditing
      ? api.put(`/services/${editing.id}`, payload)
      : api.post("/services", payload);

    await toast.promise(req, {
      loading: isEditing ? "Atualizando serviço..." : "Criando serviço...",
      success: isEditing ? "Serviço atualizado!" : "Serviço criado!",
      error: (e) => e?.response?.data?.message || "Não foi possível salvar.",
    });
    closeForm();
    // após salvar, volta pra página 1 pra ficar previsível
    setPage(1);
    fetchServices();
  };

  const toggleActive = async (svc) => {
    const next = !svc?.isActive;
    setItems((prev) => asArray(prev).map((s) => (s.id === svc.id ? { ...s, isActive: next } : s)));
    try {
      await api.patch(`/services/${svc.id}`, { isActive: next });
      toast.success(next ? "Ativado" : "Inativado");
    } catch (e) {
      setItems((prev) =>
        asArray(prev).map((s) => (s.id === svc.id ? { ...s, isActive: !next } : s))
      );
      toast.error(e?.response?.data?.message || "Falha ao alterar status.");
    }
  };

  /* ---------------- import/export ---------------- */
  const exportCsv = async () => {
    try {
      const params = new URLSearchParams({
        ...(qDeb ? { q: qDeb } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(status !== "ALL" ? { isActive: status === "ACTIVE" ? "1" : "0" } : {}),
        sortBy,
        sortDir,
        ...(minPrice !== "" ? { minPrice } : {}),
        ...(maxPrice !== "" ? { maxPrice } : {}),
      });
      const { data } = await api.get(`/services/export.csv?${params.toString()}`, {
        responseType: "blob",
      });
      const blob = new Blob([data], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `servicos_${ts}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // fallback local
      const cols = ["id", "name", "price", "duration", "categoryId", "isActive", "showInBooking"];
      const header = cols.join(",");
      const lines = asArray(sorted).map((r) =>
        cols
          .map((c) => {
            const v = r?.[c] ?? "";
            const s = String(v).replace(/"/g, '""');
            return /[,"\n]/.test(s) ? `"${s}"` : s;
          })
          .join(",")
      );
      const csv = [header, ...lines].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `servicos_${ts}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  };

  const importCsv = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      await toast.promise(
        api.post("/services/import.csv", fd, { headers: { "Content-Type": "multipart/form-data" } }),
        {
          loading: "Importando CSV...",
          success: "Importação concluída!",
          error: "Falha ao importar CSV.",
        }
      );
      e.target.value = "";
      // volta pra primeira página pra ver os itens importados facilmente
      setPage(1);
      fetchServices();
    } catch {
      e.target.value = "";
    }
  };

  /* ---------------- helpers UI ---------------- */
  const applyFilters = () => {
    setPage(1);
    setMinPrice(priceMinInput);
    setMaxPrice(priceMaxInput);
  };

  const clearFilters = () => {
    setQ("");
    setQDeb("");
    setCategoryId("");
    setStatus("ALL");
    setPriceMinInput("");
    setPriceMaxInput("");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("name");
    setSortDir("asc");
    setPage(1);
  };

  /* ---------------- render ---------------- */
  return (
    <div className="min-h-screen px-4 pt-4 pb-20 sm:px-6 md:px-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Serviços</h1>
          <p className="text-sm text-gray-500">Gerencie serviços, preços e duração.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={fetchServices}
            className="px-3 py-2 rounded bg-white border hover:bg-gray-50 flex items-center gap-2"
            title="Atualizar"
          >
            <RefreshCcw size={16} /> Atualizar
          </button>

          <label className="px-3 py-2 rounded bg-white border hover:bg-gray-50 flex items-center gap-2 cursor-pointer">
            <Upload size={16} /> Importar CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={importCsv} />
          </label>

          <button
            onClick={exportCsv}
            className="px-3 py-2 rounded bg-white border hover:bg-gray-50 flex items-center gap-2"
          >
            <Download size={16} /> Exportar CSV
          </button>

          <button
            onClick={openNew}
            className="px-3 py-2 rounded bg-purple-700 text-white hover:bg-purple-800 transition flex items-center gap-2"
          >
            <Plus size={16} /> Novo Serviço
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border rounded-lg p-3 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
          {/* Busca */}
          <div className="relative md:col-span-3">
            <input
              className="w-full border rounded-lg px-3 py-2 pl-9"
              placeholder="Buscar por nome…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (setPage(1), fetchServices())}
            />
            <Search size={16} className="absolute left-3 top-2.5 text-gray-500" />
          </div>

          {/* Categoria */}
          <div className="md:col-span-2">
            <select
              className="w-full border rounded-lg px-3 py-2"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Categoria (todas)</option>
              {asArray(categories).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="md:col-span-2">
            <select
              className="w-full border rounded-lg px-3 py-2"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">Status (todos)</option>
              <option value="ACTIVE">Ativos</option>
              <option value="INACTIVE">Inativos</option>
            </select>
          </div>

          {/* Faixa de preço */}
          <div className="md:col-span-2 grid grid-cols-2 gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Preço mín."
              value={priceMinInput}
              onChange={(e) => setPriceMinInput(e.target.value)}
              className="border rounded-lg px-3 py-2"
            />
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Preço máx."
              value={priceMaxInput}
              onChange={(e) => setPriceMaxInput(e.target.value)}
              className="border rounded-lg px-3 py-2"
            />
          </div>

          {/* Ordenação */}
          <div className="md:col-span-2 flex items-center gap-2">
            <Filter size={16} className="text-gray-500" />
            <select
              className="border rounded-lg px-3 py-2 w-full"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  Ordenar por: {s.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                setPage(1);
              }}
              className="px-3 py-2 rounded border bg-white hover:bg-gray-50"
              title="Alternar direção"
            >
              <ArrowUpDown size={16} />
            </button>
          </div>

          {/* Ações filtros */}
          <div className="md:col-span-1 flex items-center gap-2 justify-end">
            <button
              onClick={applyFilters}
              className="px-3 py-2 rounded bg-white border hover:bg-gray-50"
              title="Aplicar filtros"
            >
              Aplicar
            </button>
            <button
              onClick={clearFilters}
              className="px-3 py-2 rounded bg-white border hover:bg-gray-50"
              title="Limpar filtros"
            >
              Limpar
            </button>
          </div>
        </div>

        {/* Estado resumido */}
        <div className="mt-2 text-xs text-gray-500">
          {loading
            ? "Carregando…"
            : `Mostrando ${showingFrom}–${showingTo} de ${total} serviço(s).`}
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-6 text-gray-500">Carregando serviços…</div>
        ) : sorted.length === 0 ? (
          <div className="p-10 text-center text-gray-500">Nenhum serviço encontrado.</div>
        ) : (
          <ul className="divide-y">
            {sorted.map((s) => (
              <li key={s.id} className="p-4 sm:p-6 hover:bg-gray-50 transition">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* Infos */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {s.color && (
                        <span
                          className="inline-block w-3 h-3 rounded-full border"
                          style={{ backgroundColor: s.color }}
                          title={s.color}
                        />
                      )}
                      <h3 className="text-lg font-semibold">{s.name}</h3>
                      <span
                        className={`ml-2 text-[11px] px-2 py-1 rounded-full ${
                          s.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {s.isActive ? "Ativo" : "Inativo"}
                      </span>
                      {s.showInBooking !== undefined && (
                        <span className="text-[11px] px-2 py-1 rounded-full bg-indigo-50 text-indigo-700">
                          {s.showInBooking ? "Visível no agendamento" : "Oculto no agendamento"}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 text-sm text-gray-700 flex flex-wrap gap-x-6 gap-y-2">
                      <span className="inline-flex items-center gap-2">
                        <Tag size={16} className="text-gray-400" />
                        {s.category?.name || s.categoryName || "Sem categoria"}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Clock size={16} className="text-gray-400" />
                        {s.duration ? `${s.duration} min` : "Sem duração"}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <span className="text-gray-400">R$</span>
                        {toBRL(s.price)}
                      </span>
                    </div>

                    {s.description && (
                      <p className="mt-2 text-sm text-gray-600">{s.description}</p>
                    )}

                    {Array.isArray(s.staff) && s.staff.length > 0 && (
                      <div className="mt-3 text-xs text-gray-600">
                        <span className="font-medium">Atendido por:</span>{" "}
                        {s.staff.map((p) => p.name || p.nickname || p.email).join(", ")}
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => toggleActive(s)}
                      className={`p-2 rounded border hover:bg-gray-50 ${
                        s.isActive ? "text-emerald-700" : "text-gray-700"
                      }`}
                      title={s.isActive ? "Inativar serviço" : "Ativar serviço"}
                    >
                      {s.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>

                    <button
                      onClick={() => openEdit(s)}
                      className="p-2 rounded border hover:bg-gray-50"
                      title="Editar"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => askDelete(s)}
                      className="p-2 rounded border hover:bg-gray-50 text-rose-600"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Paginação server-side */}
        {!loading && total > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border-t text-sm">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(1)}
                disabled={page <= 1}
                className="px-2 py-1 border rounded disabled:opacity-50"
                title="Primeira página"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2 py-1 border rounded disabled:opacity-50"
                title="Página anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-2">
                Página <strong>{page}</strong> / {Math.max(1, Math.ceil(total / pageSize))}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(Math.ceil(total / pageSize), p + 1))}
                disabled={page >= Math.ceil(total / pageSize)}
                className="px-2 py-1 border rounded disabled:opacity-50"
                title="Próxima página"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setPage(Math.max(1, Math.ceil(total / pageSize)))}
                disabled={page >= Math.ceil(total / pageSize)}
                className="px-2 py-1 border rounded disabled:opacity-50"
                title="Última página"
              >
                <ChevronsRight size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span>Itens por página:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="border rounded px-2 py-1"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Form */}
      {formOpen && (
        <Modal isOpen={formOpen} onClose={closeForm}>
          <ServiceForm
            initialData={editing}
            categories={categories}
            staff={staff}
            onSave={handleSave}
            onCancel={closeForm}
          />
        </Modal>
      )}

      {/* Modal: Confirm delete */}
      {confirmOpen && (
        <Modal isOpen={confirmOpen} onClose={cancelDelete}>
          <div className="p-4">
            <h3 className="text-lg font-semibold">Confirmar exclusão</h3>
            <p className="mt-2 text-sm text-gray-600">
              Deseja excluir o serviço <strong>{toDelete?.name}</strong>? Esta ação não pode ser
              desfeita.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={cancelDelete} className="px-3 py-2 border rounded">
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Services;
