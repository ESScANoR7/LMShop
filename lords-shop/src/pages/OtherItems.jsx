import React, { useState, useEffect } from 'react';
import { ShoppingCart, Star, Info, X, CheckCircle2, Ticket, Heart, Crown, Shield, Zap, Sparkles, Gift, Gem, Flame, Swords } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { PriceDisplay } from '../context/CurrencyContext';
import toast from 'react-hot-toast';
import { apiGet } from '../config/apiClient';
import { API_ENDPOINTS, getFullUrl } from '../config/api';

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

// Колір іконки на основі colorCode
const getIconGradient = (colorCode) => {
  switch (colorCode) {
    case 'orange':  return 'linear-gradient(135deg, #d97706, #92400e)';
    case 'blue':    return 'linear-gradient(135deg, #2563eb, #1e3a8a)';
    case 'green':   return 'linear-gradient(135deg, #059669, #064e3b)';
    case 'purple':  return 'linear-gradient(135deg, #7c3aed, #4c1d95)';
    case 'red':     return 'linear-gradient(135deg, #dc2626, #7f1d1d)';
    default:        return 'linear-gradient(135deg, #52525b, #27272a)';
  }
};

const getOtherItemIcon = (item) => {
  const text = `${item.name || ''} ${item.tag || ''} ${item.desc || ''}`.toLowerCase();
  if (text.includes('буст') || text.includes('boost') || text.includes('швидк') || text.includes('speed')) return <Zap className="w-6 h-6 text-white" />;
  if (text.includes('vip') || text.includes('віп') || text.includes('корон') || text.includes('crown')) return <Crown className="w-6 h-6 text-white" />;
  if (text.includes('щит') || text.includes('shield') || text.includes('захист')) return <Shield className="w-6 h-6 text-white" />;
  if (text.includes('пак') || text.includes('набір') || text.includes('pack') || text.includes('gift')) return <Gift className="w-6 h-6 text-white" />;
  if (text.includes('кристал') || text.includes('сапфір') || text.includes('gem') || text.includes('алмаз')) return <Gem className="w-6 h-6 text-white" />;
  if (text.includes('меч') || text.includes('sword') || text.includes('атака') || text.includes('war')) return <Swords className="w-6 h-6 text-white" />;
  if (text.includes('вогонь') || text.includes('fire') || text.includes('hot') || text.includes('топ')) return <Flame className="w-6 h-6 text-white" />;
  return <Sparkles className="w-6 h-6 text-white" />;
};

