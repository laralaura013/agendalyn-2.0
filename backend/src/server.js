// src/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Middlewares
import { companyLogger } from './middlewares/loggerMiddleware.js';

// Rotas
import authRoutes from './routes/authRoutes.js';
import companyRoutes from './routes/companyRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import staffRoutes from './routes/staffRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import cashierRoutes from './routes/cashierRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import reportsRoutes from './routes/reportsRoutes.js';
import goalsRoutes from './routes/goalsRoutes.js';
import anamnesisRoutes from './routes/anamnesisRoutes.js';
import packageRoutes from './routes/packageRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import brandRoutes from './routes/brandRoutes.js';
import commissionRoutes from './routes/commissionRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import clientPortalRoutes from './routes/clientPortalRoutes.js';
import waitlistRoutes from './routes/waitlistRoutes.js';
import blockRoutes from './routes/blockRoutes.js';
import googleRoutes from './routes/googleRoutes.js';

// Extras
import financeRoutes from './routes/financeRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import exportRoutes from './routes/exportRoutes.js';

// Formas de pagamento (OrderDrawer)
import paymentMethodRoutes from './routes/paymentMethodRoutes.js';

// Integração WhatsApp (Webhook simples)
import whatsappRoutes from './routes/whatsappRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

/* ------------------------ Segurança & infra ------------------------ */
app.set('trust proxy', 1);
app.disable('x-powered-by');

/* ------------------------ Log simples de origem -------------------- */
app.use((req, _res, next) => {
  const origin = req.headers.origin || '—';
  console.log('🌐 Origin:', origin, '| URL:', req.method, req.originalUrl);
  next();
});

/* ------------------------ Preflight manual ------------------------- */
const allowOrigin = (origin) => {
  if (!origin) return true; // server-to-server (ex.: Meta Webhooks não mandam Origin)
  const netlify = /^https:\/\/[a-z0-9-]+\.netlify\.app$/i.test(origin) || origin === 'https://frontlyn.netlify.app';
  const local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
  const railway = /railway\.app$/i.test(origin);
  const vercel = /\.vercel\.app$/i.test(origin);
  return netlify || local || railway || vercel;
};

app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    const reqOrigin  = req.headers.origin || 'https://frontlyn.netlify.app';
    const reqHeaders = req.headers['access-control-request-headers'] || 'Content-Type, Authorization';
    res.setHeader('Access-Control-Allow-Origin', allowOrigin(reqOrigin) ? reqOrigin : 'https://frontlyn.netlify.app');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', reqHeaders);
    return res.sendStatus(204);
  }
  next();
});

/* ------------------------ CORS global ------------------------------ */
app.use(
  cors({
    origin: (origin, cb) => {
      if (allowOrigin(origin)) return cb(null, true);
      cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

/**
 * ⚠️ WhatsApp webhook precisa do raw body para validação de assinatura (opcional).
 * Por isso, montamos a rota DO WHATSAPP ANTES do express.json global e com um express.json próprio.
 */
app.use(
  '/api/integrations/whatsapp',
  express.json({
    limit: '2mb',
    verify: (req, _res, buf) => {
      // Disponibiliza o raw body como STRING para verificar X-Hub-Signature-256 (se WABA_APP_SECRET estiver setado)
      req.rawBody = buf.toString('utf8');
    },
  }),
  whatsappRoutes
);

/* ------------------------ Core middlewares ------------------------ */
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Logger contextual (empresa/usuário)
app.use(companyLogger);

/* ----------------------------- Rotas ------------------------------ */
// Webhooks primeiro
app.use('/api/webhooks', webhookRoutes);

// Rotas públicas e gerais
app.use('/api/portal', clientPortalRoutes);
app.use('/api/public', publicRoutes);

// Auth e entidades
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cashier', cashierRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/anamnesis', anamnesisRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/agenda/blocks', blockRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/integrations/google', googleRoutes);

// Extras
app.use('/api/finance', financeRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/exports', exportRoutes);

// Formas de pagamento (OrderDrawer)
app.use('/api/payment-methods', paymentMethodRoutes);

/* --------------------------- Healthcheck -------------------------- */
app.get('/api', (_req, res) => res.json({ message: 'Bem-vindo à API do Agendalyn 2.0!' }));
app.get('/', (_req, res) => res.status(200).json({ status: 'ok', message: 'Agendalyn 2.0 API is healthy' }));

/* ----------------------- 404 & Error Handler ---------------------- */
app.use((req, res) => {
  res.status(404).json({ message: 'Rota não encontrada.' });
});

app.use((err, req, res, _next) => {
  console.error('❌ Unhandled error:', err);
  const origin = req.headers?.origin;
  if (origin && allowOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.status(500).json({ message: 'Erro interno do servidor.' });
});

/* ---------------------------- Servidor ---------------------------- */
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
