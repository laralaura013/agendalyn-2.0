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

// Rotas administrativas (prefixo: /api/clients)
router.get('/', protect, checkRole(['ADMIN', 'OWNER']), listClients);
router.post('/', protect, checkRole(['ADMIN', 'OWNER']), createClient);
router.put('/:id', protect, checkRole(['ADMIN', 'OWNER']), updateClient);
router.delete('/:id', protect, checkRole(['ADMIN', 'OWNER']), deleteClient);

// Rotas do cliente autenticado (prefixo: /api/clients/portal)
router.get('/portal/history', protectClient, getClientAppointmentHistory);
router.get('/portal/notifications', protectClient, getClientNotifications);

export default router;
