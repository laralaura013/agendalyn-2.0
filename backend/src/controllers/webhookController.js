import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // 1. Verifica se a requisição veio mesmo do Stripe, usando o segredo
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(`❌ Erro na verificação da assinatura do webhook: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 2. Processa o evento recebido
  console.log(`✅ Evento recebido: ${event.type}`);
  switch (event.type) {
    
    // Caso 1: Um cliente finalizou a compra de uma assinatura
    case 'checkout.session.completed': {
      const session = event.data.object;
      // Precisamos encontrar a empresa associada a este cliente do Stripe
      const company = await prisma.company.findUnique({ where: { stripeCustomerId: session.customer } });

      if (company) {
        // Cria ou atualiza o registo de assinatura no nosso banco de dados
        await prisma.subscription.upsert({
          where: { companyId: company.id },
          update: {
            stripeSubscriptionId: session.subscription,
            status: 'ACTIVE',
          },
          create: {
            companyId: company.id,
            stripeSubscriptionId: session.subscription,
            status: 'ACTIVE',
            // Esta parte assume que você tem um plano padrão.
            // Para múltiplos planos, a lógica precisaria ser mais complexa.
            planId: (await prisma.plan.findFirst()).id,
          },
        });
      }
      break;
    }

    // Caso 2: Uma assinatura foi atualizada (ex: pagamento falhou, foi renovada, etc.)
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      await prisma.subscription.update({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: subscription.status.toUpperCase(), // ex: 'active', 'past_due'
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      });
      break;
    }

    // Caso 3: Uma assinatura foi cancelada pelo cliente
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      await prisma.subscription.update({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: 'CANCELED',
        },
      });
      break;
    }
  }

  // 3. Responde ao Stripe para confirmar que recebemos a notificação
  res.status(200).json({ received: true });
};