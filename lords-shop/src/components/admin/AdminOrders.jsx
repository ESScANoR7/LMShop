import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ClipboardList, Clock, PieChart, ChevronUp, ChevronDown, MessageCircle, Send, CreditCard, EyeOff, CheckCircle2, Truck, Eye, Loader2, Download, CheckSquare, Square, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiPut, handleApiError } from '../../config/apiClient';
import { API_URL, API_ENDPOINTS, getFullUrl } from '../../config/api';

const AdminOrders = ({ adminOrders, fetchOrders }) => {
  const { t } = useTranslation();
  
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // 🔥 МАСОВІ ДІЇ 🔥
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('completed');
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  // 🔥 СТЕЙТИ ДЛЯ ЧАТУ 🔥
  const [chatData, setChatData] = useState({});
  const [chatInputs, setChatInputs] = useState({});
  const [chatSecret, setChatSecret] = useState({});
  const [isChatLoading, setIsChatLoading] = useState({});

  // 🔥 ЗАВАНТАЖЕННЯ ЧАТУ З АВТООНОВЛЕННЯМ КОЖНІ 3 СЕКУНДИ 🔥
  useEffect(() => {
    let interval;
    if (expandedOrderId) {
      fetchChat(expandedOrderId); // Перше завантаження
      interval = setInterval(() => {
        fetchChat(expandedOrderId, true); // Тихе оновлення
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [expandedOrderId]);

  const fetchChat = async (orderId, silent = false) => {
    if (!silent) setIsChatLoading(prev => ({ ...prev, [orderId]: true }));
    try {
      // 🔥 ДОДАНО cache: 'no-store' ТА ?t=... ЩОБ БРАУЗЕР НЕ КЕШУВАВ 🔥
      const res = await fetch(`${API_URL}/api/orders/${orderId}/chat?t=${Date.now()}`, { 
        credentials: 'include',
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setChatData(prev => ({ ...prev, [orderId]: data }));
      }
    } catch (err) {
      console.error(err);
    }
    if (!silent) setIsChatLoading(prev => ({ ...prev, [orderId]: false }));
  };
  
  const handleSendMessage = async (orderId) => {
    const text = chatInputs[orderId];
    if (!text?.trim()) return;

    const isSecret = !!chatSecret[orderId];

    try {
      const res = await fetch(`${API_URL}/api/orders/${orderId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: text, is_secret: isSecret })
      });
      if (res.ok) {
        setChatInputs(prev => ({ ...prev, [orderId]: '' }));
        setChatSecret(prev => ({ ...prev, [orderId]: false })); // скидаємо галочку після відправки
        fetchChat(orderId);
      } else {
        toast.error("Помилка відправки");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOrderStatusChange = async (id, newStatus) => {
    const toastId = toast.loading(t('common.loading', 'Завантаження...'));
    try {
      await apiPut(getFullUrl(API_ENDPOINTS.ORDER_STATUS(id)), { status: newStatus });
      toast.success(t('common.success', 'Успішно'), { id: toastId });
      fetchOrders();
    } catch (error) {
      handleApiError(error, t('common.error', 'Помилка'));
      toast.dismiss(toastId);
    }
  };

  const filteredOrders = adminOrders.filter(order => {
    const matchesStatus = orderStatusFilter === 'all' || order.status === orderStatusFilter;
    const searchLower = orderSearchQuery.trim().toLowerCase();
    
    if (!searchLower) return matchesStatus;

    const matchesId = order.id.toString().includes(searchLower);
    const matchesUserId = order.user_id && order.user_id.toString() === searchLower;
    const matchesTotal = order.total && order.total.toString().includes(searchLower);
    const matchesPayment = (order.paymentMethod || order.payment_method || '').toLowerCase().includes(searchLower);
    
    const matchesCartData = (order.cart || []).some(item => {
      const prodName = (item.product?.name || item.product?.title || '').toLowerCase();
      if (prodName.includes(searchLower)) return true;
      if (!item.userData) return false;
      const nick = (item.userData.nickname || '').toLowerCase();
      const coords = (item.userData.coordinates || '').toLowerCase();
      const guild = (item.userData.guild || '').toLowerCase();
      const details = (item.userData.details || '').toLowerCase();
      return nick.includes(searchLower) || coords.includes(searchLower) || guild.includes(searchLower) || details.includes(searchLower);
    });

    return matchesStatus && (matchesId || matchesUserId || matchesTotal || matchesPayment || matchesCartData);
  });

  // ✅ EXPORT CSV
  const handleExportCSV = () => {
    const bom = '\uFEFF';
    const headers = ['ID', 'Дата', 'Сума ($)', 'Прибуток ($)', 'Статус', 'Метод оплати', 'Товари', 'Нік клієнта'];
    const rows = filteredOrders.map(order => {
      const date = order.created_at ? new Date(order.created_at).toLocaleString('uk-UA') : '';
      const products = (order.cart || []).map(i => i.product?.name || i.product?.title || '').filter(Boolean).join(' | ');
      const nick = (order.cart || []).map(i => i.userData?.nickname || '').filter(Boolean).join(', ');
      return [order.id, date, order.total, order.profit, order.status, order.paymentMethod || order.payment_method || '', `"${products}"`, `"${nick}"`].join(',');
    });
    const csv = bom + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`CSV збережено! (${filteredOrders.length} рядків)`);
  };

  // ✅ МАСОВІ ДІЇ
  const toggleSelectOrder = (id, e) => {
    e.stopPropagation();
    setSelectedOrders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const handleBulkAction = async () => {
    if (selectedOrders.size === 0) return toast.error('Виберіть замовлення');
    setIsBulkLoading(true);
    const toastId = toast.loading(`Оновлення ${selectedOrders.size} замовлень...`);
    try {
      await Promise.all([...selectedOrders].map(id => apiPut(getFullUrl(API_ENDPOINTS.ORDER_STATUS(id)), { status: bulkStatus })));
      toast.success(`${selectedOrders.size} замовлень оновлено → ${bulkStatus}`, { id: toastId });
      setSelectedOrders(new Set());
      setIsBulkMode(false);
      fetchOrders();
    } catch (err) {
      handleApiError(err, 'Помилка масового оновлення');
      toast.dismiss(toastId);
    } finally {
      setIsBulkLoading(false);
    }
  };

  // ✅ СТАТУСИ З КІЛЬКОСТЯМИ ДЛЯ ФІЛЬТРІВ
  const statusCounts = useMemo(() => ({
    all: adminOrders.length,
    new: adminOrders.filter(o => o.status === 'new').length,
    awaiting_payment: adminOrders.filter(o => o.status === 'awaiting_payment').length,
    paid_processing: adminOrders.filter(o => o.status === 'paid_processing').length,
    processing: adminOrders.filter(o => o.status === 'processing').length,
    delivered: adminOrders.filter(o => o.status === 'delivered').length,
    completed: adminOrders.filter(o => o.status === 'completed').length,
  }), [adminOrders]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-lg gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{t('admin.orders.title', 'Управління замовленнями (Тікети)')}</h1>
          <p className="text-sm text-slate-400">{t('admin.orders.desc', 'Обробляйте платежі та спілкуйтеся з клієнтами')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setIsBulkMode(!isBulkMode); setSelectedOrders(new Set()); }} 
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border ${
              isBulkMode 
                ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/30' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            {isBulkMode ? 'Вимкнути вибір' : 'Масові дії'}
          </button>
          <button 
            onClick={handleExportCSV} 
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-900/10"
            title="Завантажити CSV звіт для Excel"
          >
            <Download className="w-4 h-4" />
            Експорт CSV
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg">
        {/* 🔥 ПАНЕЛЬ МАСОВИХ ДІЙ (КОЛИ УВІМКНЕНО) 🔥 */}
        {isBulkMode && (
          <div className="mb-6 p-4 rounded-2xl bg-blue-950/40 border border-blue-500/40 flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <button 
                onClick={toggleSelectAll} 
                className="flex items-center gap-2 text-xs font-bold text-blue-300 hover:text-white transition-colors bg-blue-900/40 px-3 py-1.5 rounded-lg border border-blue-500/30"
              >
                {selectedOrders.size === filteredOrders.length && filteredOrders.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-blue-400" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                {selectedOrders.size === filteredOrders.length && filteredOrders.length > 0 ? 'Зняти виділення' : `Вибрати всі (${filteredOrders.length})`}
              </button>
              <span className="text-xs font-bold text-slate-300">
                Вибрано: <strong className="text-white font-black text-sm">{selectedOrders.size}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="bg-slate-900 text-xs font-bold py-2 px-3 rounded-xl border border-slate-700 text-white outline-none"
              >
                <option value="awaiting_payment">Очікує оплати</option>
                <option value="paid_processing">Оплачено (В роботі)</option>
                <option value="processing">В обробці</option>
                <option value="delivered">Доставлено</option>
                <option value="completed">Виконано</option>
                <option value="cancelled">Скасовано</option>
              </select>

              <button
                onClick={handleBulkAction}
                disabled={isBulkLoading || selectedOrders.size === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-black rounded-xl transition-all shadow-md"
              >
                {isBulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckSquare className="w-3.5 h-3.5" />}
                Застосувати статус
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
          <div className="flex gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto custom-scrollbar w-full xl:w-auto">
            {[
              { id: 'all', label: t('admin.orders.filterAll', 'Всі'), count: statusCounts.all },
              { id: 'new', label: t('admin.orders.filterNew', 'Нові'), count: statusCounts.new, isAlert: true },
              { id: 'awaiting_payment', label: t('admin.orders.filterAwaiting', 'Очікують'), count: statusCounts.awaiting_payment },
              { id: 'paid_processing', label: t('admin.orders.filterPaid', 'Оплачені'), count: statusCounts.paid_processing },
              { id: 'processing', label: t('admin.orders.filterProcessing', 'В обробці'), count: statusCounts.processing },
              { id: 'delivered', label: t('admin.orders.filterDelivered', 'Доставлені'), count: statusCounts.delivered },
              { id: 'completed', label: t('admin.orders.filterCompleted', 'Виконані'), count: statusCounts.completed },
            ].map(f => {
              const isActive = orderStatusFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setOrderStatusFilter(f.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                    isActive
                      ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white border-red-500/50 shadow-[0_0_12px_rgba(225,29,72,0.35)]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border-transparent'
                  }`}
                >
                  <span>{f.label}</span>
                  {f.count !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      f.isAlert && f.count > 0 
                        ? 'bg-red-500 text-white animate-pulse'
                        : isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {f.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          
          <div className="relative w-full xl:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder={t('admin.orders.searchPlaceholder', 'Пошук за ID, ніком...')} 
              value={orderSearchQuery}
              onChange={(e) => setOrderSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:border-red-500 outline-none w-full transition-colors"
            />
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center text-slate-500 py-16 border-2 border-dashed border-slate-800 rounded-2xl">
            <ClipboardList className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <p>{t('admin.orders.notFound', 'Замовлень не знайдено')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map(order => {
              const date = order.created_at ? new Date(order.created_at).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Невідомо';
              const isExpanded = expandedOrderId === order.id;

              // Кольори карток в залежності від статусу
              let cardStyle = "border-slate-700 bg-slate-800/50";
              if (order.status === 'awaiting_payment') cardStyle = "border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)] bg-amber-950/10";
              if (order.status === 'paid_processing') cardStyle = "border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)] bg-blue-950/10";
              if (order.status === 'delivered') cardStyle = "border-orange-500/50 bg-orange-950/10";

              return (
                <div key={order.id} className={`border rounded-2xl transition-all overflow-hidden ${cardStyle}`}>
                  
                  {/* ШАПКА ЗАМОВЛЕННЯ */}
                  <div 
                    className="p-5 flex flex-col lg:flex-row gap-6 cursor-pointer hover:bg-slate-800/80 transition-colors"
                    onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        {isBulkMode && (
                          <button
                            type="button"
                            onClick={(e) => toggleSelectOrder(order.id, e)}
                            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                          >
                            {selectedOrders.has(order.id) ? (
                              <CheckSquare className="w-5 h-5 text-blue-400" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-500" />
                            )}
                          </button>
                        )}
                        <span className="bg-slate-950 text-white font-mono text-sm px-3 py-1 rounded-lg border border-slate-700">#{order.id}</span>
                        <span className="text-slate-400 text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> {date}</span>
                        <span className="text-slate-300 text-xs font-bold uppercase border border-slate-600 px-2 py-0.5 rounded bg-slate-800">{order.paymentMethod}</span>
                        
                        {/* Бейджі статусів */}
                        {order.status === 'new' && <span className="px-2 py-0.5 rounded text-[10px] uppercase font-black bg-slate-700 text-slate-300">{t('admin.orders.statusNew', 'Нове')}</span>}
                        {order.status === 'awaiting_payment' && <span className="px-2 py-0.5 rounded text-[10px] uppercase font-black bg-amber-500/20 text-amber-500 border border-amber-500/50 animate-pulse">{t('admin.orders.statusAwaiting', 'Очікує оплати')}</span>}
                        {order.status === 'paid_processing' && <span className="px-2 py-0.5 rounded text-[10px] uppercase font-black bg-blue-500/20 text-blue-400 border border-blue-500/50">{t('admin.orders.statusPaid', 'Оплачено')}</span>}
                        {order.status === 'processing' && <span className="px-2 py-0.5 rounded text-[10px] uppercase font-black bg-purple-500/20 text-purple-400 border border-purple-500/50">{t('admin.orders.statusProcessing', 'В роботі')}</span>}
                        {order.status === 'delivered' && <span className="px-2 py-0.5 rounded text-[10px] uppercase font-black bg-orange-500/20 text-orange-400 border border-orange-500/50">{t('admin.orders.statusDelivered', 'Відправлено')}</span>}
                        {order.status === 'completed' && <span className="px-2 py-0.5 rounded text-[10px] uppercase font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/50">{t('admin.orders.statusCompleted', 'Виконано')}</span>}
                        {order.status === 'cancelled' && <span className="px-2 py-0.5 rounded text-[10px] uppercase font-black bg-red-500/20 text-red-400 border border-red-500/50">{t('admin.orders.statusCancelled', 'Скасовано')}</span>}
                      </div>

                      <div className="space-y-3">
                        {order.cart.map((item, idx) => (
                          <div key={idx} className="bg-slate-900 border border-slate-700 p-3 rounded-xl">
                            <div className="flex justify-between items-start mb-2">
                              <div className="font-bold text-sm text-white">{item.product?.name || item.product?.title || t('common.product', 'Товар')}</div>
                              <div className="font-bold text-emerald-400">${item.price}</div>
                            </div>
                            
                            {item.userData && (
                              <div className="text-xs text-slate-400 space-y-1 bg-slate-800/50 p-2 rounded-lg mt-2">
                                {item.userData.nickname && <div><span className="text-slate-500">{t('admin.orders.nickname', 'Нік:')}</span> <span className="text-white">{item.userData.nickname}</span></div>}
                                {item.userData.guild && <div><span className="text-slate-500">{t('admin.orders.guild', 'Гільдія:')}</span> <span className="text-white">{item.userData.guild}</span></div>}
                                {item.userData.coordinates && <div><span className="text-slate-500">{t('admin.orders.coords', 'Коорд:')}</span> <span className="text-white">{item.userData.coordinates}</span></div>}
                                {item.userData.details && <div><span className="text-slate-500">{t('admin.orders.details', 'Деталі:')}</span> <span className="text-blue-300">{item.userData.details}</span></div>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="w-full lg:w-64 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-700 pt-4 lg:pt-0 lg:pl-6 flex-shrink-0">
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-xs text-slate-400 mb-1">{t('admin.orders.totalSum', 'Сума')}</div>
                            <div className="text-3xl font-black text-white mb-2">${order.total}</div>
                            <div className="text-sm font-bold text-emerald-500 mb-6 flex items-center gap-1"><PieChart className="w-4 h-4"/> +${order.profit}</div>
                          </div>
                          <div className="text-slate-500 p-2 bg-slate-900 rounded-lg">
                            {isExpanded ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}
                          </div>
                        </div>
                        
                        <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">{t('admin.orders.statusLabel', 'Статус')}</label>
                        <select 
                          value={order.status}
                          onClick={(e) => e.stopPropagation()} // щоб клік не згортав картку
                          onChange={(e) => handleOrderStatusChange(order.id, e.target.value)}
                          className="w-full bg-slate-900 text-sm font-bold py-3 px-4 rounded-xl outline-none cursor-pointer border border-slate-700 text-slate-300 transition-colors"
                        >
                          <option value="new">{t('admin.orders.statusNew', 'Нове')}</option>
                          <option value="awaiting_payment">{t('admin.orders.statusAwaiting', 'Очікує оплати')}</option>
                          <option value="paid_processing">{t('admin.orders.statusPaid', 'Оплачено (В роботі)')}</option>
                          <option value="processing">{t('admin.orders.statusProcessing', 'В обробці (Старе)')}</option>
                          <option value="delivered">{t('admin.orders.statusDelivered', 'Доставлено')}</option>
                          <option value="completed">{t('admin.orders.statusCompleted', 'Виконано')}</option>
                          <option value="cancelled">{t('admin.orders.statusCancelled', 'Скасовано')}</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* РОЗГОРНУТА ЧАСТИНА (ЧАТ І ШВИДКІ КНОПКИ) */}
                  {isExpanded && (
                    <div className="bg-slate-900/80 border-t border-slate-700 p-5 lg:p-6 animate-in slide-in-from-top-4">
                      
                      {/* 🔥 ПАНЕЛЬ ШВИДКИХ ДІЙ 🔥 */}
                      <div className="mb-6 flex flex-wrap gap-3">
                        {order.status === 'awaiting_payment' && (
                          <button 
                            onClick={() => handleOrderStatusChange(order.id, 'paid_processing')}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl font-black text-sm flex items-center gap-2 shadow-lg transition-all hover:scale-105"
                          >
                            <CheckCircle2 className="w-5 h-5" /> {t('admin.orders.btnClientPaid', 'Клієнт оплатив (В роботу)')}
                          </button>
                        )}
                        {(order.status === 'paid_processing' || order.status === 'processing' || order.status === 'new') && (
                          <button 
                            onClick={() => handleOrderStatusChange(order.id, 'delivered')}
                            className="bg-orange-600 hover:bg-orange-500 text-white px-5 py-3 rounded-xl font-black text-sm flex items-center gap-2 shadow-lg transition-all hover:scale-105"
                          >
                            <Truck className="w-5 h-5" /> {t('admin.orders.btnDelivered', 'Товар видано (Доставлено)')}
                          </button>
                        )}
                      </div>

                      {/* 🔥 ЧАТ АДМІНА 🔥 */}
                      <div className="border border-slate-700 rounded-3xl flex flex-col h-[500px] shadow-inner relative overflow-hidden bg-slate-950">
                        <div className="bg-slate-900 border-b border-slate-800 p-4 flex items-center gap-3">
                          <MessageCircle className="w-5 h-5 text-blue-400" />
                          <h4 className="font-bold text-white text-sm">{t('admin.orders.chatTitle', 'Чат з покупцем')}</h4>
                        </div>
                        
                        {/* Список повідомлень */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col custom-scrollbar">
                          {isChatLoading[order.id] && !chatData[order.id] ? (
                            <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin text-blue-500"/></div>
                          ) : chatData[order.id]?.length > 0 ? (
                            chatData[order.id].map(msg => (
                              <div key={msg.id} className={`max-w-[85%] rounded-2xl px-5 py-3 ${
                                msg.sender === 'admin' 
                                  ? 'bg-blue-600 text-white self-end rounded-br-sm shadow-md' 
                                  : msg.sender === 'system' 
                                    ? 'bg-slate-800/50 text-slate-400 self-center text-center text-xs border border-slate-700 w-full'
                                    : 'bg-slate-800 border border-slate-700 text-slate-200 self-start rounded-bl-sm'
                              }`}>
                                {msg.is_secret && <div className="text-[10px] font-black text-amber-400 mb-1.5 uppercase tracking-widest flex items-center gap-1 bg-amber-950/30 px-2 py-1 rounded inline-flex"><EyeOff className="w-3 h-3"/> {t('admin.orders.chatSecretBadge', 'Приховано з чеку')}</div>}
                                <div className="whitespace-pre-wrap text-sm font-medium">{msg.text}</div>
                                {msg.sender !== 'system' && (
                                   <div className={`text-[10px] mt-2 font-bold ${msg.sender === 'admin' ? 'text-blue-200 text-right' : 'text-slate-500'}`}>
                                     {new Date(msg.created_at).toLocaleTimeString('uk-UA', {hour: '2-digit', minute:'2-digit'})}
                                   </div>
                                 )}
                              </div>
                            ))
                          ) : (
                            <div className="m-auto text-slate-600 text-sm font-medium flex flex-col items-center gap-2">
                              <MessageCircle className="w-10 h-10 text-slate-700" />
                              {t('admin.orders.chatNoMessages', 'Немає повідомлень. Надішліть реквізити!')}
                            </div>
                          )}
                        </div>

                        {/* Поле вводу (тільки якщо замовлення не закрите) */}
                        {order.status !== 'completed' && order.status !== 'cancelled' ? (
                          <div className="bg-slate-900 border-t border-slate-800 p-4">
                            
                            {/* Галочка Секретності */}
                            <label className="flex items-center gap-2 cursor-pointer w-max mb-3 group">
                              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${chatSecret[order.id] ? 'bg-amber-500 border-amber-500 text-slate-900' : 'bg-slate-950 border-slate-700 group-hover:border-amber-500/50 text-transparent'}`}>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </div>
                              <input 
                                type="checkbox" 
                                className="hidden"
                                checked={chatSecret[order.id] || false}
                                onChange={(e) => setChatSecret(prev => ({...prev, [order.id]: e.target.checked}))}
                              />
                              <span className={`text-xs font-bold transition-colors ${chatSecret[order.id] ? 'text-amber-500' : 'text-slate-400 group-hover:text-slate-300'}`}>
                                {t('admin.orders.chatSecret', 'Це реквізити (Приховати з чеку)')}
                              </span>
                            </label>

                            <div className={`flex gap-3 items-center p-1.5 pl-4 rounded-2xl border transition-colors ${chatSecret[order.id] ? 'bg-amber-950/10 border-amber-500/50 focus-within:border-amber-500' : 'bg-slate-950 border-slate-700 focus-within:border-blue-500'}`}>
                              <input 
                                type="text" 
                                placeholder={chatSecret[order.id] ? t('admin.orders.chatSecretPlaceholder', 'Введіть номер карти або гаманець...') : t('admin.orders.chatPlaceholder', 'Напишіть повідомлення...')}
                                value={chatInputs[order.id] || ''}
                                onChange={(e) => setChatInputs(prev => ({...prev, [order.id]: e.target.value}))}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(order.id); }}
                                className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-slate-600"
                              />
                              <button 
                                onClick={() => handleSendMessage(order.id)}
                                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-lg hover:scale-105 ${chatSecret[order.id] ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                              >
                                <Send className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center p-4 bg-slate-900 border-t border-slate-800 text-slate-500 text-xs font-bold uppercase tracking-wider">
                            {t('admin.orders.ticketClosed', 'Тікет закрито (Замовлення завершено або скасовано)')}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
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