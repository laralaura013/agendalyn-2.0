import { PrismaClient } from '@prisma/client';
import { addMinutes } from 'date-fns';

const prisma = new PrismaClient();

export const createAppointment = async (req, res) => {
  const { clientName, clientPhone, start, serviceId, userId, notes } = req.body;
  const { companyId } = req.company;

  try {
    const service = await prisma.service.findFirst({
      where: { id: serviceId, companyId: companyId },
    });
    if (!service) {
      return res.status(404).json({ message: 'Serviço não encontrado.' });
    }
    
    const user = await prisma.user.findFirst({
        where: { id: userId, companyId: companyId },
    });
    if (!user) {
        return res.status(404).json({ message: 'Colaborador não encontrado.' });
    }

    const startTime = new Date(start);
    const endTime = addMinutes(startTime, service.duration);

    const newAppointment = await prisma.appointment.create({
      data: {
        clientName,
        clientPhone,
        start: startTime,
        end: endTime,
        notes,
        companyId,
        serviceId,
        userId,
      },
    });

    res.status(201).json(newAppointment);
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

export const listAppointments = async (req, res) => {
  const { companyId } = req.company;
  const { startDate, endDate } = req.query;

  try {
    const whereClause = {
      companyId,
      ...(startDate && endDate && {
        start: {
          gte: new Date(startDate),
          lt: new Date(endDate),
        },
      }),
    };

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        service: { select: { name: true, price: true } },
        user: { select: { name: true } },
      },
      orderBy: {
        start: 'asc',
      },
    });

    res.json(appointments);
  } catch (error) {
    console.error('Erro ao listar agendamentos:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

export const updateAppointment = async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.company;
    const data = req.body;

    try {
        const appointment = await prisma.appointment.findFirst({
            where: { id, companyId }
        });

        if(!appointment) {
            return res.status(404).json({ message: 'Agendamento não encontrado.' });
        }

        const updatedAppointment = await prisma.appointment.update({
            where: { id },
            data: data
        });
        res.json(updatedAppointment);
    } catch (error) {
        console.error('Erro ao atualizar agendamento:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

export const deleteAppointment = async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.company;

    try {
        const appointment = await prisma.appointment.findFirst({
            where: { id, companyId }
        });

        if(!appointment) {
            return res.status(404).json({ message: 'Agendamento não encontrado.' });
        }

        await prisma.appointment.delete({
            where: { id }
        });

        res.status(204).send();
    } catch (error) {
        console.error('Erro ao deletar agendamento:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};