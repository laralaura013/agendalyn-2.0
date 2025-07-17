import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardLayout from './components/dashboard/DashboardLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import Clients from './pages/Clients';
import Staff from './pages/Staff';
import Services from './pages/Services';
import Orders from './pages/Orders';
import Cashier from './pages/Cashier';
import SubscriptionPage from './pages/SubscriptionPage';
import ReportsPage from './pages/ReportsPage';
import GoalsPage from './pages/GoalsPage';
import AnamnesisPage from './pages/AnamnesisPage';
import PackagesPage from './pages/PackagesPage';

function App() {
  return (
    <Routes>
      {/* Rotas Públicas */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Rotas Protegidas */}
      <Route 
        path="/*" // Rota "coringa" para todas as outras URLs
        element={
          <ProtectedRoute>
            <Routes>
              <Route path="/" element={<DashboardLayout />}>
                <Route index element={<Dashboard />} /> {/* Rota inicial do painel */}
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="schedule" element={<Schedule />} />
                <Route path="clients" element={<Clients />} />
                <Route path="staff" element={<Staff />} />
                <Route path="services" element={<Services />} />
                <Route path="orders" element={<Orders />} />
                <Route path="cashier" element={<Cashier />} />
                <Route path="subscription" element={<SubscriptionPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="goals" element={<GoalsPage />} />
                <Route path="anamnesis" element={<AnamnesisPage />} />
                <Route path="packages" element={<PackagesPage />} />
                {/* Adicionar aqui outras rotas do painel que criarmos */}
              </Route>
            </Routes>
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}

export default App;