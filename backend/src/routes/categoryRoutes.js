import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
    listCategories,
    createCategory,
    updateCategory,
    deleteCategory
} from '../controllers/categoryController.js';

const router = express.Router();
router.use(protect);

router.route('/')
  .get(listCategories)
  .post(createCategory);

router.route('/:id')
  .put(updateCategory)
  .delete(deleteCategory);

export default router;