import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  createAppointment,
  listAppointments,
  updateAppointment,
  deleteAppointment,
} from '../controllers/appointmentController.js';

const router = express.Router();

// Aplica o middleware de proteção a todas as rotas de agendamento
router.use(protect);

// Rota para LER a lista (GET) e CRIAR um novo (POST)
router.route('/')
  .get(listAppointments)
  .post(createAppointment);

// Rota para EDITAR (PUT) e DELETAR (DELETE) um agendamento específico
router.route('/:id')
  .put(updateAppointment)
  .delete(deleteAppointment);

export default router;