import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { sendMagicLinkEmail } from '../services/emailService.js';

const prisma = new PrismaClient();

// Gera e envia o link mágico para o email do cliente
export const requestLoginLink = async (req, res) => {
    try {
        const { email, companyId } = req.body;
        if (!email || !companyId) {
            return res.status(400).json({ message: "Email e ID da empresa são obrigatórios." });
        }

        const client = await prisma.client.findFirst({
            where: { 
                email: { equals: email, mode: 'insensitive' },
                companyId 
            },
        });

        if (!client) {
            return res.status(200).json({ message: "Se um cliente com este email existir, um link de acesso foi enviado." });
        }

        const token = jwt.sign({ clientId: client.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        await prisma.client.update({
            where: { id: client.id },
            data: { loginToken: token, loginTokenExpiresAt: expiresAt },
        });

        await sendMagicLinkEmail({
            toEmail: client.email,
            clientName: client.name,
            magicLink: `${process.env.FRONTEND_URL}/portal/verify/${token}`
        });

        res.status(200).json({ message: "Se um cliente com este email existir, um link de acesso foi enviado." });

    } catch (error) {
        console.error("--- ERRO AO SOLICITAR LINK MÁGICO ---", error);
        res.status(500).json({ message: "Erro ao processar a sua solicitação." });
    }
};

// Verifica o link mágico e gera uma sessão
export const verifyLoginLink = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ message: "Token não fornecido." });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const clientId = decoded.clientId;

        const client = await prisma.client.findUnique({ where: { id: clientId } });

        if (!client || client.loginToken !== token || new Date() > new Date(client.loginTokenExpiresAt)) {
            return res.status(401).json({ message: "Link de acesso inválido ou expirado." });
        }

        await prisma.client.update({
            where: { id: client.id },
            data: { loginToken: null, loginTokenExpiresAt: null },
        });

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

    } catch (error) {
        console.error("--- ERRO AO VERIFICAR LINK MÁGICO ---", error);
        res.status(401).json({ message: "Link de acesso inválido ou expirado." });
    }
};