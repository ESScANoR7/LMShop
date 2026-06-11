import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Users, UserX, UserCheck, AlertTriangle, Coins } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiPost, handleApiError } from '../../config/apiClient';
import { API_ENDPOINTS, getFullUrl } from '../../config/api';

const AdminUsers = ({ adminUsers, fetchUsers, openConfirmDialog }) => {
  const { t } = useTranslation();
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [selectedUserToBan, setSelectedUserToBan] = useState(null);
  const [banReason, setBanReason] = useState('');

  const handleBanUser = async (e) => {
    e.preventDefault();
    if (!banReason.trim()) return toast.error(t('admin.users.banReasonLabel'));

    const toastId = toast.loading(t('common.loading'));
    try {
      await apiPost(getFullUrl(API_ENDPOINTS.ADMIN_USER_BAN(selectedUserToBan.id)), {
        reason: banReason,
        ban_ip: true
      });

      toast.success(t('common.success'), { id: toastId });
      setIsBanModalOpen(false);
      setBanReason('');
      setSelectedUserToBan(null);
      fetchUsers();
    } catch (error) {
      handleApiError(error, t('common.error'));
      toast.dismiss(toastId);
    }
  };

  const handleUnbanUser = async (userId, username) => {
    openConfirmDialog(
      t('admin.users.unbanBtn'),
      `${t('common.confirm')} ${username}?`,
      async () => {
        const toastId = toast.loading(t('common.loading'));
        try {
          await apiPost(getFullUrl(API_ENDPOINTS.ADMIN_USER_UNBAN(userId)), {});

          toast.success(t('common.success'), { id: toastId });
          fetchUsers();
        } catch (error) {
          handleApiError(error, t('common.error'));
          toast.dismiss(toastId);
        }
      },
      false
    );
  };

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
            <Users className="w-6 h-6 text-rose-500" /> {t('admin.users.title')}
          </h1>
          <p className="text-sm text-slate-400">{t('admin.users.desc')}</p>
        </div>
        <div className="flex bg-slate-800 p-1.5 rounded-xl border border-slate-700 w-full sm:w-auto">
          <button onClick={() => setUserFilter('all')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all ${userFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>{t('admin.users.filterAll')}</button>
          <button onClick={() => setUserFilter('active')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all ${userFilter === 'active' ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white'}`}>{t('admin.users.filterActive')}</button>
          <button onClick={() => setUserFilter('banned')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all ${userFilter === 'banned' ? 'bg-rose-600/30 text-rose-400 border border-rose-500/30' : 'text-slate-400 hover:text-white'}`}>{t('admin.users.filterBanned')}</button>
        </div>
      </div>

      <div className="relative w-full">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input 
          type="text" 
          placeholder={t('admin.users.searchPlaceholder')} 
          value={userSearchQuery}
          onChange={(e) => setUserSearchQuery(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:border-rose-500 outline-none w-full shadow-lg transition-colors"
        />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 border-b border-slate-800 text-xs uppercase font-bold text-slate-500 tracking-wider">
                <th className="p-4 pl-6">{t('admin.users.thUser')}</th>
                <th className="p-4">{t('admin.users.thBalance')}</th>
                <th className="p-4">{t('admin.users.thIP')}</th>
                <th className="p-4">{t('admin.users.thRef')}</th>
                <th className="p-4 text-center">{t('admin.users.thActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500">{t('admin.users.notFound')}</td>
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
                            {u.is_banned && <AlertTriangle className="w-3 h-3 text-rose-500" />}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">ID: {u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-amber-400 font-bold flex items-center gap-1">
                        {u.balance.toFixed(2)} <Coins className="w-3 h-3" />
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-1 rounded inline-block border border-slate-800">
                        {u.ip || t('admin.users.noData')}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-xs">
                        {u.referred_by !== "Ніхто" && u.referred_by && (
                          <div className="text-slate-500 mb-1">{t('admin.users.referredBy')} <span className="text-blue-400">{u.referred_by}</span></div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                            👥 {u.referral_count}
                          </span>
                          <span className="font-bold text-emerald-400">
                            +${u.referral_earnings.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {u.is_banned ? (
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-[10px] uppercase font-bold bg-rose-900/30 text-rose-400 border border-rose-500/30 px-2 py-1 rounded inline-block" title={u.ban_reason}>
                            {t('admin.users.bannedLabel')}
                          </span>
                          <button onClick={() => handleUnbanUser(u.id, u.username)} className="text-xs text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1">
                            <UserCheck className="w-3 h-3" /> {t('admin.users.unbanBtn')}
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => { setSelectedUserToBan(u); setIsBanModalOpen(true); }} className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 font-bold text-xs rounded-lg transition-all flex items-center gap-1 mx-auto">
                          <UserX className="w-3 h-3" /> {t('admin.users.banBtn')}
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

      {/* МОДАЛЬНЕ ВІКНО БАНУ */}
      {isBanModalOpen && selectedUserToBan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsBanModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-3xl shadow-2xl p-6">
            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
              <UserX className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="text-2xl font-black text-white text-center mb-2">{t('admin.users.banModalTitle')}</h2>
            <p className="text-center text-slate-400 text-sm mb-6">
              {t('admin.users.banModalDesc1')} <strong className="text-white">{selectedUserToBan.username}</strong> (IP: {selectedUserToBan.ip}){t('admin.users.banModalDesc2')}
            </p>
            
            <form onSubmit={handleBanUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('admin.users.banReasonLabel')}</label>
                <input 
                  type="text" 
                  required
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder={t('admin.users.banReasonPlaceholder')} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:border-rose-500 outline-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsBanModalOpen(false)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors">
                  {t('admin.users.cancelBtn')}
                </button>
                <button type="submit" className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-colors shadow-[0_0_15px_rgba(225,29,72,0.3)]">
                  {t('admin.users.confirmBanBtn')}
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