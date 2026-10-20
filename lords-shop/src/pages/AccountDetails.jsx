import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle2, Tag, Image as ImageIcon, 
  ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut,
  ShieldCheck, Swords, Shield, Heart, Sparkles, Crown,
  Users, Trophy, Globe2, Layers, ShoppingCart, GitCompare,
  Check, Lock, ExternalLink
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { PriceDisplay } from '../context/CurrencyContext'; 
import { useWishlist } from '../context/WishlistContext';
import { useCompare } from '../context/CompareContext';
import toast from 'react-hot-toast'; 
import { useTranslation } from 'react-i18next';
import { apiGet } from '../config/apiClient';
import { getFullUrl, API_ENDPOINTS, getImageUrl } from '../config/api';

const AccountDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart(); 
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { toggleCompare, isInCompare } = useCompare();
  const { t } = useTranslation();
  
  const [account, setAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [combatTab, setCombatTab] = useState('atk');

  // --- СТАНИ ДЛЯ ЗУМУ ТА ПЕРЕМІЩЕННЯ (PAN) ---
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const isPanDragRef = useRef(false);

  // Стан для свайпів на телефоні
  const [touchStartPos, setTouchStartPos] = useState(null);
  const [touchEndPos, setTouchEndPos] = useState(null);

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        // Спробуємо отримати прямий ендпоінт або знайти в списку
        try {
          const directData = await apiGet(getFullUrl(`/api/accounts/${id}`));
          if (directData && directData.id) {
            setAccount(directData);
            return;
          }
        } catch (e) {
          // Якщо прямого немає, беремо зі списку
        }

        const data = await apiGet(getFullUrl(API_ENDPOINTS.ACCOUNTS));
        if (Array.isArray(data)) {
          const foundAccount = data.find(acc => acc.id === parseInt(id));
          setAccount(foundAccount);
        }
      } catch (error) {
        console.error("Помилка завантаження акаунта:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccount();
  }, [id]);

  const handleAddToCart = () => {
    if (!account) return;
    addToCart({ product: account, type: 'account', price: account.price });
    toast.success(t('accountDetails.inCart'));
  };

  const handleBuyNow = () => {
    if (!account) return;
    addToCart({ product: account, type: 'account', price: account.price });
    navigate('/cart');
  };

  const resetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const nextImage = (e) => {
    if (e) e.stopPropagation();
    if (!account || !account.images) return;
    setActiveImage((prev) => (prev === account.images.length - 1 ? 0 : prev + 1));
    resetZoom();
  };

  const prevImage = (e) => {
    if (e) e.stopPropagation();
    if (!account || !account.images) return;
    setActiveImage((prev) => (prev === 0 ? account.images.length - 1 : prev - 1));
    resetZoom();
  };

  // Drag & Pan логіка
  const startDrag = (clientX, clientY) => {
    if (scale <= 1) return;
    setIsDragging(true);
    isPanDragRef.current = false;
    setDragStart({ x: clientX - pan.x, y: clientY - pan.y });
  };

  const onDragMove = (clientX, clientY) => {
    if (!isDragging || scale <= 1) return;
    const newX = clientX - dragStart.x;
    const newY = clientY - dragStart.y;
    if (Math.abs(newX - pan.x) > 3 || Math.abs(newY - pan.y) > 3) {
      isPanDragRef.current = true; 
    }
    setPan({ x: newX, y: newY });
  };

  const stopDrag = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (scale > 1) {
      startDrag(e.touches[0].clientX, e.touches[0].clientY);
    } else {
      setTouchEndPos(null);
      setTouchStartPos(e.targetTouches[0].clientX);
    }
  };

  const handleTouchMove = (e) => {
    if (scale > 1) {
      onDragMove(e.touches[0].clientX, e.touches[0].clientY);
    } else {
      setTouchEndPos(e.targetTouches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    if (scale > 1) {
      stopDrag();
    } else {
      if (!touchStartPos || !touchEndPos) return;
      const distance = touchStartPos - touchEndPos;
      if (distance > 50) nextImage();
      else if (distance < -50) prevImage();
    }
  };

  const handleMouseDown = (e) => startDrag(e.clientX, e.clientY);
  const handleMouseMove = (e) => onDragMove(e.clientX, e.clientY);
  const handleWheel = (e) => {
    if (e.deltaY < 0) {
      setScale(prev => Math.min(prev + 0.25, 4));
    } else {
      setScale(prev => {
        const newScale = Math.max(prev - 0.25, 1);
        if (newScale === 1) setPan({ x: 0, y: 0 });
        return newScale;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center text-slate-400 py-20 text-xl font-bold animate-pulse">
          {t('common.loading')}
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center text-white py-20 flex flex-col items-center">
        <h2 className="text-2xl font-bold mb-4">{t('accounts.noAccounts')}</h2>
        <Link to="/accounts" className="px-6 py-3 bg-blue-600 rounded-xl font-bold">
          {t('accountDetails.backToGallery')}
        </Link>
      </div>
    );
  }

  const hasImages = account.images && account.images.length > 0;
  const isWishlisted = isInWishlist(account.id, 'account');
  const isCompared = isInCompare(account.id);

  // Безпечно нормалізуємо статистику
  const stats = typeof account.stats === 'string' 
    ? (JSON.parse(account.stats || '{}')) 
    : (account.stats || {});

  // Хелпер для читання бойових значень (як об'єктів {leader, base}, так і простих рядків)
  const getCombatVal = (field) => {
    if (!stats[field]) return null;
    if (typeof stats[field] === 'object') {
      const leader = stats[field].leader || '';
      const base = stats[field].base || '';
      if (!leader && !base) return null;
      return { leader, base };
    }
    return { leader: String(stats[field]), base: '' };
  };

  // Бойова статистика (Combat Stats: ATK та HP, без DEF)
  const combatAtk = [
    { 
      label: t('accountDetails.mixAtkBase', 'Mix ATK (Base)'), 
      value: stats.white_stats || stats.mix_atk?.base || '' 
    },
    { 
      label: t('accountDetails.mixAtk', 'Mix ATK'), 
      value: stats.mix_stats || stats.mix_atk?.leader || (typeof stats.mix_atk === 'string' ? stats.mix_atk : '') || '' 
    },
    { 
      label: t('accountDetails.monoAtk', 'Mono ATK'), 
      value: stats.blast_stats || stats.mono_atk?.leader || (typeof stats.mono_atk === 'string' ? stats.mono_atk : '') || '' 
    },
    { 
      label: t('accountDetails.armyAtk', 'Army ATK'), 
      value: stats.army_atk || stats.army_mix_atk?.leader || (typeof stats.army_mix_atk === 'string' ? stats.army_mix_atk : '') || '' 
    },
    ...(stats.army_mono_atk?.leader && !stats.army_atk ? [{
      label: t('accountDetails.armyMonoAtk', 'Army Mono ATK'),
      value: stats.army_mono_atk.leader
    }] : [])
  ].filter(item => item.value && String(item.value).trim() !== '');

  const combatHp = [
    { 
      label: t('accountDetails.armyHp', 'Army HP'), 
      value: stats.army_hp || stats.army_mix_hp?.leader || (typeof stats.army_mix_hp === 'string' ? stats.army_mix_hp : '') || (stats.mix_hp?.leader) || '' 
    },
    ...(stats.mix_hp?.leader && stats.mix_hp.leader !== stats.army_hp ? [{
      label: t('accountDetails.mixHp', 'Mix HP'),
      value: stats.mix_hp.leader
    }] : []),
    ...(stats.mono_hp?.leader ? [{
      label: t('accountDetails.monoHp', 'Mono HP'),
      value: stats.mono_hp.leader
    }] : [])
  ].filter(item => item.value && String(item.value).trim() !== '');

  const hasCombatStats = combatAtk.length > 0 || combatHp.length > 0;
  const activeTab = (combatTab === 'atk' && combatAtk.length === 0 && combatHp.length > 0) ? 'hp' : (combatTab === 'hp' && combatHp.length === 0 && combatAtk.length > 0) ? 'atk' : combatTab;

  // Базові показники (Core Stats)
  const coreStatsList = [
    { key: 'castle', label: t('accountDetails.castle'), value: stats.castle, icon: Crown, color: 'from-amber-500/20 to-amber-900/10 border-amber-500/30 text-amber-400' },
    { key: 'might', label: t('accountDetails.might'), value: stats.might, icon: Swords, color: 'from-red-500/20 to-red-900/10 border-red-500/30 text-red-400' },
    { key: 'champ_gear', label: t('accountDetails.champ_gear'), value: stats.champ_gear, icon: Trophy, color: 'from-yellow-500/20 to-yellow-900/10 border-yellow-500/30 text-yellow-400' },
    { key: 'blessed', label: t('accountDetails.blessed'), value: stats.blessed, icon: Sparkles, color: 'from-purple-500/20 to-purple-900/10 border-purple-500/30 text-purple-400' },
    { key: 'heroes', label: t('accountDetails.heroes'), value: stats.heroes, icon: Users, color: 'from-blue-500/20 to-blue-900/10 border-blue-500/30 text-blue-400' },
    { key: 'familiars', label: t('accountDetails.familiars'), value: stats.familiars, icon: Sparkles, color: 'from-emerald-500/20 to-emerald-900/10 border-emerald-500/30 text-emerald-400' },
    { key: 'artifacts', label: t('accountDetails.artifacts'), value: stats.artifacts, icon: Layers, color: 'from-indigo-500/20 to-indigo-900/10 border-indigo-500/30 text-indigo-400' },
    { key: 'attribute_lvl', label: t('accountDetails.attribute_lvl'), value: stats.attribute_lvl, icon: Trophy, color: 'from-cyan-500/20 to-cyan-900/10 border-cyan-500/30 text-cyan-400' },
    { key: 'max_kd', label: t('accountDetails.max_kd'), value: stats.max_kd, icon: Globe2, color: 'from-slate-500/20 to-slate-900/10 border-slate-500/30 text-slate-300' },
  ].filter(item => item.value && String(item.value).trim() !== '');

  // Кастомний інвентар
  const customInventory = Array.isArray(stats.custom_inventory) 
    ? stats.custom_inventory.filter(f => f && f.label && f.label.trim() !== '')
    : [];

  return (
    <div className="pb-24 pt-6 max-w-6xl mx-auto px-4 sm:px-6">
      {/* Навігація назад */}
      <Link 
        to="/accounts" 
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors font-medium text-sm group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> 
        {t('accountDetails.backToGallery')}
      </Link>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
        
        {/* ========================================== */}
        {/* ЛІВА КОЛОНКА: ГАЛЕРЕЯ + ГАРАНТІЇ */}
        {/* ========================================== */}
        <div className="lg:col-span-6 space-y-4">
          {/* Головне фото */}
          <div 
            className={`aspect-[16/10] w-full bg-slate-900/80 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-xl relative group ${hasImages ? 'cursor-pointer' : ''}`}
            onClick={() => hasImages && setIsLightboxOpen(true)}
          >
            {hasImages ? (
              <>
                <img 
                  src={getImageUrl(account.images[activeImage])} 
                  alt={account.title} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-6">
                   <span className="text-white text-sm font-bold bg-slate-900/90 border border-slate-700 px-5 py-2.5 rounded-xl backdrop-blur-md flex items-center gap-2 shadow-2xl">
                     <ImageIcon className="w-4 h-4 text-blue-400" /> {t('common.viewAll')}
                   </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-600">
                <ImageIcon className="w-16 h-16" />
                <span className="text-sm font-medium">Фото відсутні</span>
              </div>
            )}
          </div>
          
          {/* Мініатюри */}
          {hasImages && account.images.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
              {account.images.map((img, index) => (
                <button 
                  key={index} 
                  onClick={() => { setActiveImage(index); resetZoom(); }} 
                  className={`w-20 h-14 sm:w-24 sm:h-16 rounded-xl border-2 flex-shrink-0 transition-all overflow-hidden relative ${
                    activeImage === index ? 'border-blue-500 scale-[1.02] shadow-md shadow-blue-500/20' : 'border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={getImageUrl(img)} alt={`preview-${index}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Блок гарантій та безпеки */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-950 border border-slate-800/80 shadow-lg space-y-3">
            <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>{t('accountDetails.supportGuarantee')}</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-xs text-slate-400">
              <div className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>{t('accountDetails.verifiedBind')}</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span>{t('accountDetails.instantTransfer')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* ПРАВА КОЛОНКА: ОСНОВНА ІНФОРМАЦІЯ ТА КУПІВЛЯ */}
        {/* ========================================== */}
        <div className="lg:col-span-6 flex flex-col">
          {/* Верхній рядок: ID + Статус + Прив'язка */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="px-3 py-1 bg-slate-900 text-slate-400 text-xs rounded-lg border border-slate-800 font-mono font-bold">
              ID: #{account.id}
            </span>
            <span className={`px-3 py-1 text-xs rounded-lg border font-bold ${
              account.status === 'active' 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              {account.status === 'active' ? (t('accounts.status.active') || 'У продажу') : account.status}
            </span>
            {account.bind && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-lg border border-blue-500/30 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{account.bind}</span>
              </span>
            )}
          </div>
          
          {/* Назва */}
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-3 tracking-tight">
            {account.title}
          </h1>

          {/* Ціна */}
          <div className="mb-5">
            <PriceDisplay 
              price={account.price} 
              originalPrice={account.base_price && parseFloat(account.base_price) > parseFloat(account.price) ? account.base_price : null}
              size="xl"
            />
          </div>

          {/* Теги */}
          {account.tags && account.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {account.tags.map((tag, idx) => (
                tag && tag.trim() !== '' && (
                  <span key={idx} className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/90 text-blue-300 border border-slate-800 rounded-lg text-xs font-bold">
                    <Tag className="w-3 h-3 text-blue-400" /> {tag.trim()}
                  </span>
                )
              ))}
            </div>
          )}

          {/* Опис */}
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              {t('accountDetails.description')}
            </h3>
            <div className="text-slate-300 text-sm leading-relaxed bg-slate-900/50 p-4 rounded-xl border border-slate-800/80 whitespace-pre-line max-h-48 overflow-y-auto scrollbar-thin">
              {account.shortDesc || 'Опис відсутній.'}
            </div>
          </div>

          {/* Кнопки дій */}
          <div className="mt-auto space-y-3 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button 
                onClick={handleBuyNow} 
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-blue-900/25 transition-all hover:-translate-y-0.5"
              >
                <CheckCircle2 className="w-5 h-5" /> 
                {t('accountDetails.buyNow')}
              </button>
              <button 
                onClick={handleAddToCart} 
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 font-bold rounded-xl flex justify-center items-center gap-2 transition-all"
              >
                <ShoppingCart className="w-5 h-5 text-blue-400" /> 
                {t('accountDetails.addToCart')}
              </button>
            </div>

            {/* Додаткові кнопки (Порівняння та Улюблене) */}
            <div className="flex gap-2">
              <button 
                onClick={() => toggleCompare(account)}
                className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  isCompared 
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' 
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <GitCompare className="w-4 h-4" />
                {isCompared ? t('accountDetails.inCompare') : t('accountDetails.addToCompare')}
              </button>
              <button 
                onClick={() => toggleWishlist({ id: account.id, type: 'account', title: account.title, price: account.price, images: account.images })}
                className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  isWishlisted 
                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-400' 
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-400' : ''}`} />
                {isWishlisted ? t('accountDetails.inWishlist') : t('accountDetails.addToWishlist')}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* ПОВНА ДЕТАЛІЗАЦІЯ ДАНИХ (СТАТИСТИКА) */}
      {/* ========================================== */}
      <div className="mt-12 space-y-10">
        
        {/* 1. БОЙОВІ ПОКАЗНИКИ (COMBAT STATS - ВИЩЕ ОСНОВНИХ) */}
        {hasCombatStats && (
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2.5">
                <Swords className="w-5 h-5 text-red-400" />
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {t('accountDetails.combatStats')}
                </h2>
              </div>
              
              {/* Перемикач розділів (ATK / HP - без DEF) */}
              <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setCombatTab('atk')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'atk' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Swords className="w-3.5 h-3.5" />
                  {t('accountDetails.tabAtk')}
                </button>
                <button
                  type="button"
                  onClick={() => setCombatTab('hp')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'hp' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5" />
                  {t('accountDetails.tabHp')}
                </button>
              </div>
            </div>

            {/* Таблиця характеристик для обраного розділу */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {(activeTab === 'atk' ? combatAtk : combatHp).map((stat, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between hover:border-slate-700/80 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {stat.label}
                    </span>
                    {activeTab === 'atk' ? (
                      <Swords className="w-3.5 h-3.5 text-rose-500/70" />
                    ) : (
                      <Heart className="w-3.5 h-3.5 text-emerald-500/70" />
                    )}
                  </div>
                  <div className="text-base sm:text-lg font-black text-white tracking-wide">
                    {stat.value || '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. КЛЮЧОВІ ПАРАМЕТРИ АКАУНТА (CORE STATS - ТЕПЕР ПІСЛЯ БОЙОВИХ) */}
        {coreStatsList.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Crown className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold text-white tracking-tight">
                {t('accountDetails.coreStats')}
              </h2>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {coreStatsList.map((item) => {
                const Icon = item.icon;
                return (
                  <div 
                    key={item.key} 
                    className={`p-4 rounded-2xl bg-gradient-to-br ${item.color} border shadow-md flex flex-col justify-between`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {item.label}
                      </span>
                      <Icon className="w-4 h-4 opacity-70" />
                    </div>
                    <div className="text-lg sm:text-xl font-black text-white truncate">
                      {item.value}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. КАСТОМНИЙ ІНВЕНТАР ТА ДОДАТКОВІ ПОЛЯ */}
        {customInventory.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-indigo-400" />
              <h2 className="text-xl font-bold text-white tracking-tight">
                {t('accountDetails.customInventory')}
              </h2>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {customInventory.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {item.label}
                  </div>
                  <div className="text-sm sm:text-base font-bold text-white truncate">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ========================================== */}
      {/* 🌟 RGB ЛАЙТБОКС + ЗУМ З ПЕРЕТЯГУВАННЯМ */}
      {/* ========================================== */}
      {isLightboxOpen && hasImages && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center overflow-hidden animate-in fade-in duration-200"
          onClick={() => { setIsLightboxOpen(false); resetZoom(); }}
          onWheel={handleWheel} 
        >
          <style>
            {`
              @keyframes rgbBreath {
                0% { color: #3b82f6; filter: drop-shadow(0 0 10px rgba(59,130,246,0.8)); }
                33% { color: #8b5cf6; filter: drop-shadow(0 0 15px rgba(139,92,246,0.8)); }
                66% { color: #10b981; filter: drop-shadow(0 0 15px rgba(16,185,129,0.8)); }
                100% { color: #3b82f6; filter: drop-shadow(0 0 10px rgba(59,130,246,0.8)); }
              }
              .rgb-glow {
                animation: rgbBreath 4s infinite ease-in-out;
                transition: transform 0.2s;
              }
              .rgb-glow:hover {
                transform: scale(1.2);
              }
            `}
          </style>

          {/* Кнопка закриття */}
          <button 
            className="absolute top-6 right-6 p-2 bg-slate-900/80 hover:bg-slate-800 rounded-full z-30 border border-slate-700"
            onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(false); resetZoom(); }}
          >
            <X className="w-7 h-7 rgb-glow" />
          </button>

          {/* Стрілка вліво */}
          {account.images.length > 1 && (
            <button className="absolute left-1 md:left-6 p-2 md:p-4 outline-none z-30" onClick={prevImage}>
              <ChevronLeft className="w-10 h-10 md:w-16 md:h-16 rgb-glow" />
            </button>
          )}

          {/* ВІКНО КАРТИНКИ (З ТАЧ-ПЕРЕТЯГУВАННЯМ) */}
          <div 
            className="w-full h-full flex items-center justify-center z-10" 
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart} 
            onTouchMove={handleTouchMove}   
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={stopDrag}
            onMouseLeave={stopDrag}
          >
            <img 
              src={getImageUrl(account.images[activeImage])} 
              draggable="false" 
              className="max-w-[95vw] max-h-[85vh] object-contain rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-slate-800 select-none" 
              style={{ 
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, 
                cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
                transition: isDragging ? 'none' : 'transform 0.2s ease-out'
              }}
              alt={account.title} 
              onClick={(e) => { 
                e.stopPropagation(); 
                if (isPanDragRef.current) return; 
                if (scale > 1) resetZoom(); else setScale(2);
              }}
            />
          </div>

          {/* Стрілка вправо */}
          {account.images.length > 1 && (
            <button className="absolute right-1 md:right-6 p-2 md:p-4 outline-none z-30" onClick={nextImage}>
              <ChevronRight className="w-10 h-10 md:w-16 md:h-16 rgb-glow" />
            </button>
          )}

          {/* ПАНЕЛЬ УПРАВЛІННЯ ЗУМОМ */}
          <div 
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-30 bg-slate-900/80 backdrop-blur-md px-6 py-3 rounded-full border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => {
                const newScale = Math.max(scale - 0.5, 1);
                setScale(newScale);
                if (newScale === 1) setPan({ x: 0, y: 0 });
              }}
              className="text-slate-400 hover:text-white p-1"
            >
              <ZoomOut className="w-6 h-6" />
            </button>
            <span className="text-white font-bold text-sm min-w-[3rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button 
              onClick={() => setScale(prev => Math.min(prev + 0.5, 4))}
              className="text-slate-400 hover:text-white p-1"
            >
              <ZoomIn className="w-6 h-6" />
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

export default AccountDetails;