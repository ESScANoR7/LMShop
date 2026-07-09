import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Gem, PackageOpen, Info, Ticket, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import OrderModal from '../components/OrderModal';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

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

const Resources = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const { appliedPromo } = useCart(); 
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderType, setOrderType] = useState('rss');

  const [rssList, setRssList] = useState([]);
  const [gemsList, setGemsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchResourcesAndGems = async () => {
      try {
        const [resRss, resGems] = await Promise.all([
          fetch('http://localhost:8000/api/resources'),
          fetch('http://localhost:8000/api/gems')
        ]);

        if (resRss.ok) {
          setRssList(await resRss.json());
        }
        if (resGems.ok) {
          setGemsList(await resGems.json());
        }
      } catch (error) {
        console.error("Помилка завантаження даних:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResourcesAndGems();
  }, []);

  const openOrder = (product, type) => {
    if (type === 'gems') {
      navigate('/gems-builder', { state: { baseRate: product.rate } });
    } else {
      setSelectedProduct({ ...product, price: product.price });
      setOrderType(type);
      setIsModalOpen(true);
    }
  };

  const handleWishlistClick = (item, type) => {
    const wishlistItem = {
      id: item.id,
      name: type === 'gems' ? `${t('nav.gems')}: ${item.range}` : item.name,
      desc: type === 'gems' ? `${t('resources_page.mightLabel')} ${item.range}` : item.desc,
      price: type === 'gems' ? item.rate : item.price,
      type: type 
    };
    toggleWishlist(wishlistItem);
  };

  if (isLoading) {
    return <div className="text-center text-zinc-500 py-32 text-xl font-bold animate-pulse">{t('resources_page.loading')}</div>;
  }

  return (
    <div className="flex flex-col gap-12 pb-20 pt-8 max-w-6xl mx-auto px-4">
      
      <header className="text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* 🔥 ОНОВЛЕНИЙ ЗАГОЛОВОК ІЗ ЖОВТО-ГАРЯЧИМ ГРАДІЄНТОМ 🔥 */}
        <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter leading-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-red-500 to-amber-500 drop-shadow-[0_0_20px_rgba(220,38,38,0.4)]">
            {t('resources_page.title')}
          </span>
        </h1>
        <p className="text-zinc-400 max-w-xl mx-auto font-medium">
          {t('resources_page.subtitle')}
        </p>
      </header>

      {/* ======================================================= */}
      {/* РЕСУРСИ (RSS) */}
      {/* ======================================================= */}
      <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
        <div className="flex items-center gap-3 mb-6 border-b border-zinc-800/50 pb-4">
          <div className="p-2 bg-red-950/50 border border-red-900/50 rounded-xl text-amber-500 shadow-[0_0_15px_rgba(220,38,38,0.2)]">
            <PackageOpen className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide">{t('resources_page.rssTitle')}</h2>
        </div>

        {rssList.length === 0 ? (
          <div className="text-zinc-500 py-4 font-medium">{t('resources_page.noRss')}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {rssList.map((pack) => {
              const hasActiveDiscount = isPromoApplicable(appliedPromo, 'rss', pack.id) && appliedPromo;
              
              const isLiked = isInWishlist(pack.id, 'rss');

              const iPrice = parseFloat(pack.price || 0);
              const iBase = parseFloat(pack.base_price || iPrice);
              let discountedPrice = iPrice;

              if (hasActiveDiscount) {
                if (appliedPromo.target === 'guild') {
                  discountedPrice = iBase; 
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
                <article key={pack.id} className={`relative overflow-hidden bg-zinc-900/40 backdrop-blur-md border ${borderStyle} rounded-3xl p-6 transition-all flex flex-col justify-between shadow-xl`}>
                  
                  {/* 🔥 ВОГОНЬ ПО КУТАХ 🔥 */}
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-500/20 rounded-full blur-[50px] pointer-events-none"></div>
                  <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-500/20 rounded-full blur-[50px] pointer-events-none"></div>

                  {/* ПЛАШКА ПРОМОКОДУ */}
                  {hasActiveDiscount && (
                    <div className={`absolute top-0 right-0 ${appliedPromo.target === 'guild' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_10px_rgba(220,38,38,0.2)]'} border-b border-l text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-bl-2xl flex items-center gap-1.5 z-20 backdrop-blur-md`}>
                      <Ticket className="w-3 h-3" /> {appliedPromo.target === 'guild' ? 'Для Своїх' : `${t('resources_page.activeCode')} ${appliedPromo.code}`}
                    </div>
                  )}

                  <div className="mt-2 relative z-10">
                    <div className="flex justify-between items-start mb-4 pr-8">
                      <h3 className="text-xl font-bold text-white drop-shadow-md">{pack.name}</h3>
                    </div>
                    
                    <button 
                      onClick={() => handleWishlistClick(pack, 'rss')}
                      className={`absolute -top-2 -right-2 p-2 rounded-full transition-all duration-300 ${isLiked ? 'text-red-500 bg-red-500/10 scale-110' : 'text-zinc-500 hover:text-red-400 hover:bg-zinc-800'}`}
                      title={isLiked ? t('resources_page.removeFromWishlist') : t('resources_page.addToWishlist')}
                    >
                      <Heart className={`w-5 h-5 transition-all ${isLiked ? 'fill-red-500' : ''}`} />
                    </button>

                    <p className="text-sm text-zinc-400 mb-6 font-medium">{pack.desc}</p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto relative z-10 border-t border-zinc-800/50 pt-4">
                    
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
                      onClick={() => openOrder(pack, 'rss')}
                      className={`p-3 rounded-2xl transition-all hover:scale-105 ${hasActiveDiscount ? (appliedPromo.target === 'guild' ? 'bg-gradient-to-r from-amber-600 to-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)] text-zinc-950' : 'bg-gradient-to-r from-red-700 to-red-600 shadow-[0_0_15px_rgba(220,38,38,0.3)] text-white') : 'bg-zinc-800 hover:bg-red-600 border border-zinc-700 hover:border-red-500 text-white shadow-md'} outline-none`}
                    >
                      <ShoppingCart className="w-5 h-5" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ======================================================= */}
      {/* САМОЦВІТИ (GEMS) */}
      {/* ======================================================= */}
      <section className="mt-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
        <div className="flex items-center gap-3 mb-6 border-b border-zinc-800/50 pb-4">
          <div className="p-2 bg-amber-950/50 border border-amber-900/50 rounded-xl text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Gem className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide">{t('resources_page.gemsTitle')}</h2>
          
          <div className="ml-auto group relative flex items-center cursor-help">
            <span className="text-xs text-zinc-500 mr-2 hidden sm:block font-bold uppercase tracking-wider">{t('resources_page.tooltipTitle')}</span>
            <Info className="w-5 h-5 text-zinc-500 hover:text-amber-500 transition-colors" />
            <div className="absolute right-0 bottom-8 w-64 p-4 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-2xl font-medium">
              {t('resources_page.tooltipDesc')}
            </div>
          </div>
        </div>

        {gemsList.length === 0 ? (
          <div className="text-zinc-500 py-4 font-medium">{t('resources_page.noGems')}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {gemsList.map((gem) => {
              const hasActiveDiscount = isPromoApplicable(appliedPromo, 'gems', gem.id) && appliedPromo;
              
              const isLiked = isInWishlist(gem.id, 'gems');

              const iPrice = parseFloat(gem.rate || 0);
              const iBase = parseFloat(gem.base_price || iPrice);
              let discountedPrice = iPrice;

              if (hasActiveDiscount) {
                if (appliedPromo.target === 'guild') {
                  discountedPrice = iBase; 
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
                <article key={gem.id} className={`relative overflow-hidden bg-zinc-900/40 backdrop-blur-md border ${borderStyle} rounded-3xl p-6 transition-all flex flex-col justify-between shadow-xl`}>
                  
                  {/* 🔥 ВОГОНЬ ПО КУТАХ 🔥 */}
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-500/20 rounded-full blur-[50px] pointer-events-none"></div>
                  <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-500/20 rounded-full blur-[50px] pointer-events-none"></div>
                  
                  {/* ПЛАШКА ПРОМОКОДУ */}
                  {hasActiveDiscount && (
                    <div className={`absolute top-0 right-0 ${appliedPromo.target === 'guild' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_10px_rgba(220,38,38,0.2)]'} border-b border-l text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-bl-2xl flex items-center gap-1.5 z-20 backdrop-blur-md`}>
                      <Ticket className="w-3 h-3" /> {appliedPromo.target === 'guild' ? 'Для Своїх' : `${t('resources_page.activeCode')} ${appliedPromo.code}`}
                    </div>
                  )}

                  <div className="mt-2 relative z-10">
                    <div className="flex justify-between items-start mb-4 pr-8">
                      <div>
                        <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">{t('resources_page.mightLabel')}</div>
                        <h3 className="text-2xl font-black text-white drop-shadow-md">{gem.range}</h3>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleWishlistClick(gem, 'gems')}
                      className={`absolute -top-2 -right-2 p-2 rounded-full transition-all duration-300 ${isLiked ? 'text-red-500 bg-red-500/10 scale-110' : 'text-zinc-500 hover:text-red-400 hover:bg-zinc-800'}`}
                      title={isLiked ? t('resources_page.removeFromWishlist') : t('resources_page.addToWishlist')}
                    >
                      <Heart className={`w-5 h-5 transition-all ${isLiked ? 'fill-red-500' : ''}`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-zinc-800/50 pt-4 mt-auto relative z-10">
                    
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
                      onClick={() => openOrder(gem, 'gems')}
                      className={`p-3 rounded-2xl transition-all hover:scale-105 ${hasActiveDiscount ? (appliedPromo.target === 'guild' ? 'bg-gradient-to-r from-amber-600 to-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)] text-zinc-950' : 'bg-gradient-to-r from-red-700 to-red-600 shadow-[0_0_15px_rgba(220,38,38,0.3)] text-white') : 'bg-zinc-800 hover:bg-red-600 border border-zinc-700 hover:border-red-500 text-white shadow-md'} outline-none`}
                    >
                      <ShoppingCart className="w-5 h-5" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      
      <OrderModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        product={selectedProduct}
        type={orderType}
      />

    </div>
  );
};

export default Resources;