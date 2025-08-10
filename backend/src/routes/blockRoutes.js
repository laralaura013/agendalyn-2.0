import express from 'express';
import { protect, checkRole } from '../middlewares/authMiddleware.js';
import { listBlocks, createBlock, deleteBlock } from '../controllers/blockController.js';

const router = express.Router();

router.use(protect);
router.use(checkRole(['ADMIN', 'OWNER', 'STAFF']));

router.get('/', listBlocks);
router.post('/', createBlock);
router.delete('/:id', deleteBlock);

export default router;
