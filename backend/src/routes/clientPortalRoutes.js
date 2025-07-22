import express from 'express';
import { registerClient, loginClient, getMyAppointments } from '../controllers/clientPortalController.js';
import { protectClient } from '../middlewares/clientAuthMiddleware.js';

const router = express.Router();

// Rotas públicas para registo e login com senha
router.post('/register', registerClient);
router.post('/login', loginClient);

// Rota protegida para o cliente ver os seus agendamentos
router.get('/my-appointments', protectClient, getMyAppointments);

export default router;