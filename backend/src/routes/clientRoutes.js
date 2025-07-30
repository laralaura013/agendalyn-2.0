import express from 'express';
import { protect, checkRole } from '../middlewares/authMiddleware.js';
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

router
  .route('/admin')
  .get(checkRole(['ADMIN', 'OWNER']), listClients)
  .post(checkRole(['ADMIN', 'OWNER']), createClient);

router
  .route('/admin/:id')
  .put(checkRole(['ADMIN', 'OWNER']), updateClient)
  .delete(checkRole(['ADMIN', 'OWNER']), deleteClient);

// 👤 Rotas protegidas do cliente logado
router.use(protectClient);

router.delete('/appointments/:id', cancelClientAppointment);

export default router;
