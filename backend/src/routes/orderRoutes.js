// src/routes/orderRoutes.js
import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  createOrder,
  listOrders,
  updateOrderTotals,   // << NOVO
  setOrderPayments,
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

// Atualizar desconto e gorjeta da comanda (enquanto estiver ABERTA)
// body: { discount?: number, tip?: number }
router.put('/:id/totals', updateOrderTotals);  // << NOVO

// Definir/Substituir TODAS as formas de pagamento (enquanto ABERTA)
// body: { payments: [{ paymentMethodId, amount, installments?, cardBrand?, insertIntoCashier? }], expectedTotal? }
router.put('/:id/payments', setOrderPayments);

// Finalizar comanda (valida pagamentos vs total ajustado, gera Receivables, lança no Caixa se marcado)
router.put('/:id/finish', finishOrder);

// Cancelar comanda (devolve estoque e marca como CANCELED)
router.delete('/:id/cancel', cancelOrder);

export default router;
