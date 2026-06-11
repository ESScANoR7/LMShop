import React from 'react';

// 📦 ОСНОВНІ БІБЛІОТЕКИ ТА РОУТИНГ
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// 🧠 ПРОВАЙДЕРИ СТАНУ (Context API)
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { CompareProvider } from './context/CompareContext';

// 🧩 ГЛОБАЛЬНІ КОМПОНЕНТИ (UI елементи)
import Header from './components/Header';
import Footer from './components/Footer';
import AdminRoute from './components/AdminRoute';
import ErrorBoundary from './components/ErrorBoundary'; 

// 🛍️ ОСНОВНІ СТОРІНКИ МАГАЗИНУ ТА ПРОФІЛЮ
import Home from './pages/Home';
import Resources from './pages/Resources';
import Accounts from './pages/Accounts';
import AccountDetails from './pages/AccountDetails';
import Cart from './pages/Cart';
import Profile from './pages/Profile';
import TopUp from './pages/TopUp';
import Compare from './pages/Compare'; // 🔥 ІМПОРТ СТОРІНКИ ПОРІВНЯННЯ

// 💎 ІНСТРУМЕНТИ ТА ДОДАТКОВІ ТОВАРИ
import GemsBuilder from './pages/GemsBuilder';
import Sapphires from './pages/Sapphires';
import Calculator from './pages/Calculator';

// 🛡️ ІНФО, АДМІНКА ТА ПАСХАЛКИ
import Guarantees from './pages/Guarantees';
import Admin from './pages/Admin';
import EditAccount from './pages/EditAccount';
import SHARINGAN from './pages/SHARINGAN';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <CompareProvider>
              <BrowserRouter>
                <div className="min-h-screen bg-slate-950 flex flex-col">
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
                  <Routes>
                    {/* Відкриті маршрути */}
                    <Route path="/" element={<Home />} />
                    <Route path="/resources" element={<Resources />} />
                    <Route path="/accounts" element={<Accounts />} />
                    <Route path="/accounts/:id" element={<AccountDetails />} />
                    <Route path="/sapphires" element={<Sapphires />} />
                    
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/topup" element={<TopUp />} />
                    
                    {/* 🔥 ДОДАНО МАРШРУТ ПОРІВНЯННЯ 🔥 */}
                    <Route path="/compare" element={<Compare />} /> 
                    
                    <Route path="/gems-builder" element={<GemsBuilder />} />
                    <Route path="/calculator" element={<Calculator />} />
                    
                    <Route path="/guarantees" element={<Guarantees />} />
                    <Route path="/easter-egg" element={<SHARINGAN />} />

                    {/* ЗАКРИТІ МАРШРУТИ АДМІН-ПАНЕЛІ */}
                    <Route path="/admin" element={
                      <AdminRoute>
                        <Admin />
                      </AdminRoute>
                    } />
                    
                    <Route path="/admin/edit-account/:id" element={
                      <AdminRoute>
                        <EditAccount />
                      </AdminRoute>
                    } />
                  </Routes>
                </main>
                
                  <Footer />
                </div>
              </BrowserRouter>
            </CompareProvider>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;