import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Users, UserX, UserCheck, AlertTriangle, Coins, Check, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiPost, handleApiError } from '../../config/apiClient';
import { API_ENDPOINTS, getFullUrl } from '../../config/api';

const AdminUsers = ({ adminUsers, fetchUsers, openConfirmDialog }) => {
  const { t } = useTranslation();
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  
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

  // Фільтрація користувачів
  const filteredUsers = adminUsers.filter(u => {
    const searchLower = userSearchQuery.toLowerCase();
    const matchesSearch = 
      (u.username || '').toLowerCase().includes(searchLower) || 
      (u.ip || '').toLowerCase().includes(searchLower) ||
      (u.id.toString() === searchLower);
      
    if (userFilter === 'active') return matchesSearch && !u.is_banned;
    if (userFilter === 'banned') return matchesSearch && u.is_banned;
    return matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-lg gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
            <Users className="w-6 h-6 text-rose-500" /> {t('admin.users.title') || 'Користувачі'}
          </h1>
          <p className="text-sm text-slate-400">{t('admin.users.desc') || `Всього: ${adminUsers.length}`}</p>
        </div>
        <div className="flex bg-slate-800 p-1.5 rounded-xl border border-slate-700 w-full sm:w-auto">
          <button onClick={() => setUserFilter('all')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all ${userFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>{t('admin.users.filterAll') || 'Всі'}</button>
          <button onClick={() => setUserFilter('active')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all ${userFilter === 'active' ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white'}`}>{t('admin.users.filterActive') || 'Активні'}</button>
          <button onClick={() => setUserFilter('banned')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all ${userFilter === 'banned' ? 'bg-rose-600/30 text-rose-400 border border-rose-500/30' : 'text-slate-400 hover:text-white'}`}>{t('admin.users.filterBanned') || 'Заблоковані'}</button>
        </div>
      </div>

      <div className="relative w-full">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input 
          type="text" 
          placeholder={t('admin.users.searchPlaceholder') || 'Пошук за ніком, ID, IP...'} 
          value={userSearchQuery}
          onChange={(e) => setUserSearchQuery(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:border-rose-500 outline-none w-full shadow-lg transition-colors"
        />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
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
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white ${u.is_banned ? 'bg-rose-900/50 border border-rose-500/50' : 'bg-gradient-to-br from-blue-600 to-indigo-600'}`}>
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-2">
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
                          onClick={() => setSelectedBalanceUser(u)}
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
                          <button onClick={() => handleUnbanUser(u.id, u.username)} className="text-xs text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1">
                            <UserCheck className="w-3 h-3" /> {t('admin.users.unbanBtn') || 'Розблокувати'}
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => { setSelectedUserToBan(u); setIsBanModalOpen(true); }} className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 font-bold text-xs rounded-lg transition-all flex items-center gap-1 mx-auto">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Coins className="w-5 h-5 text-emerald-400" /> Баланс: {selectedBalanceUser.username}</h3>
              <button onClick={() => setSelectedBalanceUser(null)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
              {/* ВИБІР ДІЇ */}
              <div className="grid grid-cols-3 bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner">
                <button onClick={() => setBalanceAction('add')} className={`py-1.5 rounded-lg text-xs font-bold transition-all ${balanceAction === 'add' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'text-slate-500'}`}>➕ Додати</button>
                <button onClick={() => setBalanceAction('set')} className={`py-1.5 rounded-lg text-xs font-bold transition-all ${balanceAction === 'set' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' : 'text-slate-500'}`}>✏️ Встановити</button>
                <button onClick={() => setBalanceAction('reset')} className={`py-1.5 rounded-lg text-xs font-bold transition-all ${balanceAction === 'reset' ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'text-slate-500'}`}>🧹 Обнулити</button>
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-bold text-sm focus:border-blue-500 outline-none transition-colors"
                  />
                </div>
              )}

              <button 
                onClick={handleUpdateBalance}
                disabled={isSubmittingBalance}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-bold text-sm text-white rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
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
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsBanModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-3xl shadow-2xl p-6">
            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
              <UserX className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="text-2xl font-black text-white text-center mb-2">{t('admin.users.banModalTitle') || 'Блокування'}</h2>
            <p className="text-center text-slate-400 text-sm mb-6">
              {t('admin.users.banModalDesc1') || 'Ви впевнені, що хочете заблокувати'} <strong className="text-white">{selectedUserToBan.username}</strong> (IP: {selectedUserToBan.ip}){t('admin.users.banModalDesc2') || '?'}
            </p>
            
            <form onSubmit={handleBanUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('admin.users.banReasonLabel') || 'Причина'}</label>
                <input 
                  type="text" 
                  required
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder={t('admin.users.banReasonPlaceholder') || 'Порушення правил...'} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:border-rose-500 outline-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsBanModalOpen(false)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors">
                  {t('admin.users.cancelBtn') || 'Скасувати'}
                </button>
                <button type="submit" className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-colors shadow-[0_0_15px_rgba(225,29,72,0.3)]">
                  {t('admin.users.confirmBanBtn') || 'Підтвердити'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;