import express from 'express';
import multer from 'multer';
import { protect } from '../middlewares/authMiddleware.js';

import {
  // já existentes
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  // novos (implemente no controller)
  patchProduct,          // PATCH /:id  -> atualizações parciais (ex.: visibilidade, estoque, etc.)
  bulkDeleteProducts,    // POST  /bulk-delete  -> { ids: [...] }
  exportProductsCsv,     // GET   /export.csv   -> baixa CSV filtrado
  importProductsCsv,     // POST  /import.csv   -> multipart/form-data (file)
} from '../controllers/productController.js';

const router = express.Router();

// proteção padrão
router.use(protect);

// multer (CSV em memória, até 5MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

/**
 * GET /api/products
 *   Suporta query params: q, page, take, sort, order, categoryId, brandId
 * POST /api/products
 */
router.route('/')
  .get(listProducts)
  .post(createProduct);

/**
 * Extras úteis:
 * - Exportação CSV do dataset filtrado
 * - Importação CSV (colunas: name, price, stock, cost, category, brand, description)
 * - Exclusão em massa
 * - Atualização parcial (PATCH)
 */
router.get('/export.csv', exportProductsCsv);
router.post('/import.csv', upload.single('file'), importProductsCsv);
router.post('/bulk-delete', bulkDeleteProducts);
router.patch('/:id', patchProduct);

/**
 * PUT /api/products/:id
 * DELETE /api/products/:id
 */
router.route('/:id')
  .put(updateProduct)
  .delete(deleteProduct);

export default router;
