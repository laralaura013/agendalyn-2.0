import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(`❌ Erro na verificação da assinatura do webhook: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // --- LÓGICA PARA CRIAR A CONTA APÓS PAGAMENTO ---
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // Apenas executa se for uma sessão de registo
    if (session.metadata.isRegistration === "true") {
      const { companyName, userName, userEmail, password } = session.metadata;
      const stripeCustomerId = session.customer;

      try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const plan = await prisma.plan.findFirst();
        if (!plan) throw new Error("Nenhum plano encontrado para a assinatura.");

        const newCompany = await prisma.company.create({
          data: {
            name: companyName,
            stripeCustomerId: stripeCustomerId,
            users: {
              create: {
                name: userName,
                email: userEmail,
                password: hashedPassword,
                role: 'OWNER',
              },
            },
            subscription: {
              create: {
                planId: plan.id,
                stripeSubscriptionId: session.subscription,
                status: 'ACTIVE',
                currentPeriodEnd: new Date(session.expires_at * 1000),
              },
            },
          },
        });
        console.log(`✅ Empresa e utilizador criados com sucesso para ${companyName}`);
      } catch (error) {
        console.error("--- ERRO AO CRIAR CONTA VIA WEBHOOK ---", error);
        return res.status(500).json({ message: "Erro ao processar o registo." });
      }
    }
  }

  // Lógica para atualizar ou cancelar assinaturas existentes
  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: subscription.status.toUpperCase(),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });
  }

  res.status(200).json({ received: true });
};