// src/pages/PackagesPage.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ShoppingCart,
  X,
  Search,
  Loader2,
  CreditCard,
  BadgeCheck,
  CalendarDays,
  PlusCircle,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";

/* helpers */
const toBRL = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const safe = (s) => (s == null ? "" : String(s));

/* =========================
   Modal de venda (cliente + pagamento)
   ========================= */
function SellModal({ open, onClose, pkg, onSold }) {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [loadingClients, setLoadingClients] = useState(false);
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState("");
  const [payment, setPayment] = useState("DINHEIRO");
  const [saving, setSaving] = useState(false);

  const modalRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const fetchClients = useCallback(
    async (term) => {
      if (!open) return;
      try {
        setLoadingClients(true);
        const res = await api.get("/clients/select", {
          params: { q: term || "", take: 50 },
        });
        setClients(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error(e);
        toast.error("Não foi possível carregar clientes.");
      } finally {
        setLoadingClients(false);
      }
    },
    [open]
  );

  useEffect(() => {
    fetchClients(debouncedQ);
  }, [debouncedQ, fetchClients]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setQ("");
      setClients([]);
      setClientId("");
      setPayment("DINHEIRO");
      setSaving(false);
    }
  }, [open]);

  // fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) onClose?.();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  const confirm = async () => {
    if (!clientId) return toast.error("Selecione um cliente.");
    if (!pkg?.id) return;

    setSaving(true);
    try {
      await api.post("/client-packages", {
        clientId,
        packageId: pkg.id,
        paymentMethod: payment,
      });
      toast.success("Pacote vendido com sucesso!");
      onSold?.();
      onClose?.();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Erro ao confirmar venda.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        ref={modalRef}
        className="relative w-full max-w-md rounded-2xl bg-white text-gray-900 shadow-2xl p-6"
      >
        {/* fechar */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 p-2 rounded-full hover:bg-gray-100"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-center text-2xl font-extrabold mb-6">Confirmar Venda</h3>

        {/* resumo do pacote */}
        <div className="rounded-xl bg-gray-100 border border-gray-200 p-4 text-center mb-6">
          <div className="text-gray-600 font-semibold">{pkg?.name}</div>
          <div className="text-2xl font-extrabold mt-1">Valor: {toBRL(pkg?.price)}</div>
        </div>

        {/* cliente */}
        <div className="mb-5">
          <label className="block text-sm font-medium mb-2 text-gray-700">Cliente</label>
          <div className="relative">
            <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                className="w-full bg-transparent outline-none text-sm placeholder:text-gray-400"
                placeholder="Nome, e-mail, telefone ou CPF…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              {loadingClients ? (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              ) : null}
            </div>

            <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white">
              {clients.length === 0 ? (
                <div className="px-3 py-3 text-sm text-gray-500">
                  {loadingClients ? "Carregando…" : "Nenhum cliente encontrado"}
                </div>
              ) : (
                clients.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setClientId(c.id)}
                    className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${
                      clientId === c.id ? "bg-gray-200" : ""
                    }`}
                  >
                    <div className="font-medium">{safe(c.name) || "(Sem nome)"}</div>
                    <div className="text-xs text-gray-500">
                      {safe(c.phone)} {c.email ? `• ${c.email}` : ""}
                    </div>
                  </button>
                ))
              )}
            </div>
            {clientId ? (
              <div className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                <BadgeCheck className="w-4 h-4" /> Cliente selecionado
              </div>
            ) : null}
          </div>
        </div>

        {/* forma de pagamento */}
        <div className="mb-2">
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Forma de Pagamento
          </label>
          <div className="relative">
            <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
              <CreditCard className="w-4 h-4 text-gray-400" />
              <select
                className="w-full bg-transparent outline-none text-sm"
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
              >
                <option value="DINHEIRO">Dinheiro</option>
                <option value="CREDITO">Cartão de Crédito</option>
                <option value="DEBITO">Cartão de Débito</option>
                <option value="PIX">Pix</option>
              </select>
            </div>
          </div>
        </div>

        {/* ações */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="w-full rounded-lg bg-gray-200 hover:bg-gray-300 px-4 py-3 font-medium disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            onClick={confirm}
            disabled={!clientId || saving}
            className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60 text-white"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            Confirmar Venda
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Modal: Criar Pacote
   ========================= */
function CreatePackageModal({ open, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [validity, setValidity] = useState("");
  const [features, setFeatures] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setPrice("");
      setValidity("");
      setFeatures("");
      setSaving(false);
    }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!name || !price) return toast.error("Informe nome e preço.");

    setSaving(true);
    try {
      const body = {
        name,
        price: Number(price),
        validityDays: validity ? Number(validity) : null,
        features: features
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      await api.post("/packages", body);
      toast.success("Pacote criado!");
      onCreated?.();
      onClose?.();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Erro ao criar pacote.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" />
      <form
        onSubmit={submit}
        className="relative w-full max-w-lg rounded-2xl bg-white text-gray-900 shadow-2xl p-6"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 p-2 rounded-full hover:bg-gray-100"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-2xl font-extrabold mb-6">Criar Pacote</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Kit Beleza"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preço</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Ex.: 60.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Validade (dias)
            </label>
            <input
              type="number"
              min="0"
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              value={validity}
              onChange={(e) => setValidity(e.target.value)}
              placeholder="Ex.: 30"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Benefícios (separe por vírgula)
            </label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              placeholder="Corte de Cabelo, Manicure & Pedicure, Design de Sobrancelha"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-gray-200 hover:bg-gray-300 px-4 py-2"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 font-semibold disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "Salvando..." : "Criar"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* =========================
   Modal: Confirmar Exclusão
   ========================= */
function DeletePackagesModal({ open, onClose, ids = [], onDeleted }) {
  const [deleting, setDeleting] = useState(false);

  const doDelete = async () => {
    if (!ids.length) return onClose?.();
    setDeleting(true);
    try {
      await Promise.all(ids.map((id) => api.delete(`/packages/${id}`)));
      toast.success(ids.length > 1 ? "Pacotes excluídos." : "Pacote excluído.");
      onDeleted?.();
      onClose?.();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Erro ao excluir.";
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full max-w-md rounded-2xl bg-white text-gray-900 shadow-2xl p-6">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 p-2 rounded-full hover:bg-gray-100"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-2xl font-extrabold mb-2">Excluir pacote{ids.length > 1 ? "s" : ""}</h3>
        <p className="text-gray-600">
          Tem certeza que deseja excluir {ids.length} pacote{ids.length > 1 ? "s" : ""}? Esta
          ação não pode ser desfeita.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-200 hover:bg-gray-300 px-4 py-2"
            disabled={deleting}
          >
            Cancelar
          </button>
          <button
            onClick={doDelete}
            className="rounded-lg bg-red-600 hover:bg-red-700 text-white px-4 py-2 font-semibold disabled:opacity-60"
            disabled={deleting}
          >
            {deleting ? "Excluindo..." : "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= Card ================= */
function PackageCard({ item, onSelect, selected, toggleSelected }) {
  return (
    <div className="relative bg-gray-100 rounded-2xl shadow-md p-8 flex flex-col border border-gray-200 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
      {/* checkbox seleção */}
      <label className="absolute left-4 top-4 flex items-center gap-2 select-none">
        <input
          type="checkbox"
          className="h-4 w-4 accent-emerald-600"
          checked={selected}
          onChange={() => toggleSelected(item.id)}
        />
        <span className="text-xs text-gray-600">Selecionar</span>
      </label>

      <div className="flex-grow">
        <h2 className="text-2xl font-bold mb-1 text-gray-800">{item.name}</h2>
        <p className="text-4xl font-extrabold mb-4 text-gray-900">{toBRL(item.price)}</p>
        <p className="text-sm text-gray-500 mb-6 flex items-center gap-2">
          <CalendarDays className="w-4 h-4" />
          {item.validityDays ? `Validade: ${item.validityDays} dias` : "Validade: —"}
        </p>

        <ul className="space-y-3 text-gray-700">
          {(item.features?.length ? item.features : item.services?.map((s) => s.name) || [])
            .slice(0, 6)
            .map((f, i) => (
              <li key={i} className="flex items-center">
                <Check className="w-5 h-5 text-emerald-500 mr-2" />
                {f}
              </li>
            ))}
        </ul>
      </div>

      <button
        onClick={onSelect}
        className="mt-8 w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2"
      >
        <ShoppingCart className="w-5 h-5" />
        Selecionar Pacote
      </button>
    </div>
  );
}

/* ================= Página ================= */
export default function PackagesPage() {
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState([]);
  const [sellOpen, setSellOpen] = useState(false);
  const [currentPkg, setCurrentPkg] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const fetchPackages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/packages");
      const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
      const normalized = list.map((p) => ({
        ...p,
        features:
          p.features ||
          p.exampleFeatures || [
            "Corte de Cabelo",
            "Manicure & Pedicure",
            "Design de Sobrancelha",
          ],
      }));
      setPackages(normalized);
    } catch (e) {
      toast.error("Erro ao carregar pacotes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const onSelect = (pkg) => {
    setCurrentPkg(pkg);
    setSellOpen(true);
  };

  const toggleSelected = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const openDelete = () => {
    if (!selectedIds.length) return toast.error("Selecione pelo menos um pacote.");
    setDeleteOpen(true);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Botões de ação */}
        <div className="flex justify-end mb-8 gap-3">
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            <PlusCircle className="w-5 h-5" />
            Criar Pacote
          </button>
          <button
            onClick={openDelete}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-60"
            disabled={!selectedIds.length}
          >
            <Trash2 className="w-5 h-5" />
            Excluir Pacote{selectedIds.length > 1 ? "s" : ""}
          </button>
        </div>

        {/* Grid de pacotes */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-80 rounded-2xl bg-gray-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {packages.map((p) => (
              <PackageCard
                key={p.id}
                item={p}
                onSelect={() => onSelect(p)}
                selected={selectedIds.includes(p.id)}
                toggleSelected={toggleSelected}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modais */}
      <SellModal
        open={sellOpen}
        onClose={() => setSellOpen(false)}
        pkg={currentPkg}
        onSold={fetchPackages}
      />

      <CreatePackageModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={fetchPackages}
      />

      <DeletePackagesModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        ids={selectedIds}
        onDeleted={() => {
          setSelectedIds([]);
          fetchPackages();
        }}
      />
    </div>
  );
}
