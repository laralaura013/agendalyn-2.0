import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
    listBrands,
    createBrand,
    updateBrand,
    deleteBrand
} from '../controllers/brandController.js';

const router = express.Router();
router.use(protect);

router.route('/')
  .get(listBrands)
  .post(createBrand);

router.route('/:id')
  .put(updateBrand)
  .delete(deleteBrand);

export default router;