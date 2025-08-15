// backend/src/routes/financeRoutes.js
import express from 'express';
import { protect, checkRole } from '../middlewares/authMiddleware.js';

import * as categories from '../controllers/finance/financeCategoriesController.js';
import * as suppliers from '../controllers/finance/suppliersController.js';
import * as methods from '../controllers/finance/paymentMethodsController.js';
import * as payables from '../controllers/finance/payablesController.js';
import * as receivables from '../controllers/finance/receivablesController.js';

const router = express.Router();

/**
 * Todas as rotas financeiras exigem autenticação
 */
router.use(protect);

/* ============================================================================
 * CATEGORIAS FINANCEIRAS
 * - GET liberado (STAFF precisa listar)
 * - Mutação restrita a OWNER
 * ==========================================================================*/
router.get('/categories', categories.list);
router.post('/categories', checkRole(['OWNER']), categories.create);
router.put('/categories/:id', checkRole(['OWNER']), categories.update);
router.delete('/categories/:id', checkRole(['OWNER']), categories.remove);

/* ============================================================================
 * FORNECEDORES
 * - GET liberado (usado na tela de Pagar)
 * - Mutação restrita a OWNER
 * ==========================================================================*/
router.get('/suppliers', suppliers.list);
router.post('/suppliers', checkRole(['OWNER']), suppliers.create);
router.put('/suppliers/:id', checkRole(['OWNER']), suppliers.update);
router.delete('/suppliers/:id', checkRole(['OWNER']), suppliers.remove);

/* ============================================================================
 * FORMAS DE PAGAMENTO
 * - GET liberado (usado nas telas de Pagar/Receber)
 * - Mutação restrita a OWNER
 * ==========================================================================*/
router.get('/payment-methods', methods.list);
router.post('/payment-methods', checkRole(['OWNER']), methods.create);
router.put('/payment-methods/:id', checkRole(['OWNER']), methods.update);
router.delete('/payment-methods/:id', checkRole(['OWNER']), methods.remove);

/* ============================================================================
 * CONTAS A PAGAR
 * - Operação (listar/criar/atualizar) liberada para STAFF + OWNER
 * - Exclusão restrita a OWNER
 * ==========================================================================*/
router.get('/payables', payables.list);
router.post('/payables', payables.create);
router.put('/payables/:id', payables.update);
router.delete('/payables/:id', checkRole(['OWNER']), payables.remove);

/* ============================================================================
 * CONTAS A RECEBER
 * - Operação (listar/criar/atualizar) liberada para STAFF + OWNER
 * - Exclusão restrita a OWNER
 * ==========================================================================*/
router.get('/receivables', receivables.list);
router.post('/receivables', receivables.create);
router.put('/receivables/:id', receivables.update);
router.delete('/receivables/:id', checkRole(['OWNER']), receivables.remove);

export default router;
