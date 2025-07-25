import express from 'express';
import {
  registerClient,
  loginClient,
  getMyAppointments,
  getMyPackages,
  cancelAppointment
} from '../controllers/clientPortalController.js';

import { protectClient } from '../middlewares/clientAuthMiddleware.js';

const router = express.Router();

// Rotas públicas para registo e login com senha
router.post('/register', registerClient);
router.post('/login', loginClient);

// Rotas protegidas (apenas para clientes autenticados)
router.get('/my-appointments', protectClient, getMyAppointments);
router.get('/my-packages', protectClient, getMyPackages);
router.delete('/appointments/:id', protectClient, cancelAppointment); // ✅ NOVA ROTA

export default router;
