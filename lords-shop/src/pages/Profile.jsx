import React, { useState, useEffect } from 'react';
import { User, Package, LogOut, KeyRound, Coins, Mail, Lock, Camera, Settings, Shield, CheckCircle2, XCircle, ArrowRight, Loader2, Clock, Check, ShieldCheck, Eye, EyeOff, Heart, CreditCard, Users, Bell, Gift, Smartphone, Send, Monitor, Copy, ChevronDown, ChevronUp, Plus, ShoppingCart, Trash2, CheckCheck, AlertTriangle, Menu, X, Truck, MessageCircle, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext'; 
import { useCart } from '../context/CartContext'; 
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const ValidationMessage = ({ value, minLength, isPasswordConfirm, matchValue, t }) => {
  if (!value) return null; 

  if (isPasswordConfirm) {
    if (value !== matchValue) {
      return (
        <div className="text-red-400 text-[11px] mt-1.5 flex items-center gap-1.5 font-bold animate-in fade-in slide-in-from-top-1">
          <XCircle className="w-3.5 h-3.5"/> {t('profile.validation.passMismatch', 'Паролі не співпадають')}
        </div>
      );
    } else {
      return (
        <div className="text-emerald-400 text-[11px] mt-1.5 flex items-center gap-1.5 font-bold animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 className="w-3.5 h-3.5"/> {t('profile.validation.passMatch', 'Паролі співпадають!')}
        </div>
      );
    }
  }

  if (value.length < minLength) {
    return (
      <div className="text-red-400 text-[11px] mt-1.5 flex items-center gap-1.5 font-bold animate-in fade-in slide-in-from-top-1">
        <XCircle className="w-3.5 h-3.5"/> {t('profile.validation.minChars', 'Мінімум символів')} {minLength} ({t('profile.validation.left', 'залишилось')} {minLength - value.length})
      </div>
    );
  }
  
  return (
    <div className="text-emerald-400 text-[11px] mt-1.5 flex items-center gap-1.5 font-bold animate-in fade-in slide-in-from-top-1">
      <CheckCircle2 className="w-3.5 h-3.5"/> {t('profile.validation.perfect', 'Відмінно!')}
    </div>
  );
};

const Profile = () => {
  const { t } = useTranslation(); 
  const { isLoggedIn, user, login, logout, updateBalance } = useAuth();
  const { wishlist, removeFromWishlist } = useWishlist(); 
  const { addToCart } = useCart(); 
  
  const [isLoginView, setIsLoginView] = useState(true);
  const [activeTab, setActiveTab] = useState('settings');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [profileForm, setProfileForm] = useState({ username: '', telegram: '', discord: '' });
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });

  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [showAuthConfirmPassword, setShowAuthConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const [rememberMe, setRememberMe] = useState(true);

  const [myOrders, setMyOrders] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [defaultPayment, setDefaultPayment] = useState(localStorage.getItem('defaultPayment') || 'crypto');

  const [notifications, setNotifications] = useState([]);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (user) setProfileForm(prev => ({ ...prev, username: user.username }));
  }, [user]);

  useEffect(() => {
    if (isLoggedIn && user?.id) {
      fetchUserData();
      fetchNotifications();
    }
  }, [isLoggedIn, user?.id, activeTab]); 

  useEffect(() => {
    if (isLoggedIn && activeTab === 'orders') {
      fetchMyOrders();
    }
  }, [isLoggedIn, activeTab, user]);

  const fetchUserData = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/users/${user.id}`);
      const data = await res.json();
      if (data.balance !== undefined && data.balance !== user.balance) {
        updateBalance(data.balance); 
      }
    } catch (err) { console.error(err); }
  };

  const fetchMyOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const response = await fetch('http://localhost:8000/api/orders', { credentials: 'include' });
      if (response.ok) {
        const allOrders = await response.json();
        setMyOrders(allOrders.filter(o => o.user_id === user.id));
      }
    } catch (error) {
      console.error("Помилка завантаження замовлень");
    }
    setIsLoadingOrders(false);
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/users/${user.id}/notifications`);
      if (res.ok) setNotifications(await res.json());
    } catch (e) { console.error("Помилка завантаження сповіщень"); }
  };

  // 🔥 ФУНКЦІЯ: КЛІЄНТ ПІДТВЕРДЖУЄ ДОСТАВКУ 🔥
  const handleConfirmDelivery = async (orderId) => {
    try {
      const res = await fetch(`http://localhost:8000/api/orders/${orderId}/confirm`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message || t('common.success', 'Успішно підтверджено!'));
        setMyOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'completed' } : o));
        fetchUserData();
      } else {
        toast.error(data.detail || t('common.error', 'Помилка'));
      }
    } catch (error) {
      toast.error(t('common.error', 'Виникла помилка. Спробуйте пізніше.'));
    }
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  const handleMobileTabClick = (tab) => { setActiveTab(tab); closeMobileMenu(); };
  const handleMobileLogout = () => { logout(); closeMobileMenu(); };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch(`http://localhost:8000/api/users/${user.id}/notifications/read`, { method: 'PUT' });
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      toast.success(t('common.success', 'Успішно'));
    } catch (e) { toast.error(t('common.error', 'Помилка')); }
  };

  const handleAuthChange = (e) => setAuthForm({ ...authForm, [e.target.name]: e.target.value.replace(/\s/g, '') });

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!isLoginView) {
      if (authForm.username.length < 5) return toast.error(t('common.error'));
      if (authForm.password.length < 6) return toast.error(t('common.error'));
      if (authForm.password !== authForm.confirmPassword) return toast.error(t('profile.validation.passMismatch'));
    }
    setIsLoading(true);
    try {
      if (isLoginView) {
        const res = await fetch('http://localhost:8000/api/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ username: authForm.username, password: authForm.password })
        });
        const data = await res.json();
        if (res.ok) {
          toast.success(`${t('profile.welcome', 'Вітаємо')}, ${data.username}!`);
          login({ id: data.user_id, username: data.username, balance: data.balance || 0, rememberMe: rememberMe });
        } else toast.error(data.detail || t('common.error'));
      } else {
        const res = await fetch('http://localhost:8000/api/register', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ username: authForm.username, email: authForm.email, password: authForm.password })
        });
        if (res.ok) {
          toast.success(t('common.success'), { duration: 4000, icon: '🎉' });
          setIsLoginView(true);
          setAuthForm({ username: authForm.username, email: '', password: '', confirmPassword: '' });
        } else toast.error(t('common.error'));
      }
    } catch (error) { toast.error(t('common.error')); } 
    finally { setIsLoading(false); }
  };

  const handleUpdateProfile = async (type) => {
    if (!user) return;
    setIsSaving(true);
    let updateData = {};
    
    if (type === 'username') {
      if (profileForm.username.length < 5) { toast.error(t('common.error')); setIsSaving(false); return; }
      if (profileForm.username === user.username) { toast("Нікнейм не змінився", { icon: "ℹ️" }); setIsSaving(false); return; }
      updateData = { username: profileForm.username };
    } 
    
    if (type === 'password') {
      if (passwordForm.newPassword.length < 6) { toast.error(t('common.error')); setIsSaving(false); return; }
      if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error(t('profile.validation.passMismatch')); setIsSaving(false); return; }
      updateData = { new_password: passwordForm.newPassword };
    }

    try {
      const res = await fetch(`http://localhost:8000/api/users/${user.id}/update`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updateData)
      });
      if (res.ok) {
        toast.success(t('common.success'));
        if (type === 'username') login({ ...user, username: profileForm.username });
        else setPasswordForm({ newPassword: '', confirmPassword: '' });
      } else toast.error(t('common.error'));
    } catch (error) { toast.error(t('common.error')); } 
    finally { setIsSaving(false); }
  };

  const copyToClipboard = (text) => { navigator.clipboard.writeText(text); toast.success(t('common.success'), { icon: '📋' }); };
  const handleSavePaymentMethod = (method) => { setDefaultPayment(method); localStorage.setItem('defaultPayment', method); toast.success(t('common.success')); };

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 max-w-md mx-auto min-h-[75vh]">
        <div className="w-20 h-20 bg-blue-900/30 text-blue-400 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-blue-900/20">
          <KeyRound className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">{isLoginView ? t('profile.login.title') : t('profile.register.title')}</h2>
        <div className="flex items-center justify-center gap-2 text-amber-400 bg-amber-900/20 px-4 py-2 rounded-xl border border-amber-500/20 mb-8 shadow-inner">
          <Coins className="w-4 h-4" /> <span className="text-sm font-bold">{t('profile.login.subtitle')}</span>
        </div>

        <form className="w-full bg-slate-800/50 border border-slate-700 p-6 rounded-3xl shadow-2xl" onSubmit={handleAuthSubmit}>
          <div className="mb-4 group">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              <input required name="username" value={authForm.username} onChange={handleAuthChange} placeholder={isLoginView ? t('profile.login.username') : t('profile.register.username')} className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-12 pr-4 py-3.5 text-white text-sm focus:border-blue-500 outline-none transition-all" />
            </div>
            {!isLoginView && <ValidationMessage value={authForm.username} minLength={5} t={t} />}
          </div>

          {!isLoginView && (
            <div className="mb-4 relative group animate-in fade-in slide-in-from-top-2 duration-300">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              <input required type="email" name="email" value={authForm.email} onChange={handleAuthChange} placeholder={t('profile.register.email')} className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-12 pr-4 py-3.5 text-white text-sm focus:border-blue-500 outline-none transition-all" />
            </div>
          )}

          <div className="mb-4 group">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              <input required type={showAuthPassword ? "text" : "password"} name="password" value={authForm.password} onChange={handleAuthChange} placeholder={t('profile.login.password')} className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-12 pr-12 py-3.5 text-white text-sm focus:border-blue-500 outline-none transition-all" />
              <button type="button" onClick={() => setShowAuthPassword(!showAuthPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-400 transition-colors">
                {showAuthPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {!isLoginView && <ValidationMessage value={authForm.password} minLength={6} t={t} />}
          </div>

          {!isLoginView && (
            <div className="mb-6 group animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="relative">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <input required type={showAuthConfirmPassword ? "text" : "password"} name="confirmPassword" value={authForm.confirmPassword} onChange={handleAuthChange} placeholder={t('profile.register.confirmPassword')} className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-12 pr-12 py-3.5 text-white text-sm focus:border-blue-500 outline-none transition-all" />
                <button type="button" onClick={() => setShowAuthConfirmPassword(!showAuthConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-400 transition-colors">
                  {showAuthConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <ValidationMessage value={authForm.confirmPassword} isPasswordConfirm matchValue={authForm.password} t={t} />
            </div>
          )}

          {isLoginView && (
            <div className="mb-6 mt-2 flex items-center justify-between animate-in fade-in">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200 ${rememberMe ? 'bg-blue-600 border-transparent shadow-[0_0_10px_rgba(37,99,235,0.3)]' : 'bg-slate-900 border border-slate-700 group-hover:border-blue-500'}`}>
                  {rememberMe && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
                <input type="checkbox" className="hidden" checked={rememberMe} onChange={() => setRememberMe(!rememberMe)} />
                <span className="text-sm font-medium text-slate-400 group-hover:text-slate-300 transition-colors">{t('profile.login.remember')}</span>
              </label>
              <button type="button" onClick={() => toast("Функція відновлення пароля скоро з'явиться!", { icon: '🛠️' })} className="text-sm text-blue-400 hover:text-blue-300 font-bold transition-colors">
                {t('profile.login.forgot')}
              </button>
            </div>
          )}

          <button disabled={isLoading} type="submit" className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:shadow-[0_0_25px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2">
            {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
            {!isLoading && (isLoginView ? t('profile.login.btn') : t('profile.register.btn'))}
          </button>

          <div className="mt-8 text-center text-sm text-slate-400 border-t border-slate-700/50 pt-6">
            {isLoginView ? t('profile.login.noAccount') + " " : t('profile.register.hasAccount') + " "}
            <button type="button" onClick={() => { setIsLoginView(!isLoginView); setAuthForm({ username: '', email: '', password: '', confirmPassword: '' }); setShowAuthPassword(false); setShowAuthConfirmPassword(false); }} className="text-blue-400 hover:text-blue-300 font-black tracking-wide transition-colors ml-1">
              {isLoginView ? t('profile.login.toRegister') : t('profile.register.toLogin')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // --- ВЕРСІЯ ДЛЯ АВТОРИЗОВАНИХ ---
  return (
    <div className="pb-20 pt-8 max-w-6xl mx-auto px-4 min-h-[80vh]">
      {/* МОБІЛЬНИЙ COMPACT HEADER */}
      <div className="lg:hidden mb-6 bg-slate-800/50 border border-slate-700 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              {user?.username?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-sm truncate">{user?.username}</div>
              <div className="text-xs text-amber-400 font-bold">{user?.balance?.toFixed(2) || "0.00"} USDT</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-lg hover:bg-slate-700 transition-colors text-slate-300 hover:text-white">
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <button onClick={handleMobileLogout} className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors text-red-400 hover:text-red-300">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="mt-4 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <button onClick={() => handleMobileTabClick('settings')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold text-left ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
              <Settings className="w-4 h-4 flex-shrink-0" /> {t('profile.tabs.settings', 'Особисті дані')}
            </button>
            <button onClick={() => handleMobileTabClick('security')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold text-left ${activeTab === 'security' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
              <Shield className="w-4 h-4 flex-shrink-0" /> {t('profile.tabs.security', 'Безпека')}
            </button>
            <button onClick={() => handleMobileTabClick('orders')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold text-left ${activeTab === 'orders' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
              <Package className="w-4 h-4 flex-shrink-0" /> {t('profile.tabs.orders', 'Мої замовлення')}
            </button>
            <button onClick={() => handleMobileTabClick('wishlist')} className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all text-sm font-bold ${activeTab === 'wishlist' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
              <div className="flex items-center gap-3"><Heart className="w-4 h-4 flex-shrink-0" /> {t('profile.tabs.wishlist', 'Улюблене')}</div>
              {wishlist.length > 0 && <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full text-xs">{wishlist.length}</span>}
            </button>
            <button onClick={() => handleMobileTabClick('payment')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold text-left ${activeTab === 'payment' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
              <CreditCard className="w-4 h-4 flex-shrink-0" /> {t('profile.tabs.payment', 'Оплата')}
            </button>
            <button onClick={() => handleMobileTabClick('referrals')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold text-left ${activeTab === 'referrals' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
              <Users className="w-4 h-4 flex-shrink-0" /> {t('profile.tabs.referrals', 'Реферали')}
            </button>
            <button onClick={() => handleMobileTabClick('notifications')} className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all text-sm font-bold ${activeTab === 'notifications' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
              <div className="flex items-center gap-3"><Bell className="w-4 h-4 flex-shrink-0" /> {t('profile.tabs.notifications', 'Сповіщення')}</div>
              {unreadCount > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.8)]"></span>}
            </button>
          </div>
        )}
      </div>

      {/* DESKTOP TITLE */}
      <div className="hidden lg:flex items-center gap-3 mb-8">
        <User className="w-8 h-8 text-blue-500" />
        <h1 className="text-3xl font-bold text-white">{t('profile.title')}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ЛІВА ПАНЕЛЬ: БІЧНЕ МЕНЮ (DESKTOP ONLY) */}
        <aside className="hidden lg:flex lg:col-span-3 flex-col gap-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-5 shadow-xl relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all"></div>
            <div className="flex items-center gap-4 mb-5 relative z-10">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg">
                {user?.username?.charAt(0) || 'U'}
              </div>
              <div>
                <div className="text-white font-bold text-lg truncate max-w-[120px]">{user?.username}</div>
                <div className="text-xs font-medium text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded border border-blue-500/30 inline-block mt-1">{t('profile.player')}</div>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-500/20 rounded-2xl relative overflow-hidden group">
              <div className="flex items-center justify-between mb-3 relative z-10">
                <div>
                  <div className="text-[10px] text-amber-500/80 font-bold uppercase tracking-widest mb-1">{t('profile.balance')}</div>
                  <div className="text-2xl font-black text-amber-400 flex items-center gap-1">
                    {user?.balance?.toFixed(2) || "0.00"}
                  </div>
                </div>
                <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                  <Coins className="w-5 h-5 text-amber-400" />
                </div>
              </div>
              <Link to="/topup" className="w-full py-2.5 bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/30 hover:border-amber-500 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all relative z-10 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                <Plus className="w-4 h-4" /> {t('profile.buyCoins')}
              </Link>
            </div>
          </div>

          <nav className="bg-slate-800/50 border border-slate-700 rounded-3xl p-3 shadow-xl flex flex-col gap-1">
            <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all text-sm font-bold ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <Settings className="w-5 h-5" /> {t('profile.tabs.settings')}
            </button>
            <button onClick={() => setActiveTab('security')} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all text-sm font-bold ${activeTab === 'security' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <Shield className="w-5 h-5" /> {t('profile.tabs.security')}
            </button>
            <button onClick={() => setActiveTab('orders')} className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all text-sm font-bold ${activeTab === 'orders' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <div className="flex items-center gap-3"><Package className="w-5 h-5" /> {t('profile.tabs.orders')}</div>
            </button>
            <button onClick={() => setActiveTab('wishlist')} className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all text-sm font-bold ${activeTab === 'wishlist' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <div className="flex items-center gap-3"><Heart className="w-5 h-5" /> {t('profile.tabs.wishlist')}</div>
              {wishlist.length > 0 && <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">{wishlist.length}</span>}
            </button>
            <button onClick={() => setActiveTab('payment')} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all text-sm font-bold ${activeTab === 'payment' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <CreditCard className="w-5 h-5" /> {t('profile.tabs.payment')}
            </button>
            <button onClick={() => setActiveTab('referrals')} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all text-sm font-bold ${activeTab === 'referrals' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <Users className="w-5 h-5" /> {t('profile.tabs.referrals')}
            </button>
            <button onClick={() => setActiveTab('notifications')} className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all text-sm font-bold ${activeTab === 'notifications' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <div className="flex items-center gap-3"><Bell className="w-5 h-5" /> {t('profile.tabs.notifications')}</div>
              {unreadCount > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.8)]"></span>}
            </button>
            
            <div className="mt-4 pt-2 border-t border-slate-700">
              <button onClick={logout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all">
                <LogOut className="w-4 h-4" /> {t('profile.tabs.logout')}
              </button>
            </div>
          </nav>
        </aside>

        {/* ПРАВА ПАНЕЛЬ: ВМІСТ ВКАЛОДОК */}
        <main className="lg:col-span-9">
          
          {/* === ВКЛАДКА: ОСОБИСТІ ДАНІ === */}
          {activeTab === 'settings' && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-4">{t('profile.settings.title')}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2"><User className="w-4 h-4 text-blue-400"/> {t('profile.settings.basicInfo')}</h3>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">{t('profile.settings.publicName')}</label>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <input value={profileForm.username} onChange={(e) => setProfileForm({...profileForm, username: e.target.value.replace(/\s/g, '')})} placeholder={t('profile.settings.minChars')} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3.5 text-white text-sm outline-none focus:border-blue-500 transition-colors" />
                        {profileForm.username !== user?.username && <ValidationMessage value={profileForm.username} minLength={5} t={t} />}
                      </div>
                      <button onClick={() => handleUpdateProfile('username')} disabled={isSaving || profileForm.username === user?.username || profileForm.username.length < 5} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg h-[48px]">
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5"/>}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2"><Send className="w-4 h-4 text-blue-400"/> {t('profile.settings.contacts')}</h3>
                 <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <label className="block text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">{t('profile.settings.tgBindTitle')}</label>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="flex-1 text-xs text-slate-500">
                        {t('profile.settings.tgBindDesc')}
                      </div>
                      <a 
                        /* 🔥 ТУТ ТРЕБА ВПИСАТИ ЮЗЕРНЕЙМ ТВОГО БОТА (замість YOUR_BOT_USERNAME) 🔥 */
                        href={`https://t.me/YOUR_BOT_USERNAME?start=${user?.id}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="w-full sm:w-auto px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                      >
                        <Send className="w-4 h-4" /> {t('profile.settings.bindBtn')}
                      </a>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">{t('profile.settings.discordId')}</label>
                    <input placeholder="user#1234" className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3.5 text-white text-sm outline-none focus:border-blue-500" />
                  </div>
                  <button className="w-full py-3 bg-slate-800 hover:bg-blue-600 border border-slate-700 text-white font-bold text-sm rounded-xl transition-colors">
                    {t('profile.settings.saveContacts')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* === ВКЛАДКА: БЕЗПЕКА ТА СЕСІЇ === */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-6 md:p-8 shadow-xl">
                <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-4">{t('profile.security.title')}</h2>
                <div className="max-w-md bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50 space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Shield className="w-5 h-5 text-blue-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">{t('profile.security.changePass')}</h3>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">{t('profile.security.newPass')}</label>
                    <div className="relative">
                      <input type={showNewPassword ? "text" : "password"} value={passwordForm.newPassword} onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})} placeholder={t('profile.settings.minChars')} className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-4 pr-12 py-3.5 text-white text-sm focus:border-blue-500 outline-none transition-colors" />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-400 transition-colors">
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <ValidationMessage value={passwordForm.newPassword} minLength={6} t={t} />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">{t('profile.security.confirmPass')}</label>
                    <div className="relative">
                      <input type={showConfirmNewPassword ? "text" : "password"} value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} placeholder={t('profile.security.confirmPass')} className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-4 pr-12 py-3.5 text-white text-sm focus:border-blue-500 outline-none transition-colors" />
                      <button type="button" onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-400 transition-colors">
                        {showConfirmNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <ValidationMessage value={passwordForm.confirmPassword} isPasswordConfirm matchValue={passwordForm.newPassword} t={t} />
                  </div>
                  
                  <button onClick={() => handleUpdateProfile('password')} disabled={isSaving || passwordForm.newPassword.length < 6 || passwordForm.newPassword !== passwordForm.confirmPassword} className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2">
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5"/>} {t('profile.security.updateSecurity')}
                  </button>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-6 md:p-8 shadow-xl">
                <div className="flex items-center justify-between mb-6 border-b border-slate-700 pb-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2"><Monitor className="w-5 h-5 text-blue-400"/> {t('profile.security.activeSessions')}</h2>
                  <button className="text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 rounded-lg hover:bg-red-500 hover:text-white transition-colors">
                    {t('profile.security.logoutOther')}
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-slate-900 border border-blue-500/30 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-900/30 rounded-full flex items-center justify-center text-blue-400"><Monitor className="w-5 h-5"/></div>
                      <div>
                        <div className="text-white font-bold text-sm flex items-center gap-2">Windows 11 • Chrome <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider">{t('profile.security.current')}</span></div>
                        <div className="text-xs text-slate-500 mt-1">Україна, Київ • IP: 192.168.1.1</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* === ВКЛАДКА: ДЕТАЛІЗОВАНІ ЗАМОВЛЕННЯ === */}
          {activeTab === 'orders' && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-4">{t('profile.orders.title', 'Моя історія покупок')}</h2>
              
              {isLoadingOrders ? (
                <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
              ) : myOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-700 rounded-3xl bg-slate-900/30">
                  <Package className="w-16 h-16 text-slate-600 mb-4" />
                  <h3 className="text-lg font-bold text-slate-300 mb-2">{t('profile.orders.empty', 'Тут поки порожньо')}</h3>
                  <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6">{t('profile.orders.emptyDesc', 'Ви ще нічого не замовляли.')}</p>
                  <Link to="/resources" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20">{t('profile.orders.toCatalog', 'До каталогу')}</Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {myOrders.map(order => {
                    const date = new Date(order.created_at).toLocaleDateString('uk-UA', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute:'2-digit' });
                    const isExpanded = expandedOrderId === order.id;

                    return (
                      <div key={order.id} className={`bg-slate-900 border ${order.status === 'delivered' ? 'border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'border-slate-700 hover:border-blue-500/50'} rounded-2xl overflow-hidden transition-all group`}>
                        <div 
                          className="p-5 flex flex-col md:flex-row gap-4 justify-between items-center cursor-pointer"
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        >
                          <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                              order.status === 'completed' ? 'bg-emerald-900/30 text-emerald-400' : 
                              order.status === 'delivered' ? 'bg-purple-900/30 text-purple-400' :
                              'bg-slate-800 text-slate-400 group-hover:text-blue-400'
                            }`}>
                              {order.status === 'delivered' ? <Truck className="w-6 h-6 animate-pulse" /> : <Package className="w-6 h-6" />}
                            </div>
                            <div>
                              <div className="text-white font-bold flex items-center gap-2 mb-1">
                                {t('profile.orders.orderNum', 'Замовлення #')}{order.id}
                                {order.status === 'completed' && <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-900/30 text-emerald-400 border border-emerald-500/30">{t('profile.orders.status.completed', 'Виконано')}</span>}
                                {order.status === 'new' && <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-blue-900/30 text-blue-400 border border-blue-500/30">{t('profile.orders.status.new', 'Нове')}</span>}
                                {order.status === 'processing' && <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-900/30 text-amber-400 border border-amber-500/30">{t('profile.orders.status.processing', 'В обробці')}</span>}
                                {order.status === 'cancelled' && <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-red-900/30 text-red-400 border border-red-500/30">{t('profile.orders.status.cancelled', 'Скасовано')}</span>}
                                {order.status === 'delivered' && <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-purple-900/50 text-purple-300 border border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.4)]">{t('profile.orders.status.delivered', 'Очікує підтвердження')}</span>}
                              </div>
                              <div className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3"/> {date} • {order.cart?.length || 0} {t('profile.orders.items', 'товар(ів)')}</div>
                            </div>
                          </div>
                          <div className="w-full md:w-auto flex justify-between md:items-center gap-6">
                            <div className="text-xl font-black text-white">${order.total}</div>
                            <div className="text-slate-500 bg-slate-800 p-2 rounded-lg">
                              {isExpanded ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="bg-slate-950/50 p-5 border-t border-slate-800 animate-in slide-in-from-top-2">
                            
                            {/* 🔥 БЛОК ПІДТВЕРДЖЕННЯ ДЛЯ КЛІЄНТА 🔥 */}
                            {order.status === 'delivered' && (
                              <div className="mb-6 p-4 sm:p-5 bg-gradient-to-r from-purple-900/20 to-indigo-900/10 border border-purple-500/40 rounded-2xl flex flex-col md:flex-row gap-5 items-center justify-between shadow-inner">
                                <div className="text-sm text-purple-200">
                                  <div className="flex items-center gap-2 text-base font-bold text-white mb-1">
                                    <Truck className="w-5 h-5 text-purple-400" />
                                    {t('profile.orders.deliveredTitle', 'Ваше замовлення доставлено!')}
                                  </div>
                                  {t('profile.orders.deliveredDesc', 'Будь ласка, перевірте наявність товару та підтвердіть отримання. Після підтвердження вам буде зараховано кешбек.')}
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                                  {/* Кнопка "Підтвердити" */}
                                  <button 
                                    onClick={() => handleConfirmDelivery(order.id)} 
                                    className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 hover:-translate-y-0.5"
                                  >
                                    <CheckCircle2 className="w-5 h-5" /> {t('profile.orders.confirmDelivery', 'Підтвердити')}
                                  </button>
                                  
                                  {/* 🔥 БЛОК З ПІДТРИМКОЮ (З ТВОЇМ ТЕГОМ ESScANoR7) 🔥 */}
                                  <div className="flex gap-2 w-full sm:w-auto">
                                    <a 
                                      href={`https://t.me/ESScANoR7?text=${encodeURIComponent(`Вітаю! У мене проблема із замовленням #${order.id}. `)}`}
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="flex-1 sm:w-auto px-4 py-3 bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-xs border border-slate-700 hover:border-blue-500 shadow-sm"
                                      title={t('profile.orders.supportText', 'Повідомити про проблему')}
                                    >
                                      <MessageCircle className="w-4 h-4" /> Telegram
                                    </a>
                                    
                                    <button 
                                      onClick={() => toast(t('profile.orders.otherMessengersMsg', 'Скоро додамо WhatsApp та Viber!'), {icon: '🚧'})} 
                                      className="px-3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl transition-all border border-slate-700 shadow-sm flex items-center justify-center"
                                      title={t('profile.orders.otherMessengers', 'Інші месенджери')}
                                    >
                                       <HelpCircle className="w-5 h-5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{t('profile.orders.content', 'Вміст замовлення:')}</div>
                            <div className="space-y-3">
                              {order.cart.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-slate-900 border border-slate-700 p-3 rounded-xl">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-slate-800 rounded flex items-center justify-center text-slate-500 text-xs font-bold">{idx + 1}</div>
                                    <div>
                                      <div className="text-sm font-bold text-white">{item.product?.name || item.product?.title || 'Товар'}</div>
                                      {item.userData?.nickname && <div className="text-xs text-slate-500 mt-0.5">Нікнейм: {item.userData.nickname}</div>}
                                    </div>
                                  </div>
                                  <div className="text-sm font-bold text-blue-400">${item.price}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* === ВКЛАДКА: УЛЮБЛЕНЕ (WISHLIST) === */}
          {activeTab === 'wishlist' && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-xl min-h-[400px]">
              <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-4 flex items-center gap-2">
                <Heart className="w-6 h-6 text-rose-500" /> {t('profile.wishlist.title')}
              </h2>
              
              {wishlist.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-10">
                  <div className="w-20 h-20 bg-rose-900/20 rounded-full flex items-center justify-center mb-4">
                    <Heart className="w-10 h-10 text-rose-500" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{t('profile.wishlist.empty')}</h3>
                  <p className="text-sm text-slate-400 max-w-sm mb-6">{t('profile.wishlist.emptyDesc')}</p>
                  <Link to="/" className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all shadow-md">{t('profile.wishlist.toProducts')}</Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {wishlist.map((item, index) => (
                    <div key={index} className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex gap-4 items-center group hover:border-rose-500/50 transition-all shadow-md">
                      <div className="w-16 h-16 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 flex-shrink-0 overflow-hidden">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-8 h-8" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-bold truncate text-sm mb-1">{item.name}</div>
                        <div className="text-emerald-400 font-black text-sm">${item.price}</div>
                        <div className="text-[10px] text-slate-500 uppercase mt-1 tracking-wider">{item.type}</div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => {
                            addToCart({ product: item, type: item.type, price: item.price });
                            toast.success(t('common.success'));
                          }}
                          className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors" title={t('accounts.addToCart')}
                        >
                          <ShoppingCart className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => removeFromWishlist(item.id, item.type)}
                          className="p-2 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 rounded-lg transition-colors" title={t('accounts.removeFromWishlist')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* === ВКЛАДКА: ОПЛАТА === */}
          {activeTab === 'payment' && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-4">{t('profile.payment.title')}</h2>
              
              <div className="max-w-xl">
                <h3 className="text-sm font-bold text-white mb-4">{t('profile.payment.mainMethod')}</h3>
                <p className="text-xs text-slate-400 mb-6">{t('profile.payment.methodDesc')}</p>
                
                <div className="space-y-3">
                  {[
                    { id: 'crypto', name: t('profile.payment.crypto'), desc: t('profile.payment.cryptoDesc'), icon: Coins },
                    { id: 'card', name: t('profile.payment.card'), desc: t('profile.payment.cardDesc'), icon: CreditCard },
                    { id: 'wallet', name: t('profile.payment.wallet'), desc: t('profile.payment.walletDesc'), icon: Smartphone }
                  ].map(method => (
                    <label key={method.id} className={`flex items-center p-4 rounded-2xl border cursor-pointer transition-all ${defaultPayment === method.id ? 'bg-blue-900/20 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.1)]' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}>
                      <input type="radio" name="default_payment" checked={defaultPayment === method.id} onChange={() => handleSavePaymentMethod(method.id)} className="hidden" />
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 transition-colors ${defaultPayment === method.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                        <method.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className={`font-bold text-sm ${defaultPayment === method.id ? 'text-white' : 'text-slate-300'}`}>{method.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{method.desc}</div>
                      </div>
                      {defaultPayment === method.id && <CheckCircle2 className="w-5 h-5 text-blue-500" />}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* === ВКЛАДКА: РЕФЕРАЛИ ТА БОНУСИ === */}
          {activeTab === 'referrals' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-slate-800/50 border border-amber-500/30 rounded-3xl p-6 md:p-8 shadow-[0_0_20px_rgba(245,158,11,0.05)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="relative z-10">
                  <h2 className="text-2xl font-black text-white mb-2 flex items-center gap-3">
                    <Gift className="w-6 h-6 text-amber-400" /> {t('profile.referrals.title')}
                  </h2>
                  <p className="text-sm text-slate-400 mb-8 max-w-lg">{t('profile.referrals.desc')}</p>

                  <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-center mb-8">
                    <div className="flex-1 w-full relative">
                      <input readOnly value={`https://lordsshop.com/ref/${user?.username?.toLowerCase()}`} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-amber-400 font-mono text-sm outline-none" />
                    </div>
                    <button onClick={() => copyToClipboard(`https://lordsshop.com/ref/${user?.username?.toLowerCase()}`)} className="w-full sm:w-auto px-6 py-3.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all">
                      <Copy className="w-4 h-4" /> {t('profile.referrals.copy')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* === ВКЛАДКА: СПОВІЩЕННЯ === */}
          {activeTab === 'notifications' && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-xl min-h-[400px]">
              <div className="flex items-center justify-between mb-6 border-b border-slate-700 pb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-400" /> {t('profile.notifications.title')}
                </h2>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllAsRead} className="text-xs font-bold text-blue-400 hover:text-white transition-colors flex items-center gap-1">
                    <CheckCheck className="w-4 h-4" /> {t('profile.notifications.markRead')}
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {notifications.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 flex flex-col items-center">
                    <Bell className="w-12 h-12 mb-3 text-slate-700" />
                    {t('profile.notifications.empty')}
                  </div>
                ) : (
                  notifications.map(notif => {
                    const date = new Date(notif.created_at).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' });
                    
                    let icon, bgClass, borderClass;
                    if (notif.type === 'success') {
                      icon = <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
                      bgClass = notif.is_read ? 'bg-slate-900/50' : 'bg-emerald-900/20';
                      borderClass = notif.is_read ? 'border-slate-800' : 'border-emerald-500/30';
                    } else if (notif.type === 'warning') {
                      icon = <AlertTriangle className="w-5 h-5 text-red-400" />;
                      bgClass = notif.is_read ? 'bg-slate-900/50' : 'bg-red-900/20';
                      borderClass = notif.is_read ? 'border-slate-800' : 'border-red-500/30';
                    } else {
                      icon = <Info className="w-5 h-5 text-blue-400" />;
                      bgClass = notif.is_read ? 'bg-slate-900/50' : 'bg-blue-900/20';
                      borderClass = notif.is_read ? 'border-slate-800' : 'border-blue-500/30';
                    }

                    return (
                      <div key={notif.id} className={`${bgClass} border ${borderClass} p-4 rounded-xl flex gap-4 transition-all relative overflow-hidden`}>
                        {!notif.is_read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>}
                        <div className="mt-1">{icon}</div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-1">
                            <div className={`text-sm font-bold ${notif.is_read ? 'text-slate-300' : 'text-white'}`}>{notif.title}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{date}</div>
                          </div>
                          <div className={`text-xs ${notif.is_read ? 'text-slate-500' : 'text-slate-300'}`}>{notif.message}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default Profile;