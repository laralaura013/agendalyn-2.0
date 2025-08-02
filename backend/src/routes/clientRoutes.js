import express from 'express';
import {
  listClients,
  createClient,
  updateClient,
  deleteClient,
  getClientAppointmentHistory,
  getClientNotifications,
} from '../controllers/clientController.js';
import { protect, checkRole } from '../middlewares/authMiddleware.js';
import { protectClient } from '../middlewares/clientAuthMiddleware.js';

const router = express.Router();

// Rotas administrativas
router.get('/admin/clients', protect, checkRole(['ADMIN', 'OWNER']), listClients);
router.post('/admin/clients', protect, checkRole(['ADMIN', 'OWNER']), createClient);
router.put('/admin/clients/:id', protect, checkRole(['ADMIN', 'OWNER']), updateClient);
router.delete('/admin/clients/:id', protect, checkRole(['ADMIN', 'OWNER']), deleteClient);

// Rota para histórico de agendamentos (cliente)
router.get('/portal/history', protectClient, getClientAppointmentHistory);

// Rota para notificações do cliente
router.get('/portal/notifications', protectClient, getClientNotifications);

export default router;
