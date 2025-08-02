import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './client-bottom-nav.css';

const navItems = [
  { to: '/portal/agenda', icon: 'calendar-outline', label: 'Agenda' },
  { to: '/portal/pacotes', icon: 'cube-outline', label: 'Pacotes' },
  { to: '/portal/historico', icon: 'time-outline', label: 'Histórico' },
  { to: '/portal/notificacoes', icon: 'notifications-outline', label: 'Notificações' },
  { to: '/portal/perfil', icon: 'person-outline', label: 'Perfil' },
];

const ClientBottomNav = () => {
  const location = useLocation();

  return (
    <div className="client-nav-wrapper">
      <ul>
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <li key={item.to} className={isActive ? 'active' : ''}>
              <Link to={item.to} className="link">
                <span className="icon">
                  <ion-icon name={item.icon}></ion-icon>
                </span>
                <span className="label">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ClientBottomNav;
