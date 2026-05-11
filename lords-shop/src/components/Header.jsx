import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // ДОДАНО: useNavigate для переходу на пасхалку
import { Search, User, ShoppingCart, Globe, Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext';

const Header = () => {
  const { t, i18n } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate(); // ДОДАНО: Хук навігації

  // ВИПРАВЛЕНО: Було cartItems, стало cart (та додано супер-захист)
  const { cart = [] } = useCart() || {};

 // ==========================================
  // 🕵️‍♂️ ЛОГІКА ПАСХАЛКИ (СЕКРЕТНІ КЛІКИ)
  // ==========================================
  const [clicks, setClicks] = useState(0);

  const handleSecretClick = () => {
    const newClicks = clicks + 1;
    setClicks(newClicks);
    
    console.log("Секретних кліків:", newClicks); // Тепер ти бачитимеш кліки в консолі браузера (F12)

    if (newClicks >= 5) { // Зменшили до 5 для тесту!
      setClicks(0); 
      navigate('/easter-egg');
    }

    clearTimeout(window.secretTimeout);
    window.secretTimeout = setTimeout(() => {
      setClicks(0);
    }, 1000); 
  };
  // ==========================================
  // ==========================================

  const changeLanguage = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-700/50">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        
        {/* Логотип (Розділений для пасхалки) */}
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
            🧮 Калькулятор
          </Link>
        </nav>
        
        {/* Права частина */}
        <div className="flex items-center gap-3 md:gap-6 z-50">
          
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
          
          {/* Профіль та Кошик */}
          <div className="flex gap-3 md:gap-4 text-slate-300">
             <Link to="/profile" className="hover:text-white flex flex-col items-center gap-1">
                 <User className="w-5 h-5 md:w-5 md:h-5" />
                 <span className="text-[10px] hidden sm:block">{t('header.profile')}</span>
             </Link>
             
            <Link to="/cart" className="hover:text-white flex flex-col items-center gap-1 relative">
               <ShoppingCart className="w-5 h-5 md:w-5 md:h-5" />
                 <span className="text-[10px] hidden sm:block">{t('header.cart')}</span>
                         {/* ВИПРАВЛЕНО: cart?.length */}
                        {cart?.length > 0 && (
                 <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                     {cart?.length}
                  </span>
               )}
            </Link>
          </div>

          {/* Кнопка БУРГЕР (ТІЛЬКИ ДЛЯ МОБІЛОК) */}
          <button 
            className="md:hidden text-slate-300 hover:text-white ml-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
          </button>
        </div>
      </div>

      {/* ВИПАДАЮЧЕ МЕНЮ (ДЛЯ МОБІЛОК) */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-slate-900 border-b border-slate-700 p-4 flex flex-col gap-4 shadow-xl z-40">
          <Link to="/" onClick={closeMobileMenu} className="text-lg font-medium text-slate-200 hover:text-blue-400 p-2 border-b border-slate-800">{t('nav.home')}</Link>
          <Link to="/resources" onClick={closeMobileMenu} className="text-lg font-medium text-slate-200 hover:text-blue-400 p-2 border-b border-slate-800">{t('nav.resources')}</Link>
          <Link to="/sapphires" onClick={closeMobileMenu} className="text-lg font-medium text-slate-200 hover:text-blue-400 p-2 border-b border-slate-800">{t('nav.sapphires')}</Link>
          <Link to="/accounts" onClick={closeMobileMenu} className="text-lg font-medium text-slate-200 hover:text-blue-400 p-2 border-b border-slate-800">{t('nav.accounts')}</Link>
          <Link to="/calculator" onClick={closeMobileMenu} className="text-lg font-medium text-slate-200 hover:text-blue-400 p-2 border-b border-slate-800">🧮 Калькулятор</Link>
          
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