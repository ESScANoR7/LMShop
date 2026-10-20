import React, { useState, useEffect } from 'react';
import { 
  Power, PowerOff, Save, Loader2, Info, CheckSquare, 
  Moon, ShieldAlert, Sparkles, Send, Globe, MessageSquare, 
  Package, Gem, Wheat, Landmark, Coins, Check, X, RefreshCw,
  Trash2, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiPost, apiDelete, handleApiError } from '../../config/apiClient';
import { API_ENDPOINTS, getFullUrl } from '../../config/api';

const AdminStoreSettings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // --- TELEGRAM СИНХРОНІЗАЦІЯ ВІТРИНИ ---
  const [isSyncingTg, setIsSyncingTg] = useState(false);
  const [tgSyncMode, setTgSyncMode] = useState('overwrite'); // 'overwrite' | 'missing'
  const [tgSyncGroup, setTgSyncGroup] = useState('all'); // 'all' | 'acc' | 'res' | 'gem' | 'oth'
  const [tgSyncResult, setTgSyncResult] = useState(null);
  const [isClearingTg, setIsClearingTg] = useState(false);

  const [config, setConfig] = useState({
    is_offline: false,
    offline_categories: ['resources', 'gems', 'account', 'other', 'topup'],
    offline_message: '🌙 Магазин зараз в офлайн-режимі. Оператор відпочиває. Створення замовлень тимчасово призупинено, але ви можете вільно переглядати каталог товарів!',
    offline_message_tg: '🌙 Оператор зараз офлайн (відпочиває). Оформлення замовлень тимчасово призупинено. Спробуйте пізніше або залиште повідомлення у підтримку!',
    block_orders: true,
    usd_to_uah_rate: 41.5
  });

  const categories = [
    { 
      id: 'account', 
      name: 'Акаунти', 
      desc: 'Каталог акаунтів та порівняння',
      icon: Landmark, 
      color: '#60a5fa' 
    },
    { 
      id: 'resources', 
      name: 'Ресурси', 
      desc: 'Паки ресурсів (їжа, камінь, дерево, залізо, золото)',
      icon: Wheat, 
      color: '#34d399' 
    },
    { 
      id: 'gems', 
      name: 'Сапфіри (Gems)', 
      desc: 'Конструктор та паки сапфірів',
      icon: Gem, 
      color: '#a78bfa' 
    },
    { 
      id: 'other', 
      name: 'Інші товари та послуги', 
      desc: 'Буст, послуги, набори та спеціальні пропозиції',
      icon: Package, 
      color: '#f59e0b' 
    },
    { 
      id: 'topup', 
      name: 'Поповнення балансу (Lords Coins)', 
      desc: 'Поповнення балансу через сайт або бот',
      icon: Coins, 
      color: '#eab308' 
    }
  ];

  const quickTemplates = [
    {
      title: '🌙 Сплю до ранку',
      site: '🌙 Оператор зараз спить. Створення замовлень тимчасово призупинено до ранку (орієнтовно до 09:00). Каталог доступний для перегляду!',
      tg: '🌙 Оператор зараз спить (відпочиває до 09:00). Замовлення тимчасово не приймаються. Ви зможете оформити його зранку!'
    },
    {
      title: '⚡ Технічна перерва',
      site: '⚙️ Технічна перерва на сервері (близько 30-60 хвилин). Оформлення замовлень незабаром відновиться!',
      tg: '⚙️ У нас коротка технічна перерва на 30-60 хв. Замовлення тимчасово призупинено. Незабаром будемо онлайн!'
    },
    {
      title: '☕ Відійшов на 30 хв',
      site: '☕ Оператор відійшов на короткий час (~30 хв). Замовлення тимчасово на паузі. Скоро повернемось!',
      tg: '☕ Оператор відійшов на 30 хвилин. Прийом замовлень відновлюється незабаром!'
    }
  ];

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch(getFullUrl('/api/store/status'));
      const data = await res.json();
      setConfig(prev => ({
        ...prev,
        ...data,
        offline_categories: data.offline_categories || prev.offline_categories
      }));
    } catch (error) {
      toast.error('Помилка завантаження налаштувань');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(getFullUrl('/api/store/status'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config)
      });
      
      if (res.ok) {
        toast.success('Налаштування офлайн-режиму збережено та застосовано!');
      } else {
        toast.error('Помилка збереження на сервері');
      }
    } catch (error) {
      toast.error("Сталася помилка з'єднання");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCategory = (catId) => {
    setConfig(prev => {
      const isSelected = prev.offline_categories.includes(catId);
      return {
        ...prev,
        offline_categories: isSelected 
          ? prev.offline_categories.filter(c => c !== catId)
          : [...prev.offline_categories, catId]
      };
    });
  };

  const setAllCategoriesOffline = () => {
    setConfig(prev => ({
      ...prev,
      offline_categories: categories.map(c => c.id)
    }));
    toast('Всі пропозиції додано в список офлайн', { icon: '🌙' });
  };

  const setAllCategoriesOnline = () => {
    setConfig(prev => ({
      ...prev,
      offline_categories: []
    }));
    toast('Всі пропозиції активовано (онлайн)', { icon: '🟢' });
  };

  const applyTemplate = (tmpl) => {
    setConfig(prev => ({
      ...prev,
      offline_message: tmpl.site,
      offline_message_tg: tmpl.tg
    }));
    toast.success(`Застосовано шаблон: ${tmpl.title}`);
  };

  const handleSyncTelegram = async () => {
    setIsSyncingTg(true);
    setTgSyncResult(null);
    const toastId = toast.loading('Синхронізація товарів з Telegram вітриною... Це може зайняти кілька секунд');
    try {
      const data = await apiPost(getFullUrl(API_ENDPOINTS.TELEGRAM_SYNC_STOREFRONT), {
        mode: tgSyncMode,
        group: tgSyncGroup
      });
      setTgSyncResult(data);
      toast.success(data.message || 'Синхронізацію успішно завершено!', { id: toastId, duration: 6000 });
    } catch (error) {
      handleApiError(error, 'Помилка синхронізації з Telegram');
      toast.dismiss(toastId);
    } finally {
      setIsSyncingTg(false);
    }
  };

  const handleClearTelegramStorefront = async () => {
    const groupName = tgSyncGroup === 'all' ? 'всіх товарів' : tgSyncGroup;
    if (!window.confirm(`Ви впевнені, що хочете очистити повідомлення вітрини для ${groupName} з Telegram?`)) {
      return;
    }
    setIsClearingTg(true);
    const toastId = toast.loading('Очищення вітрини в Telegram...');
    try {
      const url = `${getFullUrl(API_ENDPOINTS.TELEGRAM_CLEAR_STOREFRONT)}?group=${tgSyncGroup}`;
      const data = await apiDelete(url);
      setTgSyncResult(null);
      toast.success(data.message || 'Повідомлення вітрини видалено з Telegram!', { id: toastId });
    } catch (error) {
      handleApiError(error, 'Помилка очищення вітрини');
      toast.dismiss(toastId);
    } finally {
      setIsClearingTg(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const isGlobalOffline = config.is_offline;
  const isAnyCatOffline = config.offline_categories.length > 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto pb-16">
      
      {/* 🚀 БЛОК СИНХРОНІЗАЦІЇ ТОВАРІВ З TELEGRAM ВІТРИНОЮ */}
      <div className="bg-[#0c1017] border border-sky-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
        {/* Декоративний фон */}
        <div className="absolute -right-20 -top-20 w-60 h-60 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Заголовок */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-900/30">
              <Send className="w-7 h-7 -translate-y-0.5 translate-x-0.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">Синхронізація товарів з Telegram вітриною</h2>
                <span className="px-2.5 py-0.5 bg-sky-500/20 text-sky-400 text-xs font-bold rounded-full border border-sky-500/30">
                  Storefront TG
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Публікуйте нові або перезаписуйте всі актуальні товари з сайту у топіки вітрини Telegram
              </p>
            </div>
          </div>
        </div>

        {/* Вибір режиму синхронізації */}
        <div>
          <label className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 block">
            1. Оберіть режим синхронізації
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setTgSyncMode('overwrite')}
              className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                tgSyncMode === 'overwrite'
                  ? 'bg-sky-950/40 border-sky-500 text-white shadow-lg shadow-sky-900/20 ring-1 ring-sky-500'
                  : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
              }`}
            >
              <div className={`p-2 rounded-xl mt-0.5 ${tgSyncMode === 'overwrite' ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                <RefreshCw className="w-4 h-4" />
              </div>
              <div>
                <div className="font-black text-sm flex items-center gap-2">
                  <span>Повний перезапис</span>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full font-bold">
                    Рекомендовано
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Видаляє старі повідомлення вітрини в Telegram і наново викладає всі актуальні товари з сайту зі свіжими цінами.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTgSyncMode('missing')}
              className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                tgSyncMode === 'missing'
                  ? 'bg-sky-950/40 border-sky-500 text-white shadow-lg shadow-sky-900/20 ring-1 ring-sky-500'
                  : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
              }`}
            >
              <div className={`p-2 rounded-xl mt-0.5 ${tgSyncMode === 'missing' ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <div className="font-black text-sm">Додати лише відсутні товари</div>
                <div className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Знаходить товари, яких ще немає у вітрині Telegram, і публікує лише їх. Існуючі пости не видаляються.
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Вибір категорії */}
        <div>
          <label className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 block">
            2. Оберіть категорію для синхронізації
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: '🌟 Всі категорії одразу' },
              { id: 'acc', label: '🏰 Тільки Акаунти' },
              { id: 'res', label: '🌾 Тільки Ресурси' },
              { id: 'gem', label: '💎 Тільки Сапфіри' },
              { id: 'oth', label: '📦 Тільки Інші товари' },
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setTgSyncGroup(cat.id)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all border ${
                  tgSyncGroup === cat.id
                    ? 'bg-sky-600 text-white border-sky-500 shadow-md shadow-sky-900/30'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Результат попередньої синхронізації */}
        {tgSyncResult && (
          <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-2xl flex items-start justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-black text-emerald-300">
                  {tgSyncResult.message || 'Синхронізацію успішно виконано!'}
                </div>
                {tgSyncResult.synced && (
                  <div className="text-xs text-emerald-400/80 mt-1 flex flex-wrap gap-3 font-semibold">
                    <span>🏰 Акаунти: {tgSyncResult.synced.acc || 0}</span>
                    <span>🌾 Ресурси: {tgSyncResult.synced.res || 0}</span>
                    <span>💎 Сапфіри: {tgSyncResult.synced.gem || 0}</span>
                    <span>📦 Інші: {tgSyncResult.synced.oth || 0}</span>
                  </div>
                )}
                {tgSyncResult.errors && tgSyncResult.errors.length > 0 && (
                  <div className="mt-2 text-xs text-amber-300 bg-amber-950/40 p-2 rounded-lg border border-amber-500/30">
                    <span className="font-bold">Помилки:</span> {tgSyncResult.errors.join(', ')}
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTgSyncResult(null)}
              className="text-emerald-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Дії: Запустити або Очистити */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <button
            type="button"
            disabled={isSyncingTg || isClearingTg}
            onClick={handleSyncTelegram}
            className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-sky-900/30 hover:scale-[1.01] active:scale-[0.99]"
          >
            {isSyncingTg ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {isSyncingTg
              ? 'Синхронізація товарів у Telegram... (~5-15 сек)'
              : tgSyncMode === 'overwrite'
                ? '🚀 Перезаписати та викласти у Telegram'
                : '🚀 Додати відсутні товари у Telegram'}
          </button>

          <button
            type="button"
            disabled={isSyncingTg || isClearingTg}
            onClick={handleClearTelegramStorefront}
            className="w-full sm:w-auto px-5 py-3.5 bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 hover:text-rose-300 border border-rose-800/40 disabled:opacity-50 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all"
            title="Видалити повідомлення товарів з вибраних гілок Telegram"
          >
            {isClearingTg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            <span>Очистити вітрину ТГ</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
          <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span>
            Товари публікуються з кнопкою «Купити / Buy», що скеровує користувача на оформлення замовлення у боті.
          </span>
        </div>
      </div>

      {/* 💱 НАЛАШТУВАННЯ КУРСУ ВАЛЮТ (USD -> UAH) */}
      <div className="bg-[#0c1017] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
        <div className="absolute -right-20 -top-20 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg shadow-amber-900/30">
              ₴
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">Курс валют для сайту (USD / Гривня UAH)</h2>
                <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full border border-amber-500/30">
                  1 USD = {config.usd_to_uah_rate || 41.5} ₴
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Керуйте курсом відображення цін у гривнях (₴). Всі внутрішні розрахунки та баланси залишаються у доларах / монетах сайту (1 USD = 1 монета).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-950/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Зберегти курс</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-300 mb-2 block">
              Курс 1 Долара (USD) у Гривнях (UAH)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="1"
                value={config.usd_to_uah_rate || 41.5}
                onChange={(e) => setConfig(prev => ({ ...prev, usd_to_uah_rate: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-[#070b12] border border-white/[0.1] focus:border-amber-500 rounded-2xl px-4 py-3.5 text-white font-mono font-black text-lg outline-none transition-colors"
                placeholder="41.50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-400 font-black text-sm">
                UAH (₴)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Користувачі, які оберуть відображення у «₴ Грн», бачитимуть перераховані ціни згідно з цим курсом.
            </p>
          </div>

          <div className="bg-[#070b12] border border-white/[0.06] rounded-2xl p-4 space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Приклади конвертації при курсі {config.usd_to_uah_rate || 41.5} ₴:
            </span>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="text-[10px] text-slate-400 font-bold">$1.00 USD</div>
                <div className="text-xs font-black text-amber-400 font-mono mt-0.5">
                  {((config.usd_to_uah_rate || 41.5) * 1).toFixed(2)} ₴
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="text-[10px] text-slate-400 font-bold">$10.00 USD</div>
                <div className="text-xs font-black text-amber-400 font-mono mt-0.5">
                  {((config.usd_to_uah_rate || 41.5) * 10).toFixed(2)} ₴
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="text-[10px] text-slate-400 font-bold">$100.00 USD</div>
                <div className="text-xs font-black text-amber-400 font-mono mt-0.5">
                  {((config.usd_to_uah_rate || 41.5) * 100).toFixed(0)} ₴
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ШАПКА РОЗДІЛУ ОФЛАЙНУ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0c1017] border border-white/[0.08] p-6 rounded-3xl shadow-2xl">
        <div className="flex items-center gap-4">
          <div className={`p-3.5 rounded-2xl shadow-lg transition-colors ${
            isGlobalOffline 
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-amber-900/20' 
              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-emerald-900/20'
          }`}>
            {isGlobalOffline ? <PowerOff className="w-7 h-7" /> : <Power className="w-7 h-7" />}
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Режим роботи магазину (Офлайн / Сон)</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Керуйте можливістю створення замовлень на сайті та в Telegram боті, коли ви спите або відпочиваєте
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border ${
            isGlobalOffline 
              ? 'bg-amber-950/60 text-amber-400 border-amber-500/40' 
              : 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
          }`}>
            {isGlobalOffline ? '🔴 ОФЛАЙН РЕЖИМ' : '🟢 ОНЛАЙН (АКТИВНИЙ)'}
          </span>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* ГОЛОВНИЙ ТУМБЛЕР ОФЛАЙНУ */}
        <div className={`p-6 rounded-3xl border transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-2xl ${
          config.is_offline 
            ? 'bg-gradient-to-r from-amber-950/30 to-[#0c1017] border-amber-500/50 shadow-amber-950/20' 
            : 'bg-[#0c1017] border-white/[0.08]'
        }`}>
          <div className="space-y-1">
            <h2 className={`text-base font-black flex items-center gap-2.5 ${
              config.is_offline ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {config.is_offline ? <PowerOff className="w-5 h-5" /> : <Power className="w-5 h-5" />}
              {config.is_offline ? 'Магазин переведено в ОФЛАЙН' : 'Магазин працює у штатному режимі (ОНЛАЙН)'}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              {config.is_offline 
                ? 'Користувачі можуть вільно переглядати товари на сайті, але оформлення замовлень для обраних категорій заблоковано з попередженням.'
                : 'Всі клієнти можуть оформлювати замовлення без обмежень через сайт та Telegram бот.'}
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 select-none">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={config.is_offline}
              onChange={(e) => setConfig({ ...config, is_offline: e.target.checked })}
            />
            <div className="w-16 h-8 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-8 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500 shadow-inner border border-slate-700"></div>
          </label>
        </div>

        {/* НАЛАШТУВАННЯ КАТЕГОРІЙ ТА ПОВІДОМЛЕНЬ (КОЛИ УВІМКНЕНО ОФЛАЙН) */}
        {config.is_offline && (
          <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
            
            {/* КНОПКИ ДЛЯ КОЖНОЇ ПРОПОЗИЦІЇ (ОКРЕМО І РАЗОМ) */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-blue-400" />
                    Керування окремими пропозиціями (категоріями)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Виберіть, які саме категорії замовлень закрити, або вимкніть усі одразу.
                  </p>
                </div>

                {/* Швидкі дії */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={setAllCategoriesOffline}
                    className="text-xs font-bold px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl transition-all"
                  >
                    ⚡ Всі в офлайн
                  </button>
                  <button
                    type="button"
                    onClick={setAllCategoriesOnline}
                    className="text-xs font-bold px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
                  >
                    🟢 Всі в онлайн
                  </button>
                </div>
              </div>

              {/* Сітка 5 категорій */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {categories.map(cat => {
                  const Icon = cat.icon;
                  const isOff = config.offline_categories.includes(cat.id);

                  return (
                    <div
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 select-none flex flex-col justify-between ${
                        isOff 
                          ? 'bg-amber-950/25 border-amber-500/50 shadow-lg shadow-amber-950/20' 
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div 
                            className="p-2 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: `${cat.color}20`, color: cat.color }}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-sm text-white">{cat.name}</div>
                            <div className="text-[11px] text-slate-500 leading-tight mt-0.5 line-clamp-1">{cat.desc}</div>
                          </div>
                        </div>

                        {/* Міні тумблер */}
                        <div className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                          isOff ? 'bg-amber-500' : 'bg-slate-800'
                        }`}>
                          <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-[3px] ${
                            isOff ? 'translate-x-4' : 'translate-x-1'
                          }`} />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px]">
                        <span className="text-slate-400">Статус замовлень:</span>
                        <span className={`font-black ${isOff ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {isOff ? '🌙 НА ПАУЗІ' : '🟢 АКТИВНО'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {config.offline_categories.length === 0 && (
                <div className="p-3 bg-blue-950/30 border border-blue-500/30 rounded-xl text-xs text-blue-300 flex items-center gap-2">
                  <Info className="w-4 h-4 flex-shrink-0 text-blue-400" />
                  <span>Увага: жодної категорії не обрано. Увімкніть хоча б одну пропозицію, або натисніть «Всі в офлайн».</span>
                </div>
              )}
            </div>

            {/* ШАБЛОНИ ШВИДКИХ ПОВІДОМЛЕНЬ */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Швидкі готові шаблони повідомлень</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {quickTemplates.map((t, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 hover:border-amber-500/40 transition-all flex items-center gap-1.5"
                  >
                    <span>{t.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ПОЛЯ ДЛЯ КАСТОМІЗАЦІЇ ПОВІДОМЛЕНЬ (САЙТ ТА TELEGRAM) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* ПОВІДОМЛЕННЯ ДЛЯ САЙТУ ТА WEBAPP */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="w-4 h-4 text-blue-400" />
                    <label className="text-sm font-black text-white">Повідомлення для сайту та WebApp</label>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Цей текст показується в плашці у кошику та блокує кнопку оформлення замовлення.
                  </p>
                  <textarea 
                    rows="4"
                    required
                    value={config.offline_message}
                    onChange={(e) => setConfig({ ...config, offline_message: e.target.value })}
                    placeholder="🌙 Оператор зараз спить..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-4 text-sm text-amber-300 font-medium outline-none focus:border-amber-500 transition-colors resize-none leading-relaxed"
                  />
                </div>

                {/* Живе прев'ю для сайту */}
                <div className="p-3.5 bg-amber-950/20 border border-amber-500/30 rounded-2xl">
                  <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Moon className="w-3 h-3" /> Прев'ю на сайті (у кошику):
                  </div>
                  <div className="text-xs text-amber-200/90 leading-relaxed font-sans">
                    {config.offline_message || 'Текст повідомлення порожній'}
                  </div>
                </div>
              </div>

              {/* ПОВІДОМЛЕННЯ ДЛЯ TELEGRAM БОТА */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Send className="w-4 h-4 text-sky-400" />
                    <label className="text-sm font-black text-white">Повідомлення для Telegram бота</label>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Цей текст бот надсилає у відповідь на спробу покупки через вітрину чи поповнення балансу.
                  </p>
                  <textarea 
                    rows="4"
                    required
                    value={config.offline_message_tg || ''}
                    onChange={(e) => setConfig({ ...config, offline_message_tg: e.target.value })}
                    placeholder="🌙 Оператор зараз спить. Замовлення тимчасово не приймаються..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-4 text-sm text-sky-300 font-medium outline-none focus:border-sky-500 transition-colors resize-none leading-relaxed"
                  />
                </div>

                {/* Живе прев'ю для Telegram */}
                <div className="p-3.5 bg-sky-950/20 border border-sky-500/30 rounded-2xl">
                  <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> Прев'ю повідомлення бота:
                  </div>
                  <div className="text-xs text-sky-200/90 leading-relaxed font-sans">
                    {config.offline_message_tg || config.offline_message || 'Текст повідомлення порожній'}
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* КНОПКА ЗБЕРЕЖЕННЯ */}
        <div className="flex items-center justify-end gap-4 pt-2">
          <button 
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-[0_0_18px_rgba(225,29,72,0.35)] hover:scale-[1.01] active:scale-[0.99]"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {isSaving ? 'Збереження налаштувань...' : 'Зберегти та застосувати налаштування'}
          </button>
        </div>

      </form>
    </div>
  );
};

export default AdminStoreSettings;