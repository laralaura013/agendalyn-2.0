import { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

/**
 * Botão para conectar/desconectar Google Calendar
 * @param {string} staffId - ID do profissional logado
 * @param {boolean} isConnected - Status atual da conexão
 * @param {function} onStatusChange - (connected:boolean, email?:string) => void
 */
export default function GoogleConnectButton({ staffId, isConnected, onStatusChange }) {
  const [loading, setLoading] = useState(false);

  const connect = async () => {
    try {
      setLoading(true);

      // Guarda de onde saímos, pra facilitar o retorno e limpeza da URL
      sessionStorage.setItem('GOOGLE_OAUTH_RETURN_TO', window.location.href);

      // Se o backend aceitar, já manda um redirect de volta pro /settings
      const preferedRedirect = `${window.location.origin}/settings?tab=integrations`;
      const { data } = await api.get('/integrations/google/auth-url', {
        params: { staffId, redirectUri: preferedRedirect },
      });

      if (data?.url) {
        window.location.href = data.url; // redireciona mesmo (mais confiável)
      } else {
        toast.error('Não foi possível gerar o link de conexão.');
      }
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
