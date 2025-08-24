// ✅ ARQUIVO: src/components/integrations/GoogleConnectButton.jsx
import { useEffect, useRef, useState } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";

/**
 * Botão para conectar/desconectar Google Calendar usando POPUP + postMessage
 * @param {string}   staffId
 * @param {boolean}  isConnected
 * @param {(connected:boolean, email?:string) => void} onStatusChange
 */
export default function GoogleConnectButton({ staffId, isConnected, onStatusChange }) {
  const [loading, setLoading] = useState(false);
  const pollRef = useRef(null);

  const refreshStatus = async (showToast = false) => {
    try {
      const { data } = await api.get(`/integrations/google/status/${staffId}`);
      const connected = !!data?.connected;
      onStatusChange?.(connected, data?.email || "");
      if (showToast) {
        toast[connected ? "success" : "error"](connected ? "Google Calendar conectado!" : "Conexão não concluída.");
      }
      return connected;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const handleMessage = async (ev) => {
    // Segurança: se quiser, valide ev.origin === "https://SEU-DOMINIO"
    const msg = ev?.data;
    if (!msg || msg.source !== "agendalyn" || msg.type !== "google-oauth-complete") return;

    // Recebemos o sinal da página public/oauth-complete.html → checa status e notifica
    await refreshStatus(true);
    // Apenas por segurança: limpa qualquer poll pendente
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId]);

  const connect = async () => {
    try {
      setLoading(true);

      // Pede a URL ao backend. IMPORTANTÍSSIMO: o backend deve montar o redirect_uri
      // para https://SEU-DOMINIO/oauth-complete.html (arquivo do /public).
      const { data } = await api.get("/integrations/google/auth-url", {
        params: {
          staffId,
          mode: "popup",
          // dica opcional:
          returnTo: window.location.origin + window.location.pathname + window.location.hash,
        },
      });

      const url = data?.url;
      if (!url) {
        toast.error("Não foi possível gerar o link de conexão.");
        return;
      }

      const w = window.open(
        url,
        "googleOAuth",
        "width=600,height=700,menubar=no,location=no,resizable=yes,scrollbars=yes,status=no"
      );

      // Fallback para caso o popup seja bloqueado
      if (!w) {
        window.location.href = url;
        return;
      }

      // Fallback adicional: se por algum motivo não vier o postMessage, fazemos poll
      pollRef.current = setInterval(async () => {
        if (w.closed) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          await refreshStatus(true);
        }
      }, 800);
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
