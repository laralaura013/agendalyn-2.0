import express from 'express';
import { getBookingPageData, getAvailableSlots } from '../controllers/publicController.js';

const router = express.Router();

// Rota para buscar os dados da página (já existia)
router.get('/booking-page/:companyId', getBookingPageData);

// --- NOVA ROTA PARA BUSCAR HORÁRIOS DISPONÍVEIS ---
router.get('/available-slots', getAvailableSlots);

export default router;