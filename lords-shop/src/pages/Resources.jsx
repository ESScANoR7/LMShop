import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Gem, PackageOpen, Info, Ticket, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next'; // 🔥 ІМПОРТ ПЕРЕКЛАДІВ
import OrderModal from '../components/OrderModal';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

const Resources = () => {
  const { t } = useTranslation(); // 🔥 ІНІЦІАЛІЗАЦІЯ ПЕРЕКЛАДУ
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
    return <div className="text-center text-slate-400 py-32 text-xl font-bold animate-pulse">{t('resources_page.loading')}</div>;
  }

  return (
    <div className="flex flex-col gap-12 pb-20 pt-8 max-w-6xl mx-auto px-4">
      
      <header className="text-center">
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">{t('resources_page.title')}</h1>
        <p className="text-slate-400 max-w-xl mx-auto">
          {t('resources_page.subtitle')}
        </p>
      </header>

      {/* РЕСУРСИ (RSS) */}
      <section>
        <div className="flex items-center gap-3 mb-6 border-b border-slate-700/50 pb-4">
          <div className="p-2 bg-emerald-900/50 rounded-lg text-emerald-400">
            <PackageOpen className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white">{t('resources_page.rssTitle')}</h2>
        </div>

        {rssList.length === 0 ? (
          <div className="text-slate-500 py-4">{t('resources_page.noRss')}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {rssList.map((pack) => {
              const isTargeted = appliedPromo && appliedPromo.target_items && appliedPromo.target_items.includes(`rss_${pack.id}`);
              const isGlobal = appliedPromo && (!appliedPromo.target_items || appliedPromo.target_items.length === 0);
              const hasActiveDiscount = isTargeted || isGlobal;
              
              const isLiked = isInWishlist(pack.id, 'rss');

              return (
                <article key={pack.id} className={`relative overflow-hidden bg-slate-800/40 border ${hasActiveDiscount && appliedPromo ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)] bg-emerald-900/5' : 'border-slate-700 hover:border-emerald-500/50'} rounded-2xl p-5 transition-all hover:bg-slate-800/80 group flex flex-col justify-between`}>
                  
                  {hasActiveDiscount && appliedPromo && (
                    <div className="absolute top-0 right-0 bg-emerald-500/20 border-b border-l border-emerald-500/50 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-bl-xl flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)] backdrop-blur-sm z-10">
                      <Ticket className="w-3 h-3" /> {t('resources_page.activeCode')} {appliedPromo.code}
                    </div>
                  )}

                  <div className="mt-2 relative">
                    <div className="flex justify-between items-start mb-4 pr-8">
                      <h3 className="text-lg font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">{pack.name}</h3>
                    </div>
                    
                    {/* КНОПКА В УЛЮБЛЕНЕ */}
                    <button 
                      onClick={() => handleWishlistClick(pack, 'rss')}
                      className={`absolute -top-1 -right-1 p-2 rounded-full transition-all duration-300 ${isLiked ? 'text-rose-500 bg-rose-500/10 scale-110' : 'text-slate-500 hover:text-rose-400 hover:bg-slate-700'}`}
                      title={isLiked ? t('resources_page.removeFromWishlist') : t('resources_page.addToWishlist')}
                    >
                      <Heart className={`w-5 h-5 transition-all ${isLiked ? 'fill-rose-500' : ''}`} />
                    </button>

                    <p className="text-sm text-slate-400 mb-6">{pack.desc}</p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <div>
                      <div className={`text-2xl font-bold ${hasActiveDiscount && appliedPromo ? 'text-emerald-400' : 'text-white'}`}>
                        ${pack.price}
                      </div>
                    </div>

                    <button 
                      onClick={() => openOrder(pack, 'rss')}
                      className={`p-3 rounded-xl transition-all ${hasActiveDiscount && appliedPromo ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' : 'bg-blue-600 hover:bg-blue-500'} text-white focus:ring-2 focus:ring-blue-400 outline-none shadow-lg`}
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

      {/* САМОЦВІТИ (GEMS) */}
      <section className="mt-8">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-700/50 pb-4">
          <div className="p-2 bg-blue-900/50 rounded-lg text-blue-400">
            <Gem className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white">{t('resources_page.gemsTitle')}</h2>
          
          <div className="ml-auto group relative flex items-center cursor-help">
            <span className="text-xs text-slate-500 mr-2 hidden sm:block">{t('resources_page.tooltipTitle')}</span>
            <Info className="w-5 h-5 text-slate-500 hover:text-blue-400 transition-colors" />
            <div className="absolute right-0 bottom-8 w-64 p-3 bg-slate-800 border border-slate-600 rounded-xl text-xs text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
              {t('resources_page.tooltipDesc')}
            </div>
          </div>
        </div>

        {gemsList.length === 0 ? (
          <div className="text-slate-500 py-4">{t('resources_page.noGems')}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {gemsList.map((gem) => {
              const isTargeted = appliedPromo && appliedPromo.target_items && appliedPromo.target_items.includes(`gem_${gem.id}`);
              const isGlobal = appliedPromo && (!appliedPromo.target_items || appliedPromo.target_items.length === 0);
              const hasActiveDiscount = isTargeted || isGlobal;
              
              const isLiked = isInWishlist(gem.id, 'gems');

              return (
                <article key={gem.id} className={`relative overflow-hidden bg-slate-800/40 border ${hasActiveDiscount && appliedPromo ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)] bg-emerald-900/5' : 'border-slate-700 hover:border-blue-500/50'} rounded-2xl p-5 transition-all hover:bg-slate-800/80 group flex flex-col justify-between`}>
                  <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-500/10 blur-xl rounded-full group-hover:bg-blue-500/20 transition-all"></div>
                  
                  {hasActiveDiscount && appliedPromo && (
                    <div className="absolute top-0 right-0 bg-emerald-500/20 border-b border-l border-emerald-500/50 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-bl-xl flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)] backdrop-blur-sm z-10">
                      <Ticket className="w-3 h-3" /> {t('resources_page.activeCode')} {appliedPromo.code}
                    </div>
                  )}

                  <div className="mt-2 relative z-10">
                    <div className="flex justify-between items-start mb-4 pr-8">
                      <div>
                        <div className="text-sm text-slate-400 mb-1">{t('resources_page.mightLabel')}</div>
                        <h3 className="text-xl font-bold text-white">{gem.range}</h3>
                      </div>
                    </div>
                    
                    {/* КНОПКА В УЛЮБЛЕНЕ */}
                    <button 
                      onClick={() => handleWishlistClick(gem, 'gems')}
                      className={`absolute -top-1 -right-1 p-2 rounded-full transition-all duration-300 ${isLiked ? 'text-rose-500 bg-rose-500/10 scale-110' : 'text-slate-500 hover:text-rose-400 hover:bg-slate-700/50'}`}
                      title={isLiked ? t('resources_page.removeFromWishlist') : t('resources_page.addToWishlist')}
                    >
                      <Heart className={`w-5 h-5 transition-all ${isLiked ? 'fill-rose-500' : ''}`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-slate-700/50 pt-4 mt-auto relative z-10">
                    <div>
                      <div className={`text-2xl font-bold ${hasActiveDiscount && appliedPromo ? 'text-emerald-400' : 'text-blue-400'}`}>
                        ${gem.rate}
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => openOrder(gem, 'gems')}
                      className={`p-3 rounded-xl transition-all ${hasActiveDiscount && appliedPromo ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' : 'bg-slate-700 hover:bg-blue-500 shadow-blue-900/20'} text-white focus:ring-2 focus:ring-blue-400 outline-none shadow-lg`}
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