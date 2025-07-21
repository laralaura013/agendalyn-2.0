import express from 'express';
import { getBookingPageData, getAvailableSlots, createPublicAppointment } from '../controllers/publicController.js';

const router = express.Router();

router.get('/booking-page/:companyId', getBookingPageData); // A rota está aqui
router.get('/available-slots', getAvailableSlots);
router.post('/create-appointment', createPublicAppointment);

export default router;