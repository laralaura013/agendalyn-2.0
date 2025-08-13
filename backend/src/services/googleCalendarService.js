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

const SCOPES = (GOOGLE_SCOPES || '').split(' ').filter(Boolean);

function buildOAuthClient() {
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
    access_type: 'offline',
    prompt: 'consent', // garante refresh_token
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

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // pega email do usuário
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const me = await oauth2.userinfo.get();
  const googleEmail = me.data.email;

  // valida acesso ao calendar primário (opcional, mas bom sanity check)
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  await calendar.calendarList.get({ calendarId: 'primary' });

  const payload = {
    staffId,
    googleEmail,
    calendarId: 'primary',
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || '',
    expiryDate: BigInt(tokens.expiry_date || Date.now() + 55 * 60 * 1000),
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
    access_token: integ.accessToken,
    refresh_token: integ.refreshToken,
    expiry_date: Number(integ.expiryDate),
  });

  // Atualiza tokens no banco quando o Google refrescar
  oauth2Client.on('tokens', async (tokens) => {
    const update = {};
    if (tokens.access_token) update.accessToken = tokens.access_token;
    if (tokens.refresh_token) update.refreshToken = tokens.refresh_token;
    if (tokens.expiry_date) update.expiryDate = BigInt(tokens.expiry_date);
    if (Object.keys(update).length) {
      await prisma.googleIntegration.update({ where: { staffId }, data: update });
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
      access_token: integ.accessToken,
      refresh_token: integ.refreshToken,
    });
    if (integ.accessToken) await oauth2Client.revokeToken(integ.accessToken);
    if (integ.refreshToken) await oauth2Client.revokeToken(integ.refreshToken);
  } catch (e) {
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

  const { oauth2Client, integration } = auth;
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin: startISO,
      timeMax: endISO,
      items: [{ id: integration.calendarId }],
    },
  });

  const busy = res.data.calendars?.[integration.calendarId]?.busy || [];
  return busy.length === 0;
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
    calendarId: integration.calendarId,
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
    calendarId: integration.calendarId,
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
    calendarId: integration.calendarId,
    eventId: googleEventId,
    sendUpdates: 'none',
  });
}
