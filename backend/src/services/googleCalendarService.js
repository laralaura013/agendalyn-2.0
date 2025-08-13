// src/services/googleCalendarService.js
import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();
const prisma = new PrismaClient();

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  GOOGLE_SCOPES,
  JWT_SECRET = 'supersecret',
} = process.env;

/**
 * Parsing robusto de escopos:
 * - Remove aspas
 * - Aceita vírgulas OU espaços
 * - Remove entradas vazias
 * - Normaliza quebras de linha
 */
function parseScopes(raw) {
  return String(raw || '')
    .replace(/["']/g, '')          // tira aspas
    .replace(/\s+/g, ' ')          // normaliza espaços/quebras de linha
    .split(/[,\s]+/)               // separa por vírgula ou espaço
    .filter(Boolean);
}

// ✅ Torna o serviço tolerante caso a var venha com vírgula/aspas/etc.
const SCOPES = parseScopes(GOOGLE_SCOPES);

// Sugestão de fallback seguro (opcional): se esqueceram de setar a variável
// descomente abaixo para forçar escopos mínimos padrão
// const SCOPES = parseScopes(GOOGLE_SCOPES) ?? [
//   'https://www.googleapis.com/auth/calendar',
//   'https://www.googleapis.com/auth/calendar.events',
//   'https://www.googleapis.com/auth/userinfo.email',
//   'https://www.googleapis.com/auth/userinfo.profile',
// ];

function buildOAuthClient() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error('Faltam variáveis do Google OAuth no .env (CLIENT_ID/SECRET/REDIRECT_URI).');
  }
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

/**
 * Gera a URL de consentimento do Google com state assinado (contendo staffId)
 */
export function createAuthUrl({ staffId }) {
  if (!staffId) throw new Error('staffId obrigatório');

  const oauth2Client = buildOAuthClient();
  const state = jwt.sign({ staffId }, JWT_SECRET, { expiresIn: '30m' });

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',           // garante refresh_token
    prompt: 'consent',                // força tela de consentimento
    include_granted_scopes: true,     // acumula escopos já concedidos
    scope: SCOPES,
    state,
  });

  return url;
}

/**
 * Trata o callback do OAuth, salva/atualiza tokens e email no banco
 */
export async function handleOAuthCallback({ code, state }) {
  if (!code || !state) throw new Error('code/state ausente');

  const { staffId } = jwt.verify(state, JWT_SECRET);
  const oauth2Client = buildOAuthClient();

  // Troca o code por tokens
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // pega email do usuário (requer userinfo.email no SCOPES)
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const me = await oauth2.userinfo.get();
  const googleEmail = me.data.email;

  // sanity check: acesso ao calendário "primary"
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  await calendar.calendarList.get({ calendarId: 'primary' });

  // expiry_date pode não vir; garante algo ~55min à frente
  const safeExpiry =
    typeof tokens.expiry_date === 'number'
      ? tokens.expiry_date
      : Date.now() + 55 * 60 * 1000;

  const payload = {
    staffId,
    googleEmail,
    calendarId: 'primary',
    accessToken: tokens.access_token || '',
    refreshToken: tokens.refresh_token || '', // pode vir vazio se o Google não enviar
    expiryDate: BigInt(safeExpiry),
  };

  await prisma.googleIntegration.upsert({
    where: { staffId },
    update: payload,
    create: payload,
  });

  return { staffId, googleEmail };
}

/**
 * Monta oauth2Client com refresh automático com base no staffId
 */
async function getAuthForStaff(staffId) {
  const integ = await prisma.googleIntegration.findUnique({ where: { staffId } });
  if (!integ) return null;

  const oauth2Client = buildOAuthClient();
  oauth2Client.setCredentials({
    access_token: integ.accessToken || undefined,
    refresh_token: integ.refreshToken || undefined,
    expiry_date: Number(integ.expiryDate || 0),
  });

  // Atualiza tokens no banco quando o Google refrescar
  oauth2Client.on('tokens', async (tokens) => {
    try {
      const update = {};
      if (tokens.access_token) update.accessToken = tokens.access_token;
      if (tokens.refresh_token) update.refreshToken = tokens.refresh_token;
      if (tokens.expiry_date) update.expiryDate = BigInt(tokens.expiry_date);
      if (Object.keys(update).length) {
        await prisma.googleIntegration.update({ where: { staffId }, data: update });
      }
    } catch {
      // evita quebrar fluxo do app se falhar persistência
    }
  });

  return { oauth2Client, integration: integ };
}

