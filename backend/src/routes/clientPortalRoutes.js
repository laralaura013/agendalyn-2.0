import express from 'express';
import { registerClient, loginClient, getMyAppointments } from '../controllers/clientPortalController.js';
import { protectClient } from '../middlewares/clientAuthMiddleware.js';

const router = express.Router();

// Novas rotas públicas
router.post('/register', registerClient);
router.post('/login', loginClient);

// Rotas protegidas (apenas para clientes autenticados)
router.get('/my-appointments', protectClient, getMyAppointments);

export default router;