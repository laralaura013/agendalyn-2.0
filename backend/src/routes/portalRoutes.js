import express from 'express';
import { loginClient } from '../controllers/portal/clientAuthController.js';

const router = express.Router();

router.post('/login', loginClient);

export default router;
