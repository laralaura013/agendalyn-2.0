import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  createAppointment,
  listAppointments,
  updateAppointment,
  deleteAppointment,
} from '../controllers/appointmentController.js';

const router = express.Router();

// Aplicar o middleware de proteção a todas as rotas de agendamento
router.use(protect);

router.route('/')
  .post(createAppointment)
  .get(listAppointments);

router.route('/:id')
  .put(updateAppointment)
  .delete(deleteAppointment);

export default router;
