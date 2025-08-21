import express from 'express';
import { protect, checkRole } from '../middlewares/authMiddleware.js';
import {
  listStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  exportStaffCsv,
  setStaffVisibility,
} from '../controllers/staffController.js';

const router = express.Router();

// Todas as rotas exigem autenticação
router.use(protect);

/** Lista e cria — ADMIN/OWNER (adicione MANAGER se quiser) */
router
  .route('/')
  .get(checkRole(['ADMIN', 'OWNER']), listStaff)
  .post(checkRole(['ADMIN', 'OWNER']), createStaff);

/** Export CSV precisa vir ANTES de `/:id` para não colidir */
router.get('/export.csv', checkRole(['OWNER']), exportStaffCsv);

/** Visibilidade dedicada (evita colisões com PUT parcial) */
router.patch('/:id/visibility', checkRole(['ADMIN', 'OWNER']), setStaffVisibility);

/** Atualiza e exclui — ADMIN/OWNER */
router
  .route('/:id')
  .put(checkRole(['ADMIN', 'OWNER']), updateStaff)
  .delete(checkRole(['ADMIN', 'OWNER']), deleteStaff);

export default router;
