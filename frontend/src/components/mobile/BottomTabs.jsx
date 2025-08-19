// frontend/src/components/mobile/BottomTabs.jsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ClipboardList,
  Users,
  Wallet,
  Menu as MenuIcon,
} from "lucide-react";

/**
 * BottomTabs (mobile)
 * Troca a última aba de "Perfil" para "Menu" e aponta para /dashboard/menu.
 * Mantém z-40 para ficar abaixo do FAB (z-50).
 */
export default function BottomTabs({ area = "admin" }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const items =
    area === "admin"
      ? [
          { to: "/dashboard/cashier", label: "Caixa", Icon: Wallet },
          { to: "/dashboard/orders", label: "Comandas", Icon: ClipboardList },
          { to: "/dashboard/schedule", label: "Agenda", Icon: CalendarDays },
          { to: "/dashboard/clients", label: "Clientes", Icon: Users },
          { to: "/dashboard/menu", label: "Menu", Icon: MenuIcon },
        ]
      : [
          // se tiver área de cliente, configure aqui
        ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t">
      <div className="mx-auto max-w-screen-sm grid grid-cols-5 gap-1 px-2 py-2">
        {items.map(({ to, label, Icon }) => {
          const active = pathname === to || pathname.startsWith(to + "/");
          return (
            <button
              key={to}
              onClick={() => navigate(to)}
              className={`flex flex-col items-center justify-center py-1 rounded-lg transition ${
                active ? "text-white bg-[#0f172a]" : "text-gray-600"
              }`}
            >
              <Icon className={`w-6 h-6 ${active ? "text-white" : "text-gray-600"}`} />
              <span className="text-[11px] mt-0.5">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
