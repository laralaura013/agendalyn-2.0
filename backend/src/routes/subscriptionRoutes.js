import express from 'express';
import { protect } from '../middlewares/authMiddleware.js'; // 1. Importa o protect
import { createCheckoutSession, createCustomerPortal } from '../controllers/subscriptionController.js';

const router = express.Router();

// 2. ADICIONA A LINHA DE PROTEÇÃO QUE FALTAVA
// Esta linha garante que apenas utilizadores logados possam aceder a estas rotas.
router.use(protect);

// Rota para criar a sessão de pagamento
router.post('/create-checkout-session', createCheckoutSession);

// Rota para criar o portal do cliente (para o futuro)
router.post('/create-customer-portal', createCustomerPortal);

export default router;