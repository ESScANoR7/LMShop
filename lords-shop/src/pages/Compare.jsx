import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCompare } from '../context/CompareContext';
import { useWishlist } from '../context/WishlistContext';
import {
  Scale, X, ShoppingCart, Image as ImageIcon, Trash2, Tag, LinkIcon,
  Swords, Users, Crown, Star, Globe, Ghost, Castle,
  Zap, Sparkles, CheckCircle2, ChevronRight, Flame, Eye,
  ArrowDownUp, RotateCcw, Trophy, Check, Layers
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';
import { getImageUrl, API_ENDPOINTS, getFullUrl } from '../config/api';
import { apiGet } from '../config/apiClient';
import { PriceDisplay } from '../context/CurrencyContext';
import { PRESETS, calculateAccountValuation } from '../utils/accountValuation';

const Compare = () => {
  const { t, i18n } = useTranslation();
  const isUk = i18n.language === 'ua';
  const isDe = i18n.language === 'de';

  const { compareList, removeFromCompare, clearCompare } = useCompare();
  const { wishlist } = useWishlist();
  const { addToCart } = useCart();

  // Режим відображення: 'table' (таблиця) або 'duel' (дуель 1 vs 1)
  const [viewMode, setViewMode] = useState('table');

  // Активний пресет оцінки: 'balance' | 'rally_mix' | 'blast' | 'low_might' | 'donate'
  const [activePreset, setActivePreset] = useState('balance');

  // Активне сортування за критерієм: null або назва поля
  const [sortBy, setSortBy] = useState(null);

  // Стан для Дуелі 1 vs 1
  const [duelAcc1Id, setDuelAcc1Id] = useState(null);
  const [duelAcc2Id, setDuelAcc2Id] = useState(null);
  const [catalogAccounts, setCatalogAccounts] = useState([]);

  // Завантаження каталогу для вибору акаунтів у дуель
  useEffect(() => {
    apiGet(getFullUrl(API_ENDPOINTS.ACCOUNTS))
      .then(data => setCatalogAccounts(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Розрахунок оцінки для всіх порівнюваних акаунтів з урахуванням активного пресету
  const valuations = useMemo(() => {
    const map = {};
    compareList.forEach(acc => {
      map[acc.id] = calculateAccountValuation(acc, 1250, activePreset);
    });
    return map;
  }, [compareList, activePreset]);

  // Сортований список акаунтів: при виборі критерію найкращий акаунт переноситься на 1-ше місце
  const sortedCompareList = useMemo(() => {
    if (!sortBy) return compareList;

    const list = [...compareList];
    list.sort((a, b) => {
      const valA = valuations[a.id];
      const valB = valuations[b.id];
      if (!valA || !valB) return 0;

      switch (sortBy) {
        case 'white':
          return (valB.white?.avg || 0) - (valA.white?.avg || 0);
        case 'mix':
          return (valB.mix?.avg || 0) - (valA.mix?.avg || 0);
        case 'blast':
          return (valB.blast?.avg || 0) - (valA.blast?.avg || 0);
        case 'army_atk':
          return (valB.armyAtk?.value || 0) - (valA.armyAtk?.value || 0);
        case 'army_hp':
          return (valB.armyHp?.value || 0) - (valA.armyHp?.value || 0);
        case 'mana':
          return (valB.mana?.score || 0) - (valA.mana?.score || 0);
        case 'artifact':
          return (valB.artifact?.level || 0) - (valA.artifact?.level || 0);
        case 'skins':
          return (valB.skins?.level || 0) - (valA.skins?.level || 0);
        case 'champ':
          return (valB.champ?.count || 0) - (valA.champ?.count || 0);
        case 'low_might':
          return (valB.isLowMight ? 1 : 0) - (valA.isLowMight ? 1 : 0);
        case 'max_kd':
          return (valB.maxKd?.kd || 0) - (valA.maxKd?.kd || 0);
        case 'price':
          return (a.price || 0) - (b.price || 0);
        case 'score':
          return (valB.totalScore || 0) - (valA.totalScore || 0);
        case 'value':
          return (valB.valueIndex || 0) - (valA.valueIndex || 0);
        default:
          return 0;
      }
    });
    return list;
  }, [compareList, valuations, sortBy]);

  // Знаходимо найкращі акаунти за показниками
  const highlights = useMemo(() => {
    if (compareList.length === 0) return { bestValueId: null, topPowerId: null };

    let maxScore = -1;
    let topPowerId = null;
    let maxValueIndex = -1;
    let bestValueId = null;

    compareList.forEach(acc => {
      const v = valuations[acc.id];
      if (v) {
        if (v.totalScore > maxScore) {
          maxScore = v.totalScore;
          topPowerId = acc.id;
        }
        if (v.valueIndex > maxValueIndex) {
          maxValueIndex = v.valueIndex;
          bestValueId = acc.id;
        }
      }
    });

    return { bestValueId, topPowerId };
  }, [compareList, valuations]);

  // Максимальний бал серед порівнюваних для шкали
  const maxComparisonScore = useMemo(() => {
    let max = 1;
    Object.values(valuations).forEach(v => {
      if (v && v.totalScore > max) max = v.totalScore;
    });
    return max;
  }, [valuations]);

  // Доступні акаунти для Дуелі (порівнювані + улюблені + каталог)
  const duelAccountOptions = useMemo(() => {
    const map = new Map();
    compareList.forEach(acc => map.set(acc.id, { ...acc, source: 'comparison' }));
    wishlist.forEach(item => {
      if ((item.type === 'account' || item.stats || item.white_stats) && !map.has(item.id)) {
        map.set(item.id, { ...item, source: 'wishlist' });
      }
    });
    catalogAccounts.forEach(acc => {
      if (!map.has(acc.id)) {
        map.set(acc.id, { ...acc, source: 'catalog' });
      }
    });
    return Array.from(map.values());
  }, [compareList, wishlist, catalogAccounts]);

  // Ініціалізація вибору для Дуелі
  useEffect(() => {
    if (duelAccountOptions.length > 0) {
      if (!duelAcc1Id || !duelAccountOptions.some(a => a.id === duelAcc1Id)) {
        setDuelAcc1Id(duelAccountOptions[0]?.id || null);
      }
      if (!duelAcc2Id || !duelAccountOptions.some(a => a.id === duelAcc2Id)) {
        setDuelAcc2Id(duelAccountOptions[1]?.id || duelAccountOptions[0]?.id || null);
      }
    }
  }, [duelAccountOptions, duelAcc1Id, duelAcc2Id]);

  // Обробник кліку по критерію для сортування
  const handleSortCriterion = (criterionKey, label) => {
    if (sortBy === criterionKey) {
      setSortBy(null);
      toast(t('compare.resetSort', 'Сортування скинуто'), { icon: '🔄' });
    } else {
      setSortBy(criterionKey);
      toast.success(isUk ? `Топ-акаунт за «${label}» на 1-му місці!` : `Top account for "${label}" placed 1st!`, { icon: '🔝' });
    }
  };

  const heroesSectionTitle = isUk ? 'Герої, Фамільяри та інше' : (isDe ? 'Helden, Vertraute und Sonstiges' : 'Hero, Fam and Other');

  if (compareList.length === 0 && viewMode === 'table') {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 min-h-[65vh]">
        <div className="w-24 h-24 bg-blue-900/20 rounded-3xl flex items-center justify-center mb-6 border border-blue-500/20 shadow-[0_0_40px_rgba(59,130,246,0.15)]">
          <Scale className="w-12 h-12 text-blue-400 animate-pulse" />
        </div>
        <h2 className="text-3xl font-black text-white mb-3 tracking-wide">{t('compare.emptyTitle', 'Немає акаунтів для порівняння')}</h2>
        <p className="text-slate-400 max-w-md text-center mb-8 leading-relaxed">
          {t('compare.emptyDesc', 'Додайте акаунти в порівняння через іконку терезів у каталозі або відкрийте Дуель 1 vs 1.')}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link 
            to="/accounts" 
            className="px-7 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-xl transition-all shadow-xl shadow-blue-600/25 flex items-center gap-2"
          >
            {t('compare.goToAccounts', 'Перейти до акаунтів')} <ChevronRight className="w-5 h-5" />
          </Link>
          {duelAccountOptions.length >= 2 && (
            <button
              onClick={() => setViewMode('duel')}
              className="px-7 py-3.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 font-black rounded-xl transition-all flex items-center gap-2"
            >
              <Swords className="w-5 h-5 text-amber-400" /> {t('compare.openDuel', 'Відкрити Дуель 1 vs 1')}
            </button>
          )}
        </div>
      </div>
    );
  }

  const emptySlotsCount = Math.max(0, 4 - sortedCompareList.length);
  const emptySlots = Array.from({ length: emptySlotsCount });

  // Розрахунок даних для Дуелі
  const duelAcc1 = duelAccountOptions.find(a => a.id === duelAcc1Id);
  const duelAcc2 = duelAccountOptions.find(a => a.id === duelAcc2Id);
  const duelVal1 = duelAcc1 ? calculateAccountValuation(duelAcc1, 1250, activePreset) : null;
  const duelVal2 = duelAcc2 ? calculateAccountValuation(duelAcc2, 1250, activePreset) : null;

  return (
    <div className="pb-24 pt-6 max-w-[1440px] mx-auto px-4 min-h-[75vh]">
      {/* Шапка сторінки */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/10 border border-blue-500/20 rounded-xl">
              <Scale className="w-7 h-7 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide flex items-center gap-2">
                {t('compare.title', 'Порівняння та Оцінка Акаунтів')}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('compare.subtitle', 'Оцінка сили за пресетами стилю гри, сортування в 1 клік та швидка дуель 1 vs 1.')}
              </p>
            </div>
          </div>
        </div>

        {/* Перемикач режимів: Таблиця vs Дуель */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 shadow-inner">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                viewMode === 'table' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" /> {t('compare.tableTab', 'Таблиця')} ({compareList.length})
            </button>
            <button
              onClick={() => setViewMode('duel')}
              className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                viewMode === 'duel' 
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 shadow-md font-black' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Swords className="w-4 h-4" /> ⚔️ {t('compare.duelTab', 'Дуель 1 vs 1')}
            </button>
          </div>

          {compareList.length > 0 && viewMode === 'table' && (
            <button
              onClick={clearCompare}
              className="text-xs font-bold text-slate-400 hover:text-red-400 flex items-center gap-1.5 transition-colors px-3 py-2 bg-slate-900/80 rounded-xl border border-slate-800 hover:border-red-500/30"
              title="Очистити список порівняння"
            >
              <Trash2 className="w-3.5 h-3.5" /> {t('compare.clear', 'Очистити')}
            </button>
          )}
        </div>
      </div>

      {/* Панель пресетів (Стиль гри / Роль) */}
      <div className="mb-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 backdrop-blur-md shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2.5">
          <div className="flex items-center gap-2 text-xs font-black text-slate-300 uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-400" />
            {t('compare.styleLabel', 'Стиль оцінки та роль у грі:')}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            {PRESETS.find(p => p.id === activePreset)?.desc}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {PRESETS.map(preset => {
            const isActive = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  setActivePreset(preset.id);
                  toast.success(`Preset: ${preset.shortLabel}`, { icon: '🎯' });
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center text-center gap-0.5 border last:col-span-2 sm:last:col-span-1 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400 shadow-md shadow-blue-500/20 scale-[1.02]'
                    : 'bg-slate-950/70 hover:bg-slate-800/80 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>{preset.label}</span>
                <span className={`text-[10px] font-normal ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                  {preset.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* РЕЖИМ 1: ТАБЛИЦЯ ПОРІВНЯННЯ                                           */}
      {/* ==================================================================== */}
      {viewMode === 'table' && (
        <>
          {/* Вердикт: Найвигідніший та Топ Сила */}
          {sortedCompareList.length >= 2 && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {highlights.bestValueId && (() => {
                const acc = sortedCompareList.find(a => a.id === highlights.bestValueId);
                const v = valuations[highlights.bestValueId];
                if (!acc || !v) return null;
                return (
                  <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-4 shadow-lg">
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl shrink-0">
                      <Flame className="w-7 h-7 text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          🔥 Best Value (${acc.price})
                        </span>
                        <span className="text-xs text-slate-400 font-mono">ID: {acc.id}</span>
                      </div>
                      <h4 className="text-white font-bold text-sm truncate">{acc.title}</h4>
                      <p className="text-xs text-slate-300 mt-1">
                        <strong className="text-emerald-400 font-black">{v.valueIndex} pts/$</strong> ({v.totalScore} pts)
                      </p>
                    </div>
                  </div>
                );
              })()}

              {highlights.topPowerId && (() => {
                const acc = sortedCompareList.find(a => a.id === highlights.topPowerId);
                const v = valuations[highlights.topPowerId];
                if (!acc || !v) return null;
                return (
                  <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-4 shadow-lg">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl shrink-0">
                      <Crown className="w-7 h-7 text-amber-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          👑 Top Battle Power
                        </span>
                        <span className="text-xs text-slate-400 font-mono">ID: {acc.id}</span>
                      </div>
                      <h4 className="text-white font-bold text-sm truncate">{acc.title}</h4>
                      <p className="text-xs text-slate-300 mt-1">
                        Power leader: <strong className="text-amber-400 font-black">{v.totalScore} pts</strong> (${acc.price})
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Підказка для мобільних */}
          <div className="md:hidden flex items-center justify-center gap-2 py-2.5 px-4 mb-3 bg-blue-500/15 border border-blue-500/30 rounded-xl text-xs font-black text-blue-300 shadow-sm text-center">
            {t('compare.mobileSwipeHint', '👈 Гортайте вбік для перегляду та порівняння акаунтів 👉')}
          </div>

          {/* Індикатор активного сортування */}
          {sortBy && (
            <div className="mb-3 flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2 text-xs text-amber-300 font-black">
              <span className="flex items-center gap-2">
                <ArrowDownUp className="w-4 h-4 text-amber-400" />
                {isUk ? 'Сортування активне: найкращий акаунт перенесено на перше місце' : 'Sorting active: top account moved to 1st place'}
              </span>
              <button
                onClick={() => setSortBy(null)}
                className="text-[11px] underline hover:text-white flex items-center gap-1 font-bold"
              >
                <RotateCcw className="w-3 h-3" /> {t('compare.resetSort', 'Скинути')}
              </button>
            </div>
          )}

          {/* Велика порівняльна таблиця */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm">
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-left border-collapse min-w-[650px] sm:min-w-[1100px]">
                {/* Header: картки акаунтів */}
                <thead>
                  <tr>
                    {/* Лівий верхній кут: Критерії Оцінки */}
                    <th className="p-3 sm:p-5 border-b border-r border-slate-800 bg-slate-950/95 backdrop-blur-md md:sticky md:left-0 z-30 w-36 sm:w-64 min-w-[135px] sm:min-w-[210px] align-top md:shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
                      <div className="flex flex-col gap-1.5">
                        <div className="text-blue-400 font-black uppercase text-xs tracking-wider flex items-center gap-1.5">
                          <Scale className="w-4 h-4 text-blue-400 shrink-0" /> {t('compare.criteriaHeader', 'Критерії Оцінки')}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium leading-relaxed hidden sm:block">
                          {t('compare.criteriaDesc', 'Клікніть на критерій, щоб перенести найкращий акаунт на 1-ше місце 🔝')}
                        </div>
                        {sortBy && (
                          <button 
                            onClick={() => setSortBy(null)}
                            className="mt-1 text-[11px] font-black text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg w-max flex items-center gap-1 transition-all"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> {t('compare.resetSort', 'Скинути')}
                          </button>
                        )}
                      </div>
                    </th>

                    {sortedCompareList.map((acc, index) => {
                      const val = valuations[acc.id];
                      const isBestValue = highlights.bestValueId === acc.id;
                      const isTopPower = highlights.topPowerId === acc.id;
                      const scorePercent = maxComparisonScore > 0 ? Math.round((val.totalScore / maxComparisonScore) * 100) : 0;

                      return (
                        <th key={`head-${acc.id}`} className="p-3 sm:p-5 border-b border-r border-slate-800 bg-slate-900/60 w-64 sm:w-80 min-w-[230px] sm:min-w-[270px] relative align-top group">
                          <button 
                            onClick={() => removeFromCompare(acc.id)}
                            className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 z-10 shadow-lg"
                            title="Видалити"
                          >
                            <X className="w-4 h-4" />
                          </button>

                          {/* Позиція в списку (ТОП 1 при сортуванні) */}
                          {sortBy && index === 0 && (
                            <div className="mb-2 bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 w-max shadow-md">
                              <Trophy className="w-3 h-3 text-slate-950" /> #1 {t('compare.topChoice', 'Переможець за вибором')}
                            </div>
                          )}

                          {/* Бейджі статусу */}
                          <div className="flex flex-col gap-1.5 mb-2.5 min-h-[32px]">
                            {isBestValue && (
                              <span className="text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1 w-max">
                                <Flame className="w-3.5 h-3.5" /> Best Value ({val.valueIndex} pts/$)
                              </span>
                            )}
                            {isTopPower && (
                              <span className="text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-md flex items-center gap-1 w-max">
                                <Crown className="w-3.5 h-3.5" /> Top Power ({val.totalScore} pts)
                              </span>
                            )}
                            {val.isLowMight && (
                              <span className="text-xs font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-md flex items-center gap-1 w-max">
                                ⚡ Low Might (+{val.lowMightScore} pts)
                              </span>
                            )}
                          </div>

                          {/* Клікабельна Картинка */}
                          <Link 
                            to={`/accounts/${acc.id}`} 
                            className="block group/img relative w-full aspect-video bg-slate-800 rounded-xl mb-3 overflow-hidden border border-slate-700 shadow-md cursor-pointer"
                            title="Детальніше"
                          >
                            {acc.images && acc.images.length > 0 ? (
                              <img 
                                src={getImageUrl(acc.images[0])} 
                                alt={acc.title} 
                                className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500" 
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-600">
                                <ImageIcon className="w-8 h-8" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-black backdrop-blur-[2px]">
                              <Eye className="w-4 h-4 text-blue-400" /> {t('compare.details', 'Детальніше')}
                            </div>
                            <div className="absolute bottom-1.5 left-1.5 bg-slate-950/90 text-white text-[11px] px-2 py-0.5 rounded font-mono border border-slate-700 font-bold">
                              ID: {acc.id}
                            </div>
                          </Link>

                          {/* Клікабельний Заголовок */}
                          <Link 
                            to={`/accounts/${acc.id}`}
                            className="text-white hover:text-blue-400 font-black text-sm sm:text-base mb-2 line-clamp-2 leading-snug block transition-colors" 
                            title={acc.title}
                          >
                            {acc.title}
                          </Link>
                          
                          {/* Ціна */}
                          <div className="flex items-baseline justify-between mb-3 gap-2">
                            <div>
                              <PriceDisplay price={acc.price} size="lg" />
                            </div>
                            <div className="text-xs font-extrabold text-slate-300 shrink-0">
                              {val.valueIndex} <span className="text-[11px] font-medium text-slate-400">pts/$</span>
                            </div>
                          </div>

                          {/* Шкала сили під поточний пресет */}
                          <div className="mb-4 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-slate-300 font-black flex items-center gap-1 text-[11px]">
                                <Zap className="w-3.5 h-3.5 text-amber-400" /> Score ({PRESETS.find(p => p.id === activePreset)?.shortLabel}):
                              </span>
                              <span className="font-black text-amber-400 text-sm">{val.totalScore} pts</span>
                            </div>
                            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-700 ${isTopPower ? 'bg-gradient-to-r from-amber-500 to-amber-300' : 'bg-gradient-to-r from-blue-500 to-emerald-400'}`}
                                style={{ width: `${scorePercent}%` }}
                              />
                            </div>
                          </div>

                          {/* Кнопки дій */}
                          <div className="flex items-center gap-2">
                            <Link 
                              to={`/accounts/${acc.id}`}
                              className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-1.5 hover:border-slate-500 shadow-sm"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-400" /> {t('compare.details', 'Детальніше')}
                            </Link>
                            <button 
                              onClick={() => {
                                addToCart({ product: acc, type: 'account', price: acc.price });
                                toast.success(t('orderModal.confirm', "Додано в кошик!"));
                              }}
                              className="flex-1 py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 hover:-translate-y-0.5"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" /> {t('compare.addToCart', 'В кошик')}
                            </button>
                          </div>
                        </th>
                      );
                    })}

                    {emptySlots.map((_, i) => (
                      <th key={`empty-${i}`} className="p-5 border-b border-r border-slate-800 bg-slate-900/20 w-64 sm:w-80 min-w-[230px] sm:min-w-[270px]">
                        <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-slate-600 opacity-40 border-2 border-dashed border-slate-700/60 rounded-2xl">
                          <Scale className="w-10 h-10 mb-2" />
                          <span className="text-xs uppercase font-black tracking-wider text-center">{t('compare.freeSlot', 'Вільне місце для порівняння')}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {/* ========================================================= */}
                  {/* СЕКЦІЯ 1: ОЦІНКА СИЛИ ТА ВАРТОСТІ (LM VALUATION) */}
                  {/* ========================================================= */}
                  <tr className="bg-gradient-to-r from-blue-950/80 via-slate-950 to-slate-950 border-b border-blue-500/30">
                    <td colSpan={sortedCompareList.length + emptySlots.length + 1} className="py-2.5 px-4 md:sticky md:left-0 z-20 bg-slate-950/95 backdrop-blur-md">
                      <div className="sticky left-4 flex items-center gap-2 text-xs sm:text-sm font-black text-amber-400 uppercase tracking-widest w-max max-w-full">
                        <Zap className="w-4 h-4 text-amber-400" />
                        {t('compare.powerCriteria', 'Критерії Оцінки Ринкової Сили')} ({PRESETS.find(p => p.id === activePreset)?.shortLabel})
                      </div>
                    </td>
                  </tr>

                  {/* 1. Base stats */}
                  <tr className="hover:bg-slate-800/40 transition-colors border-b border-slate-800/40 group">
                    <td 
                      onClick={() => handleSortCriterion('white', 'Base stats')}
                      className={`p-2.5 sm:p-4 pl-3 sm:pl-6 border-r border-slate-800 text-slate-200 font-black text-xs sm:text-sm md:sticky md:left-0 z-20 backdrop-blur-md md:shadow-[4px_0_12px_rgba(0,0,0,0.5)] cursor-pointer transition-colors ${
                        sortBy === 'white' ? 'bg-amber-950/60 border-l-4 border-l-amber-400' : 'bg-slate-950/95 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-3 h-3 rounded-full bg-slate-200 inline-block shadow-sm" />
                          <div>
                            <div className="text-white font-black text-xs sm:text-sm">Base stats</div>
                            <div className="text-xs text-slate-400 font-semibold mt-0.5">Inf-Rng-Cav (Weight ×3.0)</div>
                          </div>
                        </div>
                        <button className="text-[10px] bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 px-2 py-0.5 rounded font-black transition-colors shrink-0">
                          {sortBy === 'white' ? '🔝 #1' : '↕ sort'}
                        </button>
                      </div>
                    </td>
                    {sortedCompareList.map(acc => {
                      const v = valuations[acc.id]?.white;
                      return (
                        <td key={`white-${acc.id}`} className="p-4 border-r border-slate-800 text-center align-middle">
                          {v && (v.sum > 0 || v.raw) ? (
                            <div>
                              <div className="font-mono font-black text-white text-sm tracking-wider">{v.raw || `${v.inf}-${v.range}-${v.cav}`}</div>
                              <div className="text-xs text-slate-300 font-bold mt-1">
                                Avg: <span className="text-white font-black">{Math.round(v.avg)}%</span> → <span className="text-amber-400 font-black">+{v.score} pts</span>
                              </div>
                            </div>
                          ) : <span className="text-slate-600 font-black">—</span>}
                        </td>
                      );
                    })}
                    {emptySlots.map((_, i) => <td key={`ewhite-${i}`} className="border-r border-slate-800 bg-slate-900/20"></td>)}
                  </tr>

                  {/* 2. Mix stats */}
                  <tr className="hover:bg-slate-800/40 transition-colors border-b border-slate-800/40 group">
                    <td 
                      onClick={() => handleSortCriterion('mix', 'Mix stats')}
                      className={`p-2.5 sm:p-4 pl-3 sm:pl-6 border-r border-slate-800 text-slate-200 font-black text-xs sm:text-sm md:sticky md:left-0 z-20 backdrop-blur-md md:shadow-[4px_0_12px_rgba(0,0,0,0.5)] cursor-pointer transition-colors ${
                        sortBy === 'mix' ? 'bg-amber-950/60 border-l-4 border-l-amber-400' : 'bg-slate-950/95 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <Swords className="w-4 h-4 text-purple-400" />
                          <div>
                            <div className="text-white font-black text-xs sm:text-sm">Mix stats</div>
                            <div className="text-xs text-slate-400 font-semibold mt-0.5">Inf-Rng-Cav (Weight ×2.0–4.2)</div>
                          </div>
                        </div>
                        <button className="text-[10px] bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 px-2 py-0.5 rounded font-black transition-colors shrink-0">
                          {sortBy === 'mix' ? '🔝 #1' : '↕ sort'}
                        </button>
                      </div>
                    </td>
                    {sortedCompareList.map(acc => {
                      const v = valuations[acc.id]?.mix;
                      return (
                        <td key={`mix-${acc.id}`} className="p-4 border-r border-slate-800 text-center align-middle">
                          {v && (v.sum > 0 || v.raw) ? (
                            <div>
                              <div className="font-mono font-black text-purple-300 text-sm tracking-wider">{v.raw || `${v.inf}-${v.range}-${v.cav}`}</div>
                              <div className="text-xs text-slate-300 font-bold mt-1">
                                Avg: <span className="text-white font-black">{Math.round(v.avg)}%</span> → <span className="text-amber-400 font-black">+{v.score} pts</span>
                              </div>
                            </div>
                          ) : <span className="text-slate-600 font-black">—</span>}
                        </td>
                      );
                    })}
                    {emptySlots.map((_, i) => <td key={`emix-${i}`} className="border-r border-slate-800 bg-slate-900/20"></td>)}
                  </tr>

                  {/* 3. Blast stats */}
                  <tr className="hover:bg-slate-800/40 transition-colors border-b border-slate-800/40 group">
                    <td 
                      onClick={() => handleSortCriterion('blast', 'Blast stats')}
                      className={`p-2.5 sm:p-4 pl-3 sm:pl-6 border-r border-slate-800 text-slate-200 font-black text-xs sm:text-sm md:sticky md:left-0 z-20 backdrop-blur-md md:shadow-[4px_0_12px_rgba(0,0,0,0.5)] cursor-pointer transition-colors ${
                        sortBy === 'blast' ? 'bg-amber-950/60 border-l-4 border-l-amber-400' : 'bg-slate-950/95 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <Flame className="w-4 h-4 text-rose-500" />
                          <div>
                            <div className="text-white font-black text-xs sm:text-sm">Blast stats</div>
                            <div className="text-xs text-slate-400 font-semibold mt-0.5">Inf-Rng-Cav (Weight ×1.2–3.6)</div>
                          </div>
                        </div>
                        <button className="text-[10px] bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 px-2 py-0.5 rounded font-black transition-colors shrink-0">
                          {sortBy === 'blast' ? '🔝 #1' : '↕ sort'}
                        </button>
                      </div>
                    </td>
                    {sortedCompareList.map(acc => {
                      const v = valuations[acc.id]?.blast;
                      return (
                        <td key={`blast-${acc.id}`} className="p-4 border-r border-slate-800 text-center align-middle">
                          {v && (v.sum > 0 || v.raw) ? (
                            <div>
                              <div className="font-mono font-black text-rose-400 text-sm tracking-wider">{v.raw || `${v.inf}-${v.range}-${v.cav}`}</div>
                              <div className="text-xs text-slate-300 font-bold mt-1">
                                Avg: <span className="text-white font-black">{Math.round(v.avg)}%</span> → <span className="text-amber-400 font-black">+{v.score} pts</span>
                              </div>
                            </div>
                          ) : <span className="text-slate-600 font-black">—</span>}
                        </td>
                      );
                    })}
                    {emptySlots.map((_, i) => <td key={`eblast-${i}`} className="border-r border-slate-800 bg-slate-900/20"></td>)}
                  </tr>

                  {/* 4. Army ATK & Army HP */}
                  <tr className="hover:bg-slate-800/40 transition-colors border-b border-slate-800/40 group">
                    <td 
                      onClick={() => handleSortCriterion('army_atk', 'Army ATK & Army HP')}
                      className={`p-2.5 sm:p-4 pl-3 sm:pl-6 border-r border-slate-800 text-slate-200 font-black text-xs sm:text-sm md:sticky md:left-0 z-20 backdrop-blur-md md:shadow-[4px_0_12px_rgba(0,0,0,0.5)] cursor-pointer transition-colors ${
                        sortBy === 'army_atk' ? 'bg-amber-950/60 border-l-4 border-l-amber-400' : 'bg-slate-950/95 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <Users className="w-4 h-4 text-blue-400" />
                          <div>
                            <div className="text-white font-black text-xs sm:text-sm">Army ATK & Army HP</div>
                            <div className="text-xs text-slate-400 font-semibold mt-0.5">Overall troop strength</div>
                          </div>
                        </div>
                        <button className="text-[10px] bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 px-2 py-0.5 rounded font-black transition-colors shrink-0">
                          {sortBy === 'army_atk' ? '🔝 #1' : '↕ sort'}
                        </button>
                      </div>
                    </td>
                    {sortedCompareList.map(acc => {
                      const v = valuations[acc.id];
                      return (
                        <td key={`army-${acc.id}`} className="p-4 border-r border-slate-800 text-center align-middle">
                          <div className="text-xs font-black text-slate-200">
                            ATK: <span className="text-blue-400 font-black text-sm">{v.armyAtk.value}%</span> (+{v.armyAtk.score})
                          </div>
                          <div className="text-xs font-black text-slate-200 mt-1">
                            HP: <span className="text-emerald-400 font-black text-sm">{v.armyHp.value}%</span> (+{v.armyHp.score})
                          </div>
                        </td>
                      );
                    })}
                    {emptySlots.map((_, i) => <td key={`earmy-${i}`} className="border-r border-slate-800 bg-slate-900/20"></td>)}
                  </tr>

                  {/* 5. Mana Troops */}
                  <tr className="hover:bg-slate-800/40 transition-colors border-b border-slate-800/40 group">
                    <td 
                      onClick={() => handleSortCriterion('mana', 'Mana Troops')}
                      className={`p-2.5 sm:p-4 pl-3 sm:pl-6 border-r border-slate-800 text-slate-200 font-black text-xs sm:text-sm md:sticky md:left-0 z-20 backdrop-blur-md md:shadow-[4px_0_12px_rgba(0,0,0,0.5)] cursor-pointer transition-colors ${
                        sortBy === 'mana' ? 'bg-amber-950/60 border-l-4 border-l-amber-400' : 'bg-slate-950/95 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <Zap className="w-4 h-4 text-amber-400" />
                          <div>
                            <div className="text-white font-black text-xs sm:text-sm">Mana Troops</div>
                            <div className="text-xs text-slate-400 font-semibold mt-0.5">T5 levels 1–6</div>
                          </div>
                        </div>
                        <button className="text-[10px] bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 px-2 py-0.5 rounded font-black transition-colors shrink-0">
                          {sortBy === 'mana' ? '🔝 #1' : '↕ sort'}
                        </button>
                      </div>
                    </td>
                    {sortedCompareList.map(acc => {
                      const v = valuations[acc.id]?.mana;
                      return (
                        <td key={`mana-${acc.id}`} className="p-4 border-r border-slate-800 text-center align-middle">
                          {v && v.score > 0 ? (
                            <span className="text-xs font-black text-amber-400 bg-amber-500/15 px-2.5 py-1 rounded-lg border border-amber-500/30 inline-block shadow-sm">
                              Lvl {v.level} (+{v.score} pts)
                            </span>
                          ) : <span className="text-slate-500 font-bold text-xs">— (0 pts)</span>}
                        </td>
                      );
                    })}
                    {emptySlots.map((_, i) => <td key={`emana-${i}`} className="border-r border-slate-800 bg-slate-900/20"></td>)}
                  </tr>

                  {/* 6. Artifact lvl */}
                  <tr className="hover:bg-slate-800/40 transition-colors border-b border-slate-800/40 group">
                    <td 
                      onClick={() => handleSortCriterion('artifact', 'Artifact lvl')}
                      className={`p-2.5 sm:p-4 pl-3 sm:pl-6 border-r border-slate-800 text-slate-200 font-black text-xs sm:text-sm md:sticky md:left-0 z-20 backdrop-blur-md md:shadow-[4px_0_12px_rgba(0,0,0,0.5)] cursor-pointer transition-colors ${
                        sortBy === 'artifact' ? 'bg-amber-950/60 border-l-4 border-l-amber-400' : 'bg-slate-950/95 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <Star className="w-4 h-4 text-amber-300" />
                          <div>
                            <div className="text-white font-black text-xs sm:text-sm">Artifact lvl</div>
                            <div className="text-xs text-slate-400 font-semibold mt-0.5">Tier (700 / 1500 / 1500+)</div>
                          </div>
                        </div>
                        <button className="text-[10px] bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 px-2 py-0.5 rounded font-black transition-colors shrink-0">
                          {sortBy === 'artifact' ? '🔝 #1' : '↕ sort'}
                        </button>
                      </div>
                    </td>
                    {sortedCompareList.map(acc => {
                      const v = valuations[acc.id]?.artifact;
                      return (
                        <td key={`art-${acc.id}`} className="p-4 border-r border-slate-800 text-center align-middle">
                          {v && v.level > 0 ? (
                            <div>
                              <span className="font-black text-white text-sm">{v.level}</span>
                              <div className="text-xs text-amber-400 font-black mt-0.5">+{v.score} pts</div>
                            </div>
                          ) : <span className="text-slate-600 font-black">—</span>}
                        </td>
                      );
                    })}
                    {emptySlots.map((_, i) => <td key={`eart-${i}`} className="border-r border-slate-800 bg-slate-900/20"></td>)}
                  </tr>

                  {/* 7. Castle start / Castle stars */}
                  <tr className="hover:bg-slate-800/40 transition-colors border-b border-slate-800/40 group">
                    <td 
                      onClick={() => handleSortCriterion('skins', 'Castle stars')}
                      className={`p-2.5 sm:p-4 pl-3 sm:pl-6 border-r border-slate-800 text-slate-200 font-black text-xs sm:text-sm md:sticky md:left-0 z-20 backdrop-blur-md md:shadow-[4px_0_12px_rgba(0,0,0,0.5)] cursor-pointer transition-colors ${
                        sortBy === 'skins' ? 'bg-amber-950/60 border-l-4 border-l-amber-400' : 'bg-slate-950/95 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <Castle className="w-4 h-4 text-blue-400" />
                          <div>
                            <div className="text-white font-black text-xs sm:text-sm">Castle start</div>
                            <div className="text-xs text-slate-400 font-semibold mt-0.5">Castle stars & skins</div>
                          </div>
                        </div>
                        <button className="text-[10px] bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 px-2 py-0.5 rounded font-black transition-colors shrink-0">
                          {sortBy === 'skins' ? '🔝 #1' : '↕ sort'}
                        </button>
                      </div>
                    </td>
                    {sortedCompareList.map(acc => {
                      const v = valuations[acc.id]?.skins;
                      return (
                        <td key={`skin-${acc.id}`} className="p-4 border-r border-slate-800 text-center align-middle">
                          {v && v.level > 0 ? (
                            <div>
                              <span className="font-black text-white text-sm">{v.level}</span>
                              <div className="text-xs text-amber-400 font-black mt-0.5">+{v.score} pts</div>
                            </div>
                          ) : <span className="text-slate-600 font-black">—</span>}
                        </td>
                      );
                    })}
                    {emptySlots.map((_, i) => <td key={`eskin-${i}`} className="border-r border-slate-800 bg-slate-900/20"></td>)}
                  </tr>

                  {/* 8. Champ Pieces */}
                  <tr className="hover:bg-slate-800/40 transition-colors border-b border-slate-800/40 group">
                    <td 
                      onClick={() => handleSortCriterion('champ', 'Champ Gear')}
                      className={`p-2.5 sm:p-4 pl-3 sm:pl-6 border-r border-slate-800 text-slate-200 font-black text-xs sm:text-sm md:sticky md:left-0 z-20 backdrop-blur-md md:shadow-[4px_0_12px_rgba(0,0,0,0.5)] cursor-pointer transition-colors ${
                        sortBy === 'champ' ? 'bg-amber-950/60 border-l-4 border-l-amber-400' : 'bg-slate-950/95 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <Crown className="w-4 h-4 text-amber-400" />
                          <div>
                            <div className="text-white font-black text-xs sm:text-sm">Champ Gear</div>
                            <div className="text-xs text-slate-400 font-semibold mt-0.5">Champion equipment count</div>
                          </div>
                        </div>
                        <button className="text-[10px] bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 px-2 py-0.5 rounded font-black transition-colors shrink-0">
                          {sortBy === 'champ' ? '🔝 #1' : '↕ sort'}
                        </button>
                      </div>
                    </td>
                    {sortedCompareList.map(acc => {
                      const v = valuations[acc.id]?.champ;
                      return (
                        <td key={`champ-${acc.id}`} className="p-4 border-r border-slate-800 text-center align-middle">
                          {v && v.count > 0 ? (
                            <div>
                              <span className="font-black text-amber-300 text-sm">{v.count} pcs</span>
                              <div className="text-xs text-amber-400 font-black mt-0.5">+{v.score} pts</div>
                            </div>
                          ) : <span className="text-slate-600 font-black">—</span>}
                        </td>
                      );
                    })}
                    {emptySlots.map((_, i) => <td key={`echamp-${i}`} className="border-r border-slate-800 bg-slate-900/20"></td>)}
                  </tr>

                  {/* 9. Low Might */}
                  <tr className="hover:bg-slate-800/40 transition-colors border-b border-slate-800/40 group">
                    <td 
                      onClick={() => handleSortCriterion('low_might', 'Low Might')}
                      className={`p-2.5 sm:p-4 pl-3 sm:pl-6 border-r border-slate-800 text-slate-200 font-black text-xs sm:text-sm md:sticky md:left-0 z-20 backdrop-blur-md md:shadow-[4px_0_12px_rgba(0,0,0,0.5)] cursor-pointer transition-colors ${
                        sortBy === 'low_might' ? 'bg-amber-950/60 border-l-4 border-l-amber-400' : 'bg-slate-950/95 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <Sparkles className="w-4 h-4 text-purple-400" />
                          <div>
                            <div className="text-white font-black text-xs sm:text-sm">Low Might</div>
                            <div className="text-xs text-slate-400 font-semibold mt-0.5">0 Quest Might bonus</div>
                          </div>
                        </div>
                        <button className="text-[10px] bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 px-2 py-0.5 rounded font-black transition-colors shrink-0">
                          {sortBy === 'low_might' ? '🔝 #1' : '↕ sort'}
                        </button>
                      </div>
                    </td>
                    {sortedCompareList.map(acc => {
                      const v = valuations[acc.id];
                      return (
                        <td key={`lowm-${acc.id}`} className="p-4 border-r border-slate-800 text-center align-middle">
                          {v.isLowMight ? (
                            <span className="text-xs font-black text-purple-300 bg-purple-500/20 px-2.5 py-1 rounded-lg border border-purple-500/40 inline-flex items-center gap-1.5 shadow-sm">
                              <CheckCircle2 className="w-4 h-4 text-purple-400" /> YES (+{v.lowMightScore} pts)
                            </span>
                          ) : <span className="text-slate-500 font-bold text-xs">No</span>}
                        </td>
                      );
                    })}
                    {emptySlots.map((_, i) => <td key={`elowm-${i}`} className="border-r border-slate-800 bg-slate-900/20"></td>)}
                  </tr>

                  {/* 10. Max KD */}
                  <tr className="hover:bg-slate-800/40 transition-colors border-b border-slate-800/40 group">
                    <td 
                      onClick={() => handleSortCriterion('max_kd', 'Max KD')}
                      className={`p-2.5 sm:p-4 pl-3 sm:pl-6 border-r border-slate-800 text-slate-200 font-black text-xs sm:text-sm md:sticky md:left-0 z-20 backdrop-blur-md md:shadow-[4px_0_12px_rgba(0,0,0,0.5)] cursor-pointer transition-colors ${
                        sortBy === 'max_kd' ? 'bg-amber-950/60 border-l-4 border-l-amber-400' : 'bg-slate-950/95 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <Globe className="w-4 h-4 text-cyan-400" />
                          <div>
                            <div className="text-white font-black text-xs sm:text-sm">Max KD</div>
                            <div className="text-xs text-slate-400 font-semibold mt-0.5">Migration to fresh KD</div>
                          </div>
                        </div>
                        <button className="text-[10px] bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 px-2 py-0.5 rounded font-black transition-colors shrink-0">
                          {sortBy === 'max_kd' ? '🔝 #1' : '↕ sort'}
                        </button>
                      </div>
                    </td>
                    {sortedCompareList.map(acc => {
                      const v = valuations[acc.id]?.maxKd;
                      return (
                        <td key={`kd-${acc.id}`} className="p-4 border-r border-slate-800 text-center align-middle">
                          {v && v.kd > 0 ? (
                            <div>
                              <span className="font-black text-white text-sm">K{v.kd}</span>
                              {v.score > 0 && <div className="text-xs text-cyan-400 font-black mt-0.5">+{v.score} pts</div>}
                            </div>
                          ) : <span className="text-slate-600 font-black">—</span>}
                        </td>
                      );
                    })}
                    {emptySlots.map((_, i) => <td key={`ekd-${i}`} className="border-r border-slate-800 bg-slate-900/20"></td>)}
                  </tr>

                  {/* Підсумок: Загальний рейтинг & Value Index */}
                  <tr className="bg-slate-950/95 border-b-2 border-slate-700">
                    <td 
                      onClick={() => handleSortCriterion('score', 'Score')}
                      className={`p-4 pl-4 sm:pl-6 border-r border-slate-800 font-black text-xs sm:text-sm uppercase tracking-wider md:sticky md:left-0 z-20 backdrop-blur-md md:shadow-[4px_0_12px_rgba(0,0,0,0.5)] cursor-pointer ${
                        sortBy === 'score' ? 'bg-amber-950/70 text-white' : 'bg-slate-950/95 text-amber-400'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>{t('compare.ratingSummary', '🏆 РЕЙТИНГ & ВИГІДНІСТЬ')}</span>
                        <button className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-black shrink-0">
                          {sortBy === 'score' ? '#1' : '↕ sort'}
                        </button>
                      </div>
                    </td>
                    {sortedCompareList.map(acc => {
                      const v = valuations[acc.id];
                      const isBestVal = highlights.bestValueId === acc.id;

                      return (
                        <td key={`total-${acc.id}`} className={`p-4 border-r border-slate-800 text-center align-middle ${isBestVal ? 'bg-emerald-500/10' : ''}`}>
                          <div className="text-lg font-black text-amber-400 mb-0.5">
                            {v.totalScore} <span className="text-xs font-bold text-slate-400">pts</span>
                          </div>
                          <div className="text-xs font-black text-emerald-400">
                            {v.valueIndex} pts / $1
                          </div>
                        </td>
                      );
                    })}
                    {emptySlots.map((_, i) => <td key={`etotal-${i}`} className="border-r border-slate-800 bg-slate-900/20"></td>)}
                  </tr>

                  {/* ========================================================= */}
                  {/* СЕКЦІЯ 2: ГЕРОЇ, ФАМІЛЬЯРИ ТА ІНШЕ (Hero, Fam and Other)   */}
                  {/* ========================================================= */}
                  <tr className="bg-gradient-to-r from-purple-950/50 via-slate-950 to-slate-950 border-b border-purple-500/30">
                    <td colSpan={sortedCompareList.length + emptySlots.length + 1} className="py-2.5 px-4 md:sticky md:left-0 z-20 bg-slate-950/95 backdrop-blur-md">
                      <div className="sticky left-4 flex items-center gap-2 text-xs sm:text-sm font-black text-purple-400 uppercase tracking-widest w-max max-w-full">
                        <Crown className="w-4 h-4 text-purple-400" />
                        {heroesSectionTitle}
                      </div>
                    </td>
                  </tr>

                  {[
                    { label: 'Blessed Artifacts', field: 'blessed', icon: Star },
                    { label: 'P2P Hero', field: 'heroes', icon: Crown },
                    { label: 'P2P fam', field: 'familiars', icon: Ghost },
                    { label: 'Artifact lvl', field: 'artifacts', icon: Star }
                  ].map(item => (
                    <tr key={item.field} className="hover:bg-slate-800/40 transition-colors border-b border-slate-800/40">
                      <td className="p-2.5 sm:p-4 pl-3 sm:pl-6 border-r border-slate-800 text-slate-200 font-black text-xs sm:text-sm md:sticky md:left-0 z-20 bg-slate-950/95 backdrop-blur-md md:shadow-[4px_0_12px_rgba(0,0,0,0.5)]"><div className="flex items-center gap-2">
                        <item.icon className="w-4 h-4 text-purple-400 shrink-0" /> {item.label}</div></td>
                      {sortedCompareList.map(acc => (
                        <td key={`${item.field}-${acc.id}`} className="p-4 border-r border-slate-800 text-center align-middle">
                          <span className="font-black text-xs sm:text-sm text-slate-100">{acc.stats?.[item.field] || '—'}</span>
                        </td>
                      ))}
                      {emptySlots.map((_, i) => <td key={`e-${item.field}-${i}`} className="border-r border-slate-800 bg-slate-900/20"></td>)}
                    </tr>
                  ))}

                  {/* ========================================================= */}
                  {/* СЕКЦІЯ 3: LINK ТА TAGS                                    */}
                  {/* ========================================================= */}
                  <tr className="hover:bg-slate-800/40 transition-colors border-b border-slate-800/50">
                    <td className="p-2.5 sm:p-4 pl-3 sm:pl-6 border-r border-slate-800 text-slate-200 font-black text-xs sm:text-sm md:sticky md:left-0 z-20 bg-slate-950/95 backdrop-blur-md md:shadow-[4px_0_12px_rgba(0,0,0,0.5)]"><div className="flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-blue-400 shrink-0" /> Link</div></td>
                    {sortedCompareList.map(acc => (
                      <td key={`bind-${acc.id}`} className="p-4 text-center text-white font-black text-xs sm:text-sm border-r border-slate-800 align-middle">
                        {acc.bind || <span className="text-slate-600 font-bold">—</span>}
                      </td>
                    ))}
                    {emptySlots.map((_, i) => <td key={`e-bind-${i}`} className="border-r border-slate-800 bg-slate-900/20"></td>)}
                  </tr>

                  <tr className="hover:bg-slate-800/40 transition-colors border-b border-slate-800/50">
                    <td className="p-2.5 sm:p-4 pl-3 sm:pl-6 border-r border-slate-800 text-slate-200 font-black text-xs sm:text-sm md:sticky md:left-0 z-20 bg-slate-950/95 backdrop-blur-md md:shadow-[4px_0_12px_rgba(0,0,0,0.5)]"><div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-amber-400 shrink-0" /> Tags</div></td>
                    {sortedCompareList.map(acc => (
                      <td key={`tags-${acc.id}`} className="p-4 border-r border-slate-800 align-middle">
                        <div className="flex flex-wrap justify-center gap-1.5">
                          {acc.tags && acc.tags.length > 0 ? acc.tags.map(tag => (
                            <span key={tag} className="text-xs font-black uppercase tracking-wider bg-slate-800 text-slate-200 px-2.5 py-1 rounded-md border border-slate-700">
                              {tag.trim()}
                            </span>
                          )) : <span className="text-slate-600 font-bold">—</span>}
                        </div>
                      </td>
                    ))}
                    {emptySlots.map((_, i) => <td key={`e-tags-${i}`} className="border-r border-slate-800 bg-slate-900/20"></td>)}
                  </tr>

                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ==================================================================== */}
      {/* РЕЖИМ 2: ⚔️ ДУЕЛЬ 1 vs 1 (ШВИДКИЙ БАТЛ)                              */}
      {/* ==================================================================== */}
      {viewMode === 'duel' && (
        <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-4 sm:p-8 shadow-2xl backdrop-blur-md">
          {duelAccountOptions.length < 2 ? (
            <div className="text-center py-12">
              <Swords className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-black text-white mb-2">{isUk ? 'Недостатньо акаунтів для Дуелі' : 'Not enough accounts for Duel'}</h3>
              <p className="text-xs text-slate-400 mb-6">{isUk ? 'Додайте хоча б 2 акаунти в обране або порівняння, щоб запустити батл.' : 'Add at least 2 accounts to favorites or comparison to launch a battle.'}</p>
              <Link to="/accounts" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs">
                {t('compare.goToAccounts', 'Перейти до акаунтів')}
              </Link>
            </div>
          ) : (
            <div>
              {/* Селектори вибору двох акаунтів */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative mb-8">
                {/* Емблема VS по центру (ПК) */}
                <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-14 h-14 bg-gradient-to-tr from-amber-500 to-rose-500 rounded-full items-center justify-center font-black text-slate-950 text-xl shadow-[0_0_30px_rgba(245,158,11,0.5)] border-4 border-slate-900">
                  VS
                </div>

                {/* Боєць 1 (Лівий) */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 sm:p-5 rounded-2xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-black text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      🔵 {t('compare.duelCorner1', 'Акаунт #1 (Синій кут)')}
                    </span>
                    <select
                      value={duelAcc1Id || ''}
                      onChange={(e) => setDuelAcc1Id(Number(e.target.value))}
                      className="bg-slate-900 border border-slate-700 text-white text-xs font-bold px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 w-full sm:w-auto sm:max-w-[220px]"
                    >
                      {duelAccountOptions.map(acc => (
                        <option key={`opt1-${acc.id}`} value={acc.id} disabled={acc.id === duelAcc2Id}>
                          ID: {acc.id} — {acc.title?.substring(0, 28)}... (${acc.price})
                        </option>
                      ))}
                    </select>
                  </div>

                  {duelAcc1 && duelVal1 && (
                    <div>
                      <div className="aspect-video w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 relative mb-3">
                        {duelAcc1.images && duelAcc1.images.length > 0 ? (
                          <img src={getImageUrl(duelAcc1.images[0])} alt={duelAcc1.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600"><ImageIcon className="w-8 h-8" /></div>
                        )}
                        <div className="absolute bottom-2 left-2 bg-slate-950/90 rounded px-2 py-0.5 border border-slate-700">
                          <PriceDisplay price={duelAcc1.price} size="sm" />
                        </div>
                      </div>
                      <Link to={`/accounts/${duelAcc1.id}`} className="text-white hover:text-blue-400 font-black text-sm block mb-1 truncate">
                        {duelAcc1.title}
                      </Link>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-3">
                        <span>Score ({PRESETS.find(p => p.id === activePreset)?.shortLabel}): <strong className="text-amber-400 font-black">{duelVal1.totalScore} pts</strong></span>
                        <span>{duelVal1.valueIndex} pts/$</span>
                      </div>
                      <div className="flex gap-2">
                        <Link to={`/accounts/${duelAcc1.id}`} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg text-center flex items-center justify-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-blue-400" /> {t('compare.details', 'Деталі')}
                        </Link>
                        <button
                          onClick={() => {
                            addToCart({ product: duelAcc1, type: 'account', price: duelAcc1.price });
                            toast.success(t('orderModal.confirm', "Додано в кошик!"));
                          }}
                          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" /> {t('compare.addToCart', 'В кошик')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Емблема VS по центру (Мобільні) */}
                <div className="flex md:hidden justify-center -my-3 z-10">
                  <span className="px-4 py-1.5 bg-gradient-to-tr from-amber-500 to-rose-500 text-slate-950 font-black text-xs rounded-full shadow-lg border-2 border-slate-900 uppercase tracking-wider">
                    ⚔️ VS ⚔️
                  </span>
                </div>

                {/* Боєць 2 (Правий) */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 sm:p-5 rounded-2xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                      🔴 {t('compare.duelCorner2', 'Акаунт #2 (Червоний кут)')}
                    </span>
                    <select
                      value={duelAcc2Id || ''}
                      onChange={(e) => setDuelAcc2Id(Number(e.target.value))}
                      className="bg-slate-900 border border-slate-700 text-white text-xs font-bold px-3 py-2 rounded-lg focus:outline-none focus:border-rose-500 w-full sm:w-auto sm:max-w-[220px]"
                    >
                      {duelAccountOptions.map(acc => (
                        <option key={`opt2-${acc.id}`} value={acc.id} disabled={acc.id === duelAcc1Id}>
                          ID: {acc.id} — {acc.title?.substring(0, 28)}... (${acc.price})
                        </option>
                      ))}
                    </select>
                  </div>

                  {duelAcc2 && duelVal2 && (
                    <div>
                      <div className="aspect-video w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 relative mb-3">
                        {duelAcc2.images && duelAcc2.images.length > 0 ? (
                          <img src={getImageUrl(duelAcc2.images[0])} alt={duelAcc2.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600"><ImageIcon className="w-8 h-8" /></div>
                        )}
                        <div className="absolute bottom-2 left-2 bg-slate-950/90 rounded px-2 py-0.5 border border-slate-700">
                          <PriceDisplay price={duelAcc2.price} size="sm" />
                        </div>
                      </div>
                      <Link to={`/accounts/${duelAcc2.id}`} className="text-white hover:text-blue-400 font-black text-sm block mb-1 truncate">
                        {duelAcc2.title}
                      </Link>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-3">
                        <span>Score ({PRESETS.find(p => p.id === activePreset)?.shortLabel}): <strong className="text-amber-400 font-black">{duelVal2.totalScore} pts</strong></span>
                        <span>{duelVal2.valueIndex} pts/$</span>
                      </div>
                      <div className="flex gap-2">
                        <Link to={`/accounts/${duelAcc2.id}`} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg text-center flex items-center justify-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-blue-400" /> {t('compare.details', 'Деталі')}
                        </Link>
                        <button
                          onClick={() => {
                            addToCart({ product: duelAcc2, type: 'account', price: duelAcc2.price });
                            toast.success(t('orderModal.confirm', "Додано в кошик!"));
                          }}
                          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" /> {t('compare.addToCart', 'В кошик')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Таблиця раундів дуелі */}
              {duelAcc1 && duelAcc2 && duelVal1 && duelVal2 && (() => {
                const comparisonRows = [
                  {
                    title: isUk ? 'Ціна покупки' : 'Price',
                    val1: `$${duelAcc1.price}`,
                    val2: `$${duelAcc2.price}`,
                    winner: duelAcc1.price < duelAcc2.price ? 1 : (duelAcc2.price < duelAcc1.price ? 2 : 0),
                    diff: Math.abs(duelAcc1.price - duelAcc2.price) > 0 ? (isUk ? `Дешевше на $${Math.abs(duelAcc1.price - duelAcc2.price)}` : `Cheaper by $${Math.abs(duelAcc1.price - duelAcc2.price)}`) : 'Equal'
                  },
                  {
                    title: `Score (${PRESETS.find(p => p.id === activePreset)?.shortLabel})`,
                    val1: `${duelVal1.totalScore} pts`,
                    val2: `${duelVal2.totalScore} pts`,
                    winner: duelVal1.totalScore > duelVal2.totalScore ? 1 : (duelVal2.totalScore > duelVal1.totalScore ? 2 : 0),
                    diff: `+${Math.abs(duelVal1.totalScore - duelVal2.totalScore)} pts`
                  },
                  {
                    title: 'Value Index (pts / $1)',
                    val1: `${duelVal1.valueIndex}`,
                    val2: `${duelVal2.valueIndex}`,
                    winner: duelVal1.valueIndex > duelVal2.valueIndex ? 1 : (duelVal2.valueIndex > duelVal1.valueIndex ? 2 : 0),
                    diff: isUk ? 'Більше сили на $1' : 'More power per $1'
                  },
                  {
                    title: 'Base stats',
                    val1: `${duelVal1.white.raw || `${duelVal1.white.inf}-${duelVal1.white.range}-${duelVal1.white.cav}`} (avg ${Math.round(duelVal1.white.avg)}%)`,
                    val2: `${duelVal2.white.raw || `${duelVal2.white.inf}-${duelVal2.white.range}-${duelVal2.white.cav}`} (avg ${Math.round(duelVal2.white.avg)}%)`,
                    winner: duelVal1.white.avg > duelVal2.white.avg ? 1 : (duelVal2.white.avg > duelVal1.white.avg ? 2 : 0),
                    diff: `+${Math.round(Math.abs(duelVal1.white.avg - duelVal2.white.avg))}%`
                  },
                  {
                    title: 'Mix stats',
                    val1: `${duelVal1.mix.raw || `${duelVal1.mix.inf}-${duelVal1.mix.range}-${duelVal1.mix.cav}`} (avg ${Math.round(duelVal1.mix.avg)}%)`,
                    val2: `${duelVal2.mix.raw || `${duelVal2.mix.inf}-${duelVal2.mix.range}-${duelVal2.mix.cav}`} (avg ${Math.round(duelVal2.mix.avg)}%)`,
                    winner: duelVal1.mix.avg > duelVal2.mix.avg ? 1 : (duelVal2.mix.avg > duelVal1.mix.avg ? 2 : 0),
                    diff: `+${Math.round(Math.abs(duelVal1.mix.avg - duelVal2.mix.avg))}%`
                  },
                  {
                    title: 'Blast stats',
                    val1: `${duelVal1.blast.raw || `${duelVal1.blast.inf}-${duelVal1.blast.range}-${duelVal1.blast.cav}`} (avg ${Math.round(duelVal1.blast.avg)}%)`,
                    val2: `${duelVal2.blast.raw || `${duelVal2.blast.inf}-${duelVal2.blast.range}-${duelVal2.blast.cav}`} (avg ${Math.round(duelVal2.blast.avg)}%)`,
                    winner: duelVal1.blast.avg > duelVal2.blast.avg ? 1 : (duelVal2.blast.avg > duelVal1.blast.avg ? 2 : 0),
                    diff: `+${Math.round(Math.abs(duelVal1.blast.avg - duelVal2.blast.avg))}%`
                  },
                  {
                    title: 'Army ATK / Army HP',
                    val1: `${duelVal1.armyAtk.value}% ATK / ${duelVal1.armyHp.value}% HP`,
                    val2: `${duelVal2.armyAtk.value}% ATK / ${duelVal2.armyHp.value}% HP`,
                    winner: (duelVal1.armyAtk.value + duelVal1.armyHp.value) > (duelVal2.armyAtk.value + duelVal2.armyHp.value) ? 1 : 2,
                    diff: isUk ? 'Кращі армійські статки' : 'Better army stats'
                  },
                  {
                    title: 'Mana Troops',
                    val1: duelVal1.mana.level > 0 ? `Lvl ${duelVal1.mana.level}` : '—',
                    val2: duelVal2.mana.level > 0 ? `Lvl ${duelVal2.mana.level}` : '—',
                    winner: duelVal1.mana.level > duelVal2.mana.level ? 1 : (duelVal2.mana.level > duelVal1.mana.level ? 2 : 0),
                    diff: 'Higher T5 level'
                  },
                  {
                    title: 'Artifact lvl',
                    val1: `${duelVal1.artifact.level || 0}`,
                    val2: `${duelVal2.artifact.level || 0}`,
                    winner: duelVal1.artifact.level > duelVal2.artifact.level ? 1 : (duelVal2.artifact.level > duelVal1.artifact.level ? 2 : 0),
                    diff: `+${Math.abs(duelVal1.artifact.level - duelVal2.artifact.level)} lvl`
                  },
                  {
                    title: 'Castle start',
                    val1: `${duelVal1.skins.level || 0}`,
                    val2: `${duelVal2.skins.level || 0}`,
                    winner: duelVal1.skins.level > duelVal2.skins.level ? 1 : (duelVal2.skins.level > duelVal1.skins.level ? 2 : 0),
                    diff: `+${Math.abs(duelVal1.skins.level - duelVal2.skins.level)} lvl`
                  },
                  {
                    title: 'Champ Gear',
                    val1: `${duelVal1.champ.count || 0} pcs`,
                    val2: `${duelVal2.champ.count || 0} pcs`,
                    winner: duelVal1.champ.count > duelVal2.champ.count ? 1 : (duelVal2.champ.count > duelVal1.champ.count ? 2 : 0),
                    diff: `+${Math.abs(duelVal1.champ.count - duelVal2.champ.count)} pcs`
                  },
                  {
                    title: 'Low Might',
                    val1: duelVal1.isLowMight ? 'YES ⚡' : 'No',
                    val2: duelVal2.isLowMight ? 'YES ⚡' : 'No',
                    winner: duelVal1.isLowMight && !duelVal2.isLowMight ? 1 : (!duelVal1.isLowMight && duelVal2.isLowMight ? 2 : 0),
                    diff: 'Low might lead'
                  },
                  {
                    title: 'Max KD',
                    val1: duelVal1.maxKd.kd > 0 ? `K${duelVal1.maxKd.kd}` : '—',
                    val2: duelVal2.maxKd.kd > 0 ? `K${duelVal2.maxKd.kd}` : '—',
                    winner: duelVal1.maxKd.kd > duelVal2.maxKd.kd ? 1 : (duelVal2.maxKd.kd > duelVal1.maxKd.kd ? 2 : 0),
                    diff: 'Fresher KD migration'
                  }
                ];

                const scoreAcc1 = comparisonRows.filter(r => r.winner === 1).length;
                const scoreAcc2 = comparisonRows.filter(r => r.winner === 2).length;

                return (
                  <div>
                    {/* Таблиця характеристик 1 на 1 (Десктоп) */}
                    <div className="hidden md:block border border-slate-800 rounded-2xl overflow-hidden mb-6 bg-slate-950/60">
                      <div className="grid grid-cols-12 bg-slate-950 p-3.5 text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-800">
                        <div className="col-span-5 text-blue-400 flex items-center gap-1.5">
                          <Check className="w-4 h-4" /> Account #1 ({duelAcc1.id})
                        </div>
                        <div className="col-span-2 text-center text-slate-500">{t('compare.duelCriterion', 'Критерій')}</div>
                        <div className="col-span-5 text-right text-rose-400 flex items-center justify-end gap-1.5">
                          Account #2 ({duelAcc2.id}) <Check className="w-4 h-4" />
                        </div>
                      </div>

                      <div className="divide-y divide-slate-800/60">
                        {comparisonRows.map((row, idx) => (
                          <div 
                            key={idx} 
                            className="grid grid-cols-12 p-3 sm:p-4 text-xs font-black items-center hover:bg-slate-800/30 transition-colors"
                          >
                            {/* Показник акаунта 1 */}
                            <div className="col-span-5 flex items-center gap-2">
                              {row.winner === 1 && (
                                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black px-2 py-0.5 rounded uppercase shrink-0">
                                  {t('compare.duelBetter', 'Краще 🟢')}
                                </span>
                              )}
                              <span className={row.winner === 1 ? 'text-emerald-300 font-black text-sm' : 'text-slate-300'}>
                                {row.val1}
                              </span>
                            </div>

                            {/* Назва показника */}
                            <div className="col-span-2 text-center text-[11px] font-bold text-slate-400 leading-tight">
                              {row.title}
                            </div>

                            {/* Показник акаунта 2 */}
                            <div className="col-span-5 text-right flex items-center justify-end gap-2">
                              <span className={row.winner === 2 ? 'text-emerald-300 font-black text-sm' : 'text-slate-300'}>
                                {row.val2}
                              </span>
                              {row.winner === 2 && (
                                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black px-2 py-0.5 rounded uppercase shrink-0">
                                  {t('compare.duelBetter', 'Краще 🟢')}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Картки характеристик 1 на 1 (Мобільні) */}
                    <div className="md:hidden space-y-2.5 mb-6">
                      {comparisonRows.map((row, idx) => (
                        <div key={idx} className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 shadow-md">
                          <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 text-center mb-2">
                            {row.title}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {/* Боєць 1 */}
                            <div className={`p-2.5 rounded-xl border flex flex-col items-center text-center justify-between min-h-[58px] ${row.winner === 1 ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-sm' : 'bg-slate-900/60 border-slate-800/80 text-slate-300'}`}>
                              <span className="text-[10px] text-blue-400 font-bold mb-0.5">#1 ({duelAcc1.id})</span>
                              <span className="font-black text-xs leading-snug break-words">{row.val1}</span>
                              {row.winner === 1 && (
                                <span className="mt-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  {t('compare.duelBetter', 'Краще 🟢')}
                                </span>
                              )}
                            </div>
                            {/* Боєць 2 */}
                            <div className={`p-2.5 rounded-xl border flex flex-col items-center text-center justify-between min-h-[58px] ${row.winner === 2 ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-sm' : 'bg-slate-900/60 border-slate-800/80 text-slate-300'}`}>
                              <span className="text-[10px] text-rose-400 font-bold mb-0.5">#2 ({duelAcc2.id})</span>
                              <span className="font-black text-xs leading-snug break-words">{row.val2}</span>
                              {row.winner === 2 && (
                                <span className="mt-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  {t('compare.duelBetter', 'Краще 🟢')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
{/* Підсумковий вердикт Дуелі */}
                    <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-6 h-6 text-amber-400" />
                        <h4 className="text-white font-black text-base sm:text-lg">{t('compare.duelTitle', 'Вердикт Дуелі: Хто виграє?')}</h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
                        <div className={`p-4 rounded-xl border ${scoreAcc1 > scoreAcc2 ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-950 border-slate-800'}`}>
                          <div className="text-xs text-slate-400 font-bold mb-1">Account #1 ({duelAcc1.id}):</div>
                          <div className="text-2xl font-black text-white">{scoreAcc1} <span className="text-xs text-slate-400">{t('compare.duelRoundsWon', 'перемог у раундах')}</span></div>
                          {scoreAcc1 > scoreAcc2 && (
                            <span className="inline-block mt-2 text-xs font-black text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                              🏆 {t('compare.duelWinner', 'Переможець за сумою характеристик!')}
                            </span>
                          )}
                        </div>

                        <div className={`p-4 rounded-xl border ${scoreAcc2 > scoreAcc1 ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-950 border-slate-800'}`}>
                          <div className="text-xs text-slate-400 font-bold mb-1">Account #2 ({duelAcc2.id}):</div>
                          <div className="text-2xl font-black text-white">{scoreAcc2} <span className="text-xs text-slate-400">{t('compare.duelRoundsWon', 'перемог у раундах')}</span></div>
                          {scoreAcc2 > scoreAcc1 && (
                            <span className="inline-block mt-2 text-xs font-black text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                              🏆 {t('compare.duelWinner', 'Переможець за сумою характеристик!')}
                            </span>
                          )}
                        </div>
                      </div>                      <p className="text-xs text-slate-300 leading-relaxed">
                        💡 <strong>{t('compare.expertAdvice', 'Порада експерта:')}</strong>{' '}
                        {scoreAcc1 > scoreAcc2 ? (
                          <>
                            <strong>{duelAcc1.title}</strong>{' '}
                            {isUk
                              ? `перемагає у ${scoreAcc1} категоріях. Для стилю гри «${PRESETS.find(p => p.id === activePreset)?.shortLabel}» він дає найбільшу бойову перевагу.`
                              : isDe
                              ? `gewinnt in ${scoreAcc1} Kategorien. Für das Preset «${PRESETS.find(p => p.id === activePreset)?.shortLabel}» bietet er den größten taktischen Vorteil.`
                              : `wins in ${scoreAcc1} categories. For preset «${PRESETS.find(p => p.id === activePreset)?.shortLabel}» it provides the strongest combat advantage.`}
                          </>
                        ) : scoreAcc2 > scoreAcc1 ? (
                          <>
                            <strong>{duelAcc2.title}</strong>{' '}
                            {isUk
                              ? `перемагає у ${scoreAcc2} категоріях. Для стилю гри «${PRESETS.find(p => p.id === activePreset)?.shortLabel}» він пропонує вищі бойові показники.`
                              : isDe
                              ? `gewinnt in ${scoreAcc2} Kategorien. Für das Preset «${PRESETS.find(p => p.id === activePreset)?.shortLabel}» bietet er überlegene Werte.`
                              : `wins in ${scoreAcc2} categories. For preset «${PRESETS.find(p => p.id === activePreset)?.shortLabel}» it offers superior stats.`}
                          </>
                        ) : (
                          <>{isUk ? 'Обидва акаунти мають рівні сили (нічия по раундах). Порівняйте ціну та особисті вподобання!' : isDe ? 'Beide Accounts sind gleich stark (Gleichstand). Vergleichen Sie Preis und persönliche Vorlieben!' : 'Both accounts are evenly matched (tie across rounds). Compare price and personal playstyle preference!'}</>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Compare;