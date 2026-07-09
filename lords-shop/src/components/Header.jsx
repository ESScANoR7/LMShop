import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, User, ShoppingCart, Globe, Menu, X, Coins, Scale, LogOut } from 'lucide-react'; 
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
    // 🔥 ФОН ШАПКИ: ZINC + ЧЕРВОНА ЛІНІЯ ЗНИЗУ 🔥
    <header className="sticky top-0 z-50 w-full bg-zinc-950/90 backdrop-blur-md border-b border-red-900/30 shadow-sm">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        
        {/* Логотип */}
        <div className="flex items-center z-50">
          <span 
            onClick={handleSecretClick} 
            className="cursor-pointer text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-500 font-serif select-none pr-1"
          >
            LORDS
          </span>
          <Link to="/" className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-500 font-serif select-none hover:opacity-80 transition-opacity drop-shadow-[0_0_10px_rgba(220,38,38,0.4)]">
            SHOP
          </Link>
        </div>
        
        {/* Навігація (ДЛЯ ПК) */}
        <nav className="hidden md:flex gap-6 text-sm font-bold text-zinc-300">
          <Link to="/" className="hover:text-amber-400 transition-colors">{t('nav.home')}</Link>
          <Link to="/resources" className="hover:text-amber-400 transition-colors">{t('nav.resources')}</Link>
          <Link to="/sapphires" className="hover:text-amber-400 transition-colors">{t('nav.sapphires')}</Link>
          <Link to="/accounts" className="hover:text-amber-400 transition-colors">{t('nav.accounts')}</Link>
          
          {/* 🔥 КАЛЬКУЛЯТОР (ТИМЧАСОВО ПРИХОВАНО) 🔥 */}
          {false && (
            <Link to="/calculator" className="text-zinc-300 hover:text-amber-400 font-bold transition-colors">
              {t('nav.calculator')}
            </Link>
          )}
        </nav>
        
        {/* Права частина */}
        <div className="flex items-center gap-3 md:gap-5 z-50">
          
          {/* Пошук (Тільки ПК) */}
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder={t('header.search')} 
              className="bg-zinc-900 border border-zinc-800 text-sm rounded-full pl-10 pr-4 py-2 focus:outline-none focus:border-red-500/50 text-white w-48 xl:w-64 transition-all shadow-inner" 
            />
          </div>

          {/* Перемикач мови */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg px-1 md:px-2 py-1 hover:border-red-900/50 transition-colors">
            <Globe className="w-4 h-4 text-zinc-400 hidden sm:block" />
            <select 
              onChange={changeLanguage} 
              defaultValue={i18n.language}
              className="bg-transparent text-zinc-300 font-bold text-xs md:text-sm focus:outline-none cursor-pointer appearance-none"
            >
              <option value="ua" className="bg-zinc-900">UA</option>
              <option value="en" className="bg-zinc-900">EN</option>
              <option value="de" className="bg-zinc-900">DE</option>
            </select>
          </div>
          
          {/* Профіль, Порівняння та Кошик */}
          <div className="flex items-center gap-3 md:gap-4 text-zinc-300">

             {/* ПРОФІЛЬ */}
             {isLoggedIn && user ? (
                <div className="flex items-center gap-2">
                  <Link to="/profile" className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-500/10 to-red-500/5 border border-amber-500/30 rounded-xl hover:border-amber-400/60 transition-all shadow-[0_0_10px_rgba(245,158,11,0.05)] hover:shadow-[0_0_15px_rgba(245,158,11,0.15)] group">
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
                    className="hidden sm:flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/60 transition-all group"
                    title="Вийти"
                  >
                    <LogOut className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform drop-shadow-md" />
                  </button>
                </div>
             ) : (
                <Link to="/profile" className="hover:text-amber-400 transition-colors flex flex-col items-center gap-1">
                    <User className="w-5 h-5 md:w-5 md:h-5" />
                    <span className="text-[10px] hidden sm:block font-bold">{t('header.profile')}</span>
                </Link>
             )}

             {/* 🔥 ІКОНКА ПОРІВНЯННЯ (ТИМЧАСОВО ПРИХОВАНО) 🔥 */}
             {false && (
               <Link to="/compare" className="hover:text-amber-400 transition-colors flex flex-col items-center gap-1 relative ml-1 sm:ml-0">
                 <Scale className="w-5 h-5 md:w-5 md:h-5" />
                 <span className="text-[10px] hidden sm:block font-bold">Порівняти</span>
                 {compareList?.length > 0 && (
                   <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(220,38,38,0.5)]">
                       {compareList?.length}
                   </span>
                 )}
               </Link>
             )}
             
             {/* КОШИК */}
            <Link to="/cart" className="hover:text-amber-400 transition-colors flex flex-col items-center gap-1 relative ml-1 sm:ml-0">
               <ShoppingCart className="w-5 h-5 md:w-5 md:h-5" />
                 <span className="text-[10px] hidden sm:block font-bold">{t('header.cart')}</span>
                 {cart?.length > 0 && (
                 <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(220,38,38,0.6)]">
                     {cart?.length}
                  </span>
               )}
            </Link>
          </div>

          {/* Кнопка БУРГЕР (ТІЛЬКИ ДЛЯ МОБІЛОК) */}
          <button 
            className="md:hidden text-zinc-300 hover:text-amber-400 ml-1 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
          </button>
        </div>
      </div>

      {/* ВИПАДАЮЧЕ МЕНЮ (ДЛЯ МОБІЛОК) */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-zinc-950 border-b border-zinc-800 p-4 flex flex-col gap-4 shadow-xl z-40">
          
          {/* МОБІЛЬНИЙ БЛОК БАЛАНСУ (ЯКЩО ЗАЛОГІНЕНИЙ) */}
          {isLoggedIn && user && (
             <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-500/10 to-red-500/5 border border-amber-500/30 rounded-2xl shadow-inner">
               <Link to="/profile" onClick={closeMobileMenu} className="flex items-center gap-3 flex-1">
                 <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center border border-amber-500/30">
                   <Coins className="w-5 h-5 text-amber-400" />
                 </div>
                 <div>
                   <div className="text-xs text-amber-500/80 font-bold uppercase">{user.username}</div>
                   <div className="text-zinc-300 text-[10px] font-bold">Мій Кабінет</div>
                 </div>
               </Link>
               <div className="flex items-center gap-3">
                 <div className="text-right">
                   <div className="text-lg font-black text-amber-400">${user.balance?.toFixed(2) || "0.00"}</div>
                 </div>
                 <button
                   onClick={handleLogout}
                   className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 transition-all"
                   title="Вийти"
                 >
                   <LogOut className="w-4 h-4 text-red-400" />
                 </button>
               </div>
             </div>
          )}
          {/* ЯКЩО ГІСТЬ */}
          {!isLoggedIn && (
             <Link to="/profile" onClick={closeMobileMenu} className="flex items-center gap-3 p-3 border border-zinc-800 rounded-xl text-zinc-300 hover:bg-zinc-900 hover:border-red-900/50 transition-all font-bold">
               <User className="w-5 h-5 text-red-500" /> 
               <span>Увійти в кабінет</span>
             </Link>
          )}

          {/* 🔥 МОБІЛЬНА КНОПКА ПОРІВНЯННЯ (ТИМЧАСОВО ПРИХОВАНО) 🔥 */}
          {false && (
            <Link to="/compare" onClick={closeMobileMenu} className="flex items-center justify-between p-3 border border-zinc-800 rounded-xl text-zinc-300 hover:bg-zinc-900 transition-all font-bold">
              <div className="flex items-center gap-3">
                <Scale className="w-5 h-5 text-amber-500" />
                <span>Порівняння акаунтів</span>
              </div>
              {compareList?.length > 0 && (
                <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{compareList.length}</span>
              )}
            </Link>
          )}

          <Link to="/" onClick={closeMobileMenu} className="text-lg font-bold text-zinc-300 hover:text-amber-400 p-2 border-b border-zinc-800 transition-colors">{t('nav.home')}</Link>
          <Link to="/resources" onClick={closeMobileMenu} className="text-lg font-bold text-zinc-300 hover:text-amber-400 p-2 border-b border-zinc-800 transition-colors">{t('nav.resources')}</Link>
          <Link to="/sapphires" onClick={closeMobileMenu} className="text-lg font-bold text-zinc-300 hover:text-amber-400 p-2 border-b border-zinc-800 transition-colors">{t('nav.sapphires')}</Link>
          <Link to="/accounts" onClick={closeMobileMenu} className="text-lg font-bold text-zinc-300 hover:text-amber-400 p-2 border-b border-zinc-800 transition-colors">{t('nav.accounts')}</Link>
          
          {/* 🔥 МОБІЛЬНА НАВІГАЦІЯ КАЛЬКУЛЯТОРА (ТИМЧАСОВО ПРИХОВАНО) 🔥 */}
          {false && (
            <Link to="/calculator" onClick={closeMobileMenu} className="text-lg font-bold text-zinc-300 hover:text-amber-400 p-2 border-b border-zinc-800 transition-colors">{t('nav.calculator')}</Link>
          )}
          
          <div className="relative w-full mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder={t('header.search')} 
              className="w-full bg-zinc-900 border border-zinc-700 text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-red-500/50 text-white shadow-inner transition-colors" 
            />
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;