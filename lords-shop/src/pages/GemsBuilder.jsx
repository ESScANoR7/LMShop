import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, XCircle, CheckCircle2, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { PriceDisplay } from '../context/CurrencyContext'; 
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next'; // 🔥 ІМПОРТ ПЕРЕКЛАДІВ
import toast from 'react-hot-toast';
import { apiGet } from '../config/apiClient';
import { getFullUrl, API_ENDPOINTS } from '../config/api';

// ПОВНИЙ КАТАЛОГ ТОВАРІВ
const gemItemsCatalog = {
  SpeedUps: [
    { id: 's1', name: 'Speed 60 minutes', cost: 130, icon: 's60m.png' },
    { id: 's2', name: 'Speed 3 Hours', cost: 300, icon: 's3h.png' },
    { id: 's3', name: 'Speed 8 Hours', cost: 650, icon: 's8h.png' },
    { id: 's4', name: 'Speed 15 Hours', cost: 1000, icon: 's15h.png' },
    { id: 's5', name: 'Speed 24 Hours', cost: 1500, icon: 's24h.png' },
    { id: 's6', name: 'Speed 3 Days', cost: 4400, icon: 's3d.png' },
    { id: 's7', name: 'Speed 7 Days', cost: 10000, icon: 's7d.png' },
    { id: 's8', name: 'Speed 30 Days', cost: 40000, icon: 's30d.png' }
  ],
  Combat: [
    { id: 'c1', name: 'Braveheart', cost: 2000, icon: 'braveheart.png' },
    { id: 'c2', name: 'Random Relocator', cost: 500, icon: 'rrelo.png' },
    { id: 'c3', name: 'Relocator', cost: 1500, icon: 'relo.png' },
    { id: 'c4', name: 'Royal Pass', cost: 100000, icon: 'rp.png' },
    { id: 'c5', name: 'Winged Boots 25%', cost: 500, icon: 'wb.png' },
    { id: 'c6', name: 'Winged Boots 50%', cost: 900, icon: 'wb.png' },
    { id: 'c7', name: 'Attack Boost 20% 12h', cost: 250, icon: 'atkb.png' },
    { id: 'c8', name: 'Attack Boost 20% 24h', cost: 400, icon: 'atkb.png' },
    { id: 'c9', name: 'Army Defence Boost 20% 12h', cost: 250, icon: 'defb.png' },
    { id: 'c10', name: 'Defence Boost 20% 24h', cost: 400, icon: 'defb.png' },
    { id: 'c11', name: 'Army Size Boost 20% 4h', cost: 2400, icon: 'asize.png' },
    { id: 'c12', name: 'Army Size Boost 50% 4h', cost: 5000, icon: 'asize.png' },
    { id: 'c13', name: 'Shield 8 Hours', cost: 500, icon: 'sh8h.png' },
    { id: 'c14', name: 'Shield 24 Hours', cost: 1000, icon: 'sh24h.png' },
    { id: 'c15', name: 'Shield 3 Days', cost: 3500, icon: 'sh3d.png' },
    { id: 'c16', name: 'Shield 7 Days', cost: 10000, icon: 'sh7d.png' },
    { id: 'c17', name: 'Shield 14 Days', cost: 25000, icon: 'sh24d.png' },
    { id: 'c18', name: 'Anti-Scout 24h', cost: 600, icon: 'as24.png' },
    { id: 'c19', name: 'Anti-Scout 3d', cost: 1200, icon: 'as3d.png' },
    { id: 'c20', name: 'Anti-Scout 7d', cost: 3000, icon: 'as7d.png' }
  ],
  Boost: [
    { id: 'b1', name: '25% Player EXP Boost 24h', cost: 2500, icon: 'xp.png' },
    { id: 'b2', name: 'Talent Reset', cost: 1000, icon: 'tr.png' },
    { id: 'b3', name: 'Talent Tome', cost: 1000, icon: 'tt.png' },
    { id: 'b4', name: 'Quest Scroll (Admin)', cost: 800, icon: 'qsa.png' },
    { id: 'b5', name: 'Quest Scroll (Guild)', cost: 1000, icon: 'qsg.png' },
    { id: 'b6', name: '500 VIP Points', cost: 500, icon: 'vp5.png' },
    { id: 'b7', name: '1000 VIP Points', cost: 1000, icon: 'vp10.png' },
    { id: 'b8', name: '5000 VIP Points', cost: 5000, icon: 'vp50.png' },
    { id: 'b9', name: '10 Lucky Tokens', cost: 6600, icon: 'lt1.png' },
    { id: 'b10', name: '100 Lucky Tokens', cost: 60000, icon: 'lt10.png' },
    { id: 'b11', name: '1000 Holy Stars', cost: 2200, icon: 'hs1.png' },
    { id: 'b12', name: '10000 Holy Stars', cost: 20000, icon: 'hs10.png' }
  ],
  Resources: [
    { id: 'r1', name: 'Gather Boost 50% 24h', cost: 600, icon: 'gb.png' },
    { id: 'r2', name: 'Gather Boost 50% 7d', cost: 3360, icon: 'gb.png' },
    { id: 'r3', name: 'Reduce Upkeep 50% 24h', cost: 2000, icon: 'upk.png' },
    { id: 'r4', name: 'Reduce Upkeep 50% 7d', cost: 11200, icon: 'upk.png' },
    { id: 'r5', name: 'Food 20 Million', cost: 10000, icon: 'f20.png' },
    { id: 'r6', name: 'Food 60 Million', cost: 28000, icon: 'f60.png' },
    { id: 'r7', name: 'Stone 5 Million', cost: 10000, icon: 's5.png' },
    { id: 'r8', name: 'Stone 15 Million', cost: 28000, icon: 's15.png' },
    { id: 'r9', name: 'Wood 5 Million', cost: 10000, icon: 'w5.png' },
    { id: 'r10', name: 'Wood 15 Million', cost: 28000, icon: 'w15.png' },
    { id: 'r11', name: 'Ore 5 Million', cost: 10000, icon: 'o5.png' },
    { id: 'r12', name: 'Ore 15 Million', cost: 28000, icon: 'o15.png' },
    { id: 'r13', name: 'Gold 2 Million', cost: 10000, icon: 'g2.png' },
    { id: 'r14', name: 'Gold 6 Million', cost: 28000, icon: 'g6.png' }
  ],
  Chests: [
    { id: 'ch1', name: 'Rare Material Chest', cost: 1500, icon: 'rc.png' },
    { id: 'ch2', name: 'Epic Material Chest', cost: 3000, icon: 'ec.png' },
    { id: 'ch3', name: 'Legendary Material Chest', cost: 3000, icon: 'lc.png' },
    { id: 'ch4', name: 'Rare Jewel Chest', cost: 3000, icon: 'rj.png' },
    { id: 'ch5', name: 'Epic Jewel Chest', cost: 6000, icon: 'ej.png' },
    { id: 'ch6', name: 'Legendary Jewel Chest', cost: 6000, icon: 'lj.png' },
    { id: 'ch7', name: 'Chisel I', cost: 400, icon: 'shg.png' },
    { id: 'ch8', name: 'Chisel II', cost: 1000, icon: 'shgr.png' },
    { id: 'ch9', name: 'Chisel III', cost: 2000, icon: 'shb.png' },
    { id: 'ch10', name: 'Chisel IV', cost: 3000, icon: 'shp.png' },
    { id: 'ch11', name: 'Chisel V', cost: 4000, icon: 'shgo.png' }
  ],
  Buildings: [
    { id: 'bd1', name: 'Archaic Tome', cost: 900, icon: 'art.png' },
    { id: 'bd2', name: 'Gold Hammer', cost: 2000, icon: 'gh.png' },
    { id: 'bd3', name: 'War Tomes', cost: 15, icon: 'wt.png' },
    { id: 'bd4', name: 'Steel Cuffs', cost: 15, icon: 'scu.png' },
    { id: 'bd5', name: 'Soul Crystal', cost: 15, icon: 'sc.png' },
    { id: 'bd6', name: 'Crystal Pickaxe', cost: 20, icon: 'cp.png' },
    { id: 'bd7', name: 'Finish Demolition', cost: 20, icon: 'fd.png' }
  ],
  Familiar: [
    { id: 'f1', name: 'Bright Talent Orb', cost: 3000, icon: 'brto.png' },
    { id: 'f2', name: 'Brilliant Talent Orb', cost: 7500, icon: 'blto.png' },
    { id: 'f3', name: 'Merge 60 Minutes', cost: 260, icon: 'm60m.png' },
    { id: 'f4', name: 'Merge 3 Hours', cost: 600, icon: 'm3h.png' },
    { id: 'f5', name: 'Merge 8 Hours', cost: 1300, icon: 'm8h.png' },
    { id: 'f6', name: 'Merge 24 Hours', cost: 3000, icon: 'm24h.png' },
    { id: 'f7', name: 'Merge 3 Days', cost: 8800, icon: 'm3d.png' },
    { id: 'f8', name: 'Merge 7 Days', cost: 20000, icon: 'm7d.png' },
    { id: 'f9', name: '2m Anima', cost: 10000, icon: 'a2m.png' },
    { id: 'f10', name: '6m Anima', cost: 28000, icon: 'a6m.png' },
    { id: 'f11', name: 'Anchient Core', cost: 1000, icon: 'ac.png' },
    { id: 'f12', name: 'Chaos Core', cost: 7500, icon: 'cc.png' },
    { id: 'f13', name: '10% Pact Merging Boost 1 hour', cost: 1000, icon: 'pmb.png' }
  ],
  MonsterHunt: [
    { id: 'mh1', name: 'Monster Hunt ATK Boost 25%', cost: 1000, icon: 'mh.png' },
    { id: 'mh2', name: '5000 Energy', cost: 1125, icon: 'mh5.png' },
    { id: 'mh3', name: '10000 Energy', cost: 2000, icon: 'mh10.png' },
    { id: 'mh4', name: '20000 Energy', cost: 3500, icon: 'mh20.png' },
    { id: 'mh5', name: '50000 Energy', cost: 7500, icon: 'mh50.png' }
  ]
};

