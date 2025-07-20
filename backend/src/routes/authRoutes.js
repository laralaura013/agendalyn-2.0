import express from 'express';
import { createRegistrationCheckout, login } from '../controllers/authController.js';

const router = express.Router();

// Nova rota para iniciar o processo de cadastro e pagamento
router.post('/register-checkout', createRegistrationCheckout);

// Rota para fazer login (continua a mesma)
router.post('/login', login);

export default router;