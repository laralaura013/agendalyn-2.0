import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { createGoal } from '../controllers/goalsController.js';

const router = express.Router();
router.use(protect);

router.route('/').post(createGoal);
// Adicionar rota para listar metas com progresso
// router.get('/', listGoals);

export default router;
