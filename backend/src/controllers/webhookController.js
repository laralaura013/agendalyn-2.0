import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const session = event.data.object;

  switch (event.type) {
    case 'checkout.session.completed': {
      const { companyId } = session.metadata;
      
      await prisma.company.update({
        where: { id: companyId },
        data: { stripeCustomerId: session.customer },
      });
      // Lógica para criar/atualizar a assinatura no banco de dados
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
        // Lógica para atualizar o status da assinatura no banco de dados
        break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
};
