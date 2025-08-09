import prisma from '../prismaClient.js';

/**
 * GET /api/appointments
 * Lista os agendamentos da empresa com filtros
 * Query:
 *  - professionalId? | userId?   (ambos aceitos; usa userId internamente)
 *  - date? (YYYY-MM-DD, único dia)
 *  - date_from?, date_to? (YYYY-MM-DD, intervalo)
 *  - statuses? ex: "SCHEDULED,CONFIRMED"
 *  - includeCanceled? (true/false) => por padrão NÃO retorna CANCELED
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

    // Profissional (aceita professionalId ou userId)
    const resolvedUserId = userId || professionalId;
    if (resolvedUserId) where.userId = resolvedUserId;

    // Datas (aceita date único OU intervalo)
    if (date) {
      const start = new Date(`${date}T00:00:00.000`);
      const end = new Date(`${date}T23:59:59.999`);
      where.start = { gte: start, lte: end };
    } else if (date_from || date_to) {
      where.start = {};
      if (date_from) where.start.gte = new Date(`${date_from}T00:00:00.000`);
      if (date_to) where.start.lte = new Date(`${date_to}T23:59:59.999`);
    }

    // Statuses
    const normalizedIncludeCanceled = String(includeCanceled || '').toLowerCase() === 'true';
    if (statuses) {
      const arr = String(statuses)
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);
      if (arr.length > 0) where.status = { in: arr };
    } else if (!normalizedIncludeCanceled) {
      // Por padrão, não retornar cancelados
      where.status = { not: 'CANCELED' };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        client: true,
        service: true,
        user: true,
      },
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
 * Cria um novo agendamento
 * Body:
 *  - clientId (req)
 *  - serviceId (req)
 *  - userId (req) | professionalId (fallback)
 *  - start (ISO) (req)
 *  - end (ISO)   (req)
 *  - notes?
 *  - status? (default SCHEDULED)
 */
export const createAppointment = async (req, res) => {
  try {
    const companyId = req.company?.id;
    const {
      clientId,
      serviceId,
      userId,
      professionalId, // compatibilidade com versões antigas do front
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
    if (isNaN(dStart.getTime())) missing.push('start inválido (formato ISO)');
    if (isNaN(dEnd.getTime())) missing.push('end inválido (formato ISO)');

    if (missing.length) {
      return res.status(400).json({
        message: 'Dados inválidos para agendamento.',
        missing,
      });
    }

    // Data-only para checar bloqueios (00:00)
    const dateOnly = new Date(dStart.toISOString().split('T')[0]);

    // Verifica conflito com bloqueios (geral ou do profissional)
    const conflict = await prisma.scheduleBlock.findFirst({
      where: {
        companyId,
        OR: [
          { professionalId: chosenUserId },
          { professionalId: null }, // bloqueio geral
        ],
        date: dateOnly,
        startTime: { lt: dEnd.toTimeString().slice(0, 5) },
        endTime: { gt: dStart.toTimeString().slice(0, 5) },
      },
    });

    if (conflict) {
      return res.status(400).json({
        message: 'Horário indisponível. Existe um bloqueio neste período.',
      });
    }

    // (Opcional) checar sobreposição com outros agendamentos do mesmo profissional
    const overlap = await prisma.appointment.findFirst({
      where: {
        companyId,
        userId: chosenUserId,
        // overlap: start < existing.end && end > existing.start
        start: { lt: dEnd },
        end: { gt: dStart },
        status: { not: 'CANCELED' },
      },
    });
    if (overlap) {
      return res.status(400).json({
        message: 'Horário já ocupado para este profissional.',
      });
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
      include: {
        client: true,
        service: true,
        user: true,
      },
    });

    return res.status(201).json(created);
  } catch (e) {
    console.error('Erro ao criar agendamento:', e);
    return res.status(500).json({ message: e.message || 'Erro interno ao criar agendamento.' });
  }
};

/**
 * PUT /api/appointments/:id
 * Atualiza um agendamento existente
 */
export const updateAppointment = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;
    const { clientId, serviceId, userId, professionalId, start, end, notes, status } = req.body;

    const appointment = await prisma.appointment.findFirst({
      where: { id, companyId },
    });
    if (!appointment) {
      return res.status(404).json({ message: 'Agendamento não encontrado.' });
    }

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
      include: {
        client: true,
        service: true,
        user: true,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error('Erro ao atualizar agendamento:', err);
    res.status(500).json({ message: 'Erro interno ao atualizar agendamento.' });
  }
};

/**
 * DELETE /api/appointments/:id
 * Exclui um agendamento existente (delete físico)
 */
export const deleteAppointment = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;

    const appointment = await prisma.appointment.findFirst({
      where: { id, companyId },
    });
    if (!appointment) {
      return res.status(404).json({ message: 'Agendamento não encontrado.' });
    }

    await prisma.appointment.delete({ where: { id } });

    // 204 = sem conteúdo
    res.status(204).send();
  } catch (err) {
    console.error('Erro ao excluir agendamento:', err);
    res.status(500).json({ message: 'Erro interno ao excluir agendamento.' });
  }
};
