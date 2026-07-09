import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Trash2, ShoppingCart, CreditCard, Wallet, Landmark, ShieldAlert, Ticket, X, CheckCircle2, Gift, Percent, BadgeDollarSign, Coins, Moon } from 'lucide-react'; 
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiGet, apiPost, handleApiError } from '../config/apiClient';
import { API_ENDPOINTS, getFullUrl } from '../config/api';
import { useTranslation } from 'react-i18next';

const Cart = () => {
  const { t } = useTranslation(); 
  
  const { 
    cart, removeFromCart, clearCart, 
    calculatePendingCashback,
    appliedPromo, applyPromo, removePromo 
  } = useCart();
  
  const { user, isLoggedIn, updateBalance } = useAuth(); 
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState('crypto');
  const [promoInput, setPromoInput] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  // Стейт для Офлайн-режиму
  const [storeStatus, setStoreStatus] = useState({ is_offline: false, offline_categories: [], offline_message: '' });

  // 🔥 ЛОКАЛЬНА ТА ПРАВИЛЬНА МАТЕМАТИКА КОШИКА 🔥
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
          if (type === 'account') return 'acc_';
          if (type === 'rss') return 'rss_';
          if (type === 'gems') return 'gem_';
          if (type === 'special') return 'oth_';
          return '';
        };
        const prefix = getPrefix(item.type);
        const itemIdStr = `${prefix}${item.product?.id}`;
        
        const isTargeted = appliedPromo.target_items?.includes(itemIdStr);
        const isGlobal = !appliedPromo.target_items || appliedPromo.target_items.length === 0;

        // 🔥 ЯКЩО ПРОМОКОД ДЛЯ ГІЛЬДІЇ - ВІДДАЄМО ЗА СОБІВАРТІСТЮ 🔥
        if (appliedPromo.target === 'guild') {
          disc += (iPrice - iBase);
        } 
        // ЯКЩО ЗВИЧАЙНИЙ ПРОМОКОД
        else if (isTargeted || isGlobal) {
          if (appliedPromo.type === 'percent') {
            disc += iPrice * (parseFloat(appliedPromo.value) / 100);
          } else if (appliedPromo.type === 'fixed' && !isGlobal) {
            disc += parseFloat(appliedPromo.value);
          }
        }
      }
    });

    // Глобальна фіксована знижка на весь кошик
    if (appliedPromo && appliedPromo.type === 'fixed' && (!appliedPromo.target_items || appliedPromo.target_items.length === 0) && appliedPromo.target !== 'guild') {
      disc = parseFloat(appliedPromo.value);
    }

    if (disc > sub) disc = sub;

    setLocalSubtotal(sub);
    setLocalDiscount(disc);
    setLocalTotal(sub - disc);
    setLocalProfit((sub - disc) - baseTotal);
  }, [cart, appliedPromo]);

  const hasAccountInCart = cart.some(item => item.type === 'account');

  // Автоматичний вибір оплати
  useEffect(() => {
    if (isLoggedIn && user && user.balance >= localTotal && localTotal > 0 && !hasAccountInCart) {
      setPaymentMethod('balance');
    } else if (hasAccountInCart) {
      setPaymentMethod('crypto');
    }
  }, [hasAccountInCart, isLoggedIn, user, localTotal]);

  // Завантаження статусу магазину
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
    let mappedType = '';
    if (itemType === 'rss') mappedType = 'resources';
    else if (itemType === 'gems') mappedType = 'gems';
    else if (itemType === 'account') mappedType = 'account';
    else if (itemType === 'special') mappedType = 'other';
    return storeStatus.offline_categories.includes(mappedType);
  };
  
  const hasOfflineItems = cart.some(item => checkIsOffline(item.type));

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setIsApplyingPromo(true);
    const codeToApply = promoInput.trim().toUpperCase();

    if (localStorage.getItem(`used_promo_${codeToApply}`)) {
      toast.error(t('cart.promoUsed'));
      setIsApplyingPromo(false);
      return;
    }

    try {
      const data = await apiGet(getFullUrl(API_ENDPOINTS.PROMOCODE_VALIDATE(codeToApply)) + `?total=${localSubtotal}`);

      if (data.valid) {
        applyPromo({ code: codeToApply, ...data });
        toast.success(t('cart.promoSuccess'));
        setPromoInput('');
      } else {
        toast.error(data.message || t('cart.promoInvalid'));
      }
    } catch (error) {
      handleApiError(error, t('common.error'));
    }
    setIsApplyingPromo(false);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    if (paymentMethod === 'balance') {
      if (!isLoggedIn || !user) {
        toast.error(t('cart.balanceLoginReq'));
        return;
      }
      if (user.balance < localTotal) {
        toast.error(t('cart.balanceInsuff'));
        return;
      }
    }

    const cartForTelegram = [...cart];
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

    // 🔥 ДОДАЄМО PROMO_CODE ДЛЯ БЕКЕНДУ 🔥
    const orderData = {
      cart: cartForTelegram,
      paymentMethod: paymentMethod,
      total: localTotal.toFixed(2),
      profit: localProfit.toFixed(2),
      user_id: user?.id || null,
      promo_code: appliedPromo ? appliedPromo.code : null 
    };

    const toastId = toast.loading(t('cart.sending'));
    try {
      await apiPost(getFullUrl(API_ENDPOINTS.CHECKOUT), orderData);

      if (paymentMethod === 'balance') {
        updateBalance(user.balance - localTotal);
        toast.success(t('cart.successBalance', { amount: localTotal.toFixed(2) }), { id: toastId });
      } else {
        toast.success(t('cart.successCrypto', { method: paymentMethod.toUpperCase() }), { id: toastId });
      }

      if (appliedPromo) localStorage.setItem(`used_promo_${appliedPromo.code}`, 'true');
      clearCart();
      navigate('/profile'); 
    } catch (error) {
      handleApiError(error, t('cart.checkoutErr'));
      toast.dismiss(toastId);
    }
  };

  const renderPromoDetails = () => {
    if (!appliedPromo) return null;

    let icon, title, description;

    // 🔥 ЯКЩО ПРОМОКОД ДЛЯ ГІЛЬДІЇ 🔥
    if (appliedPromo.target === 'guild') {
      icon = <ShieldAlert className="w-5 h-5 text-amber-400" />;
      title = `🛡️ ГІЛЬДІЯ: ${appliedPromo.target_names?.[0] || 'Для своїх'}`;
      description = "Всі товари розраховано за собівартістю (Без націнки сайту).";
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
      <div className={`flex items-start justify-between p-4 ${appliedPromo.target === 'guild' ? 'bg-amber-900/10 border-amber-500/30' : 'bg-emerald-900/10 border-emerald-500/30'} rounded-xl relative overflow-hidden`}>
        <div className={`absolute -right-4 -top-4 w-16 h-16 ${appliedPromo.target === 'guild' ? 'bg-amber-500/10' : 'bg-emerald-500/10'} rounded-full blur-xl`}></div>
        <div className="flex items-start gap-3 min-w-0 relative z-10">
          <div className={`p-2 ${appliedPromo.target === 'guild' ? 'bg-amber-500/20' : 'bg-emerald-500/20'} rounded-lg flex-shrink-0 mt-0.5`}>{icon}</div>
          <div className="truncate">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-sm font-black ${appliedPromo.target === 'guild' ? 'text-amber-400 bg-amber-950/50 border-amber-800/50' : 'text-emerald-400 bg-emerald-950/50 border-emerald-800/50'} tracking-wider uppercase px-2 py-0.5 rounded border`}>
                {appliedPromo.code}
              </span>
              <CheckCircle2 className={`w-4 h-4 ${appliedPromo.target === 'guild' ? 'text-amber-500' : 'text-emerald-500'}`} />
            </div>
            <div className="text-sm font-bold text-white truncate">{title}</div>
            <div className={`text-xs ${appliedPromo.target === 'guild' ? 'text-amber-300/80' : 'text-emerald-300/80'} mt-1 font-medium whitespace-normal`}>{description}</div>
          </div>
        </div>
        <button onClick={removePromo} className="text-slate-500 hover:text-red-400 transition-colors p-2 bg-slate-800/50 rounded-lg hover:bg-slate-800 flex-shrink-0 ml-2 border border-transparent hover:border-red-900/50 relative z-10" title={t('cart.removePromo')}>
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  };

  // 🔥 ОБНУЛЕННЯ КЕШБЕКУ ЯКЩО ГІЛЬДІЯ 🔥
  const pendingCashback = appliedPromo?.target === 'guild' ? "0.00" : calculatePendingCashback();

  return (
    <div className="pb-20 pt-8 max-w-6xl mx-auto px-4 min-h-[80vh]">
      <h1 className="text-3xl font-bold text-white mb-8">{t('cart.title')}</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-4">
          {cart.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
              <ShoppingCart className="w-16 h-16 text-slate-700 mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">{t('cart.empty')}</h2>
              <p className="text-slate-500 mb-6 text-sm">{t('cart.emptyDesc')}</p>
              <Link to="/resources" className="px-6 py-3 bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white font-bold rounded-xl transition-all">
                {t('cart.backToCatalog')}
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
              const isTargeted = appliedPromo && appliedPromo.target_items && appliedPromo.target_items.includes(`${prefix}${item.product.id}`);
              const isGlobal = appliedPromo && (!appliedPromo.target_items || appliedPromo.target_items.length === 0);
              
              // Чи діє знижка на цей конкретний товар
              const hasActiveDiscount = (isTargeted || isGlobal || appliedPromo?.target === 'guild') && appliedPromo;

              // Рахуємо ціну для відображення
              const iPrice = parseFloat(item.price || 0);
              const iBase = parseFloat(item.product?.base_price || item.base_price || iPrice);
              let discountedItemPrice = iPrice;

              if (hasActiveDiscount) {
                if (appliedPromo.target === 'guild') {
                  discountedItemPrice = iBase; // Гільдія = Собівартість
                } else if (appliedPromo.type === 'percent') {
                  discountedItemPrice = iPrice - (iPrice * parseFloat(appliedPromo.value) / 100);
                } else if (appliedPromo.type === 'fixed' && !isGlobal) {
                  discountedItemPrice = Math.max(0, iPrice - parseFloat(appliedPromo.value));
                }
              }

              return (
                <div key={item.cartId} className={`bg-slate-800/50 border ${hasActiveDiscount && appliedPromo ? (appliedPromo.target === 'guild' ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)] bg-amber-900/5' : 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)] bg-emerald-900/5') : 'border-slate-700'} rounded-2xl p-5 flex gap-4 relative group transition-all`}>
                  <div className="w-12 h-12 bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-400 flex-shrink-0">
                    <ShoppingCart className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white truncate">{item.product?.name || item.product?.title || t('cart.item')}</h3>
                    
                    {hasActiveDiscount && appliedPromo && (
                      <div className={`mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 ${appliedPromo.target === 'guild' ? 'bg-amber-900/30 border-amber-500/30 text-amber-400' : 'bg-emerald-900/30 border-emerald-500/30 text-emerald-400'} border rounded text-[10px] uppercase font-bold`}>
                        <Ticket className="w-3 h-3" /> {appliedPromo.target === 'guild' ? 'Ціна для Своїх' : t('cart.discountActive')}
                      </div>
                    )}

                    <div className="mt-2 text-xs text-slate-400 space-y-1">
                      {item.userData?.nickname && <div>{t('cart.nickname')} <span className="text-slate-300">{item.userData.nickname}</span></div>}
                      {item.userData?.details && <div className="text-blue-300 truncate">{item.userData.details}</div>}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end self-center pr-8">
                    {hasActiveDiscount && appliedPromo && discountedItemPrice < iPrice ? (
                       <div className="text-right">
                         <div className="text-sm text-slate-500 line-through">${iPrice.toFixed(2)}</div>
                         <div className={`text-xl font-black ${appliedPromo.target === 'guild' ? 'text-amber-400' : 'text-emerald-400'} whitespace-nowrap`}>
                           ${discountedItemPrice.toFixed(2)}
                         </div>
                       </div>
                    ) : (
                       <div className="text-xl font-black text-white whitespace-nowrap">${iPrice.toFixed(2)}</div>
                    )}
                  </div>

                  <button onClick={() => removeFromCart(item.cartId)} className="absolute top-4 right-4 text-slate-500 hover:text-red-400 transition-colors p-1 bg-slate-900/50 rounded-lg hover:bg-red-950/50" title={t('cart.remove')}>
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="lg:col-span-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sticky top-24">
            
            {/* ПЛАШКА ОФЛАЙН РЕЖИМУ */}
            {hasOfflineItems && (
              <div className="mb-6 bg-gradient-to-r from-amber-900/40 to-orange-900/20 border border-amber-500/50 rounded-2xl p-5 shadow-[0_0_15px_rgba(245,158,11,0.1)] flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
                <div className="bg-amber-500/20 p-2.5 rounded-xl flex-shrink-0">
                  <Moon className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-amber-400 font-bold text-base mb-1">{t('cart.offlineTitle', 'Увага! Офлайн-режим')}</h3>
                  <p className="text-amber-200/80 text-sm leading-relaxed whitespace-pre-wrap">
                    {storeStatus.offline_message}
                  </p>
                  <p className="text-amber-500 text-xs font-bold mt-2">
                    * {t('cart.offlineSubtext', 'Ви можете сплатити замовлення зараз, і воно буде виконане першим у черзі.')}
                  </p>
                </div>
              </div>
            )}

            <h2 className="text-xl font-bold text-white mb-6">{t('cart.paymentTitle')}</h2>
            
            {hasAccountInCart && (
              <div className="mb-6 p-4 bg-amber-900/20 border border-amber-500/30 rounded-xl flex gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <p className="text-xs text-amber-400/90 leading-relaxed">
                  {t('cart.accountWarning')} <strong className="text-amber-400 font-bold">{t('cart.accountWarningBold')}</strong>.
                </p>
              </div>
            )}

            <div className="space-y-2 mb-8">
              {isLoggedIn && user && !hasAccountInCart && (
                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${paymentMethod === 'balance' ? 'bg-amber-900/20 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}>
                  <input type="radio" name="payment" value="balance" checked={paymentMethod === 'balance'} onChange={() => setPaymentMethod('balance')} className="hidden" />
                  <Coins className={`w-5 h-5 ${paymentMethod === 'balance' ? 'text-amber-400' : 'text-slate-500'}`} />
                  <div className="flex-1">
                    <div className={`text-sm font-bold ${paymentMethod === 'balance' ? 'text-amber-400' : 'text-slate-300'}`}>{t('cart.balanceMethod')}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{t('cart.balanceAvailable', { amount: user.balance?.toFixed(2) })}</div>
                  </div>
                  {paymentMethod === 'balance' && <CheckCircle2 className="w-5 h-5 text-amber-500" />}
                </label>
              )}

              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${paymentMethod === 'crypto' ? 'bg-blue-900/20 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                <input type="radio" name="payment" value="crypto" checked={paymentMethod === 'crypto'} onChange={() => setPaymentMethod('crypto')} className="hidden" />
                <Wallet className={`w-5 h-5 ${paymentMethod === 'crypto' ? 'text-blue-400' : 'text-slate-500'}`} />
                <div className="flex-1"><div className="text-sm font-bold">{t('cart.cryptoMethod')}</div></div>
                {paymentMethod === 'crypto' && <CheckCircle2 className="w-5 h-5 text-blue-500" />}
              </label>

              <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${hasAccountInCart ? 'opacity-50 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-600' : paymentMethod === 'card' ? 'bg-blue-900/20 border-blue-500 text-white cursor-pointer' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 cursor-pointer'}`}>
                <input type="radio" name="payment" value="card" disabled={hasAccountInCart} checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} className="hidden" />
                <CreditCard className={`w-5 h-5 ${paymentMethod === 'card' ? 'text-blue-400' : 'text-slate-500'}`} />
                <div className="flex-1"><div className="text-sm font-bold">{t('cart.cardMethod')}</div></div>
                {paymentMethod === 'card' && <CheckCircle2 className="w-5 h-5 text-blue-500" />}
              </label>
            </div>

            <div className="mb-6 pt-6 border-t border-slate-800">
              <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                <Ticket className="w-4 h-4 text-emerald-400" /> {t('cart.promoTitle')}
              </h3>
              {!appliedPromo ? (
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <input type="text" value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())} placeholder={t('cart.promoPlaceholder')} className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm font-bold uppercase tracking-wider focus:border-emerald-500 outline-none transition-colors placeholder:text-slate-500" />
                  <button onClick={handleApplyPromo} disabled={isApplyingPromo || !promoInput.trim()} className="w-full sm:w-auto whitespace-nowrap flex-shrink-0 px-4 py-2.5 bg-slate-800 hover:bg-emerald-600 border border-slate-700 hover:border-emerald-500 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {t('cart.applyBtn')}
                  </button>
                </div>
              ) : renderPromoDetails()}
            </div>

            <div className="space-y-3 mb-6 pt-4 border-t border-slate-800">
              <div className="flex justify-between text-sm text-slate-400">
                <span>{t('cart.summary')}</span> <span className={appliedPromo ? 'line-through opacity-70' : ''}>${localSubtotal.toFixed(2)}</span>
              </div>
              {appliedPromo && (
                <div className={`flex justify-between text-sm font-bold ${appliedPromo.target === 'guild' ? 'text-amber-400 bg-amber-900/20 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]' : 'text-emerald-400 bg-emerald-900/20 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]'} p-2 rounded-lg border`}>
                  <span>{appliedPromo.target === 'guild' ? 'Гільдійська знижка' : t('cart.savings')}</span> 
                  <span>{appliedPromo.type === 'item' || appliedPromo.type === 'gift' ? `+ ${appliedPromo.value}` : `-$${localDiscount.toFixed(2)}`}</span>
                </div>
              )}
              <div className="flex justify-between text-2xl font-black text-white pt-3 border-t border-slate-800">
                <span>{t('cart.total')}</span> 
                <span className={appliedPromo ? (appliedPromo.target === 'guild' ? 'text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]') : paymentMethod === 'balance' ? 'text-amber-400' : 'text-blue-400'}>
                  {paymentMethod === 'balance' ? `${localTotal.toFixed(2)} ${t('cart.coins')}` : `$${localTotal.toFixed(2)}`}
                </span>
              </div>
            </div>

            {parseFloat(pendingCashback) > 0 && cart.length > 0 && paymentMethod !== 'balance' && (
              <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border border-amber-500/20 rounded-2xl p-4 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-300 font-bold tracking-wider uppercase">{t('cart.cashback')}</div>
                    <div className="text-[10px] text-amber-500/80 font-medium">{user ? t('cart.cashbackAvail') : t('cart.cashbackAuth')}</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-amber-400">+{pendingCashback}</span>
                  <span className="text-[10px] font-bold text-amber-500/70 ml-1">USDT</span>
                </div>
              </div>
            )}

            <button 
              onClick={handleCheckout} 
              disabled={cart.length === 0} 
              className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all ${cart.length === 0 ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : paymentMethod === 'balance' ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 hover:scale-[1.02] active:scale-[0.98]' : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-[1.02] active:scale-[0.98]'}`}
            >
              {cart.length === 0 ? t('cart.empty') : paymentMethod === 'balance' ? t('cart.payBalanceBtn') : t('cart.orderBtn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;