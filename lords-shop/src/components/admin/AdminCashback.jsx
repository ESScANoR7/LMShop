import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Coins, Percent, Shield, Save, Users, Zap, CheckCircle2, Lock, Sliders, Crown, Award } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiGet, apiPut, handleApiError } from '../../config/apiClient';
import { API_ENDPOINTS, getFullUrl } from '../../config/api';

const DEFAULT_TIERS = [
  { id: 'base', name: 'Base', threshold: 0, rss: 10, gems: 1, other: 5, account: 0 },
  { id: 'paladin', name: 'Paladin', threshold: 100, rss: 12, gems: 1.5, other: 6, account: 0 },
  { id: 'overlord', name: 'Overlord', threshold: 300, rss: 15, gems: 2, other: 7, account: 0 },
  { id: 'baron', name: 'Baron', threshold: 700, rss: 18, gems: 2.5, other: 8, account: 0 },
  { id: 'emperor', name: 'Emperor', threshold: 1500, rss: 20, gems: 3, other: 10, account: 0 },
];

const AdminCashback = () => {
  const { t } = useTranslation();
  
  // Вкладки: 'cashback', 'ranks' або 'referral'
  const [activeTab, setActiveTab] = useState('cashback');

  // --- СТАНИ ДЛЯ КЕШБЕКУ ---
  const [cashbackPercent, setCashbackPercent] = useState('5');
  const [cashbackExcluded, setCashbackExcluded] = useState('account');
  const [cashbackCatPercents, setCashbackCatPercents] = useState({
    rss: '',
    gems: '',
    other: '',
    account: ''
  });
  const [cashbackTiers, setCashbackTiers] = useState(DEFAULT_TIERS);

  // --- СТАНИ ДЛЯ РЕФЕРАЛЬНОЇ СИСТЕМИ ---
  const [refPercent, setRefPercent] = useState('5');
  const [refIsActive, setRefIsActive] = useState(true);
  const [refCatPercents, setRefCatPercents] = useState({
    rss: '',
    gems: '',
    other: '',
    account: ''
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Завантаження кешбеку
        const cbData = await apiGet(getFullUrl(API_ENDPOINTS.CASHBACK_SETTINGS));
        if (cbData) {
          setCashbackPercent(cbData.percent !== undefined ? cbData.percent : '5');
          setCashbackExcluded(cbData.excluded_types || '');
          if (cbData.category_percents) {
            const cats = typeof cbData.category_percents === 'string'
              ? JSON.parse(cbData.category_percents)
              : cbData.category_percents;
            setCashbackCatPercents({
              rss: cats.rss !== undefined && cats.rss !== null ? String(cats.rss) : '',
              gems: cats.gems !== undefined && cats.gems !== null ? String(cats.gems) : '',
              other: cats.other !== undefined && cats.other !== null ? String(cats.other) : '',
              account: cats.account !== undefined && cats.account !== null ? String(cats.account) : ''
            });
          }
          if (cbData.tiers) {
            const parsed = typeof cbData.tiers === 'string' ? JSON.parse(cbData.tiers) : cbData.tiers;
            if (Array.isArray(parsed) && parsed.length > 0) {
              setCashbackTiers(parsed);
            }
          }
        }

        // Завантаження реферальних налаштувань
        const refData = await apiGet(getFullUrl('/api/referral/settings'));
        if (refData) {
          setRefPercent(refData.percent !== undefined ? refData.percent : '5');
          setRefIsActive(refData.is_active);
          if (refData.category_percents) {
            const cats = typeof refData.category_percents === 'string'
              ? JSON.parse(refData.category_percents)
              : refData.category_percents;
            setRefCatPercents({
              rss: cats.rss !== undefined && cats.rss !== null ? String(cats.rss) : '',
              gems: cats.gems !== undefined && cats.gems !== null ? String(cats.gems) : '',
              other: cats.other !== undefined && cats.other !== null ? String(cats.other) : '',
              account: cats.account !== undefined && cats.account !== null ? String(cats.account) : ''
            });
          }
        }
      } catch (error) {
        handleApiError(error, t('common.error'));
      }
    };
    fetchSettings();
  }, [t]);

  // Зміна окремого поля в рангах
  const updateTierField = (tierIndex, field, value) => {
    setCashbackTiers(prev => {
      const copy = [...prev];
      copy[tierIndex] = {
        ...copy[tierIndex],
        [field]: field === 'name' ? value : (value === '' ? '' : parseFloat(value) || 0)
      };
      return copy;
    });
  };

  // --- ЗБЕРЕЖЕННЯ КЕШБЕКУ ТА РАНГІВ ---
  const handleSaveCashbackSettings = async () => {
    const toastId = toast.loading(t('common.loading'));
    try {
      const catPayload = {};
      Object.entries(cashbackCatPercents).forEach(([k, v]) => {
        if (v !== '' && v !== null && !isNaN(Number(v))) {
          catPayload[k] = parseFloat(v);
        }
      });

      await apiPut(getFullUrl(API_ENDPOINTS.CASHBACK_SETTINGS), {
        percent: parseFloat(cashbackPercent) || 0,
        excluded_types: cashbackExcluded,
        category_percents: catPayload,
        tiers: cashbackTiers
      });

      toast.success(t('common.success'), { id: toastId });
    } catch (error) {
      handleApiError(error, t('common.error'));
      toast.dismiss(toastId);
    }
  };

  const handleToggleCashbackExclude = (type) => {
    let currentArray = cashbackExcluded ? cashbackExcluded.split(',') : [];
    if (currentArray.includes(type)) {
      currentArray = currentArray.filter(t => t !== type);
    } else {
      currentArray.push(type);
    }
    setCashbackExcluded(currentArray.join(','));
  };

  // --- ЗБЕРЕЖЕННЯ РЕФЕРАЛКИ ---
  const handleSaveReferralSettings = async () => {
    const toastId = toast.loading('Збереження налаштувань...');
    try {
      const catPayload = {};
      ['rss', 'gems', 'other', 'account'].forEach(k => {
        const val = refCatPercents[k];
        if (val !== '' && val !== null && !isNaN(Number(val))) {
          catPayload[k] = parseFloat(val);
        } else {
          catPayload[k] = 0;
        }
      });

      await apiPut(getFullUrl('/api/referral/settings'), {
        percent: 0,
        is_active: refIsActive,
        category_percents: catPayload
      });

      toast.success('Налаштування реферальної системи збережено!', { id: toastId });
    } catch (error) {
      handleApiError(error, 'Помилка збереження');
      toast.dismiss(toastId);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      
      {/* ГОЛОВНА ШАПКА */}
      <div className="bg-[#0c1017] border border-white/[0.08] p-6 rounded-3xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="p-2.5 rounded-xl bg-gradient-to-br from-red-600/20 to-rose-600/10 border border-red-500/20 text-rose-500">
              <Coins className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-black text-white">Фінансові нагороди</h1>
          </div>
          <p className="text-xs text-slate-400 max-w-xl mt-1">
            Керуйте відсотками кешбеку та бонусами для реферальної програми магазину
          </p>
        </div>

        {/* ТУМБЛЕР ВКЛАДОК */}
        <div className="flex bg-[#070b12] p-1.5 rounded-2xl border border-white/[0.06] overflow-x-auto">
          <button 
            onClick={() => setActiveTab('cashback')} 
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'cashback' 
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-[0_0_14px_rgba(245,158,11,0.4)]' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Crown className="w-4 h-4 text-amber-950" /> Кешбек (5 рангів) 👑
          </button>
          <button 
            onClick={() => setActiveTab('referral')} 
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'referral' 
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white font-black shadow-[0_0_12px_rgba(225,29,72,0.35)]' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" /> Реферали
          </button>
        </div>
      </div>

      {activeTab === 'cashback' && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
          
          {/* ОПИС РАНГОВОЇ СИСТЕМИ */}
          <div className="bg-[#0c1017] border border-amber-500/20 p-6 rounded-3xl shadow-2xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/30 text-amber-400">
                  <Crown className="w-7 h-7" />
                </span>
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    5 Рангів Кешбеку
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                    Ранг клієнта автоматично розраховується від суми виконаних замовлень за весь час. Вкажіть поріг покупок ($) та індивідуальні відсотки кешбеку для кожного рангу по категоріях товарів.
                  </p>
                </div>
              </div>
              <div className="px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold shrink-0">
                ⭐ 5 рівнів кешбеку
              </div>
            </div>

            <div className="mt-4 p-3.5 bg-amber-950/20 border border-amber-500/10 rounded-2xl text-xs text-amber-300/90 leading-relaxed">
              💡 <b>Важливо:</b> Кешбек нараховується тільки за умови оплати <b>монетами сайту (з внутрішнього балансу)</b> та зараховується автоматично лише після переведення замовлення в статус <b>«Виконано»</b>.
            </div>
          </div>

          {/* ВИКЛЮЧЕННЯ ТОВАРІВ З КЕШБЕКУ */}
          <div className="bg-[#0c1017] border border-white/[0.08] rounded-3xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 pb-3 border-b border-white/[0.06] flex items-center gap-2">
              <Shield className="w-4 h-4 text-rose-500" /> {t('admin.cashback.restrictionsTitle', 'Повне виключення з кешбеку')}
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              {t('admin.cashback.restrictionsDesc', 'Виберіть типи товарів, за купівлю яких кешбек зовсім не нараховується (0%):')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { type: 'account', name: t('admin.cashback.catAccount', 'Акаунти Lords Mobile') },
                { type: 'rss', name: t('admin.cashback.catRss', 'Паки Ресурсів') },
                { type: 'gems', name: t('admin.cashback.catGems', 'Сапфіри (Gems)') },
                { type: 'special', name: t('admin.cashback.catSpecial', 'Інші послуги') }
              ].map(cat => {
                const isExcluded = cashbackExcluded.split(',').includes(cat.type);
                return (
                  <button 
                    key={cat.type}
                    type="button"
                    onClick={() => handleToggleCashbackExclude(cat.type)}
                    className={`p-3.5 rounded-2xl border text-xs font-bold transition-all text-left flex justify-between items-center ${isExcluded ? 'bg-rose-950/30 border-rose-500/40 text-rose-300' : 'bg-[#070b12] border-white/[0.06] text-slate-300 hover:border-white/[0.12]'}`}
                  >
                    <span>{cat.name}</span>
                    <div className={`w-9 h-5 rounded-full relative transition-colors ${isExcluded ? 'bg-rose-600' : 'bg-slate-800'}`}>
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-transform ${isExcluded ? 'translate-x-5' : 'translate-x-1'}`}></div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5 КАРТОК РАНГІВ */}
          <div className="space-y-5">
            {cashbackTiers.map((tier, idx) => {
              const tierBadgeColors = [
                'from-slate-600/30 to-zinc-700/20 border-slate-500/30 text-slate-300',
                'from-blue-600/30 to-cyan-700/20 border-blue-500/30 text-blue-300',
                'from-purple-600/30 to-violet-700/20 border-purple-500/30 text-purple-300',
                'from-rose-600/30 to-red-700/20 border-rose-500/30 text-rose-300',
                'from-amber-500/30 to-yellow-600/20 border-amber-500/40 text-amber-300',
              ];
              const badgeClass = tierBadgeColors[idx] || tierBadgeColors[0];

              return (
                <div 
                  key={tier.id || idx}
                  className="bg-[#0c1017] border border-white/[0.08] hover:border-amber-500/30 transition-all rounded-3xl p-6 shadow-xl relative overflow-hidden"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 mb-5 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wider bg-gradient-to-br ${badgeClass}`}>
                        Ранг {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={tier.name}
                        onChange={(e) => updateTierField(idx, 'name', e.target.value)}
                        className="text-lg font-black text-white bg-transparent border-b border-dashed border-white/20 hover:border-amber-400 focus:border-amber-400 outline-none pb-0.5 transition-colors"
                        placeholder="Назва рангу"
                      />
                      <span className="text-xs text-slate-500 font-mono">({tier.id})</span>
                    </div>

                    {/* Поріг покупок ($) */}
                    <div className="flex items-center gap-3 bg-[#070b12] border border-white/[0.06] px-4 py-2.5 rounded-2xl">
                      <label className="text-xs font-bold text-slate-400 whitespace-nowrap">
                        Поріг покупок від:
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-500">$</span>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={tier.threshold}
                          onChange={(e) => updateTierField(idx, 'threshold', e.target.value)}
                          className="w-28 pl-6 pr-3 py-1.5 bg-[#0c1017] border border-white/[0.08] rounded-xl text-sm font-black text-white font-mono outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4 ПОЛЯ КАТЕГОРІЙ ДЛЯ ЦЬОГО РАНГУ */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* RSS */}
                    <div className="bg-[#070b12] border border-white/[0.06] rounded-2xl p-3.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-emerald-400">🌾 Ресурси (RSS)</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={tier.rss}
                          onChange={(e) => updateTierField(idx, 'rss', e.target.value)}
                          className="w-full bg-[#0c1017] border border-white/[0.08] rounded-xl px-3 py-2 text-lg font-black text-amber-400 font-mono outline-none focus:border-amber-400"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">%</span>
                      </div>
                    </div>

                    {/* Gems */}
                    <div className="bg-[#070b12] border border-white/[0.06] rounded-2xl p-3.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-cyan-400">💎 Сапфіри (Gems)</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={tier.gems}
                          onChange={(e) => updateTierField(idx, 'gems', e.target.value)}
                          className="w-full bg-[#0c1017] border border-white/[0.08] rounded-xl px-3 py-2 text-lg font-black text-amber-400 font-mono outline-none focus:border-amber-400"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">%</span>
                      </div>
                    </div>

                    {/* Other */}
                    <div className="bg-[#070b12] border border-white/[0.06] rounded-2xl p-3.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-purple-400">📦 Інші товари (Other)</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={tier.other}
                          onChange={(e) => updateTierField(idx, 'other', e.target.value)}
                          className="w-full bg-[#0c1017] border border-white/[0.08] rounded-xl px-3 py-2 text-lg font-black text-amber-400 font-mono outline-none focus:border-amber-400"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">%</span>
                      </div>
                    </div>

                    {/* Account */}
                    <div className="bg-[#070b12] border border-white/[0.06] rounded-2xl p-3.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-rose-400">🏰 Акаунти (Accounts)</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={tier.account}
                          onChange={(e) => updateTierField(idx, 'account', e.target.value)}
                          className="w-full bg-[#0c1017] border border-white/[0.08] rounded-xl px-3 py-2 text-lg font-black text-amber-400 font-mono outline-none focus:border-amber-400"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* КНОПКА ЗБЕРЕЖЕННЯ ВСІХ РАНГІВ */}
          <button 
            onClick={handleSaveCashbackSettings}
            className="w-full py-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black rounded-2xl transition-all shadow-[0_0_24px_rgba(245,158,11,0.35)] flex items-center justify-center gap-2 uppercase tracking-wide text-xs"
          >
            <Save className="w-4 h-4"/> Зберегти всі налаштування рангів кешбеку
          </button>
        </div>
      )}

      {/* ====================================================== */}
      {/* 🔥 ВКЛАДКА РЕФЕРАЛІВ 🔥 */}
      {/* ====================================================== */}
      {activeTab === 'referral' && (
        <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
          {/* ГОЛОВНИЙ БЛОК НАЛАШТУВАНЬ РЕФЕРАЛЬНОЇ СИСТЕМИ */}
          <div className="bg-[#0c1017] border border-white/[0.08] rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <span className="p-3 rounded-2xl bg-gradient-to-br from-red-600/20 to-rose-600/10 border border-red-500/30 text-rose-500">
                  <Users className="w-7 h-7" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-white">
                      Універсальна реферальна система
                    </h2>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-full">
                      🌐 Сайт + 🤖 Telegram
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    Єдина система винагород, що працює паралельно для веб-сайту та Telegram-бота. Вкажіть точні відсотки винагороди рефереру за кожну категорію товарів у замовленні.
                  </p>
                </div>
              </div>

              {/* Тумблер Увімкнути/Вимкнути */}
              <button 
                onClick={() => setRefIsActive(!refIsActive)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border shrink-0 ${
                  refIsActive 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}
              >
                {refIsActive ? <CheckCircle2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                {refIsActive ? 'Рефералка активна' : 'Рефералка вимкнена'}
              </button>
            </div>

            {/* ГНУЧКІ ВІДСОТКИ ПО КАТЕГОРІЯХ */}
            <div className={`transition-all ${!refIsActive ? 'opacity-40 pointer-events-none' : ''}`}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-rose-500" /> Відсотки винагороди по категоріях товарів
                </span>
                <span className="text-xs text-slate-500">
                  Нараховується рефереру від суми відповідного товару
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Ресурси */}
                <div className="bg-[#070b12] border border-white/[0.06] rounded-2xl p-4 hover:border-emerald-500/30 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-400">🌾 Ресурси (RSS)</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="15"
                      value={refCatPercents.rss}
                      onChange={(e) => setRefCatPercents({ ...refCatPercents, rss: e.target.value })}
                      className="w-full bg-[#0c1017] border border-white/[0.08] rounded-xl px-4 py-3 text-2xl font-black text-rose-400 font-mono outline-none focus:border-red-500"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">%</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1.5 block">Рекомендовано: 15-20%</span>
                </div>

                {/* Сапфіри (Gems) */}
                <div className="bg-[#070b12] border border-white/[0.06] rounded-2xl p-4 hover:border-cyan-500/30 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-cyan-400">💎 Сапфіри (Gems)</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="1"
                      value={refCatPercents.gems}
                      onChange={(e) => setRefCatPercents({ ...refCatPercents, gems: e.target.value })}
                      className="w-full bg-[#0c1017] border border-white/[0.08] rounded-xl px-4 py-3 text-2xl font-black text-rose-400 font-mono outline-none focus:border-red-500"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">%</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1.5 block">Рекомендовано: 1-3%</span>
                </div>

                {/* Інші товари */}
                <div className="bg-[#070b12] border border-white/[0.06] rounded-2xl p-4 hover:border-purple-500/30 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-purple-400">📦 Інші товари (Other)</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="5"
                      value={refCatPercents.other}
                      onChange={(e) => setRefCatPercents({ ...refCatPercents, other: e.target.value })}
                      className="w-full bg-[#0c1017] border border-white/[0.08] rounded-xl px-4 py-3 text-2xl font-black text-rose-400 font-mono outline-none focus:border-red-500"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">%</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1.5 block">Рекомендовано: 5-10%</span>
                </div>

                {/* Акаунти */}
                <div className="bg-[#070b12] border border-white/[0.06] rounded-2xl p-4 hover:border-rose-500/30 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-rose-400">🏰 Акаунти (Accounts)</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={refCatPercents.account}
                      onChange={(e) => setRefCatPercents({ ...refCatPercents, account: e.target.value })}
                      className="w-full bg-[#0c1017] border border-white/[0.08] rounded-xl px-4 py-3 text-2xl font-black text-rose-400 font-mono outline-none focus:border-red-500"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">%</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1.5 block">Зазвичай: 0%</span>
                </div>
              </div>

              {/* ПРИКЛАД РОЗРАХУНКУ */}
              <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-2xl mb-6">
                <p className="text-xs text-rose-300 leading-relaxed">
                  💡 <b>Приклад нарахування:</b> якщо реферал замовить ресурсів на $100 — реферер отримає <b className="text-white font-mono">${(100 * (parseFloat(refCatPercents.rss) || 0) / 100).toFixed(2)}</b>. Якщо замовить сапфірів на $100 — отримає <b className="text-white font-mono">${(100 * (parseFloat(refCatPercents.gems) || 0) / 100).toFixed(2)}</b>.
                </p>
              </div>

              <button 
                onClick={handleSaveReferralSettings}
                className="w-full py-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black rounded-2xl transition-all shadow-[0_0_18px_rgba(225,29,72,0.35)] flex items-center justify-center gap-2 uppercase tracking-wide text-xs"
              >
                <Save className="w-4 h-4"/> Зберегти універсальні налаштування рефералки
              </button>
            </div>
          </div>

          {/* ІНФОРМАЦІЯ ПРО ПРАВИЛА ТА УНІВЕРСАЛЬНІСТЬ */}
          <div className="bg-[#0c1017] border border-white/[0.08] rounded-3xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4 pb-3 border-b border-white/[0.06] flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" /> Як працює універсальна система рефералів?
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
              <div className="flex gap-3 bg-[#070b12] p-4 rounded-2xl border border-white/[0.04]">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 font-bold shrink-0">1</span>
                <div>
                  <b className="text-white block mb-0.5">Універсальні посилання</b>
                  Користувач може ділитися посиланням на веб-сайт (<code>?ref=username</code>) або посиланням на Telegram-бота (<code>?start=ref_username</code>). Обидва варіанти зв'язують реферала з реферером.
                </div>
              </div>

              <div className="flex gap-3 bg-[#070b12] p-4 rounded-2xl border border-white/[0.04]">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold shrink-0">2</span>
                <div>
                  <b className="text-white block mb-0.5">Нарахування після «Виконано»</b>
                  Бонус падає на внутрішній баланс реферера <b>тільки тоді</b>, коли замовлення реферала переходить у статус <span className="text-emerald-400 font-bold">"ВИКОНАНО"</span> (на сайті або в боті).
                </div>
              </div>

              <div className="flex gap-3 bg-[#070b12] p-4 rounded-2xl border border-white/[0.04]">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold shrink-0">3</span>
                <div>
                  <b className="text-white block mb-0.5">Захист від промокодів гільдій</b>
                  Якщо реферал застосовує <b>промокод гільдії</b> з нульовою маржею, нарахування автоматично блокується, зберігаючи фінансову безпеку магазину.
                </div>
              </div>

              <div className="flex gap-3 bg-[#070b12] p-4 rounded-2xl border border-white/[0.04]">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-bold shrink-0">4</span>
                <div>
                  <b className="text-white block mb-0.5">Миттєве сповіщення в Telegram</b>
                  При переході замовлення у статус "Виконано" рефереру надходить push-повідомлення в Telegram із точним розміром нарахованої винагороди.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminCashback;