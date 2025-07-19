import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { createCheckoutSession, createCustomerPortal } from '../controllers/subscriptionController.js';

const router = express.Router();

router.use(protect);

router.post('/create-checkout-session', createCheckoutSession);
router.post('/create-customer-portal', createCustomerPortal);

export default router;