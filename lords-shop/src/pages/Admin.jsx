import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  Shield, PackageOpen, LayoutGrid, Ticket, ClipboardList, LayoutDashboard, Coins, Users, Bell, Wallet, ShieldCheck
} from 'lucide-react';
import { apiGet, handleApiError } from '../config/apiClient';
import { API_ENDPOINTS, getFullUrl } from '../config/api';
import ConfirmDialog from '../components/ConfirmDialog';

// 🔥 ІМПОРТ ВСІХ КОМПОНЕНТІВ 🔥
import AdminDashboard from '../components/admin/AdminDashboard';
import AdminUsers from '../components/admin/AdminUsers';
import AdminOrders from '../components/admin/AdminOrders';
import AdminCashback from '../components/admin/AdminCashback';
import AdminPromo from '../components/admin/AdminPromo';
import AdminResources from '../components/admin/AdminResources';
import AdminOther from '../components/admin/AdminOther';
import AdminAccounts from '../components/admin/AdminAccounts';
import AdminNotifications from '../components/admin/AdminNotifications'; 
import AdminAccounting from '../components/admin/AdminAccounting'; // 🔥 ПІДКЛЮЧЕНО БУХГАЛТЕРІЮ 🔥
import AdminStoreSettings from '../components/admin/AdminStoreSettings';
import AdminSecurity from '../components/admin/AdminSecurity'; // 🔐 БЕЗПЕКА
import { Settings } from 'lucide-react'; // Додай Settings до імпорту іконок з lucide-react

