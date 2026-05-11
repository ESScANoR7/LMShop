import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';

// Імпорт всіх наших сторінок
import Home from './pages/Home';
import Resources from './pages/Resources';
import Accounts from './pages/Accounts';
import AccountDetails from './pages/AccountDetails';
import Cart from './pages/Cart';
import Profile from './pages/Profile';
import GemsBuilder from './pages/GemsBuilder';
import Admin from './pages/Admin'; // ІМПОРТ АДМІНКИ
import Sapphires from './pages/Sapphires'; // імпорт інших ціностей 
import Footer from './components/Footer'; // імпорт футер 
import Guarantees from './pages/Guarantees'; // імпорт гарантії та FAQ
import { Toaster } from 'react-hot-toast'; // імпорт Toasts
import EditAccount from './pages/EditAccount'; // імпорт редагування аку
import Calculator from './pages/Calculator'; // калькулятор 
import SHARINGAN from './pages/SHARINGAN'; // пасхалка

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950">
        <Header />
        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1e293b', // bg-slate-800
              color: '#fff',
              border: '1px solid #334155', // border-slate-700
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#fff' }, // emerald-500
            },
          }}
        />
        <main className="container mx-auto px-4 pt-6">
          
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/gems-builder" element={<GemsBuilder />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/accounts/:id" element={<AccountDetails />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin/edit-account/:id" element={<EditAccount />} />
            <Route path="/calculator" element={<Calculator />} />
            <Route path="/easter-egg" element={<SHARINGAN />} />

              {/* 3. ДОДАЛИ МАРШРУТ гарантії та FAQ */}
            <Route path="/guarantees" element={<Guarantees />} />

            {/* 2. ДОДАЛИ МАРШРУТ ДЛЯ АДМІН-ПАНЕЛІ */}
            <Route path="/admin" element={<Admin />} />
            
            <Route path="/sapphires" element={<Sapphires />} />
            
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;