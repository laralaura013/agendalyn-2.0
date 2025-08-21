import express from 'express';
import { protect, checkRole } from '../middlewares/authMiddleware.js';
import {
  listStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  exportStaffCsv,
} from '../controllers/staffController.js';

const router = express.Router();

// Todas as rotas exigem autenticação
router.use(protect);

/**
 * Lista e cria — apenas ADMIN ou OWNER
 * Suporta GET /?q=&role=&visible=YES|NO
 */
router
  .route('/')
  .get(checkRole(['ADMIN', 'OWNER']), listStaff)
  .post(checkRole(['ADMIN', 'OWNER']), createStaff);

/** Atualiza e exclui — ADMIN ou OWNER */
router
  .route('/:id')
  .put(checkRole(['ADMIN', 'OWNER']), updateStaff)
  .delete(checkRole(['ADMIN', 'OWNER']), deleteStaff);

/** Exportação CSV — OWNER (ou troque para ADMIN/OWNER se preferir) */
router.get('/export.csv', checkRole(['OWNER']), exportStaffCsv);

export default router;
