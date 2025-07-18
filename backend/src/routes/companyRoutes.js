import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { getCompanyProfile, updateCompanyProfile } from '../controllers/companyController.js';

const router = express.Router();

// Aplica a proteção a todas as rotas deste arquivo
router.use(protect);

// Rota para buscar (GET) e atualizar (PUT) o perfil da empresa
router.route('/profile')
  .get(getCompanyProfile)
  .put(updateCompanyProfile);

export default router;