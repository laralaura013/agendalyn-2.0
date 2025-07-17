import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { getCashierStatus, openCashier, closeCashier } from '../controllers/cashierController.js';

const router = express.Router();
router.use(protect);

router.get('/status', getCashierStatus);
router.post('/open', openCashier);
router.post('/close', closeCashier);

export default router;