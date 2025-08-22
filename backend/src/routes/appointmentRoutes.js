// src/routes/appointmentRoutes.js
import express from 'express';
import { protect, checkRole } from '../middlewares/authMiddleware.js';
import {
  listAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from '../controllers/appointmentController.js';

const router = express.Router();

// todas as rotas exigem token válido
router.use(protect);

// listar (com filtros) e criar
router
  .route('/')
  .get(checkRole(['OWNER', 'ADMIN', 'STAFF']), listAppointments)
  .post(checkRole(['OWNER', 'ADMIN']), createAppointment);

// obter por id, atualizar e excluir
router
  .route('/:id')
  .get(checkRole(['OWNER', 'ADMIN', 'STAFF']), getAppointment)
  .put(checkRole(['OWNER', 'ADMIN']), updateAppointment)
  .delete(checkRole(['OWNER', 'ADMIN']), deleteAppointment);

export default router;
