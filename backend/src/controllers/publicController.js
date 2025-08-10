import prisma from '../prismaClient.js';
import {
  addMinutes,
  isBefore,
  isAfter,
  format,
  parseISO,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { sendAppointmentConfirmationEmail } from '../services/emailService.js';

// Dados públicos (empresa/serviços/staff)
export const getBookingPageData = async (req, res) => {
  try {
    const { companyId } = req.params;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, phone: true, address: true }
    });
    if (!company) return res.status(404).json({ message: "Estabelecimento não encontrado." });

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
 *  - professionalId | userId | staffId (opcional)
 *  - duration (min) | serviceId (opcional – usa duração do serviço)
 * Retorna: ["HH:mm", ...]
 */
export const getAvailableSlots = async (req, res) => {
  try {
    const { date, duration, serviceId } = req.query;
    const resolvedUserId = req.query.userId || req.query.professionalId || req.query.staffId || null;

    if (!date) {
      return res.status(400).json({ message: 'Parâmetro "date" é obrigatório (YYYY-MM-DD).' });
    }

    // duração
    let slotMinutes = Number(duration) || 0;
    if (!slotMinutes && serviceId) {
      const svc = await prisma.service.findFirst({ where: { id: serviceId } });
      slotMinutes = svc?.duration || 30;
    }
    if (!slotMinutes) slotMinutes = 30;

    const dayStart = startOfDay(parseISO(`${date}T00:00:00`));
    const dayEnd = endOfDay(dayStart);

    // workSchedule
    let schedule = null;
    if (resolvedUserId) {
      const user = await prisma.user.findFirst({
        where: { id: resolvedUserId },
        select: { workSchedule: true },
      });
      schedule = user?.workSchedule || null;
    }

    const weekMap = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const dayKey = weekMap[dayStart.getDay()];
    let open = '09:00';
    let close = '18:00';

    if (schedule && schedule[dayKey]?.active === false) return res.json([]);
    if (schedule && schedule[dayKey]) {
      open = schedule[dayKey].start || open;
      close = schedule[dayKey].end || close;
    }

    const [oh, om] = String(open).split(':').map(Number);
    const [ch, cm] = String(close).split(':').map(Number);
    const windowStart = new Date(dayStart);
    windowStart.setHours(oh, om, 0, 0);
    const windowEnd = new Date(dayStart);
    windowEnd.setHours(ch, cm, 0, 0);
    if (!isBefore(windowStart, windowEnd)) return res.json([]);

    // bloqueios
    const blocks = await prisma.scheduleBlock.findMany({
      where: {
        date: dayStart,
        OR: [
          resolvedUserId ? { professionalId: resolvedUserId } : undefined,
          { professionalId: null },
        ].filter(Boolean),
      },
      select: { startTime: true, endTime: true },
    });

    // agendamentos (não cancelados)
    const appointments = await prisma.appointment.findMany({
      where: {
        start: { gte: dayStart, lt: dayEnd },
        ...(resolvedUserId ? { userId: resolvedUserId } : {}),
        status: { not: 'CANCELED' },
      },
      select: { start: true, end: true },
    });

    // slots
    const slots = [];
    for (let s = new Date(windowStart); isBefore(s, windowEnd); s = addMinutes(s, slotMinutes)) {
      const e = addMinutes(s, slotMinutes);
      if (isAfter(e, windowEnd)) break;

      const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      const sHHmm = hhmm(s);
      const eHHmm = hhmm(e);
      const blocked = blocks.some((b) => b.startTime < eHHmm && b.endTime > sHHmm);
      if (blocked) continue;

      const overlap = appointments.some((a) => s < a.end && e > a.start);
      if (overlap) continue;

      slots.push(format(s, 'HH:mm'));
    }

    return res.json(slots);
  } catch (error) {
    console.error("--- ERRO AO CALCULAR HORÁRIOS ---", error);
    res.status(500).json({ message: "Erro ao calcular horários disponíveis." });
  }
};

// criação de agendamento público
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

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return res.status(404).json({ message: "Serviço não encontrado." });

    const staff = await prisma.user.findUnique({ where: { id: chosenUserId } });
    if (!staff) return res.status(404).json({ message: "Profissional não encontrado." });

    const startDate = parseISO(slotTime);
    const endDate = addMinutes(startDate, Number(service.duration) || 30);

    // bloqueio
    const dateOnly = startOfDay(startDate);
    const timeStr = (d) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    const sHHmm = timeStr(startDate);
    const eHHmm = timeStr(endDate);
    const conflictBlock = await prisma.scheduleBlock.findFirst({
      where: {
        companyId,
        OR: [{ professionalId: chosenUserId }, { professionalId: null }],
        date: dateOnly,
        startTime: { lt: eHHmm },
        endTime: { gt: sHHmm },
      },
    });
    if (conflictBlock) return res.status(400).json({ message: "Horário indisponível (bloqueio)." });

    // overlap
    const overlap = await prisma.appointment.findFirst({
      where: {
        companyId,
        userId: chosenUserId,
        start: { lt: endDate },
        end: { gt: startDate },
        status: { not: 'CANCELED' },
      },
    });
    if (overlap) return res.status(400).json({ message: "Horário já ocupado." });

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
