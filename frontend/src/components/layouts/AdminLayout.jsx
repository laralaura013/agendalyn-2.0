import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, LogOut, Moon, Sun } from 'lucide-react';
import Sidebar from '../dashboard/Sidebar';
import "../../styles/neumorphism.css";

/** Título dinâmico por rota */
function usePageTitle() {
  const { pathname } = useLocation();
  const title = useMemo(() => {
    const table = [
      { re: /^\/dashboard$/, label: 'Dashboard' },
      { re: /^\/dashboard\/schedule/, label: 'Agenda' },
      { re: /^\/dashboard\/orders/, label: 'Comandas' },
      { re: /^\/dashboard\/clients(\/|$)/, label: 'Clientes' },
      { re: /^\/dashboard\/cashier/, label: 'Caixa' },
      { re: /^\/dashboard\/staff/, label: 'Colaboradores' },
      { re: /^\/dashboard\/services/, label: 'Serviços' },
      { re: /^\/dashboard\/products/, label: 'Produtos' },
      { re: /^\/dashboard\/categories/, label: 'Categorias' },
      { re: /^\/dashboard\/brands/, label: 'Marcas' },
      { re: /^\/dashboard\/packages/, label: 'Pacotes' },
      { re: /^\/dashboard\/anamnesis/, label: 'Anamneses' },
      { re: /^\/dashboard\/waitlist/, label: 'Lista de Espera' },
      { re: /^\/dashboard\/reports(\/|$)/, label: 'Relatórios' },
      { re: /^\/dashboard\/reports\/birthdays/, label: 'Aniversariantes' },
      { re: /^\/dashboard\/reports\/cashflow/, label: 'Fluxo de Caixa' },
      { re: /^\/dashboard\/payables/, label: 'Contas a Pagar' },
      { re: /^\/dashboard\/receivables/, label: 'Contas a Receber' },
      { re: /^\/dashboard\/finance-categories/, label: 'Categorias Financeiras' },
      { re: /^\/dashboard\/suppliers/, label: 'Fornecedores' },
      { re: /^\/dashboard\/payment-methods/, label: 'Formas de Pagamento' },
      { re: /^\/dashboard\/goals/, label: 'Metas' },
      { re: /^\/dashboard\/settings/, label: 'Configurações' },
      { re: /^\/settings$/, label: 'Configurações' },
    ];
    const found = table.find((t) => t.re.test(pathname));
    return found ? found.label : 'Dashboard';
  }, [pathname]);
  return title;
}

const THEME_KEY = 'agendalyn:theme';

export default function AdminLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const navigate = useNavigate();
  const title = usePageTitle();

  useEffect(() => {
    document.title = `${title} · Agendalyn`;
  }, [title]);

  // aplica tema no <html data-theme="..."> e avisa a app
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    window.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  const handleLogout = useCallback(() => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('clientToken');
    } catch {}
    navigate('/portal/login/cmdep95530000pspaolfy7dod');
  }, [navigate]);

  const isDark = theme === 'dark';

  return (
    <div className="relative min-h-screen flex" style={{ background: "var(--bg-color)" }}>
      <Sidebar
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex-shrink-0 flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="neumorphic w-full h-12 flex items-center justify-between px-3 rounded-2xl">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden"
              aria-label="Abrir menu"
              title="Menu"
            >
              <Menu size={22} />
            </button>

            <div className="hidden md:block">
              <h1 className="text-[var(--text-color)] text-[17px] font-semibold">{title}</h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="neumorphic-interactive px-3 py-2 rounded-xl text-[var(--text-color)]"
                aria-pressed={isDark}
                aria-label={isDark ? "Trocar para tema claro" : "Trocar para tema escuro"}
                title={isDark ? "Tema claro" : "Tema escuro"}
              >
                <span className="inline-flex items-center gap-2">
                  {isDark ? <Sun size={16} /> : <Moon size={16} />}
                  <span className="hidden sm:inline">{isDark ? "Claro" : "Escuro"}</span>
                </span>
              </button>

              <button
                onClick={handleLogout}
                className="neumorphic-interactive px-3 py-2 rounded-xl text-[var(--text-color)]"
              >
                <span className="inline-flex items-center gap-2">
                  <LogOut size={16} />
                  <span>Sair</span>
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* Corpo */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="neumorphic rounded-3xl p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
