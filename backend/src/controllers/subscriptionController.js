import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// CRIAR SESSÃO DE CHECKOUT
export const createCheckoutSession = async (req, res) => {
    const { priceId } = req.body;
    const userId = req.user.id;
    const companyId = req.company.id;

    try {
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            include: { users: { where: { id: userId } } }
        });

        if (!company) {
            return res.status(404).json({ message: "Empresa não encontrada." });
        }

        const user = company.users[0];
        let stripeCustomerId = company.stripeCustomerId;

        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: company.name,
                metadata: { companyId: company.id }
            });
            stripeCustomerId = customer.id;
            await prisma.company.update({
                where: { id: companyId },
                data: { stripeCustomerId: stripeCustomerId },
            });
        }
        
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            customer: stripeCustomerId,
            line_items: [{
                price: priceId,
                quantity: 1,
            }],
            success_url: `${process.env.FRONTEND_URL}/subscription?status=success`,
            cancel_url: `${process.env.FRONTEND_URL}/subscription?status=canceled`,
        });

        res.status(200).json({ url: session.url });

    } catch (error) {
        console.error("--- ERRO AO CRIAR SESSÃO DE CHECKOUT ---", error);
        res.status(500).json({ message: 'Erro ao criar sessão de pagamento.' });
    }
};

// Futuramente, podemos adicionar a função para criar o portal do cliente
export const createCustomerPortal = async (req, res) => { 
    // ...código futuro... 
};