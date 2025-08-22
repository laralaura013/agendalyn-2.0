// src/routes/whatsappRoutes.js
import { Router } from 'express';
import { verifyWebhook, receiveWebhook } from '../controllers/integrations/whatsappController.js';

const router = Router();

// GET para verificação inicial
router.get('/webhook', verifyWebhook);

// POST para eventos
router.post('/webhook', receiveWebhook);

export default router;
