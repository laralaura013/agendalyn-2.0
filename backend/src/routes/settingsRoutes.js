import express from 'express';
import { protect, checkRole } from '../middlewares/authMiddleware.js';
import * as canc from '../controllers/settings/cancellationReasonsController.js';
import * as origins from '../controllers/settings/clientOriginsController.js';

const router = express.Router();
router.use(protect);
router.use(checkRole(['OWNER']));

/** Motivos de cancelamento */
router.get('/cancellation-reasons', canc.list);
router.post('/cancellation-reasons', canc.create);
router.put('/cancellation-reasons/:id', canc.update);
router.delete('/cancellation-reasons/:id', canc.remove);

/** Origens de cliente */
router.get('/client-origins', origins.list);
router.post('/client-origins', origins.create);
router.put('/client-origins/:id', origins.update);
router.delete('/client-origins/:id', origins.remove);

export default router;