const OtherItems = () => {
  const { t } = useTranslation();

  const { addToCart, appliedPromo } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({});

  const [specialItems, setSpecialItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const data = await apiGet(getFullUrl(API_ENDPOINTS.OTHER_ITEMS));
        if (Array.isArray(data)) setSpecialItems(data);
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
    (item.requiredFields || []).forEach(field => { initialForm[field] = ''; });
    setFormData(initialForm);
  };

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleSubmitOrder = (e) => {
    e.preventDefault();
    let extractedNickname = '', extractedGuild = '', extractedCoords = '';
    let otherDetails = [];
    Object.entries(formData).forEach(([key, value]) => {
      const lk = key.toLowerCase();
      if (lk.includes('нікнейм') || lk.includes('nickname') || lk.includes('нік')) extractedNickname = value;
      else if (lk.includes('гільдія') || lk.includes('guild') || lk.includes('тег')) extractedGuild = value;
      else if (lk.includes('координати') || lk.includes('k:')) extractedCoords = value;
      else otherDetails.push(`${key}: ${value}`);
    });
    addToCart({
      product: selectedItem,
      type: 'special',
      price: selectedItem.price,
      userData: {
        nickname: extractedNickname,
        guild: extractedGuild,
        coordinates: extractedCoords,
        details: otherDetails.join(' | '),
      },
    });
    setSelectedItem(null);
    toast.success(`${selectedItem.name} ${t('special_page.addedSuccess')}`);
  };

  const handleWishlistClick = (item) => {
    toggleWishlist({ id: item.id, name: item.name, desc: item.desc, price: item.price, type: 'special', color: item.color });
  };

  if (isLoading) {
    return (
      <div className="text-center py-32 text-xl font-bold animate-pulse" style={{ color: 'var(--text-secondary)' }}>
        {t('special_page.loading')}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12 pb-20 pt-8 max-w-6xl mx-auto px-4">

      {/* Заголовок */}
      <header className="text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter leading-tight" style={{ color: 'var(--text-accent)' }}>
          {t('special_page.title')}
        </h1>
        <p className="max-w-xl mx-auto font-medium" style={{ color: 'var(--text-secondary)' }}>
          {t('special_page.subtitle')}
        </p>
      </header>

      {specialItems.length === 0 ? (
        <div className="text-center py-10 font-medium" style={{ color: 'var(--text-secondary)' }}>
          {t('special_page.noItems')}
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
          {specialItems.map((item) => {
            const hasActiveDiscount = isPromoApplicable(appliedPromo, 'special', item.id) && appliedPromo;
            const isLiked = isInWishlist(item.id, 'special');
            const iPrice = parseFloat(item.price || 0);
            const iBase = parseFloat(item.base_price || iPrice);
            let discountedPrice = iPrice;

            if (hasActiveDiscount) {
              if (appliedPromo.target === 'guild') discountedPrice = iBase;
              else if (appliedPromo.type === 'percent') discountedPrice = iPrice - (iPrice * parseFloat(appliedPromo.value) / 100);
              else if (appliedPromo.type === 'fixed' && appliedPromo.target_items?.length > 0) discountedPrice = Math.max(0, iPrice - parseFloat(appliedPromo.value));
            }

            return (
              <article
                key={item.id}
                className="relative overflow-hidden backdrop-blur-md rounded-3xl p-6 transition-all flex flex-col justify-between shadow-xl group border"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
              >
                {/* Декоративні вогні */}
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[50px] pointer-events-none" style={{ background: 'var(--accent-glow)' }} />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full blur-[50px] pointer-events-none" style={{ background: 'rgba(245,158,11,0.12)' }} />

                <div className="relative z-10 flex flex-col flex-1">
                  {/* Тег товару */}
                  {item.tag && (
                    <div
                      className="absolute top-0 right-0 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-bl-2xl shadow-lg z-20 backdrop-blur-md"
                      style={{ background: 'var(--accent)' }}
                    >
                      {item.tag}
                    </div>
                  )}

                  {/* Маленька стрічка / бейдж знижки промокоду */}
                  {hasActiveDiscount && (
                    <div
                      className="absolute top-0 left-0 border-b border-r text-[11px] font-black tracking-wider px-2.5 py-1 rounded-br-2xl flex items-center gap-1 z-20 backdrop-blur-md shadow-sm"
                      style={appliedPromo.target === 'guild'
                        ? { background: 'rgba(245,158,11,0.2)', borderColor: 'rgba(245,158,11,0.5)', color: 'var(--gold)' }
                        : { background: 'rgba(239,68,68,0.2)', borderColor: 'rgba(239,68,68,0.5)', color: '#f87171' }
                      }
                    >
                      <Ticket className="w-3 h-3" />
                      <span>
                        {appliedPromo.target === 'guild' 
                          ? 'Свої' 
                          : appliedPromo.type === 'percent' 
                            ? `-${appliedPromo.value}%` 
                            : appliedPromo.type === 'fixed' 
                              ? `-$${appliedPromo.value}` 
                              : 'Знижка'
                        }
                      </span>
                    </div>
                  )}

                  {/* Кнопка вішліст праворуч вгорі */}
                  <button
                    onClick={() => handleWishlistClick(item)}
                    className={`absolute ${item.tag ? 'top-8' : 'top-3'} right-3 z-30 p-2.5 rounded-full border transition-all hover:scale-110 active:scale-95`}
                    style={{
                      background: 'rgba(0,0,0,0.6)',
                      borderColor: 'var(--border-default)',
                      color: isLiked ? 'var(--text-accent)' : 'var(--text-secondary)',
                    }}
                    title={isLiked ? t('special_page.removeFromWishlist') : t('special_page.addToWishlist')}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                  </button>

                  {/* Іконка + назва */}
                  <div className="mb-4 mt-8 flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-2xl border flex items-center justify-center flex-shrink-0 shadow-lg"
                      style={{
                        background: getIconGradient(item.color),
                        borderColor: 'var(--border-default)',
                      }}
                    >
                      {getOtherItemIcon(item)}
                    </div>
                    <div>
                      <h3
                        className="text-xl font-bold transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-primary)'}
                      >
                        {item.name}
                      </h3>
                      <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.desc}</p>
                    </div>
                  </div>
                </div>

                {/* Ціна + кнопка */}
                <div
                  className="relative z-10 pt-4 border-t flex items-center justify-between mt-auto"
                  style={{ borderColor: 'var(--border-default)' }}
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider block mb-0.5" style={{ color: 'var(--text-secondary)' }}>Ціна</span>
                    <PriceDisplay 
                      price={discountedPrice} 
                      originalPrice={hasActiveDiscount && discountedPrice < iPrice ? iPrice : null}
                      size="lg"
                    />
                  </div>

                  <button
                    onClick={() => handleOpenModal(item)}
                    className="px-5 py-2.5 text-white font-bold text-sm rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                    style={{
                      background: 'var(--accent)',
                      boxShadow: '0 0 15px var(--accent-glow)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>{t('special_page.buy')}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Модалка замовлення */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 backdrop-blur-sm"
            style={{ background: 'rgba(0,0,0,0.75)' }}
            onClick={() => setSelectedItem(null)}
          />

          <div
            className="relative w-full max-w-md rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 duration-200 border"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
          >
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-accent)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-black mb-2 pr-8" style={{ color: 'var(--text-primary)' }}>
              {t('special_page.modalTitle')}
            </h2>
            <p className="text-sm font-bold mb-6" style={{ color: 'var(--gold)' }}>
              {selectedItem.name} — ${selectedItem.price}
            </p>

            <form onSubmit={handleSubmitOrder} className="space-y-4">
              {selectedItem.requiredFields?.map((field, index) => (
                <div key={index}>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                    {field}
                  </label>
                  <input
                    required
                    value={formData[field] || ''}
                    onChange={(e) => handleInputChange(field, e.target.value)}
                    placeholder={`${t('special_page.enterPrefix')} ${field.toLowerCase()}`}
                    className="w-full rounded-xl px-4 py-3.5 focus:outline-none transition-colors shadow-inner"
                    style={{
                      background: 'var(--bg-base)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)',
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--border-accent)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
                  />
                </div>
              ))}

              <div
                className="p-4 rounded-xl flex gap-3 mt-6 shadow-inner border"
                style={{ background: 'var(--accent-muted)', borderColor: 'var(--border-accent)' }}
              >
                <Info className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--text-accent)' }} />
                <p className="text-xs font-medium leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {t('special_page.modalInfo')}
                </p>
              </div>

              <button
                type="submit"
                className="w-full text-white font-black py-4 rounded-xl mt-4 flex items-center justify-center gap-2 hover:scale-[1.02] transition-all"
                style={{
                  background: 'var(--accent)',
                  boxShadow: '0 0 20px var(--accent-glow)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
              >
                <CheckCircle2 className="w-5 h-5" /> {t('special_page.addToCartBtn')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OtherItems;
