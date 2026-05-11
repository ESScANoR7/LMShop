import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, XCircle, CheckCircle2 } from 'lucide-react';
import { useCart } from '../context/CartContext'; 
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// КАТАЛОГ ТОВАРІВ ЗА САМОЦВІТИ (Залишається як є)
const gemItemsCatalog = {
  speedups: [
    { id: 's1', name: 'Speed 60 minutes', cost: 130, icon: '⏩' },
    { id: 's2', name: 'Speed 3 Hours', cost: 300, icon: '⏩' },
    { id: 's3', name: 'Speed 8 Hours', cost: 650, icon: '⏩' },
    { id: 's4', name: 'Speed 15 Hours', cost: 1000, icon: '⏩' },
    { id: 's5', name: 'Speed 24 Hours', cost: 1500, icon: '⏱️' },
    { id: 's6', name: 'Speed 3 Days', cost: 4400, icon: '⏳' },
    { id: 's7', name: 'Speed 7 Days', cost: 10000, icon: '⏳' },
    { id: 's8', name: 'Speed 30 Days', cost: 40000, icon: '🗓️' }
  ],
  combat: [
    { id: 'c1', name: 'Shield 24h', cost: 1000, icon: '🛡️' },
    { id: 'c2', name: 'Shield 3 Days', cost: 2500, icon: '🛡️' },
    { id: 'c3', name: 'Shield 14 Days', cost: 10000, icon: '🛡️' },
    { id: 'c4', name: 'Anti-Scout 24h', cost: 750, icon: '👁️‍🗨️' },
    { id: 'c5', name: 'Army ATK Boost (20%)', cost: 250, icon: '⚔️' }
  ],
  chests: [
    { id: 'm1', name: 'Скриня Чемпіона', cost: 1500, icon: '📦' },
    { id: 'm2', name: 'Скриня Чорнокнижника', cost: 1200, icon: '📦' },
    { id: 'm3', name: 'Скриня Мисливця', cost: 1000, icon: '🏹' }
  ],
  other: [
    { id: 'o1', name: 'Jewel Chest (Самоцвіти)', cost: 1000, icon: '💎' },
    { id: 'o2', name: 'Зміна Нікнейму', cost: 200, icon: '🏷️' },
    { id: 'o3', name: 'Талант Скидання', cost: 1000, icon: '✨' }
  ]
};

