import { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

const prisma = new PrismaClient();

// A função getBookingPageData continua a mesma
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
            where: { companyId: companyId },
            select: { id: true, name: true, price: true, duration: true }
        });
        const staff = await prisma.user.findMany({
            where: { companyId: companyId, showInBooking: true },
            select: { id: true, name: true }
        });
        res.status(200).json({ company, services, staff });
    } catch (error) {
        console.error("--- ERRO AO BUSCAR DADOS PÚBLICOS ---", error);
        res.status(500).json({ message: "Erro ao carregar dados da página de agendamento." });
    }
};

// --- NOVA FUNÇÃO PARA CALCULAR HORÁRIOS DISPONÍVEIS ---
export const getAvailableSlots = async (req, res) => {
    try {
        const { date, serviceId, staffId, companyId } = req.query;

        if (!date || !serviceId || !staffId || !companyId) {
            return res.status(400).json({ message: "Data, serviço, profissional e empresa são obrigatórios." });
        }

        const selectedDate = parseISO(date);
        const dayStart = startOfDay(selectedDate);
        const dayEnd = endOfDay(selectedDate);

        // 1. Busca a duração do serviço
        const service = await prisma.service.findUnique({ where: { id: serviceId } });
        if (!service) return res.status(404).json({ message: "Serviço não encontrado." });
        const serviceDuration = service.duration;

        // 2. Busca os agendamentos já existentes para o profissional no dia
        const existingAppointments = await prisma.appointment.findMany({
            where: {
                userId: staffId,
                start: {
                    gte: dayStart,
                    lt: dayEnd,
                },
            },
        });

        // 3. Define o horário de trabalho padrão (ex: 9h às 18h)
        // No futuro, isto pode vir do cadastro do colaborador
        const workDayStartHour = 9;
        const workDayEndHour = 18;
        const interval = 30; // Gera horários a cada 30 minutos

        const availableSlots = [];
        let currentTime = new Date(selectedDate.setHours(workDayStartHour, 0, 0, 0));

        // 4. Gera todos os horários possíveis do dia
        while (currentTime.getHours() < workDayEndHour) {
            const slotStart = new Date(currentTime);
            const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000); // Adiciona a duração do serviço

            // 5. Verifica se o horário está livre
            const isBooked = existingAppointments.some(apt => 
                (slotStart < new Date(apt.end) && slotEnd > new Date(apt.start))
            );

            // Adiciona o horário à lista se ele estiver dentro do expediente e não estiver ocupado
            if (slotEnd.getHours() <= workDayEndHour && !isBooked) {
                availableSlots.push({ time: slotStart.toISOString() });
            }

            currentTime.setMinutes(currentTime.getMinutes() + interval);
        }

        res.status(200).json(availableSlots);

    } catch (error) {
        console.error("--- ERRO AO CALCULAR HORÁRIOS ---", error);
        res.status(500).json({ message: "Erro ao calcular horários disponíveis." });
    }
};