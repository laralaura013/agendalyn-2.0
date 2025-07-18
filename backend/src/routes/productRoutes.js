import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
    listProducts,
    createProduct,
    updateProduct,
    deleteProduct
} from '../controllers/productController.js';

const router = express.Router();
router.use(protect);

router.route('/')
  .get(listProducts)
  .post(createProduct);

router.route('/:id')
  .put(updateProduct)
  .delete(deleteProduct);

export default router;