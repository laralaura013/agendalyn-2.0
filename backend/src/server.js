import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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

// 🆕 Rotas de bloqueio de horários
import blockRoutes from './routes/blockRoutes.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

// ✅ Log da origem para debug
app.use((req, res, next) => {
  console.log('🌐 Origem da requisição:', req.headers.origin);
  next();
});

// ✅ Middleware manual para resolver preflight (CORS) no Railway
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return res.sendStatus(204);
  }
  next();
});

// ✅ CORS padrão com credentials
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());

// ✅ Webhooks primeiro
app.use('/api/webhooks', webhookRoutes);

// ✅ Rotas principais
app.use('/api/portal', clientPortalRoutes);
app.use('/api/public', publicRoutes);
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

// 🆕 Bloqueios de horário
app.use('/api/agenda/blocks', blockRoutes);

// ✅ Health check
app.get('/api', (req, res) => {
  res.json({ message: 'Bem-vindo à API do Agendalyn 2.0!' });
});

app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Agendalyn 2.0 API is healthy' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
