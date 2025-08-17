// src/routes/reportsRoutes.js
import express from 'express';
import { protect, checkRole } from '../middlewares/authMiddleware.js';
import { exportReceivablesCsv, exportPayablesCsv } from '../controllers/exportsController.js';
import { cashflow, cashflowCsv } from '../controllers/reports/cashflowController.js';

const router = express.Router();

// Todas as rotas abaixo exigem autenticação e papel OWNER
router.use(protect);
router.use(checkRole(['OWNER']));

// Exportações existentes
router.get('/receivables.csv', exportReceivablesCsv);
router.get('/payables.csv', exportPayablesCsv);

// 🆕 Relatório de Fluxo de Caixa
router.get('/cashflow', cashflow);
router.get('/cashflow.csv', cashflowCsv);

export default router;
