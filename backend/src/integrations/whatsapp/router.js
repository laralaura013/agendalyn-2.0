import express from 'express';
import crypto from 'crypto';
import axios from 'axios';
import prisma from '../../prismaClient.js';

const router = express.Router();

const {
  WABA_VERIFY_TOKEN,
  WABA_ACCESS_TOKEN,
  WABA_PHONE_NUMBER_ID,
  APP_BASE_URL = 'http://localhost:3333/api',
  WABA_APP_SECRET,
  DEBUG_WHATS_KEY, // opcional p/ rota de debug
} = process.env;

const GRAPH_URL = `https://graph.facebook.com/v20.0/${WABA_PHONE_NUMBER_ID}/messages`;
const sessions = new Map();

/* ===== Utils ===== */
const onlyDigits = (v) => (v ? String(v).replace(/\D/g, '') : null);

const sendText = async (to, text) => {
  const toDigits = onlyDigits(to);
  console.log('➡️  Tentando enviar para:', toDigits, '| texto:', text?.slice(0, 80));
  try {
    const { data } = await axios.post(
      GRAPH_URL,
      {
        messaging_product: 'whatsapp',
        to: toDigits,
        type: 'text',
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${WABA_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('✅ Enviado com sucesso. ID:', data?.messages?.[0]?.id);
    return data;
  } catch (err) {
    const e = err?.response?.data || err.message;
    console.error('❌ Erro ao enviar mensagem:', JSON.stringify(e));
    throw err;
  }
};

const sendChoices = (to, title, options = []) =>
  sendText(to, [title, ...options.map((o, i) => `${i + 1}. ${o}`)].join('\n'));

const verifySignatureIfPresent = (req) => {
  if (!WABA_APP_SECRET) return true;
  const sig = req.get('x-hub-signature-256');
  if (!sig) return true;
  const hmac = crypto.createHmac('sha256', WABA_APP_SECRET);
  const payload = req.rawBody || Buffer.from(JSON.stringify(req.body), 'utf-8');
  hmac.update(payload);
  const expected = `sha256=${hmac.digest('hex')}`;
  try { return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)); }
  catch { return false; }
};

/* ===== Webhook Verify (GET) ===== */
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === WABA_VERIFY_TOKEN) return res.status(200).send(challenge);
  return res.sendStatus(403);
});

/* ===== Webhook Receiver (POST) ===== */
router.post('/webhook', async (req, res) => {
  try {
    if (!verifySignatureIfPresent(req)) {
      console.error('❌ Assinatura X-Hub inválida');
      return res.sendStatus(403);
    }

    const change = req.body?.entry?.[0]?.changes?.[0];
    console.log('📩 Webhook change:', JSON.stringify(change, null, 2).slice(0, 800));

    const msgs = change?.value?.messages;
    if (!Array.isArray(msgs) || msgs.length === 0) return res.sendStatus(200);

    for (const msg of msgs) await handleIncomingMessage(msg);
    return res.sendStatus(200);
  } catch (err) {
    console.error('❌ Erro no webhook:', err?.response?.data || err);
    return res.sendStatus(200);
  }
});

