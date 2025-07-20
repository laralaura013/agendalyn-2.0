import express from 'express';
import { getBookingPageData, getAvailableSlots, createPublicAppointment } from '../controllers/publicController.js';

const router = express.Router();

// Rota para buscar os dados da página
router.get('/booking-page/:companyId', getBookingPageData);

// Rota para buscar horários disponíveis
router.get('/available-slots', getAvailableSlots);

// --- NOVA ROTA PARA CRIAR O AGENDAMENTO ---
router.post('/create-appointment', createPublicAppointment);

export default router;