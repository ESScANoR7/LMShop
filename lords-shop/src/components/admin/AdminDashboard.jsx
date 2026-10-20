import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign, TrendingUp, ShoppingBag, Users, Ticket, Clock,
  AlertCircle, CheckCircle, Loader2, ArrowUpRight, ArrowDownRight,
  Crown, Flame, BarChart2, Zap, Target, Star, Package
} from 'lucide-react';
import { apiGet } from '../../config/apiClient';
import { API_ENDPOINTS, getFullUrl } from '../../config/api';

// ============================================================
// МІНІМАКСНИЙ БАР-ЧАРТ (SVG, без зовнішніх бібліотек)
// ============================================================
const MiniBarChart = ({ data, colorRevenue = '#3b82f6', colorProfit = '#10b981' }) => {
  const maxVal = Math.max(...data.map(d => d.revenue || 0), 1);
  const width = 100 / data.length;

  return (
    <div className="w-full">
      {/* Легенда */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: colorRevenue }} />
          <span className="text-[11px] font-bold" style={{ color: '#94a3b8' }}>Revenue</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: colorProfit }} />
          <span className="text-[11px] font-bold" style={{ color: '#94a3b8' }}>Profit</span>
        </div>
      </div>

      {/* Бари */}
      <div className="flex items-end gap-1 h-24">
        {data.map((d, i) => {
          const revHeight = maxVal > 0 ? (d.revenue / maxVal) * 100 : 0;
          const profHeight = maxVal > 0 ? (d.profit / maxVal) * 100 : 0;
          const isToday = i === data.length - 1;
          return (
            <div key={i} className="flex-1 flex items-end gap-0.5 group relative">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-600 rounded-xl p-2.5 text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none z-10 shadow-xl">
                <div className="font-black text-white mb-1">{d.date} ({d.day})</div>
                <div style={{ color: colorRevenue }}>Revenue: <span className="font-bold">${d.revenue}</span></div>
                <div style={{ color: colorProfit }}>Profit: <span className="font-bold">${d.profit}</span></div>
                <div className="text-slate-400">Orders: <span className="font-bold text-white">{d.orders}</span></div>
              </div>
              <div
                className="flex-1 rounded-t-md transition-all duration-300"
                style={{
                  height: `${Math.max(revHeight, 4)}%`,
                  background: isToday ? colorRevenue : `${colorRevenue}90`,
                  boxShadow: isToday ? `0 0 8px ${colorRevenue}60` : 'none'
                }}
              />
              <div
                className="flex-1 rounded-t-md transition-all duration-300"
                style={{
                  height: `${Math.max(profHeight, 4)}%`,
                  background: isToday ? colorProfit : `${colorProfit}90`,
                  boxShadow: isToday ? `0 0 8px ${colorProfit}60` : 'none'
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Дати */}
      <div className="flex mt-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            <span
              className="text-[10px] font-bold"
              style={{ color: i === data.length - 1 ? '#f1f5f9' : '#475569' }}
            >
              {d.date}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// КАРТКА СТАТИСТИКИ
// ============================================================
const StatCard = ({ icon, label, value, subValue, subLabel, color, glowColor, trend, onClick }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden border cursor-default transition-all duration-300"
      style={{
        background: '#0d1117',
        borderColor: hovered ? `${glowColor}60` : '#1e293b',
        boxShadow: hovered ? `0 0 24px ${glowColor}30` : '0 2px 8px rgba(0,0,0,0.3)',
        transform: hovered ? 'translateY(-2px)' : 'none'
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {/* Фонове світіння */}
      <div
        className="absolute -right-6 -top-6 w-28 h-28 rounded-full blur-3xl transition-all duration-300"
        style={{ background: `${glowColor}${hovered ? '25' : '12'}` }}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div
            className="p-2.5 rounded-xl border"
            style={{ background: `${glowColor}20`, borderColor: `${glowColor}30`, color }}
          >
            {icon}
          </div>
          {trend !== undefined && (
            <div
              className="flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-full border"
              style={trend >= 0 ? {
                background: 'rgba(16,185,129,0.12)',
                borderColor: 'rgba(16,185,129,0.3)',
                color: '#10b981'
              } : {
                background: 'rgba(239,68,68,0.12)',
                borderColor: 'rgba(239,68,68,0.3)',
                color: '#ef4444'
              }}
            >
              {trend >= 0
                ? <ArrowUpRight className="w-3 h-3" />
                : <ArrowDownRight className="w-3 h-3" />
              }
              {Math.abs(trend)}%
            </div>
          )}
        </div>

        <div className="text-xs font-bold mb-1.5" style={{ color: '#64748b' }}>{label}</div>
        <div className="text-2xl font-black" style={{ color: '#f1f5f9' }}>{value}</div>

        {subValue !== undefined && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-xs font-black" style={{ color }}>
              {subValue}
            </span>
            {subLabel && (
              <span className="text-xs font-medium" style={{ color: '#475569' }}>{subLabel}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// ГОЛОВНИЙ КОМПОНЕНТ ДАШБОРДУ
// ============================================================
const AdminDashboard = ({ adminOrders, adminUsers, adminPromoList, setActiveTab }) => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const data = await apiGet(getFullUrl(API_ENDPOINTS.ADMIN_DASHBOARD_STATS));
        setStats(data);
      } catch (err) {
        setError('Не вдалося завантажити статистику');
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
    // Оновлення кожні 30 секунд
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fallback розрахунки із props (якщо API ще не відповів)
  const completedOrders = adminOrders.filter(o => o.status === 'completed');
  const totalRevenueFallback = completedOrders.reduce((s, o) => s + parseFloat(o.total || 0), 0);
  const totalProfitFallback = completedOrders.reduce((s, o) => s + parseFloat(o.profit || 0), 0);
  const newOrdersCount = adminOrders.filter(o => o.status === 'new').length;

  // Використовуємо дані з API або fallback
  const overview = stats?.overview;
  const today = stats?.today;
  const chart = stats?.daily_chart || [];
  const topProducts = stats?.top_products || [];
  const recentOrders = stats?.recent_orders || adminOrders.slice(0, 8).map(o => ({
    id: o.id, total: o.total, profit: o.profit, status: o.status,
    payment_method: o.payment_method, created_at: '—'
  }));

  const statusConfig = {
    new:        { label: 'Нове',        bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.4)', color: '#60a5fa' },
    processing: { label: 'В роботі',    bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', color: '#fbbf24' },
    completed:  { label: 'Виконано',    bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', color: '#34d399' },
    cancelled:  { label: 'Скасовано',   bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',  color: '#f87171' },
    awaiting_payment: { label: 'Очікує оплату', bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.4)', color: '#a78bfa' },
  };

  if (isLoading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
        <p className="text-slate-400 font-medium text-sm">Завантаження статистики...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ─── ШАПКА ─── */}
      <div
        className="rounded-2xl p-5 sm:p-6 border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ background: '#0d1117', borderColor: '#1e293b' }}
      >
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <BarChart2 className="w-6 h-6 text-blue-400" />
            Аналітика та Статистика
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Реальні дані. Оновлюється кожні 30 секунд.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-400">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          LIVE
        </div>
      </div>

      {/* ─── КАРТКИ СЬОГОДНІ ─── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-black text-slate-300 uppercase tracking-wider">Сьогодні</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={<DollarSign className="w-5 h-5" />}
            label="Виручка сьогодні"
            value={`$${(today?.revenue ?? 0).toFixed(2)}`}
            color="#60a5fa"
            glowColor="#3b82f6"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Прибуток сьогодні"
            value={`$${(today?.profit ?? 0).toFixed(2)}`}
            color="#34d399"
            glowColor="#10b981"
          />
          <StatCard
            icon={<ShoppingBag className="w-5 h-5" />}
            label="Нових замовлень"
            value={today?.orders ?? newOrdersCount}
            subValue={today?.completed}
            subLabel="виконано"
            color="#a78bfa"
            glowColor="#7c3aed"
            onClick={() => setActiveTab('orders')}
          />
          <StatCard
            icon={<AlertCircle className="w-5 h-5" />}
            label="Очікують обробки"
            value={overview?.new_orders ?? newOrdersCount}
            color="#fbbf24"
            glowColor="#f59e0b"
            onClick={() => setActiveTab('orders')}
          />
        </div>
      </div>

      {/* ─── ЗАГАЛЬНІ МЕТРИКИ + ГРАФІК ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Загальні метрики — 5 карток у 2 колонки */}
        <div className="xl:col-span-1 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-black text-slate-300 uppercase tracking-wider">Всього за весь час</h2>
          </div>

          {[
            {
              icon: <DollarSign className="w-5 h-5" />,
              label: "Загальна виручка",
              value: `$${(overview?.total_revenue ?? totalRevenueFallback).toFixed(2)}`,
              color: "#60a5fa", glowColor: "#3b82f6"
            },
            {
              icon: <TrendingUp className="w-5 h-5" />,
              label: "Чистий прибуток",
              value: `$${(overview?.total_profit ?? totalProfitFallback).toFixed(2)}`,
              color: "#34d399", glowColor: "#10b981"
            },
            {
              icon: <ShoppingBag className="w-5 h-5" />,
              label: "Виконаних замовлень",
              value: overview?.completed_orders ?? completedOrders.length,
              subValue: overview?.total_orders,
              subLabel: "всього замовлень",
              color: "#a78bfa", glowColor: "#7c3aed",
              onClick: () => setActiveTab('orders')
            },
            {
              icon: <Users className="w-5 h-5" />,
              label: "Зареєстрованих юзерів",
              value: overview?.total_users ?? adminUsers.length,
              color: "#f87171", glowColor: "#ef4444",
              onClick: () => setActiveTab('users')
            },
            {
              icon: <Ticket className="w-5 h-5" />,
              label: "Активацій промокодів",
              value: overview?.total_promo_uses ?? adminPromoList.reduce((s, p) => s + (p.current_uses || 0), 0),
              subValue: overview?.active_promos,
              subLabel: "промокодів активно",
              color: "#fbbf24", glowColor: "#f59e0b",
              onClick: () => setActiveTab('promo')
            }
          ].map((card, i) => (
            <StatCard key={i} {...card} />
          ))}
        </div>

        {/* Графік виручки за 7 днів */}
        <div
          className="xl:col-span-2 rounded-2xl p-5 border"
          style={{ background: '#0d1117', borderColor: '#1e293b' }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-blue-400" />
                Графік за 7 днів
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Підведіть курсор на бар для деталей</p>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-slate-500">Пік тижня</div>
              <div className="text-sm font-black text-blue-400">
                ${Math.max(...chart.map(d => d.revenue || 0), 0).toFixed(2)}
              </div>
            </div>
          </div>

          {chart.length > 0 ? (
            <MiniBarChart data={chart} />
          ) : (
            <div className="flex items-center justify-center h-36">
              <p className="text-slate-600 text-sm font-medium">Поки що немає даних для графіка</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── ТОП ТОВАРІВ + ОСТАННІ ЗАМОВЛЕННЯ ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Топ 5 товарів */}
        <div
          className="lg:col-span-2 rounded-2xl p-5 border"
          style={{ background: '#0d1117', borderColor: '#1e293b' }}
        >
          <h2 className="text-base font-black text-white flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-orange-400" />
            Топ продажів
          </h2>

          {topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.map((p, i) => {
                const maxCount = topProducts[0]?.count || 1;
                const pct = (p.count / maxCount) * 100;
                const colors = ['#f59e0b', '#94a3b8', '#cd7f32', '#60a5fa', '#10b981'];
                const rankColors = ['text-amber-400', 'text-slate-400', 'text-amber-700', 'text-blue-400', 'text-emerald-400'];
                return (
                  <div key={i} className="flex items-center gap-3 group">
                    <span className={`text-sm font-black w-4 ${rankColors[i] || 'text-slate-500'}`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-300 truncate pr-2">{p.name}</span>
                        <span className="text-xs font-black text-white whitespace-nowrap">{p.count}×</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: '#1e293b' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: colors[i] || '#475569' }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <Package className="w-8 h-8 text-slate-700" />
              <p className="text-slate-600 text-xs font-medium">Продажів поки немає</p>
            </div>
          )}
        </div>

        {/* Останні замовлення */}
        <div
          className="lg:col-span-3 rounded-2xl p-5 border"
          style={{ background: '#0d1117', borderColor: '#1e293b' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" />
              Останні замовлення
            </h2>
            <button
              onClick={() => setActiveTab('orders')}
              className="text-xs font-black text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
            >
              Всі <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2">
            {recentOrders.map(order => {
              const sc = statusConfig[order.status] || statusConfig.new;
              return (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer group"
                  style={{ background: '#060c14', borderColor: '#1e293b' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.background = '#0d1424'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.background = '#060c14'; }}
                  onClick={() => setActiveTab('orders')}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="font-mono text-xs px-2 py-1 rounded-lg border font-black"
                      style={{ background: '#0f172a', borderColor: '#1e293b', color: '#475569' }}
                    >
                      #{order.id}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">
                        ${order.total}
                        <span className="text-emerald-400 text-xs ml-1.5 font-black">+${order.profit}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 font-medium">{order.created_at}</div>
                    </div>
                  </div>
                  <div
                    className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border whitespace-nowrap"
                    style={{ background: sc.bg, borderColor: sc.border, color: sc.color }}
                  >
                    {sc.label}
                  </div>
                </div>
              );
            })}
            {recentOrders.length === 0 && (
              <div className="text-center py-8 text-slate-600 text-sm font-medium">
                Замовлень поки немає
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── ШВИДКІ ДІЇ ─── */}
      <div
        className="rounded-2xl p-5 border"
        style={{ background: '#0d1117', borderColor: '#1e293b' }}
      >
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          Швидкі дії
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Замовлення', icon: <ShoppingBag className="w-5 h-5" />, tab: 'orders', color: '#3b82f6', badge: overview?.new_orders },
            { label: 'Юзери', icon: <Users className="w-5 h-5" />, tab: 'users', color: '#ef4444', badge: null },
            { label: 'Промокоди', icon: <Ticket className="w-5 h-5" />, tab: 'promo', color: '#f59e0b', badge: null },
            { label: 'Акаунти', icon: <Star className="w-5 h-5" />, tab: 'accounts', color: '#8b5cf6', badge: null },
          ].map((action, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(action.tab)}
              className="flex items-center justify-between p-3.5 rounded-xl border transition-all text-left group hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: '#060c14', borderColor: '#1e293b', color: '#94a3b8' }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = `${action.color}50`;
                e.currentTarget.style.background = `${action.color}10`;
                e.currentTarget.style.color = '#f1f5f9';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#1e293b';
                e.currentTarget.style.background = '#060c14';
                e.currentTarget.style.color = '#94a3b8';
              }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="p-2 rounded-lg border"
                  style={{ background: `${action.color}20`, borderColor: `${action.color}30`, color: action.color }}
                >
                  {action.icon}
                </div>
                <span className="font-bold text-sm">{action.label}</span>
              </div>
              {action.badge > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {action.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};

export default AdminDashboard;