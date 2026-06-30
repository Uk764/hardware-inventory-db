import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/layout/Layout';

// Pages
import Login       from './pages/auth/Login';
import Dashboard   from './pages/dashboard/Dashboard';
import Products    from './pages/products/Products';
import Categories  from './pages/categories/Categories';
import Suppliers   from './pages/suppliers/Suppliers';
import LowStock    from './pages/low-stock/LowStock';
import Billing     from './pages/billing/Billing';
import InvoiceList from './pages/billing/InvoiceList';
import Reports     from './pages/reports/Reports';
import PrintBarcode from './pages/products/PrintBarcode';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1f2937',
              color: '#fff',
              borderRadius: '10px',
            },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/dashboard" element={
            <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>
          } />
          <Route path="/products" element={
            <ProtectedRoute><Layout><Products /></Layout></ProtectedRoute>
          } />
          <Route path="/categories" element={
            <ProtectedRoute><Layout><Categories /></Layout></ProtectedRoute>
          } />
          <Route path="/suppliers" element={
            <ProtectedRoute><Layout><Suppliers /></Layout></ProtectedRoute>
          } />
          <Route path="/billing" element={
            <ProtectedRoute><Layout><Billing /></Layout></ProtectedRoute>
          } />
          <Route path="/invoices" element={
            <ProtectedRoute><Layout><InvoiceList /></Layout></ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute><Layout><Reports /></Layout></ProtectedRoute>
          } />
          <Route path="/low-stock" element={
            <ProtectedRoute><Layout><LowStock /></Layout></ProtectedRoute>
          } />
          <Route path="/print-barcode" element={
            <ProtectedRoute><Layout><PrintBarcode /></Layout></ProtectedRoute>
          } />
          <Route path="/"  element={<Navigate to="/dashboard" replace />} />
          <Route path="*"  element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;