const GemsBuilder = () => {
  const { t } = useTranslation(); // 🔥 ІНІЦІАЛІЗАЦІЯ ПЕРЕКЛАДУ
  const location = useLocation();
  const navigate = useNavigate();
  const { addToCart } = useCart(); 
  const { isLoggedIn } = useAuth();
  
  const [multiplier, setMultiplier] = useState(1);
  const [activeTab, setActiveTab] = useState('SpeedUps');
  const [wishlist, setWishlist] = useState([]); 
  const [quantities, setQuantities] = useState({});

  const [nickname, setNickname] = useState('');
  const [guild, setGuild] = useState('');
  const [mightStr, setMightStr] = useState('');

  // --- СТАНИ ДЛЯ БАЗИ ДАНИХ ---
  const [gemsRatesFromDB, setGemsRatesFromDB] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGemsRates = async () => {
      try {
        const data = await apiGet(getFullUrl(API_ENDPOINTS.GEMS));
        if (Array.isArray(data)) {
          setGemsRatesFromDB(data);
        }
      } catch (error) {
        console.error("Помилка завантаження рейтiв:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGemsRates();
  }, []);

  // ==========================================
  // ⚡ РОЗУМНИЙ ПАРСИНГ МІЦІ ТА ДІАПАЗОНІВ (M, B, Б, МЛН, МЛРД, ДЕСЯТКОВІ)
  // ==========================================
  const parseMightToM = (valStr) => {
    if (!valStr) return 0;
    const s = String(valStr).toLowerCase().replace(/,/g, '.').trim();

    // Якщо введено повне число (наприклад 200000000 або 1250000000)
    const plainNum = parseFloat(s.replace(/\s+/g, ''));
    if (!isNaN(plainNum) && plainNum >= 10000000) {
      return plainNum / 1000000;
    }

    let totalM = 0;
    let matched = false;

    // Мільярди: 1b, 2.5b, 1б, 2,5б, 1 млрд
    const bMatches = [...s.matchAll(/([0-9]+(?:\.[0-9]+)?)\s*(?:b|б|млрд)/gi)];
    for (const m of bMatches) {
      totalM += parseFloat(m[1]) * 1000;
      matched = true;
    }

    // Мільйони: 200m, 500м, 2500m, 200 млн
    const mMatches = [...s.matchAll(/([0-9]+(?:\.[0-9]+)?)\s*(?:m|м|млн)/gi)];
    for (const m of mMatches) {
      totalM += parseFloat(m[1]);
      matched = true;
    }

    // Тисячі: 500k, 500к
    const kMatches = [...s.matchAll(/([0-9]+(?:\.[0-9]+)?)\s*(?:k|к|тис)/gi)];
    for (const m of kMatches) {
      totalM += parseFloat(m[1]) / 1000;
      matched = true;
    }

    // Без суфікса (наприклад: "200" або "1200")
    if (!matched) {
      const rawMatch = s.match(/[0-9]+(?:\.[0-9]+)?/);
      if (rawMatch) {
        const val = parseFloat(rawMatch[0]);
        totalM = val >= 10000000 ? val / 1000000 : val;
      }
    }

    return totalM;
  };

  const parseRangeToM = (rangeStr) => {
    if (!rangeStr) return { min: 0, max: Infinity };
    const str = String(rangeStr).trim();
    const parts = str.split(/[-–—/]/);
    if (parts.length === 2) {
      return { min: parseMightToM(parts[0]), max: parseMightToM(parts[1]) };
    } else if (parts.length === 1) {
      const single = parseMightToM(parts[0]);
      if (str.includes('+') || str.includes('>') || str.toLowerCase().includes('від')) {
        return { min: single, max: Infinity };
      }
      return { min: 0, max: single };
    }
    return { min: 0, max: Infinity };
  };

  // ДИНАМІЧНИЙ ПІДРАХУНОК МІЦІ ТА ТАРИФУ
  let dynamicRate = null;
  let matchedTier = null;
  const parsedM = parseMightToM(mightStr);

  if (parsedM > 0 && gemsRatesFromDB.length > 0) {
    // 1. Шукаємо точний збіг у діапазоні
    for (const gem of gemsRatesFromDB) {
      const { min, max } = parseRangeToM(gem.range);
      if (parsedM >= min && parsedM <= max) {
        dynamicRate = gem.rate;
        matchedTier = gem;
        break;
      }
    }

    // 2. Якщо менше за найнижчий діапазон — беремо перший
    if (!dynamicRate) {
      const firstGem = gemsRatesFromDB[0];
      const { min: firstMin } = parseRangeToM(firstGem.range);
      if (parsedM < firstMin) {
        dynamicRate = firstGem.rate;
        matchedTier = firstGem;
      }
    }

    // 3. Якщо більше за найвищий діапазон — беремо останній
    if (!dynamicRate) {
      const lastGem = gemsRatesFromDB[gemsRatesFromDB.length - 1];
      dynamicRate = lastGem.rate;
      matchedTier = lastGem;
    }
  }

  const baseRate = parseFloat(dynamicRate || location.state?.baseRate || (gemsRatesFromDB[0]?.rate || 3.90)); 
  const finalRate = baseRate;
  
  const totalGemsLimit = multiplier * 100000;
  
  const baseTotalPrice = (multiplier * baseRate).toFixed(2);
  const finalTotalPrice = (multiplier * finalRate).toFixed(2);
  const usedGems = wishlist.reduce((sum, item) => sum + (item.cost * item.quantity), 0);

  const handleQuantityChange = (itemId, value) => {
    const val = parseInt(value);
    setQuantities(prev => ({ ...prev, [itemId]: isNaN(val) || val < 1 ? 1 : val }));
  };

  const handleAddItem = (item) => {
    const qty = quantities[item.id] || 1; 
    const newUsedGems = usedGems + (item.cost * qty);
    
    if (newUsedGems > totalGemsLimit) {
      toast.error(t('builder.errorNotEnoughGems')); // 🔥 ПЕРЕКЛАД
      return;
    }

    setWishlist(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: existing.quantity + qty } : i);
      }
      return [...prev, { ...item, quantity: qty }];
    });
    setQuantities(prev => ({ ...prev, [item.id]: 1 }));
  };

  const handleAddToCart = () => {
    if (!nickname.trim() || !mightStr.trim() || !guild.trim()) {
      toast.error(t('builder.errorFillData', "Будь ласка, заповніть всі обов'язкові дані: Нікнейм, Гільдія та Могутність!"));
      return;
    }

    const formattedWishlist = wishlist.map(w => `${w.quantity}x ${w.name}`).join('\n   🔸 ');

    addToCart({
      product: { name: t('builder.giftName', { amount: totalGemsLimit.toLocaleString() }), id: "custom_gems" }, // 🔥 ПЕРЕКЛАД
      type: 'gems',
      price: finalTotalPrice,
      userData: {
        nickname: nickname,
        guild: guild || 'Немає',
        might: mightStr,
        itemsToGift: `\n   🔸 ${formattedWishlist}` 
      }
    });

    toast.success(t('builder.successAdded')); // 🔥 ПЕРЕКЛАД
    setWishlist([]); 
    navigate('/cart');
  };

  const formatTabName = (name) => {
    return name.replace(/([A-Z])/g, ' $1').trim();
  };

  const handleImageError = (e) => {
    const id = e.target.dataset?.id;
    if (id && !e.target.dataset?.fallbackDone) {
      e.target.dataset.fallbackDone = 'true';
      e.target.src = `/items/${id}.png`;
      return;
    }
    e.target.style.display = 'none';
    if (e.target.nextSibling) {
      e.target.nextSibling.style.display = 'flex';
    }
  };

  if (isLoading) {
    return <div className="text-center text-slate-400 py-32 text-xl font-bold animate-pulse">{t('builder.loadingBuilder')}</div>;
  }

  return (
    <div className="pb-20 pt-8 max-w-6xl mx-auto px-4">
      <Link to="/resources" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-5 h-5" /> {t('builder.backToShop')}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ЛІВА ЧАСТИНА */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-800/50 border border-blue-500/30 rounded-2xl p-6 sticky top-24 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">{t('builder.settingsTitle')}</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-400 mb-2">{t('builder.howManyGems')}</label>
              <div className="flex items-center gap-4">
                <input 
                  type="number" min="1" value={multiplier}
                  onChange={(e) => setMultiplier(parseInt(e.target.value) || 1)}
                  className="w-24 bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white text-xl font-bold text-center focus:border-blue-500 outline-none transition-all"
                />
                <div>
                  <div className="text-sm text-slate-400">{t('builder.totalGems')}</div>
                  <div className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                    {totalGemsLimit.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center py-4 border-t border-slate-700/50">
              <span className="text-slate-300">{t('builder.ratePer100k')}</span>
              <div className="text-right">
                <PriceDisplay price={finalRate} size="sm" />
              </div>
            </div>

            <div className="flex justify-between items-center py-4 border-t border-slate-700/50">
              <span className="text-slate-300 font-bold">{t('builder.totalToPay')}</span>
              <div className="text-right">
                <PriceDisplay price={finalTotalPrice} size="xl" />
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-700/50">
              <h3 className="text-sm font-medium text-slate-300 mb-4">{t('builder.gameDataTitle')}</h3>
              
              <input value={nickname} onChange={(e) => setNickname(e.target.value.replace(/[^A-Za-z0-9]/g, ''))} placeholder={t('builder.nicknamePlaceholder')} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none mb-4 transition-colors" />
              
              <div className="mb-4">
                <input value={guild} onChange={(e) => setGuild(e.target.value.slice(0, 3).toUpperCase())} placeholder={t('builder.guildPlaceholder')} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none uppercase transition-colors" />
                <div className="mt-2 ml-1 flex items-start gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span className="text-amber-300 text-xs font-bold leading-snug">{t('builder.guildWarning')}</span>
                </div>
              </div>

              <input value={mightStr} onChange={(e) => setMightStr(e.target.value)} placeholder={t('builder.mightPlaceholder')} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none transition-colors" />
              
              {parsedM > 0 && dynamicRate && (
                <div className="text-xs mt-3 text-emerald-400 font-medium bg-emerald-900/20 border border-emerald-500/20 p-2.5 rounded-xl flex items-center justify-between">
                  <span>
                    {t('builder.recognizedMight', {
                      might: parsedM >= 1000
                        ? `${(parsedM / 1000).toFixed(parsedM % 100 === 0 ? 1 : 2).replace(/\.00$/, '').replace(/\.0$/, '')}B (${parsedM.toLocaleString()}M)`
                        : `${parsedM.toLocaleString()}M`
                    })}
                  </span>
                  {matchedTier?.range && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
                      {matchedTier.range} (${parseFloat(dynamicRate).toFixed(2)})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ПРАВА ЧАСТИНА (Вітрина) */}
        <div className="lg:col-span-8 flex flex-col">
          
          <div className="sticky top-24 z-30 bg-slate-800/95 backdrop-blur-xl rounded-2xl p-5 mb-6 border border-slate-600 shadow-[0_15px_40px_rgba(0,0,0,0.4)] transition-all duration-300">
            <div className="flex justify-between text-sm mb-3">
              <span className="text-slate-300 font-medium">{t('builder.usedForGifts')}</span>
              <span className="font-bold text-white">{usedGems.toLocaleString()} / <span className="text-blue-400">{totalGemsLimit.toLocaleString()}</span></span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-4 overflow-hidden border border-slate-700/50">
              <div className={`h-full rounded-full transition-all duration-500 ${usedGems > totalGemsLimit * 0.9 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-gradient-to-r from-blue-500 to-emerald-400 shadow-[0_0_10px_rgba(56,189,248,0.5)]'}`} style={{ width: `${Math.min((usedGems / totalGemsLimit) * 100, 100)}%` }}></div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6 bg-slate-900/50 p-2 sm:p-3 rounded-xl border border-slate-800">
            {Object.keys(gemItemsCatalog).map(category => (
              <button 
                key={category} 
                onClick={() => setActiveTab(category)} 
                className={`grow sm:grow-0 px-3 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap text-center ${activeTab === category ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                {formatTabName(category)}
              </button>
            ))}
          </div>

          <div className="bg-slate-800/30 rounded-2xl border border-slate-700 p-2 mb-8 shadow-xl">
            <div className="grid grid-cols-12 gap-4 p-4 text-xs text-slate-500 font-bold uppercase border-b border-slate-700/50 tracking-wider">
              <div className="col-span-7 md:col-span-6 pl-2">{t('builder.itemNameTitle')}</div>
              <div className="col-span-5 md:col-span-3 text-center hidden md:block">{t('builder.itemPriceTitle')}</div>
              <div className="col-span-5 md:col-span-3 text-right pr-2">{t('builder.actionTitle')}</div>
            </div>
            
            {gemItemsCatalog[activeTab].map(item => (
              <div key={item.id} className="grid grid-cols-12 gap-4 p-3 md:p-4 items-center border-b border-slate-700/30 hover:bg-slate-800/60 transition-colors group rounded-xl">
                
                <div className="col-span-12 md:col-span-6 flex items-center gap-4">
                  <div className="w-12 h-12 flex-shrink-0 bg-slate-900 rounded-xl p-1 border border-slate-700 shadow-md flex items-center justify-center overflow-hidden group-hover:border-blue-500/50 transition-colors">
                    <img 
                      src={item.icon ? `/items/${item.icon}` : `/items/${item.id}.png`} 
                      data-id={item.id}
                      alt={item.name} 
                      loading="lazy" 
                      className="w-full h-full object-contain"
                      onError={handleImageError}
                    />
                    <div className="hidden text-slate-600">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  </div>

                  <div>
                    <div className="text-white text-sm font-bold">{item.name}</div>
                    <div className="text-blue-400 text-xs font-bold md:hidden mt-0.5">{item.cost.toLocaleString()} Gems</div>
                  </div>
                </div>

                <div className="col-span-3 text-center text-blue-400 font-black text-sm hidden md:block tracking-wide">
                  {item.cost.toLocaleString()}
                </div>

                <div className="col-span-12 md:col-span-3 flex justify-end items-center gap-2">
                  <input 
                    type="number" min="1" 
                    value={quantities[item.id] || 1} 
                    onChange={(e) => handleQuantityChange(item.id, e.target.value)} 
                    className="w-16 bg-slate-900 border border-slate-600 rounded-lg px-2 py-2 text-white text-center text-sm font-bold focus:border-blue-500 outline-none transition-colors" 
                  />
                  <button onClick={() => handleAddItem(item)} className="px-4 py-2 bg-slate-700 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all shadow hover:shadow-blue-500/20 active:scale-95">
                    {t('builder.addBtn')}
                  </button>
                </div>

              </div>
            ))}
          </div>

          {wishlist.length > 0 && (
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 mb-6 shadow-lg animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-lg font-bold text-white mb-4 border-b border-slate-700 pb-3 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-400" /> {t('builder.wishlistTitle')}
              </h3>
              <div className="space-y-3">
                {wishlist.map(wItem => (
                  <div key={wItem.id} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setWishlist(prev => prev.filter(i => i.id !== wItem.id))} className="text-slate-500 hover:text-red-400 bg-slate-800 hover:bg-red-500/10 rounded-full p-1 transition-colors">
                        <XCircle className="w-5 h-5" />
                      </button>
                      
                      <div className="w-8 h-8 rounded border border-slate-700 bg-slate-800 p-0.5 overflow-hidden flex items-center justify-center">
                         <img src={wItem.icon ? `/items/${wItem.icon}` : `/items/${wItem.id}.png`} data-id={wItem.id} alt="" className="w-full h-full object-contain" onError={handleImageError} />
                         <div className="hidden"><ImageIcon className="w-4 h-4 text-slate-600" /></div>
                      </div>

                      <span className="text-white text-sm font-medium">
                        {wItem.name} 
                        <span className="ml-3 px-2 py-0.5 bg-blue-600/20 text-blue-400 border border-blue-500/20 text-xs rounded-md font-black">
                          x{wItem.quantity}
                        </span>
                      </span>
                    </div>
                    <span className="text-slate-400 text-sm font-bold font-mono">{(wItem.cost * wItem.quantity).toLocaleString()} Gems</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button 
            onClick={handleAddToCart} 
            disabled={wishlist.length === 0} 
            className={`mt-auto w-full py-4 font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg ${wishlist.length > 0 ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20 hover:-translate-y-1' : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'}`}
          >
            <ShoppingCart className="w-5 h-5" /> 
            {wishlist.length > 0 ? t('builder.addToCartBtn') : t('builder.selectItemsFirst')}
          </button>

        </div>
      </div>
    </div>
  );
};

export default GemsBuilder;