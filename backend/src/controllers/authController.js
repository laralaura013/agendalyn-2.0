import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// --- FUNÇÃO DE LOGIN (NÃO MUDA) ---
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });

        if (user && (await bcrypt.compare(password, user.password))) {
            const token = jwt.sign(
                { userId: user.id, companyId: user.companyId, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '1d' }
            );
            
            res.json({
                message: 'Login bem-sucedido!',
                accessToken: token,
                user: { id: user.id, name: user.name, email: user.email, role: user.role },
            });
        } else {
            res.status(401).json({ message: 'Email ou senha inválidos.' });
        }
    } catch (error) {
        console.error("--- ERRO NO LOGIN ---", error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// --- NOVA FUNÇÃO PARA REGISTO COM PAGAMENTO ---
export const createRegistrationCheckout = async (req, res) => {
    try {
        const { companyName, userName, userEmail, password, priceId } = req.body;
        if (!companyName || !userName || !userEmail || !password || !priceId) {
            return res.status(400).json({ message: "Todos os campos são obrigatórios." });
        }

        const existingUser = await prisma.user.findUnique({ where: { email: userEmail } });
        if (existingUser) {
            return res.status(409).json({ message: "Este email já está em uso." });
        }

        // Cria a sessão de Checkout no Stripe
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            customer_email: userEmail,
            // Guarda os dados do registo nos metadados para usar depois
            metadata: {
                isRegistration: "true",
                companyName,
                userName,
                userEmail,
                password, 
            },
            success_url: `${process.env.FRONTEND_URL}/login?registration=success`,
            cancel_url: `${process.env.FRONTEND_URL}/register?registration=canceled`,
        });

        res.status(200).json({ url: session.url });

    } catch (error) {
        console.error("--- ERRO AO CRIAR SESSÃO DE CHECKOUT ---", error);
        res.status(500).json({ message: 'Erro ao iniciar processo de cadastro.' });
    }
};