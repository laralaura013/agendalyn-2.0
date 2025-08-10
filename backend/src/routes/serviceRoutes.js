import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { listServices, createService, updateService, deleteService } from '../controllers/serviceController.js';

const router = express.Router();
router.use(protect);

router.route('/')
  .get(listServices)
  .post(createService);

router.route('/:id')
  .put(updateService)
  .delete(deleteService);

export default router;
