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

/** ================== Sessões em memória (produção: usar Redis) ================== */
const sessions = new Map();

/** ================== Utils ================== */
const e164BR = (phone) => {
  if (!phone) return null;
  const only = String(phone).replace(/\D/g, '');
  if (only.startsWith('55')) return `+${only}`;
  if (only.length === 11 || only.length === 10) return `+55${only}`;
  if (only.length === 13 && only.startsWith('55')) return `+${only}`;
  return `+${only}`;
};

const toISODate = (s) => {
  if (!s) return null;
  const t = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
};

const formatBR = (iso) => {
  if (!iso) return '';
  const [Y, M, D] = String(iso).split('-');
  if (!Y || !M || !D) return iso;
  return `${D}/${M}/${Y}`;
};

/** Extrai slug no texto: "#slug" ou "/slug" ou "slug:XXXX" */
const extractSlug = (txt) => {
  if (!txt) return null;
  const t = String(txt).trim();
  const m1 = t.match(/(?:^|\s)[#/]([a-z0-9-]{3,40})(?:\s|$)/i);
  if (m1) return m1[1].toLowerCase();
  const m2 = t.match(/\bslug\s*[:=]\s*([a-z0-9-]{3,40})\b/i);
  if (m2) return m2[1].toLowerCase();
  return null;
};

const safeParseJSON = (v) => {
  try {
    if (v == null) return null;
    return typeof v === 'string' ? JSON.parse(v) : v;
  } catch {
    return null;
  }
};

/** Monta config de envio priorizando credenciais da empresa */
const getWabaSendConfig = (company) => {
  if (company && company.wabaAccessToken && company.wabaPhoneNumberId && !company.useSharedWaba) {
    return {
      token: company.wabaAccessToken,
      phoneNumberId: company.wabaPhoneNumberId,
      graphUrl: `https://graph.facebook.com/v20.0/${company.wabaPhoneNumberId}/messages`,
      companyId: company.id,
    };
  }
  return {
    token: WABA_ACCESS_TOKEN,
    phoneNumberId: WABA_PHONE_NUMBER_ID,
    graphUrl: `https://graph.facebook.com/v20.0/${WABA_PHONE_NUMBER_ID}/messages`,
    companyId: company?.id || null,
  };
};

const sendText = async (to, body, company = null) => {
  const cfg = getWabaSendConfig(company);
  try {
    const { data } = await axios.post(
      cfg.graphUrl,
      { messaging_product: 'whatsapp', to, type: 'text', text: { body } },
      { headers: { Authorization: `Bearer ${cfg.token}` } }
    );
    const msgId = data?.messages?.[0]?.id;
    console.log(`✅ Enviado (${cfg.companyId || 'shared'}):`, msgId || '(sem id)');
  } catch (err) {
    console.error('❌ Erro ao enviar texto:', err?.response?.data || err.message);
  }
};

const sendChoices = async (to, title, options = [], company = null) => {
  const lines = [title, ...options.map((o, i) => `${i + 1}. ${o}`)];
  return sendText(to, lines.join('\n'), company);
};

/** Assinatura do webhook (opcional) */
const isValidSignature = (req) => {
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

/** ================== SETTINGS (painel) ================== */
/** GET /integrations/whatsapp/settings */
router.get('/settings', async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return res.status(401).json({ message: 'Empresa não identificada (auth).' });

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        slug: true,
        whatsappEnabled: true,
        useSharedWaba: true,
        wabaAccessToken: true,
        wabaPhoneNumberId: true,
        wabaAppSecret: true,
        botGreeting: true,
        botCancelPolicy: true,
        botMenuJson: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        whatsappStatus: true,
        whatsappLastCheckAt: true,
      },
    });

    if (!company) return res.status(404).json({ message: 'Empresa não encontrada.' });

    // monta resposta amigável
    const botMenuItems =
      safeParseJSON(company.botMenuJson) ??
      [
        { label: 'Agendar atendimento', value: 'BOOKING' },
        { label: 'Remarcar/Cancelar', value: 'RESCHEDULE' },
        { label: 'Falar com atendente', value: 'HUMAN' },
      ];

    return res.json({
      whatsappEnabled: !!company.whatsappEnabled,
      useSharedWaba: !!company.useSharedWaba,
      wabaAccessToken: company.wabaAccessToken || '',
      wabaPhoneNumberId: company.wabaPhoneNumberId || '',
      wabaAppSecret: company.wabaAppSecret || '',
      botGreeting: company.botGreeting || '',
      botCancelPolicy: company.botCancelPolicy || '',
      botMenuItems,
      slug: company.slug || '',
      subscriptionPlan: company.subscriptionPlan || '',
      subscriptionStatus: company.subscriptionStatus || '',
      whatsappStatus: company.whatsappStatus || null,
      whatsappLastCheckAt: company.whatsappLastCheckAt || null,
    });
  } catch (e) {
    console.error('GET /settings error:', e);
    return res.status(500).json({ message: 'Erro ao carregar configurações.' });
  }
});

