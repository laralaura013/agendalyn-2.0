// ✅ ARQUIVO: src/components/integrations/GoogleConnectButton.jsx
import { useState } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";

/**
 * Botão para conectar/desconectar Google Calendar usando POPUP
 * @param {string}   staffId
 * @param {boolean}  isConnected
 * @param {(connected:boolean, email?:string) => void} onStatusChange
 */
export default function GoogleConnectButton({ staffId, isConnected, onStatusChange }) {
  const [loading, setLoading] = useState(false);

  const refreshStatus = async () => {
    try {
      const { data } = await api.get(`/integrations/google/status/${staffId}`);
      onStatusChange?.(!!data?.connected, data?.email || "");
      return !!data?.connected;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const connect = async () => {
    try {
      setLoading(true);

      // Pede a URL de auth ao backend (se aceitar, mandamos um hint que vamos abrir em popup)
      const { data } = await api.get("/integrations/google/auth-url", {
        params: {
          staffId,
          // dica opcional pro backend; se ignorar, sem problema
          mode: "popup",
          // onde queremos voltar/ficar ao final (só dica; backend pode ignorar)
          returnTo: window.location.origin + window.location.pathname + window.location.hash,
        },
      });

      const url = data?.url;
      if (!url) {
        toast.error("Não foi possível gerar o link de conexão.");
        return;
      }

      // Abre POPUP
      const w = window.open(
        url,
        "googleOAuth",
        "width=600,height=700,menubar=no,location=no,resizable=yes,scrollbars=yes,status=no"
      );

      // Se popup for bloqueado, faz fallback para redirecionar a janela principal
      if (!w) {
        window.location.href = url;
        return;
      }

      // Polling até o popup fechar; ao fechar, consultamos o status no backend
      const tick = 800;
      const timer = setInterval(async () => {
        if (w.closed) {
          clearInterval(timer);
          const ok = await refreshStatus();
          toast[ok ? "success" : "error"](ok ? "Google Calendar conectado!" : "Conexão não concluída.");
        }
      }, tick);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao iniciar conexão com Google.");
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    try {
      setLoading(true);
      await api.post("/integrations/google/disconnect", { staffId });
      toast.success("Google Calendar desconectado.");
      onStatusChange?.(false, "");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao desconectar do Google.");
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
          {loading ? "Desconectando..." : "Desconectar Google Calendar"}
        </button>
      ) : (
        <button
          onClick={connect}
          disabled={loading}
          className="px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white transition-colors"
        >
          {loading ? "Conectando..." : "Conectar Google Calendar"}
        </button>
      )}
    </div>
  );
}