/**
 * Desconecta a conta Google do profissional e revoga tokens
 */
export async function disconnectStaffGoogle(staffId) {
  const integ = await prisma.googleIntegration.findUnique({ where: { staffId } });
  if (!integ) return;

  try {
    const oauth2Client = buildOAuthClient();
    oauth2Client.setCredentials({
      access_token: integ.accessToken || undefined,
      refresh_token: integ.refreshToken || undefined,
    });
    // revoga tokens se existirem
    if (integ.accessToken) await oauth2Client.revokeToken(integ.accessToken);
    if (integ.refreshToken) await oauth2Client.revokeToken(integ.refreshToken);
  } catch {
    // segue mesmo se falhar revogação
  } finally {
    await prisma.googleIntegration.delete({ where: { staffId } }).catch(() => {});
  }
}

/**
 * FreeBusy: checa disponibilidade no Google Calendar
 */
export async function isTimeFreeOnGoogle({ staffId, startISO, endISO }) {
  const auth = await getAuthForStaff(staffId);
  if (!auth) return true; // sem Google conectado, não bloqueia

  try {
    const { oauth2Client, integration } = auth;
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const res = await calendar.freebusy.query({
      requestBody: {
        timeMin: startISO,
        timeMax: endISO,
        items: [{ id: integration.calendarId || 'primary' }],
      },
    });

    const busy = res.data.calendars?.[integration.calendarId || 'primary']?.busy || [];
    return busy.length === 0;
  } catch {
    // Se a consulta falhar, não bloqueia o agendamento interno
    return true;
  }
}

/**
 * Cria evento no Google para um agendamento
 */
export async function createGoogleEventForAppointment({ staffId, appointment, clientEmail }) {
  const auth = await getAuthForStaff(staffId);
  if (!auth) return null;

  const { oauth2Client, integration } = auth;
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const summary = appointment.title || 'Agendamento';
  const description = appointment.notes || '';
  const attendees = clientEmail ? [{ email: clientEmail }] : [];

  const event = await calendar.events.insert({
    calendarId: integration.calendarId || 'primary',
    sendUpdates: attendees.length ? 'all' : 'none',
    requestBody: {
      summary,
      description,
      start: { dateTime: new Date(appointment.start).toISOString() },
      end: { dateTime: new Date(appointment.end).toISOString() },
      attendees,
      reminders: { useDefault: true },
    },
  });

  return event.data; // contém id
}

/**
 * Atualiza evento no Google
 */
export async function updateGoogleEventForAppointment({ staffId, googleEventId, appointment, clientEmail }) {
  const auth = await getAuthForStaff(staffId);
  if (!auth || !googleEventId) return null;

  const { oauth2Client, integration } = auth;
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const attendees = clientEmail ? [{ email: clientEmail }] : [];

  const event = await calendar.events.update({
    calendarId: integration.calendarId || 'primary',
    eventId: googleEventId,
    sendUpdates: attendees.length ? 'all' : 'none',
    requestBody: {
      summary: appointment.title || 'Agendamento',
      description: appointment.notes || '',
      start: { dateTime: new Date(appointment.start).toISOString() },
      end: { dateTime: new Date(appointment.end).toISOString() },
      attendees,
      reminders: { useDefault: true },
    },
  });

  return event.data;
}

/**
 * Deleta evento no Google
 */
export async function deleteGoogleEventForAppointment({ staffId, googleEventId }) {
  const auth = await getAuthForStaff(staffId);
  if (!auth || !googleEventId) return;

  const { oauth2Client, integration } = auth;
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  await calendar.events.delete({
    calendarId: integration.calendarId || 'primary',
    eventId: googleEventId,
    sendUpdates: 'none',
  });
}
