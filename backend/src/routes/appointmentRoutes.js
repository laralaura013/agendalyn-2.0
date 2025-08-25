// src/routes/appointmentRoutes.js
import { Router } from 'express';
import {
  listAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  listAvailableSlots,
} from '../controllers/appointmentController.js';

const router = Router();

router.get('/', listAppointments);
router.get('/available', listAvailableSlots); // opcional
router.get('/:id', getAppointment);
router.post('/', createAppointment);
router.put('/:id', updateAppointment);
router.delete('/:id', deleteAppointment);

export default router;
