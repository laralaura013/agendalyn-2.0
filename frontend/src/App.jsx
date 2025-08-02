// src/App.jsx

import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import ReloadPrompt from './components/pwa/ReloadPrompt'

// Páginas Públicas
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import BookingPage from './pages/BookingPage'

// Autenticação Cliente
import ClientLoginPage from './pages/ClientLoginPage'
import ClientRegisterPage from './pages/ClientRegisterPage'
import ClientProtectedRoute from './components/auth/ClientProtectedRoute'
import ClientLayout from './components/layouts/ClientLayout'
import ClientDashboardPage from './pages/ClientDashboardPage'
import ClientProfilePage from './pages/ClientProfilePage'
import ClientPackagesPage from './pages/ClientPackagesPage'
import ClientHistoryPage from './pages/ClientHistoryPage'
import ClientNoticesPage from './pages/ClientNoticesPage'

// Autenticação Admin
import ProtectedRoute from './components/auth/ProtectedRoute'
import AdminLayout from './components/layouts/AdminLayout'

// Páginas Admin
import Dashboard from './pages/Dashboard'
import Schedule from './pages/Schedule'
import Clients from './pages/Clients'
// Import corrigido para o caminho real do componente
import ClientForm from './components/form/ClientForm'
import Staff from './pages/Staff'
import Services from './pages/Services'
import Orders from './pages/Orders'
import Cashier from './pages/Cashier'
import SubscriptionPage from './pages/SubscriptionPage'
import ReportsPage from './pages/ReportsPage'
import GoalsPage from './pages/GoalsPage'
import AnamnesisPage from './pages/AnamnesisPage'
import PackagesPage from './pages/PackagesPage'
import ProductsPage from './pages/ProductsPage'
import CategoriesPage from './pages/CategoriesPage'
import BrandsPage from './pages/BrandsPage'
import SettingsPage from './pages/SettingsPage'
import CommissionsPage from './pages/CommissionsPage'

function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: { background: '#333', color: '#fff' }
        }}
      />
      <ReloadPrompt />

      <Routes>
        {/* Rotas Públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/agendar/:companyId" element={<BookingPage />} />

        {/* Portal do Cliente */}
        <Route
          path="/portal"
          element={
            <ClientProtectedRoute>
              <ClientLayout />
            </ClientProtectedRoute>
          }
        >
          <Route path="dashboard" element={<ClientDashboardPage />} />
          <Route path="perfil" element={<ClientProfilePage />} />
          <Route path="pacotes" element={<ClientPackagesPage />} />
          <Route path="historico" element={<ClientHistoryPage />} />
          <Route path="avisos" element={<ClientNoticesPage />} />
        </Route>
        <Route path="/portal/login/:companyId" element={<ClientLoginPage />} />
        <Route path="/portal/register/:companyId" element={<ClientRegisterPage />} />

        {/* Painel Admin */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard em /dashboard */}
          <Route index element={<Dashboard />} />

          {/* Clientes */}
          <Route path="clients" element={<Clients />} />
          <Route path="clients/new" element={<ClientForm />} />
          <Route path="clients/:id/edit" element={<ClientForm />} />

          {/* Demais seções */}
          <Route path="schedule" element={<Schedule />} />
          <Route path="staff" element={<Staff />} />
          <Route path="services" element={<Services />} />
          <Route path="orders" element={<Orders />} />
          <Route path="cashier" element={<Cashier />} />
          <Route path="subscription" element={<SubscriptionPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="anamnesis" element={<AnamnesisPage />} />
          <Route path="packages" element={<PackagesPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="brands" element={<BrandsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="commissions" element={<CommissionsPage />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
