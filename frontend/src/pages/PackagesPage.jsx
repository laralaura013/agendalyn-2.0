// src/pages/PackagesPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Package,
  Plus,
  Search,
  Loader2,
  Users,
  Tag,
  CalendarDays,
  ChevronDown,
  X,
  CheckCircle2,
  ShoppingCart,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

/* =========================================================================
 * Helpers
 * ========================================================================= */
const toBRL = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const safeStr = (s) => (s == null ? '' : String(s));

/* =========================================================================
 * SellPackageModal
 * - Busca clientes em /api/clients/select?q=
 * - Seleciona um cliente e confirma a venda
 * - Faz POST criando a relação do pacote com o cliente
 *   (tenta /api/client-packages e faz fallback para /api/packages/sell)
 * ========================================================================= */
function SellPackageModal({ open, onClose, pkg, onSold }) {
  const [q, setQ] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isSelling, setIsSelling] = useState(false);

  // Debounce
  const [debouncedQ, setDebouncedQ] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const fetchClients = useCallback(
    async (term) => {
      try {
        setIsSearching(true);
        const res = await api.get('/clients/select', {
          params: { q: term || '', take: 50 },
        });
        setClients(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Erro ao buscar clientes para select:', err);
        toast.error('Não foi possível carregar clientes.');
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  // Carregar lista inicial + quando o usuário digitar (debounced)
  useEffect(() => {
    if (open) fetchClients(debouncedQ);
  }, [open, debouncedQ, fetchClients]);

  // Limpar estado ao abrir/fechar
  useEffect(() => {
    if (!open) {
      setQ('');
      setSelectedClient(null);
      setClients([]);
      setIsSelling(false);
    }
  }, [open]);

  const confirmSell = async () => {
    if (!selectedClient?.id) {
      toast.error('Selecione um cliente.');
      return;
    }
    setIsSelling(true);
    try {
      // 1) Tenta criar o vínculo cliente-pacote em rota mais direta
      try {
        await api.post('/client-packages', {
          clientId: selectedClient.id,
          packageId: pkg.id,
        });
      } catch (err) {
        // 2) Fallback: alguns projetos usam /packages/sell
        if (err?.response?.status === 404) {
          await api.post('/packages/sell', {
            clientId: selectedClient.id,
            packageId: pkg.id,
          });
        } else {
          throw err;
        }
      }

      toast.success('Pacote vendido com sucesso!');
      onSold?.();
      onClose?.();
    } catch (err) {
      console.error('Erro ao vender pacote:', err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Não foi possível concluir a venda do pacote.';
      toast.error(msg);
    } finally {
      setIsSelling(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            <h3 className="font-semibold">Vender pacote</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Pacote */}
          <div className="rounded-xl border dark:border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <Package className="w-4 h-4" />
              Pacote selecionado
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-semibold">{pkg?.name}</div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  {pkg?.servicesCount ? `${pkg.servicesCount} serviços` : 'Pacote'}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{toBRL(pkg?.price)}</div>
                {pkg?.validityDays ? (
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    Validade: {pkg.validityDays} dias
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Buscar cliente */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Selecionar cliente
            </label>

            <div className="relative">
              <div className="flex items-center gap-2 border dark:border-zinc-800 rounded-xl px-3 py-2">
                <Search className="w-4 h-4 shrink-0" />
                <input
                  className="w-full bg-transparent outline-none text-sm"
                  placeholder="Nome, e-mail, telefone ou CPF…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              </div>

              {/* Lista dropdown */}
              <div className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-xl border dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow">
                {clients.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-zinc-500">Nenhum cliente encontrado</div>
                ) : (
                  clients.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedClient(c)}
                      className="w-full text-left px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      <div className="font-medium">{safeStr(c.name) || '(Sem nome)'}</div>
                      <div className="text-xs text-zinc-500">
                        {safeStr(c.phone)} {c.email ? `• ${c.email}` : ''}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Selecionado */}
            {selectedClient ? (
              <div className="flex items-center justify-between rounded-xl border dark:border-zinc-800 p-3">
                <div className="text-sm">
                  <div className="font-medium">{selectedClient.name}</div>
                  <div className="text-zinc-500 text-xs">
                    {selectedClient.phone} {selectedClient.email ? `• ${selectedClient.email}` : ''}
                  </div>
                </div>
                <button
                  className="text-xs px-2 py-1 rounded-lg border dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  onClick={() => setSelectedClient(null)}
                >
                  Trocar
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="px-5 py-4 border-t dark:border-zinc-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            disabled={isSelling}
          >
            Cancelar
          </button>
          <button
            onClick={confirmSell}
            disabled={!selectedClient || isSelling}
            className="px-4 py-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60 flex items-center gap-2"
          >
            {isSelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Confirmar venda
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
 * PackagesPage
 * - Lista pacotes
 * - Abre modal de venda (SellPackageModal)
 * ========================================================================= */
export default function PackagesPage() {
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState([]);
  const [q, setQ] = useState('');
  const [sellOpen, setSellOpen] = useState(false);
  const [currentPkg, setCurrentPkg] = useState(null);

  const fetchPackages = useCallback(async () => {
    try {
      setLoading(true);
      // ajuste o endpoint conforme seu backend (/api/packages)
      const res = await api.get('/packages', { params: { q } });
      setPackages(Array.isArray(res.data) ? res.data : res.data?.items || []);
    } catch (err) {
      console.error('Erro ao carregar pacotes:', err);
      toast.error('Erro ao carregar pacotes.');
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const openSell = (pkg) => {
    setCurrentPkg(pkg);
    setSellOpen(true);
  };

  const onSold = () => {
    // se quiser, recarrega contadores/estatísticas do pacote
    fetchPackages();
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return packages;
    return packages.filter((p) =>
      [p?.name, String(p?.price)].some((f) => String(f || '').toLowerCase().includes(term))
    );
  }, [packages, q]);

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Package className="w-6 h-6" />
          <h1 className="text-xl md:text-2xl font-semibold">Pacotes</h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="flex items-center gap-2 border dark:border-zinc-800 rounded-xl px-3 py-2">
              <Search className="w-4 h-4" />
              <input
                className="bg-transparent outline-none text-sm w-64"
                placeholder="Buscar pacote…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
          {/* Botão de novo pacote (se existir fluxo de criação) */}
          {/* <button className="px-3 py-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Novo
          </button> */}
        </div>
      </div>

      {/* Lista */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border dark:border-zinc-800 p-4 animate-pulse h-40"
            />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full rounded-2xl border dark:border-zinc-800 p-8 text-center text-zinc-500">
            Nenhum pacote encontrado.
          </div>
        ) : (
          filtered.map((pkg) => (
            <div
              key={pkg.id}
              className="rounded-2xl border dark:border-zinc-800 p-4 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-semibold text-lg">{pkg.name}</div>
                  <div className="text-sm text-zinc-500 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    {toBRL(pkg.price)}
                  </div>
                  {pkg.validityDays ? (
                    <div className="text-xs text-zinc-500 flex items-center gap-1">
                      <CalendarDays className="w-4 h-4" />
                      Validade: {pkg.validityDays} dias
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Ações */}
              <div className="mt-auto flex items-center justify-end gap-2">
                <button
                  onClick={() => openSell(pkg)}
                  className="px-3 py-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700 flex items-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Vender
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de venda */}
      <SellPackageModal
        open={sellOpen}
        onClose={() => setSellOpen(false)}
        pkg={currentPkg}
        onSold={onSold}
      />
    </div>
  );
}
