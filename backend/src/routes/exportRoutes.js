import express from 'express';
import { protect, checkRole } from '../middlewares/authMiddleware.js';
import { exportCsv } from '../controllers/exportsController.js';

const router = express.Router();
router.use(protect);
router.use(checkRole(['OWNER']));

router.get('/:entity.csv', exportCsv); // clients, appointments, payables, receivables

export default router;
