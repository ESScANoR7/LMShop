import { API_URL } from "../config/api.js";
import React, { useState, useEffect, useRef } from 'react';
import { User, Package, LogOut, KeyRound, Coins, Mail, Lock, Camera, Settings, Shield, CheckCircle2, XCircle, ArrowRight, Loader2, Clock, Check, ShieldCheck, Eye, EyeOff, Heart, CreditCard, Users, Bell, Gift, Smartphone, Send, Monitor, Copy, ChevronDown, ChevronUp, Plus, ShoppingCart, Trash2, CheckCheck, AlertTriangle, Menu, X, Truck, MessageCircle, HelpCircle, Info, Crown, Award, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext'; 
import { useCart } from '../context/CartContext'; 
import toast from 'react-hot-toast';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiGet } from '../config/apiClient';
import { getFullUrl, getImageUrl } from '../config/api';
import { PriceDisplay } from '../context/CurrencyContext';

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

const Profile = ({ defaultRegister = false }) => {
  const { t } = useTranslation(); 
  const { isLoggedIn, user, login, logout, updateBalance, updateUser } = useAuth();
  const { wishlist, removeFromWishlist } = useWishlist(); 
  const { addToCart } = useCart(); 
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const isRegisterParam = defaultRegister || 
    location.pathname === '/register' || 
    searchParams.get('mode') === 'register' || 
    Boolean(searchParams.get('ref'));

  const [isLoginView, setIsLoginView] = useState(!isRegisterParam);
  const [isForgotView, setIsForgotView] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const initialTab = searchParams.get('tab') || (location.state?.justOrdered ? 'orders' : 'settings');
  const [activeTab, setActiveTab] = useState(initialTab);

  // Синхронізація активної вкладки при зміні ?tab=... у посиланні
  useEffect(() => {
    const tab = searchParams.get('tab') || (location.state?.justOrdered ? 'orders' : null);
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams, location.state]);

  // Захоплення та збереження реферального коду
  const [activeRefCode, setActiveRefCode] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return (urlParams.get('ref') || sessionStorage.getItem('refCode') || localStorage.getItem('refCode') || '').trim();
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref') || sessionStorage.getItem('refCode') || localStorage.getItem('refCode');
    if (ref) {
      const cleanRef = ref.trim();
      setActiveRefCode(cleanRef);
      localStorage.setItem('refCode', cleanRef);
      sessionStorage.setItem('refCode', cleanRef);
    }
  }, [searchParams]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLinkingTg, setIsLinkingTg] = useState(false); 
  const [telegramId, setTelegramId] = useState(null); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 🔥 Захист від старих даних у таймері (Stale Closures) 🔥
  const userRef = useRef(user);
  const tgRef = useRef(telegramId);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { tgRef.current = telegramId; }, [telegramId]);

  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [profileForm, setProfileForm] = useState({ username: '', telegram: '', discord: '' });
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });

  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [showAuthConfirmPassword, setShowAuthConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const [rememberMe, setRememberMe] = useState(true);

  // Helper to extract cached/optimistic order from checkout
  const getInitialOrders = () => {
    if (location.state?.optimisticOrder) {
      return [location.state.optimisticOrder];
    }
    try {
      const cached = sessionStorage.getItem('latest_order');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.id && (Date.now() - new Date(parsed.created_at).getTime() < 120000)) {
          return [parsed];
        }
      }
    } catch (e) {}
    return [];
  };

  const getInitialExpandedOrderId = () => {
    if (location.state?.newOrderId) return location.state.newOrderId;
    const fromParam = searchParams.get('order_id');
    if (fromParam) return parseInt(fromParam, 10);
    try {
      const cached = sessionStorage.getItem('latest_order');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.id && (Date.now() - new Date(parsed.created_at).getTime() < 120000)) {
          return parsed.id;
        }
      }
    } catch (e) {}
    return null;
  };

  const initialOrdersList = getInitialOrders();
  const initialExpId = getInitialExpandedOrderId();

  const [myOrders, setMyOrders] = useState(initialOrdersList);
  const [expandedOrderId, setExpandedOrderId] = useState(initialExpId);
  const [hasLoadedOrdersOnce, setHasLoadedOrdersOnce] = useState(initialOrdersList.length > 0);
  const [isLoadingOrders, setIsLoadingOrders] = useState(() => {
    const isOrders = (searchParams.get('tab') === 'orders') || Boolean(location.state?.justOrdered);
    return isOrders && initialOrdersList.length === 0;
  });
  const [defaultPayment, setDefaultPayment] = useState(localStorage.getItem('defaultPayment') || 'crypto');

  const [notifications, setNotifications] = useState([]);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const [refData, setRefData] = useState({ count: 0, earnings: 0, list: [], isLoading: false });
  const [userTierData, setUserTierData] = useState(null);
  const [isLoadingTier, setIsLoadingTier] = useState(false);

  // СТЕЙТИ ДЛЯ ЧАТУ
  const [chatData, setChatData] = useState(() => {
    if (initialExpId && (location.state?.justOrdered || initialOrdersList.length > 0)) {
      return {
        [initialExpId]: [
          {
            id: 'init_sys',
            sender: 'system',
            text: 'Вітаємо! Ваше замовлення створено. Очікуйте реквізити для оплати.',
            created_at: new Date().toISOString()
          }
        ]
      };
    }
    return {};
  });
  const [chatInputs, setChatInputs] = useState({});
  const [isChatLoading, setIsChatLoading] = useState({});

  useEffect(() => {
    if (user) setProfileForm(prev => ({ ...prev, username: user.username }));
  }, [user]);

  const fetchUserData = async (silent = false) => {
    if (!userRef.current?.id) return;
    try {
      const res = await fetch(`${API_URL}/api/users/${userRef.current.id}?t=${Date.now()}`, {
        credentials: 'include',
        cache: 'no-store'
      });
      const data = await res.json();
      if (data.balance !== undefined && data.balance !== userRef.current.balance) {
        updateBalance(data.balance); 
      }
      if (data.avatar !== undefined && data.avatar !== userRef.current?.avatar) {
        if (updateUser) updateUser({ avatar: data.avatar });
      }
      if (data.telegram !== undefined) {
        const isLinked = Boolean(data.telegram);
        if (isLinked !== Boolean(tgRef.current)) {
          setTelegramId(isLinked ? (data.telegram_id || true) : null);
        }
      }
    } catch (err) { console.error(err); }
  };

  const fetchMyOrders = async (silent = false) => {
    if (!silent) setIsLoadingOrders(true);
    try {
      const response = await fetch(`${API_URL}/api/orders?t=${Date.now()}`, { 
        credentials: 'include',
        cache: 'no-store'
      });
      if (response.ok) {
        const allOrders = await response.json();
        setMyOrders(prev => {
          if (Array.isArray(allOrders) && allOrders.length > 0) {
            return allOrders;
          }
          if (prev.length > 0 && prev[0]?.id && (Date.now() - new Date(prev[0].created_at).getTime() < 60000)) {
            return prev;
          }
          return allOrders;
        });
        setHasLoadedOrdersOnce(true);
        try {
          sessionStorage.removeItem('latest_order');
        } catch (e) {}
      }
    } catch (error) { 
      console.error("Помилка завантаження замовлень"); 
    } finally {
      if (!silent) setIsLoadingOrders(false);
      setHasLoadedOrdersOnce(true);
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/api/users/${user.id}/notifications`);
      if (res.ok) setNotifications(await res.json());
    } catch (e) { console.error("Помилка завантаження сповіщень"); }
  };

  const fetchReferrals = async () => {
    if (!user) return;
    setRefData(prev => ({ ...prev, isLoading: true }));
    try {
      const res = await fetch(`${API_URL}/api/users/${user.id}/referrals`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setRefData({
          count: data.referral_count || 0,
          earnings: data.referral_earnings || 0,
          list: data.referrals || [],
          botUsername: data.bot_username || 'LordTreasury_bot',
          categoryPercents: data.category_percents || {},
          isLoading: false
        });
      } else {
        setRefData(prev => ({ ...prev, isLoading: false }));
      }
    } catch (e) { setRefData(prev => ({ ...prev, isLoading: false })); }
  };

  const fetchChat = async (orderId, silent = false) => {
    if (!silent) setIsChatLoading(prev => ({ ...prev, [orderId]: true }));
    try {
      const res = await fetch(`${API_URL}/api/orders/${orderId}/chat?t=${Date.now()}`, { 
        credentials: 'include',
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setChatData(prev => ({ ...prev, [orderId]: data }));
      }
    } catch (err) { console.error(err); }
    if (!silent) setIsChatLoading(prev => ({ ...prev, [orderId]: false }));
  };

  const fetchCashbackTier = async () => {
    if (!user?.id) return;
    setIsLoadingTier(true);
    try {
      const data = await apiGet(getFullUrl(`/api/users/${user.id}/cashback-tier?t=${Date.now()}`));
      if (data) {
        setUserTierData(data);
      }
    } catch (e) {
      console.error("Помилка завантаження рангу кешбеку", e);
    } finally {
      setIsLoadingTier(false);
    }
  };

  // 🔥 МИТТЄВЕ ЗАВАНТАЖЕННЯ ДАНИХ ПРИ ПЕРЕХОДІ НА ВКЛАДКУ
  useEffect(() => {
    if (isLoggedIn && user?.id) {
      fetchUserData();
      fetchNotifications();
      fetchCashbackTier();
      if (activeTab === 'orders') {
        fetchMyOrders(myOrders.length === 0 ? false : true);
      } else if (activeTab === 'referrals') {
        fetchReferrals();
      } else if (activeTab === 'cashback') {
        fetchCashbackTier();
      }
    }
  }, [isLoggedIn, user?.id, activeTab]); 

  // ⚡ НАДШВИДКИЙ СИНХРОНІЗАТОР ДЛЯ ЗАМОВЛЕНЬ (2.5 СЕК) коли відкрита вкладка замовлень
  useEffect(() => {
    let orderInterval;
    if (isLoggedIn && user?.id && activeTab === 'orders') {
      orderInterval = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        fetchMyOrders(true);
      }, 2500);
    }
    return () => clearInterval(orderInterval);
  }, [isLoggedIn, user?.id, activeTab]);

  // 🔄 СИНХРОНІЗАТОР БАЛАНСУ ТА РЕФЕРАЛІВ (10 СЕК)
  useEffect(() => {
    let interval;
    if (isLoggedIn && user?.id) {
      interval = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        fetchUserData(true);
        if (activeTab === 'referrals') fetchReferrals();
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [isLoggedIn, user?.id, activeTab]);

  // ⚡ НАДШВИДКИЙ СИНХРОНІЗАТОР ВІДКРИТОГО ЧАТУ (2 СЕК)
  useEffect(() => {
    let chatInterval;
    if (expandedOrderId) {
      fetchChat(expandedOrderId, true);
      chatInterval = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        fetchChat(expandedOrderId, true);
      }, 2000);
    }
    return () => clearInterval(chatInterval);
  }, [expandedOrderId]);

  // 🔔 СПОВІЩЕННЯ — окремий повільний таймер (30 сек)
  useEffect(() => {
    let notifInterval;
    if (isLoggedIn && user?.id) {
      notifInterval = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        fetchNotifications();
      }, 30000);
    }
    return () => clearInterval(notifInterval);
  }, [isLoggedIn, user?.id]);

  // ==========================================
  // 🔥 ФУНКЦІЇ ТЕЛЕГРАМУ (ПРИВ'ЯЗКА ТА ВІДВ'ЯЗКА)
  // ==========================================
  const handleLinkTelegram = async () => {
    setIsLinkingTg(true);
    try {
      const res = await fetch(`${API_URL}/api/telegram/get-link`, {
        method: 'GET',
        credentials: 'include'
      });
      const data = await res.json();

      if (res.ok && data.link) {
        window.open(data.link, '_blank');
        toast.success("Перейдіть у Telegram та натисніть Start!");
      } else {
        toast.error(t('common.error', 'Помилка отримання посилання'));
      }
    } catch (err) {
      toast.error(t('common.error', 'Помилка сервера'));
    } finally {
      setIsLinkingTg(false);
    }
  };

  const handleUnlinkTelegram = async () => {
    setIsLinkingTg(true);
    try {
      const res = await fetch(`${API_URL}/api/users/${user.id}/unlink-telegram`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (res.ok) {
        setTelegramId(null);
        toast.success("Акаунт Telegram успішно відв'язано!");
      } else {
        toast.error("Помилка відв'язування");
      }
    } catch (err) {
      toast.error(t('common.error', 'Помилка сервера'));
    } finally {
      setIsLinkingTg(false);
    }
  };

  const handleSendMessage = async (orderId) => {
    const text = chatInputs[orderId];
    if (!text?.trim()) return;

    try {
      const res = await fetch(`${API_URL}/api/orders/${orderId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: text, is_secret: false })
      });
      if (res.ok) {
        setChatInputs(prev => ({ ...prev, [orderId]: '' }));
        fetchChat(orderId);
      } else {
        toast.error("Помилка відправки");
      }
    } catch (e) { console.error(e); }
  };

  const handleConfirmDelivery = async (orderId) => {
    try {
      // Оптимістичне миттєве оновлення статусу, щоб чек відобразився одразу без лагів
      setMyOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'completed' } : o));

      const res = await fetch(`${API_URL}/api/orders/${orderId}/confirm`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || t('common.success', 'Успішно підтверджено!'));
        fetchUserData();
        fetchMyOrders(true);
        fetchChat(orderId, true); 
      } else {
        toast.error(data.detail || t('common.error', 'Помилка'));
        fetchMyOrders(true);
      }
    } catch (error) {
      toast.error(t('common.error', 'Виникла помилка. Спробуйте пізніше.'));
      fetchMyOrders(true);
    }
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  const handleMobileTabClick = (tab) => { setActiveTab(tab); closeMobileMenu(); navigate(`/profile?tab=${tab}`); };
  const handleMobileLogout = () => { logout(); closeMobileMenu(); navigate('/profile'); };

  const handleMarkNotificationAsRead = async (notif) => {
    if (!notif || notif.is_read || !user) return;
    try {
      await fetch(`${API_URL}/api/users/${user.id}/notifications/${notif.id}/read`, { method: 'PUT' });
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    } catch (e) {
      console.error('Помилка позначення повідомлення прочитаним:', e);
    }
  };

  const renderProductIcon = (item, className = "w-full h-full object-cover") => {
    const type = (item?.type || item?.category || item?.product?.type || item?.product?.category || '').toLowerCase();
    const name = (item?.name || item?.title || item?.product?.name || item?.product?.title || '').toLowerCase();
    const image = item?.image || item?.product?.image || (item?.images && item.images[0]) || (item?.product?.images && item.product.images[0]);

    // 1. Account (Акаунт)
    if (type.includes('acc') || name.includes('акаунт') || name.includes('account')) {
      if (image) {
        return <img src={getImageUrl(image)} alt="" className={className} />;
      }
      return <img src="/icons/account.jpg" alt="Account" className={className} />;
    }
    // 2. RSS (Ресурси)
    if (type.includes('rss') || type.includes('resource') || name.includes('rss') || name.includes('ресурс') || name.includes('дерево') || name.includes('руда') || name.includes('золото') || name.includes('зерно')) {
      return <img src="/icons/rss.jpg" alt="RSS" className={className} />;
    }
    // 3. Gems (Самоцвіти)
    if (type.includes('gem') || name.includes('gem') || name.includes('самоцвіт')) {
      return <img src="/icons/gems.jpg" alt="Gems" className={className} />;
    }
    // 4. Coins / Other items (Монети та інші товари)
    if (type.includes('coin') || type.includes('topup') || type.includes('other') || name.includes('монет') || name.includes('coin') || name.includes('інше')) {
      return <img src="/icons/coins.jpg" alt="Coins" className={className} />;
    }
    if (image) {
      return <img src={getImageUrl(image)} alt="" className={className} />;
    }
    return <img src="/icons/coins.jpg" alt="Item" className={className} />;
  };

  const renderOrderIcon = (order) => {
    const firstItem = order?.cart?.[0] || {};
    return renderProductIcon(firstItem, "w-full h-full object-cover");
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const toastId = toast.loading('Завантаження аватара...');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_URL}/api/users/${user.id}/avatar`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.avatar) {
        if (updateUser) updateUser({ avatar: data.avatar });
        toast.success(t('profile.avatarSuccess', 'Аватар успішно оновлено!'), { id: toastId });
      } else {
        toast.error(data.detail || t('common.error'), { id: toastId });
      }
    } catch (err) {
      toast.error(t('common.error'), { id: toastId });
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleSelectPresetAvatar = async (avatarUrl) => {
    if (!user) return;
    const toastId = toast.loading('Оновлення аватара...');
    const formData = new FormData();
    formData.append('avatar_url', avatarUrl);
    try {
      const res = await fetch(`${API_URL}/api/users/${user.id}/avatar`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.avatar) {
        if (updateUser) updateUser({ avatar: data.avatar });
        toast.success(t('profile.avatarSuccess', 'Аватар успішно оновлено!'), { id: toastId });
      } else {
        toast.error(data.detail || t('common.error'), { id: toastId });
      }
    } catch (err) {
      toast.error(t('common.error'), { id: toastId });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch(`${API_URL}/api/users/${user.id}/notifications/read`, { method: 'PUT' });
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      toast.success(t('common.success', 'Успішно'));
    } catch (e) {
      toast.error(t('common.error', 'Помилка'));
    }
  };

  const formatNotificationMessage = (msg, title) => {
    if (!msg) return '';
    let text = String(msg);
    // Прибираємо дублювання заголовку у повідомленні: 🔔 <b>Title</b> або Title
    if (title) {
      const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      text = text.replace(new RegExp(`^(?:🔔\\s*)?<b[^>]*>\\s*${escapedTitle}\\s*<\\/b>\\s*`, 'i'), '');
      text = text.replace(new RegExp(`^(?:🔔\\s*)?${escapedTitle}\\s*`, 'i'), '');
    }
    // Прибираємо будь-які сирі HTML-теги
    text = text.replace(/<\/?[^>]+(>|$)/g, '');
    text = text.replace(/^[🔔❌🚚🟢⏳✅🎉]\s*/gu, '');
    // Оновлюємо стару назву
    text = text.replace(/LORDS\s*SHOP/gi, 'LordTreasury');
    return text.trim();
  };

  const localizeNotification = (notif) => {
    let rawTitle = notif?.title || '';
    let rawMsg = formatNotificationMessage(notif?.message, rawTitle);

    let localizedTitle = rawTitle;
    let localizedMsg = rawMsg;

    // 1. Локалізація заголовка
    const orderUpdatedMatch = rawTitle.match(/(?:Order|Замовлення|Bestellung)\s*#(\d+)\s*(?:updated|оновлено|aktualisiert)/i);
    if (orderUpdatedMatch) {
      const orderId = orderUpdatedMatch[1];
      localizedTitle = t('profile.notifications.orderUpdated', { id: orderId, defaultValue: `Order #${orderId} updated` });
    } else if (/Order Created|Замовлення оформлено|Bestellung aufgegeben/i.test(rawTitle)) {
      localizedTitle = t('profile.notifications.orderCreated', 'Замовлення оформлено!');
    } else if (/Welcome|Ласкаво просимо|Herzlich willkommen/i.test(rawTitle)) {
      localizedTitle = t('profile.notifications.welcomeTitle', 'Ласкаво просимо!');
    } else if (/Telegram.*(Linked|прив'язано|verknüpft|Авторизація)/i.test(rawTitle)) {
      localizedTitle = t('profile.notifications.tgLinkedTitle', "Telegram прив'язано");
    } else if (/Баланс|Balance|Guthaben/i.test(rawTitle)) {
      localizedTitle = t('profile.notifications.balanceUpdatedTitle', 'Баланс змінено');
    }

    // 2. Локалізація тіла повідомлення
    const orderCreatedDescMatch = rawMsg.match(/(?:Order|Замовлення|Bestellung)\s*#(\d+)\s*(?:created|створено|erstellt)/i);
    if (orderCreatedDescMatch) {
      const orderId = orderCreatedDescMatch[1];
      localizedMsg = t('profile.notifications.orderCreatedDesc', { id: orderId, defaultValue: `Order #${orderId} created. Go to chat for details.` });
    } else if (/completed successfully|успішно виконано|erfolgreich abgeschlossen/i.test(rawMsg)) {
      localizedMsg = t('profile.notifications.orderCompleted', 'Замовлення успішно виконано! Дякуємо за покупку.');
    } else if (/is delivered|доставлено|geliefert/i.test(rawMsg)) {
      localizedMsg = t('profile.notifications.orderDelivered', 'Ваше замовлення доставлено! Будь ласка, перевірте товар та підтвердіть отримання.');
    } else if (/Payment received|Оплату отримано|Zahlung erhalten/i.test(rawMsg)) {
      localizedMsg = t('profile.notifications.paymentReceived', 'Оплату отримано! Ваше замовлення взято в роботу.');
    } else if (/Awaiting your payment|Очікуємо на вашу оплату|Warten auf Ihre Zahlung/i.test(rawMsg)) {
      localizedMsg = t('profile.notifications.awaitingPayment', 'Замовлення створено. Очікуємо на вашу оплату.');
    } else if (/cancelled|скасовано|storniert/i.test(rawMsg)) {
      localizedMsg = t('profile.notifications.orderCancelled', 'На жаль, ваше замовлення було скасовано.');
    } else if (/Order status changed|Статус замовлення змінено|Bestellstatus wurde geändert/i.test(rawMsg)) {
      localizedMsg = t('profile.notifications.orderStatusChanged', 'Статус замовлення змінено.');
    } else if (/Welcome to LordTreasury|Ласкаво просимо в LordTreasury|Willkommen bei LordTreasury|Дякуємо за реєстрацію/i.test(rawMsg)) {
      localizedMsg = t('profile.notifications.welcomeDesc', 'Ласкаво просимо в LordTreasury!');
    } else if (/Telegram.*(синхронізовані|підключено|linked|synced|synchronisiert)/i.test(rawMsg)) {
      localizedMsg = t('profile.notifications.tgLinkedDesc', 'Ваш Telegram акаунт успішно підключено! Тепер сповіщення та баланс синхронізовані.');
    } else {
      const balMatch = rawMsg.match(/\$(\d+(?:\.\d+)?)/);
      if (/баланс.*змінено|balance.*adjusted|guthaben.*angepasst/i.test(rawMsg) && balMatch) {
        localizedMsg = t('profile.notifications.balanceUpdatedDesc', { balance: balMatch[1], defaultValue: rawMsg });
      }
    }

    return { title: localizedTitle, message: localizedMsg };
  };

  const handleAuthChange = (e) => setAuthForm({ ...authForm, [e.target.name]: e.target.value.replace(/\s/g, '') });

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!isLoginView) {
      // Валідація нікнейму
      if (authForm.username.length < 3) {
        return toast.error('Нікнейм повинен бути мінімум 3 символи');
      }
      if (authForm.username.length > 20) {
        return toast.error('Нікнейм не може бути довшим за 20 символів');
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(authForm.username)) {
        return toast.error('Нікнейм може містити тільки букви, цифри, _ та -');
      }
      // Валідація email
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authForm.email)) {
        return toast.error('Введіть коректний email');
      }
      // Валідація пароля
      if (authForm.password.length < 8) {
        return toast.error('Пароль повинен бути мінімум 8 символів');
      }
      if (authForm.password !== authForm.confirmPassword) {
        return toast.error(t('profile.validation.passMismatch'));
      }
    }
    setIsLoading(true);
    try {
      if (isLoginView) {
        const res = await fetch(`${API_URL}/api/login`, {
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
        let refCode = (activeRefCode || urlParams.get('ref') || sessionStorage.getItem('refCode') || localStorage.getItem('refCode') || "").trim();

        const res = await fetch(`${API_URL}/api/register`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ 
            username: authForm.username, 
            email: authForm.email, 
            password: authForm.password,
            ref: refCode 
          })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          toast.success(data.message || t('common.success'), { duration: 4000, icon: '🎉' });
          setIsLoginView(true);
          setAuthForm({ username: authForm.username, email: '', password: '', confirmPassword: '' });
          localStorage.removeItem('refCode'); 
          sessionStorage.removeItem('refCode');
          setActiveRefCode('');
        } else {
          toast.error(data.detail || data.message || t('common.error'));
        }
      }
    } catch (error) { toast.error(t('common.error')); } 
    finally { setIsLoading(false); }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/forgot-password`, {
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
      const res = await fetch(`${API_URL}/api/users/${user.id}/update`, {
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
  // ЕКРАН АВТОРИЗАЦІЇ
  // ==========================================
  if (!isLoggedIn) {
    if (isForgotView) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4 max-w-md mx-auto min-h-[75vh]">
          <div className="w-20 h-20 bg-amber-900/30 text-amber-500 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(245,158,11,0.2)] rotate-3">
            <Mail className="w-10 h-10 drop-shadow-md" />
          </div>
          <h2 className="text-3xl font-black text-white mb-2 uppercase">{t('profile.forgot.title', 'Відновлення')}</h2>
          <p className="text-zinc-400 text-sm font-medium mb-8 text-center">{t('profile.forgot.desc', 'Введіть email, який ви вказували при реєстрації.')}</p>

          <form className="w-full bg-zinc-900/60 backdrop-blur-md border border-zinc-800 p-6 md:p-8 rounded-3xl shadow-2xl relative overflow-hidden" onSubmit={handleForgotSubmit}>
            <div className="mb-6 relative group z-10">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-amber-500 transition-colors" />
              <input required type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder={t('profile.forgot.emailPlaceholder', 'Ваш Email')} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-white text-sm focus:border-amber-500 outline-none transition-all shadow-inner font-medium" />
            </div>

            <button disabled={isLoading} type="submit" className="relative z-10 w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-zinc-950 font-black py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-[1.02] flex items-center justify-center gap-2 uppercase tracking-wide">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} {t('profile.forgot.sendBtn', 'Відправити лист')}
            </button>

            <div className="mt-8 text-center text-sm text-zinc-500 border-t border-zinc-800/50 pt-6 font-medium relative z-10">
              {t('profile.forgot.rememberPass', 'Згадали пароль?')} 
              <button type="button" onClick={() => setIsForgotView(false)} className="text-amber-500 hover:text-amber-400 font-black tracking-wide transition-colors ml-1 uppercase">
                {t('profile.forgot.back', 'Повернутись')}
              </button>
            </div>
          </form>
        </div>
      );
    }

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
          {!isLoginView && activeRefCode && (
            <div className="mb-5 p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-2xl flex items-center gap-3 text-amber-400 text-xs font-bold shadow-inner animate-in fade-in">
              <Users className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span>Вас запросив: <strong className="text-white font-black">{activeRefCode}</strong> (Бонус буде активовано)</span>
            </div>
          )}

          <div className="mb-4 group">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-red-500 transition-colors" />
              <input required name="username" value={authForm.username} onChange={handleAuthChange} placeholder={isLoginView ? t('profile.login.username') : t('profile.register.username')} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-white text-sm focus:border-red-500 outline-none transition-all shadow-inner font-medium" />
            </div>
            {!isLoginView && <ValidationMessage value={authForm.username} minLength={3} t={t} />}
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
            {!isLoginView && <ValidationMessage value={authForm.password} minLength={8} t={t} />}
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

      {/* МОБІЛЬНИЙ HEADER */}
      <div className="lg:hidden mb-6 bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-3xl p-4 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-600 to-amber-800 rounded-xl flex items-center justify-center text-white font-black text-lg border border-amber-500/30 shadow-lg overflow-hidden">
              {user?.avatar ? (
                <img src={getImageUrl(user.avatar)} alt="" className="w-full h-full object-cover" />
              ) : (
                user?.username?.charAt(0) || 'U'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-sm truncate">{user?.username}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-amber-500 font-black tracking-wide">{user?.balance?.toFixed(2) || "0.00"} USDT</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-wider">
                  <Crown className="w-2.5 h-2.5 text-amber-400" />
                  {userTierData?.current_tier?.name || user?.tier_name || 'Base'}
                </span>
              </div>
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
            
            <button onClick={() => handleMobileTabClick('referrals')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold text-left ${activeTab === 'referrals' ? 'bg-amber-600 text-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
              <Users className="w-4 h-4 flex-shrink-0" /> {t('profile.tabs.referrals', 'Реферали')}
            </button>
            <button onClick={() => handleMobileTabClick('cashback')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold text-left ${activeTab === 'cashback' ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.35)]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
              <Crown className="w-4 h-4 flex-shrink-0 text-amber-400" /> {t('profile.tabs.cashback', 'Ранг і кешбек')}
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
              <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-amber-800 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-lg border border-amber-500/30 overflow-hidden">
                {user?.avatar ? (
                  <img src={getImageUrl(user.avatar)} alt="" className="w-full h-full object-cover" />
                ) : (
                  user?.username?.charAt(0) || 'U'
                )}
              </div>
              <div>
                <div className="text-white font-black text-xl truncate max-w-[120px] tracking-wide">{user?.username}</div>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <div className="text-[10px] font-black text-amber-500 bg-amber-950/50 px-2.5 py-0.5 rounded-md border border-amber-900/50 inline-block uppercase tracking-wider">{t('profile.player')}</div>
                  <div className="text-[10px] font-black text-amber-300 bg-gradient-to-r from-amber-500/20 to-yellow-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/40 inline-flex items-center gap-1 shadow-sm uppercase tracking-wider">
                    <Crown className="w-3 h-3 text-amber-400" />
                    {userTierData?.current_tier?.name || user?.tier_name || 'Base'}
                  </div>
                </div>
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
            <button onClick={() => {setActiveTab('settings'); navigate('?tab=settings');}} className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all text-sm font-bold ${activeTab === 'settings' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
              <Settings className="w-5 h-5" /> {t('profile.tabs.settings')}
            </button>
            <button onClick={() => {setActiveTab('security'); navigate('?tab=security');}} className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all text-sm font-bold ${activeTab === 'security' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
              <Shield className="w-5 h-5" /> {t('profile.tabs.security')}
            </button>
            <button onClick={() => {setActiveTab('orders'); navigate('?tab=orders');}} className={`flex items-center justify-between px-5 py-4 rounded-2xl transition-all text-sm font-bold ${activeTab === 'orders' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
              <div className="flex items-center gap-3"><Package className="w-5 h-5" /> {t('profile.tabs.orders')}</div>
            </button>
            <button onClick={() => {setActiveTab('wishlist'); navigate('?tab=wishlist');}} className={`flex items-center justify-between px-5 py-4 rounded-2xl transition-all text-sm font-bold ${activeTab === 'wishlist' ? 'bg-zinc-800 border border-zinc-700 text-white shadow-md' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
              <div className="flex items-center gap-3"><Heart className="w-5 h-5 text-red-500" /> {t('profile.tabs.wishlist')}</div>
              {wishlist.length > 0 && <span className="bg-red-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-black">{wishlist.length}</span>}
            </button>
            
            <button onClick={() => {setActiveTab('referrals'); navigate('?tab=referrals');}} className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all text-sm font-bold ${activeTab === 'referrals' ? 'bg-amber-600 text-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
              <Users className="w-5 h-5" /> {t('profile.tabs.referrals')}
            </button>
            <button onClick={() => {setActiveTab('cashback'); navigate('?tab=cashback');}} className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all text-sm font-bold ${activeTab === 'cashback' ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.35)]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
              <Crown className="w-5 h-5 text-amber-400" /> {t('profile.tabs.cashback', 'Ранг і кешбек')}
            </button>
            <button onClick={() => {setActiveTab('notifications'); navigate('?tab=notifications');}} className={`flex items-center justify-between px-5 py-4 rounded-2xl transition-all text-sm font-bold ${activeTab === 'notifications' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
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
                  
                  {/* 🔥 ОНОВЛЕНИЙ БЛОК ПРИВ'ЯЗКИ ТЕЛЕГРАМУ 🔥 */}
                  <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                    <label className="block text-[10px] font-black text-amber-500 mb-3 uppercase tracking-widest">{t('profile.settings.tgBindTitle')}</label>
                    
                    {telegramId ? (
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="flex-1 flex flex-col">
                          <span className="text-emerald-400 text-sm font-bold flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5" /> {t('profile.telegram.connected', 'Акаунт підключено')}
                          </span>
                          <span className="text-zinc-500 text-xs mt-1">ID: {telegramId}</span>
                        </div>
                        <button 
                          onClick={handleUnlinkTelegram}
                          disabled={isLinkingTg}
                          className="w-full sm:w-auto px-6 py-3 bg-red-950/50 hover:bg-red-900 text-red-500 hover:text-white font-black uppercase tracking-wider text-xs rounded-xl flex items-center justify-center gap-2 transition-all border border-red-900/50 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {isLinkingTg ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} 
                          {t('profile.telegram.unlink', "Відв'язати")}
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="flex-1 text-xs text-zinc-400 font-medium">
                          {t('profile.settings.tgBindDesc')}
                        </div>
                        <button 
                          onClick={handleLinkTelegram}
                          disabled={isLinkingTg}
                          className="w-full sm:w-auto px-6 py-3 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-black uppercase tracking-wider text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {isLinkingTg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} 
                          {t('profile.settings.bindBtn', 'Прив\'язати')}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Блок аватара */}
                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    <label className="block text-xs font-bold text-zinc-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                      <Camera className="w-4 h-4 text-amber-500" /> {t('profile.settings.avatarTitle', 'Аватар профілю')}
                    </label>
                    
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white font-black text-2xl border border-amber-500/40 overflow-hidden shadow-md flex-shrink-0">
                        {user?.avatar ? (
                          <img src={getImageUrl(user.avatar)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          user?.username?.charAt(0) || 'U'
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold cursor-pointer transition-all shadow-sm">
                          <Camera className="w-3.5 h-3.5" />
                          <span>{t('profile.settings.uploadAvatar', 'Завантажити фото')}</span>
                          <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                        </label>
                        <p className="text-[11px] text-zinc-500 mt-1.5">{t('profile.avatar.formatNotice', 'PNG, JPG або WEBP (до 10 МБ)')}</p>
                      </div>
                    </div>
                  </div>
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

          {/* === ВКЛАДКА: ДЕТАЛІЗОВАНІ ЗАМОВЛЕННЯ ТА ЧАТ/ЧЕК === */}
          {activeTab === 'orders' && (
            <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-8 duration-700 shadow-xl">
              <h2 className="text-2xl font-black text-white mb-8 border-b border-zinc-800 pb-4">{t('profile.orders.title', 'Моя історія покупок')}</h2>

              {isLoadingOrders || (!hasLoadedOrdersOnce && myOrders.length === 0) ? (
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
                    const date = new Date(order.created_at || Date.now()).toLocaleDateString('uk-UA', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute:'2-digit' });
                    const isExpanded = expandedOrderId === order.id;

                    return (
                      <div key={order.id} className={`bg-zinc-950 border ${order.status === 'delivered' ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'border-zinc-800 hover:border-red-500/30'} rounded-3xl overflow-hidden transition-all group`}>
                        <div 
                          className="p-6 flex flex-col md:flex-row gap-5 justify-between items-center cursor-pointer relative overflow-hidden"
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        >
                          {order.status === 'delivered' && <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>}

                          <div className="flex items-center gap-5 w-full md:w-auto relative z-10">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden border border-zinc-800 shadow-md bg-zinc-900 flex-shrink-0">
                              {renderOrderIcon(order)}
                            </div>
                            <div>
                              <div className="text-white font-black text-lg flex items-center gap-3 mb-1">
                                {t('profile.orders.orderNum', 'Замовлення #')}{order.id}
                                {order.status === 'completed' && <span className="px-2.5 py-1 rounded-md text-[9px] uppercase font-black tracking-widest bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">{t('profile.orders.status.completed', 'Виконано')}</span>}
                                {order.status === 'new' && <span className="px-2.5 py-1 rounded-md text-[9px] uppercase font-black tracking-widest bg-zinc-800 text-zinc-300 border border-zinc-600">{t('profile.orders.status.new', 'Нове')}</span>}
                                {order.status === 'awaiting_payment' && <span className="px-2.5 py-1 rounded-md text-[9px] uppercase font-black tracking-widest bg-amber-950/50 text-amber-500 border border-amber-900/50 shadow-[0_0_10px_rgba(245,158,11,0.2)] animate-pulse">{t('profile.orders.status.awaiting_payment', 'Очікує оплати')}</span>}
                                {order.status === 'paid_processing' && <span className="px-2.5 py-1 rounded-md text-[9px] uppercase font-black tracking-widest bg-blue-950/50 text-blue-400 border border-blue-900/50 shadow-[0_0_10px_rgba(59,130,246,0.2)]">{t('profile.orders.status.paid_processing', 'Оплачено (В роботі)')}</span>}
                                {order.status === 'processing' && <span className="px-2.5 py-1 rounded-md text-[9px] uppercase font-black tracking-widest bg-red-950/50 text-red-500 border border-red-900/50">{t('profile.orders.status.processing', 'В обробці')}</span>}
                                {order.status === 'cancelled' && <span className="px-2.5 py-1 rounded-md text-[9px] uppercase font-black tracking-widest bg-red-950/30 text-red-700 border border-red-900/30">{t('profile.orders.status.cancelled', 'Скасовано')}</span>}
                                {order.status === 'delivered' && <span className="px-2.5 py-1 rounded-md text-[9px] uppercase font-black tracking-widest bg-amber-500 text-zinc-950 shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-pulse">{t('profile.orders.status.delivered', 'Очікує підтвердження')}</span>}
                              </div>
                              <div className="text-xs text-zinc-500 font-medium flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> {date} • {order.cart?.length || 0} {t('profile.orders.items', 'товар(ів)')}</div>
                            </div>
                          </div>
                          <div className="w-full md:w-auto flex justify-between md:items-center gap-8 relative z-10">
                            <div className="text-2xl font-black text-amber-500"><PriceDisplay price={parseFloat(order.total || 0)} /></div>
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
                                </div>
                              </div>
                            )}

                            {/* 🔥 ЯКЩО ЗАМОВЛЕННЯ ВИКОНАНО - ПОКАЗУЄМО ЧЕК ЗАМІСТЬ СПИСКУ 🔥 */}
                            {order.status === 'completed' ? (
                              <div className="mb-8 bg-zinc-950/80 border border-zinc-800 rounded-2xl relative overflow-hidden shadow-lg max-w-xl mx-auto">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
                                <div className="p-6">
                                  <div className="flex flex-col items-center justify-center border-b border-dashed border-zinc-700 pb-6 mb-6 relative z-10">
                                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center mb-3">
                                      <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-black text-white tracking-widest uppercase">{t('profile.receipt.title', 'Електронний чек')}</h3>
                                    <p className="text-xs text-zinc-500 font-mono mt-1">{t('profile.orders.orderNum', 'Замовлення #')}{order.id} • {date}</p>
                                  </div>
                                  <div className="space-y-4 mb-6 font-mono text-sm relative z-10">
                                    {(order.cart || []).map((item, idx) => (
                                      <div key={idx} className="flex justify-between items-center gap-4 border-b border-zinc-800/50 pb-2 last:border-0 last:pb-0">
                                        <div className="flex items-center gap-3 min-w-0 text-zinc-300">
                                          <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-800 bg-zinc-900">
                                            {renderProductIcon(item, "w-full h-full object-cover")}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="truncate font-semibold">{item.product?.name || item.product?.title || 'Товар'}</div>
                                            {item.userData?.nickname && <div className="text-xs text-zinc-500">{t('profile.orders.nickname', 'Нікнейм')}: {item.userData.nickname}</div>}
                                          </div>
                                        </div>
                                        <div className="text-white whitespace-nowrap"><PriceDisplay price={parseFloat(item.price || 0)} size="sm" /></div>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="border-t border-dashed border-zinc-700 pt-4 flex justify-between items-end relative z-10">
                                    <div className="text-xs font-mono text-zinc-500 uppercase">{t('profile.receipt.method', 'МЕТОД:')} {order.paymentMethod}</div>
                                    <div className="text-right">
                                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">{t('profile.receipt.paid', 'Сплачено')}</div>
                                      <div className="text-2xl font-black text-emerald-400"><PriceDisplay price={parseFloat(order.total || 0)} size="lg" /></div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 pl-2">{t('profile.orders.content', 'Вміст замовлення:')}</div>
                                <div className="space-y-3 mb-8">
                                  {(order.cart || []).map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-zinc-950 border border-zinc-800 p-4 rounded-2xl shadow-inner gap-4">
                                      <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-zinc-800 bg-zinc-900 shadow-sm">
                                          {renderProductIcon(item, "w-full h-full object-cover")}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="text-base font-bold text-zinc-200 truncate">{item.product?.name || item.product?.title || 'Товар'}</div>
                                          {item.userData?.nickname && <div className="text-xs text-zinc-500 mt-1 font-medium truncate">{t('profile.orders.nickname', 'Нікнейм')}: <span className="text-zinc-300">{item.userData.nickname}</span></div>}
                                        </div>
                                      </div>
                                      <div className="text-base font-black text-amber-500 flex-shrink-0"><PriceDisplay price={parseFloat(item.price || 0)} /></div>
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}

                            {/* 🔥 ЧАТ-ТІКЕТ 🔥 */}
                            <div className="border-t border-zinc-800 pt-8">
                              <h4 className="text-lg font-black text-white mb-4 flex items-center gap-3">
                                <MessageCircle className="w-6 h-6 text-amber-500" />
                                {t('profile.orders.supportChat', 'Чат підтримки')}</h4>
                              <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-4 md:p-6 flex flex-col h-[450px] shadow-inner relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[60px] pointer-events-none"></div>

                                <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4 flex flex-col relative z-10 custom-scrollbar">
                                  {isChatLoading[order.id] && !chatData[order.id] ? (
                                    <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin text-amber-500"/></div>
                                  ) : chatData[order.id]?.length > 0 ? (
                                    chatData[order.id].map(msg => (
                                      <div key={msg.id} className={`max-w-[85%] rounded-2xl px-5 py-3 ${
                                        msg.sender === 'user' 
                                          ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-zinc-950 self-end rounded-br-sm shadow-md' 
                                          : msg.sender === 'system' 
                                            ? 'bg-zinc-800/50 text-zinc-400 self-center text-center text-xs border border-zinc-700 w-full'
                                            : `bg-zinc-900 border border-zinc-700 text-white self-start rounded-bl-sm`
                                      }`}>
                                        <div className="whitespace-pre-wrap text-sm font-medium">{msg.text}</div>
                                        {msg.sender !== 'system' && (
                                          <div className={`text-[10px] mt-2 font-bold ${msg.sender === 'user' ? 'text-amber-950/60 text-right' : 'text-zinc-500'}`}>
                                            {new Date(msg.created_at).toLocaleTimeString('uk-UA', {hour: '2-digit', minute:'2-digit'})}
                                          </div>
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="m-auto text-zinc-600 text-sm font-medium">{t('profile.orders.chatEmpty', 'Немає повідомлень. Напишіть щось, щоб почати діалог!')}</div>
                                  )}
                                </div>

                                {order.status !== 'completed' && order.status !== 'cancelled' ? (
                                  <div className="flex gap-3 items-center bg-zinc-900 p-2 pl-4 rounded-2xl border border-zinc-800 relative z-10 focus-within:border-amber-500/50 transition-colors">
                                    <input 
                                      type="text" 
                                      placeholder={t('profile.orders.chatPlaceholder', 'Напишіть повідомлення...')}
                                      value={chatInputs[order.id] || ''}
                                      onChange={(e) => setChatInputs(prev => ({...prev, [order.id]: e.target.value}))}
                                      onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(order.id); }}
                                      className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-zinc-600"
                                    />
                                    <button 
                                      onClick={() => handleSendMessage(order.id)}
                                      className="w-12 h-12 bg-amber-600 hover:bg-amber-500 text-zinc-950 rounded-xl flex items-center justify-center transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:scale-105"
                                    >
                                      <Send className="w-5 h-5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-center p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-500 text-xs font-bold uppercase tracking-wider relative z-10">
                                    {t('profile.orders.ticketClosed', 'Тікет закрито')} ({t('profile.orders.orderNum', 'Замовлення #')}{order.id} {order.status === 'cancelled' ? t('profile.orders.status.cancelled', 'скасовано') : t('profile.orders.status.completed', 'завершено')})
                                  </div>
                                )}
                              </div>
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
                      <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden shadow-inner">
                        {renderProductIcon(item, "w-full h-full object-cover group-hover:scale-105 transition-transform duration-300")}
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
                    <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl flex items-center gap-6 shadow-inner relative overflow-hidden">
                      <div className="w-16 h-16 bg-red-950 border border-red-900 text-red-500 rounded-2xl flex items-center justify-center relative z-10">
                        <Users className="w-8 h-8" />
                      </div>
                      <div className="relative z-10">
                        <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1.5">{t('profile.referrals.invitedFriends', 'Запрошено друзів')}</div>
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
                        <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1.5">{t('profile.referrals.earnedTotal', 'Зароблено')}</div>
                        <div className="text-3xl font-black text-amber-400 drop-shadow-sm">
                          {refData.isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : `$${refData.earnings.toFixed(2)}`}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ДВА ПОСИЛАННЯ: САЙТ ТА TELEGRAM */}
                  <div className="space-y-4 mb-8">
                    {/* Посилання на веб-сайт */}
                    <div className="bg-zinc-950 border border-zinc-800 p-4 sm:p-5 rounded-2xl shadow-inner">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-amber-400 flex items-center gap-2">
                          <Globe className="w-4 h-4 text-amber-500" /> {t('profile.referrals.webLinkTitle', 'Посилання на веб-сайт')}
                        </label>
                        <span className="text-[10px] text-zinc-500 font-mono">Web link</span>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 items-center">
                        <input 
                          readOnly 
                          value={`${window.location.origin}/?ref=${user?.username}`} 
                          className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-4 py-3 text-amber-400 font-mono text-sm outline-none font-bold select-all" 
                        />
                        <button 
                          onClick={() => copyToClipboard(`${window.location.origin}/?ref=${user?.username}`)} 
                          className="w-full sm:w-auto px-6 py-3 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-black uppercase tracking-wider text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:scale-105 shrink-0"
                        >
                          <Copy className="w-4 h-4" /> {t('profile.referrals.copy', 'Копіювати')}
                        </button>
                      </div>
                    </div>

                    {/* Посилання на Telegram-бота */}
                    <div className="bg-zinc-950 border border-zinc-800 p-4 sm:p-5 rounded-2xl shadow-inner">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-sky-400 flex items-center gap-2">
                          <Send className="w-4 h-4 text-sky-400" /> {t('profile.referrals.tgLinkTitle', 'Посилання на Telegram-бота')}
                        </label>
                        <span className="text-[10px] text-zinc-500 font-mono">Telegram bot link</span>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 items-center">
                        <input 
                          readOnly 
                          value={`https://t.me/${refData.botUsername || 'LordTreasury_bot'}?start=ref_${user?.username}`} 
                          className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-4 py-3 text-sky-400 font-mono text-sm outline-none font-bold select-all" 
                        />
                        <button 
                          onClick={() => copyToClipboard(`https://t.me/${refData.botUsername || 'LordTreasury_bot'}?start=ref_${user?.username}`)} 
                          className="w-full sm:w-auto px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white font-black uppercase tracking-wider text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(14,165,233,0.25)] hover:scale-105 shrink-0"
                        >
                          <Copy className="w-4 h-4" /> {t('profile.referrals.copy', 'Копіювати')}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ВІДСОТКИ ВИНАГОРОД ПО КАТЕГОРІЯХ */}
                  {refData.categoryPercents && (
                    <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 mb-8">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black uppercase tracking-wider text-zinc-300">
                          {t('profile.referrals.ratesTitle', 'Ваші відсотки винагороди по категоріях')}
                        </span>
                        <span className="text-[10px] font-bold text-amber-500/90 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                          🌐 Сайт + 🤖 Telegram
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        <div className="bg-zinc-900/80 border border-white/[0.05] p-3 rounded-xl">
                          <div className="text-[11px] text-emerald-400 font-bold mb-1">🌾 Ресурси (RSS)</div>
                          <div className="text-lg font-black text-white font-mono">{refData.categoryPercents.rss ?? 0}%</div>
                        </div>
                        <div className="bg-zinc-900/80 border border-white/[0.05] p-3 rounded-xl">
                          <div className="text-[11px] text-cyan-400 font-bold mb-1">💎 Сапфіри (Gems)</div>
                          <div className="text-lg font-black text-white font-mono">{refData.categoryPercents.gems ?? 0}%</div>
                        </div>
                        <div className="bg-zinc-900/80 border border-white/[0.05] p-3 rounded-xl">
                          <div className="text-[11px] text-purple-400 font-bold mb-1">📦 Інші товари</div>
                          <div className="text-lg font-black text-white font-mono">{refData.categoryPercents.other ?? 0}%</div>
                        </div>
                        <div className="bg-zinc-900/80 border border-white/[0.05] p-3 rounded-xl">
                          <div className="text-[11px] text-rose-400 font-bold mb-1">🏰 Акаунти</div>
                          <div className="text-lg font-black text-white font-mono">{refData.categoryPercents.account ?? 0}%</div>
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-3 leading-relaxed">
                        💡 {t('profile.referrals.universalNote', 'Універсальна система: діє для покупок на сайті та через Telegram-бота. Винагорода падає на баланс після завершення замовлення (статус «Виконано»).')}
                      </p>
                    </div>
                  )}

                  <div>
                    <h3 className="text-xl font-black text-white mb-5 uppercase tracking-wider">{t('profile.referrals.whomInvited', 'Кого ви запросили:')}</h3>
                    {refData.isLoading ? (
                      <div className="flex justify-center py-6"><Loader2 className="w-8 h-8 text-amber-500 animate-spin" /></div>
                    ) : refData.list.length === 0 ? (
                      <div className="text-center py-10 bg-zinc-950 border border-dashed border-zinc-800 rounded-3xl text-zinc-500 font-medium">
                        {t('profile.referrals.noInvitedYet', 'Ви ще нікого не запросили. Поділіться своїм посиланням!')}
                      </div>
                    ) : (
                      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-inner divide-y divide-zinc-800/80">
                        {refData.list.map((refUser) => {
                          const earnedAmount = Number(refUser.earned || 0);
                          const ordersCount = refUser.orders_count || 0;

                          return (
                            <div key={refUser.id} className="p-5 flex items-center justify-between gap-4 hover:bg-zinc-900/40 transition-colors">
                              <div className="flex items-center gap-4 min-w-0">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/80 flex items-center justify-center text-amber-500 text-lg font-black uppercase shadow-inner flex-shrink-0">
                                  {refUser.username.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-base font-bold text-white tracking-wide truncate">{refUser.username}</div>
                                  <div className="text-xs text-zinc-500 font-medium flex items-center gap-2 mt-0.5">
                                    <span>{ordersCount > 0 ? `${ordersCount} ${t('profile.referrals.ordersCount', 'замовлень')}` : t('profile.referrals.noOrdersYet', 'Ще без замовлень')}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right flex-shrink-0">
                                <div className={`text-base sm:text-lg font-black tracking-tight ${earnedAmount > 0 ? 'text-emerald-400 drop-shadow-sm' : 'text-zinc-500'}`}>
                                  {earnedAmount > 0 ? `+$${earnedAmount.toFixed(2)}` : '$0.00'}
                                </div>
                                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">
                                  {earnedAmount > 0 ? t('profile.referrals.broughtYou', 'Приніс вам') : t('profile.referrals.noProfit', 'Без доходу')}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* === ВКЛАДКА: РАНГ ТА КЕШБЕК === */}
          {activeTab === 'cashback' && (
            <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-8 duration-700 shadow-xl relative overflow-hidden space-y-8">
              <div className="absolute -top-24 -right-24 w-80 h-80 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none"></div>

              {/* ЗАГОЛОВОК */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                    <Crown className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white">
                      {t('profile.cashback.title', 'Кешбек та ранги')}
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {t('profile.cashback.subtitle', 'Купуйте за монети сайту, підвищуйте ранг та отримуйте кешбек на свій баланс!')}
                    </p>
                  </div>
                </div>

                <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-black self-start sm:self-auto flex items-center gap-1.5 uppercase tracking-wider">
                  <Crown className="w-3.5 h-3.5" />
                  <span>{userTierData?.current_tier?.name || user?.tier_name || 'Base'}</span>
                </div>
              </div>

              {/* КАРТКА ПОТОЧНОГО РАНГУ ТА ПРОГРЕСУ */}
              <div className="bg-gradient-to-br from-zinc-950 via-zinc-900/90 to-amber-950/20 border border-amber-500/20 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-widest text-amber-400/80 mb-1">
                      {t('profile.cashback.currentRank', 'Ваш поточний ранг')}
                    </div>
                    <div className="text-3xl md:text-4xl font-black text-white flex items-center gap-3">
                      <span>{userTierData?.current_tier?.name || user?.tier_name || 'Base'}</span>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wide">
                        Tier {userTierData?.tiers?.findIndex(t => t.id === (userTierData?.current_tier?.id || 'base')) + 1 || 1}
                      </span>
                    </div>
                  </div>

                  <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <Coins className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        {t('profile.cashback.totalSpent', 'Сума покупок за весь час')}
                      </div>
                      <div className="text-2xl font-black text-white font-mono">
                        ${(userTierData?.total_spent ?? user?.total_spent ?? 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ШКАЛА ПРОГРЕСУ ДО НАСТУПНОГО РАНГУ */}
                {userTierData?.next_tier ? (
                  <div className="space-y-2.5 pt-4 border-t border-zinc-800/80">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-400 font-medium">
                        {t('profile.cashback.toNextRank', 'До рангу {{rank}} залишилося:', { rank: userTierData.next_tier.name })}
                        <b className="text-amber-400 font-mono ml-1.5 font-bold">
                          ${(userTierData.needed_for_next ?? 0).toFixed(2)}
                        </b>
                      </span>
                      <span className="text-white font-mono font-black">
                        {(userTierData.progress_pct ?? 0).toFixed(0)}%
                      </span>
                    </div>

                    <div className="w-full bg-zinc-950 border border-zinc-800 rounded-full h-3.5 overflow-hidden p-0.5">
                      <div 
                        className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                        style={{ width: `${Math.min(100, Math.max(0, userTierData.progress_pct ?? 0))}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between text-[11px] text-zinc-500 font-mono pt-0.5">
                      <span>${(userTierData.current_tier?.threshold ?? 0).toFixed(0)}</span>
                      <span className="text-amber-400 font-bold">Наступний: {userTierData.next_tier.name} (${userTierData.next_tier.threshold})</span>
                    </div>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-zinc-800/80 text-emerald-400 text-xs font-bold flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>{t('profile.cashback.maxRankAchieved', '👑 Ви досягли максимального рангу Emperor з найвищими ставками кешбеку!')}</span>
                  </div>
                )}
              </div>

              {/* АКТИВНІ ВІДСОТКИ КЕШБЕКУ ПОТОЧНОГО РАНГУ */}
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  {t('profile.cashback.ratesTitle', 'Ваші активні відсотки кешбеку')}
                </h3>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* RSS */}
                  <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
                    <span className="text-xs font-bold text-emerald-400 mb-2">🌾 {t('profile.cashback.rss', 'Ресурси (RSS)')}</span>
                    <div className="text-2xl font-black text-amber-400 font-mono">
                      {userTierData?.current_tier?.rss ?? 0}%
                    </div>
                  </div>

                  {/* Gems */}
                  <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
                    <span className="text-xs font-bold text-cyan-400 mb-2">💎 {t('profile.cashback.gems', 'Сапфіри (Gems)')}</span>
                    <div className="text-2xl font-black text-amber-400 font-mono">
                      {userTierData?.current_tier?.gems ?? 0}%
                    </div>
                  </div>

                  {/* Other */}
                  <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
                    <span className="text-xs font-bold text-purple-400 mb-2">📦 {t('profile.cashback.other', 'Інші товари')}</span>
                    <div className="text-2xl font-black text-amber-400 font-mono">
                      {userTierData?.current_tier?.other ?? 0}%
                    </div>
                  </div>

                  {/* Accounts */}
                  <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
                    <span className="text-xs font-bold text-rose-400 mb-2">🏰 {t('profile.cashback.account', 'Акаунти')}</span>
                    <div className="text-2xl font-black text-amber-400 font-mono">
                      {userTierData?.current_tier?.account ?? 0}%
                    </div>
                  </div>
                </div>
              </div>

              {/* ПРАВИЛА НАРАХУВАННЯ */}
              <div className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-5 space-y-2">
                <div className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  {t('profile.cashback.noticeTitle', 'Правила нарахування винагород')}
                </div>
                <ul className="text-xs text-amber-200/80 space-y-1.5 pl-5 list-disc leading-relaxed">
                  <li>{t('profile.cashback.rule1', 'Кешбек нараховується виключно при оплаті монетами сайту (з внутрішнього балансу).')}</li>
                  <li>{t('profile.cashback.rule2', 'Монети кешбеку та реферальні бонуси потрапляють на баланс тільки після переведення замовлення в статус «Виконано».')}</li>
                </ul>
              </div>

              {/* ТАБЛИЦЯ ВСІХ 5 РАНГІВ */}
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  {t('profile.cashback.roadmapTitle', 'Усі 5 рангів кешбеку')}
                </h3>

                <div className="space-y-3">
                  {(userTierData?.tiers || userTierData?.all_tiers || []).map((tier, idx) => {
                    const isCurrent = (userTierData?.current_tier?.id || 'base') === tier.id;
                    const totalSpent = userTierData?.total_spent ?? user?.total_spent ?? 0;
                    const isUnlocked = totalSpent >= tier.threshold;

                    return (
                      <div 
                        key={tier.id}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          isCurrent 
                            ? 'bg-gradient-to-r from-amber-950/40 via-zinc-900 to-amber-950/20 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/30' 
                            : isUnlocked 
                              ? 'bg-zinc-950/60 border-zinc-800/80 text-zinc-300'
                              : 'bg-zinc-950/30 border-zinc-800/40 opacity-70 text-zinc-500'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border ${
                            isCurrent 
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md' 
                              : isUnlocked
                                ? 'bg-zinc-800 text-amber-400 border-zinc-700'
                                : 'bg-zinc-900 text-zinc-600 border-zinc-800'
                          }`}>
                            {idx + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-base font-black text-white">{tier.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black uppercase tracking-wider">
                                  {t('profile.cashback.statusCurrent', 'Поточний')}
                                </span>
                              )}
                              {!isCurrent && isUnlocked && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 font-bold uppercase tracking-wider">
                                  {t('profile.cashback.statusUnlocked', 'Досягнуто')}
                                </span>
                              )}
                              {!isUnlocked && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-500 border border-zinc-800 font-bold uppercase tracking-wider">
                                  {t('profile.cashback.statusLocked', 'Заблоковано')}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-400 mt-0.5">
                              {t('profile.cashback.threshold', 'Поріг покупок:')} <b className="text-white font-mono">${tier.threshold}</b>
                            </div>
                          </div>
                        </div>

                        {/* ВІДСОТКИ РАНГУ */}
                        <div className="flex items-center gap-3 text-xs font-mono">
                          <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-emerald-400">
                            🌾 {tier.rss}%
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-cyan-400">
                            💎 {tier.gems}%
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-purple-400">
                            📦 {tier.other}%
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-rose-400">
                            🏰 {tier.account}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
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

                    const { title: displayTitle, message: displayMsg } = localizeNotification(notif);

                    return (
                      <div 
                        key={notif.id} 
                        onClick={() => handleMarkNotificationAsRead(notif)}
                        className={`${bgClass} border ${borderClass} p-5 md:p-6 rounded-2xl flex gap-5 transition-all relative overflow-hidden shadow-inner ${!notif.is_read ? 'cursor-pointer hover:border-amber-500/50 active:scale-[0.99]' : ''}`}
                      >
                        {!notif.is_read && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)]"></div>}
                        <div className="mt-0.5">{icon}</div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2 gap-2">
                            <div className={`text-base font-black ${notif.is_read ? 'text-zinc-400' : 'text-white'}`}>{displayTitle}</div>
                            <div className="flex items-center gap-2">
                              {!notif.is_read && (
                                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Check className="w-3 h-3" /> {t('profile.notifications.tapToRead', 'Натисніть щоб прочитати')}
                                </span>
                              )}
                              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-md">{date}</div>
                            </div>
                          </div>
                          <div className={`text-sm font-medium ${notif.is_read ? 'text-zinc-500' : 'text-zinc-300'} leading-relaxed`}>
                            {displayMsg}
                          </div>
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