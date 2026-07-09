import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, CheckCircle2, Lock, Tag, ImageIcon, Ticket, Heart, Scale, SlidersHorizontal, ArrowDownUp } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useCompare } from '../context/CompareContext';
import { apiGet } from '../config/apiClient';
import { API_ENDPOINTS, getFullUrl } from '../config/api';
import { useTranslation } from 'react-i18next'; 

// 🔥 ДОПОМІЖНА ФУНКЦІЯ ПРЯМО ТУТ 🔥
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

const Accounts = () => {
  const { t } = useTranslation(); 
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { appliedPromo } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist(); 
  const { toggleCompare, isInCompare } = useCompare();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active'); 
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('newest'); 
  
  const ALL_TAG = 'ALL_TAG_CONSTANT';
  const [selectedTag, setSelectedTag] = useState(ALL_TAG);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const data = await apiGet(getFullUrl(API_ENDPOINTS.ACCOUNTS));
        setAccounts(data.reverse()); 
      } catch (error) {
        console.error("Помилка завантаження бази даних:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAccounts();
  }, []);

  const allTags = [ALL_TAG, ...new Set(accounts.flatMap(acc => acc.tags || []))];

  const filteredAccounts = accounts
    .filter(acc => {
      if (acc.status !== activeTab) return false;
      
      if (searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const possibleId = term.replace(/^id\s*:?\s*/, '');
        const matchesTitle = acc.title.toLowerCase().includes(term);
        const matchesId = acc.id.toString() === possibleId || acc.id.toString() === term;
        if (!matchesTitle && !matchesId) return false;
      }
      
      if (selectedTag !== ALL_TAG && (!acc.tags || !acc.tags.includes(selectedTag))) return false;
      
      const accPrice = parseFloat(acc.price);
      if (minPrice && accPrice < parseFloat(minPrice)) return false;
      if (maxPrice && accPrice > parseFloat(maxPrice)) return false;

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc') return parseFloat(a.price) - parseFloat(b.price);
      if (sortBy === 'price_desc') return parseFloat(b.price) - parseFloat(a.price);
      return 0; 
    });

  const handleWishlistClick = (acc) => {
    const wishlistItem = {
      id: acc.id,
      name: acc.title,
      desc: acc.shortDesc,
      price: acc.price,
      type: 'account',
      image: acc.images ? acc.images[0] : null
    };
    toggleWishlist(wishlistItem);
  };

  return (
    <div className="pb-20 pt-8 max-w-6xl mx-auto px-4">
      
      {/* ЗАГОЛОВОК ТА ВКЛАДКИ */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div>
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter leading-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-red-500 to-amber-500 drop-shadow-[0_0_20px_rgba(220,38,38,0.4)]">
              {t('accounts.title')}
            </span>
          </h1>
        </div>
        <div className="flex bg-zinc-900/80 p-1.5 rounded-2xl border border-zinc-800 w-full md:w-auto shadow-inner backdrop-blur-md">
          <button 
            onClick={() => setActiveTab('active')} 
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'active' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
          >
            <CheckCircle2 className="w-4 h-4" /> {t('accounts.filter.active')}
          </button>
          <button 
            onClick={() => setActiveTab('sold')} 
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'sold' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
          >
            <Lock className="w-4 h-4" /> {t('accounts.filter.sold')}
          </button>
        </div>
      </div>

      {/* ПОШУК ТА ФІЛЬТРИ */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Пошук за назвою або ID (напр. ID 5)" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:border-red-500 outline-none transition-colors shadow-inner font-medium" 
          />
        </div>
        
        <button 
          onClick={() => setIsFilterOpen(!isFilterOpen)} 
          className={`flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold transition-all border ${isFilterOpen ? 'bg-red-600 border-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-red-500/50 shadow-sm'}`}
        >
          <SlidersHorizontal className="w-5 h-5" />
          Фільтри
        </button>
      </div>

      {/* ВИПАДАЮЧІ ФІЛЬТРИ */}
      {isFilterOpen && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-zinc-900/80 border border-zinc-800 rounded-2xl mb-4 animate-in slide-in-from-top-2 fade-in duration-200 shadow-xl backdrop-blur-md">
          <div>
            <label className="block text-[11px] font-bold text-zinc-400 mb-2 uppercase tracking-wider">Мінімальна ціна ($)</label>
            <input type="number" placeholder="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:border-red-500 outline-none transition-colors shadow-inner"/>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-zinc-400 mb-2 uppercase tracking-wider">Максимальна ціна ($)</label>
            <input type="number" placeholder="9999" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:border-red-500 outline-none transition-colors shadow-inner"/>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-zinc-400 mb-2 uppercase tracking-wider flex items-center gap-1"><ArrowDownUp className="w-3 h-3" /> Сортування</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:border-red-500 outline-none cursor-pointer appearance-none transition-colors shadow-inner font-bold">
              <option value="newest" className="font-bold">Спочатку нові</option>
              <option value="price_asc" className="font-bold">Від дешевих до дорогих</option>
              <option value="price_desc" className="font-bold">Від дорогих до дешевих</option>
            </select>
          </div>
          {(minPrice || maxPrice || sortBy !== 'newest') && (
            <div className="md:col-span-3 flex justify-end mt-2">
              <button onClick={() => { setMinPrice(''); setMaxPrice(''); setSortBy('newest'); }} className="text-xs font-bold text-red-500 hover:text-red-400 transition-colors uppercase tracking-wider">Скинути фільтри</button>
            </div>
          )}
        </div>
      )}

      {/* ТЕГИ */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200
        [&::-webkit-scrollbar]:h-1.5 
        [&::-webkit-scrollbar-track]:bg-zinc-900/50 
        [&::-webkit-scrollbar-track]:rounded-full
        [&::-webkit-scrollbar-thumb]:bg-zinc-700 
        [&::-webkit-scrollbar-thumb]:rounded-full 
        hover:[&::-webkit-scrollbar-thumb]:bg-red-500
        transition-colors"
      >
        {allTags.map(tag => (
          <button 
            key={tag} 
            onClick={() => setSelectedTag(tag)}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap border transition-all ${selectedTag === tag ? 'bg-red-600 border-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-red-900/50 hover:text-zinc-200 shadow-sm'}`}
          >
            {tag === ALL_TAG ? t('accounts.filter.all') : `#${tag}`}
          </button>
        ))}
      </div>

      {/* РЕЗУЛЬТАТИ */}
      {isLoading ? (
        <div className="text-center py-32 text-zinc-500 animate-pulse font-bold text-xl">{t('common.loading')}</div>
      ) : filteredAccounts.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900/40 border border-zinc-800 rounded-3xl backdrop-blur-md">
          <Search className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400 font-bold text-lg">За вашими фільтрами нічого не знайдено 😔</p>
          <button onClick={() => { setMinPrice(''); setMaxPrice(''); setSearchTerm(''); setSelectedTag(ALL_TAG); }} className="mt-4 text-amber-500 hover:text-amber-400 text-sm font-bold uppercase tracking-wider">
            Очистити пошук
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-12 duration-700 delay-300">
          {filteredAccounts.map(acc => {
            const hasActiveDiscount = isPromoApplicable(appliedPromo, 'account', acc.id) && acc.status === 'active';
            const isLiked = isInWishlist(acc.id, 'account');

            const iPrice = parseFloat(acc.price || 0);
            const iBase = parseFloat(acc.base_price || iPrice);
            let discountedPrice = iPrice;

            if (hasActiveDiscount) {
              if (appliedPromo.target === 'guild') discountedPrice = iBase; 
              else if (appliedPromo.type === 'percent') discountedPrice = iPrice - (iPrice * parseFloat(appliedPromo.value) / 100);
              else if (appliedPromo.type === 'fixed' && appliedPromo.target_items?.length > 0) discountedPrice = Math.max(0, iPrice - parseFloat(appliedPromo.value));
            }

            const borderStyle = hasActiveDiscount && appliedPromo 
              ? (appliedPromo.target === 'guild' ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'border-red-500/50 shadow-[0_0_15px_rgba(220,38,38,0.15)]') 
              : 'border-zinc-800/50 hover:border-red-500/30';

            return (
              <div key={acc.id} className={`group relative bg-zinc-900/40 backdrop-blur-md border ${borderStyle} rounded-3xl overflow-hidden transition-all flex flex-col shadow-xl hover:-translate-y-1 ${acc.status === 'sold' ? 'opacity-80 grayscale hover:grayscale-0' : ''}`}>
                
                {/* 🔥 ВОГОНЬ ПО КУТАХ 🔥 */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-500/20 rounded-full blur-[50px] pointer-events-none z-0"></div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-500/20 rounded-full blur-[50px] pointer-events-none z-0"></div>

                {/* ФОТО АКАУНТА */}
                <div className="relative aspect-video overflow-hidden bg-zinc-950 flex items-center justify-center z-10">
                  {acc.images && acc.images.length > 0 ? (
                    <img src={acc.images[0]} alt={acc.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <ImageIcon className="w-12 h-12 text-zinc-700" />
                  )}
                  
                  {/* КНОПКА В УЛЮБЛЕНЕ */}
                  <button 
                    onClick={() => handleWishlistClick(acc)}
                    className={`absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-md transition-all duration-300 z-20 shadow-lg ${isLiked ? 'bg-red-600 text-white' : 'bg-zinc-950/60 text-white hover:bg-red-500'}`}
                    title={isLiked ? t('accounts.removeFromWishlist') : t('accounts.addToWishlist')}
                  >
                    <Heart className={`w-5 h-5 ${isLiked ? 'fill-white' : ''}`} />
                  </button>

                  <div className="absolute top-4 left-4 flex gap-2 z-20">
                    <span className="px-3 py-1.5 bg-zinc-950/80 border border-zinc-800 text-amber-500 text-xs font-black rounded-full shadow-lg backdrop-blur-md tracking-wider">
                      ID: #{acc.id}
                    </span>
                  </div>

                  {/* ПЛАШКА ПРОМОКОДУ */}
                  {hasActiveDiscount && appliedPromo && (
                    <div className={`absolute top-4 right-16 flex gap-2 z-20`}>
                      <span className={`flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950/90 border text-xs font-black uppercase tracking-wider rounded-full shadow-lg backdrop-blur-md ${appliedPromo.target === 'guild' ? 'border-amber-500/50 text-amber-500' : 'border-red-500/50 text-red-500'}`}>
                        <Ticket className="w-3 h-3" /> {appliedPromo.target === 'guild' ? 'Для Своїх' : `${t('accounts.activeCode')} ${appliedPromo.code}`}
                      </span>
                    </div>
                  )}

                  {acc.status === 'sold' && (
                    <div className="absolute inset-0 bg-zinc-950/60 flex items-center justify-center z-30 backdrop-blur-[2px]">
                      <div className="px-6 py-2 border-4 border-red-600 text-red-500 text-3xl font-black uppercase tracking-widest rotate-[-15deg] rounded-xl bg-zinc-950/90 shadow-[0_0_20px_rgba(220,38,38,0.5)]">
                        {t('accounts.status.sold')}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* ІНФОРМАЦІЯ */}
                <div className="p-6 flex flex-col flex-1 relative z-10">
                  <h3 className="text-xl font-black text-white mb-3 line-clamp-1 drop-shadow-md">{acc.title}</h3>
                  <p className="text-sm text-zinc-400 mb-4 line-clamp-2 font-medium">{acc.shortDesc}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-6 mt-auto">
                    {acc.tags && acc.tags.map(tag => (
                      tag.trim() !== '' && (
                        <span key={tag} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider bg-zinc-950 border border-zinc-800 text-amber-500/80 px-2.5 py-1.5 rounded-lg shadow-sm">
                          <Tag className="w-3 h-3 text-red-500" /> {tag.trim()}
                        </span>
                      )
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-5 border-t border-zinc-800/50">
                    
                    {/* 🔥 ВІДОБРАЖЕННЯ ЦІНИ 🔥 */}
                    <div>
                      {hasActiveDiscount && appliedPromo && discountedPrice < iPrice ? (
                        <div className="flex flex-col">
                          <span className="text-xs text-zinc-500 line-through font-bold">${iPrice.toFixed(2)}</span>
                          <span className={`text-2xl font-black ${appliedPromo.target === 'guild' ? 'text-amber-400' : 'text-red-500 drop-shadow-[0_0_5px_rgba(220,38,38,0.5)]'}`}>
                            ${discountedPrice.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <div className="text-2xl font-black text-white drop-shadow-md">
                          ${iPrice.toFixed(2)}
                        </div>
                      )}
                    </div>

                    {acc.status === 'active' ? (
                      <Link 
                        to={`/accounts/${acc.id}`} 
                        className={`px-6 py-3 text-white text-sm font-black uppercase tracking-wider rounded-xl shadow-lg transition-all hover:scale-105 ${hasActiveDiscount && appliedPromo ? (appliedPromo.target === 'guild' ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-gradient-to-r from-red-700 to-red-600 shadow-[0_0_15px_rgba(220,38,38,0.3)]') : 'bg-zinc-800 hover:bg-red-600 border border-zinc-700 hover:border-red-500'}`}
                      >
                        {t('accounts.details')}
                      </Link>
                    ) : (
                      <button disabled className="px-6 py-3 bg-zinc-900 border border-zinc-800 text-zinc-600 text-sm font-black uppercase tracking-wider rounded-xl cursor-not-allowed">
                        {t('accounts.unavailable')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Accounts;