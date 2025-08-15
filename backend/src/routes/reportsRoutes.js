import express from 'express';
import { protect, checkRole } from '../middlewares/authMiddleware.js';
import { exportReceivablesCsv, exportPayablesCsv } from '../controllers/exportsController.js';

const router = express.Router();
router.use(protect);
router.use(checkRole(['OWNER']));

router.get('/receivables.csv', exportReceivablesCsv);
router.get('/payables.csv', exportPayablesCsv);

export default router;
