import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, CheckCircle2, Lock, Tag, ImageIcon, Ticket, Heart, Scale, SlidersHorizontal, ArrowDownUp } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { PriceDisplay } from '../context/CurrencyContext';
import { useCompare } from '../context/CompareContext';
import { apiGet } from '../config/apiClient';
import { API_ENDPOINTS, getFullUrl, getImageUrl } from '../config/api';
import { useTranslation } from 'react-i18next';

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
  const { toggleCompare, isInCompare, compareList } = useCompare();

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
    toggleWishlist({
      id: acc.id,
      name: acc.title,
      desc: acc.shortDesc,
      price: acc.price,
      type: 'account',
      image: acc.images ? getImageUrl(acc.images[0]) : null,
    });
  };

  return (
    <div className="pb-20 pt-8 max-w-6xl mx-auto px-4">

      {/* ЗАГОЛОВОК ТА ВКЛАДКИ */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div>
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter leading-tight" style={{ color: 'var(--text-accent)' }}>
            {t('accounts.title')}
          </h1>
        </div>
        {/* Вкладки Активні / Продані */}
        <div
          className="flex p-1.5 rounded-2xl w-full md:w-auto shadow-inner backdrop-blur-md border"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
        >
          <button
            onClick={() => setActiveTab('active')}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all"
            style={activeTab === 'active'
              ? { background: 'var(--accent)', color: 'white', boxShadow: '0 0 15px var(--accent-glow)' }
              : { color: 'var(--text-secondary)' }
            }
          >
            <CheckCircle2 className="w-4 h-4" /> {t('accounts.filter.active')}
          </button>
          <button
            onClick={() => setActiveTab('sold')}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all"
            style={activeTab === 'sold'
              ? { background: 'var(--bg-card-hover)', color: 'var(--text-primary)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }
              : { color: 'var(--text-secondary)' }
            }
          >
            <Lock className="w-4 h-4" /> {t('accounts.filter.sold')}
          </button>
        </div>
      </div>

      {/* ПОШУК ТА ФІЛЬТРИ */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Пошук за назвою або ID (напр. ID 5)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl pl-12 pr-4 py-4 focus:outline-none transition-colors shadow-inner font-medium"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--border-accent)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
          />
        </div>

        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold transition-all border"
          style={isFilterOpen
            ? { background: 'var(--accent)', borderColor: 'var(--border-accent)', color: 'white', boxShadow: '0 0 15px var(--accent-glow)' }
            : { background: 'var(--bg-card)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }
          }
        >
          <SlidersHorizontal className="w-5 h-5" />
          Фільтри
        </button>
      </div>

      {/* ВИПАДАЮЧІ ФІЛЬТРИ */}
      {isFilterOpen && (
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 rounded-2xl mb-4 animate-in slide-in-from-top-2 fade-in duration-200 shadow-xl backdrop-blur-md border"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
        >
          <div>
            <label className="block text-[11px] font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Мінімальна ціна ($)
            </label>
            <input
              type="number" placeholder="0" value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors shadow-inner"
              style={{ background: 'var(--bg-base)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--border-accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Максимальна ціна ($)
            </label>
            <input
              type="number" placeholder="9999" value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors shadow-inner"
              style={{ background: 'var(--bg-base)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--border-accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold mb-2 uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
              <ArrowDownUp className="w-3 h-3" /> Сортування
            </label>
            <select
              value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none cursor-pointer appearance-none transition-colors shadow-inner font-bold"
              style={{ background: 'var(--bg-base)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            >
              <option value="newest">Спочатку нові</option>
              <option value="price_asc">Від дешевих до дорогих</option>
              <option value="price_desc">Від дорогих до дешевих</option>
            </select>
          </div>
          {(minPrice || maxPrice || sortBy !== 'newest') && (
            <div className="md:col-span-3 flex justify-end mt-2">
              <button
                onClick={() => { setMinPrice(''); setMaxPrice(''); setSortBy('newest'); }}
                className="text-xs font-bold uppercase tracking-wider transition-colors"
                style={{ color: 'var(--text-accent)' }}
              >
                Скинути фільтри
              </button>
            </div>
          )}
        </div>
      )}

      {/* ТЕГИ */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200
        [&::-webkit-scrollbar]:h-1.5
        [&::-webkit-scrollbar-track]:bg-transparent
        [&::-webkit-scrollbar-thumb]:rounded-full
        transition-colors"
      >
        {allTags.map(tag => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className="px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap border transition-all"
            style={selectedTag === tag
              ? { background: 'var(--accent)', borderColor: 'var(--border-accent)', color: 'white', boxShadow: '0 0 15px var(--accent-glow)' }
              : { background: 'var(--bg-card)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }
            }
          >
            {tag === ALL_TAG ? t('accounts.filter.all') : `#${tag}`}
          </button>
        ))}
      </div>

      {/* РЕЗУЛЬТАТИ */}
      {isLoading ? (
        <div className="text-center py-32 animate-pulse font-bold text-xl" style={{ color: 'var(--text-secondary)' }}>
          {t('common.loading')}
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div
          className="text-center py-20 rounded-3xl backdrop-blur-md border"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
        >
          <Search className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--border-default)' }} />
          <p className="font-bold text-lg" style={{ color: 'var(--text-secondary)' }}>За вашими фільтрами нічого не знайдено 😔</p>
          <button
            onClick={() => { setMinPrice(''); setMaxPrice(''); setSearchTerm(''); setSelectedTag(ALL_TAG); }}
            className="mt-4 text-sm font-bold uppercase tracking-wider"
            style={{ color: 'var(--gold)' }}
          >
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

            const promoStyle = hasActiveDiscount && appliedPromo
              ? (appliedPromo.target === 'guild'
                ? { borderColor: 'rgba(245,158,11,0.5)', boxShadow: '0 0 15px rgba(245,158,11,0.15)' }
                : { borderColor: 'var(--border-accent)', boxShadow: '0 0 15px var(--accent-glow)' })
              : {};

            return (
              <div
                key={acc.id}
                className={`group relative backdrop-blur-md rounded-3xl overflow-hidden transition-all flex flex-col shadow-xl hover:-translate-y-1 border ${acc.status === 'sold' ? 'opacity-80 grayscale hover:grayscale-0' : ''}`}
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)', ...promoStyle }}
                onMouseEnter={e => !hasActiveDiscount && (e.currentTarget.style.borderColor = 'var(--border-accent)')}
                onMouseLeave={e => !hasActiveDiscount && (e.currentTarget.style.borderColor = 'var(--border-default)')}
              >
                {/* Декоративні вогні */}
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[50px] pointer-events-none z-0" style={{ background: 'var(--accent-glow)' }} />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full blur-[50px] pointer-events-none z-0" style={{ background: 'rgba(245,158,11,0.1)' }} />

                {/* ФОТО */}
                <div className="relative aspect-video overflow-hidden flex items-center justify-center z-10" style={{ background: 'var(--bg-base)' }}>
                  {acc.images && acc.images.length > 0 ? (
                    <img src={getImageUrl(acc.images[0])} alt={acc.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <ImageIcon className="w-12 h-12" style={{ color: 'var(--border-default)' }} />
                  )}

                  {/* Кнопки порівняння та вішліст */}
                  <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCompare(acc); }}
                      className="p-2.5 rounded-full backdrop-blur-md transition-all duration-300 shadow-lg"
                      style={isInCompare(acc.id)
                        ? { background: 'var(--gold)', color: '#0d1117', transform: 'scale(1.05)', boxShadow: '0 0 15px rgba(245,158,11,0.5)' }
                        : { background: 'rgba(0,0,0,0.6)', color: 'var(--text-secondary)' }
                      }
                      title={isInCompare(acc.id) ? 'Видалити з порівняння' : 'Додати в порівняння'}
                    >
                      <Scale className="w-5 h-5" />
                    </button>

                    <button
                      onClick={() => handleWishlistClick(acc)}
                      className="p-2.5 rounded-full backdrop-blur-md transition-all duration-300 shadow-lg"
                      style={isLiked
                        ? { background: 'var(--accent)', color: 'white' }
                        : { background: 'rgba(0,0,0,0.6)', color: 'white' }
                      }
                      title={isLiked ? t('accounts.removeFromWishlist') : t('accounts.addToWishlist')}
                    >
                      <Heart className={`w-5 h-5 ${isLiked ? 'fill-white' : ''}`} />
                    </button>
                  </div>

                  {/* Бейджі зліва */}
                  <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-20">
                    <span
                      className="px-3 py-1.5 text-xs font-black rounded-full shadow-lg backdrop-blur-md tracking-wider w-max border"
                      style={{
                        background: 'rgba(0,0,0,0.75)',
                        borderColor: 'var(--border-default)',
                        color: 'var(--gold)',
                      }}
                    >
                      ID: #{acc.id}
                    </span>
                    {hasActiveDiscount && appliedPromo && (
                      <span
                        className="flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-black tracking-wider rounded-full shadow-lg backdrop-blur-md w-max border"
                        style={appliedPromo.target === 'guild'
                          ? { background: 'rgba(0,0,0,0.75)', borderColor: 'rgba(245,158,11,0.5)', color: 'var(--gold)' }
                          : { background: 'rgba(0,0,0,0.75)', borderColor: 'rgba(239,68,68,0.5)', color: '#f87171' }
                        }
                      >
                        <Ticket className="w-3 h-3" />
                        <span>
                          {appliedPromo.target === 'guild' 
                            ? 'Для Своїх' 
                            : appliedPromo.type === 'percent' 
                              ? `-${appliedPromo.value}%` 
                              : appliedPromo.type === 'fixed' 
                                ? `-$${appliedPromo.value}` 
                                : 'Знижка'
                          }
                        </span>
                      </span>
                    )}
                  </div>

                  {acc.status === 'sold' && (
                    <div className="absolute inset-0 flex items-center justify-center z-30 backdrop-blur-[2px]" style={{ background: 'rgba(0,0,0,0.55)' }}>
                      <div
                        className="px-6 py-2 border-4 text-3xl font-black uppercase tracking-widest rotate-[-15deg] rounded-xl"
                        style={{
                          borderColor: 'var(--accent)',
                          color: 'var(--text-accent)',
                          background: 'rgba(0,0,0,0.85)',
                          boxShadow: '0 0 20px var(--accent-glow)',
                        }}
                      >
                        {t('accounts.status.sold')}
                      </div>
                    </div>
                  )}
                </div>

                {/* ІНФОРМАЦІЯ */}
                <div className="p-6 flex flex-col flex-1 relative z-10">
                  <h3 className="text-xl font-black mb-3 line-clamp-1 drop-shadow-md" style={{ color: 'var(--text-primary)' }}>{acc.title}</h3>
                  <p className="text-sm mb-4 line-clamp-2 font-medium" style={{ color: 'var(--text-secondary)' }}>{acc.shortDesc}</p>

                  {/* Теги */}
                  <div className="flex flex-wrap gap-2 mb-6 mt-auto">
                    {acc.tags && acc.tags.map(tag => (
                      tag.trim() !== '' && (
                        <span
                          key={tag}
                          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg shadow-sm border"
                          style={{
                            background: 'var(--bg-base)',
                            borderColor: 'var(--border-default)',
                            color: 'var(--gold)',
                          }}
                        >
                          <Tag className="w-3 h-3" style={{ color: 'var(--text-accent)' }} /> {tag.trim()}
                        </span>
                      )
                    ))}
                  </div>

                  {/* Ціна + кнопка */}
                  <div className="flex items-center justify-between pt-5 border-t" style={{ borderColor: 'var(--border-default)' }}>
                    <div>
                      {hasActiveDiscount && appliedPromo && discountedPrice < iPrice ? (
                        <div className="flex flex-col">
                          <span className="text-xs line-through font-bold" style={{ color: 'var(--text-secondary)' }}>${iPrice.toFixed(2)}</span>
                          <span
                            className="text-2xl font-black"
                            style={appliedPromo.target === 'guild' ? { color: 'var(--gold)' } : { color: 'var(--text-accent)' }}
                          >
                            ${discountedPrice.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <div className="text-2xl font-black drop-shadow-md" style={{ color: 'var(--text-primary)' }}>
                          ${iPrice.toFixed(2)}
                        </div>
                      )}
                    </div>

                    {acc.status === 'active' ? (
                      <Link
                        to={`/accounts/${acc.id}`}
                        className="px-6 py-3 text-white text-sm font-black uppercase tracking-wider rounded-xl shadow-lg transition-all hover:scale-105"
                        style={hasActiveDiscount && appliedPromo
                          ? (appliedPromo.target === 'guild'
                            ? { background: 'var(--gold)', color: '#0d1117', boxShadow: '0 0 15px rgba(245,158,11,0.3)' }
                            : { background: 'var(--accent)', boxShadow: '0 0 15px var(--accent-glow)' })
                          : { background: 'var(--bg-card-hover)', border: '1px solid var(--border-default)' }
                        }
                        onMouseEnter={e => !(hasActiveDiscount && appliedPromo) && (e.currentTarget.style.background = 'var(--accent)', e.currentTarget.style.borderColor = 'var(--border-accent)')}
                        onMouseLeave={e => !(hasActiveDiscount && appliedPromo) && (e.currentTarget.style.background = 'var(--bg-card-hover)', e.currentTarget.style.borderColor = 'var(--border-default)')}
                      >
                        {t('accounts.details')}
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="px-6 py-3 text-sm font-black uppercase tracking-wider rounded-xl cursor-not-allowed border"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
                      >
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

      {/* ПЛАВАЮЧА ПАНЕЛЬ ПОРІВНЯННЯ */}
      {compareList && compareList.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div
            className="px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-4 border"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'rgba(245,158,11,0.4)',
            }}
          >
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 animate-pulse" style={{ color: 'var(--gold)' }} />
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                В порівнянні: <strong style={{ color: 'var(--gold)' }}>{compareList.length}</strong> {compareList.length === 1 ? 'акаунт' : 'акаунти'}
              </span>
            </div>
            <Link
              to="/compare"
              className="px-4 py-2 rounded-xl text-xs font-black transition-all shadow-lg hover:scale-105 whitespace-nowrap"
              style={{ background: 'var(--gold)', color: '#0d1117' }}
            >
              Порівняти →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;