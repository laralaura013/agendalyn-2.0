// src/routes/reportsRoutes.js
import express from 'express';
import { protect, checkRole } from '../middlewares/authMiddleware.js';

// CSVs já existentes
import { exportReceivablesCsv, exportPayablesCsv } from '../controllers/exportsController.js';

// Relatórios unificados (JSON + CSV de fluxo de caixa)
import {
  getRevenueReport,     // GET /api/reports/revenue
  getBirthdaysReport,   // GET /api/reports/birthdays
  getCashflowReport,    // GET /api/reports/cashflow
  cashflowCsv,          // GET /api/reports/cashflow.csv
} from '../controllers/reportsController.js';

const router = express.Router();

// Todas as rotas exigem autenticação e papel OWNER
router.use(protect);
router.use(checkRole(['OWNER']));

/* ===================== JSON Reports ===================== */

// Faturamento por período
// Ex.: /api/reports/revenue?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/revenue', getRevenueReport);

// Aniversariantes (por mês OU faixa MM-DD)
// Ex.: /api/reports/birthdays?month=1..12
//      /api/reports/birthdays?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&q=...
router.get('/birthdays', getBirthdaysReport);

// Fluxo de caixa consolidado (entradas/saídas/saldo por dia)
// Ex.: /api/reports/cashflow?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD[&paymentMethodId=...][&openingBalance=...]
router.get('/cashflow', getCashflowReport);

/* ====================== CSV Exports ====================== */

// Recebíveis em CSV
router.get('/receivables.csv', exportReceivablesCsv);

// Pagáveis em CSV
router.get('/payables.csv', exportPayablesCsv);

// Fluxo de caixa em CSV (usando o mesmo cálculo do JSON)
router.get('/cashflow.csv', cashflowCsv);

export default router;
