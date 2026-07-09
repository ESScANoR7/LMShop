import React, { useState, useEffect } from 'react';
import { User, Package, LogOut, KeyRound, Coins, Mail, Lock, Camera, Settings, Shield, CheckCircle2, XCircle, ArrowRight, Loader2, Clock, Check, ShieldCheck, Eye, EyeOff, Heart, CreditCard, Users, Bell, Gift, Smartphone, Send, Monitor, Copy, ChevronDown, ChevronUp, Plus, ShoppingCart, Trash2, CheckCheck, AlertTriangle, Menu, X, Truck, MessageCircle, HelpCircle, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext'; 
import { useCart } from '../context/CartContext'; 
import toast from 'react-hot-toast';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// ==========================================
// КОМПОНЕНТ ВАЛІДАЦІЇ ПАРОЛІВ
// ==========================================
const ValidationMessage = ({ value, minLength, isPasswordConfirm, matchValue, t }) => {
  if (!value) return null; 

  if (isPasswordConfirm) {
    if (value !== matchValue) {
      return (
        <div className="text-red-500 text-[11px] mt-1.5 flex items-center gap-1.5 font-bold animate-in fade-in slide-in-from-top-1">
          <XCircle className="w-3.5 h-3.5"/> {t('profile.validation.passMismatch', 'Паролі не співпадають')}
        </div>
      );
    } else {
      return (
        <div className="text-amber-500 text-[11px] mt-1.5 flex items-center gap-1.5 font-bold animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 className="w-3.5 h-3.5"/> {t('profile.validation.passMatch', 'Паролі співпадають!')}
        </div>
      );
    }
  }

  if (value.length < minLength) {
    return (
      <div className="text-red-500 text-[11px] mt-1.5 flex items-center gap-1.5 font-bold animate-in fade-in slide-in-from-top-1">
        <XCircle className="w-3.5 h-3.5"/> {t('profile.validation.minChars', 'Мінімум символів')} {minLength} ({t('profile.validation.left', 'залишилось')} {minLength - value.length})
      </div>
    );
  }
  
  return (
    <div className="text-amber-500 text-[11px] mt-1.5 flex items-center gap-1.5 font-bold animate-in fade-in slide-in-from-top-1">
      <CheckCircle2 className="w-3.5 h-3.5"/> {t('profile.validation.perfect', 'Відмінно!')}
    </div>
  );
};

const Profile = () => {
  const { t } = useTranslation(); 
  const { isLoggedIn, user, login, logout, updateBalance } = useAuth();
  const { wishlist, removeFromWishlist } = useWishlist(); 
  const { addToCart } = useCart(); 
  const navigate = useNavigate();
  
  const [isLoginView, setIsLoginView] = useState(true);
  
  // 🔥 СТАНИ ДЛЯ ВІДНОВЛЕННЯ ПАРОЛЯ 🔥
  const [isForgotView, setIsForgotView] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

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

  const [refData, setRefData] = useState({ count: 0, earnings: 0, list: [], isLoading: false });

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
    if (isLoggedIn && activeTab === 'orders') fetchMyOrders();
    if (isLoggedIn && activeTab === 'referrals') fetchReferrals();
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

  const fetchReferrals = async () => {
    setRefData(prev => ({ ...prev, isLoading: true }));
    try {
      const res = await fetch(`http://localhost:8000/api/users/${user.id}/referrals`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setRefData({
          count: data.referral_count || 0,
          earnings: data.referral_earnings || 0,
          list: data.referrals || [],
          isLoading: false
        });
      } else {
        setRefData(prev => ({ ...prev, isLoading: false }));
      }
    } catch (e) {
      console.error("Помилка завантаження рефералів");
      setRefData(prev => ({ ...prev, isLoading: false }));
    }
  };

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
  const handleMobileLogout = () => { logout(); closeMobileMenu(); navigate('/profile'); };

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
        const urlParams = new URLSearchParams(window.location.search);
        let refCode = urlParams.get('ref') || localStorage.getItem('refCode') || "";

        const res = await fetch('http://localhost:8000/api/register', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ 
            username: authForm.username, 
            email: authForm.email, 
            password: authForm.password,
            ref: refCode 
          })
        });
        if (res.ok) {
          toast.success(t('common.success'), { duration: 4000, icon: '🎉' });
          setIsLoginView(true);
          setAuthForm({ username: authForm.username, email: '', password: '', confirmPassword: '' });
          localStorage.removeItem('refCode'); 
        } else {
          toast.error(t('common.error'));
        }
      }
    } catch (error) { toast.error(t('common.error')); } 
    finally { setIsLoading(false); }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      if (res.ok) {
        toast.success('Якщо email знайдено, ми надіслали інструкції!', { duration: 5000 });
        setIsForgotView(false);
        setForgotEmail('');
      } else {
        toast.error('Помилка відправки');
      }
    } catch (err) {
      toast.error('Помилка сервера');
    } finally {
      setIsLoading(false);
    }
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

  const copyToClipboard = (text) => { navigator.clipboard.writeText(text); toast.success(t('common.success', 'Скопійовано!'), { icon: '📋' }); };
  const handleSavePaymentMethod = (method) => { setDefaultPayment(method); localStorage.setItem('defaultPayment', method); toast.success(t('common.success')); };

  // ==========================================
  // ЕКРАН АВТОРИЗАЦІЇ / РЕЄСТРАЦІЇ / ВІДНОВЛЕННЯ
  // ==========================================
  if (!isLoggedIn) {
    
    // 🔥 ЕКРАН ВІДНОВЛЕННЯ ПАРОЛЯ 🔥
    if (isForgotView) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4 max-w-md mx-auto min-h-[75vh]">
          <div className="w-20 h-20 bg-amber-900/30 text-amber-500 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(245,158,11,0.2)] rotate-3">
            <Mail className="w-10 h-10 drop-shadow-md" />
          </div>
          <h2 className="text-3xl font-black text-white mb-2 uppercase">Відновлення</h2>
          <p className="text-zinc-400 text-sm font-medium mb-8 text-center">Введіть email, який ви вказували при реєстрації.</p>

          <form className="w-full bg-zinc-900/60 backdrop-blur-md border border-zinc-800 p-6 md:p-8 rounded-3xl shadow-2xl relative overflow-hidden" onSubmit={handleForgotSubmit}>
            <div className="mb-6 relative group z-10">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-amber-500 transition-colors" />
              <input required type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="Ваш Email" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-white text-sm focus:border-amber-500 outline-none transition-all shadow-inner font-medium" />
            </div>

            <button disabled={isLoading} type="submit" className="relative z-10 w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-zinc-950 font-black py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-[1.02] flex items-center justify-center gap-2 uppercase tracking-wide">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} Відправити лист
            </button>

            <div className="mt-8 text-center text-sm text-zinc-500 border-t border-zinc-800/50 pt-6 font-medium relative z-10">
              Згадали пароль? 
              <button type="button" onClick={() => setIsForgotView(false)} className="text-amber-500 hover:text-amber-400 font-black tracking-wide transition-colors ml-1 uppercase">
                Повернутись
              </button>
            </div>
          </form>
        </div>
      );
    }

    // 🔥 ЕКРАН ЛОГІНУ / РЕЄСТРАЦІЇ 🔥
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 max-w-md mx-auto min-h-[75vh]">
        <div className="w-20 h-20 bg-red-900/30 text-amber-500 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(220,38,38,0.2)] rotate-3">
          <KeyRound className="w-10 h-10 drop-shadow-md" />
        </div>
        <h2 className="text-3xl font-black text-white mb-2">{isLoginView ? t('profile.login.title') : t('profile.register.title')}</h2>
        <div className="flex items-center justify-center gap-2 text-amber-400 bg-amber-950/30 px-4 py-2 rounded-xl border border-amber-900/50 mb-8 shadow-inner">
          <Coins className="w-4 h-4" /> <span className="text-sm font-bold">{t('profile.login.subtitle')}</span>
        </div>

        <form className="w-full bg-zinc-900/60 backdrop-blur-md border border-zinc-800 p-6 rounded-3xl shadow-2xl" onSubmit={handleAuthSubmit}>
          <div className="mb-4 group">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-red-500 transition-colors" />
              <input required name="username" value={authForm.username} onChange={handleAuthChange} placeholder={isLoginView ? t('profile.login.username') : t('profile.register.username')} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-white text-sm focus:border-red-500 outline-none transition-all shadow-inner font-medium" />
            </div>
            {!isLoginView && <ValidationMessage value={authForm.username} minLength={5} t={t} />}
          </div>

          {!isLoginView && (
            <div className="mb-4 relative group animate-in fade-in slide-in-from-top-2 duration-300">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-red-500 transition-colors" />
              <input required type="email" name="email" value={authForm.email} onChange={handleAuthChange} placeholder={t('profile.register.email')} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-white text-sm focus:border-red-500 outline-none transition-all shadow-inner font-medium" />
            </div>
          )}

          <div className="mb-4 group">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-red-500 transition-colors" />
              <input required type={showAuthPassword ? "text" : "password"} name="password" value={authForm.password} onChange={handleAuthChange} placeholder={t('profile.login.password')} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-12 py-4 text-white text-sm focus:border-red-500 outline-none transition-all shadow-inner font-medium" />
              <button type="button" onClick={() => setShowAuthPassword(!showAuthPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-amber-500 transition-colors">
                {showAuthPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {!isLoginView && <ValidationMessage value={authForm.password} minLength={6} t={t} />}
          </div>

          {!isLoginView && (
            <div className="mb-6 group animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="relative">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-red-500 transition-colors" />
                <input required type={showAuthConfirmPassword ? "text" : "password"} name="confirmPassword" value={authForm.confirmPassword} onChange={handleAuthChange} placeholder={t('profile.register.confirmPassword')} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-12 py-4 text-white text-sm focus:border-red-500 outline-none transition-all shadow-inner font-medium" />
                <button type="button" onClick={() => setShowAuthConfirmPassword(!showAuthConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-amber-500 transition-colors">
                  {showAuthConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <ValidationMessage value={authForm.confirmPassword} isPasswordConfirm matchValue={authForm.password} t={t} />
            </div>
          )}

          {isLoginView && (
            <div className="mb-6 mt-2 flex items-center justify-between animate-in fade-in">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200 ${rememberMe ? 'bg-red-600 border-transparent shadow-[0_0_10px_rgba(220,38,38,0.3)]' : 'bg-zinc-950 border border-zinc-800 group-hover:border-red-500'}`}>
                  {rememberMe && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
                <input type="checkbox" className="hidden" checked={rememberMe} onChange={() => setRememberMe(!rememberMe)} />
                <span className="text-sm font-medium text-zinc-400 group-hover:text-white transition-colors">{t('profile.login.remember')}</span>
              </label>
              
              <button type="button" onClick={() => setIsForgotView(true)} className="text-sm text-red-500 hover:text-red-400 font-bold transition-colors">
                {t('profile.login.forgot')}
              </button>
            </div>
          )}

          <button disabled={isLoading} type="submit" className="w-full mt-2 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-black py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:scale-[1.02] flex items-center justify-center gap-2 uppercase tracking-wide">
            {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
            {!isLoading && (isLoginView ? t('profile.login.btn') : t('profile.register.btn'))}
          </button>

          <div className="mt-8 text-center text-sm text-zinc-500 border-t border-zinc-800/50 pt-6 font-medium">
            {isLoginView ? t('profile.login.noAccount') + " " : t('profile.register.hasAccount') + " "}
            <button type="button" onClick={() => { setIsLoginView(!isLoginView); setAuthForm({ username: '', email: '', password: '', confirmPassword: '' }); setShowAuthPassword(false); setShowAuthConfirmPassword(false); setIsForgotView(false); }} className="text-amber-500 hover:text-amber-400 font-black tracking-wide transition-colors ml-1 uppercase">
              {isLoginView ? t('profile.login.toRegister') : t('profile.register.toLogin')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ==========================================
  // ВЕРСІЯ ДЛЯ АВТОРИЗОВАНИХ (КАБІНЕТ)
  // ==========================================
  return (
    <div className="pb-20 pt-8 max-w-6xl mx-auto px-4 min-h-[80vh]">
      
      {/* МОБІЛЬНИЙ COMPACT HEADER */}
      <div className="lg:hidden mb-6 bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-3xl p-4 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-600 to-amber-800 rounded-xl flex items-center justify-center text-white font-black text-lg border border-amber-500/30 shadow-lg">
              {user?.username?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-sm truncate">{user?.username}</div>
              <div className="text-xs text-amber-500 font-black tracking-wide">{user?.balance?.toFixed(2) || "0.00"} USDT</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-xl bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-colors text-zinc-300">
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <button onClick={handleMobileLogout} className="p-2 rounded-xl bg-red-950/50 border border-red-900/50 hover:bg-red-900/50 transition-colors text-red-500">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="mt-4 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <button onClick={() => handleMobileTabClick('settings')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold text-left ${activeTab === 'settings' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
              <Settings className="w-4 h-4 flex-shrink-0" /> {t('profile.tabs.settings', 'Особисті дані')}
            </button>
            <button onClick={() => handleMobileTabClick('security')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold text-left ${activeTab === 'security' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
              <Shield className="w-4 h-4 flex-shrink-0" /> {t('profile.tabs.security', 'Безпека')}
            </button>
            <button onClick={() => handleMobileTabClick('orders')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold text-left ${activeTab === 'orders' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
              <Package className="w-4 h-4 flex-shrink-0" /> {t('profile.tabs.orders', 'Мої замовлення')}
            </button>
            <button onClick={() => handleMobileTabClick('wishlist')} className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all text-sm font-bold ${activeTab === 'wishlist' ? 'bg-zinc-800 text-white shadow-md border border-zinc-700' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
              <div className="flex items-center gap-3"><Heart className="w-4 h-4 flex-shrink-0 text-red-500" /> {t('profile.tabs.wishlist', 'Улюблене')}</div>
              {wishlist.length > 0 && <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full text-xs font-black">{wishlist.length}</span>}
            </button>
            <button onClick={() => handleMobileTabClick('payment')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold text-left ${activeTab === 'payment' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
              <CreditCard className="w-4 h-4 flex-shrink-0" /> {t('profile.tabs.payment', 'Оплата')}
            </button>
            <button onClick={() => handleMobileTabClick('referrals')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold text-left ${activeTab === 'referrals' ? 'bg-amber-600 text-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
              <Users className="w-4 h-4 flex-shrink-0" /> {t('profile.tabs.referrals', 'Реферали')}
            </button>
            <button onClick={() => handleMobileTabClick('notifications')} className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all text-sm font-bold ${activeTab === 'notifications' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
              <div className="flex items-center gap-3"><Bell className="w-4 h-4 flex-shrink-0" /> {t('profile.tabs.notifications', 'Сповіщення')}</div>
              {unreadCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.8)]"></span>}
            </button>
          </div>
        )}
      </div>

      {/* DESKTOP TITLE */}
      <div className="hidden lg:flex items-center gap-4 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-12 h-12 bg-red-950/50 border border-red-900/50 rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.2)]">
          <User className="w-6 h-6 text-amber-500" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-500 tracking-tighter leading-tight drop-shadow-[0_0_20px_rgba(220,38,38,0.4)]">
          {t('profile.title')}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ЛІВА ПАНЕЛЬ: БІЧНЕ МЕНЮ (DESKTOP ONLY) */}
        <aside className="hidden lg:flex lg:col-span-3 flex-col gap-6 animate-in fade-in slide-in-from-left-8 duration-700">
          <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-red-500/10 rounded-full blur-[40px] group-hover:bg-amber-500/10 transition-colors"></div>
            
            <div className="flex items-center gap-4 mb-6 relative z-10">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-amber-800 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-lg border border-amber-500/30">
                {user?.username?.charAt(0) || 'U'}
              </div>
              <div>
                <div className="text-white font-black text-xl truncate max-w-[120px] tracking-wide">{user?.username}</div>
                <div className="text-[10px] font-black text-amber-500 bg-amber-950/50 px-2.5 py-1 rounded-md border border-amber-900/50 inline-block mt-1.5 uppercase tracking-wider">{t('profile.player')}</div>
              </div>
            </div>

            <div className="p-5 bg-gradient-to-br from-red-950/30 to-zinc-900/50 border border-red-900/30 rounded-2xl relative overflow-hidden group/balance shadow-inner">
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1">{t('profile.balance')}</div>
                  <div className="text-3xl font-black text-white flex items-center gap-1">
                    {user?.balance?.toFixed(2) || "0.00"}
                  </div>
                </div>
                <div className="w-12 h-12 bg-amber-500/10 rounded-xl border border-amber-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.1)] group-hover/balance:scale-110 transition-transform">
                  <Coins className="w-6 h-6 text-amber-500" />
                </div>
              </div>
              <Link to="/topup" className="w-full py-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/30 font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all relative z-10 shadow-sm">
                <Plus className="w-4 h-4" /> {t('profile.buyCoins')}
              </Link>
            </div>
          </div>

          <nav className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-3xl p-4 shadow-xl flex flex-col gap-1.5">
            <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all text-sm font-bold ${activeTab === 'settings' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
              <Settings className="w-5 h-5" /> {t('profile.tabs.settings')}
            </button>
            <button onClick={() => setActiveTab('security')} className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all text-sm font-bold ${activeTab === 'security' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
              <Shield className="w-5 h-5" /> {t('profile.tabs.security')}
            </button>
            <button onClick={() => setActiveTab('orders')} className={`flex items-center justify-between px-5 py-4 rounded-2xl transition-all text-sm font-bold ${activeTab === 'orders' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
              <div className="flex items-center gap-3"><Package className="w-5 h-5" /> {t('profile.tabs.orders')}</div>
            </button>
            <button onClick={() => setActiveTab('wishlist')} className={`flex items-center justify-between px-5 py-4 rounded-2xl transition-all text-sm font-bold ${activeTab === 'wishlist' ? 'bg-zinc-800 border border-zinc-700 text-white shadow-md' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
              <div className="flex items-center gap-3"><Heart className="w-5 h-5 text-red-500" /> {t('profile.tabs.wishlist')}</div>
              {wishlist.length > 0 && <span className="bg-red-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-black">{wishlist.length}</span>}
            </button>
            <button onClick={() => setActiveTab('payment')} className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all text-sm font-bold ${activeTab === 'payment' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
              <CreditCard className="w-5 h-5" /> {t('profile.tabs.payment')}
            </button>
            <button onClick={() => setActiveTab('referrals')} className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all text-sm font-bold ${activeTab === 'referrals' ? 'bg-amber-600 text-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
              <Users className="w-5 h-5" /> {t('profile.tabs.referrals')}
            </button>
            <button onClick={() => setActiveTab('notifications')} className={`flex items-center justify-between px-5 py-4 rounded-2xl transition-all text-sm font-bold ${activeTab === 'notifications' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
              <div className="flex items-center gap-3"><Bell className="w-5 h-5" /> {t('profile.tabs.notifications')}</div>
              {unreadCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.8)]"></span>}
            </button>
            
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <button onClick={logout} className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-2xl text-sm font-bold text-zinc-500 hover:bg-red-950/30 hover:text-red-500 transition-all border border-transparent hover:border-red-900/50">
                <LogOut className="w-5 h-5" /> {t('profile.tabs.logout')}
              </button>
            </div>
          </nav>
        </aside>

        {/* ПРАВА ПАНЕЛЬ: ВМІСТ ВКАЛОДОК */}
        <main className="lg:col-span-9">
          
          {/* === ВКЛАДКА: ОСОБИСТІ ДАНІ === */}
          {activeTab === 'settings' && (
            <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-8 duration-700 shadow-xl relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-red-500/5 rounded-full blur-[60px] pointer-events-none"></div>
              
              <h2 className="text-2xl font-black text-white mb-8 border-b border-zinc-800 pb-4 relative z-10">{t('profile.settings.title')}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 relative z-10">
                <div className="space-y-4 bg-zinc-950/50 p-6 md:p-8 rounded-3xl border border-zinc-800 shadow-inner">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider mb-6"><User className="w-5 h-5 text-red-500"/> {t('profile.settings.basicInfo')}</h3>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase tracking-wider">{t('profile.settings.publicName')}</label>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <input value={profileForm.username} onChange={(e) => setProfileForm({...profileForm, username: e.target.value.replace(/\s/g, '')})} placeholder={t('profile.settings.minChars')} className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl px-5 py-4 text-white text-sm outline-none focus:border-red-500 transition-colors shadow-inner" />
                        {profileForm.username !== user?.username && <ValidationMessage value={profileForm.username} minLength={5} t={t} />}
                      </div>
                      <button onClick={() => handleUpdateProfile('username')} disabled={isSaving || profileForm.username === user?.username || profileForm.username.length < 5} className="bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-bold px-6 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg h-[54px]">
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5"/>}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 bg-zinc-950/50 p-6 md:p-8 rounded-3xl border border-zinc-800 shadow-inner">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider mb-6"><Send className="w-5 h-5 text-amber-500"/> {t('profile.settings.contacts')}</h3>
                 <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                    <label className="block text-[10px] font-black text-amber-500 mb-3 uppercase tracking-widest">{t('profile.settings.tgBindTitle')}</label>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="flex-1 text-xs text-zinc-400 font-medium">
                        {t('profile.settings.tgBindDesc')}
                      </div>
                      <a 
                        href={`https://t.me/ESScANoR7?start=${user?.id}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="w-full sm:w-auto px-6 py-3 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-black uppercase tracking-wider text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:scale-105"
                      >
                        <Send className="w-4 h-4" /> {t('profile.settings.bindBtn')}
                      </a>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase tracking-wider">{t('profile.settings.discordId')}</label>
                    <input placeholder="user#1234" className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl px-5 py-4 text-white text-sm outline-none focus:border-red-500 shadow-inner" />
                  </div>
                  <button className="w-full py-4 mt-2 bg-zinc-800 hover:bg-red-600 border border-zinc-700 hover:border-red-500 text-white font-bold text-sm uppercase tracking-wider rounded-2xl transition-all shadow-md">
                    {t('profile.settings.saveContacts')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* === ВКЛАДКА: БЕЗПЕКА ТА СЕСІЇ === */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/5 rounded-full blur-[50px] pointer-events-none"></div>
                <h2 className="text-2xl font-black text-white mb-8 border-b border-zinc-800 pb-4 relative z-10">{t('profile.security.title')}</h2>
                
                <div className="max-w-md bg-zinc-950/50 p-6 md:p-8 rounded-3xl border border-zinc-800 shadow-inner relative z-10 space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className="w-6 h-6 text-red-500" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">{t('profile.security.changePass')}</h3>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase tracking-wider">{t('profile.security.newPass')}</label>
                    <div className="relative">
                      <input type={showNewPassword ? "text" : "password"} value={passwordForm.newPassword} onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})} placeholder={t('profile.settings.minChars')} className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl pl-5 pr-12 py-4 text-white text-sm focus:border-red-500 outline-none transition-colors shadow-inner" />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-amber-500 transition-colors">
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <ValidationMessage value={passwordForm.newPassword} minLength={6} t={t} />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase tracking-wider">{t('profile.security.confirmPass')}</label>
                    <div className="relative">
                      <input type={showConfirmNewPassword ? "text" : "password"} value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} placeholder={t('profile.security.confirmPass')} className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl pl-5 pr-12 py-4 text-white text-sm focus:border-red-500 outline-none transition-colors shadow-inner" />
                      <button type="button" onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-amber-500 transition-colors">
                        {showConfirmNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <ValidationMessage value={passwordForm.confirmPassword} isPasswordConfirm matchValue={passwordForm.newPassword} t={t} />
                  </div>
                  
                  <button onClick={() => handleUpdateProfile('password')} disabled={isSaving || passwordForm.newPassword.length < 6 || passwordForm.newPassword !== passwordForm.confirmPassword} className="w-full py-4 mt-2 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white font-black uppercase tracking-wider rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2">
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5"/>} {t('profile.security.updateSecurity')}
                  </button>
                </div>
              </div>

              <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 border-b border-zinc-800 pb-4 gap-4">
                  <h2 className="text-2xl font-black text-white flex items-center gap-3"><Monitor className="w-6 h-6 text-amber-500"/> {t('profile.security.activeSessions')}</h2>
                  <button className="text-xs font-black uppercase tracking-wider bg-red-950/30 text-red-500 border border-red-900/50 px-5 py-2.5 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm">
                    {t('profile.security.logoutOther')}
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-5 bg-zinc-950/80 border border-amber-500/30 rounded-2xl shadow-inner relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>
                    <div className="flex items-center gap-5 pl-2">
                      <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-500"><Monitor className="w-6 h-6"/></div>
                      <div>
                        <div className="text-white font-bold text-sm flex items-center gap-3 mb-1">Windows 11 • Chrome <span className="text-[9px] bg-red-600 text-white px-2 py-0.5 rounded uppercase font-black tracking-widest shadow-[0_0_10px_rgba(220,38,38,0.5)]">{t('profile.security.current')}</span></div>
                        <div className="text-xs text-zinc-500 font-medium">Україна, Київ • IP: 192.168.1.1</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* === ВКЛАДКА: ДЕТАЛІЗОВАНІ ЗАМОВЛЕННЯ === */}
          {activeTab === 'orders' && (
            <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-8 duration-700 shadow-xl">
              <h2 className="text-2xl font-black text-white mb-8 border-b border-zinc-800 pb-4">{t('profile.orders.title', 'Моя історія покупок')}</h2>
              
              {isLoadingOrders ? (
                <div className="flex justify-center py-16"><Loader2 className="w-10 h-10 text-red-500 animate-spin drop-shadow-md" /></div>
              ) : myOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-950/50">
                  <Package className="w-20 h-20 text-zinc-700 mb-6" />
                  <h3 className="text-xl font-black text-zinc-300 mb-3 uppercase tracking-wide">{t('profile.orders.empty', 'Тут поки порожньо')}</h3>
                  <p className="text-sm text-zinc-500 max-w-sm mx-auto mb-8 font-medium">{t('profile.orders.emptyDesc', 'Ви ще нічого не замовляли. Час це виправити!')}</p>
                  <Link to="/resources" className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider text-sm rounded-2xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:scale-105">{t('profile.orders.toCatalog', 'До каталогу')}</Link>
                </div>
              ) : (
                <div className="space-y-5">
                  {myOrders.map(order => {
                    const date = new Date(order.created_at).toLocaleDateString('uk-UA', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute:'2-digit' });
                    const isExpanded = expandedOrderId === order.id;

                    return (
                      <div key={order.id} className={`bg-zinc-950 border ${order.status === 'delivered' ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'border-zinc-800 hover:border-red-500/30'} rounded-3xl overflow-hidden transition-all group`}>
                        <div 
                          className="p-6 flex flex-col md:flex-row gap-5 justify-between items-center cursor-pointer relative overflow-hidden"
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        >
                          {/* Світіння при доставці */}
                          {order.status === 'delivered' && <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>}

                          <div className="flex items-center gap-5 w-full md:w-auto relative z-10">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors shadow-inner ${
                              order.status === 'completed' ? 'bg-zinc-900 border border-zinc-700 text-zinc-500' : 
                              order.status === 'delivered' ? 'bg-amber-950/50 border border-amber-900/50 text-amber-500' :
                              'bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:text-red-500'
                            }`}>
                              {order.status === 'delivered' ? <Truck className="w-7 h-7 animate-bounce" /> : <Package className="w-7 h-7" />}
                            </div>
                            <div>
                              <div className="text-white font-black text-lg flex items-center gap-3 mb-1">
                                {t('profile.orders.orderNum', 'Замовлення #')}{order.id}
                                {order.status === 'completed' && <span className="px-2.5 py-1 rounded-md text-[9px] uppercase font-black tracking-widest bg-zinc-800 text-zinc-500 border border-zinc-700">{t('profile.orders.status.completed', 'Виконано')}</span>}
                                {order.status === 'new' && <span className="px-2.5 py-1 rounded-md text-[9px] uppercase font-black tracking-widest bg-zinc-800 text-zinc-300 border border-zinc-600">{t('profile.orders.status.new', 'Нове')}</span>}
                                {order.status === 'processing' && <span className="px-2.5 py-1 rounded-md text-[9px] uppercase font-black tracking-widest bg-red-950/50 text-red-500 border border-red-900/50 shadow-[0_0_10px_rgba(220,38,38,0.2)]">{t('profile.orders.status.processing', 'В обробці')}</span>}
                                {order.status === 'cancelled' && <span className="px-2.5 py-1 rounded-md text-[9px] uppercase font-black tracking-widest bg-red-950/30 text-red-700 border border-red-900/30">{t('profile.orders.status.cancelled', 'Скасовано')}</span>}
                                {order.status === 'delivered' && <span className="px-2.5 py-1 rounded-md text-[9px] uppercase font-black tracking-widest bg-amber-500 text-zinc-950 shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-pulse">{t('profile.orders.status.delivered', 'Очікує підтвердження')}</span>}
                              </div>
                              <div className="text-xs text-zinc-500 font-medium flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> {date} • {order.cart?.length || 0} {t('profile.orders.items', 'товар(ів)')}</div>
                            </div>
                          </div>
                          <div className="w-full md:w-auto flex justify-between md:items-center gap-8 relative z-10">
                            <div className="text-2xl font-black text-amber-500">${order.total}</div>
                            <div className="text-zinc-500 bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl group-hover:bg-red-600 group-hover:text-white group-hover:border-red-500 transition-all">
                              {isExpanded ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="bg-zinc-900/40 p-6 border-t border-zinc-800 animate-in slide-in-from-top-4">
                            
                            {/* 🔥 БЛОК ПІДТВЕРДЖЕННЯ ДЛЯ КЛІЄНТА 🔥 */}
                            {order.status === 'delivered' && (
                              <div className="mb-8 p-5 md:p-6 bg-gradient-to-br from-amber-950/40 to-zinc-950 border border-amber-900/50 rounded-2xl flex flex-col md:flex-row gap-6 items-center justify-between shadow-inner relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500"></div>
                                <div className="text-sm text-zinc-300 pl-2">
                                  <div className="flex items-center gap-2 text-lg font-black text-amber-500 mb-2 drop-shadow-md">
                                    <Truck className="w-6 h-6" />
                                    {t('profile.orders.deliveredTitle', 'Ваше замовлення доставлено!')}
                                  </div>
                                  <p className="font-medium text-zinc-400">
                                    {t('profile.orders.deliveredDesc', 'Будь ласка, перевірте наявність товару та підтвердіть отримання. Після підтвердження вам буде зараховано кешбек.')}
                                  </p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                                  <button 
                                    onClick={() => handleConfirmDelivery(order.id)} 
                                    className="w-full sm:w-auto px-8 py-4 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black uppercase tracking-wider text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2 hover:scale-105"
                                  >
                                    <CheckCircle2 className="w-5 h-5" /> {t('profile.orders.confirmDelivery', 'Підтвердити')}
                                  </button>
                                  
                                  <div className="flex gap-2 w-full sm:w-auto">
                                    <a 
                                      href={`https://t.me/ESScANoR7?text=${encodeURIComponent(`Вітаю! У мене проблема із замовленням #${order.id}. `)}`}
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="flex-1 sm:w-auto px-5 py-4 bg-zinc-900 hover:bg-red-600 text-zinc-300 hover:text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-xs border border-zinc-700 hover:border-red-500 shadow-sm uppercase tracking-wider"
                                      title={t('profile.orders.supportText', 'Повідомити про проблему')}
                                    >
                                      <MessageCircle className="w-4 h-4" /> Telegram
                                    </a>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 pl-2">{t('profile.orders.content', 'Вміст замовлення:')}</div>
                            <div className="space-y-3">
                              {order.cart.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-zinc-950 border border-zinc-800 p-4 rounded-2xl shadow-inner">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-500 text-sm font-black border border-zinc-800/50">{idx + 1}</div>
                                    <div>
                                      <div className="text-base font-bold text-zinc-200">{item.product?.name || item.product?.title || 'Товар'}</div>
                                      {item.userData?.nickname && <div className="text-xs text-zinc-500 mt-1 font-medium">Нікнейм: <span className="text-zinc-300">{item.userData.nickname}</span></div>}
                                    </div>
                                  </div>
                                  <div className="text-base font-black text-amber-500">${item.price}</div>
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
            <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-8 duration-700 shadow-xl min-h-[400px] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-64 h-64 bg-red-500/5 rounded-full blur-[60px] pointer-events-none"></div>
              
              <h2 className="text-2xl font-black text-white mb-8 border-b border-zinc-800 pb-4 flex items-center gap-3 relative z-10">
                <Heart className="w-7 h-7 text-red-500 drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]" /> {t('profile.wishlist.title')}
              </h2>
              
              {wishlist.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-16 relative z-10 border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-950/50">
                  <div className="w-24 h-24 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <Heart className="w-10 h-10 text-zinc-700" />
                  </div>
                  <h3 className="text-xl font-black text-zinc-300 mb-3 uppercase tracking-wide">{t('profile.wishlist.empty')}</h3>
                  <p className="text-sm text-zinc-500 max-w-sm mb-8 font-medium">{t('profile.wishlist.emptyDesc')}</p>
                  <Link to="/" className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider text-sm rounded-2xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:scale-105">{t('profile.wishlist.toProducts')}</Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
                  {wishlist.map((item, index) => (
                    <div key={index} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 md:p-5 flex gap-5 items-center group hover:border-red-500/50 transition-all shadow-lg hover:-translate-y-1">
                      <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-zinc-600 flex-shrink-0 overflow-hidden shadow-inner">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                          <Package className="w-8 h-8" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-zinc-200 font-bold truncate text-base mb-1.5">{item.name}</div>
                        <div className="text-amber-500 font-black text-lg">${item.price}</div>
                        <div className="text-[9px] text-zinc-500 uppercase mt-1.5 font-black tracking-widest inline-block border border-zinc-800 px-2 py-0.5 rounded-md bg-zinc-900">{item.type}</div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => {
                            addToCart({ product: item, type: item.type, price: item.price });
                            toast.success(t('common.success'));
                          }}
                          className="p-3 bg-zinc-800 hover:bg-red-600 border border-zinc-700 hover:border-red-500 text-white rounded-xl transition-all shadow-md" title={t('accounts.addToCart')}
                        >
                          <ShoppingCart className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => removeFromWishlist(item.id, item.type)}
                          className="p-3 bg-zinc-900 hover:bg-red-950/50 border border-zinc-800 hover:border-red-900/50 text-zinc-500 hover:text-red-500 rounded-xl transition-all" title={t('accounts.removeFromWishlist')}
                        >
                          <Trash2 className="w-5 h-5" />
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
            <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-8 duration-700 shadow-xl">
              <h2 className="text-2xl font-black text-white mb-8 border-b border-zinc-800 pb-4">{t('profile.payment.title')}</h2>
              
              <div className="max-w-2xl">
                <h3 className="text-base font-bold text-white mb-3 uppercase tracking-wider">{t('profile.payment.mainMethod')}</h3>
                <p className="text-sm text-zinc-400 mb-8 font-medium">{t('profile.payment.methodDesc')}</p>
                
                <div className="space-y-4">
                  {[
                    { id: 'crypto', name: t('profile.payment.crypto'), desc: t('profile.payment.cryptoDesc'), icon: Coins },
                    { id: 'card', name: t('profile.payment.card'), desc: t('profile.payment.cardDesc'), icon: CreditCard },
                    { id: 'wallet', name: t('profile.payment.wallet'), desc: t('profile.payment.walletDesc'), icon: Smartphone }
                  ].map(method => (
                    <label key={method.id} className={`flex items-center p-5 rounded-2xl border-2 cursor-pointer transition-all ${defaultPayment === method.id ? 'bg-red-950/20 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.2)]' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-600'}`}>
                      <input type="radio" name="default_payment" checked={defaultPayment === method.id} onChange={() => handleSavePaymentMethod(method.id)} className="hidden" />
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mr-5 transition-colors border ${defaultPayment === method.id ? 'bg-red-600 border-red-500 text-white shadow-lg' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                        <method.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className={`font-black text-lg mb-1 ${defaultPayment === method.id ? 'text-white' : 'text-zinc-300'}`}>{method.name}</div>
                        <div className="text-xs text-zinc-500 font-medium leading-relaxed">{method.desc}</div>
                      </div>
                      {defaultPayment === method.id && <CheckCircle2 className="w-7 h-7 text-red-500 drop-shadow-md ml-4" />}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* === ВКЛАДКА: РЕФЕРАЛИ ТА БОНУСИ === */}
          {activeTab === 'referrals' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="bg-zinc-900/60 backdrop-blur-md border border-amber-500/30 rounded-3xl p-6 md:p-10 shadow-[0_0_30px_rgba(245,158,11,0.05)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none"></div>
                <div className="relative z-10">
                  <h2 className="text-3xl font-black text-white mb-4 flex items-center gap-3 tracking-tight">
                    <Gift className="w-8 h-8 text-amber-500 drop-shadow-md" /> {t('profile.referrals.title', 'Реферальна програма')}
                  </h2>
                  <p className="text-base text-zinc-400 mb-10 max-w-xl font-medium">{t('profile.referrals.desc', 'Запрошуйте друзів за своїм посиланням і отримуйте відсоток від їхніх покупок на свій баланс!')}</p>

                  {/* 🔥 БЛОК СТАТИСТИКИ 🔥 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
                    <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl flex items-center gap-6 shadow-inner relative overflow-hidden">
                      <div className="w-16 h-16 bg-red-950 border border-red-900 text-red-500 rounded-2xl flex items-center justify-center relative z-10">
                        <Users className="w-8 h-8" />
                      </div>
                      <div className="relative z-10">
                        <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1.5">Запрошено друзів</div>
                        <div className="text-3xl font-black text-white">
                          {refData.isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : refData.count}
                        </div>
                      </div>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl flex items-center gap-6 shadow-inner relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500"></div>
                      <div className="w-16 h-16 bg-amber-950/50 border border-amber-900/50 text-amber-500 rounded-2xl flex items-center justify-center relative z-10 ml-2">
                        <Coins className="w-8 h-8" />
                      </div>
                      <div className="relative z-10">
                        <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1.5">Зароблено</div>
                        <div className="text-3xl font-black text-amber-400 drop-shadow-sm">
                          {refData.isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : `$${refData.earnings.toFixed(2)}`}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 🔥 БЛОК ПОСИЛАННЯ 🔥 */}
                  <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex flex-col sm:flex-row gap-4 items-center mb-12 shadow-inner">
                    <div className="flex-1 w-full relative">
                      <input 
                        readOnly 
                        value={`${window.location.origin}/?ref=${user?.username}`} 
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-5 py-4 text-amber-500 font-mono text-sm outline-none font-bold" 
                      />
                    </div>
                    <button onClick={() => copyToClipboard(`${window.location.origin}/?ref=${user?.username}`)} className="w-full sm:w-auto px-8 py-4 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-black uppercase tracking-wider text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:scale-105">
                      <Copy className="w-5 h-5" /> {t('profile.referrals.copy', 'Копіювати')}
                    </button>
                  </div>

                  {/* 🔥 СПИСОК РЕФЕРАЛІВ 🔥 */}
                  <div>
                    <h3 className="text-xl font-black text-white mb-5 uppercase tracking-wider">Кого ви запросили:</h3>
                    {refData.isLoading ? (
                      <div className="flex justify-center py-6"><Loader2 className="w-8 h-8 text-amber-500 animate-spin" /></div>
                    ) : refData.list.length === 0 ? (
                      <div className="text-center py-10 bg-zinc-950 border border-dashed border-zinc-800 rounded-3xl text-zinc-500 font-medium">
                        Ви ще нікого не запросили. Поділіться своїм посиланням!
                      </div>
                    ) : (
                      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-inner">
                        {refData.list.map((refUser, idx) => (
                          <div key={refUser.id} className={`p-5 flex items-center gap-4 ${idx !== refData.list.length -1 ? 'border-b border-zinc-800' : ''} hover:bg-zinc-900/50 transition-colors`}>
                            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-400 text-lg font-black uppercase shadow-sm">
                              {refUser.username.charAt(0)}
                            </div>
                            <div className="text-base font-bold text-zinc-200 tracking-wide">{refUser.username}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* === ВКЛАДКА: СПОВІЩЕННЯ === */}
          {activeTab === 'notifications' && (
            <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-8 duration-700 shadow-xl min-h-[400px]">
              <div className="flex items-center justify-between mb-8 border-b border-zinc-800 pb-4">
                <h2 className="text-2xl font-black text-white flex items-center gap-3">
                  <Bell className="w-6 h-6 text-red-500" /> {t('profile.notifications.title')}
                </h2>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllAsRead} className="text-xs font-black uppercase tracking-wider text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-1.5 bg-amber-950/30 border border-amber-900/50 px-4 py-2 rounded-xl">
                    <CheckCheck className="w-4 h-4" /> {t('profile.notifications.markRead')}
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <div className="text-center py-20 text-zinc-600 flex flex-col items-center border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-950/50">
                    <Bell className="w-16 h-16 mb-4 text-zinc-700" />
                    <span className="font-bold text-lg">{t('profile.notifications.empty')}</span>
                  </div>
                ) : (
                  notifications.map(notif => {
                    const date = new Date(notif.created_at).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' });
                    
                    let icon, bgClass, borderClass;
                    if (notif.type === 'success') {
                      icon = <CheckCircle2 className="w-6 h-6 text-amber-500 drop-shadow-sm" />;
                      bgClass = notif.is_read ? 'bg-zinc-950' : 'bg-amber-950/20';
                      borderClass = notif.is_read ? 'border-zinc-800' : 'border-amber-500/30';
                    } else if (notif.type === 'warning') {
                      icon = <AlertTriangle className="w-6 h-6 text-red-500 drop-shadow-sm" />;
                      bgClass = notif.is_read ? 'bg-zinc-950' : 'bg-red-950/20';
                      borderClass = notif.is_read ? 'border-zinc-800' : 'border-red-500/30';
                    } else {
                      icon = <Info className="w-6 h-6 text-zinc-400" />;
                      bgClass = notif.is_read ? 'bg-zinc-950' : 'bg-zinc-900';
                      borderClass = notif.is_read ? 'border-zinc-800' : 'border-zinc-600';
                    }

                    return (
                      <div key={notif.id} className={`${bgClass} border ${borderClass} p-5 md:p-6 rounded-2xl flex gap-5 transition-all relative overflow-hidden shadow-inner`}>
                        {!notif.is_read && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)]"></div>}
                        <div className="mt-0.5">{icon}</div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <div className={`text-base font-black ${notif.is_read ? 'text-zinc-400' : 'text-white'}`}>{notif.title}</div>
                            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-md">{date}</div>
                          </div>
                          <div className={`text-sm font-medium ${notif.is_read ? 'text-zinc-500' : 'text-zinc-300'} leading-relaxed`}>{notif.message}</div>
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