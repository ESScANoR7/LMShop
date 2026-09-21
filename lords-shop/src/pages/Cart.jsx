import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Trash2, ShoppingCart, ShieldAlert, Ticket, X, CheckCircle2, Gift, Percent, BadgeDollarSign, Coins, Moon, MessageCircle } from 'lucide-react'; 
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

  // 🔥 Замість 'crypto' тепер використовуємо універсальний 'p2p' (ручна оплата)
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

        if (appliedPromo.target === 'guild') {
          disc += (iPrice - iBase);
        } 
        else if (isTargeted || isGlobal) {
          if (appliedPromo.type === 'percent') {
            disc += iPrice * (parseFloat(appliedPromo.value) / 100);
          } else if (appliedPromo.type === 'fixed' && !isGlobal) {
            disc += parseFloat(appliedPromo.value);
          }
        }
      }
    });

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
  const isTopupCart = cart.some(item => item.type === 'topup');

  // 🔥 ОНОВЛЕНА АВТОВИБІРКА ОПЛАТИ 🔥
  useEffect(() => {
    // Якщо юзер має достатньо грошей, і це не акаунт, і не поповнення балансу
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

    // Відправляємо зрозумілу назву методу в базу даних (замість p2p відправимо Ручна Оплата)
    const backendPaymentMethod = paymentMethod === 'balance' ? 'balance' : 'Оплата в чаті';

    const orderData = {
      cart: cartForTelegram,
      paymentMethod: backendPaymentMethod,
      total: localTotal.toFixed(2),
      profit: localProfit.toFixed(2),
      user_id: user?.id || null,
      promo_code: appliedPromo ? appliedPromo.code : null 
    };

    const toastId = toast.loading(t('cart.sending'));
    try {
      const response = await apiPost(getFullUrl(API_ENDPOINTS.CHECKOUT), orderData);

      if (paymentMethod === 'balance') {
        updateBalance(user.balance - localTotal);
        toast.success(t('cart.successBalance', { amount: localTotal.toFixed(2) }), { id: toastId });
      } else {
        toast.success('Замовлення створено! Переходимо в чат для отримання реквізитів...', { id: toastId, duration: 4000 });
      }

      if (appliedPromo) localStorage.setItem(`used_promo_${appliedPromo.code}`, 'true');
      clearCart();
      
      navigate('/profile?tab=orders'); 
    } catch (error) {
      handleApiError(error, t('cart.checkoutErr'));
      toast.dismiss(toastId);
    }
  };

  const renderPromoDetails = () => {
    if (!appliedPromo) return null;

    let icon, title, description;

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

  const pendingCashback = appliedPromo?.target === 'guild' ? "0.00" : calculatePendingCashback();

  return (
    <div className="pb-20 pt-8 max-w-6xl mx-auto px-4 min-h-[80vh]">
      <h1 className="text-3xl font-bold text-white mb-8">{t('cart.title', 'Оформлення замовлення')}</h1>
      
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

            <h2 className="text-xl font-bold text-white mb-6">Спосіб оплати</h2>
            
            <div className="space-y-3 mb-8">
              
              {/* 🔥 ОПЦІЯ 1: БАЛАНС 🔥 */}
              <label className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                (!isLoggedIn || !user || user.balance < localTotal || hasAccountInCart || isTopupCart) 
                  ? 'opacity-50 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-600' 
                  : paymentMethod === 'balance' 
                    ? 'bg-amber-900/20 border-amber-500 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.15)]' 
                    : 'bg-slate-800 border-slate-700 hover:border-slate-500 cursor-pointer'
              }`}>
                <input 
                  type="radio" 
                  name="payment" 
                  value="balance" 
                  disabled={!isLoggedIn || !user || user.balance < localTotal || hasAccountInCart || isTopupCart} 
                  checked={paymentMethod === 'balance'} 
                  onChange={() => setPaymentMethod('balance')} 
                  className="hidden" 
                />
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors border ${paymentMethod === 'balance' ? 'bg-amber-500 border-amber-400 text-slate-900 shadow-lg' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                  <Coins className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-black text-base truncate ${paymentMethod === 'balance' ? 'text-amber-400' : 'text-slate-300'}`}>
                    Оплата з балансу (Монети)
                  </div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">
                    {user ? `Доступно: ${user.balance?.toFixed(2)} USDT` : 'Потрібна авторизація'}
                    {user && user.balance < localTotal && <span className="text-red-400 ml-1">(Недостатньо)</span>}
                    {hasAccountInCart && <span className="text-amber-500/80 ml-1">(Не для акаунтів)</span>}
                    {isTopupCart && <span className="text-amber-500/80 ml-1">(Поповнення)</span>}
                  </div>
                </div>
                {paymentMethod === 'balance' && <CheckCircle2 className="w-6 h-6 text-amber-500 flex-shrink-0 ml-2" />}
              </label>

              {/* 🔥 ОПЦІЯ 2: ПРЯМА ОПЛАТА В ЧАТІ 🔥 */}
              <label className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                paymentMethod === 'p2p' 
                  ? 'bg-blue-900/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
                  : 'bg-slate-800 border-slate-700 hover:border-slate-500'
              }`}>
                <input 
                  type="radio" 
                  name="payment" 
                  value="p2p" 
                  checked={paymentMethod === 'p2p'} 
                  onChange={() => setPaymentMethod('p2p')} 
                  className="hidden" 
                />
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors border ${paymentMethod === 'p2p' ? 'bg-blue-500 border-blue-400 text-white shadow-lg' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-black text-base truncate ${paymentMethod === 'p2p' ? 'text-white' : 'text-slate-300'}`}>
                    Чат з Адміністратором
                  </div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                    Пряма оплата (Крипта / Карта) після оформлення.
                  </div>
                </div>
                {paymentMethod === 'p2p' && <CheckCircle2 className="w-6 h-6 text-blue-500 flex-shrink-0 ml-2" />}
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
              className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                cart.length === 0 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : paymentMethod === 'balance' 
                    ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 hover:scale-[1.02] active:scale-[0.98]' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {cart.length === 0 
                ? t('cart.empty') 
                : paymentMethod === 'balance' 
                  ? 'Сплатити з балансу' 
                  : 'Створити тікет на оплату'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;