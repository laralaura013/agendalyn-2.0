// frontend/src/components/mobile/Menu.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  Users,
  Wallet,
  Briefcase,
  Package,
  Tag,
  Archive,
  FileText,
  List,
  Receipt,
  CreditCard,
  Banknote,
  Building2,
  BarChart3,
  Gift,
  Settings,
  LogOut,
  Layers,
} from "lucide-react";


import { asArray } from '../utils/asArray';
/**
 * MENU (MOBILE)
 * - Seções em acordeão com ícones
 * - Botão de sair abaixo de "Configurações"
 * - Sem FAB aqui (o FAB ficou no Schedule)
 */

/** Metadados dos grupos (ícone e cores do “avatar”) */
const GROUP_META = {
  principal: {
    Icon: LayoutDashboard,
    tint: "bg-blue-50 text-blue-600",
  },
  cadastros: {
    Icon: Layers,
    tint: "bg-emerald-50 text-emerald-600",
  },
  financeiro: {
    Icon: Wallet,
    tint: "bg-violet-50 text-violet-600",
  },
  relatorios: {
    Icon: BarChart3,
    tint: "bg-amber-50 text-amber-600",
  },
  config: {
    Icon: Settings,
    tint: "bg-gray-100 text-gray-700",
  },
};

/** Seções e itens */
const GROUPS = [
  {
    id: "principal",
    title: "Principal",
    items: [
      { label: "Dashboard", to: "/dashboard", Icon: LayoutDashboard },
      { label: "Agenda", to: "/dashboard/schedule", Icon: CalendarDays },
      { label: "Comandas", to: "/dashboard/orders", Icon: ClipboardList },
      { label: "Clientes", to: "/dashboard/clients", Icon: Users },
      { label: "Caixa", to: "/dashboard/cashier", Icon: Wallet },
    ],
  },
  {
    id: "cadastros",
    title: "Cadastros",
    items: [
      { label: "Colaboradores", to: "/dashboard/staff", Icon: Users },
      { label: "Serviços", to: "/dashboard/services", Icon: Briefcase },
      { label: "Produtos", to: "/dashboard/products", Icon: Package },
      { label: "Categorias", to: "/dashboard/categories", Icon: Tag },
      { label: "Marcas", to: "/dashboard/brands", Icon: Tag },
      { label: "Pacotes", to: "/dashboard/packages", Icon: Archive },
      { label: "Anamneses", to: "/dashboard/anamnesis", Icon: FileText },
      { label: "Lista de Espera", to: "/dashboard/waitlist", Icon: List },
    ],
  },
  {
    id: "financeiro",
    title: "Financeiro",
    items: [
      { label: "Contas a Pagar", to: "/dashboard/payables", Icon: Receipt },
      { label: "Contas a Receber", to: "/dashboard/receivables", Icon: Banknote },
      { label: "Categorias Financeiras", to: "/dashboard/finance-categories", Icon: Tag },
      { label: "Fornecedores", to: "/dashboard/suppliers", Icon: Building2 },
      { label: "Formas de Pagamento", to: "/dashboard/payment-methods", Icon: CreditCard },
    ],
  },
  {
    id: "relatorios",
    title: "Relatórios",
    items: [
      { label: "Aniversariantes", to: "/dashboard/reports/birthdays", Icon: Gift },
      { label: "Fluxo de Caixa", to: "/dashboard/reports/cashflow", Icon: BarChart3 },
      { label: "Metas", to: "/dashboard/goals", Icon: BarChart3 },
    ],
  },
  {
    id: "config",
    title: "Configurações",
    items: [
      { label: "Empresa", to: "/dashboard/settings", Icon: Building2 },
      { label: "Parâmetros", to: "/dashboard/settings", Icon: Settings },
    ],
  },
];

export default function Menu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(() => new Set(["principal"])); // abre "Principal" por padrão

  const toggle = (id) => {
    const s = new Set(open);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setOpen(s);
  };

  const signOut = () => {
    try {
      // Limpa credenciais comuns do projeto
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("companyData");
      sessionStorage.clear();
      toast.success("Você saiu da conta.");
    } catch {
      // no-op
    } finally {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3">
        <h1 className="text-lg font-semibold">Menu</h1>
      </div>

      {/* Conteúdo */}
      <div className="p-3 space-y-4">
        {asArray(GROUPS).map((group) => {
          const meta = GROUP_META[group.id] || {};
          const GroupIcon = meta.Icon || LayoutDashboard;
          const tint = meta.tint || "bg-gray-100 text-gray-700";
          const isOpen = open.has(group.id);

          return (
            <section key={group.id} className="bg-white border rounded-xl shadow-sm overflow-hidden">
              {/* Cabeçalho do cartão com ícone */}
              <button
                onClick={() => toggle(group.id)}
                className="w-full flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full ${tint}`}>
                    <GroupIcon className="w-5 h-5" />
                  </span>
                  <span className="font-medium">{group.title}</span>
                </div>
                {isOpen ? (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                )}
              </button>

              {/* Lista de itens */}
              {isOpen && (
                <div className="divide-y">
                  {asArray(group.items).map(({ label, to, Icon }) => (
                    <button
                      key={label}
                      onClick={() => navigate(to)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gray-100">
                          <Icon className="w-5 h-5 text-gray-700" />
                        </span>
                        <span className="text-[15px]">{label}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {/* Botão Sair */}
        <button
          onClick={signOut}
          className="w-full bg-white border rounded-xl shadow-sm px-4 py-3 flex items-center justify-between text-red-600 hover:bg-red-50"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-red-50 text-red-600">
              <LogOut className="w-5 h-5" />
            </span>
            <span className="font-medium">Sair</span>
          </div>
          <ChevronRight className="w-5 h-5 text-red-400" />
        </button>

        <div className="h-24" />
      </div>
    </div>
  );
}
