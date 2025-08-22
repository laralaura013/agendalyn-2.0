// src/integrations/whatsapp/router.js
import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import prisma from '../../prismaClient.js';

const router = express.Router();

/** ====== ENV ====== */
const {
  WABA_VERIFY_TOKEN,
  WABA_ACCESS_TOKEN,
  WABA_PHONE_NUMBER_ID,
  APP_BASE_URL = 'http://localhost:3001/api',
  WABA_APP_SECRET, // opcional: validação de assinatura
} = process.env;

const GRAPH_URL = `https://graph.facebook.com/v20.0/${WABA_PHONE_NUMBER_ID}/messages`;

// Estado de conversa simples em memória (produção: use Redis)
const sessions = new Map();

/** ====== Utils ====== */
const e164BR = (phone) => {
  if (!phone) return null;
  const only = String(phone).replace(/\D/g, '');
  if (only.startsWith('55')) return `+${only}`;
  if (only.length === 11 || only.length === 10) return `+55${only}`;
  if (only.length === 13 && only.startsWith('55')) return `+${only}`;
  return `+${only}`;
};

const sendText = async (to, text) => {
  try {
    const { data } = await axios.post(
      GRAPH_URL,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      },
      { headers: { Authorization: `Bearer ${WABA_ACCESS_TOKEN}` } }
    );
    console.log('✅ Enviado com sucesso. ID:', data?.messages?.[0]?.id);
  } catch (err) {
    console.error('❌ Erro ao enviar mensagem:', err?.response?.data || err.message);
  }
};

const sendChoices = async (to, title, options = []) => {
  const body = [title, ...options.map((o, i) => `${i + 1}. ${o}`)].join('\n');
  return sendText(to, body);
};

