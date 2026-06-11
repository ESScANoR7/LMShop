import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, User, ShoppingCart, Globe, Menu, X, Coins, Scale, LogOut } from 'lucide-react'; // 🔥 ДОДАЛИ LogOut
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCompare } from '../context/CompareContext';

const Header = () => {
  const { t, i18n } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const { cart = [] } = useCart() || {};
  const { isLoggedIn, user, logout } = useAuth();
  const { compareList = [] } = useCompare() || {};

  // ==========================================
  // 🕵️‍♂️ ЛОГІКА ПАСХАЛКИ (СЕКРЕТНІ КЛІКИ)
  // ==========================================
  const [clicks, setClicks] = useState(0);

  const handleSecretClick = () => {
    const newClicks = clicks + 1;
    setClicks(newClicks);

    if (newClicks >= 5) {
      setClicks(0);
      navigate('/easter-egg');
    }

    clearTimeout(window.secretTimeout);
    window.secretTimeout = setTimeout(() => {
      setClicks(0);
    }, 1000);
  };
  // ==========================================

  const changeLanguage = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
    navigate('/profile');
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-700/50">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        
        {/* Логотип */}
        <div className="flex items-center z-50">
          <span 
            onClick={handleSecretClick} 
            className="cursor-pointer text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 font-serif select-none pr-1"
          >
            LORDS
          </span>
          <Link to="/" className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 font-serif select-none hover:opacity-80 transition-opacity">
            SHOP
          </Link>
        </div>
        
        {/* Навігація (ДЛЯ ПК) */}
        <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-300">
          <Link to="/" className="hover:text-blue-400">{t('nav.home')}</Link>
          <Link to="/resources" className="hover:text-blue-400">{t('nav.resources')}</Link>
          <Link to="/sapphires" className="hover:text-blue-400">{t('nav.sapphires')}</Link>
          <Link to="/accounts" className="hover:text-blue-400">{t('nav.accounts')}</Link>
          <Link to="/calculator" className="text-slate-300 hover:text-white font-bold transition-colors">
            {t('nav.calculator')}
          </Link>
        </nav>
        
        {/* Права частина */}
        <div className="flex items-center gap-3 md:gap-5 z-50">
          
          {/* Пошук (Тільки ПК) */}
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder={t('header.search')} 
              className="bg-slate-800/50 border border-slate-600 text-sm rounded-full pl-10 pr-4 py-2 focus:outline-none focus:border-blue-500 text-white w-48 xl:w-64 transition-all" 
            />
          </div>

          {/* Перемикач мови */}
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg px-1 md:px-2 py-1">
            <Globe className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select 
              onChange={changeLanguage} 
              defaultValue={i18n.language}
              className="bg-transparent text-slate-300 text-xs md:text-sm focus:outline-none cursor-pointer appearance-none"
            >
              <option value="ua">UA</option>
              <option value="en">EN</option>
              <option value="de">DE</option>
            </select>
          </div>
          
          {/* Профіль, Порівняння та Кошик */}
          <div className="flex items-center gap-3 md:gap-4 text-slate-300">

             {/* ПРОФІЛЬ */}
             {isLoggedIn && user ? (
                <div className="flex items-center gap-2">
                  <Link to="/profile" className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border border-amber-500/30 rounded-xl hover:border-amber-400/60 transition-all shadow-[0_0_10px_rgba(245,158,11,0.05)] hover:shadow-[0_0_15px_rgba(245,158,11,0.15)] group">
                    <div className="flex flex-col items-end pr-2 border-r border-amber-500/20">
                      <span className="text-[10px] text-amber-500/80 font-bold uppercase">{user.username}</span>
                      <div className="text-sm font-black text-amber-400 flex items-center gap-1">
                        {user.balance?.toFixed(2) || "0.00"} <span className="text-[9px] text-amber-500/70">USDT</span>
                      </div>
                    </div>
                    <Coins className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="hidden sm:flex items-center justify-center w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/60 transition-all group"
                    title="Вийти"
                  >
                    <LogOut className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform" />
                  </button>
                </div>
             ) : (
                <Link to="/profile" className="hover:text-white flex flex-col items-center gap-1">
                    <User className="w-5 h-5 md:w-5 md:h-5" />
                    <span className="text-[10px] hidden sm:block">{t('header.profile')}</span>
                </Link>
             )}

             {/* 🔥 ІКОНКА ПОРІВНЯННЯ 🔥 */}
             <Link to="/compare" className="hover:text-white flex flex-col items-center gap-1 relative ml-1 sm:ml-0">
               <Scale className="w-5 h-5 md:w-5 md:h-5" />
               <span className="text-[10px] hidden sm:block">Порівняти</span>
               {compareList?.length > 0 && (
                 <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                     {compareList?.length}
                 </span>
               )}
             </Link>
             
             {/* КОШИК */}
            <Link to="/cart" className="hover:text-white flex flex-col items-center gap-1 relative ml-1 sm:ml-0">
               <ShoppingCart className="w-5 h-5 md:w-5 md:h-5" />
                 <span className="text-[10px] hidden sm:block">{t('header.cart')}</span>
                 {cart?.length > 0 && (
                 <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                     {cart?.length}
                  </span>
               )}
            </Link>
          </div>

          {/* Кнопка БУРГЕР (ТІЛЬКИ ДЛЯ МОБІЛОК) */}
          <button 
            className="md:hidden text-slate-300 hover:text-white ml-1"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
          </button>
        </div>
      </div>

      {/* ВИПАДАЮЧЕ МЕНЮ (ДЛЯ МОБІЛОК) */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-slate-900 border-b border-slate-700 p-4 flex flex-col gap-4 shadow-xl z-40">
          
          {/* МОБІЛЬНИЙ БЛОК БАЛАНСУ (ЯКЩО ЗАЛОГІНЕНИЙ) */}
          {isLoggedIn && user && (
             <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border border-amber-500/30 rounded-xl">
               <Link to="/profile" onClick={closeMobileMenu} className="flex items-center gap-3 flex-1">
                 <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                   <Coins className="w-5 h-5 text-amber-400" />
                 </div>
                 <div>
                   <div className="text-xs text-amber-500/80 font-bold uppercase">{user.username}</div>
                   <div className="text-slate-300 text-[10px]">Мій Кешбек</div>
                 </div>
               </Link>
               <div className="flex items-center gap-3">
                 <div className="text-right">
                   <div className="text-lg font-black text-amber-400">${user.balance?.toFixed(2) || "0.00"}</div>
                 </div>
                 <button
                   onClick={handleLogout}
                   className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-all"
                   title="Вийти"
                 >
                   <LogOut className="w-4 h-4 text-red-400" />
                 </button>
               </div>
             </div>
          )}
          {/* ЯКЩО ГІСТЬ */}
          {!isLoggedIn && (
             <Link to="/profile" onClick={closeMobileMenu} className="flex items-center gap-3 p-3 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-800">
               <User className="w-5 h-5" /> 
               <span className="font-medium">Увійти в кабінет</span>
             </Link>
          )}

          {/* 🔥 МОБІЛЬНА КНОПКА ПОРІВНЯННЯ 🔥 */}
          <Link to="/compare" onClick={closeMobileMenu} className="flex items-center justify-between p-3 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-800">
            <div className="flex items-center gap-3">
              <Scale className="w-5 h-5 text-blue-400" />
              <span className="font-medium">Порівняння акаунтів</span>
            </div>
            {compareList?.length > 0 && (
              <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{compareList.length}</span>
            )}
          </Link>

          <Link to="/" onClick={closeMobileMenu} className="text-lg font-medium text-slate-200 hover:text-blue-400 p-2 border-b border-slate-800">{t('nav.home')}</Link>
          <Link to="/resources" onClick={closeMobileMenu} className="text-lg font-medium text-slate-200 hover:text-blue-400 p-2 border-b border-slate-800">{t('nav.resources')}</Link>
          <Link to="/sapphires" onClick={closeMobileMenu} className="text-lg font-medium text-slate-200 hover:text-blue-400 p-2 border-b border-slate-800">{t('nav.sapphires')}</Link>
          <Link to="/accounts" onClick={closeMobileMenu} className="text-lg font-medium text-slate-200 hover:text-blue-400 p-2 border-b border-slate-800">{t('nav.accounts')}</Link>
          <Link to="/calculator" onClick={closeMobileMenu} className="text-lg font-medium text-slate-200 hover:text-blue-400 p-2 border-b border-slate-800">{t('nav.calculator')}</Link>
          
          <div className="relative w-full mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder={t('header.search')} 
              className="w-full bg-slate-800 border border-slate-600 text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-blue-500 text-white" 
            />
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;