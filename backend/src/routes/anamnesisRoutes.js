import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { 
    listAnamnesisForms, 
    createAnamnesisForm,
    saveAnamnesisAnswer,
    getClientAnamnesisHistory // Importa a nova função
} from '../controllers/anamnesisController.js';

const router = express.Router();
router.use(protect);

// Rotas para os MODELOS de ficha
router.route('/forms')
    .get(listAnamnesisForms)
    .post(createAnamnesisForm);

// Rota para as RESPOSTAS
router.post('/answers', saveAnamnesisAnswer);

// --- NOVA ROTA PARA O HISTÓRICO ---
router.get('/answers/client/:clientId', getClientAnamnesisHistory);

export default router;