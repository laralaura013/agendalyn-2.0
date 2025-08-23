// src/routes/whatsappRoutes.js
import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import prisma from '../prismaClient.js';

const router = express.Router();

/** ================== ENV ================== */
const {
  WABA_VERIFY_TOKEN,
  WABA_ACCESS_TOKEN,
  WABA_PHONE_NUMBER_ID,
  APP_BASE_URL = 'http://localhost:3001/api',
  WABA_APP_SECRET, // opcional (validação da assinatura do webhook)
} = process.env;

const GRAPH_URL = `https://graph.facebook.com/v20.0/${WABA_PHONE_NUMBER_ID}/messages`;

/** ================== Sessões em memória (produção: usar Redis) ================== */
const sessions = new Map();

/** ================== Utils ================== */
/** Normaliza fone para E.164 BR */
const e164BR = (phone) => {
  if (!phone) return null;
  const only = String(phone).replace(/\D/g, '');
  if (only.startsWith('55')) return `+${only}`;
  if (only.length === 11 || only.length === 10) return `+55${only}`;
  if (only.length === 13 && only.startsWith('55')) return `+${only}`;
  return `+${only}`;
};

/** "DD/MM/AAAA" ou "DD-MM-AAAA" -> "AAAA-MM-DD". Se já vier ISO, mantém. */
const toISODate = (s) => {
  if (!s) return null;
  const t = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t; // já está em ISO
  const m = t.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/); // DD/MM/AAAA
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
};

/** ISO "AAAA-MM-DD" -> "DD/MM/AAAA" (para exibir ao usuário) */
const formatBR = (iso) => {
  if (!iso) return '';
  const [Y, M, D] = String(iso).split('-');
  if (!Y || !M || !D) return iso;
  return `${D}/${M}/${Y}`;
};

/** Envia texto simples */
const sendText = async (to, body) => {
  try {
    const { data } = await axios.post(
      GRAPH_URL,
      { messaging_product: 'whatsapp', to, type: 'text', text: { body } },
      { headers: { Authorization: `Bearer ${WABA_ACCESS_TOKEN}` } }
    );
    const msgId = data?.messages?.[0]?.id;
    console.log('✅ Enviado:', msgId || '(sem id)');
  } catch (err) {
    console.error('❌ Erro ao enviar texto:', err?.response?.data || err.message);
  }
};

/** Lista simples "1. Opção" */
const sendChoices = async (to, title, options = []) => {
  const lines = [title, ...options.map((o, i) => `${i + 1}. ${o}`)];
  return sendText(to, lines.join('\n'));
};

