// ✅ ARQUIVO: src/App.jsx
import React, { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import ReloadPrompt from "./components/pwa/ReloadPrompt";
import ErrorBoundary from "./components/ErrorBoundary";

// Hook de decisão mobile/desktop
import useAppShellMode from "./hooks/useAppShellMode";

// Layouts
import MobileShell from "./components/mobile/MobileShell";
import AdminLayout from "./components/layouts/AdminLayout";
import ClientLayout from "./components/layouts/ClientLayout";

// Autenticação
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ClientProtectedRoute from "./components/auth/ClientProtectedRoute";

// Páginas Públicas
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import BookingPage from "./pages/BookingPage";

// Portal do Cliente
import ClientLoginPage from "./pages/ClientLoginPage";
import ClientRegisterPage from "./pages/ClientRegisterPage";
import ClientDashboardPage from "./pages/ClientDashboardPage";
import ClientProfilePage from "./pages/ClientProfilePage";
import ClientPackagesPage from "./pages/ClientPackagesPage";
import ClientHistoryPage from "./pages/ClientHistoryPage";
import ClientNoticesPage from "./pages/ClientNoticesPage";

// Portal do Admin
import Dashboard from "./pages/Dashboard";
import Schedule from "./pages/Schedule";
import Clients from "./pages/Clients";
import ClientForm from "./components/forms/ClientForm";
import Staff from "./pages/Staff";
import Services from "./pages/Services";
import Orders from "./pages/Orders";
import Cashier from "./pages/Cashier";
import SubscriptionPage from "./pages/SubscriptionPage";
import ReportsPage from "./pages/ReportsPage";
import GoalsPage from "./pages/GoalsPage";
import AnamnesisPage from "./pages/AnamnesisPage";
import PackagesPage from "./pages/PackagesPage";
import ProductsPage from "./pages/ProductsPage";
import CategoriesPage from "./pages/CategoriesPage";
import BrandsPage from "./pages/BrandsPage";
import SettingsPage from "./pages/SettingsPage";
import CommissionsPage from "./pages/CommissionsPage";
import WaitlistPage from "./pages/WaitlistPage";

// Financeiro e Configurações
import PayablesPage from "./pages/finance/PayablesPage";
import ReceivablesPage from "./pages/finance/ReceivablesPage";
import FinanceCategoriesPage from "./pages/finance/FinanceCategoriesPage";
import SuppliersPage from "./pages/finance/SuppliersPage";
import PaymentMethodsPage from "./pages/finance/PaymentMethodsPage";
import CancellationReasonsPage from "./pages/settings/CancellationReasonsPage";
import ClientOriginsPage from "./pages/settings/ClientOriginsPage";
import BirthdaysReportPage from "./pages/reports/BirthdaysReportPage";
import CashflowReportPage from "./pages/reports/CashflowReportPage";

// ✅ NOVO: Menu (agrupador para o mobile)
import Menu from "./pages/Menu";

// Componente Wrapper para o Layout do Admin
function AdminLayoutWrapper() {
  const { isMobile } = useAppShellMode();
  return isMobile ? <MobileShell /> : <AdminLayout />;
}

function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: { background: "#333", color: "#fff" },
        }}
      />
      <ReloadPrompt />

      <ErrorBoundary>
        <Suspense fallback={<div className="p-4">Carregando…</div>}>
          <Routes>
            {/* --- Rotas Públicas --- */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/agendar/:companyId" element={<BookingPage />} />

            {/* --- Portal do Cliente --- */}
            <Route element={<ClientProtectedRoute />}>
              <Route path="/portal" element={<ClientLayout />}>
                <Route index element={<ClientDashboardPage />} />
                <Route path="agenda" element={<ClientDashboardPage />} />
                <Route path="perfil" element={<ClientProfilePage />} />
                <Route path="pacotes" element={<ClientPackagesPage />} />
                <Route path="historico" element={<ClientHistoryPage />} />
                <Route path="notificacoes" element={<ClientNoticesPage />} />
              </Route>
            </Route>
            <Route path="/portal/login/:companyId" element={<ClientLoginPage />} />
            <Route path="/portal/register/:companyId" element={<ClientRegisterPage />} />

            {/* --- Painel Admin (Estrutura Corrigida) --- */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<AdminLayoutWrapper />}>
                <Route index element={<Dashboard />} />

                {/* ✅ NOVA ROTA DO MENU (mobile) */}
                <Route path="menu" element={<Menu />} />

                {/* Núcleo */}
                <Route path="schedule" element={<Schedule />} />
                <Route path="waitlist" element={<WaitlistPage />} />
                <Route path="orders" element={<Orders />} />
                <Route path="cashier" element={<Cashier />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="reports/birthdays" element={<BirthdaysReportPage />} />
                <Route path="reports/cashflow" element={<CashflowReportPage />} />
                <Route path="goals" element={<GoalsPage />} />

                {/* Cadastros */}
                <Route path="clients" element={<Clients />} />
                <Route path="clients/new" element={<ClientForm />} />
                <Route path="clients/:id/edit" element={<ClientForm />} />
                <Route path="staff" element={<Staff />} />
                <Route path="services" element={<Services />} />
                <Route path="packages" element={<PackagesPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="categories" element={<CategoriesPage />} />
                <Route path="brands" element={<BrandsPage />} />
                <Route path="anamnesis" element={<AnamnesisPage />} />

                {/* Financeiro */}
                <Route path="payables" element={<PayablesPage />} />
                <Route path="receivables" element={<ReceivablesPage />} />
                <Route path="finance-categories" element={<FinanceCategoriesPage />} />
                <Route path="suppliers" element={<SuppliersPage />} />
                <Route path="payment-methods" element={<PaymentMethodsPage />} />
                <Route path="commissions" element={<CommissionsPage />} />

                {/* Configurações */}
                <Route path="settings" element={<SettingsPage />} />
                <Route path="cancellation-reasons" element={<CancellationReasonsPage />} />
                <Route path="client-origins" element={<ClientOriginsPage />} />
                <Route path="subscription" element={<SubscriptionPage />} />
              </Route>

              {/* (opcional) rota isolada de /settings fora do /dashboard */}
              <Route path="/settings" element={<AdminLayoutWrapper />}>
                <Route index element={<SettingsPage />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  );
}

export default App;
