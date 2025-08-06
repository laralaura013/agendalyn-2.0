// ✅ ARQUIVO: src/routes/waitlistRoutes.js
import express from "express";
import { protect, checkRole } from "../middlewares/authMiddleware.js";
import {
  listWaitlist,
  createWaitlist,
  updateWaitlist,
  deleteWaitlist,
  notifyWaitlist,
} from "../controllers/waitlistController.js";

const router = express.Router();

// Protegido por empresa (ADMIN/OWNER/STAFF podem gerenciar)
router.use(protect);
router.use(checkRole(["ADMIN", "OWNER", "STAFF"]));

router.get("/", listWaitlist);
router.post("/", createWaitlist);
router.put("/:id", updateWaitlist);
router.delete("/:id", deleteWaitlist);
router.post("/:id/notify", notifyWaitlist);

export default router;
