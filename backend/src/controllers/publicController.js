import { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay, parseISO, addMinutes, getDay } from 'date-fns';
import { sendAppointmentConfirmationEmail } from '../services/emailService.js';

const prisma = new PrismaClient();

// ... (getBookingPageData e createPublicAppointment continuam os mesmos) ...
export const getBookingPageData = async (req, res) => {
    // ...código existente...
};

export const getAvailableSlots = async (req, res) => {
    console.log("--- INICIANDO CÁLCULO DE HORÁRIOS ---");
    try {
        const { date, serviceId, staffId } = req.query;
        console.log(`[1] Parâmetros recebidos: Data=${date}, Serviço=${serviceId}, Colaborador=${staffId}`);

        if (!date || !serviceId || !staffId) {
            return res.status(400).json({ message: "Data, serviço e profissional são obrigatórios." });
        }

        const selectedDate = parseISO(date);
        console.log(`[2] Data parseada (UTC): ${selectedDate.toISOString()}`);
        
        // Usar getUTCDay() para garantir que o dia da semana é calculado em UTC, como o servidor
        const dayOfWeek = selectedDate.getUTCDay(); 
        const weekDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = weekDays[dayOfWeek];
        console.log(`[3] Dia da semana calculado (UTC): ${dayName} (Índice: ${dayOfWeek})`);

        const staffMember = await prisma.user.findUnique({ where: { id: staffId } });
        console.log(`[4] Colaborador encontrado: ${staffMember?.name}. Horário de trabalho no banco:`, staffMember?.workSchedule);

        if (!staffMember || !staffMember.workSchedule || !staffMember.workSchedule[dayName]?.active) {
            console.log(`[!] Colaborador não trabalha neste dia. A encerrar a busca.`);
            return res.status(200).json([]);
        }

        const workDay = staffMember.workSchedule[dayName];
        console.log(`[5] Horário para ${dayName}: Início=${workDay.start}, Fim=${workDay.end}`);
        
        const [startHour, startMinute] = workDay.start.split(':').map(Number);
        const [endHour, endMinute] = workDay.end.split(':').map(Number);
        
        const service = await prisma.service.findUnique({ where: { id: serviceId } });
        if (!service) return res.status(404).json({ message: "Serviço não encontrado." });
        const serviceDuration = service.duration;
        console.log(`[6] Duração do serviço: ${serviceDuration} minutos`);

        const dayStart = startOfDay(selectedDate);
        const dayEnd = endOfDay(selectedDate);
        const existingAppointments = await prisma.appointment.findMany({
            where: { userId: staffId, start: { gte: dayStart, lt: dayEnd } },
        });
        console.log(`[7] Agendamentos existentes no dia: ${existingAppointments.length}`);

        const interval = 15;
        const availableSlots = [];
        let currentTime = new Date(selectedDate);
        currentTime.setUTCHours(startHour, startMinute, 0, 0);

        const workEndTime = new Date(selectedDate);
        workEndTime.setUTCHours(endHour, endMinute, 0, 0);
        
        console.log(`[8] Início do loop: ${currentTime.toISOString()}. Fim do expediente: ${workEndTime.toISOString()}`);

        while (currentTime < workEndTime) {
            const slotStart = new Date(currentTime);
            const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000);

            if (slotEnd > workEndTime) {
                console.log(`   - Slot ${slotStart.toISOString()} descartado (termina após o expediente).`);
                break;
            }

            const isBooked = existingAppointments.some(apt => 
                (slotStart < new Date(apt.end) && slotEnd > new Date(apt.start))
            );

            if (!isBooked) {
                availableSlots.push({ time: slotStart.toISOString() });
            } else {
                console.log(`   - Slot ${slotStart.toISOString()} descartado (já reservado).`);
            }

            currentTime.setUTCMinutes(currentTime.getUTCMinutes() + interval);
        }
        
        console.log(`[9] Cálculo finalizado. ${availableSlots.length} horários encontrados.`);
        res.status(200).json(availableSlots);

    } catch (error) {
        console.error("--- ERRO FATAL AO CALCULAR HORÁRIOS ---", error);
        res.status(500).json({ message: "Erro ao calcular horários disponíveis." });
    }
};

export const createPublicAppointment = async (req, res) => {
    // ...código existente...
};