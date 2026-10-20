import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Gem, PackageOpen, Info, Ticket, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import OrderModal from '../components/OrderModal';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { PriceDisplay } from '../context/CurrencyContext';
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

// Стилі картки залежно від промо
const getCardStyle = (hasActiveDiscount, appliedPromo) => {
  if (!hasActiveDiscount) return {};
  if (appliedPromo?.target === 'guild') {
    return { borderColor: 'rgba(245,158,11,0.5)', boxShadow: '0 0 15px rgba(245,158,11,0.15)' };
  }
  return { borderColor: 'var(--border-accent)', boxShadow: '0 0 15px var(--accent-glow)' };
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
        const [rssData, gemsData] = await Promise.all([
          apiGet(getFullUrl(API_ENDPOINTS.RESOURCES)),
          apiGet(getFullUrl(API_ENDPOINTS.GEMS))
        ]);
        if (Array.isArray(rssData)) setRssList(rssData);
        if (Array.isArray(gemsData)) setGemsList(gemsData);
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
    toggleWishlist({
      id: item.id,
      name: type === 'gems' ? `${t('nav.gems')}: ${item.range}` : item.name,
      desc: type === 'gems' ? `${t('resources_page.mightLabel')} ${item.range}` : item.desc,
      price: type === 'gems' ? item.rate : item.price,
      type,
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-32 text-xl font-bold animate-pulse" style={{ color: 'var(--text-secondary)' }}>
        {t('resources_page.loading')}
      </div>
    );
  }

  // Єдиний рендер картки (RSS або Gems)
  const renderCard = (item, type) => {
    const isGem = type === 'gems';
    const hasActiveDiscount = isPromoApplicable(appliedPromo, type, item.id) && appliedPromo;
    const isLiked = isInWishlist(item.id, type);

    const iPrice = parseFloat(isGem ? item.rate : item.price || 0);
    const iBase = parseFloat(item.base_price || iPrice);
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

    const extraStyle = getCardStyle(hasActiveDiscount, appliedPromo);

    return (
      <article
        key={item.id}
        className="relative overflow-hidden backdrop-blur-md rounded-3xl p-6 transition-all flex flex-col justify-between shadow-xl border"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border-default)',
          ...extraStyle,
        }}
        onMouseEnter={e => !hasActiveDiscount && (e.currentTarget.style.borderColor = 'var(--border-accent)')}
        onMouseLeave={e => !hasActiveDiscount && (e.currentTarget.style.borderColor = 'var(--border-default)')}
      >
        {/* Декоративні вогні по кутах */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[50px] pointer-events-none" style={{ background: 'var(--accent-glow)' }} />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full blur-[50px] pointer-events-none" style={{ background: 'rgba(245,158,11,0.12)' }} />

        {/* Маленька стрічка / бейдж знижки ліворуч вгорі */}
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
          onClick={() => handleWishlistClick(item, type)}
          className="absolute top-3 right-3 p-2 rounded-full transition-all duration-300 z-20 hover:scale-110 active:scale-95 border"
          style={isLiked
            ? { color: 'var(--text-accent)', background: 'var(--accent-muted)', borderColor: 'var(--border-accent)' }
            : { color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.3)', borderColor: 'var(--border-default)' }
          }
          title={isLiked ? t('resources_page.removeFromWishlist') : t('resources_page.addToWishlist')}
        >
          <Heart className={`w-4 h-4 transition-all ${isLiked ? 'fill-current' : ''}`} />
        </button>

        <div className="mt-5 relative z-10">
          {/* Іконка товару */}
          <div className="mb-4">
            {isGem ? (
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-cyan-500/20 to-blue-600/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
                <Gem className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-yellow-600/10 border border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <PackageOpen className="w-6 h-6" />
              </div>
            )}
          </div>

          <div className="flex justify-between items-start mb-4 pr-10">
            {isGem ? (
              <div>
                <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                  {t('resources_page.mightLabel')}
                </div>
                <h3 className="text-2xl font-black drop-shadow-md" style={{ color: 'var(--text-primary)' }}>{item.range}</h3>
              </div>
            ) : (
              <h3 className="text-xl font-bold drop-shadow-md" style={{ color: 'var(--text-primary)' }}>{item.name}</h3>
            )}
          </div>

          {!isGem && (
            <p className="text-sm mb-6 font-medium" style={{ color: 'var(--text-secondary)' }}>{item.desc}</p>
          )}
        </div>

        <div
          className="flex items-center justify-between mt-auto relative z-10 border-t pt-4"
          style={{ borderColor: 'var(--border-default)' }}
        >
          {/* Ціна */}
          <PriceDisplay 
            price={hasActiveDiscount && discountedPrice < iPrice ? discountedPrice : iPrice} 
            originalPrice={hasActiveDiscount && discountedPrice < iPrice ? iPrice : null}
            size="lg"
          />

          {/* Кнопка замовлення */}
          <button
            onClick={() => openOrder(item, type)}
            className="p-3 rounded-2xl transition-all hover:scale-105 outline-none"
            style={hasActiveDiscount
              ? (appliedPromo.target === 'guild'
                ? { background: 'var(--gold)', color: '#0d1117' }
                : { background: 'var(--accent)', color: 'white', boxShadow: '0 0 15px var(--accent-glow)' })
              : { background: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }
            }
            onMouseEnter={e => !hasActiveDiscount && (e.currentTarget.style.background = 'var(--accent)', e.currentTarget.style.color = 'white')}
            onMouseLeave={e => !hasActiveDiscount && (e.currentTarget.style.background = 'var(--bg-card)', e.currentTarget.style.color = 'var(--text-primary)')}
          >
            <ShoppingCart className="w-5 h-5" />
          </button>
        </div>
      </article>
    );
  };

  return (
    <div className="flex flex-col gap-12 pb-20 pt-8 max-w-6xl mx-auto px-4">

      {/* Заголовок */}
      <header className="text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter leading-tight" style={{ color: 'var(--text-accent)' }}>
          {t('resources_page.title')}
        </h1>
        <p className="max-w-xl mx-auto font-medium" style={{ color: 'var(--text-secondary)' }}>
          {t('resources_page.subtitle')}
        </p>
      </header>

      {/* ======================================================= */}
      {/* РЕСУРСИ (RSS) */}
      {/* ======================================================= */}
      <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b" style={{ borderColor: 'var(--border-default)' }}>
          <div
            className="p-2 rounded-xl"
            style={{ background: 'var(--accent-muted)', border: '1px solid var(--border-accent)', color: 'var(--gold)' }}
          >
            <PackageOpen className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>
            {t('resources_page.rssTitle')}
          </h2>
        </div>

        {rssList.length === 0 ? (
          <div className="py-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('resources_page.noRss')}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {rssList.map(pack => renderCard(pack, 'rss'))}
          </div>
        )}
      </section>

      {/* ======================================================= */}
      {/* САМОЦВІТИ (GEMS) */}
      {/* ======================================================= */}
      <section className="mt-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b" style={{ borderColor: 'var(--border-default)' }}>
          <div
            className="p-2 rounded-xl"
            style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: 'var(--gold)' }}
          >
            <Gem className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>
            {t('resources_page.gemsTitle')}
          </h2>

          <div className="ml-auto group relative flex items-center cursor-help">
            <span className="text-xs mr-2 hidden sm:block font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              {t('resources_page.tooltipTitle')}
            </span>
            <Info className="w-5 h-5 transition-colors" style={{ color: 'var(--text-secondary)' }} />
            <div
              className="absolute right-0 bottom-8 w-64 p-4 rounded-xl text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-2xl font-medium"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
              }}
            >
              {t('resources_page.tooltipDesc')}
            </div>
          </div>
        </div>

        {gemsList.length === 0 ? (
          <div className="py-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('resources_page.noGems')}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {gemsList.map(gem => renderCard(gem, 'gems'))}
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