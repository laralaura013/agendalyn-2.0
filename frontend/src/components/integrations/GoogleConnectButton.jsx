// src/components/integrations/GoogleConnectButton.jsx
import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

/**
 * @param {string} staffId
 * @param {boolean} isConnected
 * @param {(connected:boolean, email?:string) => void} onStatusChange
 */
export default function GoogleConnectButton({ staffId, isConnected, onStatusChange }) {
  const [loading, setLoading] = useState(false);

  // escuta mensagens vindas de uma possível página intermediária (se você criar no futuro)
  useEffect(() => {
    const onMsg = async (ev) => {
      if (!ev?.data || ev.data.type !== 'GOOGLE_OAUTH_COMPLETE') return;
      try {
        const { data } = await api.get(`/integrations/google/status/${staffId}`);
        onStatusChange?.(!!data?.connected, data?.email || '');
      } catch {
        onStatusChange?.(true);
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [staffId, onStatusChange]);

  const refreshStatus = async () => {
    try {
      const { data } = await api.get(`/integrations/google/status/${staffId}`);
      onStatusChange?.(!!data?.connected, data?.email || '');
      if (data?.connected) toast.success('Google Calendar conectado!');
      else toast.error('Conexão não confirmada.');
    } catch {
      onStatusChange?.(false, '');
    }
  };

  const connect = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/integrations/google/auth-url', { params: { staffId } });
      if (!data?.url) return toast.error('Não foi possível gerar o link de conexão.');

      // abre popup
      const w = window.open(
        data.url,
        'googleOauth',
        'width=620,height=720,menubar=no,toolbar=no,status=no'
      );

      // fallback: se popup for bloqueado, redireciona a aba
      if (!w) {
        window.location.href = data.url;
        return;
      }

      // polling até fechar
      const iv = setInterval(async () => {
        if (w.closed) {
          clearInterval(iv);
          await refreshStatus();
        }
      }, 800);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao iniciar conexão com Google.');
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    try {
      setLoading(true);
      await api.post('/integrations/google/disconnect', { staffId });
      toast.success('Google Calendar desconectado.');
      onStatusChange?.(false, '');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao desconectar do Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2 items-center">
      {isConnected ? (
        <button
          onClick={disconnect}
          disabled={loading}
          className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors"
        >
          {loading ? 'Desconectando...' : 'Desconectar Google Calendar'}
        </button>
      ) : (
        <button
          onClick={connect}
          disabled={loading}
          className="px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white transition-colors"
        >
          {loading ? 'Conectando...' : 'Conectar Google Calendar'}
        </button>
      )}
    </div>
  );
}
