import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Importa todas as nossas rotas
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

dotenv.config();
const app = express();

const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use('/api/webhooks', webhookRoutes);
app.use(express.json());

// --- Uso das Rotas na API ---
app.use('/api/auth', authRoutes);
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

// Rota de teste
app.get('/api', (req, res) => {
  res.json({ message: 'Bem-vindo à API do Agendalyn 2.0!' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});