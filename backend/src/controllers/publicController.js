// src/controllers/publicController.js
import prisma from '../prismaClient.js';
import {
  addMinutes,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
} from 'date-fns';
import { sendAppointmentConfirmationEmail } from '../services/emailService.js';

/* ------------------------ Helpers de data (UTC-safe) ------------------------ */

// Converte "YYYY-MM-DD" para Date (meia-noite UTC)
function parseDateOnlyUTC(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

// Limites do dia em UTC
function dayBoundsUTC(dateStr) {
  const start = parseDateOnlyUTC(dateStr);
  const end = new Date(start);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

// HH:mm a partir de um Date em UTC
function hhmmUTC(d) {
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

/* ------------------------------ Booking públicos ------------------------------ */

// Dados públicos da empresa (booking page)
export const getBookingPageData = async (req, res) => {
  try {
    const { companyId } = req.params;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, phone: true, address: true }
    });
    if (!company) {
      return res.status(404).json({ message: "Estabelecimento não encontrado." });
    }

    const services = await prisma.service.findMany({
      where: { companyId },
      select: { id: true, name: true, price: true, duration: true }
    });

    const staff = await prisma.user.findMany({
      where: { companyId, showInBooking: true },
      select: { id: true, name: true }
    });

    res.status(200).json({ company, services, staff });
  } catch (error) {
    console.error("--- ERRO AO BUSCAR DADOS PÚBLICOS ---", error);
    res.status(500).json({ message: "Erro ao carregar dados da página de agendamento." });
  }
};

/**
 * GET /api/public/available-slots
 * Aceita:
 *  - date (YYYY-MM-DD) obrigatório
 *  - professionalId | userId | staffId (opcional) -> filtra por profissional
 *  - duration (min) | serviceId (opcional) -> define duração do slot
 * Responde: ["HH:mm", ...]
 */
export const getAvailableSlots = async (req, res) => {
  try {
    const { date, duration, serviceId } = req.query;
    const resolvedUserId = req.query.userId || req.query.professionalId || req.query.staffId || null;

    if (!date) {
      return res.status(400).json({ message: 'Parâmetro "date" é obrigatório (YYYY-MM-DD).' });
    }

    // Duração do slot (minutos)
    let slotMinutes = Number(duration) || 0;
    if (!slotMinutes && serviceId) {
      const svc = await prisma.service.findFirst({ where: { id: serviceId } });
      slotMinutes = Number(svc?.duration) || 30;
    }
    if (!slotMinutes) slotMinutes = 30;

    // Janela do dia (UTC, consistente com ScheduleBlock.date gravado como Date-only)
    const { start: dayStartUTC, end: dayEndUTC } = dayBoundsUTC(date);

    // Janela de trabalho padrão (09:00–18:00) + workSchedule do profissional (se existir)
    let open = '09:00';
    let close = '18:00';
    if (resolvedUserId) {
      const user = await prisma.user.findFirst({
        where: { id: resolvedUserId },
        select: { workSchedule: true },
      });
      const ws = user?.workSchedule || null;
      if (ws) {
        const map = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
        const dayKey = map[dayStartUTC.getUTCDay()]; // usa dia em UTC
        const cfg = ws[dayKey];
        const disabled = cfg && (cfg.active === false || cfg.enabled === false);
        if (disabled) return res.json([]);
        if (cfg) {
          if (cfg.start) open = cfg.start;
          if (cfg.end)   close = cfg.end;
        }
      }
    }

    // Constrói a janela de trabalho do dia em UTC
    const [oh, om] = open.split(':').map(Number);
    const [ch, cm] = close.split(':').map(Number);
    const windowStartUTC = new Date(dayStartUTC);
    windowStartUTC.setUTCHours(oh, om, 0, 0);
    const windowEndUTC = new Date(dayStartUTC);
    windowEndUTC.setUTCHours(ch, cm, 0, 0);
    if (!isBefore(windowStartUTC, windowEndUTC)) return res.json([]);

    // Bloqueios do dia (geral e/ou do profissional)
    const blocks = await prisma.scheduleBlock.findMany({
      where: {
        date: parseDateOnlyUTC(date), // match exato na meia-noite UTC
        OR: [
          resolvedUserId ? { professionalId: resolvedUserId } : undefined,
          { professionalId: null },
        ].filter(Boolean),
      },
      select: { startTime: true, endTime: true },
      orderBy: [{ startTime: 'asc' }],
    });

    // Agendamentos do dia (não cancelados)
    const appointments = await prisma.appointment.findMany({
      where: {
        start: { gte: dayStartUTC, lte: dayEndUTC },
        ...(resolvedUserId ? { userId: resolvedUserId } : {}),
        status: { not: 'CANCELED' },
      },
      select: { start: true, end: true },
    });

    // Geração de slots a cada "slotMinutes"
    const slots = [];
    for (
      let s = new Date(windowStartUTC);
      isBefore(s, windowEndUTC);
      s = new Date(s.getTime() + slotMinutes * 60000)
    ) {
      const e = new Date(s.getTime() + slotMinutes * 60000);
      if (isAfter(e, windowEndUTC)) break;

      // Conflito com bloqueios (compara HH:mm)
      const sHH = hhmmUTC(s);
      const eHH = hhmmUTC(e);
      const blocked = blocks.some((b) => b.startTime < eHH && b.endTime > sHH);
      if (blocked) continue;

      // Conflito com agendamentos (intervalo real)
      const overlap = appointments.some((a) => s < a.end && e > a.start);
      if (overlap) continue;

      // Retorna como "HH:mm" (UTC coerente com o dia)
      slots.push(hhmmUTC(s));
    }

    return res.json(slots);
  } catch (err) {
    console.error('getAvailableSlots error:', err);
    return res.status(500).json({ message: 'Erro ao calcular horários disponíveis.' });
  }
};

