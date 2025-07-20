import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

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

  console.log(`✅ Evento recebido: ${event.type}`);
  switch (event.type) {
    
    case 'checkout.session.completed': {
      const session = event.data.object;

      // --- LÓGICA ATUALIZADA PARA LIDAR COM CADASTRO ---
      if (session.metadata && session.metadata.isRegistration === "true") {
        const { companyName, userName, userEmail, hashedPassword } = session.metadata;
        const stripeCustomerId = session.customer;

        try {
          // Cria a Empresa e o primeiro Utilizador (OWNER)
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
              // Cria a assinatura inicial
              subscription: {
                create: {
                  stripeSubscriptionId: session.subscription,
                  status: 'ACTIVE',
                  planId: (await prisma.plan.findFirst()).id, // Assumindo um plano padrão
                }
              }
            },
          });
          console.log(`✅ Empresa e utilizador criados com sucesso para ${companyName}`);
        } catch (dbError) {
          console.error("--- ERRO AO CRIAR EMPRESA/UTILIZADOR NO BANCO DE DADOS VIA WEBHOOK ---", dbError);
        }
      }
      break;
    }

    case 'customer.subscription.updated': {
      // ... (código existente)
      break;
    }

    case 'customer.subscription.deleted': {
      // ... (código existente)
      break;
    }
  }

  res.status(200).json({ received: true });
};