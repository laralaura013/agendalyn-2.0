import express from 'express';
import { getBookingPageData, getAvailableSlots, createPublicAppointment } from '../controllers/publicController.js';

const router = express.Router();

router.get('/booking-page/:companyId', getBookingPageData);
router.get('/available-slots', getAvailableSlots);   // público (sem protect)
router.post('/create-appointment', createPublicAppointment);

export default router;
