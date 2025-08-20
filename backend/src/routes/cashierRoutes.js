// src/routes/cashierRoutes.js
import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  getCashierStatus,
  getCashierStatement,
  getCashierSummary,
  openCashierController,
  closeCashierController,
} from '../controllers/cashierController.js';

const router = express.Router();

// Todas as rotas de caixa exigem autenticação
router.use(protect);

/**
 * GET /api/cashier/status
 * Retorna se há caixa aberto + status padronizado.
 * { status: 'OPEN'|'CLOSED'|'UNKNOWN', ... }
 */
router.get('/status', getCashierStatus);

/**
 * GET /api/cashier/statement?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Extrato por período (por dia) + totais por categoria.
 * Se não informar, 1º dia do mês atual → hoje.
 */
router.get('/statement', getCashierStatement);

/**
 * GET /api/cashier/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
 * KPIs do período (recebíveis/pagáveis).
 * Se não informar, 1º dia do mês atual → hoje.
 */
router.get('/summary', getCashierSummary);

/**
 * POST /api/cashier/open
 * body: { openingAmount? }  // também aceita openingBalance por compat
 */
router.post('/open', openCashierController);

/**
 * POST /api/cashier/close
 * body: { closingAmount?, notes? }
 */
router.post('/close', closeCashierController);

export default router;
