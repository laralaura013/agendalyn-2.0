import express from 'express';
import { register, login } from '../controllers/authController.js'; // Corrigido

const router = express.Router();

router.post('/register', register); // Corrigido
router.post('/login', login);

export default router;