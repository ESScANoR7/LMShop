import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Trash2, ShoppingCart, CreditCard, Wallet, Landmark, ShieldAlert, Ticket, X, CheckCircle2, Gift, Percent, BadgeDollarSign, Coins } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiGet, apiPost, handleApiError } from '../config/apiClient';
import { API_ENDPOINTS, getFullUrl } from '../config/api';
import { useTranslation } from 'react-i18next'; // 🔥 ІМПОРТ ПЕРЕКЛАДУ

const Cart = () => {
  const { t } = useTranslation(); // 🔥 ІНІЦІАЛІЗАЦІЯ ПЕРЕКЛАДУ
  
  const { 
    cart, removeFromCart, clearCart, 
    getSubtotal, getDiscountAmount, getCartTotal, getCartProfit, calculatePendingCashback,
    appliedPromo, applyPromo, removePromo 
  } = useCart();
  
  const { user, isLoggedIn, updateBalance } = useAuth(); 
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState('crypto');
  const [promoInput, setPromoInput] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  const hasAccountInCart = cart.some(item => item.type === 'account');
  const cartTotal = parseFloat(getCartTotal());

  // Автоматично обираємо оплату балансом, якщо в людини є гроші
  useEffect(() => {
    if (isLoggedIn && user && user.balance >= cartTotal && cartTotal > 0 && !hasAccountInCart) {
      setPaymentMethod('balance');
    } else if (hasAccountInCart) {
      setPaymentMethod('crypto');
    }
  }, [hasAccountInCart, isLoggedIn, user, cartTotal]);

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
      const currentSubtotal = getSubtotal();
      const data = await apiGet(getFullUrl(API_ENDPOINTS.PROMOCODE_VALIDATE(codeToApply)) + `?total=${currentSubtotal}`);

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

    // ПЕРЕВІРКА: Якщо обрана оплата з балансу, перевіряємо чи вистачає грошей
    if (paymentMethod === 'balance') {
      if (!isLoggedIn || !user) {
        toast.error(t('cart.balanceLoginReq'));
        return;
      }
      if (user.balance < cartTotal) {
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
      } else {
        cartForTelegram.push({
          product: { name: `🏷️ ЗНИЖКА (Промокод: ${appliedPromo.code})` },
          price: `-${getDiscountAmount().toFixed(2)}`
        });
      }
    }

    const orderData = {
      cart: cartForTelegram,
      paymentMethod: paymentMethod,
      total: getCartTotal(),
      profit: getCartProfit(),
      user_id: user?.id || null
    };

    const toastId = toast.loading(t('cart.sending'));
    try {
      await apiPost(getFullUrl(API_ENDPOINTS.CHECKOUT), orderData);

      // Якщо оплата з балансу - оновлюємо баланс користувача локально для швидкості
      if (paymentMethod === 'balance') {
        updateBalance(user.balance - cartTotal);
        toast.success(t('cart.successBalance', { amount: cartTotal.toFixed(2) }), { id: toastId });
      } else {
        toast.success(t('cart.successCrypto', { method: paymentMethod.toUpperCase() }), { id: toastId });
      }

      if (appliedPromo) localStorage.setItem(`used_promo_${appliedPromo.code}`, 'true');
      clearCart();
      navigate('/profile'); // Відправляємо юзера в кабінет перевірити замовлення
    } catch (error) {
      handleApiError(error, t('cart.checkoutErr'));
      toast.dismiss(toastId);
    }
  };

  const renderPromoDetails = () => {
    if (!appliedPromo) return null;

    let icon, title, description;

    if (appliedPromo.type === 'percent') {
      icon = <Percent className="w-5 h-5 text-emerald-400" />;
      title = t('cart.discountPercent', { value: appliedPromo.value });
    } else if (appliedPromo.type === 'fixed') {
      icon = <BadgeDollarSign className="w-5 h-5 text-emerald-400" />;
      title = t('cart.discountFixed', { value: appliedPromo.value });
    } else {
      icon = <Gift className="w-5 h-5 text-emerald-400" />;
      title = t('cart.gift', { value: appliedPromo.value });
    }

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
    } else {
      description = t('cart.appliesToAll');
    }

    return (
      <div className="flex items-start justify-between p-4 bg-emerald-900/10 border border-emerald-500/30 rounded-xl relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl"></div>
        <div className="flex items-start gap-3 min-w-0 relative z-10">
          <div className="p-2 bg-emerald-500/20 rounded-lg flex-shrink-0 mt-0.5">{icon}</div>
          <div className="truncate">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-black text-emerald-400 tracking-wider uppercase bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/50">
                {appliedPromo.code}
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-sm font-bold text-white truncate">{title}</div>
            <div className="text-xs text-emerald-300/80 mt-1 font-medium whitespace-normal">{description}</div>
          </div>
        </div>
        <button onClick={removePromo} className="text-slate-500 hover:text-red-400 transition-colors p-2 bg-slate-800/50 rounded-lg hover:bg-slate-800 flex-shrink-0 ml-2 border border-transparent hover:border-red-900/50 relative z-10" title={t('cart.removePromo')}>
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  };

  const pendingCashback = calculatePendingCashback();

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
              <Link to="/" className="px-6 py-3 bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white font-bold rounded-xl transition-all">
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
              const hasActiveDiscount = isTargeted || isGlobal;

              return (
                <div key={item.cartId} className={`bg-slate-800/50 border ${hasActiveDiscount && appliedPromo ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)] bg-emerald-900/5' : 'border-slate-700'} rounded-2xl p-5 flex gap-4 relative group transition-all`}>
                  <div className="w-12 h-12 bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-400 flex-shrink-0">
                    <ShoppingCart className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white truncate">{item.product?.name || item.product?.title || t('cart.item')}</h3>
                    
                    {hasActiveDiscount && appliedPromo && (
                      <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-900/30 border border-emerald-500/30 rounded text-[10px] uppercase font-bold text-emerald-400">
                        <Ticket className="w-3 h-3" /> {t('cart.discountActive')}
                      </div>
                    )}

                    <div className="mt-2 text-xs text-slate-400 space-y-1">
                      {item.userData?.nickname && <div>{t('cart.nickname')} <span className="text-slate-300">{item.userData.nickname}</span></div>}
                      {item.userData?.details && <div className="text-blue-300 truncate">{item.userData.details}</div>}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end self-center pr-8">
                    {hasActiveDiscount && appliedPromo ? (
                       <div className="text-right">
                         <div className="text-sm text-slate-500 line-through">${item.price}</div>
                         <div className="text-xl font-black text-emerald-400 whitespace-nowrap">{t('cart.withDiscount')}</div>
                       </div>
                    ) : (
                       <div className="text-xl font-black text-white whitespace-nowrap">${item.price}</div>
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
              
              {/* 🔥 НОВИЙ СПОСІБ ОПЛАТИ: БАЛАНС 🔥 */}
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
                <span>{t('cart.summary')}</span> <span className={appliedPromo ? 'line-through opacity-70' : ''}>${getSubtotal().toFixed(2)}</span>
              </div>
              {appliedPromo && (
                <div className="flex justify-between text-sm text-emerald-400 font-bold bg-emerald-900/20 p-2 rounded-lg border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                  <span>{t('cart.savings')}</span> <span>{appliedPromo.type === 'item' || appliedPromo.type === 'gift' ? `+ ${appliedPromo.value}` : `-$${getDiscountAmount().toFixed(2)}`}</span>
                </div>
              )}
              <div className="flex justify-between text-2xl font-black text-white pt-3 border-t border-slate-800">
                <span>{t('cart.total')}</span> 
                <span className={appliedPromo ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]' : paymentMethod === 'balance' ? 'text-amber-400' : 'text-blue-400'}>
                  {paymentMethod === 'balance' ? `${getCartTotal()} ${t('cart.coins')}` : `$${getCartTotal()}`}
                </span>
              </div>
            </div>

            {/* БЛОК КЕШБЕКУ ВІДОБРАЖАЄТЬСЯ ТІЛЬКИ ЯКЩО ЮЗЕР АВТОРИЗОВАНИЙ */}
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