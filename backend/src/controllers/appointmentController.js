// src/controllers/appointmentController.js
import prisma from '../prismaClient.js';
import {
  isTimeFreeOnGoogle,
  createGoogleEventForAppointment,
  updateGoogleEventForAppointment,
  deleteGoogleEventForAppointment,
} from '../services/googleCalendarService.js';

/** SELECTs seguros (não incluem colunas que não existem no DB prod) */
const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  showInBooking: true,
  companyId: true,
};

const safeServiceSelect = {
  id: true,
  name: true,
  duration: true,
  price: true,
};

const safeClientSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,      // em Client, esta coluna existe
  avatarUrl: true,
};

/** Constrói limites do dia (Local → ISO) */
const dayBounds = (dateStr) => {
  if (!dateStr) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    return {
      start: new Date(y, m, d, 0, 0, 0, 0),
      end:   new Date(y, m, d, 23, 59, 59, 999),
    };
  }
  const base = new Date(`${dateStr}T00:00:00.000`);
  const y = base.getFullYear();
  const m = base.getMonth();
  const d = base.getDate();
  return {
    start: new Date(y, m, d, 0, 0, 0, 0),
    end:   new Date(y, m, d, 23, 59, 59, 999),
  };
};

/* ============================== LIST ==============================
   GET /api/appointments?date=YYYY-MM-DD&professionalId=...&statuses=...
   Também aceita date_from/date_to e includeCanceled=true
=================================================================== */
export const listAppointments = async (req, res) => {
  try {
    const companyId = req.company.id;
    const {
      professionalId,
      userId,
      date,
      date_from,
      date_to,
      statuses,
      includeCanceled,
    } = req.query;

    const where = { companyId };
    const resolvedUserId = userId || professionalId;
    if (resolvedUserId) where.userId = resolvedUserId;

    // Faixa de datas
    if (date) {
      const { start, end } = dayBounds(date);
      where.start = { gte: start, lte: end };
    } else if (date_from || date_to) {
      where.start = {};
      if (date_from) where.start.gte = new Date(`${date_from}T00:00:00.000`);
      if (date_to)   where.start.lte = new Date(`${date_to}T23:59:59.999`);
    }

    // Status
    const showCanceled = String(includeCanceled || '').toLowerCase() === 'true';
    if (statuses) {
      const arr = String(statuses)
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      if (arr.length) where.status = { in: arr };
    } else if (!showCanceled) {
      where.status = { not: 'CANCELED' };
    }

    // 🔧 SELECT seguro (não usa user: true)
    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { start: 'asc' },
      select: {
        id: true,
        start: true,
        end: true,
        notes: true,
        status: true,
        serviceId: true,
        userId: true,
        clientId: true,
        service: { select: safeServiceSelect },
        user:    { select: safeUserSelect },
        client:  { select: safeClientSelect },
      },
    });

    return res.json(appointments);
  } catch (err) {
    console.error('Erro ao listar agendamentos:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

/* ============================== CREATE ==============================
   POST /api/appointments
===================================================================== */
export const createAppointment = async (req, res) => {
  try {
    const companyId = req.company?.id;
    const {
      clientId,
      serviceId,
      userId,
      professionalId,
      start,
      end,
      notes,
      status,
    } = req.body || {};

    const chosenUserId = userId || professionalId || null;

    const missing = [];
    if (!companyId) missing.push('companyId (do token)');
    if (!clientId) missing.push('clientId');
    if (!serviceId) missing.push('serviceId');
    if (!chosenUserId) missing.push('userId (ou professionalId)');
    if (!start) missing.push('start');
    if (!end) missing.push('end');

    const dStart = new Date(start);
    const dEnd = new Date(end);
    if (isNaN(dStart.getTime())) missing.push('start inválido (ISO)');
    if (isNaN(dEnd.getTime()))   missing.push('end inválido (ISO)');

    if (missing.length) {
      return res.status(400).json({ message: 'Dados inválidos para agendamento.', missing });
    }

    // Bloqueios internos (dia + faixas)
    const dateOnly = new Date(dStart.getFullYear(), dStart.getMonth(), dStart.getDate());
    const startHHMM = dStart.toTimeString().slice(0, 5);
    const endHHMM   = dEnd.toTimeString().slice(0, 5);

    const conflict = await prisma.scheduleBlock.findFirst({
      where: {
        companyId,
        OR: [{ professionalId: chosenUserId }, { professionalId: null }],
        date: dateOnly,
        startTime: { lt: endHHMM },
        endTime:   { gt: startHHMM },
      },
      select: { id: true }, // 🔧 select enxuto
    });
    if (conflict) {
      return res.status(400).json({ message: 'Horário indisponível. Existe um bloqueio neste período.' });
    }

    // Sobreposição com outros agendamentos
    const overlap = await prisma.appointment.findFirst({
      where: {
        companyId,
        userId: chosenUserId,
        start: { lt: dEnd },
        end:   { gt: dStart },
        status: { not: 'CANCELED' },
      },
      select: { id: true }, // 🔧 select enxuto
    });
    if (overlap) {
      return res.status(400).json({ message: 'Horário já ocupado para este profissional.' });
    }

    // Disponibilidade no Google Calendar (se integrado)
    const isFree = await isTimeFreeOnGoogle({
      staffId: chosenUserId,
      startISO: dStart.toISOString(),
      endISO: dEnd.toISOString(),
    });
    if (!isFree) {
      return res.status(409).json({ message: 'Profissional indisponível no Google Calendar para este horário.' });
    }

    // Cria agendamento
    const created = await prisma.appointment.create({
      data: {
        company: { connect: { id: companyId } },
        client:  { connect: { id: clientId } },
        service: { connect: { id: serviceId } },
        user:    { connect: { id: chosenUserId } },
        start: dStart,
        end:   dEnd,
        notes: notes || '',
        status: status || 'SCHEDULED',
      },
      select: {
        id: true,
        start: true,
        end: true,
        notes: true,
        status: true,
        googleEventId: true,
        service: { select: safeServiceSelect },
        user:    { select: safeUserSelect },
        client:  { select: safeClientSelect },
      },
    });

    // Evento no Google Calendar
    try {
      const googleEvent = await createGoogleEventForAppointment({
        staffId: chosenUserId,
        appointment: created,
        clientEmail: created.client?.email || null,
      });
      if (googleEvent?.id) {
        await prisma.appointment.update({
          where: { id: created.id },
          data: { googleEventId: googleEvent.id },
        });
      }
    } catch (e) {
      console.warn('Falha ao criar evento no Google:', e.message);
    }

    return res.status(201).json(created);
  } catch (e) {
    console.error('Erro ao criar agendamento:', e);
    return res.status(500).json({ message: e.message || 'Erro interno ao criar agendamento.' });
  }
};

/* ============================== UPDATE ==============================
   PUT /api/appointments/:id
===================================================================== */
export const updateAppointment = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;
    const { clientId, serviceId, userId, professionalId, start, end, notes, status } = req.body;

    // Busca atual com dados mínimos
    const current = await prisma.appointment.findFirst({
      where: { id, companyId },
      select: { id: true, userId: true, googleEventId: true, start: true, end: true },
    });
    if (!current) return res.status(404).json({ message: 'Agendamento não encontrado.' });

    const chosenUserId = userId || professionalId || current.userId;

    // Atualiza
    await prisma.appointment.update({
      where: { id },
      data: {
        clientId:  clientId  ?? undefined,
        serviceId: serviceId ?? undefined,
        userId:    chosenUserId,
        start:     start ? new Date(start) : undefined,
        end:       end   ? new Date(end)   : undefined,
        notes:     typeof notes === 'string' ? notes : undefined,
        status:    status || undefined,
      },
    });

    // Retorna o registro atualizado com SELECT seguro
    const updated = await prisma.appointment.findFirst({
      where: { id, companyId },
      select: {
        id: true,
        start: true,
        end: true,
        notes: true,
        status: true,
        googleEventId: true,
        service: { select: safeServiceSelect },
        user:    { select: safeUserSelect },
        client:  { select: safeClientSelect },
      },
    });

    // Atualiza evento no Google Calendar
    try {
      await updateGoogleEventForAppointment({
        staffId: chosenUserId,
        googleEventId: current.googleEventId,
        appointment: updated,
        clientEmail: updated?.client?.email || null,
      });
    } catch (e) {
      console.warn('Falha ao atualizar evento no Google:', e.message);
    }

    return res.json(updated);
  } catch (err) {
    console.error('Erro ao atualizar agendamento:', err);
    return res.status(500).json({ message: 'Erro interno ao atualizar agendamento.' });
  }
};

/* ============================== DELETE ==============================
   DELETE /api/appointments/:id
===================================================================== */
export const deleteAppointment = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;

    const appt = await prisma.appointment.findFirst({
      where: { id, companyId },
      select: { id: true, userId: true, googleEventId: true },
    });
    if (!appt) return res.status(404).json({ message: 'Agendamento não encontrado.' });

    // Remove evento do Google (se houver)
    try {
      if (appt.googleEventId) {
        await deleteGoogleEventForAppointment({
          staffId: appt.userId,
          googleEventId: appt.googleEventId,
        });
      }
    } catch (e) {
      console.warn('Falha ao excluir evento no Google:', e.message);
    }

    await prisma.appointment.delete({ where: { id } });
    return res.status(204).send();
  } catch (err) {
    console.error('Erro ao excluir agendamento:', err);
    return res.status(500).json({ message: 'Erro interno ao excluir agendamento.' });
  }
};