const verifySignatureIfPresent = (req) => {
  if (!WABA_APP_SECRET) return true;
  const sigHeader = req.get('x-hub-signature-256');
  if (!sigHeader) return true;
  const hmac = crypto.createHmac('sha256', WABA_APP_SECRET);
  // req.rawBody foi setado no server.js (string)
  const raw = typeof req.rawBody === 'string' ? req.rawBody : JSON.stringify(req.body);
  hmac.update(raw, 'utf8');
  const expected = `sha256=${hmac.digest('hex')}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(sigHeader), Buffer.from(expected));
  } catch {
    return false;
  }
};

/** ====== Verify (GET) ====== */
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === WABA_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

/** ====== Receiver (POST) ====== */
router.post('/webhook', async (req, res) => {
  try {
    if (!verifySignatureIfPresent(req)) {
      console.warn('⚠️ Assinatura inválida');
      return res.sendStatus(403);
    }

    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const messages = value?.messages;

    console.log('📩 Webhook change:', JSON.stringify(change, null, 2));

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.sendStatus(200);
    }

    for (const msg of messages) {
      await handleIncomingMessage(msg, value?.metadata);
    }

    return res.sendStatus(200); // WhatsApp exige 200 sempre
  } catch (err) {
    console.error('❌ Erro no webhook:', err?.response?.data || err);
    return res.sendStatus(200);
  }
});

/** ====== Conversa ====== */
async function handleIncomingMessage(msg, meta) {
  const from = `+${msg.from}`.replace('++', '+'); // vem sem '+'
  const to = e164BR(from);
  const kind = msg.type;
  const text =
    msg.text?.body?.trim() ||
    msg.interactive?.list_reply?.title ||
    msg.button?.text ||
    '';

  console.log(`👤 ${msg.from} disse: "${text}" (tipo ${kind})`);

  // carrega/abre sessão
  const session = sessions.get(to) || { step: 'start', payload: {} };

  // garante cliente no banco
  const client = await upsertClientByPhone(to);

  switch (session.step) {
    case 'start': {
      await sendText(
        to,
        `Olá${client?.name ? `, ${client.name}` : ''}! Eu sou o assistente de agendamentos.`
      );
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
        await askService(to, session);
      } else if (n === 2) {
        session.step = 'reschedule_code';
        await sendText(to, 'Informe o código do agendamento (ou digite "voltar").');
      } else if (n === 3) {
        session.step = 'handoff';
        await sendText(to, 'Ok! Em instantes um atendente dará continuidade por aqui. ✅');
      } else {
        await sendText(to, 'Não entendi. Digite 1, 2 ou 3.');
      }
      break;
    }

    case 'ask_service': {
      const pick = parseInt(text, 10) - 1;
      const services = await listServices();
      if (!services.length) {
        await sendText(to, 'Não há serviços cadastrados no sistema.');
        session.step = 'start';
        break;
      }
      if (Number.isNaN(pick) || pick < 0 || pick >= services.length) {
        await sendText(to, 'Escolha um número válido da lista.');
        await askService(to, session);
        break;
      }
      session.payload.service = services[pick];
      session.step = 'ask_professional';
      await askProfessional(to, session);
      break;
    }

    case 'ask_professional': {
      const pick = parseInt(text, 10) - 1;
      const staff = await listStaff();
      if (!staff.length) {
        await sendText(to, 'Nenhum profissional disponível para agendamento.');
        session.step = 'start';
        break;
      }
      if (Number.isNaN(pick) || pick < 0 || pick >= staff.length) {
        await sendText(to, 'Escolha um número válido da lista.');
        await askProfessional(to, session);
        break;
      }
      session.payload.professional = staff[pick];
      session.step = 'ask_date';
      await sendText(to, 'Informe a data (AAAA-MM-DD). Ex.: 2025-08-25');
      break;
    }

    case 'ask_date': {
      const day = String(text).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
        await sendText(to, 'Formato inválido. Use AAAA-MM-DD. Ex.: 2025-08-25');
        break;
      }
      session.payload.date = day;
      session.step = 'ask_time';
      const slots = await listSlots(
        session.payload.professional.id,
        day,
        session.payload.service.id
      );
      if (!slots.length) {
        await sendText(
          to,
          'Não encontrei horários neste dia. Envie outra data (AAAA-MM-DD) ou digite "voltar".'
        );
        break;
      }
      const top = slots.slice(0, 8);
      await sendChoices(to, 'Horários disponíveis (escolha um número):', top);
      break;
    }

    case 'ask_time': {
      const slots = await listSlots(
        session.payload.professional.id,
        session.payload.date,
        session.payload.service.id
      );
      const top = slots.slice(0, 8);
      const pick = parseInt(text, 10) - 1;
      if (Number.isNaN(pick) || pick < 0 || pick >= top.length) {
        await sendText(to, 'Escolha um número válido da lista.');
        await sendChoices(to, 'Horários disponíveis:', top);
        break;
      }
      const hhmm = top[pick];
      session.payload.time = hhmm;

      await sendText(
        to,
        `Confirmar agendamento?\n` +
          `Serviço: ${session.payload.service.name}\n` +
          `Profissional: ${session.payload.professional.name}\n` +
          `Data: ${session.payload.date}\n` +
          `Hora: ${hhmm}\n\n` +
          `Responda "sim" para confirmar ou "não" para cancelar.`
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
          `Agendamento criado! Código: ${created.id}\n` +
            `Nos vemos em ${session.payload.date} às ${session.payload.time}.`
        );
        session.step = 'start';
        session.payload = {};
      } else if (ok === 'não' || ok === 'nao' || ok === 'n') {
        await sendText(
          to,
          'Ok, não confirmei. Quer tentar outro horário?\n' +
            '(1) Sim\n(2) Voltar ao menu'
        );
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
      await sendText(to, 'Recebi seu código. Em breve implementamos a remarcação ✅');
      session.step = 'start';
      break;
    }

    default:
      session.step = 'start';
      await sendText(to, 'Vamos começar novamente.');
  }

  sessions.set(to, session);
}

/** ====== Prompts auxiliares ====== */
async function askService(to, session) {
  const services = await listServices();
  if (!services.length) {
    await sendText(to, 'Não há serviços cadastrados no sistema.');
    session.step = 'start';
    return;
  }
  const opts = services.map((s) => s.name);
  await sendChoices(to, 'Escolha o serviço:', opts);
}

async function askProfessional(to, session) {
  const staff = await listStaff();
  if (!staff.length) {
    await sendText(to, 'Nenhum profissional disponível para agendamento.');
    session.step = 'start';
    return;
  }
  const opts = staff.map((p) => p.name);
  await sendChoices(to, 'Escolha o profissional:', opts);
}

/** ====== Acesso ao seu backend/banco ====== */
async function listServices() {
  try {
    const rows = await prisma.service.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
    return rows;
  } catch (e) {
    console.error('Erro listServices:', e.message);
    return [];
  }
}

async function listStaff() {
  try {
    const rows = await prisma.user.findMany({
      where: { showInBooking: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
    return rows;
  } catch (e) {
    console.error('Erro listStaff:', e.message);
    return [];
  }
}

async function listSlots(proId, date, serviceId) {
  try {
    const res = await axios.get(`${APP_BASE_URL}/public/available-slots`, {
      params: { staffId: proId, date, serviceId },
    });
    return (Array.isArray(res.data) ? res.data : [])
      .map((s) => (typeof s === 'string' ? s : s?.formatted || s?.time))
      .filter(Boolean);
  } catch (e) {
    console.error('Erro ao buscar slots:', e?.response?.data || e.message);
    return [];
  }
}

async function upsertClientByPhone(whatsPhone) {
  const phone = String(whatsPhone).replace('+', '');
  let c = await prisma.client.findFirst({ where: { phone } });
  if (!c) {
    const companyId = await getDefaultCompanyId();
    c = await prisma.client.create({
      data: {
        name: 'Cliente WhatsApp',
        phone,
        companyId,
        isActive: true,
      },
    });
  }
  return c;
}

async function getDefaultCompanyId() {
  const comp = await prisma.company.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  return comp?.id;
}

async function createAppointmentFromSession(client, payload) {
  const { service, professional, date, time } = payload;
  // Usa horário LOCAL do servidor; se precisar timezone fixo, use date-fns-tz
  const start = new Date(`${date}T${time}:00`);
  const svc = await prisma.service.findUnique({
    where: { id: service.id },
    select: { duration: true },
  });
  const duration = svc?.duration || 60;
  const end = new Date(start.getTime() + duration * 60000);

  const created = await prisma.appointment.create({
    data: {
      companyId: client.companyId,
      clientId: client.id,
      serviceId: service.id,
      userId: professional.id,
      start,
      end,
      status: 'SCHEDULED',
      notes: 'Criado via WhatsApp',
    },
    select: { id: true },
  });
  return created;
}

export default router;
