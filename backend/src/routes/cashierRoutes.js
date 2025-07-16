import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { openCashier, getCashierStatus } from '../controllers/cashierController.js';

const router = express.Router();
router.use(protect);

router.post('/open', openCashier);
router.get('/status', getCashierStatus);
// Adicionar rotas para fechar caixa e adicionar transações
// router.post('/close', closeCashier);
// router.post('/transaction', addTransaction);

export default router;