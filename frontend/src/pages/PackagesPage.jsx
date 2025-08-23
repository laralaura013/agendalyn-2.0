// src/pages/PackagesPage.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  Package,
  Search,
  Loader2,
  Users,
  Tag,
  CalendarDays,
  X,
  CheckCircle2,
  ShoppingCart,
  ChevronDown,
  Keyboard,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

/* =========================================================================
 * Helpers
 * ========================================================================= */
const toBRL = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const safe = (s) => (s == null ? '' : String(s));

/* =========================================================================
 * CommandItem (linha de cliente)
 * ========================================================================= */
function CommandItem({ item, active, onClick }) {
  const initials = safe(item.name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-xl transition
        ${active ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/70'}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white grid place-items-center text-xs font-bold">
          {initials || 'C'}
        </div>
        <div className="min-w-0">
          <div className="font-medium truncate">{safe(item.name) || '(Sem nome)'}</div>
          <div className="text-xs text-zinc-500 truncate">
            {safe(item.phone)} {item.email ? `• ${item.email}` : ''}
          </div>
        </div>
      </div>
    </button>
  );
}

/* =========================================================================
 * SellPackageModal — estilo command palette (Command-K)
 * ========================================================================= */
function SellPackageModal({ open, onClose, pkg, onSold }) {
  const [q, setQ] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [clients, setClients] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [isSelling, setIsSelling] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Debounce
  const [debouncedQ, setDebouncedQ] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const fetchClients = useCallback(async (term) => {
    try {
      setIsSearching(true);
      const res = await api.get('/clients/select', { params: { q: term || '', take: 50 } });
      const arr = Array.isArray(res.data) ? res.data : [];
      setClients(arr);
      setActiveIndex(0);
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível carregar clientes.');
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Carregar quando abre / quando muda a busca
  useEffect(() => {
    if (open) fetchClients(debouncedQ);
  }, [open, debouncedQ, fetchClients]);

  // Foco no input ao abrir
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else {
      setQ('');
      setSelected(null);
      setClients([]);
      setActiveIndex(0);
      setIsSelling(false);
    }
  }, [open]);

  // Keyboard nav
  const onKeyDown = (e) => {
    if (e.key === 'Escape') return onClose?.();
    if (!clients.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, clients.length - 1));
      listRef.current?.children?.[Math.min(activeIndex + 1, clients.length - 1)]?.scrollIntoView({
        block: 'nearest',
      });
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      listRef.current?.children?.[Math.max(activeIndex - 1, 0)]?.scrollIntoView({ block: 'nearest' });
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const c = clients[activeIndex];
      if (c) setSelected(c);
    }
  };

  const confirmSell = async () => {
    if (!selected?.id) {
      toast.error('Selecione um cliente.');
      return;
    }
    setIsSelling(true);
    try {
      // rota principal
      try {
        await api.post('/client-packages', {
          clientId: selected.id,
          packageId: pkg.id,
        });
      } catch (err) {
        // fallback
        if (err?.response?.status === 404) {
          await api.post('/packages/sell', {
            clientId: selected.id,
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
      console.error(err);
      const msg =
        err?.response?.data?.message || err?.message || 'Não foi possível concluir a venda do pacote.';
      toast.error(msg);
    } finally {
      setIsSelling(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onKeyDown={onKeyDown}>
      {/* Backdrop com blur */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden
                      bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/20 dark:border-white/10">
        {/* Header */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-violet-600" />
              <h3 className="font-semibold text-lg">Vender pacote</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Pacote selecionado */}
          <div className="mt-4 rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 p-4 bg-white/60 dark:bg-zinc-900/60">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold truncate">{pkg?.name}</div>
                <div className="text-xs text-zinc-500 flex items-center gap-2 mt-1">
                  <Tag className="w-4 h-4" />
                  {toBRL(pkg?.price)}{' '}
                  {pkg?.validityDays ? (
                    <>
                      <span className="mx-1">•</span>
                      <CalendarDays className="w-4 h-4" />
                      <span>Validade: {pkg.validityDays} dias</span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search / List */}
        <div className="px-6 pt-4 pb-2">
          <label className="text-sm font-medium flex items-center gap-2 mb-2">
            <Users className="w-4 h-4" />
            Selecionar cliente
          </label>

          <div className="relative">
            <div className="flex items-center gap-2 rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70
                            bg-white/70 dark:bg-zinc-900/70 px-3 py-2">
              <Search className="w-4 h-4 shrink-0" />
              <input
                ref={inputRef}
                className="w-full bg-transparent outline-none text-sm"
                placeholder="Nome, e-mail, telefone ou CPF…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Buscar cliente"
              />
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            </div>

            <div
              className="mt-2 max-h-64 overflow-y-auto rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70
                         bg-white/70 dark:bg-zinc-900/70 p-1"
              ref={listRef}
            >
              {clients.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-zinc-500">
                  {isSearching ? 'Carregando…' : 'Nenhum cliente encontrado.'}
                </div>
              ) : (
                clients.map((c, i) => (
                  <CommandItem
                    key={c.id}
                    item={c}
                    active={i === activeIndex}
                    onClick={() => setSelected(c)}
                  />
                ))
              )}
            </div>

            {/* Selecionado */}
            {selected ? (
              <div className="mt-2 flex items-center justify-between rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 px-3 py-2">
                <div className="text-sm">
                  <div className="font-medium">{selected.name}</div>
                  <div className="text-zinc-500 text-xs">
                    {selected.phone} {selected.email ? `• ${selected.email}` : ''}
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-xs px-2 py-1 rounded-lg border dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Trocar
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200/70 dark:border-zinc-800/70 flex items-center justify-between">
          <div className="hidden md:flex items-center gap-2 text-xs text-zinc-500">
            <Keyboard className="w-4 h-4" />
            <span>
              Navegue com <kbd className="px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800/70">↑</kbd>/
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800/70">↓</kbd> e confirme com{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800/70">Enter</kbd>
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
              disabled={isSelling}
            >
              Cancelar
            </button>
            <button
              onClick={confirmSell}
              disabled={!selected || isSelling}
              className="px-4 py-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60 flex items-center gap-2 transition"
            >
              {isSelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirmar venda
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
 * PackagesPage
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

  const onSold = () => fetchPackages();

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
      <div className="mb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Package className="w-6 h-6 text-violet-600" />
          <h1 className="text-xl md:text-2xl font-semibold">Pacotes</h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="flex items-center gap-2 border dark:border-zinc-800 rounded-2xl px-3 py-2">
              <Search className="w-4 h-4" />
              <input
                className="bg-transparent outline-none text-sm w-64"
                placeholder="Buscar pacote…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-3xl border dark:border-zinc-800 p-4 h-40 animate-pulse bg-white/50 dark:bg-zinc-900/50" />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full rounded-3xl border dark:border-zinc-800 p-8 text-center text-zinc-500">
            Nenhum pacote encontrado.
          </div>
        ) : (
          filtered.map((pkg) => (
            <div
              key={pkg.id}
              className="rounded-3xl border dark:border-zinc-800 p-5 flex flex-col gap-4 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm"
            >
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

              <div className="mt-auto flex items-center justify-end">
                <button
                  onClick={() => openSell(pkg)}
                  className="px-3 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:opacity-90 transition flex items-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Vender
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      <SellPackageModal
        open={sellOpen}
        onClose={() => setSellOpen(false)}
        pkg={currentPkg}
        onSold={onSold}
      />
    </div>
  );
}
