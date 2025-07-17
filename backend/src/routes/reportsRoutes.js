import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { getRevenueReport } from '../controllers/reportsController.js';

const router = express.Router();
router.use(protect);

router.get('/revenue', getRevenueReport);

export default router;