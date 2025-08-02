import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bell, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const iconMap = {
  success: <CheckCircle className="text-green-600" />,
  warning: <AlertTriangle className="text-yellow-600" />,
  error: <XCircle className="text-red-600" />,
};

const ClientNoticesPage = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const token = localStorage.getItem('clientToken');
        const response = await api.get('/portal/notifications', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setNotices(response.data);
      } catch (err) {
        console.error('Erro ao carregar notificações:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotices();
  }, []);

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4 text-purple-700 text-center flex items-center gap-2 justify-center">
        <Bell className="w-5 h-5" />
        Notificações
      </h2>

      {loading ? (
        <p className="text-center text-gray-500">Carregando notificações...</p>
      ) : notices.length === 0 ? (
        <p className="text-center text-gray-500">Nenhuma notificação.</p>
      ) : (
        <ul className="space-y-4">
          {notices.map((n) => (
            <li key={n.id} className="bg-white rounded-xl p-4 shadow flex gap-3 items-start">
              <div className="pt-1">{iconMap[n.type] || <Bell className="text-purple-600" />}</div>
              <div className="flex-1">
                <p className="text-sm text-gray-700">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {format(new Date(n.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ClientNoticesPage;
