import express from 'express';
import { protect, checkRole } from '../middlewares/authMiddleware.js';
import { getRevenueReport, getBirthdaysReport } from '../controllers/reportsController.js';

const router = express.Router();
router.use(protect);

// Apenas OWNER
router.get('/revenue', checkRole(['OWNER']), getRevenueReport);

// Aniversariantes (OWNER)
router.get('/birthdays', checkRole(['OWNER']), getBirthdaysReport);

export default router;
