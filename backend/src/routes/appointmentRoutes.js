import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  createAppointment,
  listAppointments,
  updateAppointment,
  deleteAppointment,
} from '../controllers/appointmentController.js';

const router = express.Router();

// Todas as rotas protegidas
router.use(protect);

// Lista (GET) e cria (POST)
router.route('/')
  .get(listAppointments)
  .post(createAppointment);

// Atualiza (PUT) e exclui (DELETE) por ID
router.route('/:id')
  .put(updateAppointment)
  .delete(deleteAppointment);

export default router;
