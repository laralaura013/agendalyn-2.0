import express from 'express';
import { handleStripeWebhook } from '../controllers/webhookController.js';

const router = express.Router();

// O webhook precisa do corpo da requisição em formato raw, por isso usamos express.raw
// Esta rota não deve ser protegida por JWT, pois é chamada pelo Stripe
router.post('/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

export default router;
