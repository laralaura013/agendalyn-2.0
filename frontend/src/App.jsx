import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ReloadPrompt from './components/pwa/ReloadPrompt'; // 1. Importa o novo componente
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
import ProductsPage from './pages/ProductsPage';
import CategoriesPage from './pages/CategoriesPage';
import BrandsPage from './pages/BrandsPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: { background: '#333', color: '#fff' },
        }}
      />
      <ReloadPrompt /> {/* 2. Adiciona o componente aqui */}
      
      <Routes>
        {/* ... (o resto do seu código de rotas continua exatamente o mesmo) ... */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route 
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/services" element={<Services />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/cashier" element={<Cashier />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/anamnesis" element={<AnamnesisPage />} />
          <Route path="/packages" element={<PackagesPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/brands" element={<BrandsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;