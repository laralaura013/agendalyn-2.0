import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";

/**
 * MENU (MOBILE)
 * - Mostra grupos com itens (accordions)
 * - Cada item navega para uma rota
 * - Sem FAB aqui (o FAB ficou no Schedule)
 */

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
      { label: "Pacotes", to: "/dashboard/bundles", Icon: Archive },
      { label: "Anamneses", to: "/dashboard/anamneses", Icon: FileText },
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
      { label: "Metas", to: "/dashboard/reports/goals", Icon: BarChart3 },
    ],
  },
  {
    id: "config",
    title: "Configurações",
    items: [
      { label: "Empresa", to: "/dashboard/company", Icon: Building2 },
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3">
        <h1 className="text-lg font-semibold">Menu</h1>
      </div>

      {/* Conteúdo */}
      <div className="p-3 space-y-4">
        {/* Card do usuário/empresa opcional */}
        {/* <UserCard /> */}

        {GROUPS.map((group) => (
          <section key={group.id} className="bg-white border rounded-xl shadow-sm">
            <button
              onClick={() => toggle(group.id)}
              className="w-full flex items-center justify-between px-4 py-3"
            >
              <span className="font-medium">{group.title}</span>
              {open.has(group.id) ? (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {open.has(group.id) && (
              <div className="divide-y">
                {group.items.map(({ label, to, Icon }) => (
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
        ))}

        <div className="h-24" />
      </div>
    </div>
  );
}
