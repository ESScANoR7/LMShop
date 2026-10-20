import { getImageUrl } from '../config/api';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, User, ShoppingCart, Globe, Menu, X, Coins, Scale, LogOut, ChevronDown, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCompare } from '../context/CompareContext';
import { useTheme, THEMES } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';

const Header = () => {
  const { t, i18n } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isCurrMenuOpen, setIsCurrMenuOpen] = useState(false);
  const currMenuRef = useRef(null);
  const { currency, setCurrency } = useCurrency();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const themeMenuRef = useRef(null);
  const langMenuRef = useRef(null);
  const navigate = useNavigate();

  const { cart = [] } = useCart() || {};
  const { isLoggedIn, user, logout } = useAuth();
  const { compareList = [] } = useCompare() || {};
  const { theme, setTheme, themes } = useTheme();

  const availableThemes = themes || THEMES;
  const currentThemeObj = availableThemes.find(t => t.id === theme) || availableThemes[0];
  const getThemeLabel = (tObj) => ({
    name: t(`themes.${tObj.id}.name`, tObj.name),
    desc: t(`themes.${tObj.id}.desc`, tObj.desc),
  });
  const currentThemeLabel = getThemeLabel(currentThemeObj);

  const languages = [
    { code: 'ua', label: 'UA', name: 'Українська' },
    { code: 'en', label: 'EN', name: 'English' },
    { code: 'de', label: 'DE', name: 'Deutsch' },
  ];
  const currentLang = (i18n.language || 'ua').toLowerCase().startsWith('en')
    ? 'en'
    : (i18n.language || 'ua').toLowerCase().startsWith('de')
    ? 'de'
    : 'ua';
  const currentLangObj = languages.find(l => l.code === currentLang) || languages[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target)) {
        setIsThemeMenuOpen(false);
      }
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setIsLangMenuOpen(false);
      }
      if (currMenuRef.current && !currMenuRef.current.contains(e.target)) {
        setIsCurrMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    if (isThemeMenuOpen || isSearchOpen || isLangMenuOpen || isCurrMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isThemeMenuOpen, isSearchOpen, isLangMenuOpen, isCurrMenuOpen]);

  // ==========================================
  // 🔍 ЛОГІКА ПОШУКУ
  // ==========================================
  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    // Ключові слова → сторінки
    const qLower = q.toLowerCase();
    const accountKeywords = ['акаунт', 'account', 'acc', 'аккаунт', 'акк', 'перс'];
    const resourceKeywords = ['ресурс', 'resource', 'rss', 'res', 'дерево', 'їжа', 'камінь', 'залізо', 'food', 'wood', 'stone'];
    const gemsKeywords = ['самоцвіт', 'gem', 'gems', 'jewel', 'кристал'];
    const otherKeywords = ['інше', 'other', 'oth', 'предмет', 'item', 'пакет', 'bundle'];

    let targetPage = '/accounts'; // default — акаунти
    if (resourceKeywords.some(kw => qLower.includes(kw))) targetPage = '/resources';
    else if (gemsKeywords.some(kw => qLower.includes(kw))) targetPage = '/accounts'; // gems поки в accounts
    else if (otherKeywords.some(kw => qLower.includes(kw))) targetPage = '/other-items';
    else if (accountKeywords.some(kw => qLower.includes(kw))) targetPage = '/accounts';

    navigate(`${targetPage}?search=${encodeURIComponent(q)}`);
    setSearchQuery('');
    setIsSearchOpen(false);
    setIsMobileMenuOpen(false);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch(e);
    if (e.key === 'Escape') { setIsSearchOpen(false); setSearchQuery(''); }
  };
  // ==========================================

  // ==========================================
  // 🕵️‍♂️ ЛОГІКА ПАСХАЛКИ (7 СЕКРЕТНИХ КЛІКІВ НА "Lord")
  // ==========================================
  const [clicks, setClicks] = useState(0);

  const handleSecretClick = () => {
    const newClicks = clicks + 1;
    setClicks(newClicks);

    if (newClicks >= 7) {
      setClicks(0);
      navigate('/easter-egg');
    }

    clearTimeout(window.secretTimeout);
    window.secretTimeout = setTimeout(() => {
      setClicks(0);
    }, 1500);
  };
  // ==========================================

  const changeLanguage = (e) => {
    const newLang = e.target.value;
    i18n.changeLanguage(newLang);
    localStorage.setItem('i18nextLng', newLang);
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
    <header className="lords-header sticky top-0 z-50 w-full shadow-sm">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        
        {/* Логотип — тільки зображення */}
        <Link to="/" className="flex-shrink-0 z-50 hover:opacity-90 transition-opacity hover:scale-105 duration-150">
          <img
            src="/logo.png"
            alt="LordTreasury"
            className="h-12 w-12 md:h-14 md:w-14 object-contain select-none"
            style={{ filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.4))' }}
          />
        </Link>
        
        {/* Навігація (ДЛЯ ПК) */}
        <nav className="hidden md:flex gap-6 text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
          <Link to="/" className="lords-nav-link">{t('nav.home')}</Link>
          <Link to="/resources" className="lords-nav-link">{t('nav.resources')}</Link>
          <Link to="/other-items" className="lords-nav-link">{t('nav.otherItems')}</Link>
          <Link to="/accounts" className="lords-nav-link">{t('nav.accounts')}</Link>
          
          {/* 🔥 КАЛЬКУЛЯТОР (ТИМЧАСОВО ПРИХОВАНО) 🔥 */}
          {false && (
            <Link to="/calculator" className="lords-nav-link">
              {t('nav.calculator')}
            </Link>
          )}
        </nav>
        
        {/* Права частина */}
        <div className="flex items-center gap-1 sm:gap-2.5 md:gap-4 z-50">
          
          {/* Пошук (Тільки ПК) */}
          <div className="relative hidden lg:block" ref={searchRef}>
            <form onSubmit={handleSearch}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 z-10 cursor-pointer" style={{ color: 'var(--text-secondary)' }} onClick={() => { setIsSearchOpen(true); searchInputRef.current?.focus(); }} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => setIsSearchOpen(true)}
                placeholder={t('header.search')}
                className="lords-input text-sm pl-10 pr-4 py-2 w-48 xl:w-64 transition-all"
              />
            </form>
          </div>

          {/* Theme Switcher */}
          <div className="relative" ref={themeMenuRef}>
            <button
              onClick={() => {
                setIsThemeMenuOpen(prev => !prev);
                setIsMobileMenuOpen(false);
              }}
              className="theme-toggle-btn group relative"
              title={t('themes.buttonTitle', { name: currentThemeLabel.name, defaultValue: `Тема: ${currentThemeLabel.name}. Натисніть для вибору` })}
            >
              <span className="group-hover:scale-110 transition-transform">{currentThemeObj.icon}</span>
            </button>

            {isThemeMenuOpen && (
              <div
                className="absolute left-1/2 -translate-x-1/2 top-11 w-44 rounded-2xl p-1.5 shadow-2xl backdrop-blur-xl border z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150"
                style={{
                  background: 'var(--bg-card)',
                  borderColor: 'var(--border-default)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                }}
              >
                <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider flex items-center justify-between" style={{ color: 'var(--text-secondary)' }}>
                  <span>{t('themes.title', 'Тема')}</span>
                  <span className="text-[9px] opacity-70">4</span>
                </div>
                {availableThemes.map(tObj => {
                  const isActive = (theme || 'blue') === tObj.id;
                  const label = getThemeLabel(tObj);
                  return (
                    <button
                      key={tObj.id}
                      onClick={() => {
                        setTheme(tObj.id);
                        setIsThemeMenuOpen(false);
                      }}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all text-left group"
                      style={isActive ? {
                        background: 'var(--accent-muted)',
                        color: 'var(--text-accent)',
                        border: '1px solid var(--border-accent)'
                      } : {
                        color: 'var(--text-primary)',
                        border: '1px solid transparent'
                      }}
                      onMouseEnter={e => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'var(--bg-card-hover)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm group-hover:scale-110 transition-transform flex-shrink-0">{tObj.icon}</span>
                        <div className="min-w-0">
                          <div className="font-bold text-xs truncate leading-tight">{label.name}</div>
                          <div className="text-[9px] opacity-60 font-medium truncate leading-tight">{label.desc}</div>
                        </div>
                      </div>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full shadow-sm flex-shrink-0 ml-1.5" style={{ background: 'var(--text-accent)' }} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Перемикач мови (Кастомне стильне меню без системних артефактів) */}
          <div className="relative" ref={langMenuRef}>
            <button
              type="button"
              onClick={() => {
                setIsLangMenuOpen(prev => !prev);
                setIsThemeMenuOpen(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-sm group"
              style={{
                background: 'var(--bg-card)',
                borderColor: isLangMenuOpen ? 'var(--border-accent, rgba(245,158,11,0.5))' : 'var(--border-default)',
                color: 'var(--text-primary)',
              }}
              title={t('header.language', 'Мова')}
            >
              <Globe className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-secondary)' }} />
              <span className="font-black text-xs tracking-wider" style={{ color: 'var(--text-primary)' }}>
                {currentLangObj.label}
              </span>
              <ChevronDown
                className={`w-3 h-3 transition-transform duration-200 opacity-60 group-hover:opacity-100 ${isLangMenuOpen ? 'rotate-180' : ''}`}
                style={{ color: 'var(--text-secondary)' }}
              />
            </button>

            {isLangMenuOpen && (
              <div
                className="absolute right-0 top-11 w-44 rounded-2xl p-1.5 shadow-2xl backdrop-blur-xl border z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150"
                style={{
                  background: 'var(--bg-card, #09090b)',
                  borderColor: 'var(--border-default, #27272a)',
                  boxShadow: '0 15px 35px rgba(0,0,0,0.6)',
                }}
              >
                <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider flex items-center justify-between" style={{ color: 'var(--text-secondary)' }}>
                  <span>{t('header.language', 'Мова')}</span>
                  <Globe className="w-3 h-3 opacity-60" />
                </div>
                {languages.map((l) => {
                  const isActive = currentLang === l.code;
                  return (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        i18n.changeLanguage(l.code);
                        localStorage.setItem('i18nextLng', l.code);
                        setIsLangMenuOpen(false);
                      }}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left group"
                      style={isActive ? {
                        background: 'var(--accent-muted, rgba(220,38,38,0.15))',
                        color: 'var(--text-accent, #ef4444)',
                        border: '1px solid var(--border-accent, rgba(220,38,38,0.3))'
                      } : {
                        color: 'var(--text-primary, #e4e4e7)',
                        border: '1px solid transparent'
                      }}
                      onMouseEnter={e => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'var(--bg-card-hover, rgba(255,255,255,0.06))';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <span className="font-bold text-xs">{l.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black opacity-50 tracking-wider">{l.label}</span>
                        {isActive && (
                          <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-accent, #ef4444)' }} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Перемикач валюти ($ / ₴ без зайвих написів) */}
          <div className="relative" ref={currMenuRef}>
            <button
              type="button"
              onClick={() => {
                setIsCurrMenuOpen(prev => !prev);
                setIsLangMenuOpen(false);
                setIsThemeMenuOpen(false);
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-sm font-black font-mono transition-all border shadow-sm group hover:scale-105 active:scale-95"
              style={{
                background: 'var(--bg-card)',
                borderColor: isCurrMenuOpen ? 'var(--border-accent, rgba(245,158,11,0.5))' : 'var(--border-default)',
                color: currency === 'UAH' ? 'var(--gold, #f59e0b)' : 'var(--text-accent, #ef4444)',
              }}
              title="Валюта сайту / Currency"
            >
              {currency === 'UAH' ? '₴' : '$'}
            </button>

            {isCurrMenuOpen && (
              <div
                className="absolute right-0 top-11 w-44 rounded-2xl p-1.5 shadow-2xl backdrop-blur-xl border z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150"
                style={{
                  background: 'var(--bg-card, #09090b)',
                  borderColor: 'var(--border-default, #27272a)',
                  boxShadow: '0 15px 35px rgba(0,0,0,0.6)',
                }}
              >
                <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider flex items-center justify-between" style={{ color: 'var(--text-secondary)' }}>
                  <span>{t('nav.currency', 'Валюта')}</span>
                  <Coins className="w-3 h-3 text-amber-400 opacity-80" />
                </div>
                {[
                  { code: 'USD', symbol: '$', label: 'Дол', full: 'Долар (USD)' },
                  { code: 'UAH', symbol: '₴', label: 'Грн', full: 'Гривня (UAH)' }
                ].map((c) => {
                  const isActive = currency === c.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setCurrency(c.code);
                        setIsCurrMenuOpen(false);
                      }}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left group"
                      style={isActive ? {
                        background: 'var(--accent-muted, rgba(220,38,38,0.15))',
                        color: 'var(--text-accent, #ef4444)',
                        border: '1px solid var(--border-accent, rgba(220,38,38,0.3))'
                      } : {
                        color: 'var(--text-primary, #e4e4e7)',
                        border: '1px solid transparent'
                      }}
                      onMouseEnter={e => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'var(--bg-card-hover, rgba(255,255,255,0.06))';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-amber-400">{c.symbol}</span>
                        <span className="font-bold text-xs">{c.full}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black opacity-50 tracking-wider">{c.label}</span>
                        {isActive && (
                          <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-accent, #ef4444)' }} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Профіль, Порівняння та Кошик */}
          <div className="flex items-center gap-3 md:gap-4" style={{ color: 'var(--text-secondary)' }}>

             {/* ПРОФІЛЬ */}
             {isLoggedIn && user ? (
                <div className="flex items-center gap-2">
                  <Link
                    to="/profile"
                    className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all group"
                    style={{
                      background: 'var(--gold-muted)',
                      border: '1px solid rgba(245,158,11,0.3)',
                    }}
                  >
                    <div className="flex flex-col items-end pr-2" style={{ borderRight: '1px solid rgba(245,158,11,0.2)' }}>
                      <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--gold)' }}>{user.username}</span>
                      <div className="text-sm font-black flex items-center gap-1" style={{ color: 'var(--gold)' }}>
                        {user.balance?.toFixed(2) || "0.00"} <span className="text-[9px] opacity-70">USDT</span>
                      </div>
                    </div>
                    {user?.avatar ? (
                      <img src={getImageUrl(user.avatar)} alt="" className="w-6 h-6 rounded-lg object-cover border border-amber-500/40" />
                    ) : (
                      <Coins className="w-5 h-5 group-hover:scale-110 transition-transform" style={{ color: 'var(--gold)' }} />
                    )}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="hidden sm:flex items-center justify-center w-10 h-10 rounded-xl transition-all group"
                    style={{
                      background: 'var(--danger-muted)',
                      border: '1px solid rgba(239,68,68,0.3)',
                    }}
                    title="Вийти"
                  >
                    <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform drop-shadow-md" style={{ color: 'var(--danger)' }} />
                  </button>
                </div>
             ) : (
                <Link
                  to="/profile"
                  className="transition-colors flex flex-col items-center gap-1"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                >
                    <User className="w-5 h-5 md:w-5 md:h-5" />
                    <span className="text-[10px] hidden sm:block font-bold">{t('header.profile')}</span>
                </Link>
             )}

              {/* 🔥 ІКОНКА ПОРІВНЯННЯ 🔥 */}
              <Link
                to="/compare"
                className="transition-colors flex flex-col items-center gap-1 relative ml-1 sm:ml-0"
                title="Порівняння акаунтів"
                style={{ color: 'var(--gold)' }}
              >
                <Scale className="w-5 h-5 md:w-5 md:h-5" />
                <span className="text-[10px] hidden sm:block font-bold">Порівняти</span>
                {compareList?.length > 0 && (
                  <span
                    className="absolute -top-2 -right-2 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center"
                    style={{
                      background: 'var(--gold)',
                      color: '#0d1117',
                      boxShadow: '0 0 10px var(--accent-glow)',
                    }}
                  >
                      {compareList?.length}
                  </span>
                )}
              </Link>
             
             {/* КОШИК */}
            <Link
              to="/cart"
              className="transition-colors flex flex-col items-center gap-1 relative ml-1 sm:ml-0"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
               <ShoppingCart className="w-5 h-5 md:w-5 md:h-5" />
                 <span className="text-[10px] hidden sm:block font-bold">{t('header.cart')}</span>
                 {cart?.length > 0 && (
                 <span
                   className="absolute -top-2 -right-2 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center text-white"
                   style={{
                     background: 'var(--accent)',
                     boxShadow: '0 0 10px var(--accent-glow)',
                   }}
                 >
                     {cart?.length}
                  </span>
              )}
            </Link>
          </div>

          {/* Кнопка БУРГЕР (ТІЛЬКИ ДЛЯ МОБІЛОК) */}
          <button
            className="md:hidden ml-1 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onClick={() => {
              setIsMobileMenuOpen(!isMobileMenuOpen);
              setIsThemeMenuOpen(false);
            }}
          >
            {isMobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
          </button>
        </div>
      </div>

      {/* ВИПАДАЮЧЕ МЕНЮ (ДЛЯ МОБІЛОК) */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden absolute top-20 left-0 w-full p-4 flex flex-col gap-4 shadow-xl z-40"
          style={{
            background: 'var(--bg-base)',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          
          {/* МОБІЛЬНИЙ БЛОК БАЛАНСУ (ЯКЩО ЗАЛОГІНЕНИЙ) */}
          {isLoggedIn && user && (
             <div
               className="flex items-center justify-between p-4 rounded-2xl shadow-inner"
               style={{
                 background: 'var(--gold-muted)',
                 border: '1px solid rgba(245,158,11,0.3)',
               }}
             >
               <Link to="/profile" onClick={closeMobileMenu} className="flex items-center gap-3 flex-1">
                 <div
                   className="w-10 h-10 rounded-full flex items-center justify-center"
                   style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.3)' }}
                 >
                   <Coins className="w-5 h-5" style={{ color: 'var(--gold)' }} />
                 </div>
                 <div>
                   <div className="text-xs font-bold uppercase" style={{ color: 'var(--gold)' }}>{user.username}</div>
                   <div className="text-[10px] font-bold" style={{ color: 'var(--text-secondary)' }}>Мій Кабінет</div>
                 </div>
               </Link>
               <div className="flex items-center gap-3">
                 <div className="text-right">
                   <div className="text-lg font-black" style={{ color: 'var(--gold)' }}>${user.balance?.toFixed(2) || "0.00"}</div>
                 </div>
                 <button
                   onClick={handleLogout}
                   className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
                   style={{
                     background: 'var(--danger-muted)',
                     border: '1px solid rgba(239,68,68,0.3)',
                   }}
                   title="Вийти"
                 >
                   <LogOut className="w-4 h-4" style={{ color: 'var(--danger)' }} />
                 </button>
               </div>
             </div>
          )}
          {/* ЯКЩО ГІСТЬ */}
          {!isLoggedIn && (
             <Link
               to="/profile"
               onClick={closeMobileMenu}
               className="flex items-center gap-3 p-3 rounded-xl font-bold transition-all"
               style={{
                 color: 'var(--text-primary)',
                 border: '1px solid var(--border-default)',
                 background: 'var(--bg-card)',
               }}
             >
               <User className="w-5 h-5" style={{ color: 'var(--accent)' }} />
               <span>{t('nav.login', 'Увійти в кабінет')}</span>
             </Link>
          )}

          {/* 🔥 МОБІЛЬНА КНОПКА ПОРІВНЯННЯ 🔥 */}
          <Link
            to="/compare"
            onClick={closeMobileMenu}
            className="flex items-center justify-between p-3 rounded-xl font-bold transition-all"
            style={{
              background: 'var(--gold-muted)',
              border: '1px solid rgba(245,158,11,0.35)',
              color: 'var(--gold)',
            }}
          >
            <div className="flex items-center gap-3">
              <Scale className="w-5 h-5" style={{ color: 'var(--gold)' }} />
              <span>{t('nav.compare', 'Порівняння акаунтів')}</span>
            </div>
            {compareList?.length > 0 && (
              <span
                className="text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{ background: 'var(--gold)', color: '#0d1117' }}
              >
                {compareList.length}
              </span>
            )}
          </Link>

          <Link
            to="/"
            onClick={closeMobileMenu}
            className="text-lg font-bold p-2 transition-colors"
            style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-default)' }}
          >
            {t('nav.home')}
          </Link>
          <Link
            to="/resources"
            onClick={closeMobileMenu}
            className="text-lg font-bold p-2 transition-colors"
            style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-default)' }}
          >
            {t('nav.resources')}
          </Link>
          <Link
            to="/other-items"
            onClick={closeMobileMenu}
            className="text-lg font-bold p-2 transition-colors"
            style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-default)' }}
          >
            {t('nav.otherItems')}
          </Link>
          <Link
            to="/accounts"
            onClick={closeMobileMenu}
            className="text-lg font-bold p-2 transition-colors"
            style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-default)' }}
          >
            {t('nav.accounts')}
          </Link>


          {/* Мобільний вибір мови */}
          <div
            className="flex items-center justify-between p-2 text-sm"
            style={{ borderBottom: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
          >
            <span className="font-bold flex items-center gap-2">
              <Globe className="w-4 h-4" style={{ color: 'var(--gold)' }} />
              <span>{t('header.language', 'Мова')}</span>
            </span>
            <div className="flex gap-1.5">
              {languages.map((l) => {
                const isActive = currentLang === l.code;
                return (
                  <button
                    key={l.code}
                    onClick={() => {
                      i18n.changeLanguage(l.code);
                      localStorage.setItem('i18nextLng', l.code);
                    }}
                    className="px-3 py-1 rounded-lg text-xs font-bold transition-all border"
                    style={isActive
                      ? {
                          background: 'var(--accent-muted, rgba(220,38,38,0.2))',
                          color: 'var(--text-accent, #ef4444)',
                          borderColor: 'var(--border-accent, rgba(220,38,38,0.4))'
                        }
                      : {
                          background: 'var(--bg-card)',
                          color: 'var(--text-secondary)',
                          borderColor: 'var(--border-default)'
                        }
                    }
                  >
                    <span>{l.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Мобільний вибір валюти ($ Дол / ₴ Грн) */}
          <div
            className="flex items-center justify-between p-2 text-sm"
            style={{ borderBottom: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
          >
            <span className="font-bold flex items-center gap-2">
              <Coins className="w-4 h-4" style={{ color: 'var(--gold)' }} />
              <span>{t('nav.currency', 'Валюта')}</span>
            </span>
            <div className="flex gap-1.5">
              {[
                { code: 'USD', symbol: '$', label: 'Дол' },
                { code: 'UAH', symbol: '₴', label: 'Грн' }
              ].map((c) => {
                const isActive = currency === c.code;
                return (
                  <button
                    key={c.code}
                    onClick={() => setCurrency(c.code)}
                    className="px-3 py-1 rounded-lg text-xs font-bold transition-all border flex items-center gap-1"
                    style={isActive
                      ? {
                          background: 'var(--accent-muted, rgba(220,38,38,0.2))',
                          color: 'var(--text-accent, #ef4444)',
                          borderColor: 'var(--border-accent, rgba(220,38,38,0.4))'
                        }
                      : {
                          background: 'var(--bg-card)',
                          color: 'var(--text-secondary)',
                          borderColor: 'var(--border-default)'
                        }
                    }
                  >
                    <span className="font-mono font-black text-amber-400">{c.symbol}</span>
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <form className="relative w-full mt-2" onSubmit={handleSearch}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={t('header.search')}
              className="lords-input w-full pl-10 pr-4 py-3 text-sm rounded-xl"
            />
          </form>
        </div>
      )}
    </header>
  );
};

export default Header;