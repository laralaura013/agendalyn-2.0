import express from 'express';
import { protect, checkRole } from '../middlewares/authMiddleware.js';
import {
  listBlocks,
  createBlock,
  deleteBlock,
} from '../controllers/blockController.js';

const router = express.Router();

// Autenticação e papéis (ajuste os papéis conforme sua regra)
router.use(protect);
router.use(checkRole(['ADMIN', 'OWNER', 'STAFF']));

// GET /api/agenda/blocks
router.get('/', listBlocks);

// POST /api/agenda/blocks
router.post('/', createBlock);

// DELETE /api/agenda/blocks/:id
router.delete('/:id', deleteBlock);

export default router;
