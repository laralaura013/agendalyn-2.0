// src/pages/ProductsPage.jsx
import React, { useEffect, useMemo, useCallback, useState } from "react";
import toast from "react-hot-toast";
import api from "../services/api";
import { asArray } from "../utils/asArray";
import ProductForm from "../components/forms/ProductForm";

/* ================= Helpers ================= */
const toBRL = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const normalizeList = (res) =>
  Array.isArray(res?.data)
    ? res.data
    : res?.data?.items || res?.data?.results || [];

/* ================= Ícones (SVG inline) ================= */
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
  </svg>
);
const AddIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
  </svg>
);
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
    <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
  </svg>
);
const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);
const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
  </svg>
);
const ProductPlaceholderIcon = () => (
  <svg className="w-16 h-16 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.43 2.43h10.268c1.282 0 2.43-1.043 2.43-2.43a2.25 2.25 0 01-2.43-2.43 3 3 0 00-5.78-1.128v.001z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a2.25 2.25 0 002.25-2.25H9.75A2.25 2.25 0 0012 21zm-2.25-4.125a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM12 3.75a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0z" />
  </svg>
);

/* ================= Pequenos utilitários ================= */
const debounce = (fn, ms = 400) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

const csvEncode = (rows) => {
  const cols = [
    "id",
    "name",
    "categoryName",
    "brandName",
    "price",
    "cost",
    "stock",
    "isActive",
    "description",
  ];
  const header = cols.join(",");
  const lines = asArray(rows).map((r) =>
    cols
      .map((c) => {
        const v =
          c === "categoryName" ? (r.category?.name ?? r.categoryName ?? "") :
          c === "brandName" ? (r.brand?.name ?? r.brandName ?? "") :
          r?.[c] ?? "";
        const s = String(v).replace(/"/g, '""');
        return /[,"\n]/.test(s) ? `"${s}"` : s;
      })
      .join(",")
  );
  return [header, ...lines].join("\n");
};

/* ================= UI auxiliares ================= */
const Chip = ({ active }) => (
  <span
    className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${
      active ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-700"
    }`}
  >
    {active ? "Ativo" : "Inativo"}
  </span>
);

/* ================= Card ================= */
const ProductCard = ({ product, selected, onToggleSelect, onToggleActive, onEdit, onDelete }) => {
  const stock = Number(product.stock || 0);
  let stockStatusColor = "bg-green-100 text-green-800";
  if (stock <= 10) stockStatusColor = "bg-yellow-100 text-yellow-800";
  if (stock <= 5) stockStatusColor = "bg-red-100 text-red-800";

  const categoryName = product.category?.name || product.categoryName || "Sem categoria";
  const brandName = product.brand?.name || product.brandName || "";

  return (
    <div className="relative bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
      {/* checkbox seleção */}
      <div className="absolute top-3 left-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="h-4 w-4"
          title={selected ? "Desmarcar" : "Selecionar"}
        />
      </div>

      <div className="bg-gray-50 h-40 flex items-center justify-center">
        <ProductPlaceholderIcon />
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${stockStatusColor}`}>
            {stock} em estoque
          </span>
          <Chip active={!!product.isActive || product.isActive === undefined} />
        </div>

        <div className="flex-grow">
          <h3 className="text-lg font-bold text-gray-900 truncate">{product.name}</h3>
          <p className="text-sm text-gray-500">
            {categoryName}
            {brandName ? ` • ${brandName}` : ""}
          </p>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-2xl font-extrabold text-gray-900">{toBRL(product.price)}</p>
            {product.cost ? (
              <p className="text-sm text-gray-500 line-through">{toBRL(product.cost)}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200 grid grid-cols-3 gap-2">
          <button
            onClick={onEdit}
            className="flex items-center justify-center gap-2 text-sm font-semibold py-2 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
            title="Editar"
          >
            <EditIcon /> Editar
          </button>
          <button
            onClick={onToggleActive}
            className={`flex items-center justify-center gap-2 text-sm font-semibold py-2 px-3 rounded-lg ${
              product.isActive === false
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-gray-700 hover:bg-gray-800 text-white"
            }`}
            title={product.isActive === false ? "Ativar" : "Desativar"}
          >
            {product.isActive === false ? "Ativar" : "Desativar"}
          </button>
          <button
            onClick={onDelete}
            className="flex items-center justify-center gap-2 text-sm font-semibold py-2 px-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-600"
            title="Excluir"
          >
            <DeleteIcon /> Excluir
          </button>
        </div>
      </div>
    </div>
  );
};

/* ================= Modal genérico ================= */
const ModalShell = ({ isOpen, onClose, title, children, width = "max-w-2xl" }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className={`bg-white w-full ${width} rounded-2xl shadow-2xl p-8 relative border border-gray-200`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
            aria-label="Fechar"
          >
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

/* ================= Página ================= */
export default function ProductsPage() {
  // dataset
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // selects
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  // filtros
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [stockFilter, setStockFilter] = useState("ALL"); // ALL | OK | LOW | ZERO
  const [isActive, setIsActive] = useState("ALL"); // ALL | YES | NO
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("name"); // name | price | stock | createdAt
  const [sortDir, setSortDir] = useState("asc");

  // paginação
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // seleção / modal
  const [selected, setSelected] = useState(new Set());
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // delete
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  // debounce busca
  useEffect(() => {
    const apply = debounce((v) => setQ(v.trim()), 400);
    apply(search);
    return () => apply("");
  }, [search]);

  // carrega selects
  const loadOptions = useCallback(async () => {
    try {
      const [c, b] = await Promise.allSettled([api.get("/categories"), api.get("/brands")]);
      setCategories(c.status === "fulfilled" ? normalizeList(c.value) : []);
      setBrands(b.status === "fulfilled" ? normalizeList(b.value) : []);
    } catch {
      setCategories([]);
      setBrands([]);
    }
  }, []);

  // fetch produtos
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        pageSize,
        q: q || undefined,
        categoryId: categoryId || undefined,
        brandId: brandId || undefined,
        sortBy: sortBy || undefined,
        sortDir: sortDir || undefined,
        minPrice: minPrice || undefined,
        maxPrice: maxPrice || undefined,
        isActive: isActive === "ALL" ? undefined : isActive === "YES" ? true : false,
        // stockFilter: backend pode não ter — manter apenas no front
      };

      const res = await api.get("/products", { params });
      const list = normalizeList(res).map((p) => ({
        ...p,
        categoryName: p.category?.name ?? p.categoryName ?? p.category ?? "",
        brandName: p.brand?.name ?? p.brandName ?? p.brand ?? "",
      }));
      const totalServer = res?.data?.total ?? list.length;

      // Filtro local por estoque (se escolhido)
      const filteredLocal =
        stockFilter === "ALL"
          ? list
          : stockFilter === "ZERO"
          ? list.filter((x) => Number(x.stock || 0) <= 0)
          : stockFilter === "LOW"
          ? list.filter((x) => Number(x.stock || 0) > 0 && Number(x.stock || 0) <= 5)
          : list.filter((x) => Number(x.stock || 0) > 5);

      setItems(filteredLocal);
      setTotal(totalServer);
      setSelected(new Set());
    } catch (e) {
      console.error("Erro ao buscar produtos:", e);
      toast.error(e?.response?.data?.message || "Não foi possível carregar os produtos.");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, q, categoryId, brandId, minPrice, maxPrice, isActive, sortBy, sortDir, stockFilter]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  /* ---------------- ações ---------------- */
  const openNew = () => {
    setEditing(null);
    setEditOpen(true);
  };
  const openEdit = (row) => {
    setEditing(row);
    setEditOpen(true);
  };
  const closeEdit = () => {
    setEditing(null);
    setEditOpen(false);
  };

  const handleSave = async (data) => {
    // converte valores numéricos
    const payload = {
      name: (data.name || "").trim(),
      price: data.price === "" ? 0 : Number(data.price),
      stock: data.stock === "" ? 0 : Number(data.stock),
      cost: data.cost === "" ? null : Number(data.cost),
      description: data.description || "",
      categoryId: data.categoryId || null,
      brandId: data.brandId || null,
    };

    const isEditing = !!editing?.id;
    const req = isEditing
      ? api.put(`/products/${editing.id}`, payload)
      : api.post("/products", payload);

    await toast.promise(req, {
      loading: isEditing ? "Atualizando produto..." : "Criando produto...",
      success: isEditing ? "Produto atualizado!" : "Produto criado!",
      error: (e) => e?.response?.data?.message || "Não foi possível salvar o produto.",
    });

    closeEdit();
    fetchProducts();
  };

  const askDelete = (row) => {
    setToDelete(row);
    setConfirmOpen(true);
  };
  const cancelDelete = () => {
    setToDelete(null);
    setConfirmOpen(false);
  };
  const confirmDelete = async () => {
    if (!toDelete) return;
    await toast.promise(api.delete(`/products/${toDelete.id}`), {
      loading: "Excluindo produto...",
      success: "Produto excluído!",
      error: (e) => e?.response?.data?.message || "Não foi possível excluir.",
    });
    cancelDelete();
    fetchProducts();
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Excluir ${selected.size} produto(s)?`)) return;

    try {
      // tenta endpoint em massa; se não existir, cai no fallback
      await api.post("/products/bulk-delete", { ids: Array.from(selected) });
      toast.success("Produtos excluídos.");
    } catch {
      // fallback: deleta um a um
      await Promise.allSettled(Array.from(selected).map((id) => api.delete(`/products/${id}`)));
      toast("Alguns itens podem não ter sido removidos.", { icon: "⚠️" });
    } finally {
      setSelected(new Set());
      fetchProducts();
    }
  };

  const toggleActive = async (row) => {
    const id = row.id;
    const next = !(row.isActive === false ? false : true);
    // otimista
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, isActive: next } : p)));
    try {
      // tenta PATCH /products/:id (parcial)
      await api.patch(`/products/${id}`, { isActive: next });
      toast.success(next ? "Produto ativado." : "Produto desativado.");
    } catch {
      // fallback PUT parcial
      try {
        await api.put(`/products/${id}`, { isActive: next });
        toast.success(next ? "Produto ativado." : "Produto desativado.");
      } catch (e2) {
        // volta estado
        setItems((prev) => prev.map((p) => (p.id === id ? { ...p, isActive: !next } : p)));
        toast.error(e2?.response?.data?.message || "Falha ao alterar status.");
      }
    }
  };

  const exportCsv = async () => {
    // tenta endpoint do backend com filtros atuais
    const params = {
      q: q || undefined,
      categoryId: categoryId || undefined,
      brandId: brandId || undefined,
      minPrice: minPrice || undefined,
      maxPrice: maxPrice || undefined,
      isActive: isActive === "ALL" ? undefined : isActive === "YES" ? "1" : "0",
      sortBy,
      sortDir,
    };
    try {
      const { data } = await api.get("/products/export.csv", {
        params,
        responseType: "blob",
      });
      const blob = new Blob([data], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `produtos_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // fallback local com os itens já carregados
      const csv = csvEncode(items);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `produtos_local_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Exportado com base na listagem atual.", { icon: "ℹ️" });
    }
  };

  const importRef = React.useRef(null);
  const importCsv = () => importRef.current?.click();
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    try {
      await toast.promise(
        api.post("/products/import.csv", form, { headers: { "Content-Type": "multipart/form-data" } }),
        {
          loading: "Importando CSV...",
          success: "Importação concluída!",
          error: (er) => er?.response?.data?.message || "Falha ao importar CSV.",
        }
      );
      fetchProducts();
    } finally {
      e.target.value = "";
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const selectedCount = selected.size;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Produtos</h1>
            <p className="text-sm text-gray-600 mt-1">
              Gerencie seu inventário — filtros, importação/exportação, seleção em massa e mais.
            </p>
          </div>
          <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
            <div className="relative w-full sm:w-64">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <SearchIcon />
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome…"
                className="block w-full rounded-lg border border-gray-300 pl-10 py-2 text-sm focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setPage(1);
                  fetchProducts();
                }}
                className="flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg"
              >
                Atualizar
              </button>

              <button
                onClick={exportCsv}
                className="flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg"
                title="Exportar CSV"
              >
                Exportar
              </button>

              <button
                onClick={importCsv}
                className="flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg"
                title="Importar CSV"
              >
                Importar
              </button>
              <input ref={importRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImport} />

              <button
                onClick={openNew}
                className="flex flex-shrink-0 items-center justify-center gap-2 bg-[#8C7F8A] hover:bg-opacity-90 text-white font-semibold py-2 px-5 rounded-lg shadow-sm"
              >
                <AddIcon /> Novo Produto
              </button>
            </div>
          </div>
        </header>

        {/* Filtros avançados */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Categoria (todas)</option>
              {asArray(categories).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={brandId}
              onChange={(e) => {
                setBrandId(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Marca (todas)</option>
              {asArray(brands).map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="ALL">Estoque (todos)</option>
              <option value="OK">Estoque OK (&gt; 5)</option>
              <option value="LOW">Baixo (1–5)</option>
              <option value="ZERO">Sem estoque (0)</option>
            </select>

            <select
              value={isActive}
              onChange={(e) => setIsActive(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="ALL">Status (todos)</option>
              <option value="YES">Ativos</option>
              <option value="NO">Inativos</option>
            </select>

            <input
              type="number"
              placeholder="Preço mín."
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Preço máx."
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="mt-3 flex items-center gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="name">Ordenar por: Nome</option>
              <option value="price">Preço</option>
              <option value="stock">Estoque</option>
              <option value="createdAt">Criação</option>
            </select>
            <select
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="asc">↑ Asc</option>
              <option value="desc">↓ Desc</option>
            </select>

            <div className="ml-auto flex items-center gap-3">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-gray-300 px-2 py-2 text-sm"
              >
                {[8, 12, 16, 24, 32].map((n) => (
                  <option key={n} value={n}>{n} / pág.</option>
                ))}
              </select>

              <button
                onClick={() => {
                  setSearch("");
                  setQ("");
                  setCategoryId("");
                  setBrandId("");
                  setStockFilter("ALL");
                  setIsActive("ALL");
                  setMinPrice("");
                  setMaxPrice("");
                  setSortBy("name");
                  setSortDir("asc");
                  setPage(1);
                }}
                className="px-3 py-2 text-sm rounded-lg bg-white border border-gray-300 hover:bg-gray-50"
              >
                Limpar filtros
              </button>
            </div>
          </div>
        </div>

        {/* Barra de ações em massa */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">
            {loading ? "Carregando…" : `${items.length} de ${total} produto(s)`}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={bulkDelete}
              disabled={selectedCount === 0}
              className="px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
              title="Excluir selecionados"
            >
              Excluir selecionados ({selectedCount})
            </button>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <p className="text-center text-gray-500 py-10">Carregando produtos...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {items.map((row) => (
                <ProductCard
                  key={row.id}
                  product={row}
                  selected={selected.has(row.id)}
                  onToggleSelect={() => toggleSelect(row.id)}
                  onToggleActive={() => toggleActive(row)}
                  onEdit={() => openEdit(row)}
                  onDelete={() => askDelete(row)}
                />
              ))}
            </div>
            {!items.length && (
              <div className="text-center py-16">
                <h3 className="text-xl font-semibold text-gray-800">Nenhum produto encontrado</h3>
                <p className="text-gray-500 mt-2">Ajuste os filtros ou adicione um novo produto.</p>
              </div>
            )}
          </>
        )}

        {/* Paginação */}
        <div className="mt-6 flex items-center justify-center gap-2 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-2 py-1 border rounded disabled:opacity-50"
          >
            ⟨
          </button>
          <span>Página {page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
            disabled={page >= totalPages}
            className="px-2 py-1 border rounded disabled:opacity-50"
          >
            ⟩
          </button>
        </div>

        {/* Modal: formulário */}
        <ModalShell
          isOpen={editOpen}
          onClose={closeEdit}
          title={editing ? "Editar Produto" : "Novo Produto"}
        >
          <ProductForm
            initialData={editing}
            onSave={handleSave}
            onCancel={closeEdit}
          />
        </ModalShell>

        {/* Modal: confirmar delete */}
        <ModalShell
          isOpen={confirmOpen}
          onClose={cancelDelete}
          title="Confirmar exclusão"
          width="max-w-md"
        >
          <p className="text-gray-700">
            Tem certeza que deseja excluir <strong>{toDelete?.name}</strong>? Essa ação não pode ser desfeita.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={cancelDelete} className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50">
              Cancelar
            </button>
            <button onClick={confirmDelete} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">
              Excluir
            </button>
          </div>
        </ModalShell>
      </div>
    </div>
  );
}
