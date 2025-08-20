// src/routes/paymentMethodRoutes.js
import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  listPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
} from '../controllers/paymentMethodController.js';

const router = express.Router();

// Todas as rotas exigem autenticação
router.use(protect);

// Listar (opcional: ?active=true para apenas ativos)
router.get('/', listPaymentMethods);

// Criar
router.post('/', createPaymentMethod);

// Atualizar nome/ativo
router.put('/:id', updatePaymentMethod);

export default router;
