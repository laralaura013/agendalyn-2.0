// backend/src/routes/exportRoutes.js
import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  exportReceivablesCsv,
  exportPayablesCsv,
} from '../controllers/finance/exportsController.js';

const router = express.Router();

router.use(protect);

router.get('/receivables.csv', exportReceivablesCsv);
router.get('/payables.csv', exportPayablesCsv);

export default router;
