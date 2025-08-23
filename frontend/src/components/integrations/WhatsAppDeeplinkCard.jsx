// src/components/integrations/WhatsAppDeeplinkCard.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Download, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const WhatsAppDeeplinkCard = ({ companySlug, sharedPhoneE164 }) => {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const inputRef = useRef(null);

  const deeplink = useMemo(() => {
    // Se tiver número compartilhado, monta um wa.me/<numero>?text=%23slug
    // Se não tiver, apenas gera texto "#slug" (o usuário pode colar na conversa)
    if (!companySlug) return '';
    const slugTag = `%23${encodeURIComponent(companySlug)}`;
    return sharedPhoneE164
      ? `https://wa.me/${sharedPhoneE164.replace(/\D/g, '')}?text=${slugTag}`
      : slugTag;
  }, [companySlug, sharedPhoneE164]);

  useEffect(() => {
    (async () => {
      if (!deeplink) return setQrDataUrl('');
      try {
        const url = await QRCode.toDataURL(deeplink, { margin: 1, scale: 5 });
        setQrDataUrl(url);
      } catch {
        setQrDataUrl('');
      }
    })();
  }, [deeplink]);

  const copy = async () => {
    if (!deeplink) return;
    await navigator.clipboard.writeText(deeplink);
    toast.success('Link copiado!');
  };

  const download = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `whatsapp-${companySlug || 'empresa'}.png`;
    a.click();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-3">
        <LinkIcon className="h-5 w-5 text-emerald-600" />
        <h3 className="text-lg font-semibold">Link/QR para WhatsApp (multi-empresa)</h3>
      </div>

      {!companySlug ? (
        <p className="text-sm text-gray-600">
          Defina o <b>slug</b> da empresa nas configurações para gerar o link.
        </p>
      ) : (
        <>
          <p className="text-sm text-gray-600 mb-2">
            Divulgue este link (ou QR Code) para que o cliente já chegue com o <b>código da empresa</b> na conversa.
          </p>

          <div className="flex items-center gap-2 p-2 border rounded-md bg-gray-50">
            <input
              ref={inputRef}
              readOnly
              value={deeplink}
              className="flex-1 bg-transparent outline-none text-sm text-gray-700"
            />
            <button onClick={copy} className="p-2 text-gray-600 hover:text-emerald-700" title="Copiar">
              <Copy size={18} />
            </button>
            {qrDataUrl && (
              <button onClick={download} className="p-2 text-gray-600 hover:text-emerald-700" title="Baixar QR">
                <Download size={18} />
              </button>
            )}
          </div>

          {qrDataUrl && (
            <div className="mt-4 flex items-center gap-6">
              <img
                src={qrDataUrl}
                alt="QR Code WhatsApp"
                className="w-40 h-40 border rounded-md"
              />
              <div className="text-sm text-gray-600">
                <p>
                  Número usado: <b>{sharedPhoneE164 || 'número próprio (via app da empresa)'}</b>
                </p>
                <p>
                  Texto inicial: <code>#{companySlug}</code>
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WhatsAppDeeplinkCard;
