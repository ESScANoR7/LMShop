import React, { createContext, useState, useContext, useEffect } from 'react';
import toast from 'react-hot-toast';

const CompareContext = createContext();

export const useCompare = () => useContext(CompareContext);

export const CompareProvider = ({ children }) => {
  // Завантажуємо збережені для порівняння акаунти
  const [compareList, setCompareList] = useState(() => {
    const saved = localStorage.getItem('compare_list');
    return saved ? JSON.parse(saved) : [];
  });

  // Зберігаємо зміни
  useEffect(() => {
    localStorage.setItem('compare_list', JSON.stringify(compareList));
  }, [compareList]);

  const toggleCompare = (account) => {
    setCompareList(prev => {
      const isExist = prev.find(item => item.id === account.id);
      if (isExist) {
        toast('Видалено з порівняння', { icon: '⚖️' });
        return prev.filter(item => item.id !== account.id);
      } else {
        if (prev.length >= 4) {
          toast.error('Можна порівнювати максимум 4 акаунти одночасно!');
          return prev;
        }
        toast.success('Додано до порівняння!', { icon: '⚖️' });
        return [...prev, account];
      }
    });
  };

  const removeFromCompare = (id) => {
    setCompareList(prev => prev.filter(item => item.id !== id));
  };

  const clearCompare = () => setCompareList([]);

  const isInCompare = (id) => compareList.some(item => item.id === id);

  return (
    <CompareContext.Provider value={{ compareList, toggleCompare, removeFromCompare, clearCompare, isInCompare }}>
      {children}
    </CompareContext.Provider>
  );
};