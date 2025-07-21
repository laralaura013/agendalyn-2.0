import { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay, parseISO, addMinutes, getDay } from 'date-fns';
import { sendAppointmentConfirmationEmail } from '../services/emailService.js';

const prisma = new PrismaClient();

// Função para buscar os dados iniciais da página de agendamento
export const getBookingPageData = async (req, res) => {
    // --- MENSAGEM DE TESTE ---
    console.log(`--- ROTA DE AGENDAMENTO ACESSADA --- Pedido para companyId: ${req.params.companyId}`);

    try {
        const { companyId } = req.params;
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { name: true, phone: true, address: true }
        });

        if (!company) {
            console.log(`Empresa com ID ${companyId} não encontrada no banco de dados.`);
            return res.status(404).json({ message: "Estabelecimento não encontrado." });
        }

        const services = await prisma.service.findMany({
            where: { companyId: companyId },
            select: { id: true, name: true, price: true, duration: true }
        });
        const staff = await prisma.user.findMany({
            where: { companyId: companyId, showInBooking: true },
            select: { id: true, name: true }
        });

        console.log("--- DADOS ENVIADOS COM SUCESSO ---");
        res.status(200).json({ company, services, staff });
    } catch (error) {
        console.error("--- ERRO AO BUSCAR DADOS PÚBLICOS ---", error);
        res.status(500).json({ message: "Erro ao carregar dados da página de agendamento." });
    }
};

// Função para calcular os horários disponíveis
export const getAvailableSlots = async (req, res) => {
    try {
        const { date, serviceId, staffId, companyId } = req.query;

        if (!date || !serviceId || !staffId || !companyId) {
            return res.status(400).json({ message: "Data, serviço, profissional e empresa são obrigatórios." });
        }

        const selectedDate = parseISO(date);
        const dayOfWeek = getDay(selectedDate);
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

        const dayStart = startOfDay(selectedDate);
        const dayEnd = endOfDay(selectedDate);
        const existingAppointments = await prisma.appointment.findMany({
            where: {
                userId: staffId,
                start: { gte: dayStart, lt: dayEnd },
            },
        });

        const interval = 15;
        const availableSlots = [];
        let currentTime = new Date(selectedDate.setUTCHours(startHour, startMinute, 0, 0));
        const workEndTime = new Date(selectedDate.setUTCHours(endHour, endMinute, 0, 0));

        while (currentTime < workEndTime) {
            const slotStart = new Date(currentTime);
            const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000);

            if (slotEnd > workEndTime) break;

            const isBooked = existingAppointments.some(apt => 
                (slotStart < new Date(apt.end) && slotEnd > new Date(apt.start))
            );

            if (!isBooked) {
                availableSlots.push({ time: slotStart.toISOString() });
            }

            currentTime.setUTCMinutes(currentTime.getUTCMinutes() + interval);
        }
        res.status(200).json(availableSlots);

    } catch (error) {
        console.error("--- ERRO AO CALCULAR HORÁRIOS ---", error);
        res.status(500).json({ message: "Erro ao calcular horários disponíveis." });
    }
};

// Função para que o cliente final crie um agendamento
export const createPublicAppointment = async (req, res) => {
    try {
        const {
            companyId,
            serviceId,
            staffId,
            slotTime,
            clientName,
            clientPhone,
            clientEmail
        } = req.body;

        if (!companyId || !serviceId || !staffId || !slotTime || !clientName) {
            return res.status(400).json({ message: "Todos os campos são obrigatórios." });
        }

        const service = await prisma.service.findUnique({ where: { id: serviceId } });
        if (!service) return res.status(404).json({ message: "Serviço não encontrado." });

        const staff = await prisma.user.findUnique({ where: { id: staffId } });
        if (!staff) return res.status(404).json({ message: "Profissional não encontrado." });

        const startDate = parseISO(slotTime);
        const endDate = addMinutes(startDate, service.duration);

        const newAppointment = await prisma.appointment.create({
            data: {
                clientName,
                clientPhone,
                start: startDate,
                end: endDate,
                companyId,
                serviceId,
                userId: staffId,
                status: 'SCHEDULED',
            },
        });

        if (clientEmail) {
            sendAppointmentConfirmationEmail({
                toEmail: clientEmail,
                clientName: clientName,
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