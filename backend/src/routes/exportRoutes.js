// backend/src/routes/exportRoutes.js
import express from 'express';
import { protect, checkRole } from '../middlewares/authMiddleware.js';
import { exportReceivablesCsv, exportPayablesCsv } from '../controllers/exportsController.js';

const router = express.Router();
router.use(protect);

// Exports geralmente são sensíveis → só OWNER
router.get('/receivables.csv', checkRole(['OWNER']), exportReceivablesCsv);
router.get('/payables.csv', checkRole(['OWNER']), exportPayablesCsv);

export default router;
