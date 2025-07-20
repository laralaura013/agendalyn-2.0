import { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay, parseISO, addMinutes } from 'date-fns';
import { sendAppointmentConfirmationEmail } from '../services/emailService.js';

const prisma = new PrismaClient();

// As funções getBookingPageData e getAvailableSlots continuam as mesmas
export const getBookingPageData = async (req, res) => { /* ...código existente... */ };
export const getAvailableSlots = async (req, res) => { /* ...código existente... */ };

// --- NOVA FUNÇÃO PARA CRIAR O AGENDAMENTO PÚBLICO ---
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

        // 1. Validações
        if (!companyId || !serviceId || !staffId || !slotTime || !clientName) {
            return res.status(400).json({ message: "Todos os campos são obrigatórios." });
        }

        const service = await prisma.service.findUnique({ where: { id: serviceId } });
        if (!service) return res.status(404).json({ message: "Serviço não encontrado." });

        const staff = await prisma.user.findUnique({ where: { id: staffId } });
        if (!staff) return res.status(404).json({ message: "Profissional não encontrado." });

        // 2. Cria o agendamento
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

        // 3. Envia o email de confirmação se um email for fornecido
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