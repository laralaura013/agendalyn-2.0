import express from 'express';
import { getBookingPageData } from '../controllers/publicController.js';

const router = express.Router();

// Rota para buscar os dados necessários para a página de agendamento de uma empresa específica
router.get('/booking-page/:companyId', getBookingPageData);

export default router;