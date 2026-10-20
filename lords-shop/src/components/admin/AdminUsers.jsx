import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Users, User, UserX, UserCheck, AlertTriangle, Coins, Check, X, RefreshCw, ShoppingBag, ArrowRight, ShieldAlert, Sparkles, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiPost, handleApiError } from '../../config/apiClient';
import { API_ENDPOINTS, getFullUrl } from '../../config/api';

const AdminUsers = ({ adminUsers, fetchUsers, openConfirmDialog, adminOrders = [] }) => {
  const { t } = useTranslation();
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  
  // 🔥 НОВЕ: Стейт для Детального Профілю Юзера 🔥
  const [selectedProfileUser, setSelectedProfileUser] = useState(null);
  
  // Стейт для Бану
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [selectedUserToBan, setSelectedUserToBan] = useState(null);
  const [banReason, setBanReason] = useState('');

  // 🔥 НОВЕ: Стейт для Зміни Балансу 🔥
  const [selectedBalanceUser, setSelectedBalanceUser] = useState(null);
  const [balanceAction, setBalanceAction] = useState('add'); // 'add', 'set', 'reset'
  const [balanceAmount, setBalanceAmount] = useState('');
  const [isSubmittingBalance, setIsSubmittingBalance] = useState(false);

  // ==========================================
  // ЛОГІКА БЛОКУВАННЯ (БАНУ)
  // ==========================================
  const handleBanUser = async (e) => {
    e.preventDefault();
    if (!banReason.trim()) return toast.error(t('admin.users.banReasonLabel') || 'Введіть причину');

    const toastId = toast.loading(t('common.loading') || 'Обробка...');
    try {
      await apiPost(getFullUrl(API_ENDPOINTS.ADMIN_USER_BAN(selectedUserToBan.id)), {
        reason: banReason,
        ban_ip: true
      });

      toast.success(t('common.success') || 'Успішно', { id: toastId });
      setIsBanModalOpen(false);
      setBanReason('');
      setSelectedUserToBan(null);
      fetchUsers();
    } catch (error) {
      handleApiError(error, t('common.error') || 'Помилка');
      toast.dismiss(toastId);
    }
  };

  const handleUnbanUser = async (userId, username) => {
    openConfirmDialog(
      t('admin.users.unbanBtn') || 'Розблокувати',
      `${t('common.confirm') || 'Підтверджуєте'} ${username}?`,
      async () => {
        const toastId = toast.loading(t('common.loading') || 'Обробка...');
        try {
          await apiPost(getFullUrl(API_ENDPOINTS.ADMIN_USER_UNBAN(userId)), {});

          toast.success(t('common.success') || 'Успішно', { id: toastId });
          fetchUsers();
        } catch (error) {
          handleApiError(error, t('common.error') || 'Помилка');
          toast.dismiss(toastId);
        }
      },
      false
    );
  };

  // ==========================================
  // 🔥 НОВЕ: ЛОГІКА ЗМІНИ БАЛАНСУ 🔥
  // ==========================================
  const handleUpdateBalance = async () => {
    if (!selectedBalanceUser) return;
    if (balanceAction !== 'reset' && (!balanceAmount || parseFloat(balanceAmount) <= 0)) {
      return toast.error("Введіть коректну суму");
    }

    setIsSubmittingBalance(true);
    const toastId = toast.loading('Оновлення балансу...');

    try {
      const payload = {
        action: balanceAction,
        amount: balanceAction === 'reset' ? 0.0 : parseFloat(balanceAmount)
      };

      await apiPost(getFullUrl(`/api/admin/users/${selectedBalanceUser.id}/balance`), payload);
      
      toast.success('Баланс успішно змінено!', { id: toastId });
      setSelectedBalanceUser(null);
      setBalanceAmount('');
      fetchUsers(); // Оновлюємо список
    } catch (error) {
      handleApiError(error, 'Помилка оновлення балансу');
      toast.dismiss(toastId);
    } finally {
      setIsSubmittingBalance(false);
    }
  };

  // Статистика для швидких фільтрів
  const activeCount = adminUsers.filter(u => !u.is_banned).length;
  const bannedCount = adminUsers.filter(u => u.is_banned).length;
  const withBalanceCount = adminUsers.filter(u => (parseFloat(u.balance) || 0) > 0).length;
  const withRefsCount = adminUsers.filter(u => (parseInt(u.referral_count) || 0) > 0).length;

  // Фільтрація користувачів
  const filteredUsers = adminUsers.filter(u => {
    const searchLower = userSearchQuery.toLowerCase();
    const matchesSearch = 
      (u.username || '').toLowerCase().includes(searchLower) || 
      (u.ip || '').toLowerCase().includes(searchLower) ||
      (u.id.toString() === searchLower);
      
    if (userFilter === 'active') return matchesSearch && !u.is_banned;
    if (userFilter === 'banned') return matchesSearch && u.is_banned;
    if (userFilter === 'balance') return matchesSearch && (parseFloat(u.balance) || 0) > 0;
    if (userFilter === 'refs') return matchesSearch && (parseInt(u.referral_count) || 0) > 0;
    return matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between bg-[#0c1017] border border-white/[0.08] p-6 rounded-3xl shadow-2xl gap-4">
        <div>
          <h1 className="text-2xl font-black text-white mb-1 flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-gradient-to-br from-red-600/20 to-rose-600/10 border border-red-500/20 text-rose-500">
              <Users className="w-6 h-6" />
            </span>
            {t('admin.users.title') || 'Користувачі'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Керуйте базою клієнтів, їх балансами, рефералами та статусами блокування • Всього: <span className="font-bold text-slate-200">{adminUsers.length}</span>
          </p>
        </div>

        {/* Фільтри з лічильниками */}
        <div className="flex flex-wrap items-center bg-[#070b12] p-1.5 rounded-2xl border border-white/[0.06] w-full lg:w-auto gap-1">
          <button 
            onClick={() => setUserFilter('all')} 
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              userFilter === 'all' 
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_0_12px_rgba(225,29,72,0.35)]' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>{t('admin.users.filterAll') || 'Всі'}</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-black/30 rounded-full">{adminUsers.length}</span>
          </button>
          
          <button 
            onClick={() => setUserFilter('balance')} 
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              userFilter === 'balance' 
                ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.35)]' 
                : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            <span>З балансом</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-emerald-950/60 text-emerald-300 rounded-full">{withBalanceCount}</span>
          </button>

          <button 
            onClick={() => setUserFilter('active')} 
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              userFilter === 'active' 
                ? 'bg-slate-800 text-white border border-slate-700' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>{t('admin.users.filterActive') || 'Активні'}</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-black/30 rounded-full">{activeCount}</span>
          </button>

          <button 
            onClick={() => setUserFilter('banned')} 
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              userFilter === 'banned' 
                ? 'bg-rose-600 text-white shadow-[0_0_12px_rgba(225,29,72,0.35)]' 
                : 'text-slate-400 hover:text-rose-400'
            }`}
          >
            <span>{t('admin.users.filterBanned') || 'Заблоковані'}</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-rose-950/60 text-rose-300 rounded-full">{bannedCount}</span>
          </button>

          <button 
            onClick={() => setUserFilter('refs')} 
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              userFilter === 'refs' 
                ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.35)]' 
                : 'text-slate-400 hover:text-blue-400'
            }`}
          >
            <span>Реферали</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-blue-950/60 text-blue-300 rounded-full">{withRefsCount}</span>
          </button>
        </div>
      </div>

      <div className="relative w-full">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input 
          type="text" 
          placeholder={t('admin.users.searchPlaceholder') || 'Пошук за ніком, ID, IP...'} 
          value={userSearchQuery}
          onChange={(e) => setUserSearchQuery(e.target.value)}
          className="bg-[#0c1017] border border-white/[0.08] rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-slate-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none w-full shadow-lg transition-all"
        />
      </div>

      <div className="bg-[#0c1017] border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-950/50 border-b border-slate-800 text-xs uppercase font-bold text-slate-500 tracking-wider">
                <th className="p-4 pl-6 w-20">{t('admin.users.thUser') || 'Користувач'}</th>
                <th className="p-4">{t('admin.users.thBalance') || 'Баланс'}</th>
                <th className="p-4">{t('admin.users.thIP') || 'IP'}</th>
                {/* 🔥 НОВЕ: Колонки для Рефералки 🔥 */}
                <th className="p-4 text-center">Запросив</th>
                <th className="p-4 text-center">Заробив (Ref)</th>
                <th className="p-4 text-center">{t('admin.users.thActions') || 'Дії'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">{t('admin.users.notFound') || 'Не знайдено'}</td>
                </tr>
              ) : (
                filteredUsers.map(u => (
                  <tr 
                    key={u.id} 
                    onClick={() => setSelectedProfileUser(u)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    title="Натисніть для перегляду профілю"
                  >
                    
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white ${u.is_banned ? 'bg-rose-900/50 border border-rose-500/50' : 'bg-gradient-to-br from-blue-600 to-indigo-600'}`}>
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-2 group-hover:text-blue-400 transition-colors">
                            {u.username}
                            {u.is_banned && <AlertTriangle className="w-3 h-3 text-rose-500" title="Заблоковано" />}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">ID: #{u.id}</div>
                          {/* Показуємо, хто його запросив, якщо є */}
                          {u.referred_by && u.referred_by !== "Ніхто" && (
                            <div className="text-[10px] text-blue-400 mt-0.5">Від: {u.referred_by}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 🔥 БАЛАНС З КНОПКОЮ РЕДАГУВАННЯ 🔥 */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-emerald-400">${u.balance?.toFixed(2) || '0.00'}</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedBalanceUser(u); }}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700"
                          title="Керувати балансом"
                        >
                          <Coins className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-1 rounded inline-block border border-slate-800">
                        {u.ip || t('admin.users.noData') || 'Невідомо'}
                      </div>
                    </td>

                    {/* 🔥 РЕФЕРАЛЬНА СТАТИСТИКА 🔥 */}
                    <td className="p-4 text-center font-bold text-sm text-blue-400">
                      {u.referral_count || 0} <span className="text-[10px] text-slate-500 ml-1">чол.</span>
                    </td>
                    <td className="p-4 text-center font-black text-sm text-amber-400">
                      +${u.referral_earnings?.toFixed(2) || '0.00'}
                    </td>

                    <td className="p-4 text-center">
                      {u.is_banned ? (
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-[10px] uppercase font-bold bg-rose-900/30 text-rose-400 border border-rose-500/30 px-2 py-1 rounded inline-block" title={u.ban_reason}>
                            {t('admin.users.bannedLabel') || 'BANNED'}
                          </span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleUnbanUser(u.id, u.username); }} 
                            className="text-xs text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1"
                          >
                            <UserCheck className="w-3 h-3" /> {t('admin.users.unbanBtn') || 'Розблокувати'}
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedUserToBan(u); setIsBanModalOpen(true); }} 
                          className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 font-bold text-xs rounded-lg transition-all flex items-center gap-1 mx-auto"
                        >
                          <UserX className="w-3 h-3" /> {t('admin.users.banBtn') || 'Бан'}
                        </button>
                      )}
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================== */}
      {/* 🔥 МОДАЛКА ЗМІНИ БАЛАНСУ 🔥 */}
      {/* ========================================================== */}
      {selectedBalanceUser && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c1017] border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2"><Coins className="w-5 h-5 text-emerald-400" /> Баланс: {selectedBalanceUser.username}</h3>
              <button onClick={() => setSelectedBalanceUser(null)} className="p-1.5 hover:bg-white/[0.06] rounded-xl text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
              {/* ВИБІР ДІЇ */}
              <div className="grid grid-cols-3 bg-[#070b12] p-1 rounded-2xl border border-white/[0.06]">
                <button onClick={() => setBalanceAction('add')} className={`py-1.5 rounded-xl text-xs font-bold transition-all ${balanceAction === 'add' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400'}`}>➕ Додати</button>
                <button onClick={() => setBalanceAction('set')} className={`py-1.5 rounded-xl text-xs font-bold transition-all ${balanceAction === 'set' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-slate-400'}`}>✏️ Встановити</button>
                <button onClick={() => setBalanceAction('reset')} className={`py-1.5 rounded-xl text-xs font-bold transition-all ${balanceAction === 'reset' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-slate-400'}`}>🧹 Обнулити</button>
              </div>

              {/* ПОЛЕ ДЛЯ СУМИ */}
              {balanceAction !== 'reset' && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Сума (USDT)</label>
                  <input 
                    type="number" 
                    placeholder="100.00"
                    value={balanceAmount}
                    onChange={(e) => setBalanceAmount(e.target.value)}
                    className="w-full bg-[#070b12] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white font-bold text-sm focus:border-red-500 outline-none transition-colors"
                  />
                </div>
              )}

              <button 
                onClick={handleUpdateBalance}
                disabled={isSubmittingBalance}
                className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 font-bold text-sm text-white rounded-xl transition-all shadow-[0_0_15px_rgba(225,29,72,0.3)] flex items-center justify-center gap-2"
              >
                {isSubmittingBalance ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Підтвердити зміни
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* МОДАЛЬНЕ ВІКНО БАНУ */}
      {/* ========================================================== */}
      {isBanModalOpen && selectedUserToBan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsBanModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-[#0c1017] border border-rose-500/30 rounded-3xl shadow-2xl p-6">
            <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
              <UserX className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="text-2xl font-black text-white text-center mb-2">{t('admin.users.banModalTitle') || 'Блокування'}</h2>
            <p className="text-center text-slate-400 text-sm mb-6">
              {t('admin.users.banModalDesc1') || 'Ви впевнені, що хочете заблокувати'} <strong className="text-white">{selectedUserToBan.username}</strong> (IP: {selectedUserToBan.ip}){t('admin.users.banModalDesc2') || '?'}
            </p>
            
            <form onSubmit={handleBanUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('admin.users.banReasonLabel') || 'Причина'}</label>
                <input 
                  type="text" 
                  required
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder={t('admin.users.banReasonPlaceholder') || 'Порушення правил...'} 
                  className="w-full bg-[#070b12] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:border-rose-500 outline-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsBanModalOpen(false)} className="flex-1 py-3 bg-white/[0.06] hover:bg-white/[0.1] text-white font-bold rounded-xl transition-colors">
                  {t('admin.users.cancelBtn') || 'Скасувати'}
                </button>
                <button type="submit" className="flex-1 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-xl transition-colors shadow-[0_0_15px_rgba(225,29,72,0.35)]">
                  {t('admin.users.confirmBanBtn') || 'Підтвердити'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 🔥 ДЕТАЛЬНИЙ ПРОФІЛЬ ЮЗЕРА (R3) 🔥 */}
      {/* ========================================================== */}
      {selectedProfileUser && (() => {
        const userOrders = adminOrders.filter(o => o.user_id === selectedProfileUser.id);
        const completedUserOrders = userOrders.filter(o => o.status === 'completed');
        const totalSpent = completedUserOrders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);

        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setSelectedProfileUser(null)}>
            <div className="bg-[#0c1017] border border-white/10 rounded-3xl p-6 max-w-xl w-full shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={(e) => e.stopPropagation()}>
              
              {/* Хедер модалки */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-rose-500" />
                  <h3 className="text-lg font-black text-white">Профіль користувача</h3>
                </div>
                <button 
                  onClick={() => setSelectedProfileUser(null)} 
                  className="p-1.5 hover:bg-white/[0.06] rounded-xl text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Картка користувача */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 mb-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl text-white flex-shrink-0 ${
                  selectedProfileUser.is_banned 
                    ? 'bg-rose-900/50 border-2 border-rose-500/50' 
                    : 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-900/30'
                }`}>
                  {selectedProfileUser.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-black text-white truncate">{selectedProfileUser.username}</span>
                    {selectedProfileUser.is_banned ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-900/40 text-rose-400 border border-rose-500/40">
                        ЗАБЛОКОВАНО
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-900/40 text-emerald-400 border border-emerald-500/40">
                        АКТИВНИЙ
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    ID: #{selectedProfileUser.id} • IP: {selectedProfileUser.ip || 'Невідомо'}
                  </div>
                  {selectedProfileUser.email && (
                    <div className="text-xs text-slate-500 truncate mt-0.5">{selectedProfileUser.email}</div>
                  )}
                </div>
              </div>

              {/* Сітка статистики */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Баланс</div>
                  <div className="text-lg font-black text-emerald-400">${selectedProfileUser.balance?.toFixed(2) || '0.00'}</div>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Замовлень</div>
                  <div className="text-lg font-black text-white">{userOrders.length}</div>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Витрачено</div>
                  <div className="text-lg font-black text-blue-400">${totalSpent.toFixed(2)}</div>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Запросив</div>
                  <div className="text-lg font-black text-indigo-400">{selectedProfileUser.referral_count || 0} чол.</div>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Заробив (Ref)</div>
                  <div className="text-lg font-black text-amber-400">+${selectedProfileUser.referral_earnings?.toFixed(2) || '0.00'}</div>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Хто запросив</div>
                  <div className="text-sm font-bold text-slate-300 truncate">{selectedProfileUser.referred_by || 'Органічний'}</div>
                </div>
              </div>

              {/* Причина бану (якщо є) */}
              {selectedProfileUser.is_banned && selectedProfileUser.ban_reason && (
                <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs text-rose-300 mb-5 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Причина блокування:</span> {selectedProfileUser.ban_reason}
                  </div>
                </div>
              )}

              {/* Останні замовлення цього юзера */}
              <div className="mb-5">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Історія замовлень ({userOrders.length})</span>
                </div>
                {userOrders.length === 0 ? (
                  <div className="text-xs text-slate-600 bg-slate-950/40 p-4 rounded-xl text-center border border-slate-800">
                    У цього користувача ще немає замовлень
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                    {userOrders.slice(0, 5).map(o => (
                      <div key={o.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-500">#{o.id}</span>
                          <span className="font-bold text-white">${o.total}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 font-mono">
                            {o.created_at ? new Date(o.created_at).toLocaleDateString('uk-UA') : '—'}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-slate-800 text-slate-300">
                            {o.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Кнопки швидких дій */}
              <div className="flex flex-wrap gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    const u = selectedProfileUser;
                    setSelectedProfileUser(null);
                    setSelectedBalanceUser(u);
                  }}
                  className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md"
                >
                  <Coins className="w-3.5 h-3.5" />
                  Керувати балансом
                </button>

                {selectedProfileUser.is_banned ? (
                  <button
                    type="button"
                    onClick={() => {
                      const u = selectedProfileUser;
                      setSelectedProfileUser(null);
                      handleUnbanUser(u.id, u.username);
                    }}
                    className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Розблокувати
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const u = selectedProfileUser;
                      setSelectedProfileUser(null);
                      setSelectedUserToBan(u);
                      setIsBanModalOpen(true);
                    }}
                    className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    Заблокувати
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedProfileUser(null)}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl transition-all"
                >
                  Закрити
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default AdminUsers;