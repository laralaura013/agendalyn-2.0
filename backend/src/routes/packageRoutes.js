import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { createPackage } from '../controllers/packageController.js';

const router = express.Router();
router.use(protect);

router.post('/', createPackage);
// Adicionar rotas para listar pacotes, vender e usar sessões
// router.get('/', listPackages);
// router.post('/sell', sellPackageToClient);
// router.post('/use-session', usePackageSession);

export default router;