const Admin = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('dashboard');

  // --- ГЛОБАЛЬНІ ДАНІ ДЛЯ ВСІХ ВКЛАДОК ---
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminOrders, setAdminOrders] = useState([]);
  const [adminPromoList, setAdminPromoList] = useState([]);
  const [adminRssPacks, setAdminRssPacks] = useState([]);
  const [adminGemsRates, setAdminGemsRates] = useState([]);
  const [adminOtherItems, setAdminOtherItems] = useState([]);
  const [adminAccounts, setAdminAccounts] = useState([]);

  // --- СТАНИ ДЛЯ CONFIRM DIALOGS ---
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    isDangerous: false,
    isLoading: false,
  });

  const openConfirmDialog = (title, message, onConfirm, isDangerous = false) => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm, isDangerous, isLoading: false });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null, isDangerous: false, isLoading: false });
  };

  // 🔥 ФІКС БАГУ: закриваємо модалку МИТТЄВО при підтвердженні без жодного пролагу!
  const handleConfirmAction = async () => {
    if (!confirmDialog.onConfirm) return;
    const action = confirmDialog.onConfirm;
    closeConfirmDialog(); // Миттєво ховаємо вікно діалогу
    try {
      await action();
    } catch (error) {
      console.error('Помилка виконання дії підтвердження:', error);
    }
  };

  // 🔔 Звукове сповіщення про нове замовлення через Web Audio API (без сторонніх файлів)
  const playOrderChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const playTone = (freq, start, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      playTone(587.33, 0, 0.22); // Note D5
      playTone(880.00, 0.18, 0.38); // Note A5
    } catch (e) {
      console.warn("Помилка відтворення звуку замовлення:", e);
    }
  };

  // 🚨 Блимання заголовка вкладки при новому замовленні
  const blinkIntervalRef = useRef(null);
  const originalTitleRef = useRef(document.title || 'LordTreasury Admin');

  const startTitleBlink = (newCount = 1) => {
    if (blinkIntervalRef.current) return;
    originalTitleRef.current = document.title || 'LordTreasury Admin';
    let isAlert = true;

    blinkIntervalRef.current = setInterval(() => {
      document.title = isAlert ? `(${newCount}) 📦 НОВЕ ЗАМОВЛЕННЯ!` : originalTitleRef.current;
      isAlert = !isAlert;
    }, 1000);

    const stopBlink = () => {
      if (blinkIntervalRef.current) {
        clearInterval(blinkIntervalRef.current);
        blinkIntervalRef.current = null;
      }
      document.title = originalTitleRef.current;
      window.removeEventListener('focus', stopBlink);
      window.removeEventListener('click', stopBlink);
    };

    window.addEventListener('focus', stopBlink);
    window.addEventListener('click', stopBlink);
  };

  useEffect(() => {
    fetchOrders(); 
    fetchAccounts();
    fetchResourcesAndGems();
    fetchOtherItems();
    fetchPromocodes(); 
    fetchUsers(); 

    // 🔥 ТИХЕ АВТООНОВЛЕННЯ ЗАМОВЛЕНЬ (POLLING) З ОПОВІЩЕННЯМ 🔥
    const fetchOrdersSilent = async () => {
      try {
        const data = await apiGet(getFullUrl(API_ENDPOINTS.ORDERS));
        setAdminOrders(prevOrders => {
          if (prevOrders.length > 0 && data.length > prevOrders.length) {
            const diff = data.length - prevOrders.length;
            toast.success(`Нове замовлення (+${diff})!`, { duration: 6000, icon: '📦' });
            playOrderChime();
            startTitleBlink(diff);
          }
          return data;
        });
      } catch (error) { }
    };

    const intervalId = setInterval(fetchOrdersSilent, 10000); 
    return () => {
      clearInterval(intervalId);
      if (blinkIntervalRef.current) {
        clearInterval(blinkIntervalRef.current);
        document.title = originalTitleRef.current;
      }
    };
  }, []);

  // --- ГЛОБАЛЬНІ ФУНКЦІЇ FETCH ---
  async function fetchUsers() {
    try {
      const data = await apiGet(getFullUrl(API_ENDPOINTS.ADMIN_USERS));
      setAdminUsers(data);
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        toast.error(t('common.error'));
      } else {
        handleApiError(error, t('common.error'));
      }
    }
  }

  async function fetchOrders() {
    try {
      const data = await apiGet(getFullUrl(API_ENDPOINTS.ORDERS));
      setAdminOrders(data);
    } catch (error) {
      handleApiError(error, t('common.error'));
    }
  }

  async function fetchAccounts() {
    try {
      const data = await apiGet(getFullUrl(API_ENDPOINTS.ACCOUNTS));
      setAdminAccounts(data);
    } catch (error) {
      handleApiError(error, t('common.error'));
    }
  }

  async function fetchPromocodes() {
    try {
      const data = await apiGet(getFullUrl(API_ENDPOINTS.PROMOCODES));
      setAdminPromoList(data);
    } catch (error) {
      handleApiError(error, t('common.error'));
    }
  }

  async function fetchResourcesAndGems() {
    try {
      const [resourcesData, gemsData] = await Promise.all([
        apiGet(getFullUrl(API_ENDPOINTS.RESOURCES)),
        apiGet(getFullUrl(API_ENDPOINTS.GEMS))
      ]);
      setAdminRssPacks(resourcesData);
      setAdminGemsRates(gemsData);
    } catch (error) {
      handleApiError(error, t('common.error'));
    }
  }

  const fetchOtherItems = async () => {
    try {
      const data = await apiGet(getFullUrl(API_ENDPOINTS.OTHER_ITEMS + '?all=true'));
      setAdminOtherItems(data);
    } catch (error) {
      handleApiError(error, t('common.error'));
    }
  };

  const newOrdersCount = adminOrders.filter(o => o.status === 'new').length;

  const navSections = [
    {
      title: 'Огляд & Замовлення',
      items: [
        { id: 'dashboard', label: t('admin.sidebar.dashboard', 'Дашборд'), icon: LayoutDashboard },
        { id: 'orders', label: t('admin.sidebar.orders', 'Замовлення'), icon: ClipboardList, badge: newOrdersCount, isAlertBadge: true },
      ]
    },
    {
      title: 'Каталог товарів',
      items: [
        { id: 'accounts', label: t('admin.sidebar.accounts', 'Акаунти'), icon: Shield, badge: adminAccounts.length ? `${adminAccounts.length}` : null },
        { id: 'resources', label: t('admin.sidebar.resources', 'Ресурси (RSS)'), icon: PackageOpen },
        { id: 'other', label: t('admin.sidebar.other', 'Сапфіри & Буст'), icon: LayoutGrid },
        { id: 'promo', label: t('admin.sidebar.promo', 'Промокоди'), icon: Ticket },
      ]
    },
    {
      title: 'Фінанси & Клієнти',
      items: [
        { id: 'users', label: t('admin.sidebar.users', 'Користувачі'), icon: Users, badge: adminUsers.length ? `${adminUsers.length}` : null },
        { id: 'accounting', label: 'Зарплати воркерів', icon: Wallet },
        { id: 'cashback', label: t('admin.sidebar.cashback', 'Кешбек'), icon: Coins },
      ]
    },
    {
      title: 'Система & Вітрина',
      items: [
        { id: 'store_settings', label: 'Офлайн & TG Вітрина', icon: Settings },
        { id: 'security', label: 'Безпека & Логи', icon: ShieldCheck },
        { id: 'notifications', label: 'Сповіщення', icon: Bell },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#070a0f] flex flex-col md:flex-row pb-20 pt-6 gap-6 max-w-[1440px] mx-auto px-4">
      
      {/* 📱 МОБІЛЬНЕ МЕНЮ ВКЛАДОК (ГОРИЗОНТАЛЬНИЙ СКРОЛ БЕЗ ВАЖКИХ БЛОКІВ) */}
      <div className="md:hidden flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {navSections.flatMap(s => s.items).map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 border ${
                isActive 
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white border-red-500/50 shadow-[0_0_15px_rgba(225,29,72,0.4)]'
                  : 'bg-slate-900/90 text-slate-400 hover:text-white border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
              {item.badge && item.badge !== '0' && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  item.isAlertBadge ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-slate-300'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 🖥️ ДЕСКТОПНА ПАНЕЛЬ: ЧОРНО-ЧЕРВОНЕ МЕНЮ */}
      <aside className="hidden md:block w-64 lg:w-72 flex-shrink-0">
        <div className="bg-[#0c1017] border border-slate-800/90 rounded-3xl p-4 sticky top-24 shadow-2xl shadow-black/80 backdrop-blur-xl">
          
          {/* ШАПКА АДМІНКИ З ЧЕРВОНИМ АКЦЕНТОМ */}
          <div className="px-4 py-4 mb-4 border-b border-slate-800/80 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" />
                <span className="text-[10px] font-black tracking-widest uppercase text-red-400">COMMAND CENTER</span>
              </div>
              <h2 className="text-xl font-black text-white tracking-wide">
                Lords <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-400">Admin</span>
              </h2>
            </div>
          </div>

          <nav className="space-y-4 max-h-[calc(100vh-210px)] overflow-y-auto pr-1 admin-scrollbar">
            {navSections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-1">
                <div className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  {section.title}
                </div>
                {section.items.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all text-xs font-bold border ${
                        isActive
                          ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white border-red-500/50 shadow-[0_0_18px_rgba(225,29,72,0.35)] translate-x-1'
                          : 'text-slate-400 hover:text-white hover:bg-slate-850 hover:bg-slate-800/60 hover:border-slate-700/60 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-red-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && item.badge !== '0' && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          item.isAlertBadge && Number(item.badge) > 0
                            ? 'bg-red-500 text-white animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* ПРАВА ПАНЕЛЬ */}
      <main className="flex-1 min-w-0">
        {activeTab === 'dashboard' && (
          <AdminDashboard adminOrders={adminOrders} adminUsers={adminUsers} adminPromoList={adminPromoList} setActiveTab={setActiveTab} />
        )}
        {activeTab === 'users' && (
          <AdminUsers adminUsers={adminUsers} fetchUsers={fetchUsers} openConfirmDialog={openConfirmDialog} adminOrders={adminOrders} />
        )}
        
        {/* 🔥 ВИКЛИК НОВОЇ ВКЛАДКИ ЗАРПЛАТ 🔥 */}
        {activeTab === 'accounting' && (
          <AdminAccounting openConfirmDialog={openConfirmDialog} />
        )}

        {activeTab === 'notifications' && (
          <AdminNotifications adminUsers={adminUsers} />
        )}
        {activeTab === 'orders' && (
          <AdminOrders adminOrders={adminOrders} fetchOrders={fetchOrders} />
        )}
        {activeTab === 'cashback' && (
          <AdminCashback />
        )}
        {activeTab === 'promo' && (
          <AdminPromo adminPromoList={adminPromoList} fetchPromocodes={fetchPromocodes} adminAccounts={adminAccounts} adminOtherItems={adminOtherItems} adminRssPacks={adminRssPacks} adminGemsRates={adminGemsRates} />
        )}
        {activeTab === 'resources' && (
          <AdminResources adminRssPacks={adminRssPacks} setAdminRssPacks={setAdminRssPacks} adminGemsRates={adminGemsRates} setAdminGemsRates={setAdminGemsRates} fetchResourcesAndGems={fetchResourcesAndGems} />
        )}
        {activeTab === 'other' && (
          <AdminOther adminOtherItems={adminOtherItems} setAdminOtherItems={setAdminOtherItems} fetchOtherItems={fetchOtherItems} openConfirmDialog={openConfirmDialog} />
        )}
        {activeTab === 'accounts' && (
          <AdminAccounts 
            adminAccounts={adminAccounts} 
            fetchAccounts={fetchAccounts} 
            openConfirmDialog={openConfirmDialog} 
          />
        )}
        {activeTab === 'store_settings' && (
  <AdminStoreSettings />
)}
        {activeTab === 'security' && (
          <AdminSecurity />
        )}
      </main>

      {/* Confirm Dialog */}
      {confirmDialog.isOpen && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={handleConfirmAction}
          onCancel={closeConfirmDialog}
          isDangerous={confirmDialog.isDangerous}
          isLoading={confirmDialog.isLoading}
        />
      )}
    </div>
  );
};

export default Admin;