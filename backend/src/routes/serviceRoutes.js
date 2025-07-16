import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { listServices, createService } from '../controllers/serviceController.js';

const router = express.Router();
router.use(protect);

router.route('/').get(listServices).post(createService);
// Adicionar rotas para update e delete se necessário
// router.route('/:id').put(updateService).delete(deleteService);

export default router;
