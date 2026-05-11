import React, { createContext, useState, useContext } from 'react';

const CartContext = createContext({
  cart: [],
  appliedPromo: null,
  addToCart: () => {},
  removeFromCart: () => {},
  clearCart: () => {},
  getSubtotal: () => 0,
  getDiscountAmount: () => 0,
  getCartTotal: () => '0.00',
  applyPromo: () => {},
  removePromo: () => {}
});

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [appliedPromo, setAppliedPromo] = useState(null); // Стан для промокоду

  const addToCart = (item) => {
    setCart((prev) => [...prev, { ...item, cartId: Date.now() + Math.random() }]);
  };

  const removeFromCart = (cartId) => {
    setCart((prev) => prev.filter(item => item.cartId !== cartId));
  };

  const clearCart = () => {
    setCart([]);
    setAppliedPromo(null); // Очищаємо промокод після покупки
  };

  // Чиста сума (до знижки)
  const getSubtotal = () => {
    return cart.reduce((total, item) => total + parseFloat(item.price || 0), 0);
  };

  // Розрахунок самої знижки
  const getDiscountAmount = () => {
    if (!appliedPromo) return 0;
    const subtotal = getSubtotal();
    let discount = 0;

    if (appliedPromo.type === 'percent') {
      discount = subtotal * (parseFloat(appliedPromo.value) / 100);
    } else if (appliedPromo.type === 'fixed') {
      discount = parseFloat(appliedPromo.value);
    }
    
    // Знижка не може бути більшою за саму суму кошика
    return Math.min(subtotal, discount);
  };

  // Фінальна сума (після знижки)
  const getCartTotal = () => {
    const subtotal = getSubtotal();
    const discount = getDiscountAmount();
    return Math.max(0, subtotal - discount).toFixed(2);
  };

  const applyPromo = (promoData) => setAppliedPromo(promoData);
  const removePromo = () => setAppliedPromo(null);

  return (
    <CartContext.Provider value={{ 
      cart, appliedPromo, addToCart, removeFromCart, clearCart, 
      getSubtotal, getDiscountAmount, getCartTotal, applyPromo, removePromo 
    }}>
      {children}
    </CartContext.Provider>
  );
};