// src/routes/whatsappRoutes.js
import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import prisma from '../prismaClient.js';

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
      { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } },
      { headers: { Authorization: `Bearer ${WABA_ACCESS_TOKEN}` } }
    );
    console.log('✅ Enviado com sucesso. ID:', data?.messages?.[0]?.id);
  } catch (err) {
    console.error('❌ Erro ao enviar mensagem:', err?.response?.data || err.message);
  }
};

const sendChoices = async (to, title, options = []) => {
  const opts = Array.isArray(options) ? options.filter(Boolean) : [];
  if (!opts.length) return sendText(to, `${title}\n(não há itens para selecionar)`);
  const body = [title, ...opts.map((o, i) => `${i + 1}. ${o}`)].join('\n');
  return sendText(to, body);
};

const verifySignatureIfPresent = (req) => {
  if (!WABA_APP_SECRET) return true;
  const sigHeader = req.get('x-hub-signature-256');
  if (!sigHeader) return true;
  const hmac = crypto.createHmac('sha256', WABA_APP_SECRET);
  // req.rawBody foi setado no server.js
  hmac.update(req.rawBody);
  const expected = `sha256=${hmac.digest('hex')}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(sigHeader), Buffer.from(expected));
  } catch {
    return false;
  }
};

/** Converte "DD/MM/AAAA" -> "AAAA-MM-DD"; se já vier ISO, mantém. */
const normalizeDateToISO = (txt) => {
  const s = String(txt || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // ISO já ok
  const m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/); // BR
  if (m) {
    const [_, dd, mm, yyyy] = m;
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
};

/** Formata ISO (AAAA-MM-DD) -> "DD/MM/AAAA" */
const formatBR = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return String(iso || '');
  const [yyyy, mm, dd] = iso.split('-');
  return `${dd}/${mm}/${yyyy}`;
};

/** Gera slots padrão (fallback) — 09:00..18:00 em passos de stepMin */
const pad2 = (n) => String(n).padStart(2, '0');
const fallbackSlots = (dateISO, stepMin = 30, openHour = 9, closeHour = 18, serviceMin = 30) => {
  const list = [];
  const lastStart = closeHour * 60 - serviceMin;
  for (let m = openHour * 60; m <= lastStart; m += stepMin) {
    const hh = Math.floor(m / 60);
    const mm = m % 60;
    list.push(`${pad2(hh)}:${pad2(mm)}`);
  }
  console.log(`🧩 fallbackSlots(${dateISO}) =>`, list);
  return list;
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
    console.error('WhatsApp webhook error:', err?.response?.data || err);
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

  // helper para pegar sempre BR na resposta
  const dateBR = () => formatBR(session.payload.dateISO || '');

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
      await sendText(to, 'Informe a data **(DD/MM/AAAA)**. Ex.: 25/08/2025');
      break;
    }

    case 'ask_date': {
      const iso = normalizeDateToISO(text);
      if (!iso) {
        await sendText(to, 'Formato inválido. Use **DD/MM/AAAA**. Ex.: 25/08/2025');
        break;
      }
      // Guardamos SEMPRE as duas formas
      session.payload.dateISO = iso;          // para cálculos/requests
      session.payload.dateBR = formatBR(iso); // para mensagens

      session.step = 'ask_time';

      const slots = await listSlots(
        session.payload.professional.id,
        session.payload.dateISO,
        session.payload.service.id
      );

      if (!slots.length) {
        await sendText(
          to,
          `Não encontrei horários em ${session.payload.dateBR}. Envie outra data (DD/MM/AAAA) ou digite "voltar".`
        );
        break;
      }

      const top = slots.slice(0, 8);
      await sendChoices(to, `Horários disponíveis para ${session.payload.dateBR} (escolha um número):`, top);
      break;
    }

    case 'ask_time': {
      const slots = await listSlots(
        session.payload.professional.id,
        session.payload.dateISO,
        session.payload.service.id
      );
      const top = slots.slice(0, 8);
      const pick = parseInt(text, 10) - 1;
      if (!top.length) {
        await sendText(to, `Sem horários. Envie outra data (DD/MM/AAAA).`);
        session.step = 'ask_date';
        break;
      }
      if (Number.isNaN(pick) || pick < 0 || pick >= top.length) {
        await sendText(to, 'Escolha um número válido da lista.');
        await sendChoices(to, `Horários disponíveis para ${session.payload.dateBR}:`, top);
        break;
      }
      const hhmm = top[pick];
      session.payload.time = hhmm;

      await sendText(
        to,
        `Confirmar agendamento?\n` +
          `Serviço: ${session.payload.service.name}\n` +
          `Profissional: ${session.payload.professional.name}\n` +
          `Data: ${session.payload.dateBR}\n` +
          `Hora: ${hhmm}\n\n` +
          `Responda "sim" para confirmar ou "não" para cancelar.`
      );
      session.step = 'confirm';
      break;
    }

    case 'confirm': {
      const ok = text.toLowerCase();
      if (ok === 'sim' || ok === 's') {
        const created = await createAppointmentFromSession(client, {
          ...session.payload,
          date: session.payload.dateISO, // garantir ISO internamente
        });
        await sendText(
          to,
          `Agendamento criado! Código: ${created.id}\n` +
            `Nos vemos em ${session.payload.dateBR} às ${session.payload.time}.`
        );
        session.step = 'start';
        session.payload = {};
      } else if (ok === 'não' || ok === 'nao' || ok === 'n') {
        await sendText(to, 'Ok, não confirmei. Quer tentar outro horário?\n(1) Sim\n(2) Voltar ao menu');
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
        await sendText(to, 'Informe a data **(DD/MM/AAAA)**.');
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

/** ====== Acesso ao seu backend/banco ====== */

async function listServices() {
  try {
    const rows = await prisma.service.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, duration: true },
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

/**
 * Busca horários disponíveis no seu endpoint público com vários fallbacks.
 * Se ainda assim vier vazio, gera fallback local (09:00–18:00).
 */
async function listSlots(proId, dateISO, serviceId) {
  let svcDuration = 30;
  try {
    if (serviceId) {
      const svc = await prisma.service.findUnique({ where: { id: serviceId }, select: { duration: true } });
      if (svc?.duration) svcDuration = svc.duration;
    }
  } catch {}

  const base = (APP_BASE_URL || '').replace(/\/$/, '');
  const url = `${base}/public/available-slots`;

  const paramSets = [
    { staffId: proId, date: dateISO, serviceId, duration: svcDuration },
    { userId: proId, date: dateISO, serviceId, duration: svcDuration },
    { professionalId: proId, date: dateISO, serviceId, duration: svcDuration },
    { staffId: proId, date: dateISO, duration: svcDuration },
    { date: dateISO, serviceId, duration: svcDuration },
    { date: dateISO, duration: svcDuration },
    { date: dateISO },
  ];

  for (const params of paramSets) {
    try {
      console.log('🔎 GET', url, 'params=', params);
      const res = await axios.get(url, { params });
      const raw = res.data;

      let items = [];
      if (Array.isArray(raw)) items = raw;
      else if (Array.isArray(raw?.slots)) items = raw.slots;
      else if (Array.isArray(raw?.data)) items = raw.data;
      else if (raw && typeof raw === 'object') {
        const keys = Object.keys(raw);
        const candidateKey = keys.find((k) => Array.isArray(raw[k]));
        if (candidateKey) items = raw[candidateKey];
      }

      const hhmm = (items || [])
        .map((s) => {
          if (typeof s === 'string') return s;
          if (!s || typeof s !== 'object') return null;
          return s.formatted || s.time || s.hour || s.hhmm || s.start || null;
        })
        .filter(Boolean)
        .map((t) => String(t).slice(0, 5));

      if (hhmm.length) return hhmm;
    } catch (e) {
      console.log('⚠️ listSlots falhou', e?.response?.status, e?.response?.data || e.message);
    }
  }

  console.log('🧯 Nenhum slot remoto. Usando fallback local.');
  return fallbackSlots(dateISO, 30, 9, 18, svcDuration);
}

async function upsertClientByPhone(whatsPhone) {
  const phone = String(whatsPhone).replace('+', '');
  let c = await prisma.client.findFirst({ where: { phone } });
  if (!c) {
    const companyId = await getDefaultCompanyId();
    c = await prisma.client.create({
      data: { name: 'Cliente WhatsApp', phone, companyId, isActive: true },
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
  const { service, professional, date, time } = payload; // date é ISO
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

/** ====== telas auxiliares ====== */
async function askService(to, session) {
  const services = await listServices();
  if (!services.length) {
    await sendText(to, 'Não há serviços cadastrados.');
    session.step = 'start';
    return;
  }
  await sendChoices(to, 'Escolha o serviço:', services.map((s) => s.name));
}

async function askProfessional(to, session) {
  const staff = await listStaff();
  if (!staff.length) {
    await sendText(to, 'Nenhum profissional disponível.');
    session.step = 'start';
    return;
  }
  await sendChoices(to, 'Escolha o profissional:', staff.map((s) => s.name));
}

export default router;
