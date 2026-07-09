import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Star, Info, X, CheckCircle2, Ticket, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import OrderModal from '../components/OrderModal';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import toast from 'react-hot-toast';

// 🔥 ДОПОМІЖНА ФУНКЦІЯ ПРЯМО ТУТ (Щоб уникнути білого екрану) 🔥
const isPromoApplicable = (promo, type, id) => {
  if (!promo) return false;
  const prefix = type === 'account' ? 'acc_' : type === 'rss' ? 'rss_' : type === 'gems' ? 'gem_' : 'oth_';
  
  if (promo.target_items && promo.target_items.length > 0) {
    return promo.target_items.includes(`${prefix}${id}`) || promo.target_items.includes(`${prefix}all`);
  }
  
  if (promo.target === 'all' || promo.target === 'guild') return true;
  if (promo.target === 'accounts' && type === 'account') return true;
  if (promo.target === 'other' && type !== 'account') return true;
  
  return false;
};

const Sapphires = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const { addToCart, appliedPromo } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({}); 
  
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

  const handleWishlistClick = (item) => {
    const wishlistItem = {
      id: item.id,
      name: item.name,
      desc: item.desc,
      price: item.price,
      type: 'special', 
      color: item.color
    };
    toggleWishlist(wishlistItem);
  };

  const getColorClass = (colorCode) => {
    switch (colorCode) {
      case 'orange': return 'from-amber-600 to-amber-800 border-amber-500/30';
      case 'blue': return 'from-blue-600 to-blue-800 border-blue-500/30';
      case 'green': return 'from-emerald-600 to-emerald-800 border-emerald-500/30';
      case 'purple': return 'from-purple-600 to-purple-800 border-purple-500/30';
      case 'red': return 'from-red-600 to-red-800 border-red-500/30';
      default: return 'from-zinc-600 to-zinc-800 border-zinc-500/30'; 
    }
  };

  if (isLoading) {
    return <div className="text-center text-zinc-500 py-32 text-xl font-bold animate-pulse">{t('special_page.loading')}</div>;
  }

  return (
    <div className="flex flex-col gap-12 pb-20 pt-8 max-w-6xl mx-auto px-4">
      
      <header className="text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter leading-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-red-500 to-amber-500 drop-shadow-[0_0_20px_rgba(220,38,38,0.4)]">
            {t('special_page.title')}
          </span>
        </h1>
        <p className="text-zinc-400 max-w-xl mx-auto font-medium">
          {t('special_page.subtitle')}
        </p>
      </header>

      {specialItems.length === 0 ? (
        <div className="text-center text-zinc-500 py-10 font-medium">{t('special_page.noItems')}</div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
          {specialItems.map((item) => {
            // 🔥 РОЗУМНА ЛОГІКА ПРОМОКОДУ 🔥
            const hasActiveDiscount = isPromoApplicable(appliedPromo, 'special', item.id) && appliedPromo;
            const isLiked = isInWishlist(item.id, 'special');

            // 🔥 ЛОГІКА ПРОРАХУНКУ ЦІН 🔥
            const iPrice = parseFloat(item.price || 0);
            const iBase = parseFloat(item.base_price || iPrice);
            let discountedPrice = iPrice;

            if (hasActiveDiscount) {
              if (appliedPromo.target === 'guild') {
                discountedPrice = iBase; // Собівартість для гільдії
              } else if (appliedPromo.type === 'percent') {
                discountedPrice = iPrice - (iPrice * parseFloat(appliedPromo.value) / 100);
              } else if (appliedPromo.type === 'fixed' && appliedPromo.target_items?.length > 0) {
                discountedPrice = Math.max(0, iPrice - parseFloat(appliedPromo.value));
              }
            }

            // Визначення стилю бордера при наявності промокоду
            const borderStyle = hasActiveDiscount 
              ? (appliedPromo.target === 'guild' ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'border-red-500/50 shadow-[0_0_15px_rgba(220,38,38,0.15)]') 
              : 'border-zinc-800/50 hover:border-red-500/30';

            return (
              <article 
                key={item.id} 
                className={`relative overflow-hidden bg-zinc-900/40 backdrop-blur-md border ${borderStyle} rounded-3xl p-6 transition-all flex flex-col justify-between shadow-xl group`}
              >
                {/* 🔥 ВОГОНЬ ПО КУТАХ 🔥 */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-500/20 rounded-full blur-[50px] pointer-events-none"></div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-500/20 rounded-full blur-[50px] pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col flex-1">
                  
                  {/* БІРКА ВЛАСНА (Якщо є) - Справа */}
                  {item.tag && (
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-red-600 to-amber-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-bl-2xl shadow-lg z-20 backdrop-blur-md">
                      {item.tag}
                    </div>
                  )}

                  {/* БІРКА ПРОМОКОДУ - Зліва */}
                  {hasActiveDiscount && (
                    <div className={`absolute top-0 left-0 ${appliedPromo.target === 'guild' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_10px_rgba(220,38,38,0.2)]'} border-b border-r text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-br-2xl flex items-center gap-1.5 z-20 backdrop-blur-md`}>
                      <Ticket className="w-3 h-3" /> {appliedPromo.target === 'guild' ? 'Для Своїх' : `${t('special_page.activeCode')} ${appliedPromo.code}`}
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-4 mt-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-[0_0_15px_rgba(0,0,0,0.5)] border ${getColorClass(item.color)} relative z-10`}>
                      <Star className="w-7 h-7 text-white drop-shadow-md" />
                    </div>

                    {/* 🔥 КНОПКА В УЛЮБЛЕНЕ 🔥 */}
                    <button 
                      onClick={() => handleWishlistClick(item)}
                      className={`p-2 rounded-full transition-all duration-300 relative z-20 ${isLiked ? 'text-red-500 bg-red-500/10 scale-110' : 'text-zinc-500 hover:text-red-400 hover:bg-zinc-800'}`}
                      title={isLiked ? t('special_page.removeFromWishlist') : t('special_page.addToWishlist')}
                    >
                      <Heart className={`w-6 h-6 transition-all ${isLiked ? 'fill-red-500' : ''}`} />
                    </button>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 leading-tight pr-2 drop-shadow-md">{item.name}</h3>
                  <p className="text-sm text-zinc-400 mb-6 flex-1 font-medium relative z-10">
                    {item.desc}
                  </p>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-800/50 relative z-10">
                    
                    {/* 🔥 ВІДОБРАЖЕННЯ ЦІНИ 🔥 */}
                    <div>
                      {hasActiveDiscount && discountedPrice < iPrice ? (
                        <div className="flex flex-col">
                          <span className="text-xs text-zinc-500 line-through font-bold">${iPrice.toFixed(2)}</span>
                          <span className={`text-2xl font-black ${appliedPromo.target === 'guild' ? 'text-amber-400' : 'text-red-500 drop-shadow-[0_0_5px_rgba(220,38,38,0.5)]'}`}>
                            ${discountedPrice.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <div className="text-2xl font-black text-amber-500 drop-shadow-sm">
                          ${iPrice.toFixed(2)}
                        </div>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => handleOpenModal(item)}
                      className={`px-4 py-3 rounded-2xl transition-all hover:scale-105 flex items-center gap-2 font-bold shadow-lg outline-none ${hasActiveDiscount ? (appliedPromo.target === 'guild' ? 'bg-gradient-to-r from-amber-600 to-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)] text-zinc-950' : 'bg-gradient-to-r from-red-700 to-red-600 shadow-[0_0_15px_rgba(220,38,38,0.3)] text-white') : 'bg-zinc-800 hover:bg-red-600 border border-zinc-700 hover:border-red-500 text-white'}`}
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
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={() => setSelectedItem(null)}></div>
          
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-red-500 transition-colors">
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-black text-white mb-2 pr-8">{t('special_page.modalTitle')}</h2>
            <p className="text-sm text-amber-500 font-bold mb-6">{selectedItem.name} — ${selectedItem.price}</p>

            <form onSubmit={handleSubmitOrder} className="space-y-4">
              {selectedItem.requiredFields?.map((field, index) => (
                <div key={index}>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">{field}</label>
                  <input 
                    required
                    value={formData[field] || ''}
                    onChange={(e) => handleInputChange(field, e.target.value)}
                    placeholder={`${t('special_page.enterPrefix')} ${field.toLowerCase()}`}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-red-500 transition-colors shadow-inner"
                  />
                </div>
              ))}

              <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-xl flex gap-3 mt-6 shadow-inner">
                <Info className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                  {t('special_page.modalInfo')}
                </p>
              </div>

              <button type="submit" className="w-full bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-black py-4 rounded-xl mt-4 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:scale-[1.02] transition-all">
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