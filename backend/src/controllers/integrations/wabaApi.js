// src/controllers/integrations/wabaApi.js
import axios from 'axios';
import crypto from 'crypto';

const {
  WABA_ACCESS_TOKEN,
  WABA_PHONE_NUMBER_ID,
  WABA_APP_SECRET, // opcional (validação de assinatura)
} = process.env;

const GRAPH_URL = `https://graph.facebook.com/v20.0/${WABA_PHONE_NUMBER_ID}/messages`;

/** Normaliza fone para E.164 Brasil */
export const e164BR = (phone) => {
  if (!phone) return null;
  const only = String(phone).replace(/\D/g, '');
  if (only.startsWith('55')) return `+${only}`;
  if (only.length === 11 || only.length === 10) return `+55${only}`;
  if (only.length === 13 && only.startsWith('55')) return `+${only}`;
  return `+${only}`;
};

/** "DD/MM/AAAA" ou "DD-MM-AAAA" -> "AAAA-MM-DD". Se já vier ISO, mantém. */
export const toISODate = (s) => {
  if (!s) return null;
  const t = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;           // já ISO
  const m = t.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/); // DD/MM/AAAA
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
};

/** ISO "AAAA-MM-DD" -> "DD/MM/AAAA" (para exibição ao usuário) */
export const formatBR = (iso) => {
  if (!iso) return '';
  const [Y, M, D] = String(iso).split('-');
  if (!Y || !M || !D) return iso;
  return `${D}/${M}/${Y}`;
};

/** Envia texto simples */
export const sendText = async (to, body) => {
  try {
    const { data } = await axios.post(
      GRAPH_URL,
      { messaging_product: 'whatsapp', to, type: 'text', text: { body } },
      { headers: { Authorization: `Bearer ${WABA_ACCESS_TOKEN}` } }
    );
    console.log('✅ Enviado:', data?.messages?.[0]?.id);
  } catch (err) {
    console.error('❌ Erro ao enviar texto:', err?.response?.data || err.message);
  }
};

/** Lista simples "1. Opção" */
export const sendChoices = async (to, title, options = []) => {
  const body = [title, ...options.map((o, i) => `${i + 1}. ${o}`)].join('\n');
  return sendText(to, body);
};

/** (Opcional) valida a assinatura do webhook se WABA_APP_SECRET estiver setado */
export const isValidSignature = (req) => {
  if (!WABA_APP_SECRET) return true;
  const sigHeader = req.get('x-hub-signature-256');
  if (!sigHeader) return true;
  const raw = typeof req.rawBody === 'string' ? Buffer.from(req.rawBody, 'utf8') : req.rawBody;
  const hmac = crypto.createHmac('sha256', WABA_APP_SECRET);
  hmac.update(raw);
  const expected = `sha256=${hmac.digest('hex')}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(sigHeader), Buffer.from(expected));
  } catch {
    return false;
  }
};

export default {
  e164BR,
  toISODate,
  formatBR,
  sendText,
  sendChoices,
  isValidSignature,
};
