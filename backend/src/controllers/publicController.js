import { PrismaClient } from '@prisma/client';
import {
  startOfDay, endOfDay, parseISO, addMinutes, format
} from 'date-fns';
import { sendAppointmentConfirmationEmail } from '../services/emailService.js';

const prisma = new PrismaClient();

// Dados públicos da empresa para a tela de agendamento
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

// Horários disponíveis reais (com buffer e horário formatado)
export const getAvailableSlots = async (req, res) => {
  try {
    const { date, serviceId, staffId } = req.query;

    if (!date || !serviceId || !staffId) {
      return res.status(400).json({ message: "Data, serviço e profissional são obrigatórios." });
    }

    const selectedDate = parseISO(date);
    const dayOfWeek = selectedDate.getUTCDay();
    const weekDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = weekDays[dayOfWeek];

    const staffMember = await prisma.user.findUnique({ where: { id: staffId } });
    if (!staffMember || !staffMember.workSchedule || !staffMember.workSchedule[dayName]?.active) {
      return res.status(200).json([]);
    }

    const workDay = staffMember.workSchedule[dayName];
    const [startHour, startMinute] = workDay.start.split(':').map(Number);
    const [endHour, endMinute] = workDay.end.split(':').map(Number);

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return res.status(404).json({ message: "Serviço não encontrado." });

    const serviceDuration = service.duration;
    const bufferBetweenAppointments = 5; // minutos extras entre agendamentos

    const dayStart = startOfDay(selectedDate);
    const dayEnd = endOfDay(selectedDate);

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        userId: staffId,
        start: { gte: dayStart, lt: dayEnd },
        status: { in: ['SCHEDULED', 'CONFIRMED'] }
      },
      select: { start: true, end: true }
    });

    const interval = 15; // intervalo de geração de slots
    const availableSlots = [];
    let currentTime = new Date(selectedDate);
    currentTime.setUTCHours(startHour, startMinute, 0, 0);

    const workEndTime = new Date(selectedDate);
    workEndTime.setUTCHours(endHour, endMinute, 0, 0);

    while (currentTime < workEndTime) {
      const slotStart = new Date(currentTime);
      const slotEnd = addMinutes(slotStart, serviceDuration + bufferBetweenAppointments);

      if (slotEnd > workEndTime) break;

      const isBooked = existingAppointments.some(apt =>
        slotStart < new Date(apt.end) && slotEnd > new Date(apt.start)
      );

      if (!isBooked) {
        availableSlots.push({
          time: slotStart.toISOString(),            // para lógica
          formatted: format(slotStart, 'HH:mm')     // para exibição
        });
      }

      currentTime.setUTCMinutes(currentTime.getUTCMinutes() + interval);
    }

    res.status(200).json(availableSlots);
  } catch (error) {
    console.error("--- ERRO AO CALCULAR HORÁRIOS ---", error);
    res.status(500).json({ message: "Erro ao calcular horários disponíveis." });
  }
};

// Criação de agendamento público
export const createPublicAppointment = async (req, res) => {
  try {
    const {
      companyId, serviceId, staffId, slotTime,
      clientName, clientPhone, clientEmail
    } = req.body;

    if (!companyId || !serviceId || !staffId || !slotTime || !clientName) {
      return res.status(400).json({ message: "Todos os campos são obrigatórios." });
    }

    let client;
    if (clientEmail) {
      client = await prisma.client.findFirst({
        where: {
          email: { equals: clientEmail, mode: 'insensitive' },
          companyId
        }
      });
    }

    if (!client) {
      client = await prisma.client.create({
        data: {
          name: clientName,
          phone: clientPhone || '',
          email: clientEmail,
          companyId,
        }
      });
    }

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return res.status(404).json({ message: "Serviço não encontrado." });

    const staff = await prisma.user.findUnique({ where: { id: staffId } });
    if (!staff) return res.status(404).json({ message: "Profissional não encontrado." });

    const startDate = parseISO(slotTime);
    const endDate = addMinutes(startDate, service.duration);

    const newAppointment = await prisma.appointment.create({
      data: {
        clientId: client.id,
        start: startDate,
        end: endDate,
        notes: 'Agendado pelo cliente online',
        companyId,
        serviceId,
        userId: staffId,
        status: 'SCHEDULED',
      },
    });

    if (clientEmail) {
      sendAppointmentConfirmationEmail({
        toEmail: clientEmail,
        clientName: client.name,
        serviceName: service.name,
        staffName: staff.name,
        appointmentDate: startDate,
      });
    }

    res.status(201).json(newAppointment);
  } catch (error) {
    console.error("--- ERRO AO CRIAR AGENDAMENTO PÚBLICO ---", error);
    res.status(500).json({ message: "Não foi possível confirmar o seu agendamento." });
  }
};
