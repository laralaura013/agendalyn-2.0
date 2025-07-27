import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { protectClient } from '../middlewares/clientAuthMiddleware.js';
import {
  listClients,
  createClient,
  updateClient,
  deleteClient,
} from '../controllers/clientController.js';
import { cancelClientAppointment } from '../controllers/clientAppointmentController.js';

const router = express.Router();

// 🔐 Rotas de administração de clientes (painel admin)
router.use('/admin', protect);
router.route('/admin').get(listClients).post(createClient);
router.route('/admin/:id').put(updateClient).delete(deleteClient);

// 👤 Rotas protegidas do cliente logado
router.use(protectClient);
router.delete('/appointments/:id', cancelClientAppointment);

export default router;