const GemsBuilder = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { addToCart } = useCart(); 
  const { getPrice, isLoggedIn } = useAuth();
  
  const [multiplier, setMultiplier] = useState(1);
  const [activeTab, setActiveTab] = useState('speedups');
  const [wishlist, setWishlist] = useState([]); 
  const [quantities, setQuantities] = useState({});

  const [nickname, setNickname] = useState('');
  const [guild, setGuild] = useState('');
  const [mightStr, setMightStr] = useState('');

  // --- СТАНИ ДЛЯ БАЗИ ДАНИХ ---
  const [gemsRatesFromDB, setGemsRatesFromDB] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. ЗАВАНТАЖУЄМО РЕЙТИ З БАЗИ ПРИ ВІДКРИТТІ СТОРІНКИ
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

  // 2. ДИНАМІЧНИЙ ПІДРАХУНОК МІЦІ (РОЗУМНИЙ ПАРСЕР)
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
      // ПРОХОДИМОСЯ ПО БАЗІ ДАНИХ І ШУКАЄМО ВІДПОВІДНИЙ ДІАПАЗОН!
      for (const gem of gemsRatesFromDB) {
        // Очікуємо формат діапазону типу "0 - 460M" або "461 - 780M"
        const rangeStr = String(gem.range).replace(/m|м/gi, '').trim(); // Прибираємо букву 'M'
        const parts = rangeStr.split('-');
        
        if (parts.length === 2) {
          const minMight = parseInt(parts[0].trim()) || 0;
          const maxMight = parseInt(parts[1].trim()) || Infinity;
          
          if (parsedM >= minMight && parsedM <= maxMight) {
            dynamicRate = gem.rate;
            break; // Знайшли! Зупиняємо пошук
          }
        }
      }
      
      // Якщо міць дуже велика і не влізла в жоден діапазон (або якщо Адмін написав щось дивне), 
      // беремо рейт із найостаннішого діапазону в базі
      if (!dynamicRate && gemsRatesFromDB.length > 0) {
        dynamicRate = gemsRatesFromDB[gemsRatesFromDB.length - 1].rate;
      }
    }
  }

  // 3. ФОРМУВАННЯ ЦІНИ
  // Пріоритет: 1. Знайдений за Міццю -> 2. Переданий з кнопки на попередній сторінці -> 3. Дефолт (якщо база пуста)
  const baseRate = parseFloat(dynamicRate || location.state?.baseRate || (gemsRatesFromDB[0]?.rate || 3.90)); 
  const finalRate = parseFloat(getPrice(baseRate));
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
      toast.error('Недостатньо самоцвітів! Збільшіть кількість пакетів зліва.');
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
      toast.error("Заповніть ваші ігрові дані (Нікнейм та Точну міць)!");
      return;
    }

    const formattedWishlist = wishlist.map(w => `${w.quantity}x ${w.name}`).join('\n   🔸 ');

    addToCart({
      product: { name: `Подарунки за ${totalGemsLimit.toLocaleString()} Gems` },
      type: 'gems',
      price: finalTotalPrice,
      userData: {
        nickname: nickname,
        guild: guild || 'Немає',
        might: mightStr,
        itemsToGift: `\n   🔸 ${formattedWishlist}` 
      }
    });

    toast.success('Замовлення додано до кошика!');
    setWishlist([]); 
    navigate('/cart');
  };

  if (isLoading) {
    return <div className="text-center text-slate-400 py-32 text-xl font-bold animate-pulse">Завантаження калькулятора...</div>;
  }

  return (
    <div className="pb-20 pt-8 max-w-6xl mx-auto px-4">
      <Link to="/resources" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-5 h-5" /> Назад до магазину
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ЛІВА ЧАСТИНА */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-800/50 border border-blue-500/30 rounded-2xl p-6 sticky top-24">
            <h2 className="text-xl font-bold text-white mb-4">Налаштування покупки</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-400 mb-2">Скільки купуємо? (1 = 100k)</label>
              <div className="flex items-center gap-4">
                <input 
                  type="number" min="1" value={multiplier}
                  onChange={(e) => setMultiplier(parseInt(e.target.value) || 1)}
                  className="w-24 bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white text-xl font-bold text-center focus:border-blue-500 outline-none"
                />
                <div>
                  <div className="text-sm text-slate-400">Всього Gems:</div>
                  <div className="text-xl font-bold text-blue-400">{totalGemsLimit.toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center py-4 border-t border-slate-700">
              <span className="text-slate-300">Рейт (за 100k):</span>
              <div className="text-right">
                {!isLoggedIn && <div className="text-xs text-slate-500 line-through">${baseRate.toFixed(2)}</div>}
                <span className="text-lg text-slate-300 font-bold">${finalRate.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center py-4 border-t border-slate-700">
              <span className="text-slate-300 font-bold">До сплати:</span>
              <div className="text-right">
                {!isLoggedIn && <div className="text-sm text-slate-500 line-through">${baseTotalPrice}</div>}
                <span className="text-3xl font-bold text-emerald-400">${finalTotalPrice}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-700">
              <h3 className="text-sm font-medium text-slate-300 mb-4">Ваші ігрові дані</h3>
              <input value={nickname} onChange={(e) => setNickname(e.target.value.replace(/[^A-Za-z0-9]/g, ''))} placeholder="Нікнейм гравця (Eng)" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none mb-3" />
              <input value={guild} onChange={(e) => setGuild(e.target.value.slice(0, 3).toUpperCase())} placeholder="Гільдія (необов'язково)" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none uppercase mb-3" />
              <input value={mightStr} onChange={(e) => setMightStr(e.target.value)} placeholder="Точна міць (Напр: 1b 200m або 500m)" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none" />
              
              {/* ПОКАЗУЄМО ПІДКАЗКУ, ЩО РЕЙТ ЗМІНИВСЯ (ЯКЩО ВІДБУЛАСЯ ДИНАМІЧНА ЗМІНА) */}
              {parsedM > 0 && dynamicRate && (
                <div className="text-xs mt-2 text-emerald-400">Розпізнано: {parsedM.toLocaleString()}M. Рейт адаптовано!</div>
              )}
            </div>
          </div>
        </div>

        {/* ПРАВА ЧАСТИНА (Вітрина) */}
        <div className="lg:col-span-8 flex flex-col">
          
          <div className="bg-slate-800 rounded-2xl p-5 mb-6 border border-slate-700 shadow-lg">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-300">Використано для подарунків:</span>
              <span className="font-bold text-white">{usedGems.toLocaleString()} / <span className="text-blue-400">{totalGemsLimit.toLocaleString()}</span></span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-4 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${usedGems > totalGemsLimit * 0.9 ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-emerald-400'}`} style={{ width: `${Math.min((usedGems / totalGemsLimit) * 100, 100)}%` }}></div>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto mb-6 bg-slate-900/50 p-2 rounded-xl border border-slate-800 scrollbar-hide">
            {Object.keys(gemItemsCatalog).map(category => (
              <button key={category} onClick={() => setActiveTab(category)} className={`px-6 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === category ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                {category}
              </button>
            ))}
          </div>

          <div className="bg-slate-800/30 rounded-2xl border border-slate-700 p-2 mb-8">
            <div className="grid grid-cols-12 gap-4 p-4 text-xs text-slate-500 font-bold uppercase border-b border-slate-700/50">
              <div className="col-span-6 md:col-span-5">Назва товару</div>
              <div className="col-span-3 text-center hidden md:block">Ціна (Gems)</div>
              <div className="col-span-6 md:col-span-4 text-right pr-2">Дія</div>
            </div>
            {gemItemsCatalog[activeTab].map(item => (
              <div key={item.id} className="grid grid-cols-12 gap-4 p-3 md:p-4 items-center border-b border-slate-700/30 hover:bg-slate-800/50 transition-colors">
                <div className="col-span-12 md:col-span-5 flex items-center gap-3">
                  <div className="text-2xl">{item.icon}</div>
                  <div>
                    <div className="text-white text-sm font-medium">{item.name}</div>
                    <div className="text-blue-400 text-xs font-bold md:hidden">{item.cost.toLocaleString()} Gems</div>
                  </div>
                </div>
                <div className="col-span-3 text-center text-blue-400 font-bold text-sm hidden md:block">{item.cost.toLocaleString()}</div>
                <div className="col-span-12 md:col-span-4 flex justify-end items-center gap-2">
                  <input type="number" min="1" value={quantities[item.id] || 1} onChange={(e) => handleQuantityChange(item.id, e.target.value)} className="w-16 bg-slate-900 border border-slate-600 rounded-lg px-2 py-2 text-white text-center text-sm focus:border-blue-500 outline-none" />
                  <button onClick={() => handleAddItem(item)} className="px-4 py-2 bg-slate-700 hover:bg-blue-500 text-white text-xs font-bold rounded-lg">+ Додати</button>
                </div>
              </div>
            ))}
          </div>

          {wishlist.length > 0 && (
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 mb-6 shadow-lg">
              <h3 className="text-lg font-bold text-white mb-4 border-b border-slate-700 pb-3">Мій Вішлист</h3>
              <div className="space-y-3">
                {wishlist.map(wItem => (
                  <div key={wItem.id} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setWishlist(prev => prev.filter(i => i.id !== wItem.id))} className="text-slate-500 hover:text-red-400"><XCircle className="w-5 h-5" /></button>
                      <span className="text-white text-sm">{wItem.icon} {wItem.name} <span className="ml-2 px-2 py-0.5 bg-blue-900/50 text-blue-400 text-xs rounded font-bold">x{wItem.quantity}</span></span>
                    </div>
                    <span className="text-slate-400 text-sm font-medium">{(wItem.cost * wItem.quantity).toLocaleString()} Gems</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={handleAddToCart} disabled={wishlist.length === 0} className={`mt-auto w-full py-4 font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${wishlist.length > 0 ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}>
            <ShoppingCart className="w-5 h-5" /> {wishlist.length > 0 ? 'Додати замовлення у Кошик' : 'Оберіть товари для додавання'}
          </button>

        </div>
      </div>
    </div>
  );
};

export default GemsBuilder;