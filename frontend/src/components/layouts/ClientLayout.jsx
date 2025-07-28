import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ClientBottomNav from '../ClientBottomNav';

const ClientLayout = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('clientToken');
    const client = localStorage.getItem('clientData');
    if (!token || !client) {
      navigate('/portal/login/cmdep95530000pspaolfy7dod');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 pb-28 px-4 pt-6">
      <div className="max-w-md mx-auto">{children}</div>
      <ClientBottomNav />
    </div>
  );
};

export default ClientLayout;
