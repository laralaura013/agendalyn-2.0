// src/routes/clientRoutes.js
import express from 'express';
import {
  listClients,
  listClientsMin,
  listClientsForSelect,   // <--- NOVO
  createClient,
  updateClient,
  getClientById,
  softDeleteClient,
  restoreClient,
  hardDeleteClient,
  bulkSoftDelete,
  bulkRestore,
  mergeClients,
  exportClientsCsv,
  importClientsCsv,
  upload,
} from '../controllers/clientController.js';

import { protect, checkRole } from '../middlewares/authMiddleware.js';

const router = express.Router();
const guard = [protect, checkRole(['ADMIN', 'OWNER'])];

// Lista MIN para selects/autocomplete (rápida)
// GET /api/clients/min?q=jo&take=20&skip=0
router.get('/min', guard, listClientsMin);

// Lista simplificada para dropdowns de selects (somente ativos)
// GET /api/clients/select?q=jo
router.get('/select', guard, listClientsForSelect);

// List / filtros / paginação
router.get('/', guard, listClients);

// Export respeitando filtros
router.get('/export.csv', guard, exportClientsCsv);

// Import CSV (campo "file")
router.post('/import.csv', guard, upload.single('file'), importClientsCsv);

// CRUD
router.get('/:id', guard, getClientById);
router.post('/', guard, createClient);
router.put('/:id', guard, updateClient);

// Soft delete / restore / hard delete
router.delete('/:id', guard, softDeleteClient);
router.post('/:id/restore', guard, restoreClient);
router.delete('/:id/hard', guard, hardDeleteClient);

// Bulk actions
router.post('/bulk/soft-delete', guard, bulkSoftDelete);
router.post('/bulk/restore', guard, bulkRestore);

// Merge
router.post('/merge', guard, mergeClients);

export default router;
