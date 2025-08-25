// src/routes/analyticsRoutes.js
import express from 'express';
import { protect, checkRole } from '../middlewares/authMiddleware.js';
import { getPerformance, getProjection, getBarberBreakdown } from '../controllers/analyticsController.js';

const router = express.Router();
router.get('/performance', protect, checkRole(['ADMIN','OWNER']), getPerformance);
router.get('/projection',  protect, checkRole(['ADMIN','OWNER']), getProjection);
router.get('/barbers',     protect, checkRole(['ADMIN','OWNER']), getBarberBreakdown);
export default router;