/* ===== Handler principal ===== */
async function handleIncomingMessage(msg) {
  const from = onlyDigits(msg.from); // ex: 5513981964308
  const type = msg.type;
  const text =
    msg.text?.body?.trim() ||
    msg.interactive?.list_reply?.title ||
    msg.button?.text ||
    '';
  console.log(`👤 ${from} disse: "${text}" (tipo ${type})`);

  const session = sessions.get(from) || { step: 'start', payload: {} };
  const client = await upsertClientByPhone(from);

  switch (session.step) {
    case 'start':
      await sendText(from, `Olá, ${client.name || 'tudo bem'}? Eu sou o assistente de agendamentos.`);
      await sendChoices(from, 'O que você deseja?', [
        'Agendar atendimento',
        'Remarcar/Cancelar',
        'Falar com atendente',
      ]);
      session.step = 'menu';
      break;

    case 'menu': {
      const n = parseInt(text, 10);
      if (n === 1) {
        session.step = 'ask_service';
        await askService(from);
      } else if (n === 2) {
        session.step = 'reschedule_code';
        await sendText(from, 'Informe o código do agendamento (ou responda "voltar").');
      } else if (n === 3) {
        session.step = 'handoff';
        await sendText(from, 'Ok! Em instantes um atendente dará continuidade por aqui. ✅');
      } else {
        await sendText(from, 'Não entendi. Digite 1, 2 ou 3.');
      }
      break;
    }

    case 'ask_service': {
      const services = await listServices();
      const idx = parseInt(text, 10) - 1;
      if (Number.isNaN(idx) || idx < 0 || idx >= services.length) {
        await sendText(from, 'Escolha um número válido da lista.');
        await askService(from);
        break;
      }
      session.payload.service = services[idx];
      session.step = 'ask_professional';
      await askProfessional(from);
      break;
    }

    case 'ask_professional': {
      const staff = await listStaff();
      const idx = parseInt(text, 10) - 1;
      if (Number.isNaN(idx) || idx < 0 || idx >= staff.length) {
        await sendText(from, 'Escolha um número válido da lista.');
        await askProfessional(from);
        break;
      }
      session.payload.professional = staff[idx];
      session.step = 'ask_date';
      await sendText(from, 'Informe a data (AAAA-MM-DD). Ex: 2025-08-25');
      break;
    }

    case 'ask_date': {
      const day = String(text).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
        await sendText(from, 'Formato inválido. Use AAAA-MM-DD. Ex: 2025-08-25');
        break;
      }
      session.payload.date = day;
      session.step = 'ask_time';
      const slots = await listSlots(session.payload.professional.id, day, session.payload.service.id);
      if (slots.length === 0) {
        await sendText(from, 'Não encontrei horários neste dia. Quer tentar outra data? (responda com AAAA-MM-DD)');
        break;
      }
      await sendChoices(from, 'Horários disponíveis (selecione):', slots.slice(0, 8));
      break;
    }

    case 'ask_time': {
      const slots = await listSlots(session.payload.professional.id, session.payload.date, session.payload.service.id);
      const top = slots.slice(0, 8);
      const idx = parseInt(text, 10) - 1;
      if (Number.isNaN(idx) || idx < 0 || idx >= top.length) {
        await sendText(from, 'Escolha um número válido da lista.');
        await sendChoices(from, 'Horários disponíveis:', top);
        break;
      }
      const hhmm = top[idx];
      session.payload.time = hhmm;
      const sName = session.payload.service.name;
      const pName = session.payload.professional.name;
      await sendText(from, `Confirmar agendamento?
Serviço: ${sName}
Profissional: ${pName}
Data: ${session.payload.date}
Hora: ${hhmm}

Responda "sim" para confirmar ou "não" para cancelar.`);
      session.step = 'confirm';
      break;
    }

    case 'confirm': {
      const ok = text.toLowerCase();
      if (ok === 'sim' || ok === 's') {
        const created = await createAppointmentFromSession(client, session.payload);
        await sendText(from, `Agendamento criado! Código: ${created.id}
Nos vemos em ${session.payload.date} às ${session.payload.time}.`);
        session.step = 'start';
        session.payload = {};
      } else if (ok === 'não' || ok === 'nao' || ok === 'n') {
        await sendText(from, 'Ok, não confirmei. Quer tentar outro horário? (1) Sim  (2) Voltar ao menu');
        session.step = 'post_decline';
      } else {
        await sendText(from, 'Responda "sim" ou "não".');
      }
      break;
    }

    case 'post_decline': {
      const n = parseInt(text, 10);
      if (n === 1) {
        session.step = 'ask_date';
        await sendText(from, 'Informe a data (AAAA-MM-DD).');
      } else {
        session.step = 'start';
        await sendText(from, 'Voltando ao menu inicial.');
      }
      break;
    }

    case 'reschedule_code': {
      if (text.toLowerCase() === 'voltar') {
        session.step = 'start';
        await sendText(from, 'Voltei ao menu.');
        break;
      }
      await sendText(from, 'Recebi seu código. Em breve implementamos o fluxo de remarcação ✅');
      session.step = 'start';
      break;
    }

    default:
      session.step = 'start';
      await sendText(from, 'Vamos começar novamente.');
  }

  sessions.set(from, session);
}

/* ===== Integra com seu backend ===== */
async function listServices() {
  return prisma.service.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } });
}
async function listStaff() {
  return prisma.user.findMany({
    where: { showInBooking: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
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
    console.error('❌ Erro ao buscar slots:', e?.response?.data || e.message);
    return [];
  }
}
async function upsertClientByPhone(digits) {
  const phone = onlyDigits(digits);
  let c = await prisma.client.findFirst({ where: { phone } });
  if (!c) {
    c = await prisma.client.create({
      data: {
        name: 'Cliente WhatsApp',
        phone,
        companyId: await getDefaultCompanyId(),
        isActive: true,
      },
    });
  }
  return c;
}
async function getDefaultCompanyId() {
  const comp = await prisma.company.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } });
  return comp?.id;
}
async function createAppointmentFromSession(client, payload) {
  const { service, professional, date, time } = payload;
  const startISO = new Date(`${date}T${time}:00.000Z`);
  const svc = await prisma.service.findFirst({ where: { id: service.id }, select: { duration: true } });
  const endISO = new Date(startISO.getTime() + (svc?.duration || 60) * 60000);
  return prisma.appointment.create({
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
}

/* ===== Rota de debug opcional =====
   Use adicionando ?key=SEU_DEBUG_WHATS_KEY&to=5513981...&text=oi
   (coloque DEBUG_WHATS_KEY no .env da Railway para proteger) */
router.get('/debug/send', async (req, res) => {
  try {
    if (!DEBUG_WHATS_KEY || req.query.key !== DEBUG_WHATS_KEY) return res.sendStatus(403);
    const to = req.query.to;
    const text = req.query.text || 'ping';
    const r = await sendText(to, text);
    res.json(r);
  } catch (e) {
    res.status(500).json(e?.response?.data || { error: e.message });
  }
});

export default router;
