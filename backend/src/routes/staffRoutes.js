import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { listStaff, createStaff } from '../controllers/staffController.js';

const router = express.Router();
router.use(protect);

router.route('/').get(listStaff).post(createStaff);
// Adicionar rotas para update e delete se necessário
// router.route('/:id').put(updateStaff).delete(deleteStaff);

export default router;
