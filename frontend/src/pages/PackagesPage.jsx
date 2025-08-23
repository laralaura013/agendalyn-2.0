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
    if (!clientId) {
      toast.error("Selecione um cliente.");
      return;
    }
    if (!pkg?.id) return;
    setSaving(true);
    try {
      // rota principal
      try {
        await api.post("/client-packages", {
          clientId,
          packageId: pkg.id,
          paymentMethod: payment,
        });
      } catch (err) {
        // fallback se seu backend usa outro endpoint
        if (err?.response?.status === 404) {
          await api.post("/packages/sell", {
            clientId,
            packageId: pkg.id,
            paymentMethod: payment,
          });
        } else {
          throw err;
        }
      }
      toast.success("Pacote vendido com sucesso!");
      onSold?.();
      onClose?.();
    } catch (e) {
      console.error(e);
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
        className="relative w-full max-w-md rounded-2xl bg-cape-cod text-mercury shadow-card p-6 border border-tundora"
      >
        {/* fechar */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 p-2 rounded-full hover:bg-white/10"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-center text-2xl font-extrabold mb-6">Confirmar Venda</h3>

        {/* resumo do pacote */}
        <div className="rounded-xl bg-shark border border-tundora p-4 text-center mb-6">
          <div className="text-venus font-semibold">{pkg?.name}</div>
          <div className="text-2xl font-extrabold mt-1">Valor: {toBRL(pkg?.price)}</div>
        </div>

        {/* cliente */}
        <div className="mb-5">
          <label className="block text-sm font-medium mb-2 text-dove-gray">Cliente</label>
          <div className="relative">
            <div className="flex items-center gap-2 rounded-lg border border-venus/40 bg-shark px-3 py-2">
              <Search className="w-4 h-4 text-dove-gray" />
              <input
                ref={inputRef}
                className="w-full bg-transparent outline-none text-sm placeholder:text-dove-gray"
                placeholder="Nome, e-mail, telefone ou CPF…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              {loadingClients ? (
                <Loader2 className="w-4 h-4 animate-spin text-dove-gray" />
              ) : null}
            </div>

            {/* dropdown */}
            <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-tundora bg-shark">
              {clients.length === 0 ? (
                <div className="px-3 py-3 text-sm text-dove-gray">
                  {loadingClients ? "Carregando…" : "Nenhum cliente encontrado"}
                </div>
              ) : (
                clients.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setClientId(c.id)}
                    className={`w-full text-left px-3 py-2 hover:bg-white/5 ${
                      clientId === c.id ? "ring-2 ring-venus/50" : ""
                    }`}
                  >
                    <div className="font-medium text-mercury">
                      {safe(c.name) || "(Sem nome)"}
                    </div>
                    <div className="text-xs text-dove-gray">
                      {safe(c.phone)} {c.email ? `• ${c.email}` : ""}
                    </div>
                  </button>
                ))
              )}
            </div>
            {clientId ? (
              <div className="mt-2 text-xs text-venus flex items-center gap-1">
                <BadgeCheck className="w-4 h-4" /> Cliente selecionado
              </div>
            ) : null}
          </div>
        </div>

        {/* forma de pagamento */}
        <div className="mb-2">
          <label className="block text-sm font-medium mb-2 text-dove-gray">
            Forma de Pagamento
          </label>
          <div className="relative">
            <div className="flex items-center gap-2 rounded-lg border border-tundora bg-shark px-3 py-2">
              <CreditCard className="w-4 h-4 text-dove-gray" />
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
            className="w-full rounded-lg bg-tundora hover:bg-scarpa-flow px-4 py-3 font-medium text-mercury disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            onClick={confirm}
            disabled={!clientId || saving}
            className="w-full rounded-lg bg-nandor hover:bg-scarpa-flow px-4 py-3 font-semibold text-mercury flex items-center justify-center gap-2 disabled:opacity-60"
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
   Card do pacote
   ========================= */
function PackageCard({ item, onSelect }) {
  return (
    <div className="bg-cape-cod rounded-2xl shadow-card p-8 flex flex-col border border-tundora hover:scale-[1.02] hover:shadow-lg transition-all duration-300">
      <div className="flex-grow">
        <h2 className="text-2xl font-bold mb-1 text-venus">{item.name}</h2>
        <p className="text-4xl font-extrabold mb-4 text-mercury">{toBRL(item.price)}</p>
        <p className="text-sm text-dove-gray mb-6 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-venus" />
          {item.validityDays ? `Validade: ${item.validityDays} dias` : "Validade: —"}
        </p>

        <ul className="space-y-3 text-mercury/90">
          {(item.features?.length ? item.features : item.services?.map((s) => s.name) || [])
            .slice(0, 6)
            .map((f, i) => (
              <li key={i} className="flex items-center">
                <Check className="w-5 h-5 text-nandor mr-2" />
                {f}
              </li>
            ))}
        </ul>
      </div>

      <button
        onClick={onSelect}
        className="mt-8 w-full rounded-lg bg-venus hover:bg-mantle text-shark font-bold py-3 px-6 transition-colors duration-300 flex items-center justify-center gap-2"
      >
        <ShoppingCart className="w-5 h-5" />
        Selecionar Pacote
      </button>
    </div>
  );
}

/* =========================
   Página
   ========================= */
export default function PackagesPage() {
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState([]);
  const [sellOpen, setSellOpen] = useState(false);
  const [currentPkg, setCurrentPkg] = useState(null);

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
      console.error(e);
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

  const onSold = () => {
    fetchPackages();
  };

  return (
    <div className="min-h-screen bg-shark text-mercury">
      <div className="container mx-auto px-4 py-12">
        {/* header */}
        <header className="text-center mb-12">
          <h1
            className="text-4xl md:text-5xl font-extrabold mb-2 bg-clip-text text-transparent"
            style={{
              backgroundImage: "linear-gradient(90deg, #e1e1e1, #8c9491)",
            }}
          >
            Pacotes de Serviços
          </h1>
          <p className="text-lg text-dove-gray">
            Escolha o plano ideal para suas necessidades.
          </p>
        </header>

        {/* grid de pacotes */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-80 rounded-2xl bg-cape-cod border border-tundora animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {packages.map((p) => (
              <PackageCard key={p.id} item={p} onSelect={() => onSelect(p)} />
            ))}
          </div>
        )}
      </div>

      {/* modal de venda */}
      <SellModal
        open={sellOpen}
        onClose={() => setSellOpen(false)}
        pkg={currentPkg}
        onSold={onSold}
      />
    </div>
  );
}
