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

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

// ✅ CORS configurado corretamente
const allowedOrigins = [
  'https://frontlyn.netlify.app',
  'http://localhost:5173',
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

// ✅ Middlewares
app.use(express.json());
app.use(cors(corsOptions));

// ✅ Webhooks primeiro (antes de auth, se necessário)
app.use('/api/webhooks', webhookRoutes);

// ✅ Rotas da API
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

// ✅ Health Check
app.get('/api', (req, res) => {
  res.json({ message: 'Bem-vindo à API do Agendalyn 2.0!' });
});

app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Agendalyn 2.0 API is healthy' });
});

// ✅ Inicializa o servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
