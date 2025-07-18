import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { getDashboardSummary } from '../controllers/dashboardController.js';

const router = express.Router();

// Todas as rotas aqui são protegidas
router.use(protect);

// Rota para buscar o resumo
router.get('/summary', getDashboardSummary);

export default router;