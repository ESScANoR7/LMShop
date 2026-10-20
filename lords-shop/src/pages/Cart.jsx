import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { PriceDisplay } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import { Trash2, ShoppingCart, ShieldAlert, Ticket, X, CheckCircle2, Gift, Percent, BadgeDollarSign, Coins, Moon, MessageCircle, ArrowRight, Shield, Gem, PackageOpen, Sparkles } from 'lucide-react';
import { getImageUrl } from '../config/api'; 
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiGet, apiPost, handleApiError } from '../config/apiClient';
import { API_ENDPOINTS, getFullUrl } from '../config/api';
import { useTranslation } from 'react-i18next';

const Cart = () => {
  const { t, i18n } = useTranslation(); 
  
  const { 
    cart, removeFromCart, clearCart, 
    calculatePendingCashback,
    appliedPromo, applyPromo, removePromo 
  } = useCart();
  
  const { user, isLoggedIn, updateBalance } = useAuth(); 
  const navigate = useNavigate();

  const renderItemIcon = (item) => {
    const type = (item.type || '').toLowerCase();
    const img = item.product?.images?.[0] || item.product?.image;

    if (type === 'account' || type === 'acc') {
      if (img) {
        return (
          <img
            src={getImageUrl(img)}
            alt=""
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover border border-amber-500/40 shadow-md flex-shrink-0"
          />
        );
      }
      return (
        <img
          src="/icons/account.jpg"
          alt="Account"
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover border border-amber-500/40 shadow-md flex-shrink-0"
        />
      );
    }
    if (type === 'gems' || type === 'gem') {
      return (
        <img
          src="/icons/gems.jpg"
          alt="Gems"
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover border border-purple-500/40 shadow-md flex-shrink-0"
        />
      );
    }
    if (type === 'rss' || type === 'resources') {
      return (
        <img
          src="/icons/rss.jpg"
          alt="RSS"
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover border border-amber-500/40 shadow-md flex-shrink-0"
        />
      );
    }
    return (
      <img
        src="/icons/coins.jpg"
        alt="Coins"
        className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover border border-yellow-500/40 shadow-md flex-shrink-0"
      />
    );
  };

  const [paymentMethod, setPaymentMethod] = useState('p2p');
  const [promoInput, setPromoInput] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  const [storeStatus, setStoreStatus] = useState({ is_offline: false, offline_categories: [], offline_message: '' });

  const [localSubtotal, setLocalSubtotal] = useState(0);
  const [localDiscount, setLocalDiscount] = useState(0);
  const [localTotal, setLocalTotal] = useState(0);
  const [localProfit, setLocalProfit] = useState(0);

  useEffect(() => {
    let sub = 0;
    let disc = 0;
    let baseTotal = 0;

    cart.forEach(item => {
      const iPrice = parseFloat(item.price || 0);
      const iBase = parseFloat(item.product?.base_price || item.base_price || iPrice);
      
      sub += iPrice;
      baseTotal += iBase;

      if (appliedPromo) {
        const getPrefix = (type) => {
          if (type === 'account' || type === 'acc') return 'acc_';
          if (type === 'rss' || type === 'resources') return 'rss_';
          if (type === 'gems' || type === 'gem') return 'gem_';
          if (type === 'special' || type === 'other') return 'oth_';
          return '';
        };
        const prefix = getPrefix(item.type);
        const itemIdStr = `${prefix}${item.product?.id || item.id}`;
        
        const pTarget = (appliedPromo.target || 'all').toLowerCase();
        let isEligible = false;

        if (pTarget === 'all') {
          isEligible = true;
        } else if (pTarget === 'rss' && (item.type === 'rss' || item.type === 'resources')) {
          isEligible = true;
        } else if (pTarget === 'gems' && (item.type === 'gems' || item.type === 'gem')) {
          isEligible = true;
        } else if (pTarget === 'accounts' && (item.type === 'account' || item.type === 'acc')) {
          isEligible = true;
        } else if (pTarget === 'other' && (item.type === 'special' || item.type === 'other')) {
          isEligible = true;
        } else if (pTarget === 'specific' || (appliedPromo.target_items && appliedPromo.target_items.length > 0)) {
          isEligible = appliedPromo.target_items?.includes(itemIdStr);
        }

        if (appliedPromo.target === 'guild') {
          disc += (iPrice - iBase);
        } else if (isEligible) {
          if (appliedPromo.type === 'percent') {
            const pct = Math.min(100, Math.max(0, parseFloat(appliedPromo.value) || 0));
            disc += iPrice * (pct / 100);
          } else if (appliedPromo.type === 'fixed') {
            if (pTarget !== 'all') {
              disc += Math.min(iPrice, parseFloat(appliedPromo.value) || 0);
            }
          }
        }
      }
    });

    if (appliedPromo && appliedPromo.type === 'fixed' && (appliedPromo.target === 'all' || !appliedPromo.target) && (!appliedPromo.target_items || appliedPromo.target_items.length === 0)) {
      disc = parseFloat(appliedPromo.value) || 0;
    }

    if (disc > sub) disc = sub;

    setLocalSubtotal(sub);
    setLocalDiscount(disc);
    setLocalTotal(sub - disc);
    setLocalProfit((sub - disc) - baseTotal);
  }, [cart, appliedPromo]);

  const hasAccountInCart = cart.some(item => item.type === 'account');
  const isTopupCart = cart.some(item => item.type === 'topup');

  // Автоматичний вибір оплати з балансу, якщо коштів достатньо
  useEffect(() => {
    if (isLoggedIn && user && user.balance >= localTotal && localTotal > 0 && !hasAccountInCart && !isTopupCart) {
      setPaymentMethod('balance');
    } else {
      setPaymentMethod('p2p');
    }
  }, [hasAccountInCart, isTopupCart, isLoggedIn, user, localTotal]);

  useEffect(() => {
    const fetchStoreStatus = async () => {
      try {
        const data = await apiGet(getFullUrl('/api/store/status'));
        setStoreStatus(data);
      } catch (e) {
        console.error("Не вдалося завантажити статус магазину");
      }
    };
    fetchStoreStatus();
  }, []);

  const checkIsOffline = (itemType) => {
    if (!storeStatus.is_offline) return false;
    const offlineCats = storeStatus.offline_categories || [];
    // Якщо список категорій порожній, але is_offline=true -> глобальний офлайн
    if (offlineCats.length === 0) return true;

    let mappedType = 'other';
    if (itemType === 'rss' || itemType === 'resources') mappedType = 'resources';
    else if (itemType === 'gems' || itemType === 'gem') mappedType = 'gems';
    else if (itemType === 'account' || itemType === 'acc') mappedType = 'account';
    else if (itemType === 'special' || itemType === 'other' || itemType === 'oth') mappedType = 'other';
    else if (itemType === 'topup' || itemType === 'balance' || itemType === 'coins') mappedType = 'topup';

    return offlineCats.includes(mappedType);
  };
  
  const hasOfflineItems = Boolean(
    storeStatus.is_offline && (
      !storeStatus.offline_categories || 
      storeStatus.offline_categories.length === 0 || 
      cart.some(item => checkIsOffline(item.type))
    )
  );

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setIsApplyingPromo(true);
    const codeToApply = promoInput.trim().toUpperCase();

    if (localStorage.getItem(`used_promo_${codeToApply}`)) {
      toast.error(t('cart.promoUsed', 'Ви вже використовували цей промокод!'));
      setIsApplyingPromo(false);
      return;
    }

    try {
      const data = await apiGet(getFullUrl(API_ENDPOINTS.PROMOCODE_VALIDATE(codeToApply)) + `?total=${localSubtotal}`);

      if (data.valid) {
        const pTarget = (data.target || 'all').toLowerCase();
        let hasMatchingItem = true;
        if (pTarget === 'rss') {
          hasMatchingItem = cart.some(it => it.type === 'rss' || it.type === 'resources');
          if (!hasMatchingItem) {
            toast.error(t('cart.promoOnlyRss', 'Цей промокод діє тільки на Паки Ресурсів (RSS). Додайте ресурси у кошик!'));
            setIsApplyingPromo(false);
            return;
          }
        } else if (pTarget === 'gems') {
          hasMatchingItem = cart.some(it => it.type === 'gems' || it.type === 'gem');
          if (!hasMatchingItem) {
            toast.error(t('cart.promoOnlyGems', 'Цей промокод діє тільки на Сапфіри (Gems). Додайте сапфіри у кошик!'));
            setIsApplyingPromo(false);
            return;
          }
        } else if (pTarget === 'accounts') {
          hasMatchingItem = cart.some(it => it.type === 'account' || it.type === 'acc');
          if (!hasMatchingItem) {
            toast.error(t('cart.promoOnlyAccounts', 'Цей промокод діє тільки на Акаунти.'));
            setIsApplyingPromo(false);
            return;
          }
        } else if (pTarget === 'other') {
          hasMatchingItem = cart.some(it => it.type === 'special' || it.type === 'other');
          if (!hasMatchingItem) {
            toast.error(t('cart.promoOnlyOther', 'Цей промокод діє тільки на Послуги.'));
            setIsApplyingPromo(false);
            return;
          }
        }

        applyPromo({ code: codeToApply, ...data });
        toast.success(t('cart.promoSuccess', 'Промокод успішно застосовано!'));
        setPromoInput('');
      } else {
        toast.error(data.message || t('cart.promoInvalid', 'Промокод недійсний'));
      }
    } catch (error) {
      handleApiError(error, t('common.error', 'Сталася помилка'));
    }
    setIsApplyingPromo(false);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    if (hasOfflineItems) {
      toast.error(storeStatus.offline_message || t('cart.storeOffline', '🌙 Створення замовлень тимчасово призупинено в офлайн-режимі!'), { duration: 5000 });
      return;
    }

    if (paymentMethod === 'balance') {
      if (!isLoggedIn || !user) {
        toast.error(t('cart.balanceLoginReq', 'Для оплати з балансу потрібно увійти в акаунт!'));
        return;
      }
      if (user.balance < localTotal) {
        toast.error(t('cart.balanceInsuff', 'Недостатньо монет на балансі!'));
        return;
      }
    }

    const userLang = i18n.language || 'ua';
    const cartForTelegram = cart.map((item, idx) => ({
      ...item,
      ...(idx === 0 ? { _lang: userLang } : {})
    }));
    if (appliedPromo) {
      if (appliedPromo.type === 'item' || appliedPromo.type === 'gift') {
        cartForTelegram.push({
          product: { name: `🎁 ПОДАРУНОК (Промокод: ${appliedPromo.code})` },
          price: '0.00'
        });
      } else if (appliedPromo.target !== 'guild') {
        cartForTelegram.push({
          product: { name: `🏷️ ЗНИЖКА (Промокод: ${appliedPromo.code})` },
          price: `-${localDiscount.toFixed(2)}`
        });
      }
    }

    const backendPaymentMethod = paymentMethod === 'balance' ? 'balance' : 'Оплата в чаті';

    const orderData = {
      cart: cartForTelegram,
      paymentMethod: backendPaymentMethod,
      total: localTotal.toFixed(2),
      profit: localProfit.toFixed(2),
      user_id: user?.id || null,
      promo_code: appliedPromo ? appliedPromo.code : null 
    };

    const toastId = toast.loading(t('cart.sending', 'Відправка замовлення...'));
    try {
      const res = await apiPost(getFullUrl(API_ENDPOINTS.CHECKOUT), orderData);
      const newOrderId = res?.order_id;

      if (paymentMethod === 'balance') {
        updateBalance(user.balance - localTotal);
        toast.success(t('cart.successBalance', { amount: localTotal.toFixed(2) }), { id: toastId });
      } else {
        toast.success(t('cart.successChat', 'Замовлення створено! Переходимо в чат для отримання реквізитів...'), { id: toastId, duration: 4000 });
      }

      if (appliedPromo) localStorage.setItem(`used_promo_${appliedPromo.code}`, 'true');
      
      const newOrderData = newOrderId ? {
        id: newOrderId,
        cart: cartForTelegram,
        paymentMethod: backendPaymentMethod,
        total: localTotal.toFixed(2),
        profit: localProfit.toFixed(2),
        status: paymentMethod === 'balance' ? 'paid_processing' : 'awaiting_payment',
        user_id: user?.id || null,
        created_at: new Date().toISOString()
      } : null;

      if (newOrderData) {
        try {
          sessionStorage.setItem('latest_order', JSON.stringify(newOrderData));
        } catch (e) {}
      }

      clearCart();
      
      navigate(`/profile?tab=orders${newOrderId ? `&order_id=${newOrderId}` : ''}`, {
        state: { 
          newOrderId, 
          optimisticOrder: newOrderData,
          justOrdered: true 
        }
      });
    } catch (error) {
      handleApiError(error, t('cart.checkoutErr', 'Помилка оформлення замовлення'));
      toast.dismiss(toastId);
    }
  };

  const renderPromoDetails = () => {
    if (!appliedPromo) return null;

    let icon, title, description;

    if (appliedPromo.target === 'guild') {
      icon = <ShieldAlert className="w-5 h-5 text-amber-400" />;
      title = `🛡️ ГІЛЬДІЯ: ${appliedPromo.target_names?.[0] || t('cart.priceForGuild', 'Ціна для Своїх')}`;
      description = t('cart.guildPromoDesc', 'Всі товари розраховано за собівартістю (Без націнки сайту).');
    } 
    else if (appliedPromo.type === 'percent') {
      icon = <Percent className="w-5 h-5 text-emerald-400" />;
      title = t('cart.discountPercent', { value: appliedPromo.value });
    } else if (appliedPromo.type === 'fixed') {
      icon = <BadgeDollarSign className="w-5 h-5 text-emerald-400" />;
      title = t('cart.discountFixed', { value: appliedPromo.value });
    } else {
      icon = <Gift className="w-5 h-5 text-emerald-400" />;
      title = t('cart.gift', { value: appliedPromo.value });
    }

    if (appliedPromo.target !== 'guild') {
      if (appliedPromo.target_items && appliedPromo.target_items.length > 0) {
        if (appliedPromo.target_names && appliedPromo.target_names.length > 0) {
          description = t('cart.appliesTo', { items: appliedPromo.target_names.join(', ') });
        } else {
          const targetedNames = cart
            .filter(item => appliedPromo.target_items.includes(item.product.id) || appliedPromo.target_items.includes(String(item.product.id)))
            .map(item => item.product?.name || item.product?.title);
          
          if (targetedNames.length > 0) {
            const uniqueNames = [...new Set(targetedNames)];
            description = t('cart.appliesTo', { items: uniqueNames.join(', ') });
          } else {
            description = t('cart.appliesToEmpty');
          }
        }
      } else if (!description) {
        description = t('cart.appliesToAll');
      }
    }

    return (
      <div 
        className="flex items-start justify-between p-3.5 rounded-2xl relative overflow-hidden border"
        style={{
          background: appliedPromo.target === 'guild' ? 'var(--gold-muted)' : 'rgba(16, 185, 129, 0.1)',
          borderColor: appliedPromo.target === 'guild' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.35)'
        }}
      >
        <div className="flex items-start gap-3 min-w-0 relative z-10">
          <div className="p-2 rounded-xl flex-shrink-0 mt-0.5" style={{ background: 'rgba(0,0,0,0.3)' }}>
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span 
                className="text-xs font-black tracking-wider uppercase px-2 py-0.5 rounded border"
                style={{
                  color: appliedPromo.target === 'guild' ? 'var(--gold)' : '#34d399',
                  borderColor: appliedPromo.target === 'guild' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)',
                  background: 'rgba(0,0,0,0.4)'
                }}
              >
                {appliedPromo.code}
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xs sm:text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{title}</div>
            <div className="text-[11px] mt-1 font-medium leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {description}
            </div>
          </div>
        </div>
        <button 
          onClick={removePromo} 
          className="p-1.5 rounded-lg flex-shrink-0 ml-2 border transition-colors hover:text-red-400"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border-default)',
            color: 'var(--text-secondary)'
          }}
          title={t('cart.removePromo', 'Видалити промокод')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  };

  const pendingCashback = appliedPromo?.target === 'guild' ? "0.00" : calculatePendingCashback(user?.tier);

  return (
    <div className="pb-24 pt-6 max-w-6xl mx-auto px-4 min-h-[80vh]">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--text-accent)' }}>
          {t('cart.title', 'Оформлення замовлення')}
        </h1>
        {cart.length > 0 && (
          <button
            onClick={clearCart}
            className="text-xs font-bold transition-colors flex items-center gap-1 px-3 py-1.5 rounded-lg border hover:text-red-400"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-default)',
              color: 'var(--text-secondary)'
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('cart.remove', 'Очистити')}</span>
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        
        {/* ======================================================== */}
        {/* СПИСОК ТОВАРІВ У КОШИКУ */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-3 sm:space-y-4">
          {cart.length === 0 ? (
            <div 
              className="rounded-3xl p-8 sm:p-12 flex flex-col items-center justify-center text-center h-full min-h-[320px] border shadow-xl backdrop-blur-md"
              style={{
                background: 'var(--bg-card)',
                borderColor: 'var(--border-default)'
              }}
            >
              <div 
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mb-5 border shadow-inner"
                style={{
                  background: 'var(--accent-muted)',
                  borderColor: 'var(--border-accent)',
                  color: 'var(--text-accent)'
                }}
              >
                <ShoppingCart className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>
                {t('cart.empty', 'Кошик порожній')}
              </h2>
              <p className="max-w-md mb-6 text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {t('cart.emptyDesc', 'Додайте товари з каталогу, щоб оформити швидку доставку.')}
              </p>
              <Link 
                to="/accounts" 
                className="px-6 py-3 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg flex items-center gap-2 hover:scale-105 active:scale-95"
                style={{
                  background: 'var(--accent)',
                  color: '#ffffff',
                  boxShadow: '0 0 15px var(--accent-glow)'
                }}
              >
                <span>{t('cart.backToCatalog', 'Перейти до каталогу')}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            cart.map((item) => {
              const getPrefix = (type) => {
                if (type === 'account') return 'acc_';
                if (type === 'rss') return 'rss_';
                if (type === 'gems') return 'gem_';
                if (type === 'special') return 'oth_';
                return '';
              };

              const prefix = getPrefix(item.type);
              const isTargeted = appliedPromo && appliedPromo.target_items && appliedPromo.target_items.includes(`${prefix}${item.product?.id}`);
              const isGlobal = appliedPromo && (!appliedPromo.target_items || appliedPromo.target_items.length === 0);
              
              const hasActiveDiscount = (isTargeted || isGlobal || appliedPromo?.target === 'guild') && appliedPromo;

              const iPrice = parseFloat(item.price || 0);
              const iBase = parseFloat(item.product?.base_price || item.base_price || iPrice);
              let discountedItemPrice = iPrice;

              if (hasActiveDiscount) {
                if (appliedPromo.target === 'guild') {
                  discountedItemPrice = iBase; 
                } else if (appliedPromo.type === 'percent') {
                  discountedItemPrice = iPrice - (iPrice * parseFloat(appliedPromo.value) / 100);
                } else if (appliedPromo.type === 'fixed' && !isGlobal) {
                  discountedItemPrice = Math.max(0, iPrice - parseFloat(appliedPromo.value));
                }
              }

              return (
                <div 
                  key={item.cartId} 
                  className="rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 relative group transition-all border shadow-lg backdrop-blur-md"
                  style={{
                    background: 'var(--bg-card)',
                    borderColor: hasActiveDiscount ? 'rgba(245, 158, 11, 0.4)' : 'var(--border-default)',
                  }}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0 pr-10 sm:pr-0">
                    {renderItemIcon(item)}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-bold break-words" style={{ color: 'var(--text-primary)' }}>
                        {item.product?.name || item.product?.title || t('cart.item', 'Товар')}
                      </h3>
                      
                      {hasActiveDiscount && appliedPromo && (
                        <div 
                          className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 border rounded text-[10px] uppercase font-bold"
                          style={{
                            background: appliedPromo.target === 'guild' ? 'var(--gold-muted)' : 'rgba(16, 185, 129, 0.15)',
                            borderColor: appliedPromo.target === 'guild' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)',
                            color: appliedPromo.target === 'guild' ? 'var(--gold)' : '#34d399'
                          }}
                        >
                          <Ticket className="w-3 h-3" /> 
                          <span>{appliedPromo.target === 'guild' ? t('cart.priceForGuild', 'Ціна для Своїх') : t('cart.discountActive', 'Знижка активна')}</span>
                        </div>
                      )}

                      <div className="mt-1.5 text-[11px] sm:text-xs space-y-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {item.userData?.nickname && (
                          <div>
                            {t('cart.nickname', 'Нікнейм:')} <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{item.userData.nickname}</span>
                          </div>
                        )}
                        {item.userData?.details && (
                          <div className="truncate font-medium" style={{ color: 'var(--text-accent)' }}>
                            {item.userData.details}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Блок ціни та видалення на десктопі */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 shrink-0" style={{ borderColor: 'var(--border-default)' }}>
                    <span className="text-[11px] sm:hidden font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>
                      {t('cart.paymentTitle', 'Ціна:')}
                    </span>
                    <PriceDisplay 
                      price={hasActiveDiscount && appliedPromo && discountedItemPrice < iPrice ? discountedItemPrice : iPrice} 
                      originalPrice={hasActiveDiscount && appliedPromo && discountedItemPrice < iPrice ? iPrice : null}
                    />

                    {/* Кнопка видалення на десктопі */}
                    <button 
                      onClick={() => removeFromCart(item.cartId)} 
                      className="hidden sm:flex p-2 rounded-xl border transition-all hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 shrink-0 items-center justify-center"
                      style={{
                        background: 'var(--bg-base)',
                        borderColor: 'var(--border-default)',
                        color: 'var(--text-secondary)'
                      }}
                      title={t('cart.remove', 'Видалити')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Кнопка видалення на мобільних */}
                  <button 
                    onClick={() => removeFromCart(item.cartId)} 
                    className="sm:hidden absolute top-3 right-3 p-1.5 rounded-lg border transition-colors hover:text-red-400"
                    style={{
                      background: 'var(--bg-base)',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-secondary)'
                    }}
                    title={t('cart.remove', 'Видалити')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* ======================================================== */}
        {/* БОКОВИЙ БЛОК: СПОСІБ ОПЛАТИ ТА ПІДСУМОК */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div 
            className="rounded-3xl p-4 sm:p-6 sticky top-24 border shadow-2xl backdrop-blur-xl"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-default)'
            }}
          >
            {/* Офлайн банер */}
            {hasOfflineItems && (
              <div 
                className="mb-5 rounded-2xl p-3.5 sm:p-4 border flex items-start gap-3"
                style={{
                  background: 'var(--gold-muted)',
                  borderColor: 'rgba(245, 158, 11, 0.4)'
                }}
              >
                <div className="p-2 rounded-xl flex-shrink-0" style={{ background: 'rgba(245, 158, 11, 0.2)' }}>
                  <Moon className="w-5 h-5" style={{ color: 'var(--gold)' }} />
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm mb-1" style={{ color: 'var(--gold)' }}>
                    {t('cart.offlineTitle', 'Увага! Офлайн-режим')}
                  </h3>
                  <p className="text-[11px] sm:text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                    {storeStatus.offline_message}
                  </p>
                  <p className="text-[10px] sm:text-[11px] font-bold mt-1.5" style={{ color: 'var(--gold)' }}>
                    * ⛔ Оформлення замовлень для цих товарів тимчасово на паузі. Ви можете обрати інші позиції або зачекати повернення оператора.
                  </p>
                </div>
              </div>
            )}

            <h2 className="text-base sm:text-lg font-black mb-4 flex items-center justify-between" style={{ color: 'var(--text-primary)' }}>
              <span>{t('cart.paymentMethodTitle', 'Спосіб оплати')}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border" style={{ background: 'var(--bg-base)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                {cart.length} {t('cart.item', 'поз.')}
              </span>
            </h2>
            
            {/* СПОСОБИ ОПЛАТИ — АДАПТОВАНО ДЛЯ БУДЬ-ЯКИХ ЕКРАНІВ */}
            <div className="space-y-2.5 sm:space-y-3 mb-6">
              
              {/* ОПЦІЯ 1: БАЛАНС */}
              {(() => {
                const isBalanceDisabled = !isLoggedIn || !user || user.balance < localTotal || hasAccountInCart || isTopupCart;
                const isBalanceSelected = paymentMethod === 'balance';

                return (
                  <label 
                    className={`flex items-start sm:items-center gap-2.5 sm:gap-3.5 p-3 sm:p-3.5 rounded-2xl border-2 transition-all ${
                      isBalanceDisabled 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'cursor-pointer hover:border-amber-400/60'
                    }`}
                    style={isBalanceSelected ? {
                      background: 'var(--gold-muted)',
                      borderColor: 'var(--gold)',
                      boxShadow: '0 0 15px rgba(245, 158, 11, 0.2)'
                    } : {
                      background: 'var(--bg-base)',
                      borderColor: 'var(--border-default)',
                    }}
                  >
                    <input 
                      type="radio" 
                      name="payment" 
                      value="balance" 
                      disabled={isBalanceDisabled} 
                      checked={isBalanceSelected} 
                      onChange={() => setPaymentMethod('balance')} 
                      className="hidden" 
                    />
                    <div 
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors border mt-0.5 sm:mt-0"
                      style={isBalanceSelected ? {
                        background: 'var(--gold)',
                        borderColor: 'rgba(255,255,255,0.4)',
                        color: '#0d1117'
                      } : {
                        background: 'var(--bg-card)',
                        borderColor: 'var(--border-default)',
                        color: 'var(--gold)'
                      }}
                    >
                      <Coins className="w-5 h-5 sm:w-5 sm:h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div 
                        className="font-bold text-xs sm:text-sm leading-snug break-words"
                        style={{ color: isBalanceSelected ? 'var(--gold)' : 'var(--text-primary)' }}
                      >
                        {t('cart.payFromBalance', 'Оплата з балансу')} <span className="opacity-70 text-[10px] sm:text-xs font-normal">({t('cart.coins', 'Монети')})</span>
                      </div>
                      <div className="text-[10px] sm:text-xs font-medium mt-0.5 flex flex-wrap items-center gap-1 leading-normal" style={{ color: 'var(--text-secondary)' }}>
                        <span>
                          {user ? `${t('cart.available', 'Доступно:')} ${user.balance?.toFixed(2)} USDT` : t('cart.needAuth', 'Потрібна авторизація')}
                        </span>
                        {user && user.balance < localTotal && (
                          <span className="text-red-400 font-bold bg-red-950/40 px-1 rounded">({t('cart.insufficient', 'Недостатньо')})</span>
                        )}
                        {hasAccountInCart && (
                          <span className="text-amber-400 font-bold bg-amber-950/40 px-1 rounded">({t('cart.notForAccounts', 'Не для акаунтів')})</span>
                        )}
                        {isTopupCart && (
                          <span className="text-amber-400 font-bold bg-amber-950/40 px-1 rounded">({t('cart.isTopup', 'Поповнення')})</span>
                        )}
                      </div>
                    </div>
                    {isBalanceSelected && (
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0 ml-1 mt-0.5 sm:mt-0" style={{ color: 'var(--gold)' }} />
                    )}
                  </label>
                );
              })()}

              {/* ОПЦІЯ 2: ПРЯМА ОПЛАТА В ЧАТІ */}
              {(() => {
                const isChatSelected = paymentMethod === 'p2p';

                return (
                  <label 
                    className="flex items-start sm:items-center gap-2.5 sm:gap-3.5 p-3 sm:p-3.5 rounded-2xl border-2 cursor-pointer transition-all hover:border-blue-400/60"
                    style={isChatSelected ? {
                      background: 'var(--accent-muted)',
                      borderColor: 'var(--border-accent)',
                      boxShadow: '0 0 15px var(--accent-glow)'
                    } : {
                      background: 'var(--bg-base)',
                      borderColor: 'var(--border-default)',
                    }}
                  >
                    <input 
                      type="radio" 
                      name="payment" 
                      value="p2p" 
                      checked={isChatSelected} 
                      onChange={() => setPaymentMethod('p2p')} 
                      className="hidden" 
                    />
                    <div 
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors border mt-0.5 sm:mt-0"
                      style={isChatSelected ? {
                        background: 'var(--accent)',
                        borderColor: 'rgba(255,255,255,0.4)',
                        color: '#ffffff'
                      } : {
                        background: 'var(--bg-card)',
                        borderColor: 'var(--border-default)',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      <MessageCircle className="w-5 h-5 sm:w-5 sm:h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div 
                        className="font-bold text-xs sm:text-sm leading-snug break-words"
                        style={{ color: isChatSelected ? 'var(--text-accent)' : 'var(--text-primary)' }}
                      >
                        {t('cart.chatWithAdmin', 'Чат з Адміністратором')}
                      </div>
                      <div className="text-[10px] sm:text-xs font-medium mt-0.5 leading-normal" style={{ color: 'var(--text-secondary)' }}>
                        {t('cart.chatPaymentDesc', 'Пряма оплата (Крипта / Карта) після оформлення.')}
                      </div>
                    </div>
                    {isChatSelected && (
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0 ml-1 mt-0.5 sm:mt-0" style={{ color: 'var(--text-accent)' }} />
                    )}
                  </label>
                );
              })()}
            </div>

            {/* ПРОМОКОД */}
            <div className="mb-5 pt-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
              <h3 className="text-xs sm:text-sm font-bold mb-2.5 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Ticket className="w-4 h-4" style={{ color: 'var(--text-accent)' }} /> 
                <span>{t('cart.promoTitle', 'У вас є промокод?')}</span>
              </h3>
              {!appliedPromo ? (
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <input 
                    type="text" 
                    value={promoInput} 
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())} 
                    placeholder={t('cart.promoPlaceholder', 'Введіть код')} 
                    className="flex-1 min-w-0 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider focus:outline-none transition-colors border shadow-inner"
                    style={{
                      background: 'var(--bg-base)',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)'
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--border-accent)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
                  />
                  <button 
                    onClick={handleApplyPromo} 
                    disabled={isApplyingPromo || !promoInput.trim()} 
                    className="w-full sm:w-auto px-4 py-2 border font-bold text-xs sm:text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                    style={{
                      background: 'var(--bg-card)',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    {t('cart.applyBtn', 'Застосувати')}
                  </button>
                </div>
              ) : renderPromoDetails()}
            </div>

            {/* ПІДСУМОК */}
            <div className="space-y-2.5 mb-5 pt-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
              <div className="flex justify-between items-center text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span>{t('cart.summary', 'Сума товарів:')}</span> 
                <PriceDisplay price={localSubtotal} size="sm" />
              </div>

              {appliedPromo && (
                <div 
                  className="flex justify-between text-xs sm:text-sm font-bold p-2.5 rounded-xl border"
                  style={{
                    background: appliedPromo.target === 'guild' ? 'var(--gold-muted)' : 'rgba(16, 185, 129, 0.12)',
                    borderColor: appliedPromo.target === 'guild' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)',
                    color: appliedPromo.target === 'guild' ? 'var(--gold)' : '#34d399'
                  }}
                >
                  <span>{appliedPromo.target === 'guild' ? t('cart.guildDiscount', 'Гільдійська знижка') : t('cart.savings', 'Економія:')}</span> 
                  <span>{appliedPromo.type === 'item' || appliedPromo.type === 'gift' ? `+ ${appliedPromo.value}` : `-$${localDiscount.toFixed(2)}`}</span>
                </div>
              )}

              <div className="flex justify-between items-baseline text-xl sm:text-2xl font-black pt-3 border-t" style={{ borderColor: 'var(--border-default)' }}>
                <span style={{ color: 'var(--text-primary)' }}>{t('cart.total', 'Разом:')}</span> 
                {paymentMethod === 'balance' ? (
                  <span style={{ color: 'var(--gold)' }} className="text-xl font-black flex items-center gap-1">
                    <Coins className="w-5 h-5 text-amber-400" />
                    {localTotal.toFixed(2)} {t('cart.coins', 'Монет')}
                  </span>
                ) : (
                  <PriceDisplay price={localTotal} size="lg" />
                )}
              </div>
            </div>

            {/* КЕШБЕК: ТІЛЬКИ ПРИ ОПЛАТІ З БАЛАНСУ */}
            {parseFloat(pendingCashback) > 0 && cart.length > 0 && paymentMethod === 'balance' && (
              <div 
                className="border rounded-2xl p-3 sm:p-3.5 mb-4 flex items-center justify-between animate-in fade-in duration-300"
                style={{
                  background: 'var(--gold-muted)',
                  borderColor: 'rgba(245, 158, 11, 0.35)'
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'rgba(245, 158, 11, 0.25)', color: 'var(--gold)' }}>
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                      <span>{t('cart.cashback', 'Кешбек')}</span>
                      {user?.tier_name && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-black uppercase">
                          {user.tier_name}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-medium" style={{ color: 'var(--gold)' }}>
                      {t('cart.cashbackCompletedNotice', 'Буде зараховано після статусу «Виконано»')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base sm:text-lg font-black" style={{ color: 'var(--gold)' }}>+{pendingCashback}</span>
                  <span className="text-[10px] font-bold opacity-80 ml-1" style={{ color: 'var(--gold)' }}>USDT</span>
                </div>
              </div>
            )}

            {/* ПОПЕРЕДЖЕННЯ: ЯКЩО ОБРАНО ОПЛАТУ В ЧАТІ, КЕШБЕК НЕ НАРАХОВУЄТЬСЯ */}
            {parseFloat(pendingCashback) > 0 && cart.length > 0 && paymentMethod !== 'balance' && (
              <div 
                className="border rounded-2xl p-3 sm:p-3.5 mb-4 flex items-start gap-2.5 animate-in fade-in duration-300"
                style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  borderColor: 'rgba(245, 158, 11, 0.3)'
                }}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(245, 158, 11, 0.2)', color: 'var(--gold)' }}>
                  <Coins className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-amber-400 leading-snug">
                    {t('cart.cashbackBalanceOnlyNotice', '⚠️ Кешбек нараховується тільки при оплаті монетами сайту (з балансу)!')}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 leading-normal">
                    {t('cart.cashbackBalanceOnlyDesc', 'Оберіть спосіб «Оплата з балансу», щоб отримати кешбек після виконання замовлення.')}
                    <span className="ml-1.5 font-black text-amber-400">+{pendingCashback} USDT</span>
                  </div>
                </div>
              </div>
            )}

            {/* ГОЛОВНА КНОПКА ЗАМОВЛЕННЯ */}
            <button 
              onClick={handleCheckout} 
              disabled={cart.length === 0 || hasOfflineItems} 
              className="w-full font-black py-3.5 sm:py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-xs sm:text-sm uppercase tracking-wider hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={cart.length === 0 || hasOfflineItems ? {
                background: 'var(--bg-base)',
                borderColor: 'var(--border-default)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-default)'
              } : paymentMethod === 'balance' ? {
                background: 'var(--gold)',
                color: '#0d1117',
                boxShadow: '0 0 20px rgba(245, 158, 11, 0.35)'
              } : {
                background: 'var(--accent)',
                color: '#ffffff',
                boxShadow: '0 0 20px var(--accent-glow)'
              }}
            >
              {cart.length === 0 
                ? t('cart.empty', 'Кошик порожній') 
                : hasOfflineItems
                  ? t('cart.offlineBtn', '🌙 Замовлення тимчасово призупинено (Офлайн)')
                  : paymentMethod === 'balance' 
                    ? t('cart.payBalanceBtn', 'Сплатити з балансу') 
                    : t('cart.createTicketBtn', 'Створити тікет на оплату')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Cart;