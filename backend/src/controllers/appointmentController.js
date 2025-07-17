import { PrismaClient } from '@prisma/client';
import { addMinutes, parseISO } from 'date-fns';

const prisma = new PrismaClient();

// LISTAR Agendamentos
export const listAppointments = async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { companyId: req.company.id },
      include: { // Inclui dados do serviço e colaborador para exibição
        service: true,
        user: true,
      },
    });
    res.status(200).json(appointments);
  } catch (error) {
    console.error("--- ERRO AO LISTAR AGENDAMENTOS ---", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

// CRIAR Agendamento
export const createAppointment = async (req, res) => {
  try {
    const { clientName, clientPhone, start, serviceId, userId, notes } = req.body;
    const companyId = req.company.id;

    if (!start || !serviceId || !userId) {
      return res.status(400).json({ message: "Data, serviço e colaborador são obrigatórios." });
    }

    // Busca a duração do serviço para calcular a hora de término
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) {
      return res.status(404).json({ message: "Serviço não encontrado." });
    }

    const startDate = parseISO(start);
    const endDate = addMinutes(startDate, service.duration);

    const newAppointment = await prisma.appointment.create({
      data: {
        clientName,
        clientPhone,
        start: startDate,
        end: endDate,
        notes,
        companyId,
        serviceId,
        userId,
        status: 'SCHEDULED',
      },
    });
    res.status(201).json(newAppointment);
  } catch (error) {
    console.error("--- ERRO AO CRIAR AGENDAMENTO ---", error);
    res.status(500).json({ message: "Erro ao criar agendamento." });
  }
};

// ATUALIZAR (EDITAR) Agendamento
export const updateAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { clientName, clientPhone, start, serviceId, userId, notes, status } = req.body;
        const companyId = req.company.id;

        const service = await prisma.service.findUnique({ where: { id: serviceId } });
        if (!service) {
            return res.status(404).json({ message: "Serviço não encontrado." });
        }

        const startDate = parseISO(start);
        const endDate = addMinutes(startDate, service.duration);

        const updatedAppointment = await prisma.appointment.update({
            where: { id: id, companyId: companyId },
            data: {
                clientName,
                clientPhone,
                start: startDate,
                end: endDate,
                notes,
                serviceId,
                userId,
                status,
            },
        });
        res.status(200).json(updatedAppointment);
    } catch (error) {
        console.error("--- ERRO AO ATUALIZAR AGENDAMENTO ---", error);
        res.status(500).json({ message: "Erro ao atualizar agendamento." });
    }
};

// DELETAR Agendamento
export const deleteAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.appointment.delete({
            where: { id: id, companyId: req.company.id },
        });
        res.status(204).send();
    } catch (error) {
        console.error("--- ERRO AO DELETAR AGENDAMENTO ---", error);
        res.status(500).json({ message: "Erro ao deletar agendamento." });
    }
};