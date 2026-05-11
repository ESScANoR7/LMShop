import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  
  // Стан для активної додаткової знижки
  const [promoDiscount, setPromoDiscount] = useState(0); 

  // --- ДИНАМІЧНА БАЗА ПРОМОКОДІВ (Заготовка для Адмінки) ---
  const [promoDatabase, setPromoDatabase] = useState([
    { code: 'VIP5', discount: 0.05 },
    { code: 'LORDS10', discount: 0.10 }
  ]);

  const login = (userData) => {
    setIsLoggedIn(true);
    setUser(userData || { name: 'Player1', email: 'player@lords.com', role: 'user' });
  };

  const logout = () => {
    setIsLoggedIn(false);
    setUser(null);
    setPromoDiscount(0); // Скидаємо промокод при виході
  };

  // --- ФУНКЦІЯ ДЛЯ КЛІЄНТА: Активація промокоду ---
  const applyPromo = (code) => {
    const formattedCode = code.trim().toUpperCase();
    
    // Шукаємо введений код у нашій динамічній базі
    const foundPromo = promoDatabase.find(p => p.code === formattedCode);
    
    if (foundPromo) {
      setPromoDiscount(foundPromo.discount); 
      return { success: true, message: `Промокод застосовано! Додаткова знижка ${foundPromo.discount * 100}%` };
    }
    
    return { success: false, message: 'Невірний або прострочений промокод' };
  };

  // --- ФУНКЦІЇ ДЛЯ АДМІНА: Керування промокодами ---
  const adminAddPromo = (newCode, discountValue) => {
    setPromoDatabase(prev => [
      ...prev, 
      { code: newCode.trim().toUpperCase(), discount: parseFloat(discountValue) }
    ]);
  };

  const adminRemovePromo = (codeToRemove) => {
    setPromoDatabase(prev => prev.filter(p => p.code !== codeToRemove));
  };

  // Оновлена функція ціни
  const getPrice = (basePrice) => {
    const price = parseFloat(basePrice);
    
    if (isLoggedIn) {
      // Якщо увійшов -> базова ціна мінус знижка від промокоду
      const discountedPrice = price * (1 - promoDiscount);
      return discountedPrice.toFixed(2);
    }
    
    // Якщо гість -> базова ціна + 10%
    return (price * 1.10).toFixed(2); 
  };

  return (
    <AuthContext.Provider value={{ 
      isLoggedIn, user, login, logout, getPrice, applyPromo, promoDiscount,
      // Віддаємо ці дані назовні, щоб Адмінка могла ними користуватися:
      promoDatabase, adminAddPromo, adminRemovePromo 
    }}>
      {children}
    </AuthContext.Provider>
  );
};