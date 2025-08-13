import express from 'express';
import {
  getAuthUrl,
  oauthCallback,
  disconnect,
  getGoogleStatus,
} from '../controllers/googleController.js';
import { protect, checkRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Gera URL para autenticação Google
router.get('/auth-url', protect, checkRole(['ADMIN', 'OWNER']), getAuthUrl);

// Callback do Google OAuth (não precisa autenticar no sistema)
router.get('/callback', oauthCallback);

// Desconectar Google Calendar
router.post('/disconnect', protect, checkRole(['ADMIN', 'OWNER']), disconnect);

// Status da integração para um profissional
router.get('/status/:staffId', protect, checkRole(['ADMIN', 'OWNER', 'STAFF']), getGoogleStatus);

export default router;
