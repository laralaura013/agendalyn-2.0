import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { sendMagicLinkEmail } from '../services/emailService.js';

const prisma = new PrismaClient();

// ... (requestLoginLink e verifyLoginLink continuam os mesmos) ...
export const requestLoginLink = async (req, res) => { /* ...código existente... */ };
export const verifyLoginLink = async (req, res) => { /* ...código existente... */ };


// --- NOVA FUNÇÃO ---
// Busca os agendamentos do cliente autenticado
export const getMyAppointments = async (req, res) => {
    try {
        const clientId = req.client.id; // Vem do nosso novo middleware de autenticação

        const appointments = await prisma.appointment.findMany({
            where: {
                clientId: clientId,
                start: {
                    gte: new Date(), // Busca apenas agendamentos futuros
                },
            },
            include: {
                service: { select: { name: true } },
                user: { select: { name: true } },
            },
            orderBy: {
                start: 'asc',
            },
        });

        res.status(200).json(appointments);
    } catch (error) {
        console.error("--- ERRO AO BUSCAR AGENDAMENTOS DO CLIENTE ---", error);
        res.status(500).json({ message: "Erro ao buscar agendamentos." });
    }
};