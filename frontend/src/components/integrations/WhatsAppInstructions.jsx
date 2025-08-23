import React, { useMemo } from 'react';
import { Copy } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

/**
 * Exibe instruções para conectar o WhatsApp Cloud:
 * - Mostra a URL do webhook (deduzida do api.baseURL ou window.location)
 * - Mostra o VERIFY_TOKEN (se o backend expuser via /integrations/whatsapp/meta-info; senão, mostra dica)
 * - Passo a passo resumido
 *
 * Props:
 * - verifyToken?: string  -> opcional (caso você já tenha em mãos para exibir)
 */
export default function WhatsAppInstructions({ verifyToken }) {
  // Tenta deduzir a base do backend a partir do axios de api
  const backendBase = useMemo(() => {
    // api.defaults.baseURL pode ser algo como https://backend.com/api
    const base = api?.defaults?.baseURL || '';
    if (base) return base.replace(/\/+$/,''); // remove barra final
    // fallback: usa a mesma origem do front mas com /api
    return `${window.location.origin}/api`;
  }, []);

  const webhookUrl = `${backendBase}/integrations/whatsapp/webhook`;

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-3">Como conectar o WhatsApp</h3>
      <p className="text-sm text-gray-600 mb-4">
        Siga os passos abaixo no <b>Meta Business</b> para ativar o webhook e começar a receber mensagens no seu bot.
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Webhook URL</label>
          <div className="mt-1 flex gap-2">
            <input
              readOnly
              className="flex-1 p-2 border rounded-md bg-gray-50"
              value={webhookUrl}
            />
            <button
              onClick={() => copy(webhookUrl)}
              className="px-3 rounded-md bg-gray-100 hover:bg-gray-200"
              title="Copiar"
            >
              <Copy size={16} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Esta é a URL que você deve registrar no painel do WhatsApp Cloud (Webhooks).
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Verify Token</label>
          <div className="mt-1 flex gap-2">
            <input
              readOnly
              className="flex-1 p-2 border rounded-md bg-gray-50"
              value={verifyToken || 'Defina WABA_VERIFY_TOKEN no backend e use o mesmo aqui'}
            />
            <button
              onClick={() => copy(verifyToken || 'WABA_VERIFY_TOKEN')}
              className="px-3 rounded-md bg-gray-100 hover:bg-gray-200"
              title="Copiar"
            >
              <Copy size={16} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Use o mesmo valor configurado no backend (variável de ambiente <code>WABA_VERIFY_TOKEN</code>).
          </p>
        </div>
      </div>

      <ol className="list-decimal ml-5 mt-5 space-y-2 text-sm text-gray-700">
        <li>Acesse o <b>Meta Business → WhatsApp → Configuration → Webhooks</b>.</li>
        <li>Clique em <b>Editar</b> / <b>Adicionar Webhook</b> e cole a <b>Webhook URL</b> acima.</li>
        <li>Preencha o <b>Verify Token</b> com o mesmo valor configurado no seu backend.</li>
        <li>Salve e clique em <b>Verificar</b>. O status deve ficar <b>Verificado</b>.</li>
        <li>Em <b>Subscribed fields</b>, selecione <b>messages</b>.</li>
      </ol>

      <div className="mt-5 text-xs text-gray-500">
        Dica: para enviar mensagens proativas fora da janela de 24h, crie e aprove <b>message templates</b> no Meta.
      </div>
    </div>
  );
}
