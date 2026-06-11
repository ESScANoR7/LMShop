import React, { createContext, useState, useContext, useEffect } from 'react';
import toast from 'react-hot-toast';

const WishlistContext = createContext();

export const useWishlist = () => useContext(WishlistContext);

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);

  // Завантажуємо улюблене з пам'яті при відкритті сайту
  useEffect(() => {
    const saved = localStorage.getItem('lords_wishlist');
    if (saved) {
      try { setWishlist(JSON.parse(saved)); } catch(e) {}
    }
  }, []);

  const saveWishlist = (items) => {
    setWishlist(items);
    localStorage.setItem('lords_wishlist', JSON.stringify(items));
  };

  const addToWishlist = (item) => {
    if (wishlist.find(i => i.id === item.id && i.type === item.type)) {
      toast.error('Товар вже у списку бажаного!');
      return;
    }
    saveWishlist([...wishlist, item]);
    toast.success('Додано до улюбленого!', { icon: '❤️' });
  };

  const removeFromWishlist = (itemId, itemType) => {
    saveWishlist(wishlist.filter(i => !(i.id === itemId && i.type === itemType)));
    toast.success('Видалено з улюбленого', { icon: '💔' });
  };

  const toggleWishlist = (item) => {
    if (isInWishlist(item.id, item.type)) {
      removeFromWishlist(item.id, item.type);
    } else {
      addToWishlist(item);
    }
  };

  const isInWishlist = (itemId, itemType) => {
    return wishlist.some(i => i.id === itemId && i.type === itemType);
  };

  return (
    <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist, toggleWishlist, isInWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
};