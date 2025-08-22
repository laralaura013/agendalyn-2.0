import express from 'express';
import crypto from 'crypto';
import axios from 'axios';
import prisma from '../../prismaClient.js';

const router = express.Router();

/** ENV NECESSÁRIAS:
 *  WABA_VERIFY_TOKEN=
 *  WABA_ACCESS_TOKEN=        // Permanent user token com permissão de WhatsApp
 *  WABA_PHONE_NUMBER_ID=     // phone_number_id do Cloud API
 *  APP_BASE_URL=             // ex: http://localhost:3333/api
 */
const {
  WABA_VERIFY_TOKEN,
  WABA_ACCESS_TOKEN,
  WABA_PHONE_NUMBER_ID,
  APP_BASE_URL = 'http://localhost:3333/api',
  WABA_APP_SECRET, // opcional, se quiser validar assinatura
} = process.env;

const GRAPH_URL = `https://graph.facebook.com/v20.0/${WABA_PHONE_NUMBER_ID}/messages`;

// Estado de conversa simples em memória (trocar por Redis depois)
const sessions = new Map();

/** ========= Utils ========= */
const e164BR = (phone) => {
  if (!phone) return null;
  const only = String(phone).replace(/\D/g, '');
  // tenta normalizar +55 (Brasil)
  if (only.startsWith('55')) return `+${only}`;
  if (only.length === 11 || only.length === 10) return `+55${only}`;
  if (only.length === 13 && only.startsWith('55')) return `+${only}`;
  return `+${only}`;
};

const sendText = async (to, text) => {
  await axios.post(
    GRAPH_URL,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    },
    { headers: { Authorization: `Bearer ${WABA_ACCESS_TOKEN}` } }
  );
};

const sendChoices = async (to, title, options = []) => {
  const body = [title, ...options.map((o, i) => `${i + 1}. ${o}`)].join('\n');
  return sendText(to, body);
};

