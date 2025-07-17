import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { 
    listServices, 
    createService, 
    updateService, 
    deleteService 
} from '../controllers/serviceController.js';

const router = express.Router();
router.use(protect);

// Rota para GET (listar) e POST (criar)
router.route('/')
  .get(listServices)
  .post(createService);

// NOVA ROTA: para PUT (editar) e DELETE (excluir) um serviço específico
router.route('/:id')
  .put(updateService)
  .delete(deleteService);

export default router;