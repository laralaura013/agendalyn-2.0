import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { listGoals, createGoal } from '../controllers/goalsController.js';

const router = express.Router();
router.use(protect);

router.route('/')
  .get(listGoals)
  .post(createGoal);

// Futuramente: adicionar rotas para update e delete
// router.route('/:id').put(updateGoal).delete(deleteGoal);

export default router;