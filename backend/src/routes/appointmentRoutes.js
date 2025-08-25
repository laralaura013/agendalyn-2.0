import { Router } from 'express';
import {
  listAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from '../controllers/appointmentController.js';

const router = Router();

/** IMPORTANTE: Rotas específicas antes das dinâmicas */

// lista (com filtros ?date=YYYY-MM-DD, ?date_from, ?date_to, ?professionalId)
router.get('/', listAppointments);

// detalhes
router.get('/:id', getAppointment);

// criar
router.post('/', createAppointment);

// atualizar
router.put('/:id', updateAppointment);

// deletar
router.delete('/:id', deleteAppointment);

export default router;