const verifySignatureIfPresent = (req) => {
  if (!WABA_APP_SECRET) return true;
  const sig = req.get('x-hub-signature-256');
  if (!sig) return true;
  const hmac = crypto.createHmac('sha256', WABA_APP_SECRET);
  hmac.update(JSON.stringify(req.body), 'utf-8');
  const expected = `sha256=${hmac.digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
};

/** ========= Webhook Verify (GET) ========= */
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === WABA_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

/** ========= Webhook Receiver (POST) ========= */
router.post('/webhook', async (req, res) => {
  try {
    if (!verifySignatureIfPresent(req)) return res.sendStatus(403);

    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const messages = changes?.value?.messages;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.sendStatus(200);
    }

    for (const msg of messages) {
      await handleIncomingMessage(msg, changes.value?.metadata);
    }
    return res.sendStatus(200);
  } catch (err) {
    console.error('WhatsApp webhook error:', err?.response?.data || err);
    return res.sendStatus(200); // WhatsApp espera 200 sempre
  }
});

/** ========= Handler principal ========= */
async function handleIncomingMessage(msg, meta) {
  const from = `+${msg.from}`.replace('++', '+'); // vem sem '+'
  const to = e164BR(from);
  const text = msg.text?.body?.trim() || msg.interactive?.list_reply?.title || msg.button?.text || '';

  // Carrega sessão simples
  const session = sessions.get(to) || { step: 'start', payload: {} };

  // Busca/Cria cliente pelo telefone
  const client = await upsertClientByPhone(to);

  // Estado da conversa
  switch (session.step) {
    case 'start': {
      await sendText(to, `Olá, ${client.name || 'tudo bem'}? Eu sou o assistente de agendamentos.`);
      await sendChoices(to, 'O que você deseja?', [
        'Agendar atendimento',
        'Remarcar/Cancelar',
        'Falar com atendente',
      ]);
      session.step = 'menu';
      break;
    }

    case 'menu': {
      const n = parseInt(text, 10);
      if (n === 1) {
        session.step = 'ask_service';
        await askService(to);
      } else if (n === 2) {
        session.step = 'reschedule_code';
        await sendText(to, 'Informe o código do agendamento (ou responda "voltar").');
      } else if (n === 3) {
        session.step = 'handoff';
        await sendText(to, 'Ok! Em instantes um atendente dará continuidade por aqui. ✅');
      } else {
        await sendText(to, 'Não entendi. Digite 1, 2 ou 3.');
      }
      break;
    }

    case 'ask_service': {
      // usuário digita número da lista
      const services = await listServices();
      const idx = parseInt(text, 10) - 1;
      if (Number.isNaN(idx) || idx < 0 || idx >= services.length) {
        await sendText(to, 'Escolha um número válido da lista.');
        await askService(to);
        break;
      }
      session.payload.service = services[idx];
      session.step = 'ask_professional';
      await askProfessional(to);
      break;
    }

    case 'ask_professional': {
      const staff = await listStaff();
      const idx = parseInt(text, 10) - 1;
      if (Number.isNaN(idx) || idx < 0 || idx >= staff.length) {
        await sendText(to, 'Escolha um número válido da lista.');
        await askProfessional(to);
        break;
      }
      session.payload.professional = staff[idx];
      session.step = 'ask_date';
      await sendText(to, 'Informe a data (AAAA-MM-DD). Ex: 2025-08-25');
      break;
    }

    case 'ask_date': {
      const day = String(text).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
        await sendText(to, 'Formato inválido. Use AAAA-MM-DD. Ex: 2025-08-25');
        break;
      }
      session.payload.date = day;
      session.step = 'ask_time';
      const slots = await listSlots(session.payload.professional.id, day, session.payload.service.id);
      if (slots.length === 0) {
        await sendText(to, 'Não encontrei horários neste dia. Quer tentar outra data? (responda com AAAA-MM-DD)');
        break;
      }
      const top = slots.slice(0, 8);
      await sendChoices(to, 'Horários disponíveis (selecione):', top);
      break;
    }

    case 'ask_time': {
      const slots = await listSlots(session.payload.professional.id, session.payload.date, session.payload.service.id);
      const top = slots.slice(0, 8);
      const idx = parseInt(text, 10) - 1;
      if (Number.isNaN(idx) || idx < 0 || idx >= top.length) {
        await sendText(to, 'Escolha um número válido da lista.'); 
        await sendChoices(to, 'Horários disponíveis:', top);
        break;
      }
      const hhmm = top[idx];
      session.payload.time = hhmm;

      // Confirmar
      const sName = session.payload.service.name;
      const pName = session.payload.professional.name;
      await sendText(
        to,
        `Confirmar agendamento?\nServiço: ${sName}\nProfissional: ${pName}\nData: ${session.payload.date}\nHora: ${hhmm}\n\nResponda "sim" para confirmar ou "não" para cancelar.`
      );
      session.step = 'confirm';
      break;
    }

    case 'confirm': {
      const ok = text.toLowerCase();
      if (ok === 'sim' || ok === 's') {
        const created = await createAppointmentFromSession(client, session.payload);
        await sendText(
          to,
          `Agendamento criado! Código: ${created.id}\nNos vemos em ${session.payload.date} às ${session.payload.time}.`
        );
        session.step = 'start';
        session.payload = {};
      } else if (ok === 'não' || ok === 'nao' || ok === 'n') {
        await sendText(to, 'Ok, não confirmei. Quer tentar outro horário? (1) Sim  (2) Voltar ao menu');
        session.step = 'post_decline';
      } else {
        await sendText(to, 'Responda "sim" ou "não".');
      }
      break;
    }

    case 'post_decline': {
      const n = parseInt(text, 10);
      if (n === 1) {
        session.step = 'ask_date';
        await sendText(to, 'Informe a data (AAAA-MM-DD).');
      } else {
        session.step = 'start';
        await sendText(to, 'Voltando ao menu inicial.');
      }
      break;
    }

    case 'reschedule_code': {
      if (text.toLowerCase() === 'voltar') {
        session.step = 'start';
        await sendText(to, 'Voltei ao menu.');
        break;
      }
      // aqui você consulta o agendamento e abre fluxo similar a ask_date/ask_time
      await sendText(to, 'Recebi seu código. Em breve implementamos o fluxo de remarcação ✅');
      session.step = 'start';
      break;
    }

    default:
      session.step = 'start';
      await sendText(to, 'Vamos começar novamente.');
  }

  sessions.set(to, session);
}

/** ======= Integrações com seu backend ======= */

// Lista serviços (mínimo necessário)
async function listServices() {
  const rows = await prisma.service.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
  return rows;
}

// Lista profissionais (apenas os visíveis)
async function listStaff() {
  const rows = await prisma.user.findMany({
    where: { showInBooking: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
  return rows;
}

// Busca horários disponíveis usando seu endpoint público
async function listSlots(proId, date, serviceId) {
  try {
    const res = await axios.get(`${APP_BASE_URL}/public/available-slots`, {
      params: { staffId: proId, date, serviceId },
    });
    // normaliza para "HH:MM"
    return (Array.isArray(res.data) ? res.data : []).map((s) =>
      typeof s === 'string' ? s : s.formatted || s.time
    ).filter(Boolean);
  } catch (e) {
    console.error('Erro ao buscar slots:', e?.response?.data || e.message);
    return [];
  }
}

// Cria/atualiza cliente por telefone
async function upsertClientByPhone(whatsPhone) {
  const phone = whatsPhone.replace('+', ''); // seu schema guarda sem '+', ajuste se necessário
  let c = await prisma.client.findFirst({ where: { phone } });
  if (!c) {
    c = await prisma.client.create({
      data: {
        name: 'Cliente WhatsApp',
        phone,
        companyId: await getDefaultCompanyId(), // ajuste se multi-empresa
        isActive: true,
      },
    });
  }
  return c;
}

// Descobrir companyId padrão (ajuste para pegar pelo token/tenant)
async function getDefaultCompanyId() {
  const comp = await prisma.company.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } });
  return comp?.id;
}

// Cria agendamento
async function createAppointmentFromSession(client, payload) {
  const { service, professional, date, time } = payload;
  const startISO = new Date(`${date}T${time}:00.000Z`); // ajuste timezone se necessário
  const svc = await prisma.service.findFirst({ where: { id: service.id }, select: { duration: true } });
  const endISO = new Date(startISO.getTime() + (svc?.duration || 60) * 60000);

  const created = await prisma.appointment.create({
    data: {
      companyId: client.companyId,
      clientId: client.id,
      serviceId: service.id,
      userId: professional.id,
      start: startISO,
      end: endISO,
      status: 'SCHEDULED',
      notes: 'Criado via WhatsApp',
    },
    select: { id: true },
  });
  return created;
}

export default router;
