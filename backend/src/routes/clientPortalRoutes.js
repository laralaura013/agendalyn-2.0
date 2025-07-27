import express from 'express';
import {
  registerClient,
  loginClient,
  getMyAppointments,
  getMyPackages,
  cancelAppointment
} from '../controllers/portal/clientAuthController.js'; // ✅ corrigido o caminho

import { protectClient } from '../middlewares/clientAuthMiddleware.js';

const router = express.Router();

// 🔓 Rotas públicas para login e cadastro
router.post('/register', registerClient);
router.post('/login', loginClient);

// 🔐 Rotas protegidas (cliente autenticado via token)
router.get('/my-appointments', protectClient, getMyAppointments);
router.get('/my-packages', protectClient, getMyPackages);
router.delete('/appointments/:id', protectClient, cancelAppointment); // Cancelar agendamento

export default router;
