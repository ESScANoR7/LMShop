import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ClipboardList, Clock, PieChart, ChevronUp, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiPut, handleApiError } from '../../config/apiClient';
import { API_ENDPOINTS, getFullUrl } from '../../config/api';

const AdminOrders = ({ adminOrders, fetchOrders }) => {
  const { t } = useTranslation();
  
  // Ці стани раніше були в Admin.jsx, тепер вони ізольовані тут!
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const handleOrderStatusChange = async (id, newStatus) => {
    const toastId = toast.loading(t('common.loading'));
    try {
      await apiPut(getFullUrl(API_ENDPOINTS.ORDER_STATUS(id)), { status: newStatus });
      toast.success(t('common.success'), { id: toastId });
      fetchOrders();
    } catch (error) {
      handleApiError(error, t('common.error'));
      toast.dismiss(toastId);
    }
  };

  const filteredOrders = adminOrders.filter(order => {
    const matchesStatus = orderStatusFilter === 'all' || order.status === orderStatusFilter;
    const searchLower = orderSearchQuery.toLowerCase();
    
    if (!searchLower) return matchesStatus;

    const matchesId = order.id.toString().includes(searchLower);
    
    const matchesCartData = order.cart.some(item => {
      if (!item.userData) return false;
      const nick = (item.userData.nickname || '').toLowerCase();
      const coords = (item.userData.coordinates || '').toLowerCase();
      const guild = (item.userData.guild || '').toLowerCase();
      return nick.includes(searchLower) || coords.includes(searchLower) || guild.includes(searchLower);
    });

    return matchesStatus && (matchesId || matchesCartData);
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{t('admin.orders.title')}</h1>
          <p className="text-sm text-slate-400">{t('admin.orders.desc')}</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex gap-2 bg-slate-800 p-1.5 rounded-xl border border-slate-700 overflow-x-auto scrollbar-hide w-full md:w-auto">
            <button onClick={() => setOrderStatusFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${orderStatusFilter === 'all' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}>{t('admin.orders.filterAll')}</button>
            <button onClick={() => setOrderStatusFilter('new')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${orderStatusFilter === 'new' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>{t('admin.orders.filterNew')}</button>
            <button onClick={() => setOrderStatusFilter('processing')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${orderStatusFilter === 'processing' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>{t('admin.orders.filterProcessing')}</button>
            <button onClick={() => setOrderStatusFilter('completed')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${orderStatusFilter === 'completed' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>{t('admin.orders.filterCompleted')}</button>
            <button onClick={() => setOrderStatusFilter('cancelled')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${orderStatusFilter === 'cancelled' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>{t('admin.orders.filterCancelled')}</button>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder={t('admin.orders.searchPlaceholder')} 
              value={orderSearchQuery}
              onChange={(e) => setOrderSearchQuery(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none w-full transition-colors"
            />
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center text-slate-500 py-16 border-2 border-dashed border-slate-800 rounded-2xl">
            <ClipboardList className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <p>{t('admin.orders.notFound')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map(order => {
              const date = order.created_at ? new Date(order.created_at).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Невідомо';
              const isExpanded = expandedOrderId === order.id;

              return (
                <div key={order.id} className={`bg-slate-800/50 border rounded-2xl p-5 flex flex-col lg:flex-row gap-6 transition-all ${order.status === 'new' ? 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'border-slate-700'}`}>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <span className="bg-slate-950 text-white font-mono text-sm px-3 py-1 rounded-lg border border-slate-700">#{order.id}</span>
                      <span className="text-slate-400 text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> {date}</span>
                      <span className="text-emerald-400 text-xs font-bold uppercase border border-emerald-500/30 px-2 py-0.5 rounded bg-emerald-900/20">{order.paymentMethod}</span>
                    </div>

                    <div className="space-y-3">
                      {order.cart.map((item, idx) => (
                        <div key={idx} className="bg-slate-900 border border-slate-700 p-3 rounded-xl">
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-bold text-sm text-white">{item.product?.name || item.product?.title || 'Товар'}</div>
                            <div className="font-bold text-emerald-400">${item.price}</div>
                          </div>
                          
                          {item.userData && (
                            <div className="text-xs text-slate-400 space-y-1 bg-slate-800/50 p-2 rounded-lg mt-2">
                              {item.userData.nickname && <div><span className="text-slate-500">{t('admin.orders.nickname')}</span> <span className="text-white">{item.userData.nickname}</span></div>}
                              {item.userData.guild && <div><span className="text-slate-500">{t('admin.orders.guild')}</span> <span className="text-white">{item.userData.guild}</span></div>}
                              {item.userData.coordinates && <div><span className="text-slate-500">{t('admin.orders.coords')}</span> <span className="text-white">{item.userData.coordinates}</span></div>}
                              {item.userData.details && <div><span className="text-slate-500">{t('admin.orders.details')}</span> <span className="text-blue-300">{item.userData.details}</span></div>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="w-full lg:w-64 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-700 pt-4 lg:pt-0 lg:pl-6 flex-shrink-0">
                    <div>
                      <div className="text-xs text-slate-400 mb-1">{t('admin.orders.totalSum')}</div>
                      <div className="text-3xl font-black text-white mb-2">${order.total}</div>
                      <div className="text-sm font-bold text-emerald-500 mb-6 flex items-center gap-1"><PieChart className="w-4 h-4"/> {t('admin.orders.profit')} +${order.profit}</div>
                      
                      <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">{t('admin.orders.statusLabel')}</label>
                      <select 
                        value={order.status}
                        onChange={(e) => handleOrderStatusChange(order.id, e.target.value)}
                        className={`w-full text-sm font-bold py-3 px-4 rounded-xl outline-none cursor-pointer border transition-colors
                          ${order.status === 'new' ? 'bg-blue-900/30 text-blue-400 border-blue-500/50' : 
                            order.status === 'processing' ? 'bg-amber-900/30 text-amber-400 border-amber-500/50' : 
                            order.status === 'completed' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/50' : 
                            'bg-red-900/30 text-red-400 border-red-500/50'}
                        `}
                      >
                        <option value="new">{t('admin.orders.statusNew')}</option>
                        <option value="processing">{t('admin.orders.statusProcessing')}</option>
                        <option value="completed">{t('admin.orders.statusCompleted')}</option>
                        <option value="cancelled">{t('admin.orders.statusCancelled')}</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;