import prisma from '../prismaClient.js';

/**
 * GET /api/appointments
 * Lista todos os agendamentos da empresa
 */
export const listAppointments = async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        companyId: req.company.id,
      },
      include: {
        client: true,
        service: true,
        user: true,
      },
      orderBy: {
        start: 'asc',
      },
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
 */
export const createAppointment = async (req, res) => {
  try {
    const companyId = req.company?.id;
    const { clientId, serviceId, professionalId, start, end, notes } = req.body || {};

    const missing = [];
    if (!companyId) missing.push('companyId (do token)');
    if (!clientId) missing.push('clientId');
    if (!serviceId) missing.push('serviceId');
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

    const dateOnly = new Date(dStart.toISOString().split('T')[0]);

    // Verifica conflito com bloqueios
    const conflict = await prisma.scheduleBlock.findFirst({
      where: {
        companyId,
        OR: [
          { professionalId: professionalId },
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

    const created = await prisma.appointment.create({
      data: {
        company: { connect: { id: companyId } },
        client: { connect: { id: clientId } },
        service: { connect: { id: serviceId } },
        professional: professionalId
          ? { connect: { id: professionalId } }
          : undefined,
        start: dStart,
        end: dEnd,
        notes: notes || '',
        status: 'SCHEDULED',
      },
    });

    return res.status(201).json(created);
  } catch (e) {
    console.error('Erro ao criar agendamento:', e);
    return res.status(500).json({ message: e.message });
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
    const { clientId, serviceId, userId, start, end, notes, status } = req.body;

    const appointment = await prisma.appointment.findFirst({
      where: { id, companyId },
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Agendamento não encontrado.' });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        clientId,
        serviceId,
        userId,
        start: new Date(start),
        end: new Date(end),
        notes,
        status,
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
 * Exclui um agendamento existente
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

    await prisma.appointment.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (err) {
    console.error('Erro ao excluir agendamento:', err);
    res.status(500).json({ message: 'Erro interno ao excluir agendamento.' });
  }
};
