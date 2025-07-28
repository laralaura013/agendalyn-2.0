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
      <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 w-[90%] max-w-md bg-gray-900 rounded-2xl px-4 py-2 shadow-lg z-50 flex justify-between items-center">
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.to;

          return (
            <Link
              key={item.to}
              to={item.to}
              className="relative flex flex-col items-center justify-center w-[60px] h-[60px]"
            >
              {isActive && (
                <div className="absolute -top-5 bg-purple-600 w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-4 border-gray-900 transition-all z-10">
                  <ion-icon name={item.icon} class="text-white text-[24px]"></ion-icon>
                </div>
              )}

              {!isActive && (
                <>
                  <ion-icon name={item.icon} class="text-gray-400 text-[24px]"></ion-icon>
                  <span className="text-[11px] text-gray-400 mt-1">{item.label}</span>
                </>
              )}
            </Link>
          );
        })}
      </div>

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
