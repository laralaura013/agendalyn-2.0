import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  getDashboardSummary,
  getMonthlyRevenue,
} from '../controllers/dashboardController.js';

const router = express.Router();

// Todas as rotas aqui são protegidas
router.use(protect);

// Resumo geral do dashboard
router.get('/summary', getDashboardSummary);

// Faturamento mensal (para o gráfico do dashboard)
router.get('/revenue-by-month', getMonthlyRevenue);

export default router;
