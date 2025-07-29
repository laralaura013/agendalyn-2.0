import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ClientBottomNav from '../ClientBottomNav'; // Ajustado para nova localização

const ClientLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('clientToken');
    const client = localStorage.getItem('clientData');
    if (!token || !client) {
      navigate('/portal/login/cmdep95530000pspaolfy7dod');
    }
  }, [navigate]);

  const hideNavRoutes = ['/portal/login', '/portal/register'];
  const shouldHideNav = hideNavRoutes.some((path) =>
    location.pathname.includes(path)
  );

  return (
    <div
      className="min-h-screen bg-white pt-[env(safe-area-inset-top)] pb-[90px] px-4"
      style={{ paddingBottom: shouldHideNav ? '1rem' : '90px' }}
    >
      <div className="w-full">{children}</div>
      {!shouldHideNav && <ClientBottomNav />}
    </div>
  );
};

export default ClientLayout;
