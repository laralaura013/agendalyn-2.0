import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { createOrder, listOrders } from '../controllers/orderController.js';

const router = express.Router();
router.use(protect);

router.route('/').get(listOrders).post(createOrder);
// Adicionar rotas para getById, update, etc.
// router.route('/:id').get(getOrderById).put(updateOrder);

export default router;
