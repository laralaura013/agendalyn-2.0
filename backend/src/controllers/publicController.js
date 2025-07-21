import { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay, parseISO, addMinutes, getDay } from 'date-fns';
import { sendAppointmentConfirmationEmail } from '../services/emailService.js';

const prisma = new PrismaClient();

// Função para buscar os dados iniciais da página de agendamento
export const getBookingPageData = async (req, res) => {
    // --- MENSAGEM DE TESTE ---
    console.log("--- ROTA DE AGENDAMENTO ACESSADA --- Pedido para companyId:", req.params.companyId);

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
        res.status(200).json({ company, services, staff });
    } catch (error) {
        console.error("--- ERRO AO BUSCAR DADOS PÚBLICOS ---", error);
        res.status(500).json({ message: "Erro ao carregar dados da página de agendamento." });
    }
};

// ... (resto do ficheiro com as outras funções, que não precisam de ser alteradas) ...

// Função para calcular os horários disponíveis
export const getAvailableSlots = async (req, res) => {
    //...código existente...
};

// Função para criar o agendamento
export const createPublicAppointment = async (req, res) => {
    //...código existente...
};