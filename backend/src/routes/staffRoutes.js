import express from 'express';
import { protect, checkRole } from '../middlewares/authMiddleware.js';
import {
  listStaff,
  createStaff,
  updateStaff,
  deleteStaff
} from '../controllers/staffController.js';

const router = express.Router();

// ✅ Protege todas as rotas com token válido
router.use(protect);

// ✅ Lista e cria - apenas ADMIN ou OWNER
router.route('/')
  .get(checkRole(['ADMIN', 'OWNER']), listStaff)
  .post(checkRole(['ADMIN', 'OWNER']), createStaff);

// ✅ Atualiza e deleta - também apenas ADMIN ou OWNER
router.route('/:id')
  .put(checkRole(['ADMIN', 'OWNER']), updateStaff)
  .delete(checkRole(['ADMIN', 'OWNER']), deleteStaff);

export default router;
