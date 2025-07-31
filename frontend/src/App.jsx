import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ReloadPrompt from './components/pwa/ReloadPrompt';

// Páginas Públicas
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import BookingPage from './pages/BookingPage';

// Admin
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminLayout from './components/layouts/AdminLayout';
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

// Cliente
import ClientLoginPage from './pages/ClientLoginPage';
import ClientRegisterPage from './pages/ClientRegisterPage';
import ClientProtectedRoute from './components/auth/ClientProtectedRoute';
import ClientDashboardPage from './pages/ClientDashboardPage';
import ClientProfilePage from './pages/ClientProfilePage';
import ClientPackagesPage from './pages/ClientPackagesPage';
import ClientHistoryPage from './pages/ClientHistoryPage';
import ClientNoticesPage from './pages/ClientNoticesPage';
import ClientLayout from './components/layouts/ClientLayout';

function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{ duration: 5000, style: { background: '#333', color: '#fff' } }}
      />
      <ReloadPrompt />

      <Routes>
        {/* Rotas Públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/agendar/:companyId" element={<BookingPage />} />

        {/* Portal do Cliente */}
        <Route path="/portal/login/:companyId" element={<ClientLoginPage />} />
        <Route path="/portal/register/:companyId" element={<ClientRegisterPage />} />
        <Route element={<ClientProtectedRoute />}>
          <Route element={<ClientLayout />}>
            <Route path="/portal/dashboard" element={<ClientDashboardPage />} />
            <Route path="/portal/perfil" element={<ClientProfilePage />} />
            <Route path="/portal/pacotes" element={<ClientPackagesPage />} />
            <Route path="/portal/historico" element={<ClientHistoryPage />} />
            <Route path="/portal/avisos" element={<ClientNoticesPage />} />
          </Route>
        </Route>

        {/* Painel do Admin */}
        <Route path="/" element={<ProtectedRoute />}>
          <Route path="dashboard" element={<AdminLayout><Dashboard /></AdminLayout>} />
          <Route path="schedule" element={<AdminLayout><Schedule /></AdminLayout>} />
          <Route path="clients" element={<AdminLayout><Clients /></AdminLayout>} />
          <Route path="staff" element={<AdminLayout><Staff /></AdminLayout>} />
          <Route path="services" element={<AdminLayout><Services /></AdminLayout>} />
          <Route path="orders" element={<AdminLayout><Orders /></AdminLayout>} />
          <Route path="cashier" element={<AdminLayout><Cashier /></AdminLayout>} />
          <Route path="subscription" element={<AdminLayout><SubscriptionPage /></AdminLayout>} />
          <Route path="reports" element={<AdminLayout><ReportsPage /></AdminLayout>} />
          <Route path="goals" element={<AdminLayout><GoalsPage /></AdminLayout>} />
          <Route path="anamnesis" element={<AdminLayout><AnamnesisPage /></AdminLayout>} />
          <Route path="packages" element={<AdminLayout><PackagesPage /></AdminLayout>} />
          <Route path="products" element={<AdminLayout><ProductsPage /></AdminLayout>} />
          <Route path="categories" element={<AdminLayout><CategoriesPage /></AdminLayout>} />
          <Route path="brands" element={<AdminLayout><BrandsPage /></AdminLayout>} />
          <Route path="settings" element={<AdminLayout><SettingsPage /></AdminLayout>} />
          <Route path="commissions" element={<AdminLayout><CommissionsPage /></AdminLayout>} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
