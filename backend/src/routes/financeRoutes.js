import express from 'express';
import { protect, checkRole } from '../middlewares/authMiddleware.js';
import * as categories from '../controllers/finance/financeCategoriesController.js';
import * as suppliers from '../controllers/finance/suppliersController.js';
import * as methods from '../controllers/finance/paymentMethodsController.js';
import * as payables from '../controllers/finance/payablesController.js';
import * as receivables from '../controllers/finance/receivablesController.js';

const router = express.Router();
router.use(protect);

// apenas OWNER por padrão
router.use(checkRole(['OWNER']));

/** Categorias financeiras */
router.get('/categories', categories.list);
router.post('/categories', categories.create);
router.put('/categories/:id', categories.update);
router.delete('/categories/:id', categories.remove);

/** Fornecedores */
router.get('/suppliers', suppliers.list);
router.post('/suppliers', suppliers.create);
router.put('/suppliers/:id', suppliers.update);
router.delete('/suppliers/:id', suppliers.remove);

/** Formas de pagamento */
router.get('/payment-methods', methods.list);
router.post('/payment-methods', methods.create);
router.put('/payment-methods/:id', methods.update);
router.delete('/payment-methods/:id', methods.remove);

/** Contas a pagar */
router.get('/payables', payables.list);
router.post('/payables', payables.create);
router.put('/payables/:id', payables.update);
router.delete('/payables/:id', payables.remove);

/** Contas a receber */
router.get('/receivables', receivables.list);
router.post('/receivables', receivables.create);
router.put('/receivables/:id', receivables.update);
router.delete('/receivables/:id', receivables.remove);

export default router;
