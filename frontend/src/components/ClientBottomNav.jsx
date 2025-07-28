import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/portal/dashboard', icon: 'home-outline', label: 'Início' },
  { to: '/portal/pacotes', icon: 'cube-outline', label: 'Pacotes' },
  { to: '/portal/historico', icon: 'time-outline', label: 'Histórico' },
  { to: '/portal/notificacoes', icon: 'notifications-outline', label: 'Avisos' },
  { to: '/portal/perfil', icon: 'person-outline', label: 'Perfil' },
];

const ClientBottomNav = () => {
  const location = useLocation();

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow z-50">
        <ul className="flex justify-around items-center h-[65px]">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <li key={item.to} className="text-center text-xs relative">
                <Link
                  to={item.to}
                  className={`flex flex-col items-center justify-center transition ${
                    isActive ? 'text-purple-700 font-medium' : 'text-gray-500 hover:text-purple-600'
                  }`}
                >
                  <div
                    className={`text-xl transition-all duration-300 ${
                      isActive
                        ? 'bg-purple-600 text-white p-2 rounded-full shadow-lg'
                        : ''
                    }`}
                  >
                    <ion-icon
                      name={item.icon}
                      class={`text-[22px] ${isActive ? 'text-white' : 'text-gray-500'}`}
                    ></ion-icon>
                  </div>
                  <span className="text-[11px] mt-1">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Ionicons CDN */}
      <script
        type="module"
        src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js"
      ></script>
      <script
        noModule
        src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js"
      ></script>
    </>
  );
};

export default ClientBottomNav;
