import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken } from '../utils/tokenUtils.js';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// --- NOVA FUNÇÃO PARA INICIAR O CADASTRO VIA CHECKOUT ---
export const createRegistrationCheckout = async (req, res) => {
    try {
        const { companyName, userName, userEmail, password, priceId } = req.body;

        if (!companyName || !userName || !userEmail || !password || !priceId) {
            return res.status(400).json({ message: "Todos os campos são obrigatórios." });
        }

        // Verifica se o email já existe
        const existingUser = await prisma.user.findUnique({ where: { email: userEmail } });
        if (existingUser) {
            return res.status(409).json({ message: "Este email já está em uso." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            customer_email: userEmail,
            // Guardamos os dados do cadastro nos metadados para usar depois no webhook
            metadata: {
                isRegistration: "true",
                companyName,
                userName,
                userEmail,
                hashedPassword,
            },
            success_url: `${process.env.FRONTEND_URL}/login?registration=success`,
            cancel_url: `${process.env.FRONTEND_URL}/register?registration=canceled`,
        });

        res.status(200).json({ url: session.url });

    } catch (error) {
        console.error("--- ERRO AO CRIAR SESSÃO DE CHECKOUT DE CADASTRO ---", error);
        res.status(500).json({ message: 'Erro ao iniciar processo de cadastro.' });
    }
};


// A função de LOGIN continua a mesma
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });

        if (user && (await bcrypt.compare(password, user.password))) {
            res.json({
                message: 'Login bem-sucedido!',
                accessToken: generateAccessToken(user),
                refreshToken: generateRefreshToken(user),
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
            });
        } else {
            res.status(401).json({ message: 'Email ou senha inválidos.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};