/** (Opcional) valida a assinatura do webhook se WABA_APP_SECRET estiver setado */
const isValidSignature = (req) => {
  if (!WABA_APP_SECRET) return true;
  const sigHeader = req.get('x-hub-signature-256');
  if (!sigHeader) return true;
  const raw =
    typeof req.rawBody === 'string' ? Buffer.from(req.rawBody, 'utf8') : req.rawBody;
  const hmac = crypto.createHmac('sha256', WABA_APP_SECRET);
  hmac.update(raw);
  const expected = `sha256=${hmac.digest('hex')}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(sigHeader), Buffer.from(expected));
  } catch {
    return false;
  }
};

/** ================== VERIFY (GET) ================== */
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === WABA_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

/** ================== RECEIVER (POST) ================== */
router.post('/webhook', async (req, res) => {
  try {
    if (!isValidSignature(req)) {
      console.warn('⚠️ Assinatura inválida');
      return res.sendStatus(403);
    }

    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];

    // Log útil para depuração
    console.log('📩 Webhook change:', JSON.stringify(change, null, 2));

    const value = change?.value;
    const messages = value?.messages;

    // Ignora eventos de status (sent, delivered, read)
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.sendStatus(200);
    }

    for (const msg of messages) {
      await handleIncomingMessage(msg);
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error('WhatsApp webhook error:', err?.response?.data || err);
    return res.sendStatus(200);
  }
});

/** ================== Conversa (FSM simples) ================== */
async function handleIncomingMessage(msg) {
  const to = e164BR(`+${msg.from}`.replace('++', '+'));
  const kind = msg.type;
  const text =
    msg.text?.body?.trim() ||
    msg.interactive?.list_reply?.title ||
    msg.button?.text ||
    '';

  console.log(`👤 ${msg.from} disse: "${text}" (tipo ${kind})`);

  const session = sessions.get(to) || { step: 'start', payload: {} };

  // Comandos globais
  if (['voltar', 'menu'].includes(text.toLowerCase())) {
    session.step = 'start';
    session.payload = {};
  }

  // Garante cliente no banco
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
        await askService(to);
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
      const services = await listServices();
      const idx = parseInt(text, 10) - 1;
      if (!services.length) {
        await sendText(to, 'Não há serviços cadastrados no sistema.');
        session.step = 'start';
        break;
      }
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
      if (!staff.length) {
        await sendText(to, 'Nenhum profissional disponível para agendamento.');
        session.step = 'start';
        break;
      }
      if (Number.isNaN(idx) || idx < 0 || idx >= staff.length) {
        await sendText(to, 'Escolha um número válido da lista.');
        await askProfessional(to);
        break;
      }
      session.payload.professional = staff[idx];
      session.step = 'ask_date';
      await sendText(to, 'Informe a data (DD/MM/AAAA). Ex.: 25/08/2025');
      break;
    }

    case 'ask_date': {
      const iso = toISODate(text); // aceita "25/08/2025" ou "25-08-2025"
      if (!iso) {
        await sendText(to, 'Formato inválido. Use DD/MM/AAAA. Ex.: 25/08/2025');
        break;
      }
      session.payload.date = iso;
      session.step = 'ask_time';

      const slots = await listSlots(
        session.payload.professional.id,
        iso,
        session.payload.service.id
      );
      if (!slots.length) {
        await sendText(
          to,
          'Não encontrei horários neste dia. Envie outra data (DD/MM/AAAA) ou digite "voltar".'
        );
        break;
      }
      await sendChoices(
        to,
        `Horários disponíveis (${formatBR(iso)}):`,
        slots.slice(0, 8)
      );
      break;
    }

    case 'ask_time': {
      const slots = await listSlots(
        session.payload.professional.id,
        session.payload.date,
        session.payload.service.id
      );
      const top = slots.slice(0, 8);
      const idx = parseInt(text, 10) - 1;
      if (Number.isNaN(idx) || idx < 0 || idx >= top.length) {
        await sendText(to, 'Escolha um número válido da lista.');
        await sendChoices(to, `Horários disponíveis (${formatBR(session.payload.date)}):`, top);
        break;
      }
      const hhmm = top[idx];
      session.payload.time = hhmm;

      await sendText(
        to,
        `Confirmar agendamento?\n` +
          `Serviço: ${session.payload.service.name}\n` +
          `Profissional: ${session.payload.professional.name}\n` +
          `Data: ${formatBR(session.payload.date)}\n` +
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
            `Nos vemos em ${formatBR(session.payload.date)} às ${session.payload.time}.`
        );
        session.step = 'start';
        session.payload = {};
      } else if (ok === 'não' || ok === 'nao' || ok === 'n') {
        await sendText(
          to,
          'Ok, não confirmei. Quer tentar outro horário?\n(1) Sim\n(2) Voltar ao menu'
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
        await sendText(to, 'Informe a data (DD/MM/AAAA).');
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

    default: {
      session.step = 'start';
      await sendText(to, 'Vamos começar novamente.');
    }
  }

  sessions.set(to, session);
}

/** ================== PROMPTS AUXILIARES (agora definidos!) ================== */
async function askService(to) {
  const services = await listServices();
  if (!services.length) {
    await sendText(to, 'Não há serviços cadastrados no sistema.');
    return;
  }
  await sendChoices(to, 'Escolha um serviço:', services.map((s) => s.name));
}

async function askProfessional(to) {
  const staff = await listStaff();
  if (!staff.length) {
    await sendText(to, 'Nenhum profissional disponível para agendamento.');
    return;
  }
  await sendChoices(to, 'Escolha um profissional:', staff.map((s) => s.name));
}

/** ================== Acesso ao seu backend/banco ================== */
async function listServices() {
  try {
    return await prisma.service.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  } catch (e) {
    console.error('Erro listServices:', e.message);
    return [];
  }
}

async function listStaff() {
  try {
    return await prisma.user.findMany({
      where: { showInBooking: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  } catch (e) {
    console.error('Erro listStaff:', e.message);
    return [];
  }
}

/** Busca horários disponíveis no seu endpoint público */
async function listSlots(proId, isoDate, serviceId) {
  try {
    const res = await axios.get(`${APP_BASE_URL}/public/available-slots`, {
      params: { staffId: proId, date: isoDate, serviceId },
    });
    return (Array.isArray(res.data) ? res.data : [])
      .map((s) => (typeof s === 'string' ? s : s?.formatted || s?.time))
      .filter(Boolean);
  } catch (e) {
    console.error('Erro ao buscar slots:', e?.response?.data || e.message);
    return [];
  }
}

/** Cria/atualiza cliente por telefone */
async function upsertClientByPhone(whatsPhone) {
  const phone = String(whatsPhone).replace('+', ''); // seu schema guarda sem '+'
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

/** Cria agendamento a partir do payload da sessão */
async function createAppointmentFromSession(client, payload) {
  const { service, professional, date, time } = payload; // date em ISO (AAAA-MM-DD)
  // Usa horário local do servidor; ajuste timezone se necessário (ex.: date-fns-tz).
  const start = new Date(`${date}T${time}:00`);
  const svc = await prisma.service.findUnique({
    where: { id: service.id },
    select: { duration: true },
  });
  const duration = svc?.duration || 60;
  const end = new Date(start.getTime() + duration * 60000);

  return prisma.appointment.create({
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
}

export default router;
