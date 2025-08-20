// src/routes/orderRoutes.js
import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  createOrder,
  listOrders,
  setOrderPayments, // << nova ação
  finishOrder,
  cancelOrder,
} from '../controllers/orderController.js';

const router = express.Router();

// Todas as rotas de comanda exigem autenticação
router.use(protect);

// Listar e criar comandas
router
  .route('/')
  .get(listOrders)
  .post(createOrder);

// Definir/Substituir TODAS as formas de pagamento de uma comanda (enquanto OPEN)
// body: { payments: [{ paymentMethodId, amount, installments?, cardBrand?, insertIntoCashier? }] }
router.put('/:id/payments', setOrderPayments);

// Finalizar comanda (valida pagamentos, cria Receivables, lança no Caixa quando marcar)
router.put('/:id/finish', finishOrder);

// Cancelar comanda (devolve estoque de produtos, muda status para CANCELED)
router.delete('/:id/cancel', cancelOrder);

export default router;