/** PUT /integrations/whatsapp/settings */
router.put('/settings', async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return res.status(401).json({ message: 'Empresa não identificada (auth).' });

    const {
      whatsappEnabled,
      useSharedWaba,
      wabaAccessToken,
      wabaPhoneNumberId,
      wabaAppSecret,
      botGreeting,
      botCancelPolicy,
      botMenuItems,
      slug,
    } = req.body || {};

    // valida menu (array de {label, value})
    const normalizedMenu = Array.isArray(botMenuItems)
      ? botMenuItems
          .filter((x) => x && (x.label || x.value))
          .map((x) => ({
            label: String(x.label || x.value).trim(),
            value: String(x.value || x.label).trim().toUpperCase(),
          }))
      : null;

    // Atualiza
    const updated = await prisma.company.update({
      where: { id: companyId },
      data: {
        whatsappEnabled: !!whatsappEnabled,
        useSharedWaba: !!useSharedWaba,
        wabaAccessToken: wabaAccessToken || null,
        wabaPhoneNumberId: wabaPhoneNumberId || null,
        wabaAppSecret: wabaAppSecret || null,
        botGreeting: botGreeting || null,
        botCancelPolicy: botCancelPolicy || null,
        botMenuJson: normalizedMenu ? JSON.stringify(normalizedMenu) : prisma.Prisma.DbNull,
        // slug é opcional; só seta se vier string
        ...(typeof slug === 'string' && slug.trim()
          ? { slug: slug.trim().toLowerCase() }
          : {}),
      },
      select: { id: true },
    });

    return res.json({ ok: true, id: updated.id });
  } catch (e) {
    // trata possível unique(slug)
    if (e?.code === 'P2002' && e?.meta?.target?.includes('slug')) {
      return res.status(400).json({ message: 'Este slug já está em uso por outra empresa.' });
    }
    console.error('PUT /settings error:', e);
    return res.status(500).json({ message: 'Erro ao salvar configurações.' });
  }
});

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
    console.log('📩 Webhook change:', JSON.stringify(change, null, 2));

    const value = change?.value;
    const messages = value?.messages;
    const phoneNumberId = value?.metadata?.phone_number_id;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.sendStatus(200);
    }

    for (const msg of messages) {
      await handleIncomingMessage(msg, phoneNumberId);
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error('WhatsApp webhook error:', err?.response?.data || err);
    return res.sendStatus(200);
  }
});

/** ================== ROTEAMENTO MULTI-EMPRESA ================== */
async function companyByPhoneNumberId(phoneNumberId) {
  if (!phoneNumberId) return null;
  return prisma.company.findFirst({
    where: { wabaPhoneNumberId: phoneNumberId, whatsappEnabled: true },
  });
}

