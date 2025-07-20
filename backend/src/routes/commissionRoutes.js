import express from 'express';
import { protect, checkRole } from '../middlewares/authMiddleware.js';
import { getCommissionReport } from '../controllers/commissionController.js';

const router = express.Router();
router.use(protect);

// Rota para buscar o relatório. Apenas o OWNER pode aceder.
router.get('/', checkRole(['OWNER']), getCommissionReport);

export default router;