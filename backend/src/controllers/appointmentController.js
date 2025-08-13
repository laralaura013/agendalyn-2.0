import prisma from '../prismaClient.js';
import {
  isTimeFreeOnGoogle,
  createGoogleEventForAppointment,
  updateGoogleEventForAppointment,
  deleteGoogleEventForAppointment,
} from '../services/googleCalendarService.js';

/**
 * GET /api/appointments
 */
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

    if (date) {
      const start = new Date(`${date}T00:00:00.000`);
      const end = new Date(`${date}T23:59:59.999`);
      where.start = { gte: start, lte: end };
    } else if (date_from || date_to) {
      where.start = {};
      if (date_from) where.start.gte = new Date(`${date_from}T00:00:00.000`);
      if (date_to) where.start.lte = new Date(`${date_to}T23:59:59.999`);
    }

    const showCanceled = String(includeCanceled || '').toLowerCase() === 'true';
    if (statuses) {
      const arr = String(statuses)
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);
      if (arr.length) where.status = { in: arr };
    } else if (!showCanceled) {
      where.status = { not: 'CANCELED' };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: { client: true, service: true, user: true },
      orderBy: { start: 'asc' },
    });

    res.json(appointments);
  } catch (err) {
    console.error('Erro ao listar agendamentos:', err);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

/**
 * POST /api/appointments
 */
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
    if (isNaN(dEnd.getTime())) missing.push('end inválido (ISO)');

    if (missing.length) {
      return res.status(400).json({ message: 'Dados inválidos para agendamento.', missing });
    }

    // Verifica bloqueios internos
    const dateOnly = new Date(dStart.toISOString().split('T')[0]);
    const conflict = await prisma.scheduleBlock.findFirst({
      where: {
        companyId,
        OR: [{ professionalId: chosenUserId }, { professionalId: null }],
        date: dateOnly,
        startTime: { lt: dEnd.toTimeString().slice(0, 5) },
        endTime: { gt: dStart.toTimeString().slice(0, 5) },
      },
    });
    if (conflict) {
      return res.status(400).json({ message: 'Horário indisponível. Existe um bloqueio neste período.' });
    }

    // Verifica sobreposição com outros agendamentos internos
    const overlap = await prisma.appointment.findFirst({
      where: {
        companyId,
        userId: chosenUserId,
        start: { lt: dEnd },
        end: { gt: dStart },
        status: { not: 'CANCELED' },
      },
    });
    if (overlap) {
      return res.status(400).json({ message: 'Horário já ocupado para este profissional.' });
    }

    // 🔹 Verifica disponibilidade no Google Calendar (se conectado)
    const isFree = await isTimeFreeOnGoogle({
      staffId: chosenUserId,
      startISO: dStart.toISOString(),
      endISO: dEnd.toISOString(),
    });
    if (!isFree) {
      return res.status(409).json({ message: 'Profissional indisponível no Google Calendar para este horário.' });
    }

    // Cria agendamento no banco
    const created = await prisma.appointment.create({
      data: {
        company: { connect: { id: companyId } },
        client: { connect: { id: clientId } },
        service: { connect: { id: serviceId } },
        user: { connect: { id: chosenUserId } },
        start: dStart,
        end: dEnd,
        notes: notes || '',
        status: status || 'SCHEDULED',
      },
      include: { client: true, service: true, user: true },
    });

    // 🔹 Cria evento no Google Calendar
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

    res.status(201).json(created);
  } catch (e) {
    console.error('Erro ao criar agendamento:', e);
    res.status(500).json({ message: e.message || 'Erro interno ao criar agendamento.' });
  }
};

/**
 * PUT /api/appointments/:id
 */
export const updateAppointment = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;
    const { clientId, serviceId, userId, professionalId, start, end, notes, status } = req.body;

    const appointment = await prisma.appointment.findFirst({ where: { id, companyId } });
    if (!appointment) return res.status(404).json({ message: 'Agendamento não encontrado.' });

    const chosenUserId = userId || professionalId || appointment.userId;

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        clientId: clientId ?? appointment.clientId,
        serviceId: serviceId ?? appointment.serviceId,
        userId: chosenUserId,
        start: start ? new Date(start) : appointment.start,
        end: end ? new Date(end) : appointment.end,
        notes: typeof notes === 'string' ? notes : appointment.notes,
        status: status || appointment.status,
      },
      include: { client: true, service: true, user: true },
    });

    // 🔹 Atualiza evento no Google Calendar
    try {
      await updateGoogleEventForAppointment({
        staffId: chosenUserId,
        googleEventId: appointment.googleEventId,
        appointment: updated,
        clientEmail: updated.client?.email || null,
      });
    } catch (e) {
      console.warn('Falha ao atualizar evento no Google:', e.message);
    }

    res.json(updated);
  } catch (err) {
    console.error('Erro ao atualizar agendamento:', err);
    res.status(500).json({ message: 'Erro interno ao atualizar agendamento.' });
  }
};

/**
 * DELETE /api/appointments/:id
 */
export const deleteAppointment = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;

    const appointment = await prisma.appointment.findFirst({ where: { id, companyId } });
    if (!appointment) return res.status(404).json({ message: 'Agendamento não encontrado.' });

    // 🔹 Remove evento do Google Calendar
    try {
      if (appointment.googleEventId) {
        await deleteGoogleEventForAppointment({
          staffId: appointment.userId,
          googleEventId: appointment.googleEventId,
        });
      }
    } catch (e) {
      console.warn('Falha ao excluir evento no Google:', e.message);
    }

    await prisma.appointment.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error('Erro ao excluir agendamento:', err);
    res.status(500).json({ message: 'Erro interno ao excluir agendamento.' });
  }
};
