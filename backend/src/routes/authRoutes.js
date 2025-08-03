import express from 'express';
import { register, login } from '../controllers/authController.js';

const router = express.Router();

// Rotas de autenticação
router.post('/register', register);
router.post('/login', login);

export default router;
