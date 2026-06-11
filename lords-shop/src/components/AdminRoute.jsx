import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Lock, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminRoute = ({ children }) => {
  // 🔥 ДІСТАЄМО СТАН ЗАВАНТАЖЕННЯ 🔥
  const { isLoggedIn, user, isAuthLoading } = useAuth();
  const [adminPin, setAdminPin] = useState('');
  
  // 🔥 ЗМІНА ТУТ: Читаємо статус авторизації з sessionStorage 🔥
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('admin_authenticated') === 'true';
  });

  // 1. Поки перевіряємо localStorage - показуємо лоадер, а НЕ викидаємо юзера
  if (isAuthLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-400 font-bold">Перевірка доступу...</p>
      </div>
    );
  }

  // 2. Якщо точно не залогінений (після перевірки) — показуємо повідомлення
  if (!isLoggedIn) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <Lock className="w-24 h-24 text-amber-500 mb-6 animate-pulse drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
        <h1 className="text-3xl font-black text-white mb-2">Необхідна авторизація</h1>
        <p className="text-slate-400 max-w-md mb-8">Для доступу до адміністративної панелі необхідно спочатку увійти в систему.</p>
        <button
          onClick={() => window.location.href = '/profile'}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20"
        >
          Перейти до входу
        </button>
      </div>
    );
  }

  // Читаємо список адмінів з .env (переводимо все в нижній регістр для надійності)
  const adminUsernamesStr = import.meta.env.VITE_ADMIN_USERNAMES || "Admin";
  const allowedAdmins = adminUsernamesStr.split(',').map(name => name.trim().toLowerCase());

  const currentUsername = user?.username?.toLowerCase() || "";

  // 3. Якщо користувача немає в списку адмінів
  if (!allowedAdmins.includes(currentUsername)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <ShieldAlert className="w-24 h-24 text-rose-500 mb-6 animate-pulse drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]" />
        <h1 className="text-3xl font-black text-white mb-2">Доступ заборонено</h1>
        <p className="text-slate-400 max-w-md mb-8">Ця сторінка є закритою зоною. Доступ дозволено виключно адміністраторам проекту.</p>
        <button onClick={() => window.location.href = '/'} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20">
          Повернутися на головну
        </button>
      </div>
    );
  }

  // Читаємо секретний PIN з .env
  const SECRET_PIN = import.meta.env.VITE_ADMIN_PIN || "7777";

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (adminPin === SECRET_PIN) {
      setIsAuthenticated(true);
      // 🔥 ЗМІНА ТУТ: Зберігаємо успішний ввід у sessionStorage 🔥
      sessionStorage.setItem('admin_authenticated', 'true');
      toast.success("Вхід в адмін-панель дозволено!", { icon: '🔓' });
    } else {
      toast.error("Невірний PIN-код!");
      setAdminPin('');
    }
  };

  // 4. Подвійна перевірка: Запит PIN-коду
  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 animate-in fade-in zoom-in duration-300">
        <div className="bg-slate-900/80 border border-slate-700 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="w-20 h-20 bg-rose-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
            <Lock className="w-10 h-10 text-rose-500" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Секретний доступ</h2>
          <p className="text-sm text-slate-400 mb-8">Підтвердіть свою особу, ввівши PIN-код адміністратора.</p>
          
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <input 
              type="password" 
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              placeholder="****"
              maxLength={4}
              className="w-full bg-slate-950 border-2 border-slate-700 rounded-xl px-4 py-4 text-center text-3xl font-black text-white tracking-[1em] focus:border-rose-500 outline-none transition-colors placeholder:tracking-normal placeholder:text-slate-700"
              autoFocus
            />
            <button type="submit" className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(225,29,72,0.3)] hover:shadow-[0_0_20px_rgba(225,29,72,0.5)]">
              Увійти в панель <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Якщо всі перевірки пройдені — показуємо Адмінку
  return children;
};

export default AdminRoute;