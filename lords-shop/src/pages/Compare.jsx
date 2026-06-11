import React from 'react';
import { Link } from 'react-router-dom';
import { useCompare } from '../context/CompareContext';
import { Scale, X, ShoppingCart, Image as ImageIcon, Trash2, Tag, LinkIcon, ShieldCheck, Swords, Users, Crown, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';

const Compare = () => {
  const { compareList, removeFromCompare, clearCompare } = useCompare();
  const { addToCart } = useCart();

  if (compareList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 min-h-[60vh]">
        <div className="w-24 h-24 bg-blue-900/20 rounded-full flex items-center justify-center mb-6 border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
          <Scale className="w-12 h-12 text-blue-500 animate-pulse" />
        </div>
        <h2 className="text-3xl font-black text-white mb-3 tracking-wide">Немає товарів для порівняння</h2>
        <p className="text-slate-400 max-w-md text-center mb-8">
          Перейдіть до каталогу акаунтів та натисніть на іконку терезів, щоб додати сюди товари.
        </p>
        <Link to="/accounts" className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:-translate-y-1">
          В каталог акаунтів
        </Link>
      </div>
    );
  }

  // Обчислюємо скільки порожніх колонок треба додати, щоб таблиця завжди виглядала повноцінною (макс 4 товари)
  const emptySlotsCount = Math.max(0, 4 - compareList.length);
  const emptySlots = Array.from({ length: emptySlotsCount });

  return (
    <div className="pb-20 pt-8 max-w-7xl mx-auto px-4 min-h-[70vh]">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Scale className="w-8 h-8 text-blue-500" /> Порівняння акаунтів
        </h1>
        <button onClick={clearCompare} className="text-sm font-bold text-slate-400 hover:text-red-400 flex items-center gap-2 transition-colors px-4 py-2 bg-slate-900 rounded-lg border border-slate-800">
          <Trash2 className="w-4 h-4" /> Очистити список
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr>
                <th className="p-6 border-b border-r border-slate-800 bg-slate-950/50 w-48 text-slate-400 font-bold uppercase text-xs tracking-wider align-bottom">
                  Характеристика
                </th>
                
                {/* РЕНДЕР АКАУНТІВ */}
                {compareList.map(acc => (
                  <th key={`header-${acc.id}`} className="p-6 border-b border-r border-slate-800 bg-slate-900/50 w-64 relative align-top group">
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
                      <div className="absolute bottom-2 left-2 bg-slate-950/80 text-white text-[10px] px-2 py-0.5 rounded font-mono border border-slate-700">ID: {acc.id}</div>
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

                {/* ПОРОЖНІ СЛОТИ */}
                {emptySlots.map((_, i) => (
                  <th key={`empty-${i}`} className="p-6 border-b border-r border-slate-800 bg-slate-900/20 w-64">
                    <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-slate-600 opacity-30 border-2 border-dashed border-slate-700 rounded-2xl">
                      <Scale className="w-10 h-10 mb-3" />
                      <span className="text-xs uppercase font-bold tracking-widest">Вільне місце</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-800">
              
              {/* Рядок: Статус */}
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="p-4 pl-6 border-r border-slate-800 text-slate-400 font-medium text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Статус
                </td>
                {compareList.map(acc => (
                  <td key={`status-${acc.id}`} className="p-4 text-center border-r border-slate-800">
                    {acc.status === 'active' ? (
                      <span className="inline-block px-3 py-1 bg-emerald-900/30 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg">В продажі</span>
                    ) : (
                      <span className="inline-block px-3 py-1 bg-red-900/30 border border-red-500/30 text-red-400 text-xs font-bold rounded-lg">Продано</span>
                    )}
                  </td>
                ))}
                {emptySlots.map((_, i) => <td key={`emp-status-${i}`} className="border-r border-slate-800 bg-slate-900/20"></td>)}
              </tr>

              {/* Рядок: Міць */}
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="p-4 pl-6 border-r border-slate-800 text-slate-400 font-medium text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-400" /> Загальна Міць
                </td>
                {compareList.map(acc => (
                  <td key={`might-${acc.id}`} className="p-4 text-center text-white font-bold text-lg border-r border-slate-800">
                    {acc.stats?.might || <span className="text-slate-600 text-sm font-normal">—</span>}
                  </td>
                ))}
                {emptySlots.map((_, i) => <td key={`emp-might-${i}`} className="border-r border-slate-800 bg-slate-900/20"></td>)}
              </tr>

              {/* Рядок: Війська */}
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="p-4 pl-6 border-r border-slate-800 text-slate-400 font-medium text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" /> Війська
                </td>
                {compareList.map(acc => (
                  <td key={`troops-${acc.id}`} className="p-4 text-center text-amber-400 font-bold border-r border-slate-800">
                    {acc.stats?.troops || <span className="text-slate-600 text-sm font-normal">—</span>}
                  </td>
                ))}
                {emptySlots.map((_, i) => <td key={`emp-troops-${i}`} className="border-r border-slate-800 bg-slate-900/20"></td>)}
              </tr>

              {/* Рядок: Mix ATK */}
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="p-4 pl-6 border-r border-slate-800 text-slate-400 font-medium text-sm flex items-center gap-2">
                  <Swords className="w-4 h-4 text-emerald-400" /> Mix Атака
                </td>
                {compareList.map(acc => (
                  <td key={`mix-${acc.id}`} className="p-4 text-center text-emerald-400 font-black text-lg border-r border-slate-800">
                    {acc.stats?.mix_atk || <span className="text-slate-600 text-sm font-normal">—</span>}
                  </td>
                ))}
                {emptySlots.map((_, i) => <td key={`emp-mix-${i}`} className="border-r border-slate-800 bg-slate-900/20"></td>)}
              </tr>

              {/* Рядок: Герої */}
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="p-4 pl-6 border-r border-slate-800 text-slate-400 font-medium text-sm flex items-center gap-2">
                  <Crown className="w-4 h-4 text-yellow-500" /> Донатні Герої
                </td>
                {compareList.map(acc => (
                  <td key={`heroes-${acc.id}`} className="p-4 text-center text-white font-bold text-sm border-r border-slate-800">
                    {acc.stats?.heroes || <span className="text-slate-600 text-sm font-normal">—</span>}
                  </td>
                ))}
                {emptySlots.map((_, i) => <td key={`emp-heroes-${i}`} className="border-r border-slate-800 bg-slate-900/20"></td>)}
              </tr>

              {/* Рядок: Зірки Артефактів */}
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="p-4 pl-6 border-r border-slate-800 text-slate-400 font-medium text-sm flex items-center gap-2">
                  <Star className="w-4 h-4 text-purple-400" /> Зірки Артефактів
                </td>
                {compareList.map(acc => (
                  <td key={`artifacts-${acc.id}`} className="p-4 text-center text-purple-400 font-bold border-r border-slate-800">
                    {acc.stats?.artifacts || <span className="text-slate-600 text-sm font-normal">—</span>}
                  </td>
                ))}
                {emptySlots.map((_, i) => <td key={`emp-artifacts-${i}`} className="border-r border-slate-800 bg-slate-900/20"></td>)}
              </tr>

              {/* Рядок: Прив'язки */}
              <tr className="hover:bg-slate-800/30 transition-colors bg-slate-950/30">
                <td className="p-4 pl-6 border-r border-slate-800 text-slate-400 font-medium text-sm flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-slate-500" /> Прив'язка
                </td>
                {compareList.map(acc => (
                  <td key={`bind-${acc.id}`} className="p-4 text-center text-slate-300 text-sm font-medium border-r border-slate-800">
                    {acc.bind || <span className="text-slate-600 text-sm font-normal">—</span>}
                  </td>
                ))}
                {emptySlots.map((_, i) => <td key={`emp-bind-${i}`} className="border-r border-slate-800 bg-slate-900/20"></td>)}
              </tr>

              {/* Рядок: Теги */}
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="p-4 pl-6 border-r border-slate-800 text-slate-400 font-medium text-sm flex items-center gap-2">
                  <Tag className="w-4 h-4 text-rose-400" /> Теги
                </td>
                {compareList.map(acc => (
                  <td key={`tags-${acc.id}`} className="p-4 border-r border-slate-800">
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {acc.tags && acc.tags.length > 0 ? acc.tags.map(tag => (
                        <span key={tag} className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">
                          {tag.trim()}
                        </span>
                      )) : <span className="text-slate-600 text-sm">—</span>}
                    </div>
                  </td>
                ))}
                {emptySlots.map((_, i) => <td key={`emp-tags-${i}`} className="border-r border-slate-800 bg-slate-900/20"></td>)}
              </tr>

            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Compare;