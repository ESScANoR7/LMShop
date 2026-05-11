import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { Trash2, ShoppingCart, CreditCard, Wallet, Landmark, ShieldAlert, Ticket, X, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const Cart = () => {
  const { 
    cart, removeFromCart, clearCart, 
    getSubtotal, getDiscountAmount, getCartTotal, 
    appliedPromo, applyPromo, removePromo 
  } = useCart();
  
  const [paymentMethod, setPaymentMethod] = useState('crypto');
  const [promoInput, setPromoInput] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  const hasAccountInCart = cart.some(item => item.type === 'account');

  useEffect(() => {
    if (hasAccountInCart) {
      setPaymentMethod('crypto');
    }
  }, [hasAccountInCart]);

  // ПЕРЕВІРКА ПРОМОКОДУ ЧЕРЕЗ БЕКЕНД
  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setIsApplyingPromo(true);
    const codeToApply = promoInput.trim().toUpperCase();

    // Захист від повторного використання на цьому пристрої
    if (localStorage.getItem(`used_promo_${codeToApply}`)) {
      toast.error('Ви вже використовували цей промокод!');
      setIsApplyingPromo(false);
      return;
    }

    try {
      const currentSubtotal = getSubtotal();
      const response = await fetch(`http://localhost:8000/api/promocodes/validate/${codeToApply}?total=${currentSubtotal}`);
      const data = await response.json();

      if (data.valid) {
        applyPromo({ code: codeToApply, ...data });
        toast.success('Промокод успішно застосовано!');
        setPromoInput('');
      } else {
        toast.error(data.message || 'Промокод недійсний або вимкнений');
      }
    } catch (error) {
      toast.error('Помилка з\'єднання з сервером');
    }
    setIsApplyingPromo(false);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    // МАГІЯ: Додаємо промокод як "віртуальний товар", щоб Telegram-бот його побачив без змін у Python
    const cartForTelegram = [...cart];
    if (appliedPromo) {
      if (appliedPromo.type === 'item') {
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
      total: getCartTotal()
    };

    try {
      const toastId = toast.loading('Відправка замовлення...');
      const response = await fetch('http://localhost:8000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        toast.success(`Замовлення прийнято! Спосіб оплати: ${paymentMethod.toUpperCase()}`, { id: toastId });
        
        // Фіксуємо промокод як використаний у LocalStorage
        if (appliedPromo) {
          localStorage.setItem(`used_promo_${appliedPromo.code}`, 'true');
        }
        
        clearCart(); 
      } else {
        toast.error('Помилка сервера. Спробуйте пізніше.', { id: toastId });
      }
    } catch (error) {
      toast.error('Не вдалося з\'єднатися з сервером.', { id: toastId });
    }
  };

  if (cart.length === 0) {
    return (
      <div className="pb-20 pt-16 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShoppingCart className="w-16 h-16 text-slate-700 mb-6" />
        <h2 className="text-2xl font-bold text-white mb-2">Ваш кошик порожній</h2>
        <Link to="/" className="mt-6 px-8 py-3 bg-blue-600 text-white font-bold rounded-xl">Повернутися до магазину</Link>
      </div>
    );
  }

  return (
    <div className="pb-20 pt-8 max-w-6xl mx-auto px-4">
      <h1 className="text-3xl font-bold text-white mb-8">Оформлення замовлення</h1>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* СПИСОК ТОВАРІВ */}
        <div className="lg:col-span-8 space-y-4">
          {cart.map((item) => (
            <div key={item.cartId} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 flex gap-4 relative group">
              <div className="w-12 h-12 bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-400 flex-shrink-0">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white">{item.product?.name || item.product?.title || 'Товар'}</h3>
                <div className="mt-2 text-xs text-slate-400 space-y-1">
                  {item.userData?.nickname && <div>Нікнейм: {item.userData.nickname}</div>}
                  {item.userData?.details && <div className="text-blue-300">{item.userData.details}</div>}
                </div>
              </div>
              <div className="text-xl font-black text-white self-center">${item.price}</div>
              <button onClick={() => removeFromCart(item.cartId)} className="absolute top-4 right-4 text-slate-500 hover:text-red-400 transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        {/* ПАНЕЛЬ ОПЛАТИ */}
        <div className="lg:col-span-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sticky top-24">
            <h2 className="text-xl font-bold text-white mb-6">Оплата</h2>
            
            {hasAccountInCart && (
              <div className="mb-6 p-4 bg-amber-900/20 border border-amber-500/30 rounded-xl flex gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <p className="text-xs text-amber-400/90 leading-relaxed">
                  У вашому кошику є ігровий акаунт. З міркувань безпеки, оплата за акаунти приймається <strong className="text-amber-400 font-bold">виключно у криптовалюті (USDT)</strong>.
                </p>
              </div>
            )}

            <div className="space-y-2 mb-8">
              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${paymentMethod === 'crypto' ? 'bg-blue-900/20 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                <input type="radio" name="payment" value="crypto" checked={paymentMethod === 'crypto'} onChange={() => setPaymentMethod('crypto')} className="hidden" />
                <Wallet className={`w-5 h-5 ${paymentMethod === 'crypto' ? 'text-blue-400' : 'text-slate-500'}`} />
                <div className="flex-1"><div className="text-sm font-bold">Криптовалюта (USDT)</div></div>
              </label>

              <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${hasAccountInCart ? 'opacity-50 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-600' : paymentMethod === 'card' ? 'bg-blue-900/20 border-blue-500 text-white cursor-pointer' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 cursor-pointer'}`}>
                <input type="radio" name="payment" value="card" disabled={hasAccountInCart} checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} className="hidden" />
                <CreditCard className={`w-5 h-5 ${paymentMethod === 'card' ? 'text-blue-400' : 'text-slate-500'}`} />
                <div className="flex-1">
                  <div className="text-sm font-bold">Банківська картка</div>
                  {hasAccountInCart && <div className="text-[10px] text-red-400">Недоступно для акаунтів</div>}
                </div>
              </label>

              <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${hasAccountInCart ? 'opacity-50 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-600' : paymentMethod === 'wallet' ? 'bg-blue-900/20 border-blue-500 text-white cursor-pointer' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 cursor-pointer'}`}>
                <input type="radio" name="payment" value="wallet" disabled={hasAccountInCart} checked={paymentMethod === 'wallet'} onChange={() => setPaymentMethod('wallet')} className="hidden" />
                <Landmark className={`w-5 h-5 ${paymentMethod === 'wallet' ? 'text-blue-400' : 'text-slate-500'}`} />
                <div className="flex-1">
                  <div className="text-sm font-bold">PayPal / Wise</div>
                  {hasAccountInCart && <div className="text-[10px] text-red-400">Недоступно для акаунтів</div>}
                </div>
              </label>
            </div>

            {/* ПРОМОКОД */}
            <div className="mb-6 pt-6 border-t border-slate-800">
              <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                <Ticket className="w-4 h-4 text-emerald-400" /> У вас є промокод?
              </h3>
              
              {!appliedPromo ? (
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={promoInput} 
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())} 
                    placeholder="Введіть код" 
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm font-bold uppercase tracking-wider focus:border-emerald-500 outline-none" 
                  />
                  <button 
                    onClick={handleApplyPromo} 
                    disabled={isApplyingPromo}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-emerald-600 border border-slate-700 hover:border-emerald-500 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                  >
                    Застосувати
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-emerald-900/20 border border-emerald-500/30 rounded-xl">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <div>
                      <div className="text-sm font-bold text-emerald-400">{appliedPromo.code}</div>
                      <div className="text-xs text-slate-400">Промокод активовано</div>
                    </div>
                  </div>
                  <button onClick={removePromo} className="text-slate-500 hover:text-red-400 transition-colors p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {/* ПІДСУМКИ */}
            <div className="space-y-3 mb-6 pt-4 border-t border-slate-800">
              <div className="flex justify-between text-sm text-slate-400">
                <span>Сума товарів:</span> <span>${getSubtotal().toFixed(2)}</span>
              </div>
              
              {appliedPromo && (
                <div className="flex justify-between text-sm text-emerald-400 font-bold">
                  <span>Знижка:</span> 
                  <span>{appliedPromo.type === 'item' ? `+ ${appliedPromo.value}` : `-$${getDiscountAmount().toFixed(2)}`}</span>
                </div>
              )}
              
              <div className="flex justify-between text-2xl font-black text-white pt-3 border-t border-slate-800">
                <span>Разом:</span> <span className="text-blue-400">${getCartTotal()}</span>
              </div>
            </div>

            <button onClick={handleCheckout} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg">
              Замовити зараз
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;