import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { listStaff, createStaff, updateStaff, deleteStaff } from '../controllers/staffController.js';

const router = express.Router();
router.use(protect);

// Esta rota agora lida com GET (listar) e POST (criar)
router.route('/')
  .get(listStaff)
  .post(createStaff);

// ESTA É A NOVA PARTE:
// Esta rota agora lida com PUT (editar) e DELETE (excluir) para um ID específico
router.route('/:id')
  .put(updateStaff)
  .delete(deleteStaff);

export default router;