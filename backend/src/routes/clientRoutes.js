import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { listClients, createClient, updateClient, deleteClient } from '../controllers/clientController.js';

const router = express.Router();
router.use(protect);

router.route('/').get(listClients).post(createClient);
router.route('/:id').put(updateClient).delete(deleteClient);

export default router;