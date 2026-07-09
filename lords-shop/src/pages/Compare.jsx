import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCompare } from '../context/CompareContext';
import { Scale, X, ShoppingCart, Image as ImageIcon, Trash2, Tag, LinkIcon, ShieldCheck, Swords, Users, Crown, Star, Globe, Ghost, Heart, Castle, Activity, PlusCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';

// Ваги для кожної бойової характеристики
const STAT_WEIGHTS = {
  mix_atk: 2,
  mono_atk: 1,
  army_mix_atk: 1,
  army_mono_atk: 0.5,
  mix_def: 0.25,
  mono_def: 0.2,
  army_mix_def: 0.25,
  army_mono_def: 0.2,
  mix_hp: 1,
  mono_hp: 0.6,
  army_mix_hp: 1.5,
  army_mono_hp: 0.5,
};

const ATK_FIELDS = ['mix_atk', 'mono_atk', 'army_mix_atk', 'army_mono_atk'];
const DEF_FIELDS = ['mix_def', 'mono_def', 'army_mix_def', 'army_mono_def'];
const HP_FIELDS = ['mix_hp', 'mono_hp', 'army_mix_hp', 'army_mono_hp'];

// Парсер чисел: знаходить всі числа в рядку "1200-1100-1300" або "500", та сумує їх
const parseStatSum = (val) => {
  if (!val) return 0;
  const strVal = String(val);
  const nums = strVal.match(/\d+(\.\d+)?/g);
  if (!nums) return 0;
  return nums.reduce((sum, num) => sum + parseFloat(num), 0);
};

// Функція для підрахунку балів у конкретному блоці
const calculateCategoryScores = (compareList, statMode, fields) => {
  const scores = {};
  compareList.forEach(acc => { scores[acc.id] = 0; });

  fields.forEach(fieldKey => {
    let maxStatVal = -1;
    let winnerIds = [];
    compareList.forEach(acc => {
      const statData = acc.stats?.[fieldKey];
      const isObject = typeof statData === 'object' && statData !== null;
      const rawVal = isObject ? (statMode === 'leader' ? statData.leader : statData.base) : statData;
      
      const numVal = parseStatSum(rawVal);
      
      if (numVal > maxStatVal && numVal > 0) {
        maxStatVal = numVal;
        winnerIds = [acc.id];
      } else if (numVal === maxStatVal && numVal > 0) {
        winnerIds.push(acc.id);
      }
    });

    // Нараховуємо бали переможцям
    winnerIds.forEach(id => {
      scores[id] += STAT_WEIGHTS[fieldKey] || 0;
    });
  });

  const sortedScores = Object.entries(scores).sort(([, a], [, b]) => b - a);
  let winnerInfo = {}; 

  if (sortedScores.length >= 2) {
    const [firstId, firstScore] = sortedScores[0];
    const [, secondScore] = sortedScores[1];

    if (firstScore > 0 && firstScore > secondScore) {
      const percentDiff = secondScore > 0 ? ((firstScore - secondScore) / secondScore) * 100 : 100;
      winnerInfo[firstId] = percentDiff.toFixed(0); 
    }
  }
  return { scores, winnerInfo };
};

const Compare = () => {
  const { compareList, removeFromCompare, clearCompare } = useCompare();
  const { addToCart } = useCart();

  // 🔥 ТУМБЛЕР ДЛЯ ПЕРЕМИКАННЯ РЕЖИМУ СТАТІВ 🔥
  const [statMode, setStatMode] = useState('leader'); // 'leader' або 'base'

  // Вираховуємо переможців для кожного окремого рядка (щоб підсвічувати зірочкою)
  const rowWinners = useMemo(() => {
    const winners = {};
    Object.keys(STAT_WEIGHTS).forEach(fieldKey => {
      let maxStatVal = -1;
      let winnerIds = [];
      compareList.forEach(acc => {
        const statData = acc.stats?.[fieldKey];
        const isObject = typeof statData === 'object' && statData !== null;
        const rawVal = isObject ? (statMode === 'leader' ? statData.leader : statData.base) : statData;
        const numVal = parseStatSum(rawVal);
        
        if (numVal > maxStatVal && numVal > 0) {
          maxStatVal = numVal;
          winnerIds = [acc.id];
        } else if (numVal === maxStatVal && numVal > 0) {
          winnerIds.push(acc.id);
        }
      });
      winners[fieldKey] = winnerIds;
    });
    return winners;
  }, [compareList, statMode]);

  if (compareList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 min-h-[60vh]">
        <div className="w-24 h-24 bg-blue-900/20 rounded-full flex items-center justify-center mb-6 border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
          <Scale className="w-12 h-12 text-blue-500 animate-pulse" />
        </div>
        <h2 className="text-3xl font-black text-white mb-3 tracking-wide">Немає товарів для порівняння</h2>
        <p className="text-slate-400 max-w-md text-center mb-8">
          Перейдіть до каталогу акаунтів та натисніть на іконку терезів, щоб додати сюди товари для аналізу.
        </p>
        <Link to="/accounts" className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:-translate-y-1">
          В каталог акаунтів
        </Link>
      </div>
    );
  }

  const emptySlotsCount = Math.max(0, 4 - compareList.length);
  const emptySlots = Array.from({ length: emptySlotsCount });

  // 🔥 РЕНДЕР ДИНАМІЧНОГО ЗАГОЛОВКА БЛОКУ (АТАКА, ЗАХИСТ І ТД) 🔥
  const CategoryHeaderRow = ({ title, emoji, colorClass, fields }) => {
    const { scores, winnerInfo } = useMemo(() => calculateCategoryScores(compareList, statMode, fields), [statMode]);

    return (
      <tr>
        <td className={`bg-slate-950 py-3 px-6 text-[11px] font-black ${colorClass} uppercase tracking-widest border-b border-r border-slate-800`}>
          {emoji} {title}
        </td>
        {compareList.map(acc => {
          const isWinner = winnerInfo[acc.id];
          const score = scores[acc.id] || 0;
          
          return (
            <td key={`cat-${title}-${acc.id}`} className="bg-slate-950 py-2 px-4 border-b border-r border-slate-800 text-center align-middle">
              {score > 0 ? (
                <div className="flex flex-col items-center justify-center gap-1">
                  {isWinner ? (
                    <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 whitespace-nowrap shadow-sm">
                      👑 Сильніше на {isWinner}%
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Бали: {score}</span>
                  )}
                </div>
              ) : (
                <span className="text-slate-700">—</span>
              )}
            </td>
          );
        })}
        {emptySlots.map((_, i) => <td key={`e-cat-${title}-${i}`} className="bg-slate-950 border-b border-r border-slate-800"></td>)}
      </tr>
    );
  };

  // 🔥 РЕНДЕР ПРОСТОГО ЗАГОЛОВКА (ДЛЯ ІНВЕНТАРЯ) 🔥
  const SimpleCategoryHeaderRow = ({ title, emoji, colorClass }) => (
    <tr>
      <td colSpan={compareList.length + emptySlots.length + 1} className={`bg-slate-950 py-3 px-6 text-[11px] font-black ${colorClass} uppercase tracking-widest border-b border-slate-800`}>
        {emoji} {title}
      </td>
    </tr>
  );

  // 🔥 РЕНДЕР РЯДКА ТАБЛИЦІ (Звичайні статі) 🔥
  const StatRow = ({ title, icon: Icon, fieldKey, isCombat = false }) => {
    const isBaseMode = statMode === 'base';

    return (
      <tr className="hover:bg-slate-800/40 transition-colors border-b border-slate-800/20">
        <td className={`p-4 pl-6 border-r border-slate-800 flex items-center gap-3 ${
          isCombat && !isBaseMode ? 'text-emerald-400 font-bold text-[14px]' : 
          isCombat && isBaseMode ? 'text-white text-[13px] font-semibold tracking-wide' : 
          'text-slate-300 font-bold text-[13px]'
        }`}>
          {Icon && <Icon className={`w-4 h-4 ${
            isCombat && !isBaseMode ? 'text-emerald-500' : 
            isCombat && isBaseMode ? 'text-slate-400' : 
            'text-slate-500'
          }`} />} 
          {title}
        </td>

        {compareList.map(acc => {
          const statData = acc.stats?.[fieldKey];
          const isObject = typeof statData === 'object' && statData !== null;
          
          const leaderVal = isObject ? statData.leader : statData;
          const baseVal = isObject ? statData.base : statData;
          const normalVal = isObject ? null : statData;

          // Перевіряємо, чи цей акаунт виграв у даній номінації (підсвічуємо золотим)
          const isWinner = isCombat && rowWinners[fieldKey]?.includes(acc.id);

          return (
            <td key={`${fieldKey}-${acc.id}`} className={`p-4 border-r border-slate-800 text-center align-middle transition-colors ${isWinner ? 'bg-amber-500/5' : ''}`}>
              {isCombat ? (
                isBaseMode ? (
                  <span className={`text-[13px] font-bold tracking-wider ${isWinner ? 'text-amber-400' : 'text-slate-300'}`}>
                    {baseVal || '—'} {isWinner && <Star className="w-3 h-3 inline-block ml-1 text-amber-400 fill-amber-400 mb-0.5" />}
                  </span>
                ) : (
                  <span className={`font-black text-[15px] tracking-wide ${isWinner ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {leaderVal || '—'} {isWinner && <Star className="w-3.5 h-3.5 inline-block ml-1 text-amber-400 fill-amber-400 mb-0.5" />}
                  </span>
                )
              ) : (
                <span className="font-bold text-sm text-slate-300">
                  {normalVal || '—'}
                </span>
              )}
            </td>
          );
        })}
        
        {emptySlots.map((_, i) => <td key={`e-${fieldKey}-${i}`} className="border-r border-slate-800 bg-slate-900/20"></td>)}
      </tr>
    );
  };

  const allCustomLabels = new Set();
  compareList.forEach(acc => {
    if (acc.stats?.custom_inventory && Array.isArray(acc.stats.custom_inventory)) {
      acc.stats.custom_inventory.forEach(field => {
        if (field.label) allCustomLabels.add(field.label);
      });
    }
  });
  const customLabelsArray = Array.from(allCustomLabels);

  return (
    <div className="pb-20 pt-8 max-w-[1400px] mx-auto px-4 min-h-[70vh]">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Scale className="w-8 h-8 text-blue-500" /> Порівняння акаунтів
        </h1>
        <button onClick={clearCompare} className="text-sm font-bold text-slate-400 hover:text-red-400 flex items-center gap-2 transition-colors px-4 py-2 bg-slate-900 rounded-lg border border-slate-800 shadow-sm">
          <Trash2 className="w-4 h-4" /> Очистити список
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr>
                <th className="p-6 border-b border-r border-slate-800 bg-slate-950/50 w-64 align-bottom">
                  <div className="text-slate-500 font-bold uppercase text-[11px] tracking-widest mb-4">
                    Характеристика
                  </div>
                  
                  <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 w-max shadow-inner">
                    <button 
                      onClick={() => setStatMode('leader')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${statMode === 'leader' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}
                    >
                      🟢 З Лідером
                    </button>
                    <button 
                      onClick={() => setStatMode('base')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${statMode === 'base' ? 'bg-slate-700 text-white border border-slate-500 shadow-sm' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}
                    >
                      ⚪ Базові
                    </button>
                  </div>
                </th>
                
                {compareList.map(acc => (
                  <th key={`header-${acc.id}`} className="p-6 border-b border-r border-slate-800 bg-slate-900/50 w-72 relative align-top group">
                    <button 
                      onClick={() => removeFromCompare(acc.id)}
                      className="absolute top-4 right-4 p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg transition-all opacity-0 group-hover:opacity-100 z-10 shadow-lg scale-90 hover:scale-100"
                      title="Видалити з порівняння"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    
                    <div className="w-full aspect-video bg-slate-800 rounded-xl mb-4 overflow-hidden border border-slate-700 relative shadow-md">
                      {acc.images && acc.images.length > 0 ? (
                        <img src={acc.images[0]} alt={acc.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-slate-600" /></div>
                      )}
                      <div className="absolute bottom-2 left-2 bg-slate-950/90 text-white text-[10px] px-2 py-0.5 rounded font-mono border border-slate-700">ID: {acc.id}</div>
                    </div>
                    
                    <h3 className="text-white font-bold text-sm mb-2 line-clamp-2 leading-snug" title={acc.title}>{acc.title}</h3>
                    <div className="text-emerald-400 font-black text-2xl mb-4">${acc.price}</div>
                    
                    <button 
                      onClick={() => {
                        addToCart({ product: acc, type: 'account', price: acc.price });
                        toast.success("Додано в кошик!");
                      }}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 hover:-translate-y-0.5"
                    >
                      <ShoppingCart className="w-4 h-4" /> В кошик
                    </button>
                  </th>
                ))}

                {emptySlots.map((_, i) => (
                  <th key={`empty-${i}`} className="p-6 border-b border-r border-slate-800 bg-slate-900/20 w-72">
                    <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-slate-600 opacity-30 border-2 border-dashed border-slate-700 rounded-2xl">
                      <Scale className="w-10 h-10 mb-3" />
                      <span className="text-xs uppercase font-bold tracking-widest">Вільне місце</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-800/0">

              {/* ========================================================= */}
              {/* АТАКА ВІЙСЬК (ATK) */}
              {/* ========================================================= */}
              <CategoryHeaderRow title="Атака Військ (ATK)" emoji="🔥" colorClass="text-rose-500" fields={ATK_FIELDS} />
              <StatRow title="Mix Атака" icon={Swords} fieldKey="mix_atk" isCombat={true} />
              <StatRow title="Mono Атака" icon={Swords} fieldKey="mono_atk" isCombat={true} />
              <StatRow title="Army Mix Атака" icon={Users} fieldKey="army_mix_atk" isCombat={true} />
              <StatRow title="Army Mono Атака" icon={Users} fieldKey="army_mono_atk" isCombat={true} />

              {/* ========================================================= */}
              {/* ЗАХИСТ ВІЙСЬК (DEF) */}
              {/* ========================================================= */}
              <CategoryHeaderRow title="Захист Військ (DEF)" emoji="🛡️" colorClass="text-blue-500" fields={DEF_FIELDS} />
              <StatRow title="Mix Захист" icon={ShieldCheck} fieldKey="mix_def" isCombat={true} />
              <StatRow title="Mono Захист" icon={ShieldCheck} fieldKey="mono_def" isCombat={true} />
              <StatRow title="Army Mix Захист" icon={ShieldCheck} fieldKey="army_mix_def" isCombat={true} />
              <StatRow title="Army Mono Захист" icon={ShieldCheck} fieldKey="army_mono_def" isCombat={true} />

              {/* ========================================================= */}
              {/* ЗДОРОВ'Я ВІЙСЬК (HP) */}
              {/* ========================================================= */}
              <CategoryHeaderRow title="Здоров'я Військ (HP)" emoji="❤️" colorClass="text-emerald-500" fields={HP_FIELDS} />
              <StatRow title="Mix HP" icon={Heart} fieldKey="mix_hp" isCombat={true} />
              <StatRow title="Mono HP" icon={Heart} fieldKey="mono_hp" isCombat={true} />
              <StatRow title="Army Mix HP" icon={Heart} fieldKey="army_mix_hp" isCombat={true} />
              <StatRow title="Army Mono HP" icon={Heart} fieldKey="army_mono_hp" isCombat={true} />

              {/* ========================================================= */}
              {/* ІНВЕНТАР, ГЕРОЇ, ФАМІЛЬЯРИ */}
              {/* ========================================================= */}
              <SimpleCategoryHeaderRow title="Герої, Фамільяри та Прокачка" emoji="👑" colorClass="text-purple-400" />
              <StatRow title="Рівень Замку" icon={Castle} fieldKey="castle" />
              <StatRow title="Благо (Blessed)" icon={Star} fieldKey="blessed" />
              <StatRow title="Champ Gear (Шмот)" icon={Swords} fieldKey="champ_gear" />
              <StatRow title="Донатні Герої" icon={Crown} fieldKey="heroes" />
              <StatRow title="Донатні Фамільяри" icon={Ghost} fieldKey="familiars" />
              <StatRow title="Зірки Артефактів" icon={Star} fieldKey="artifacts" />
              <StatRow title="Рівень Атрибута" icon={Activity} fieldKey="attribute_lvl" />

              {/* ========================================================= */}
              {/* ДОДАТКОВИЙ ІНВЕНТАР */}
              {/* ========================================================= */}
              {customLabelsArray.length > 0 && (
                <>
                  <SimpleCategoryHeaderRow title="Додатковий Інвентар" emoji="📦" colorClass="text-amber-400" />
                  
                  {customLabelsArray.map(label => (
                    <tr key={`custom-${label}`} className="hover:bg-slate-800/40 transition-colors border-b border-slate-800/20">
                      <td className="p-4 pl-6 border-r border-slate-800 text-slate-300 font-bold text-[13px] flex items-center gap-3">
                        <PlusCircle className="w-4 h-4 text-slate-500" /> {label}
                      </td>
                      
                      {compareList.map(acc => {
                        const customInv = acc.stats?.custom_inventory || [];
                        const field = customInv.find(f => f.label === label);
                        
                        return (
                          <td key={`custom-${label}-${acc.id}`} className="p-4 border-r border-slate-800 text-center align-middle">
                            <span className="font-bold text-sm text-amber-400/90">
                              {field ? field.value : '—'}
                            </span>
                          </td>
                        );
                      })}
                      
                      {emptySlots.map((_, i) => <td key={`e-custom-${label}-${i}`} className="border-r border-slate-800 bg-slate-900/20"></td>)}
                    </tr>
                  ))}
                </>
              )}

              <SimpleCategoryHeaderRow title="Додаткова інформація" emoji="ℹ️" colorClass="text-slate-500" />
              <StatRow title="Max KD (Королівство)" icon={Globe} fieldKey="max_kd" />
              
              <tr className="hover:bg-slate-800/40 transition-colors border-b border-slate-800/50">
                <td className="p-4 pl-6 border-r border-slate-800 text-slate-300 font-bold text-[13px] flex items-center gap-3">
                  <LinkIcon className="w-4 h-4 text-slate-500" /> Прив'язка
                </td>
                {compareList.map(acc => (
                  <td key={`bind-${acc.id}`} className="p-4 text-center text-slate-300 font-bold text-sm border-r border-slate-800 align-middle">
                    {acc.bind || <span className="text-slate-600">—</span>}
                  </td>
                ))}
                {emptySlots.map((_, i) => <td key={`e-bind-${i}`} className="border-r border-slate-800 bg-slate-900/20"></td>)}
              </tr>

              <tr className="hover:bg-slate-800/40 transition-colors border-b border-slate-800/50">
                <td className="p-4 pl-6 border-r border-slate-800 text-slate-300 font-bold text-[13px] flex items-center gap-3">
                  <Tag className="w-4 h-4 text-slate-500" /> Теги
                </td>
                {compareList.map(acc => (
                  <td key={`tags-${acc.id}`} className="p-4 border-r border-slate-800 align-middle">
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {acc.tags && acc.tags.length > 0 ? acc.tags.map(tag => (
                        <span key={tag} className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">
                          {tag.trim()}
                        </span>
                      )) : <span className="text-slate-600">—</span>}
                    </div>
                  </td>
                ))}
                {emptySlots.map((_, i) => <td key={`e-tags-${i}`} className="border-r border-slate-800 bg-slate-900/20"></td>)}
              </tr>

            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Compare;