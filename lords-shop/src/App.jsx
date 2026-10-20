import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// 🧠 ПРОВАЙДЕРИ СТАНУ (Context API)
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { CompareProvider } from './context/CompareContext';
import { ThemeProvider } from './context/ThemeContext';
import { CurrencyProvider } from './context/CurrencyContext';

// 🧩 ГЛОБАЛЬНІ КОМПОНЕНТИ (UI елементи)
import Header from './components/Header';
import Footer from './components/Footer';
import AdminRoute from './components/AdminRoute';
import ErrorBoundary from './components/ErrorBoundary';
import CookieConsent from './components/CookieConsent';

// 🛍️ ОСНОВНІ СТОРІНКИ (миттєве завантаження)
import Home from './pages/Home';
import Resources from './pages/Resources';
import Accounts from './pages/Accounts';
import Cart from './pages/Cart';
import Profile from './pages/Profile';
import TopUp from './pages/TopUp';
import OtherItems from './pages/OtherItems';

// 🚀 CODE SPLITTING (Lazy Loading для важких сторінок)
const AccountDetails = lazy(() => import('./pages/AccountDetails'));
const Compare = lazy(() => import('./pages/Compare'));
const GemsBuilder = lazy(() => import('./pages/GemsBuilder'));
const Calculator = lazy(() => import('./pages/Calculator'));
const Guarantees = lazy(() => import('./pages/Guarantees'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Admin = lazy(() => import('./pages/Admin'));
const SHARINGAN = lazy(() => import('./pages/SHARINGAN'));

const PageFallback = () => (
  <div className="flex-1 flex items-center justify-center min-h-[50vh]">
    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

function App() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      const cleanRef = ref.trim();
      localStorage.setItem('refCode', cleanRef);
      sessionStorage.setItem('refCode', cleanRef);
    }
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <CurrencyProvider>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <CompareProvider>
                <BrowserRouter>
                  <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
                    <Header />
                  
                    <Toaster 
                      position="bottom-right"
                      toastOptions={{
                        style: {
                          background: '#1e293b',
                          color: '#fff',
                          border: '1px solid #334155',
                        },
                        success: {
                          iconTheme: { primary: '#10b981', secondary: '#fff' },
                        },
                      }}
                    />
                    
                    <main className="container mx-auto px-4 pt-6 flex-1">
                      <Suspense fallback={<PageFallback />}>
                        <Routes>
                          {/* Відкриті маршрути */}
                          <Route path="/" element={<Home />} />
                          <Route path="/resources" element={<Resources />} />
                          <Route path="/accounts" element={<Accounts />} />
                          <Route path="/accounts/:id" element={<AccountDetails />} />
                          <Route path="/other-items" element={<OtherItems />} />
                          {/* /sapphires → редирект на /other-items (SEO + UX) */}
                          <Route path="/sapphires" element={<Navigate to="/other-items" replace />} />
                          
                          <Route path="/reset-password" element={<ResetPassword />} />
                          
                          <Route path="/cart" element={<Cart />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/register" element={<Profile defaultRegister={true} />} />
                          <Route path="/topup" element={<TopUp />} />
                          
                          {/* Маршрут порівняння та оцінки */}
                          <Route path="/compare" element={<Compare />} /> 
                          
                          <Route path="/gems-builder" element={<GemsBuilder />} />
                          <Route path="/calculator" element={<Calculator />} />
                          
                          <Route path="/guarantees" element={<Guarantees />} />
                          <Route path="/terms" element={<Terms />} />
                          <Route path="/privacy" element={<Privacy />} />
                          <Route path="/easter-egg" element={<SHARINGAN />} />

                          {/* Закриті маршрути адмін-панелі */}
                          <Route path="/admin" element={
                            <AdminRoute>
                              <Admin />
                            </AdminRoute>
                          } />
                        </Routes>
                      </Suspense>
                    </main>
                    
                    <Footer />
                    <CookieConsent />
                  </div>
                </BrowserRouter>
              </CompareProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;