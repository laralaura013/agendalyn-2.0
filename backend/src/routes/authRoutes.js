import express from 'express';
import { register, login } from '../controllers/authController.js';

const router = express.Router();

// Rota para registrar uma nova empresa/usuário
// POST /api/auth/register
router.post('/register', register);

// Rota para fazer login
// POST /api/auth/login
router.post('/login', login);

// TODO: Adicionar rota para refresh token
// POST /api/auth/refresh

export default router;
