// src/routes/authRoutes.js
import express from 'express';
import { register, login, me } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// (Opcional) log simples para depuração — pode remover depois
router.use((req, _res, next) => {
  console.log(`[authRoutes] ${req.method} ${req.originalUrl}`);
  next();
});

/**
 * POST /api/auth/register
 * Cria a empresa, assina plano (trial) e cria o usuário OWNER.
 */
router.post('/register', register);

/**
 * POST /api/auth/login
 * Aceita opcionalmente companyId no body ou pelo header x-company-id.
 */
router.post('/login', login);

/**
 * GET /api/auth/me
 * Retorna dados do usuário autenticado.
 */
router.get('/me', protect, me);

export default router;
