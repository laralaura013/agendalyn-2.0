import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// REGISTAR um novo cliente no portal
export const registerClient = async (req, res) => {
    // --- LOG DE DEPURAÇÃO ---
    console.log("--- INICIANDO REGISTO DE CLIENTE ---");
    console.log("Dados recebidos no corpo do pedido (req.body):", req.body);
    // --- FIM DO LOG ---

    try {
        const { name, email, password, companyId } = req.body;
        if (!name || !email || !password || !companyId) {
            console.log("Erro: Campos em falta.");
            return res.status(400).json({ message: "Todos os campos são obrigatórios." });
        }

        const clientExists = await prisma.client.findFirst({ 
            where: { 
                email: { equals: email, mode: 'insensitive' }, 
                companyId 
            } 
        });
        if (clientExists) {
            console.log("Erro: Email já registado para esta empresa.");
            return res.status(409).json({ message: "Este email já está registado." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newClient = await prisma.client.create({
            data: {
                name,
                email,
                password: hashedPassword,
                companyId,
                phone: '', // Telefone pode ser adicionado depois
            }
        });

        console.log("--- CLIENTE REGISTADO COM SUCESSO ---");
        res.status(201).json({ id: newClient.id, name: newClient.name, email: newClient.email });
    } catch (error) {
        console.error("--- ERRO AO REGISTAR CLIENTE ---", error);
        res.status(500).json({ message: "Erro ao registar novo cliente." });
    }
};

// LOGIN de um cliente existente
export const loginClient = async (req, res) => {
    try {
        const { email, password, companyId } = req.body;
        if (!email || !password || !companyId) {
            return res.status(400).json({ message: "Email, senha e ID da empresa são obrigatórios." });
        }

        const client = await prisma.client.findFirst({ 
            where: { 
                email: { equals: email, mode: 'insensitive' }, 
                companyId 
            } 
        });

        if (client && client.password && (await bcrypt.compare(password, client.password))) {
            const sessionToken = jwt.sign(
                { clientId: client.id, companyId: client.companyId },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.status(200).json({
                message: "Login bem-sucedido!",
                sessionToken,
                client: { id: client.id, name: client.name, email: client.email }
            });
        } else {
            res.status(401).json({ message: "Credenciais inválidas." });
        }
    } catch (error) {
        console.error("--- ERRO NO LOGIN DO CLIENTE ---", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
};

// Busca os agendamentos do cliente autenticado
export const getMyAppointments = async (req, res) => {
    try {
        const clientId = req.client.id; // Vem do middleware de autenticação

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