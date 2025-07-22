import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ReloadPrompt from './components/pwa/ReloadPrompt';

// Páginas Públicas
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import BookingPage from './pages/BookingPage';

// Páginas do Painel do Administrador
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
import CommissionsPage from './pages/CommissionsPage';

// Páginas do Portal do Cliente
import ClientLoginPage from './pages/ClientLoginPage';
import ClientRegisterPage from './pages/ClientRegisterPage';
import ClientProtectedRoute from './components/auth/ClientProtectedRoute';
import ClientDashboardPage from './pages/ClientDashboardPage';

function App() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 5000, style: { background: '#333', color: '#fff' } }} />
      <ReloadPrompt />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/agendar/:companyId" element={<BookingPage />} />
        
        <Route path="/portal/login/:companyId" element={<ClientLoginPage />} />
        <Route path="/portal/register/:companyId" element={<ClientRegisterPage />} />

        <Route element={<ClientProtectedRoute />}>
          <Route path="/portal/dashboard" element={<ClientDashboardPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
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
            <Route path="/commissions" element={<CommissionsPage />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default App;