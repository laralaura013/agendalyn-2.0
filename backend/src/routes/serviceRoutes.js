// routes/serviceRoutes.js
import express from 'express';
import { protect, checkRole } from '../middlewares/authMiddleware.js';
import {
  listServices,
  listServicesMin,   // autocomplete / select leve
  createService,
  updateService,
  deleteService,
} from '../controllers/serviceController.js';

const router = express.Router();

// Todas as rotas exigem autenticação
router.use(protect);

// Somente ADMIN/OWNER podem escrever (criar/editar/excluir)
const guardRW = [checkRole(['ADMIN', 'OWNER'])];

/**
 * IMPORTANTE: defina /select antes de rotas com :id
 * para não colidir com o parâmetro dinâmico.
 */
router.get('/select', listServicesMin);     // GET /api/services/select?q=...&take=50&skip=0

// Leitura aberta para qualquer autenticado
router.get('/', listServices);              // GET /api/services

// Escrita restrita
router.post('/', guardRW, createService);   // POST /api/services
router.put('/:id', guardRW, updateService); // PUT /api/services/:id
router.delete('/:id', guardRW, deleteService); // DELETE /api/services/:id

export default router;
