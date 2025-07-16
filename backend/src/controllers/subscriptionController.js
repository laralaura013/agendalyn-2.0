import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createCheckoutSession = async (req, res) => {
  const { companyId } = req.company;
  const { priceId } = req.body;

  try {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return res.status(404).json({ message: 'Empresa não encontrada.' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer: company.stripeCustomerId,
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      success_url: `${process.env.FRONTEND_URL}/subscription?status=success`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription?status=canceled`,
      metadata: {
        companyId: companyId,
      }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Erro ao criar sessão de checkout:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

export const createCustomerPortal = async (req, res) => {
    const { companyId } = req.company;
    try {
        const company = await prisma.company.findUnique({ where: { id: companyId } });
        if (!company.stripeCustomerId) {
            return res.status(404).json({ message: 'Cliente Stripe não encontrado.' });
        }

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: company.stripeCustomerId,
            return_url: `${process.env.FRONTEND_URL}/subscription`,
        });

        res.json({ url: portalSession.url });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao criar portal do cliente.' });
    }
};
