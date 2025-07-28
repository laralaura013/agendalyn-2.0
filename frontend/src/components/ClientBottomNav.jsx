import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/portal/dashboard', icon: 'home-outline', label: 'Home' },
  { to: '/portal/sobre', icon: 'book-outline', label: 'Sobre' },
  { to: '/portal/mensagens', icon: 'chatbox-ellipses-outline', label: 'Mensagens' },
  { to: '/portal/configuracoes', icon: 'settings-outline', label: 'Config' },
  { to: '/portal/perfil', icon: 'person-outline', label: 'Perfil' },
];

const ClientBottomNav = () => {
  const location = useLocation();

  return (
    <>
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-[90%] max-w-[430px] h-[70px] bg-[#1e272e] rounded-xl shadow-lg z-50">
        <ul className="flex justify-between items-center h-full px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <li
                key={item.to}
                className={`relative w-[70px] h-[70px] list ${isActive ? 'active' : ''}`}
              >
                <Link
                  to={item.to}
                  className="flex flex-col justify-center items-center w-full h-full text-sm text-[#ccc] hover:text-white transition"
                >
                  <span
                    className={`icon text-[1.5rem] ${
                      isActive
                        ? 'bg-cyan-500 text-white p-2 rounded-full'
                        : ''
                    }`}
                  >
                    <ion-icon name={item.icon}></ion-icon>
                  </span>
                  <span
                    className={`text text-xs mt-1 ${
                      isActive ? 'text-white font-bold' : ''
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
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
