import React, { useState, useEffect } from 'react';
import { ShoppingCart, Star, Info, X, CheckCircle2, Ticket, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext'; // 🔥 ІМПОРТ УЛЮБЛЕНОГО 🔥
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

const Sapphires = () => {
  const { t } = useTranslation();
  const { isLoggedIn } = useAuth();
  const { addToCart, appliedPromo } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist(); // 🔥 ДІСТАЄМО ФУНКЦІЇ УЛЮБЛЕНОГО 🔥

  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({}); 
  
  // --- СТАНИ ДЛЯ БАЗИ ДАНИХ ---
  const [specialItems, setSpecialItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // ЗАВАНТАЖУЄМО ДАНІ З СЕРВЕРА
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/other-items');
        if (response.ok) {
          const data = await response.json();
          setSpecialItems(data);
        }
      } catch (error) {
        console.error("Помилка завантаження товарів:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchItems();
  }, []);

  const handleOpenModal = (item) => {
    setSelectedItem(item);
    const initialForm = {};
    (item.requiredFields || []).forEach(field => {
      initialForm[field] = '';
    });
    setFormData(initialForm);
  };

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleSubmitOrder = (e) => {
    e.preventDefault();
    
    // РОЗУМНИЙ ПАРСЕР
    let extractedNickname = '';
    let extractedGuild = '';
    let extractedCoords = '';
    let otherDetails = [];

    Object.entries(formData).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('нікнейм') || lowerKey.includes('nickname') || lowerKey.includes('нік')) {
        extractedNickname = value;
      } else if (lowerKey.includes('гільдія') || lowerKey.includes('guild') || lowerKey.includes('тег')) {
        extractedGuild = value;
      } else if (lowerKey.includes('координати') || lowerKey.includes('k:')) {
        extractedCoords = value;
      } else {
        otherDetails.push(`${key}: ${value}`);
      }
    });

    addToCart({
      product: selectedItem,
      type: 'special',
      price: selectedItem.price,
      userData: {
        nickname: extractedNickname,
        guild: extractedGuild,
        coordinates: extractedCoords,
        details: otherDetails.join(' | ') 
      }
    });

    setSelectedItem(null);
    toast.success(`${selectedItem.name} ${t('special_page.addedSuccess')}`);
  };

  // 🔥 Функція для додавання товару в улюблене 🔥
  const handleWishlistClick = (item) => {
    const wishlistItem = {
      id: item.id,
      name: item.name,
      desc: item.desc,
      price: item.price,
      type: 'special', // Вказуємо тип для кошика та логіки улюбленого
      color: item.color
    };
    toggleWishlist(wishlistItem);
  };

  // Функція для визначення CSS класу градієнта
  const getColorClass = (colorCode) => {
    switch (colorCode) {
      case 'orange': return 'from-amber-400 to-orange-500';
      case 'blue': return 'from-blue-400 to-indigo-500';
      case 'green': return 'from-emerald-400 to-teal-500';
      case 'purple': return 'from-purple-400 to-fuchsia-500';
      case 'red': return 'from-rose-400 to-red-500';
      default: return 'from-blue-400 to-indigo-500'; // По замовчуванню синій
    }
  };

  if (isLoading) {
    return <div className="text-center text-slate-400 py-32 text-xl font-bold animate-pulse">{t('special_page.loading')}</div>;
  }

  return (
    <div className="flex flex-col gap-12 pb-20 pt-8 max-w-6xl mx-auto px-4">
      
      <header className="text-center">
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">{t('special_page.title')}</h1>
        <p className="text-slate-400 max-w-xl mx-auto">
          {t('special_page.subtitle')}
        </p>
      </header>

      {specialItems.length === 0 ? (
        <div className="text-center text-slate-500 py-10">{t('special_page.noItems')}</div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {specialItems.map((item) => {
            // РОЗУМНА ЛОГІКА ПРОМОКОДУ
            const isTargeted = appliedPromo && appliedPromo.target_items && appliedPromo.target_items.includes(`oth_${item.id}`);
            const isGlobal = appliedPromo && (!appliedPromo.target_items || appliedPromo.target_items.length === 0);
            const hasActiveDiscount = isTargeted || isGlobal;
            
            // 🔥 Перевіряємо чи товар в улюбленому 🔥
            const isLiked = isInWishlist(item.id, 'special');

            return (
              <article 
                key={item.id} 
                className={`group relative bg-slate-800/40 border ${hasActiveDiscount && appliedPromo ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)] bg-emerald-900/5' : 'border-slate-700 hover:border-blue-500/50'} rounded-3xl p-1 overflow-hidden transition-all hover:bg-slate-800/80 hover:-translate-y-1 shadow-lg flex flex-col`}
              >
                <div className={`absolute top-0 left-0 w-full h-32 bg-gradient-to-br opacity-10 group-hover:opacity-20 transition-opacity ${getColorClass(item.color)}`}></div>
                
                <div className="relative p-5 flex flex-col flex-1">
                  
                  {/* БІРКА ВЛАСНА (Якщо є) - Справа */}
                  {item.tag && (
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl rounded-tr-2xl shadow-lg z-10">
                      {item.tag}
                    </div>
                  )}

                  {/* БІРКА ПРОМОКОДУ - Зліва */}
                  {hasActiveDiscount && appliedPromo && (
                    <div className="absolute top-0 left-0 bg-emerald-500/20 border-b border-r border-emerald-500/50 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-br-xl rounded-tl-2xl flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)] backdrop-blur-sm z-10">
                      <Ticket className="w-3 h-3" /> {t('special_page.activeCode')} {appliedPromo.code}
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-lg ${getColorClass(item.color)}`}>
                      <Star className="w-7 h-7 text-white" />
                    </div>

                    {/* 🔥 КНОПКА В УЛЮБЛЕНЕ 🔥 */}
                    <button 
                      onClick={() => handleWishlistClick(item)}
                      className={`p-2 rounded-full transition-all duration-300 ${isLiked ? 'text-rose-500 bg-rose-500/10 scale-110' : 'text-slate-500 hover:text-rose-400 hover:bg-slate-700/50'}`}
                      title={isLiked ? t('special_page.removeFromWishlist') : t('special_page.addToWishlist')}
                    >
                      <Heart className={`w-6 h-6 transition-all ${isLiked ? 'fill-rose-500' : ''}`} />
                    </button>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 leading-tight pr-2">{item.name}</h3>
                  <p className="text-sm text-slate-400 mb-6 flex-1 line-clamp-3 group-hover:line-clamp-none transition-all">
                    {item.desc}
                  </p>

                  <div className="flex items-end justify-between mt-auto pt-4 border-t border-slate-700/50">
                    <div>
                      <div className={`text-2xl font-black ${hasActiveDiscount && appliedPromo ? 'text-emerald-400' : 'text-white'}`}>
                        ${item.price}
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleOpenModal(item)}
                      className={`px-4 py-3 text-white rounded-xl transition-all flex items-center gap-2 font-bold shadow-lg ${hasActiveDiscount && appliedPromo ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'}`}
                    >
                      <ShoppingCart className="w-5 h-5" /> 
                      <span className="hidden sm:inline">{t('special_page.buy')}</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* ДИНАМІЧНЕ МОДАЛЬНЕ ВІКНО */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setSelectedItem(null)}></div>
          
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6">
            <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold text-white mb-2 pr-8">{t('special_page.modalTitle')}</h2>
            <p className="text-sm text-blue-400 font-medium mb-6">{selectedItem.name} — ${selectedItem.price}</p>

            <form onSubmit={handleSubmitOrder} className="space-y-4">
              {selectedItem.requiredFields?.map((field, index) => (
                <div key={index}>
                  <label className="block text-xs font-medium text-slate-400 mb-1">{field}</label>
                  <input 
                    required
                    value={formData[field] || ''}
                    onChange={(e) => handleInputChange(field, e.target.value)}
                    placeholder={`${t('special_page.enterPrefix')} ${field.toLowerCase()}`}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              ))}

              <div className="p-3 bg-blue-900/20 border border-blue-500/20 rounded-xl flex gap-3 mt-4">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <p className="text-xs text-slate-400 leading-relaxed">
                  {t('special_page.modalInfo')}
                </p>
              </div>

              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl mt-4 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> {t('special_page.addToCartBtn')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sapphires;