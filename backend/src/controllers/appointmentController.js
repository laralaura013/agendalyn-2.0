import prisma from '../prismaClient.js';

/**
 * GET /api/appointments
 * Query:
 *  - professionalId? | userId?
 *  - date? (YYYY-MM-DD)
 *  - date_from?, date_to? (YYYY-MM-DD)
 *  - statuses? "SCHEDULED,CONFIRMED"
 *  - includeCanceled? (true/false)
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
 * Body: clientId, serviceId, userId|professionalId, start, end, notes?, status?
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

    // data-only
    const dateOnly = new Date(dStart.toISOString().split('T')[0]);

    // bloqueios (geral ou profissional)
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

    // sobreposição com outros agendamentos do mesmo profissional (não cancelados)
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

    await prisma.appointment.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error('Erro ao excluir agendamento:', err);
    res.status(500).json({ message: 'Erro interno ao excluir agendamento.' });
  }
};
