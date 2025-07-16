import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { getRevenueReport } from '../controllers/reportsController.js';

const router = express.Router();
router.use(protect);

router.get('/revenue', getRevenueReport);
// Adicionar rotas para outros relatórios
// router.get('/revenue-by-user', getRevenueByUserReport);
// router.get('/revenue-by-service', getRevenueByServiceReport);

export default router;
