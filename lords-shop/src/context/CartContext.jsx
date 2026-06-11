import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { apiGet } from '../config/apiClient';
import { API_ENDPOINTS, getFullUrl } from '../config/api';

const CartContext = createContext({
  cart: [],
  appliedPromo: null,
  cashbackConfig: { percent: 5, excluded_types: 'account' },
  addToCart: () => {},
  removeFromCart: () => {},
  clearCart: () => {},
  getSubtotal: () => 0,
  getDiscountAmount: () => 0,
  getCartTotal: () => '0.00',
  getCartProfit: () => '0.00',
  calculatePendingCashback: () => 0,
  applyPromo: () => {},
  removePromo: () => {},
  isLoadingCashback: false,
});

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [cashbackConfig, setCashbackConfig] = useState({ percent: 5, excluded_types: 'account' });
  const [isLoadingCashback, setIsLoadingCashback] = useState(true);

  // Завантажуємо налаштування кешбеку з бази даних при старті сайту
  useEffect(() => {
    const loadCashbackConfig = async () => {
      try {
        setIsLoadingCashback(true);
        const data = await apiGet(getFullUrl(API_ENDPOINTS.CASHBACK_SETTINGS_PUBLIC));
        setCashbackConfig(data);
      } catch (error) {
        console.error("Не вдалося завантажити налаштування кешбеку:", error);
        // Залишаємо значення за замовчуванням
      } finally {
        setIsLoadingCashback(false);
      }
    };
    loadCashbackConfig();
  }, []);

  const addToCart = (item) => {
    setCart((prev) => [...prev, { ...item, cartId: Date.now() + Math.random() }]);
  };

  const removeFromCart = (cartId) => {
    setCart((prev) => prev.filter(item => item.cartId !== cartId));
  };

  const clearCart = () => {
    setCart([]);
    setAppliedPromo(null);
  };

  const getSubtotal = () => {
    return cart.reduce((total, item) => total + parseFloat(item.price || 0), 0);
  };

  const getDiscountAmount = () => {
    if (!appliedPromo) return 0;
    let eligibleTotal = 0;

    if (!appliedPromo.target_items || appliedPromo.target_items.length === 0) {
      eligibleTotal = getSubtotal();
    } else {
      cart.forEach(item => {
        let prefix = '';
        if (item.type === 'account') prefix = 'acc_';
        else if (item.type === 'rss') prefix = 'rss_';
        else if (item.type === 'gems') prefix = 'gem_';
        else if (item.type === 'special') prefix = 'oth_';

        const complexId = `${prefix}${item.product?.id}`;

        if (appliedPromo.target_items.includes(complexId)) {
          eligibleTotal += parseFloat(item.price || 0);
        }
      });
    }

    if (eligibleTotal === 0) return 0;
    let discount = 0;

    if (appliedPromo.type === 'percent') {
      discount = eligibleTotal * (parseFloat(appliedPromo.value) / 100);
    } else if (appliedPromo.type === 'fixed') {
      discount = parseFloat(appliedPromo.value);
      discount = Math.min(eligibleTotal, discount);
    }
    
    return discount;
  };

  const getCartTotal = () => {
    const subtotal = getSubtotal();
    const discount = getDiscountAmount();
    const total = subtotal - discount;
    return Math.max(0, total).toFixed(2);
  };

  const getCartProfit = () => {
    const totalPaid = parseFloat(getCartTotal());
    const totalCost = cart.reduce((sum, item) => sum + parseFloat(item.product?.base_price || 0), 0);
    return Math.max(0, totalPaid - totalCost).toFixed(2);
  };

  // 🔥 РОЗРАХУНОК МАЙБУТНЬОГО КЕШБЕКУ 🔥
  const calculatePendingCashback = () => {
    const excludedList = cashbackConfig.excluded_types ? cashbackConfig.excluded_types.split(',') : [];
    
    // Рахуємо суму тільки тих товарів, які НЕ підпадають під обмеження
    const eligibleSum = cart.reduce((sum, item) => {
      if (excludedList.includes(item.type)) {
        return sum; // Пропускаємо товар (наприклад, акаунт)
      }
      return sum + parseFloat(item.price || 0);
    }, 0);

    // Якщо є промокод на знижку, пропорційно зменшуємо суму для кешбеку
    const subtotal = getSubtotal();
    if (subtotal > 0) {
      const discountRatio = parseFloat(getCartTotal()) / subtotal;
      const finalEligibleSum = eligibleSum * discountRatio;
      return (finalEligibleSum * (cashbackConfig.percent / 100)).toFixed(2);
    }

    return '0.00';
  };

  const applyPromo = (promoData) => setAppliedPromo(promoData);
  const removePromo = () => setAppliedPromo(null);

  // Мемоізуємо значення контексту щоб запобігти непотрібним re-renders
  const value = useMemo(
    () => ({
      cart,
      appliedPromo,
      cashbackConfig,
      addToCart,
      removeFromCart,
      clearCart,
      getSubtotal,
      getDiscountAmount,
      getCartTotal,
      getCartProfit,
      calculatePendingCashback,
      applyPromo,
      removePromo,
      isLoadingCashback,
    }),
    [cart, appliedPromo, cashbackConfig, isLoadingCashback]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};