/**
 * POST /api/public/create-appointment
 * Body:
 *  - companyId, serviceId
 *  - staffId | professionalId | userId
 *  - slotTime (ISO)
 *  - clientName, clientPhone?, clientEmail?
 */
export const createPublicAppointment = async (req, res) => {
  try {
    const {
      companyId, serviceId,
      staffId, professionalId, userId,
      slotTime,
      clientName, clientPhone, clientEmail
    } = req.body;

    const chosenUserId = userId || professionalId || staffId;

    if (!companyId || !serviceId || !chosenUserId || !slotTime || !clientName) {
      return res.status(400).json({ message: "Todos os campos são obrigatórios." });
    }

    // Cliente (reaproveita por email se existir)
    let client = null;
    if (clientEmail) {
      client = await prisma.client.findFirst({
        where: { email: { equals: clientEmail, mode: 'insensitive' }, companyId }
      });
    }
    if (!client) {
      client = await prisma.client.create({
        data: {
          name: clientName,
          phone: clientPhone || '',
          email: clientEmail || null,
          companyId,
        }
      });
    }

    // Serviço e Profissional
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return res.status(404).json({ message: "Serviço não encontrado." });

    const staff = await prisma.user.findUnique({ where: { id: chosenUserId } });
    if (!staff) return res.status(404).json({ message: "Profissional não encontrado." });

    // Intervalo do agendamento
    const startDate = parseISO(slotTime);
    const endDate = addMinutes(startDate, Number(service.duration) || 30);

    // Checa bloqueio
    const dateOnlyUTC = startOfDay(startDate); // coerente com parseDateOnlyUTC(date) no dia
    const sHHmm = hhmmUTC(startDate);
    const eHHmm = hhmmUTC(endDate);

    const conflictBlock = await prisma.scheduleBlock.findFirst({
      where: {
        companyId,
        OR: [{ professionalId: chosenUserId }, { professionalId: null }],
        date: dateOnlyUTC,
        startTime: { lt: eHHmm },
        endTime: { gt: sHHmm },
      },
    });
    if (conflictBlock) {
      return res.status(400).json({ message: "Horário indisponível (bloqueio)." });
    }

    // Checa overlap com outros agendamentos (não cancelados)
    const overlap = await prisma.appointment.findFirst({
      where: {
        companyId,
        userId: chosenUserId,
        start: { lt: endDate },
        end: { gt: startDate },
        status: { not: 'CANCELED' },
      },
    });
    if (overlap) {
      return res.status(400).json({ message: "Horário já ocupado." });
    }

    // Cria agendamento
    const newAppointment = await prisma.appointment.create({
      data: {
        clientId: client.id,
        start: startDate,
        end: endDate,
        notes: 'Agendado pelo cliente online',
        companyId,
        serviceId,
        userId: chosenUserId,
        status: 'SCHEDULED',
      },
    });

    // Email de confirmação (best-effort)
    if (clientEmail) {
      try {
        await sendAppointmentConfirmationEmail({
          toEmail: clientEmail,
          clientName: client.name,
          serviceName: service.name,
          staffName: staff.name,
          appointmentDate: startDate,
        });
      } catch (e) {
        console.warn("Falha ao enviar e-mail de confirmação:", e?.message);
      }
    }

    res.status(201).json(newAppointment);
  } catch (error) {
    console.error("--- ERRO AO CRIAR AGENDAMENTO PÚBLICO ---", error);
    res.status(500).json({ message: "Não foi possível confirmar o seu agendamento." });
  }
};
