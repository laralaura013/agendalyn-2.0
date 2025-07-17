import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { createOrder, listOrders, finishOrder } from '../controllers/orderController.js';

const router = express.Router();
router.use(protect);

router.route('/')
  .get(listOrders)
  .post(createOrder);

// NOVA ROTA para finalizar a comanda
router.put('/:id/finish', finishOrder);

export default router;