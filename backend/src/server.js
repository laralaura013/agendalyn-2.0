import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Importa todas as nossas rotas
import authRoutes from './routes/authRoutes.js'; [cite: 2191, 2778]
import companyRoutes from './routes/companyRoutes.js'; [cite: 2192, 2779]
import clientRoutes from './routes/clientRoutes.js'; [cite: 2192, 2779]
import staffRoutes from './routes/staffRoutes.js'; [cite: 2192, 2779]
import serviceRoutes from './routes/serviceRoutes.js'; [cite: 2192, 2779]
import appointmentRoutes from './routes/appointmentRoutes.js'; [cite: 2193, 2780]
import orderRoutes from './routes/orderRoutes.js'; [cite: 2193, 2780]
import cashierRoutes from './routes/cashierRoutes.js'; [cite: 2193, 2780]
import subscriptionRoutes from './routes/subscriptionRoutes.js'; [cite: 2193, 2781]
import webhookRoutes from './routes/webhookRoutes.js'; [cite: 2194, 2781]
import reportsRoutes from './routes/reportsRoutes.js'; [cite: 2194, 2781]
import goalsRoutes from './routes/goalsRoutes.js'; [cite: 2194, 2781]
import anamnesisRoutes from './routes/anamnesisRoutes.js'; [cite: 2194, 2781]
import packageRoutes from './routes/packageRoutes.js'; [cite: 2194, 2782]

dotenv.config(); [cite: 2195, 2782]
const app = express(); [cite: 2195, 2782]

// Render define a porta automaticamente através da variável de ambiente PORT
const PORT = process.env.PORT || 3001; [cite: 2195]

// Middlewares
app.use(cors()); [cite: 2196, 2783]
app.use('/api/webhooks', webhookRoutes); [cite: 2196, 2783]
app.use(express.json()); [cite: 2196, 2784]

// --- Uso das Rotas na API ---
app.use('/api/auth', authRoutes); [cite: 2197, 2785]
app.use('/api/company', companyRoutes); [cite: 2197, 2785]
app.use('/api/clients', clientRoutes); [cite: 2197, 2785]
app.use('/api/staff', staffRoutes); [cite: 2197, 2785]
app.use('/api/services', serviceRoutes); [cite: 2197, 2785]
app.use('/api/appointments', appointmentRoutes); [cite: 2197, 2785]
app.use('/api/orders', orderRoutes); [cite: 2198, 2786]
app.use('/api/cashier', cashierRoutes); [cite: 2198, 2786]
app.use('/api/subscriptions', subscriptionRoutes); [cite: 2198, 2786]
app.use('/api/reports', reportsRoutes); [cite: 2198, 2786]
app.use('/api/goals', goalsRoutes); [cite: 2198, 2786]
app.use('/api/anamnesis', anamnesisRoutes); [cite: 2198, 2786]
app.use('/api/packages', packageRoutes); [cite: 2198, 2787]

// Rota de teste
app.get('/api', (req, res) => { [cite: 2199, 2787]
  res.json({ message: 'Bem-vindo à API do Agendalyn 2.0!' }); [cite: 2199, 2787]
}); [cite: 2199, 2788]

// --- LINHA CORRIGIDA ---
// Adicionamos '0.0.0.0' para que o servidor ouça em todas as interfaces de rede,
// o que é necessário para plataformas como a Render.
app.listen(PORT, '0.0.0.0', () => { [cite: 2200]
  console.log(`🚀 Servidor rodando na porta ${PORT}`); [cite: 2200, 2788]
}); [cite: 2200, 2788]