import express from 'express';
import { register, login } from '../controllers/authController.js';

const router = express.Router();

// Adiciona um handler para requisições OPTIONS na rota /register
router.options('/register', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*'); // Permite todas as origens (temporário para teste)
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(204).send(); // Responde com status 204 No Content
});

router.post('/register', register);
router.post('/login', login);

export default router;