async function companyByClientHistory(normalizedPhone) {
  const phoneNoPlus = String(normalizedPhone).replace('+', '');
  const cli = await prisma.client.findFirst({
    where: { phone: phoneNoPlus },
    select: { companyId: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!cli?.companyId) return null;
  return prisma.company.findUnique({ where: { id: cli.companyId } });
}

async function companyBySlug(slug) {
  if (!slug) return null;
  return prisma.company.findFirst({
    where: { slug: slug.toLowerCase(), whatsappEnabled: true },
  });
}

async function resolveCompany({ phoneNumberId, from, text }) {
  const byNumber = await companyByPhoneNumberId(phoneNumberId);
  if (byNumber) return { company: byNumber, reason: 'phone_number_id' };

  const normFrom = e164BR(`+${from}`.replace('++', '+'));
  const byHistory = await companyByClientHistory(normFrom);
  if (byHistory) return { company: byHistory, reason: 'client_history' };

  const slug = extractSlug(text);
  if (slug) {
    const bySlug = await companyBySlug(slug);
    if (bySlug) return { company: bySlug, reason: 'slug' };
  }

  return { company: null, reason: 'unresolved' };
}

/** ================== Conversa (FSM) ================== */
async function handleIncomingMessage(msg, phoneNumberIdFromWebhook) {
  const to = e164BR(`+${msg.from}`.replace('++', '+'));
  const kind = msg.type;
  const text =
    msg.text?.body?.trim() ||
    msg.interactive?.list_reply?.title ||
    msg.button?.text ||
    '';

  console.log(`👤 ${msg.from} disse: "${text}" (tipo ${kind})`);

  const { company } = await resolveCompany({
    phoneNumberId: phoneNumberIdFromWebhook,
    from: msg.from,
    text,
  });

  const sessionKey = `${company?.id || 'shared'}:${to}`;
  const session = sessions.get(sessionKey) || { step: 'start', payload: {} };

  if (!company) {
    const slug = extractSlug(text);
    if (slug) {
      const comp = await companyBySlug(slug);
      if (comp) {
        sessions.delete(sessionKey);
        const newKey = `${comp.id}:${to}`;
        sessions.set(newKey, { step: 'start', payload: {} });
        await sendText(
          to,
          `Você está falando com *${comp.name}*. Vamos começar!`,
          comp
        );
        return handleIncomingMessage({ ...msg, text: { body: 'menu' } }, phoneNumberIdFromWebhook);
      }
    }

    await sendText(
      to,
      'Olá! 👋 Este é o WhatsApp do Agendalyn.\n' +
        'Para continuar, envie o *código da sua barbearia* no formato `#slug` (ex.: `#agendalyn`).\n' +
        'Dica: use o link oficial da barbearia para já vir com o código preenchido.',
      null
    );
    return;
  }

  if (['voltar', 'menu', 'reiniciar', 'restart', 'start'].includes(text.toLowerCase())) {
    session.step = 'start';
    session.payload = {};
  }

  const client = await upsertClientByPhone(to, company.id);

  const menuItems =
    safeParseJSON(company.botMenuJson) ?? [
      { label: 'Agendar atendimento', value: 'BOOKING' },
      { label: 'Remarcar/Cancelar', value: 'RESCHEDULE' },
      { label: 'Falar com atendente', value: 'HUMAN' },
    ];

  const greeting =
    company.botGreeting ||
    `Olá${client?.name ? `, ${client.name}` : ''}! Eu sou o assistente de agendamentos.`;

  switch (session.step) {
    case 'start': {
      await sendText(to, greeting, company);
      await sendChoices(to, 'O que você deseja?', menuItems.map((m) => m.label), company);
      session.step = 'menu';
      break;
    }

    case 'menu': {
      const n = parseInt(text, 10);
      if (Number.isNaN(n) || n < 1 || n > menuItems.length) {
        await sendText(to, 'Não entendi. Responda com o número de uma opção.', company);
        await sendChoices(to, 'O que você deseja?', menuItems.map((m) => m.label), company);
        break;
      }
      const chosen = (menuItems[n - 1]?.value || '').toUpperCase();

      if (chosen === 'BOOKING' || chosen === 'SERVICES') {
        session.step = 'ask_service';
        await askService(to, company);
      } else if (['RESCHEDULE', 'CANCEL', 'RESCHEDULE_CANCEL'].includes(chosen)) {
        session.step = 'reschedule_code';
        await sendText(to, 'Informe o código do agendamento (ou digite "voltar").', company);
      } else if (['HUMAN', 'AGENT', 'ATTENDANT'].includes(chosen)) {
        session.step = 'handoff';
        await sendText(to, 'Ok! Em instantes um atendente dará continuidade por aqui. ✅', company);
      } else {
        // fallback: mapeia 1/2/3
        if (n === 1) {
          session.step = 'ask_service';
          await askService(to, company);
        } else if (n === 2) {
          session.step = 'reschedule_code';
          await sendText(to, 'Informe o código do agendamento (ou digite "voltar").', company);
        } else if (n === 3) {
          session.step = 'handoff';
          await sendText(to, 'Ok! Em instantes um atendente dará continuidade por aqui. ✅', company);
        } else {
          await sendText(to, 'Não entendi. Digite um número válido.', company);
        }
      }
      break;
    }

    case 'ask_service': {
      const services = await listServices(company.id);
      const idx = parseInt(text, 10) - 1;
      if (!services.length) {
        await sendText(to, 'Não há serviços cadastrados no sistema.', company);
        session.step = 'start';
        break;
      }
      if (Number.isNaN(idx) || idx < 0 || idx >= services.length) {
        await sendText(to, 'Escolha um número válido da lista.', company);
        await askService(to, company);
        break;
      }
      session.payload.service = services[idx];
      session.step = 'ask_professional';
      await askProfessional(to, company);
      break;
    }

    case 'ask_professional': {
      const staff = await listStaff(company.id);
      const idx = parseInt(text, 10) - 1;
      if (!staff.length) {
        await sendText(to, 'Nenhum profissional disponível para agendamento.', company);
        session.step = 'start';
        break;
      }
      if (Number.isNaN(idx) || idx < 0 || idx >= staff.length) {
        await sendText(to, 'Escolha um número válido da lista.', company);
        await askProfessional(to, company);
        break;
      }
      session.payload.professional = staff[idx];
      session.step = 'ask_date';
      await sendText(to, 'Informe a data (DD/MM/AAAA). Ex.: 25/08/2025', company);
      break;
    }

    case 'ask_date': {
      const iso = toISODate(text);
      if (!iso) {
        await sendText(to, 'Formato inválido. Use DD/MM/AAAA. Ex.: 25/08/2025', company);
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
          'Não encontrei horários neste dia. Envie outra data (DD/MM/AAAA) ou digite "voltar".',
          company
        );
        break;
      }
      await sendChoices(
        to,
        `Horários disponíveis (${formatBR(iso)}):`,
        slots.slice(0, 8),
        company
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
        await sendText(to, 'Escolha um número válido da lista.', company);
        await sendChoices(
          to,
          `Horários disponíveis (${formatBR(session.payload.date)}):`,
          top,
          company
        );
        break;
      }
      const hhmm = top[idx];
      session.payload.time = hhmm;

      const policyTxt = company.botCancelPolicy ? `\n\nPolítica: ${company.botCancelPolicy}` : '';

      await sendText(
        to,
        `Confirmar agendamento?\n` +
          `Serviço: ${session.payload.service.name}\n` +
          `Profissional: ${session.payload.professional.name}\n` +
          `Data: ${formatBR(session.payload.date)}\n` +
          `Hora: ${hhmm}\n\n` +
          `Responda "sim" para confirmar ou "não" para cancelar.` +
          policyTxt,
        company
      );
      session.step = 'confirm';
      break;
    }

    case 'confirm': {
      const ok = text.toLowerCase();
      if (ok === 'sim' || ok === 's') {
        const created = await createAppointmentFromSession(client, session.payload, company.id);
        await sendText(
          to,
          `Agendamento criado! Código: ${created.id}\n` +
            `Nos vemos em ${formatBR(session.payload.date)} às ${session.payload.time}.`,
          company
        );
        session.step = 'start';
        session.payload = {};
      } else if (ok === 'não' || ok === 'nao' || ok === 'n') {
        await sendText(
          to,
          'Ok, não confirmei. Quer tentar outro horário?\n(1) Sim\n(2) Voltar ao menu',
          company
        );
        session.step = 'post_decline';
      } else {
        await sendText(to, 'Responda "sim" ou "não".', company);
      }
      break;
    }

    case 'post_decline': {
      const n = parseInt(text, 10);
      if (n === 1) {
        session.step = 'ask_date';
        await sendText(to, 'Informe a data (DD/MM/AAAA).', company);
      } else {
        session.step = 'start';
        await sendText(to, 'Voltando ao menu inicial.', company);
      }
      break;
    }

    case 'reschedule_code': {
      if (text.toLowerCase() === 'voltar') {
        session.step = 'start';
        await sendText(to, 'Voltei ao menu.', company);
        break;
      }
      await sendText(to, 'Recebi seu código. Em breve implementamos a remarcação ✅', company);
      session.step = 'start';
      break;
    }

    default: {
      session.step = 'start';
      await sendText(to, 'Vamos começar novamente.', company);
    }
  }

  sessions.set(sessionKey, session);
}

/** Auxiliares de prompt */
async function askService(to, company) {
  const services = await listServices(company.id);
  if (!services.length) {
    await sendText(to, 'Não há serviços cadastrados no sistema.', company);
    return;
  }
  await sendChoices(to, 'Escolha um serviço:', services.map((s) => s.name), company);
}

async function askProfessional(to, company) {
  const staff = await listStaff(company.id);
  if (!staff.length) {
    await sendText(to, 'Nenhum profissional disponível para agendamento.', company);
    return;
  }
  await sendChoices(to, 'Escolha um profissional:', staff.map((s) => s.name), company);
}

/** DB */
async function listServices(companyId) {
  try {
    return await prisma.service.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  } catch (e) {
    console.error('Erro listServices:', e.message);
    return [];
  }
}

async function listStaff(companyId) {
  try {
    return await prisma.user.findMany({
      where: { companyId, showInBooking: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  } catch (e) {
    console.error('Erro listStaff:', e.message);
    return [];
  }
}

/** Slots via seu endpoint público */
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

async function upsertClientByPhone(whatsPhone, companyId) {
  const phone = String(whatsPhone).replace('+', '');
  let c = await prisma.client.findFirst({ where: { phone, companyId } });
  if (!c) {
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

async function createAppointmentFromSession(client, payload, companyId) {
  const { service, professional, date, time } = payload;
  const start = new Date(`${date}T${time}:00`);
  const svc = await prisma.service.findUnique({
    where: { id: service.id },
    select: { duration: true },
  });
  const duration = svc?.duration || 60;
  const end = new Date(start.getTime() + duration * 60000);

  return prisma.appointment.create({
    data: {
      companyId,
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

/** ================== Utilidades extra p/ painel ================== */
router.get('/meta-info', (_req, res) => {
  const base = APP_BASE_URL.replace(/\/+$/, '');
  res.json({
    webhookUrl: `${base}/integrations/whatsapp/webhook`,
    verifyToken: WABA_VERIFY_TOKEN ? '*** set ***' : '(defina WABA_VERIFY_TOKEN no .env)',
    phoneNumberIdShared: WABA_PHONE_NUMBER_ID || null,
  });
});

router.get('/health', async (req, res) => {
  try {
    const companyId = req.companyId;
    const company = companyId ? await prisma.company.findUnique({ where: { id: companyId } }) : null;
    const cfg = getWabaSendConfig(company);
    const { data } = await axios.get(
      `https://graph.facebook.com/v20.0/${cfg.phoneNumberId}`,
      { headers: { Authorization: `Bearer ${cfg.token}` } }
    );
    // salva carimbo/estado (opcional)
    if (companyId) {
      await prisma.company.update({
        where: { id: companyId },
        data: { whatsappStatus: 'OK', whatsappLastCheckAt: new Date() },
      });
    }
    return res.json({ status: 'OK', meta: { whatsappLastCheckAt: new Date().toISOString(), data } });
  } catch (e) {
    const companyId = req.companyId;
    if (companyId) {
      await prisma.company.update({
        where: { id: companyId },
        data: { whatsappStatus: 'ERROR', whatsappLastCheckAt: new Date() },
      }).catch(() => {});
    }
    return res.status(500).json({
      status: 'ERROR',
      error: e?.response?.data || e.message,
      meta: { whatsappLastCheckAt: new Date().toISOString() },
    });
  }
});

router.post('/test', async (req, res) => {
  try {
    const { to, text } = req.body || {};
    if (!to || !text) return res.status(400).json({ message: 'Parâmetros to e text são obrigatórios.' });

    const companyId = req.companyId;
    const company = companyId ? await prisma.company.findUnique({ where: { id: companyId } }) : null;

    const norm = e164BR(to);
    await sendText(norm, text, company);
    return res.json({ ok: true });
  } catch (e) {
    console.error('Erro /test:', e?.response?.data || e.message);
    return res.status(500).json({ message: 'Falha ao enviar mensagem' });
  }
});

export default router;
