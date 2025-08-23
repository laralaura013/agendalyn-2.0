import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  listPackages,
  createPackage,
  deletePackage,
  sellPackageToClient,
  listClientPackages,
  usePackageSession,
} from '../controllers/packageController.js';

const router = express.Router();
router.use(protect);

// /api/packages
router
  .route('/')
  .get(listPackages)
  .post(createPackage);

// deletar pacote específico
router.delete('/:id', deletePackage);

// vender pacote
router.post('/sell', sellPackageToClient);

// pacotes do cliente e uso de sessão
router.get('/client/:clientId', listClientPackages);
router.post('/use-session/:clientPackageId', usePackageSession);

export default router;
