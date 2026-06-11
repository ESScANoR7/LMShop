import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  Shield, PackageOpen, LayoutGrid, Ticket, ClipboardList, LayoutDashboard, Coins, Users
} from 'lucide-react';
import { apiGet, handleApiError } from '../config/apiClient';
import { API_ENDPOINTS, getFullUrl } from '../config/api';
import ConfirmDialog from '../components/ConfirmDialog';

// 🔥 ІМПОРТ ВСІХ РОЗДІЛЕНИХ КОМПОНЕНТІВ 🔥
import AdminDashboard from '../components/admin/AdminDashboard';
import AdminUsers from '../components/admin/AdminUsers';
import AdminOrders from '../components/admin/AdminOrders';
import AdminCashback from '../components/admin/AdminCashback';
import AdminPromo from '../components/admin/AdminPromo';
import AdminResources from '../components/admin/AdminResources';
import AdminOther from '../components/admin/AdminOther';
import AdminAccounts from '../components/admin/AdminAccounts';

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
    isDangerous: false
  });

  const openConfirmDialog = (title, message, onConfirm, isDangerous = false) => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm, isDangerous });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null, isDangerous: false });
  };

  useEffect(() => {
    fetchOrders(); 
    fetchAccounts();
    fetchResourcesAndGems();
    fetchOtherItems();
    fetchPromocodes(); 
    fetchUsers(); 

    // 🔥 ТИХЕ АВТООНОВЛЕННЯ ЗАМОВЛЕНЬ (POLLING) 🔥
    const fetchOrdersSilent = async () => {
      try {
        const data = await apiGet(getFullUrl(API_ENDPOINTS.ORDERS));
        setAdminOrders(prevOrders => {
          if (prevOrders.length > 0 && data.length > prevOrders.length) {
            toast.success("Нове замовлення!", { duration: 5000, icon: '📦' });
          }
          return data;
        });
      } catch (error) { }
    };

    const intervalId = setInterval(fetchOrdersSilent, 10000); 
    return () => clearInterval(intervalId); 
  }, []);

  // --- ГЛОБАЛЬНІ ФУНКЦІЇ FETCH ---
  const fetchUsers = async () => {
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
  };

  const fetchOrders = async () => {
    try {
      const data = await apiGet(getFullUrl(API_ENDPOINTS.ORDERS));
      setAdminOrders(data);
    } catch (error) {
      handleApiError(error, t('common.error'));
    }
  };

  const fetchAccounts = async () => {
    try {
      const data = await apiGet(getFullUrl(API_ENDPOINTS.ACCOUNTS));
      setAdminAccounts(data);
    } catch (error) {
      handleApiError(error, t('common.error'));
    }
  };

  const fetchPromocodes = async () => {
    try {
      const data = await apiGet(getFullUrl(API_ENDPOINTS.PROMOCODES));
      setAdminPromoList(data);
    } catch (error) {
      handleApiError(error, t('common.error'));
    }
  };

  const fetchResourcesAndGems = async () => {
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
  };

  const fetchOtherItems = async () => {
    try {
      const data = await apiGet(getFullUrl(API_ENDPOINTS.OTHER_ITEMS));
      setAdminOtherItems(data);
    } catch (error) {
      handleApiError(error, t('common.error'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row pb-20 pt-8 gap-6 max-w-[1400px] mx-auto px-4">
      
      {/* ЛІВА ПАНЕЛЬ: МЕНЮ */}
      <aside className="w-full md:w-64 flex-shrink-0">
        <div className="bg-slate-900 border border-blue-500/30 rounded-3xl p-4 sticky top-24 shadow-2xl shadow-blue-900/10 z-20">
          <div className="px-4 pb-6 mb-4 border-b border-slate-800">
            <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 uppercase tracking-widest">
              {t('admin.title')}
            </h2>
          </div>

          <nav className="space-y-2">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <LayoutDashboard className="w-5 h-5" /> {t('admin.sidebar.dashboard')}
            </button>
            <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-sm font-bold ${activeTab === 'orders' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <div className="flex items-center gap-3"><ClipboardList className="w-5 h-5" /> {t('admin.sidebar.orders')}</div>
              {adminOrders.filter(o => o.status === 'new').length > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{adminOrders.filter(o => o.status === 'new').length}</span>
              )}
            </button>
            <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold ${activeTab === 'users' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <Users className="w-5 h-5" /> {t('admin.sidebar.users')}
            </button>

            <button onClick={() => setActiveTab('cashback')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold ${activeTab === 'cashback' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <Coins className="w-5 h-5" /> {t('admin.sidebar.cashback')}
            </button>
            <button onClick={() => setActiveTab('accounts')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold ${activeTab === 'accounts' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <Shield className="w-5 h-5" /> {t('admin.sidebar.accounts')}
            </button>
            <button onClick={() => setActiveTab('resources')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold ${activeTab === 'resources' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <PackageOpen className="w-5 h-5" /> {t('admin.sidebar.resources')}
            </button>
            <button onClick={() => setActiveTab('other')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold ${activeTab === 'other' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <LayoutGrid className="w-5 h-5" /> {t('admin.sidebar.other')}
            </button>
            <button onClick={() => setActiveTab('promo')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold ${activeTab === 'promo' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <Ticket className="w-5 h-5" /> {t('admin.sidebar.promo')}
            </button>
          </nav>
        </div>
      </aside>

      {/* ПРАВА ПАНЕЛЬ */}
      <main className="flex-1">
        {activeTab === 'dashboard' && (
          <AdminDashboard adminOrders={adminOrders} adminUsers={adminUsers} adminPromoList={adminPromoList} setActiveTab={setActiveTab} />
        )}
        {activeTab === 'users' && (
          <AdminUsers adminUsers={adminUsers} fetchUsers={fetchUsers} openConfirmDialog={openConfirmDialog} />
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
        {/* 🔥 ВКЛАДКА: АКАУНТИ (ВИКЛИК КОМПОНЕНТА) 🔥 */}
        {activeTab === 'accounts' && (
          <AdminAccounts 
            adminAccounts={adminAccounts} 
            fetchAccounts={fetchAccounts} 
            openConfirmDialog={openConfirmDialog} 
          />
        )}
      </main>

      {/* Confirm Dialog */}
      {confirmDialog.isOpen && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={closeConfirmDialog}
          isDangerous={confirmDialog.isDangerous}
        />
      )}
    </div>
  );
};

export default Admin;