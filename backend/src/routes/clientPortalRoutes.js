import express from 'express';
import { requestLoginLink, verifyLoginLink, getMyAppointments } from '../controllers/clientPortalController.js';
import { protectClient } from '../middlewares/clientAuthMiddleware.js';

const router = express.Router();

// Rotas públicas
router.post('/request-login', requestLoginLink);
router.post('/verify-login', verifyLoginLink);

// Rotas protegidas (apenas para clientes autenticados)
router.get('/my-appointments', protectClient, getMyAppointments);

export default router;