import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, XCircle, CheckCircle2, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { useCart } from '../context/CartContext'; 
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next'; // 🔥 ІМПОРТ ПЕРЕКЛАДІВ
import toast from 'react-hot-toast';

// ПОВНИЙ КАТАЛОГ ТОВАРІВ
const gemItemsCatalog = {
  SpeedUps: [
    { id: 's1', name: 'Speed 60 minutes', cost: 130 },
    { id: 's2', name: 'Speed 3 Hours', cost: 300 },
    { id: 's3', name: 'Speed 8 Hours', cost: 650 },
    { id: 's4', name: 'Speed 15 Hours', cost: 1000 },
    { id: 's5', name: 'Speed 24 Hours', cost: 1500 },
    { id: 's6', name: 'Speed 3 Days', cost: 4400 },
    { id: 's7', name: 'Speed 7 Days', cost: 10000 },
    { id: 's8', name: 'Speed 30 Days', cost: 40000 }
  ],
  Combat: [
    { id: 'c1', name: 'Braveheart', cost: 2000 },
    { id: 'c2', name: 'Random Relocator', cost: 500 },
    { id: 'c3', name: 'Relocator', cost: 1500 },
    { id: 'c4', name: 'Royal Pass', cost: 100000 },
    { id: 'c5', name: 'Winged Boots 25%', cost: 500 },
    { id: 'c6', name: 'Winged Boots 50%', cost: 900 },
    { id: 'c7', name: 'Attack Boost 20% 12h', cost: 250 },
    { id: 'c8', name: 'Attack Boost 20% 24h', cost: 400 },
    { id: 'c9', name: 'Army Defence Boost 20% 12h', cost: 250 },
    { id: 'c10', name: 'Defence Boost 20% 24h', cost: 400 },
    { id: 'c11', name: 'Army Size Boost 20% 4h', cost: 2400 },
    { id: 'c12', name: 'Army Size Boost 50% 4h', cost: 5000 },
    { id: 'c13', name: 'Shield 8 Hours', cost: 500 },
    { id: 'c14', name: 'Shield 24 Hours', cost: 1000 },
    { id: 'c15', name: 'Shield 3 Days', cost: 3500 },
    { id: 'c16', name: 'Shield 7 Days', cost: 10000 },
    { id: 'c17', name: 'Shield 14 Days', cost: 25000 },
    { id: 'c18', name: 'Anti-Scout 24h', cost: 600 },
    { id: 'c19', name: 'Anti-Scout 3d', cost: 1200 },
    { id: 'c20', name: 'Anti-Scout 7d', cost: 3000 }
  ],
  Boost: [
    { id: 'b1', name: '25% Player EXP Boost 24h', cost: 2500 },
    { id: 'b2', name: 'Talent Reset', cost: 1000 },
    { id: 'b3', name: 'Talent Tome', cost: 1000 },
    { id: 'b4', name: 'Quest Scroll (Admin)', cost: 800 },
    { id: 'b5', name: 'Quest Scroll (Guild)', cost: 1000 },
    { id: 'b6', name: '500 VIP Points', cost: 500 },
    { id: 'b7', name: '1000 VIP Points', cost: 1000 },
    { id: 'b8', name: '5000 VIP Points', cost: 5000 },
    { id: 'b9', name: '10 Lucky Tokens', cost: 6600 },
    { id: 'b10', name: '100 Lucky Tokens', cost: 60000 },
    { id: 'b11', name: '1000 Holy Stars', cost: 2200 },
    { id: 'b12', name: '10000 Holy Stars', cost: 20000 }
  ],
  Resources: [
    { id: 'r1', name: 'Gather Boost 50% 24h', cost: 600 },
    { id: 'r2', name: 'Gather Boost 50% 7d', cost: 3360 },
    { id: 'r3', name: 'Reduce Upkeep 50% 24h', cost: 2000 },
    { id: 'r4', name: 'Reduce Upkeep 50% 7d', cost: 11200 },
    { id: 'r5', name: 'Food 20 Million', cost: 10000 },
    { id: 'r6', name: 'Food 60 Million', cost: 28000 },
    { id: 'r7', name: 'Stone 5 Million', cost: 10000 },
    { id: 'r8', name: 'Stone 15 Million', cost: 28000 },
    { id: 'r9', name: 'Wood 5 Million', cost: 10000 },
    { id: 'r10', name: 'Wood 15 Million', cost: 28000 },
    { id: 'r11', name: 'Ore 5 Million', cost: 10000 },
    { id: 'r12', name: 'Ore 15 Million', cost: 28000 },
    { id: 'r13', name: 'Gold 2 Million', cost: 10000 },
    { id: 'r14', name: 'Gold 6 Million', cost: 28000 }
  ],
  Chests: [
    { id: 'ch1', name: 'Rare Material Chest', cost: 1500 },
    { id: 'ch2', name: 'Epic Material Chest', cost: 3000 },
    { id: 'ch3', name: 'Legendary Material Chest', cost: 3000 },
    { id: 'ch4', name: 'Rare Jewel Chest', cost: 3000 },
    { id: 'ch5', name: 'Epic Jewel Chest', cost: 6000 },
    { id: 'ch6', name: 'Legendary Jewel Chest', cost: 6000 },
    { id: 'ch7', name: 'Chisel I', cost: 400 },
    { id: 'ch8', name: 'Chisel II', cost: 1000 },
    { id: 'ch9', name: 'Chisel III', cost: 2000 },
    { id: 'ch10', name: 'Chisel IV', cost: 3000 },
    { id: 'ch11', name: 'Chisel V', cost: 4000 }
  ],
  Buildings: [
    { id: 'bd1', name: 'Archaic Tome', cost: 900 },
    { id: 'bd2', name: 'Gold Hammer', cost: 2000 },
    { id: 'bd3', name: 'War Tomes', cost: 15 },
    { id: 'bd4', name: 'Steel Cuffs', cost: 15 },
    { id: 'bd5', name: 'Soul Crystal', cost: 15 },
    { id: 'bd6', name: 'Crystal Pickaxe', cost: 20 },
    { id: 'bd7', name: 'Finish Demolition', cost: 20 }
  ],
  Familiar: [
    { id: 'f1', name: 'Bright Talent Orb', cost: 3000 },
    { id: 'f2', name: 'Brilliant Talent Orb', cost: 7500 },
    { id: 'f3', name: 'Merge 60 Minutes', cost: 260 },
    { id: 'f4', name: 'Merge 3 Hours', cost: 600 },
    { id: 'f5', name: 'Merge 8 Hours', cost: 1300 },
    { id: 'f6', name: 'Merge 24 Hours', cost: 3000 },
    { id: 'f7', name: 'Merge 3 Days', cost: 8800 },
    { id: 'f8', name: 'Merge 7 Days', cost: 20000 },
    { id: 'f9', name: '2m Anima', cost: 10000 },
    { id: 'f10', name: '6m Anima', cost: 28000 },
    { id: 'f11', name: 'Anchient Core', cost: 1000 },
    { id: 'f12', name: 'Chaos Core', cost: 7500 },
    { id: 'f13', name: '10% Pact Merging Boost 1 hour', cost: 1000 }
  ],
  MonsterHunt: [
    { id: 'mh1', name: 'Monster Hunt ATK Boost 25%', cost: 1000 },
    { id: 'mh2', name: '5000 Energy', cost: 1125 },
    { id: 'mh3', name: '10000 Energy', cost: 2000 },
    { id: 'mh4', name: '20000 Energy', cost: 3500 },
    { id: 'mh5', name: '50000 Energy', cost: 7500 }
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
        const response = await fetch('http://localhost:8000/api/gems');
        if (response.ok) {
          const data = await response.json();
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

  // ДИНАМІЧНИЙ ПІДРАХУНОК МІЦІ
  let dynamicRate = null;
  let parsedM = 0;

  if (mightStr && gemsRatesFromDB.length > 0) {
    const str = String(mightStr).toLowerCase();
    const bMatch = str.match(/(\d+)\s*b/); 
    const mMatch = str.match(/(\d+)\s*m/); 

    if (bMatch) parsedM += parseInt(bMatch[1]) * 1000;
    if (mMatch) parsedM += parseInt(mMatch[1]);
    if (!bMatch && !mMatch) {
      const nums = str.match(/\d+/);
      if (nums) parsedM = parseInt(nums[0]);
    }

    if (parsedM > 0) {
      for (const gem of gemsRatesFromDB) {
        const rangeStr = String(gem.range).replace(/m|м/gi, '').trim(); 
        const parts = rangeStr.split('-');
        
        if (parts.length === 2) {
          const minMight = parseInt(parts[0].trim()) || 0;
          const maxMight = parseInt(parts[1].trim()) || Infinity;
          
          if (parsedM >= minMight && parsedM <= maxMight) {
            dynamicRate = gem.rate;
            break; 
          }
        }
      }
      
      if (!dynamicRate && gemsRatesFromDB.length > 0) {
        dynamicRate = gemsRatesFromDB[gemsRatesFromDB.length - 1].rate;
      }
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
    if (!nickname || !mightStr) {
      toast.error(t('builder.errorFillData')); // 🔥 ПЕРЕКЛАД
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
    e.target.style.display = 'none';
    e.target.nextSibling.style.display = 'flex';
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
                <span className="text-lg text-slate-300 font-bold">${finalRate.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center py-4 border-t border-slate-700/50">
              <span className="text-slate-300 font-bold">{t('builder.totalToPay')}</span>
              <div className="text-right">
                <span className="text-3xl font-black text-emerald-400">${finalTotalPrice}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-700/50">
              <h3 className="text-sm font-medium text-slate-300 mb-4">{t('builder.gameDataTitle')}</h3>
              
              <input value={nickname} onChange={(e) => setNickname(e.target.value.replace(/[^A-Za-z0-9]/g, ''))} placeholder={t('builder.nicknamePlaceholder')} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none mb-4 transition-colors" />
              
              <div className="mb-4">
                <input value={guild} onChange={(e) => setGuild(e.target.value.slice(0, 3).toUpperCase())} placeholder={t('builder.guildPlaceholder')} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none uppercase transition-colors" />
                <div className="mt-2 ml-1 flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span className="text-amber-500 text-xs font-bold leading-snug">{t('builder.guildWarning')}</span>
                </div>
              </div>

              <input value={mightStr} onChange={(e) => setMightStr(e.target.value)} placeholder={t('builder.mightPlaceholder')} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none transition-colors" />
              
              {parsedM > 0 && dynamicRate && (
                <div className="text-xs mt-3 text-emerald-400 font-medium bg-emerald-900/20 border border-emerald-500/20 p-2 rounded-lg">
                  {t('builder.recognizedMight', { might: parsedM.toLocaleString() })}
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
                      src={`/items/${item.id}.webp`} 
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
                         <img src={`/items/${wItem.id}.webp`} alt="" className="w-full h-full object-contain" onError={handleImageError} />
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