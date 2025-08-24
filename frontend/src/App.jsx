// frontend/src/App.jsx
import React, { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import ReloadPrompt from "./components/pwa/ReloadPrompt";
import ErrorBoundary from "./components/ErrorBoundary";

import useAppShellMode from "./hooks/useAppShellMode";

import MobileShell from "./components/mobile/MobileShell";
import AdminLayout from "./components/layouts/AdminLayout";
import ClientLayout from "./components/layouts/ClientLayout";

import ProtectedRoute from "./components/auth/ProtectedRoute";
import ClientProtectedRoute from "./components/auth/ClientProtectedRoute";

/* Público */
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import BookingPage from "./pages/BookingPage";

/* Portal do Cliente */
import ClientLoginPage from "./pages/ClientLoginPage";
import ClientRegisterPage from "./pages/ClientRegisterPage";
import ClientDashboardPage from "./pages/ClientDashboardPage";
import ClientProfilePage from "./pages/ClientProfilePage";
import ClientPackagesPage from "./pages/ClientPackagesPage";
import ClientHistoryPage from "./pages/ClientHistoryPage";
import ClientNoticesPage from "./pages/ClientNoticesPage";

/* Admin */
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

/* Financeiro */
import PayablesPage from "./pages/finance/PayablesPage";
import ReceivablesPage from "./pages/finance/ReceivablesPage";
import FinanceCategoriesPage from "./pages/finance/FinanceCategoriesPage";
import SuppliersPage from "./pages/finance/SuppliersPage";
import PaymentMethodsPage from "./pages/finance/PaymentMethodsPage";

/* Configurações específicas */
import CancellationReasonsPage from "./pages/settings/CancellationReasonsPage";
import ClientOriginsPage from "./pages/settings/ClientOriginsPage";

/* Relatórios */
import BirthdaysReportPage from "./pages/reports/BirthdaysReportPage";
import CashflowReportPage from "./pages/reports/CashflowReportPage";

/* Menu (novo) */
import Menu from "./pages/Menu";

/* Fallback simples p/ rotas não mapeadas */
const NotFound = () => (
  <div className="p-6 text-sm text-gray-600">Página não encontrada.</div>
);

function AdminLayoutWrapper() {
  const { isMobile } = useAppShellMode();
  return isMobile ? <MobileShell /> : <AdminLayout />;
}

function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{ duration: 5000, style: { background: "#333", color: "#fff" } }}
      />
      <ReloadPrompt />

      <ErrorBoundary>
        <Suspense fallback={<div className="p-4">Carregando…</div>}>
          <Routes>
            {/* Público */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/agendar/:companyId" element={<BookingPage />} />

            {/* Portal do Cliente */}
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

            {/* Painel Admin (protegido) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<AdminLayoutWrapper />}>
                <Route index element={<Dashboard />} />
                <Route path="clients" element={<Clients />} />
                <Route path="clients/new" element={<ClientForm />} />
                <Route path="clients/:id/edit" element={<ClientForm />} />
                <Route path="schedule" element={<Schedule />} />
                <Route path="waitlist" element={<WaitlistPage />} />
                <Route path="staff" element={<Staff />} />
                <Route path="services" element={<Services />} />
                <Route path="orders" element={<Orders />} />
                <Route path="cashier" element={<Cashier />} />
                <Route path="subscription" element={<SubscriptionPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="reports/birthdays" element={<BirthdaysReportPage />} />
                <Route path="reports/cashflow" element={<CashflowReportPage />} />
                <Route path="goals" element={<GoalsPage />} />
                <Route path="anamnesis" element={<AnamnesisPage />} />
                <Route path="packages" element={<PackagesPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="categories" element={<CategoriesPage />} />
                <Route path="brands" element={<BrandsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="commissions" element={<CommissionsPage />} />
                <Route path="payables" element={<PayablesPage />} />
                <Route path="receivables" element={<ReceivablesPage />} />
                <Route path="finance-categories" element={<FinanceCategoriesPage />} />
                <Route path="suppliers" element={<SuppliersPage />} />
                <Route path="payment-methods" element={<PaymentMethodsPage />} />
                <Route path="cancellation-reasons" element={<CancellationReasonsPage />} />
                <Route path="client-origins" element={<ClientOriginsPage />} />

                {/* Menu */}
                <Route path="menu" element={<Menu />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  );
}

export default App;
