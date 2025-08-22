// src/routes/publicRoutes.js
import express from "express";
import {
  getBookingPageData,
  getAvailableSlots,
  createPublicAppointment,
} from "../controllers/publicController.js";

const router = express.Router();

// Essas rotas devem ser montadas sob /api/public no app principal
router.get("/booking-page/:companyId", getBookingPageData);
router.get("/available-slots", getAvailableSlots);
router.post("/create-appointment", createPublicAppointment);

export default router;
