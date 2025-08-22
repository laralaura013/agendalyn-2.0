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

// --- LOG do router para depuração rápida ---
router.use((req, _res, next) => {
  // isso imprime apenas requisições que chegam NESTE router
  console.log(`[staffRoutes] ${req.method} ${req.originalUrl}`);
  next();
});

// Todas as rotas exigem autenticação
router.use(protect);

/** Lista e cria — ADMIN/OWNER (adicione MANAGER se quiser) */
router
  .route('/')
  .get(checkRole(['ADMIN', 'OWNER']), listStaff)
  .post(checkRole(['ADMIN', 'OWNER']), createStaff);

/** Export CSV (precisa vir antes de /:id) */
router.get('/export.csv', checkRole(['OWNER']), exportStaffCsv);

/**
 * Visibilidade dedicada — aceitamos dois formatos para evitar 404 causados por ordem ou
 * por front antigo:
 *   PATCH /api/staff/:id/visibility
 *   PATCH /api/staff/visibility/:id
 */
router.patch('/:id/visibility', checkRole(['ADMIN', 'OWNER']), setStaffVisibility);
router.patch('/visibility/:id', checkRole(['ADMIN', 'OWNER']), setStaffVisibility);

/** Atualiza e exclui — ADMIN/OWNER */
router
  .route('/:id')
  .put(checkRole(['ADMIN', 'OWNER']), updateStaff)
  .delete(checkRole(['ADMIN', 'OWNER']), deleteStaff);

export default router;
