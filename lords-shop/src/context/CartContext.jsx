import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { apiGet } from '../config/apiClient';
import { API_ENDPOINTS, getFullUrl } from '../config/api';
import { hapticImpact } from '../utils/telegramWebApp';

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

export const getItemCategory = (item) => {
  if (!item) return 'other';
  const type = String(item.type || '').trim().toLowerCase();
  const itemGroup = String(item.item_group || '').trim().toLowerCase();
  const prod = item.product || {};
  const pCat = String(prod.category || prod.type || '').trim().toLowerCase();

  if (['rss', 'resource', 'resources'].includes(type) || ['rss', 'res'].includes(itemGroup) || ['rss', 'resource', 'resources'].includes(pCat)) {
    return 'rss';
  }
  if (['gems', 'gem', 'sapphire', 'sapphires'].includes(type) || ['gem', 'gems'].includes(itemGroup) || ['gems', 'gem', 'sapphire', 'sapphires'].includes(pCat)) {
    return 'gems';
  }
  if (['account', 'acc', 'accounts'].includes(type) || ['acc', 'account'].includes(itemGroup) || ['account', 'acc', 'accounts'].includes(pCat)) {
    return 'account';
  }
  return 'other';
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('lm_cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [cashbackConfig, setCashbackConfig] = useState({ percent: 5, excluded_types: 'account', category_percents: {} });
  const [isLoadingCashback, setIsLoadingCashback] = useState(true);

  // Синхронізація cart з localStorage
  useEffect(() => {
    try {
      localStorage.setItem('lm_cart', JSON.stringify(cart));
    } catch (e) {
      console.error("Не вдалося зберегти кошик в localStorage:", e);
    }
  }, [cart]);

  // Завантажуємо налаштування кешбеку з бази даних при старті сайту
  useEffect(() => {
    const loadCashbackConfig = async () => {
      try {
        setIsLoadingCashback(true);
        const data = await apiGet(getFullUrl(API_ENDPOINTS.CASHBACK_SETTINGS_PUBLIC));
        if (data) {
          setCashbackConfig(data);
        }
      } catch (error) {
        console.error("Не вдалося завантажити налаштування кешбеку:", error);
      } finally {
        setIsLoadingCashback(false);
      }
    };
    loadCashbackConfig();
  }, []);

  const addToCart = (item) => {
    hapticImpact('medium');
    setCart((prev) => [...prev, { ...item, cartId: Date.now() + Math.random() }]);
  };

  const removeFromCart = (cartId) => {
    hapticImpact('light');
    setCart((prev) => prev.filter(item => item.cartId !== cartId));
  };

  const clearCart = () => {
    setCart([]);
    setAppliedPromo(null);
    try {
      localStorage.removeItem('lm_cart');
    } catch (e) {}
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

  // 🔥 РОЗРАХУНОК МАЙБУТНЬОГО КЕШБЕКУ З УРАХУВАННЯМ РАНГІВ ТА КАТЕГОРІЙ 🔥
  const calculatePendingCashback = (userTierId = null) => {
    if (!cart || cart.length === 0) return '0.00';

    const excludedList = cashbackConfig?.excluded_types
      ? cashbackConfig.excluded_types.split(',').map(s => s.trim().toLowerCase())
      : [];

    let tiers = cashbackConfig?.tiers;
    if (typeof tiers === 'string') {
      try { tiers = JSON.parse(tiers); } catch (e) { tiers = null; }
    }

    let activeTier = null;
    if (Array.isArray(tiers) && tiers.length > 0) {
      if (userTierId) {
        activeTier = tiers.find(t => String(t.id).toLowerCase() === String(userTierId).toLowerCase());
      }
      if (!activeTier) {
        activeTier = tiers[0]; // base tier
      }
    }

    let catPercents = {};
    if (activeTier) {
      catPercents = {
        rss: activeTier.rss,
        gems: activeTier.gems,
        other: activeTier.other,
        account: activeTier.account
      };
    } else if (cashbackConfig?.category_percents) {
      if (typeof cashbackConfig.category_percents === 'string') {
        try {
          catPercents = JSON.parse(cashbackConfig.category_percents);
        } catch (e) {
          catPercents = {};
        }
      } else if (typeof cashbackConfig.category_percents === 'object') {
        catPercents = cashbackConfig.category_percents;
      }
    }

    const basePct = activeTier ? (parseFloat(activeTier.other) || 5) : (parseFloat(cashbackConfig?.percent) || 0);
    const subtotal = getSubtotal();
    if (subtotal <= 0) return '0.00';

    const discountRatio = parseFloat(getCartTotal()) / subtotal;
    let totalCashback = 0;

    cart.forEach(item => {
      const itemType = String(item.type || '').trim().toLowerCase();
      // Якщо категорія повністю виключена з кешбеку (наприклад, акаунти)
      if (excludedList.includes(itemType)) {
        return;
      }

      const itemPrice = parseFloat(item.price || 0);
      if (itemPrice <= 0) return;

      const cat = getItemCategory(item);
      let catPct = basePct;
      if (catPercents && catPercents[cat] !== undefined && catPercents[cat] !== null && String(catPercents[cat]).trim() !== '') {
        const parsed = parseFloat(catPercents[cat]);
        if (!isNaN(parsed)) {
          catPct = parsed;
        }
      }

      const effectivePrice = itemPrice * discountRatio;
      totalCashback += effectivePrice * (catPct / 100);
    });

    return totalCashback.toFixed(2);
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