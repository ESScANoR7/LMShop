import React from 'react';
import { useTranslation } from 'react-i18next';
import { DollarSign, PieChart, TrendingUp, ShoppingBag, Users, Ticket, ClipboardList, Clock } from 'lucide-react';

const AdminDashboard = ({ 
  adminOrders, 
  adminUsers, 
  adminPromoList, 
  setActiveTab 
}) => {
  const { t } = useTranslation();

  // --- ОБЧИСЛЕННЯ ДЛЯ ДАШБОРДУ ---
  const completedOrders = adminOrders.filter(o => o.status === 'completed');
  const totalRevenue = completedOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
  const totalProfit = completedOrders.reduce((sum, order) => sum + parseFloat(order.profit || 0), 0);
  const totalPromoUses = adminPromoList.reduce((sum, p) => sum + (p.current_uses || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-lg">
        <h1 className="text-2xl font-bold text-white mb-1">{t('admin.dashboard.title')}</h1>
        <p className="text-sm text-slate-400">{t('admin.dashboard.desc')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
          <div className="flex items-start justify-between mb-4 relative z-10">
            <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400"><DollarSign className="w-6 h-6" /></div>
          </div>
          <div className="relative z-10">
            <h3 className="text-slate-400 text-sm font-medium mb-1">{t('admin.dashboard.revenue')}</h3>
            <div className="text-3xl font-black text-white">${totalRevenue.toFixed(2)}</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 relative overflow-hidden group shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl group-hover:bg-emerald-500/30 transition-all"></div>
          <div className="flex items-start justify-between mb-4 relative z-10">
            <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400"><PieChart className="w-6 h-6" /></div>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="relative z-10">
            <h3 className="text-slate-300 text-sm font-bold mb-1">{t('admin.dashboard.profit')}</h3>
            <div className="text-3xl font-black text-emerald-400">${totalProfit.toFixed(2)}</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
          <div className="flex items-start justify-between mb-4 relative z-10">
            <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400"><ShoppingBag className="w-6 h-6" /></div>
          </div>
          <div className="relative z-10">
            <h3 className="text-slate-400 text-sm font-medium mb-1">{t('admin.dashboard.completedOrders')}</h3>
            <div className="text-3xl font-black text-white">{completedOrders.length}</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all"></div>
          <div className="flex items-start justify-between mb-4 relative z-10">
            <div className="p-3 bg-rose-500/20 rounded-2xl text-rose-400"><Users className="w-6 h-6" /></div>
          </div>
          <div className="relative z-10">
            <h3 className="text-slate-400 text-sm font-medium mb-1">{t('admin.dashboard.totalUsers')}</h3>
            <div className="text-3xl font-black text-white">{adminUsers.length}</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all"></div>
          <div className="flex items-start justify-between mb-4 relative z-10">
            <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-400"><Ticket className="w-6 h-6" /></div>
          </div>
          <div className="relative z-10">
            <h3 className="text-slate-400 text-sm font-medium mb-1">{t('admin.dashboard.promoActivations')}</h3>
            <div className="text-3xl font-black text-white">{totalPromoUses}</div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">{t('admin.dashboard.recentOrders')}</h2>
          <button onClick={() => setActiveTab('orders')} className="text-sm font-bold text-blue-400 hover:text-white transition-colors">{t('admin.dashboard.viewAllOrders')}</button>
        </div>
        
        <div className="space-y-3">
          {adminOrders.slice(0, 5).map(order => (
            <div key={order.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center justify-between hover:bg-slate-800 transition-colors cursor-pointer" onClick={() => setActiveTab('orders')}>
              <div className="flex items-center gap-4">
                <div className="bg-slate-950 text-white font-mono text-xs px-2 py-1 rounded border border-slate-700">#{order.id}</div>
                <div>
                  <div className="text-white font-bold text-sm mb-0.5">{t('admin.dashboard.sum')} ${order.total} <span className="text-emerald-500 text-xs ml-2">(+${order.profit})</span></div>
                  <div className="text-slate-400 text-xs">{order.cart.length} {t('admin.dashboard.items')}</div>
                </div>
              </div>
              <div>
                {order.status === 'new' && <span className="text-[10px] uppercase font-bold bg-blue-900/30 text-blue-400 border border-blue-500/30 px-2 py-1 rounded">{t('admin.orderStatus.new')}</span>}
                {order.status === 'processing' && <span className="text-[10px] uppercase font-bold bg-amber-900/30 text-amber-400 border border-amber-500/30 px-2 py-1 rounded">{t('admin.orderStatus.processing')}</span>}
                {order.status === 'completed' && <span className="text-[10px] uppercase font-bold bg-emerald-900/30 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded">{t('admin.orderStatus.completed')}</span>}
                {order.status === 'cancelled' && <span className="text-[10px] uppercase font-bold bg-red-900/30 text-red-400 border border-red-500/30 px-2 py-1 rounded">{t('admin.orderStatus.cancelled')}</span>}
              </div>
            </div>
          ))}
          {adminOrders.length === 0 && <div className="text-slate-500 text-sm py-4 text-center">{t('admin.dashboard.noOrders')}</div>}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;