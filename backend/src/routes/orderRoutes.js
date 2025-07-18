import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
    createOrder,
    listOrders,
    finishOrder,
    cancelOrder
} from '../controllers/orderController.js';

const router = express.Router();
router.use(protect);

// Rota para listar e criar
router.route('/')
  .get(listOrders)
  .post(createOrder);

// Rota para finalizar (lançar no caixa)
router.put('/:id/finish', finishOrder);

// Rota para cancelar (deletar)
router.delete('/:id/cancel', cancelOrder);

export default router;