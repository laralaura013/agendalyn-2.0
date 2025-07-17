import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { 
    listPackages, 
    createPackage, 
    sellPackageToClient,
    listClientPackages,
    usePackageSession
} from '../controllers/packageController.js';

const router = express.Router();
router.use(protect);

// Rotas que já tínhamos
router.route('/')
  .get(listPackages)
  .post(createPackage);

router.post('/sell', sellPackageToClient);

// --- ROTAS NOVAS E CORRIGIDAS ---
router.get('/client/:clientId', listClientPackages);
router.post('/use-session/:clientPackageId', usePackageSession);

export default router;