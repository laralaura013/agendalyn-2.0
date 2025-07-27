import express from 'express';
import {
  registerClient,
  loginClient,
  getMyAppointments,
  getMyPackages,
  cancelAppointment
} from '../controllers/portal/clientAuthController.js';
import { protectClient } from '../middlewares/clientAuthMiddleware.js';

const router = express.Router();

// 🔓 Rotas públicas (login e registro do cliente)
router.post('/login', loginClient);
router.post('/register', registerClient);

// 🔐 Rotas protegidas (cliente logado)
router.use(protectClient);
router.get('/my-appointments', getMyAppointments);
router.get('/my-packages', getMyPackages);
router.delete('/appointments/:id', cancelAppointment);

export default router;
