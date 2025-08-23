// src/routes/metaRoutes.js
import express from 'express';
import {
  embeddedStart,
  oauthCallback,
  status,
  webhookVerify,
  webhookReceive,
  disconnect,
  sendTemplate,
} from '../controllers/metaController.js';

const router = express.Router();

// JSON com RAW para HMAC no webhook
router.use(
  express.json({
    limit: '2mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Fluxo Embedded Signup
router.post('/embedded/start', embeddedStart);
router.get('/oauth/callback', oauthCallback);

// Status / Disconnect
router.get('/status', status);
router.post('/disconnect', disconnect);

// Webhook (GET verify + POST receive)
router.get('/webhook', webhookVerify);
router.post('/webhook', webhookReceive);

// Envio template (útil p/ primeiro contato)
router.post('/send/template', sendTemplate);

export default router;
