import express from 'express';
import { requestLoginLink, verifyLoginLink } from '../controllers/clientPortalController.js';

const router = express.Router();

router.post('/request-login', requestLoginLink);
router.post('/verify-login', verifyLoginLink);

export default router;