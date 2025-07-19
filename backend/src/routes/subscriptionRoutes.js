import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { createCheckoutSession, createCustomerPortal } from '../controllers/subscriptionController.js';

console.log("--- DEBUG: subscriptionRoutes.js foi carregado ---");

const router = express.Router();

// Aplica a proteção a todas as rotas deste arquivo
router.use(protect);

// Rota para criar a sessão de pagamento
router.post('/create-checkout-session', createCheckoutSession);

// Rota para criar o portal do cliente (para o futuro)
router.post('/create-customer-portal', createCustomerPortal);

export default router;