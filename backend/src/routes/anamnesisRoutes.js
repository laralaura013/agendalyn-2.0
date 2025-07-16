import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { createAnamnesisForm } from '../controllers/anamnesisController.js';

const router = express.Router();
router.use(protect);

// Rotas para os modelos de ficha
router.post('/forms', createAnamnesisForm);
// router.get('/forms', listAnamnesisForms);

// Rotas para as respostas dos clientes
// router.post('/answers', saveAnamnesisAnswer);
// router.get('/answers/client/:clientId', getClientAnamnesisHistory);

export default router;
