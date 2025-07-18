import express from 'express';
import { protect, checkRole } from '../middlewares/authMiddleware.js'; // Importa o checkRole
import { getRevenueReport } from '../controllers/reportsController.js';

const router = express.Router();
router.use(protect);

// Aplica a regra: apenas usuários com a função 'OWNER' podem acessar esta rota
router.get('/revenue', checkRole(['OWNER']), getRevenueReport);

export default router;