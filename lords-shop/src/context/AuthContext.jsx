import React, { createContext, useState, useContext, useEffect } from 'react';
import { apiPost, apiGet } from '../config/apiClient';
import { initTelegramWebApp, getTMAInitData, hapticNotification } from '../utils/telegramWebApp';

const AuthContext = createContext({
  isLoggedIn: false,
  user: null, 
  isAuthLoading: false,
  login: () => {},
  logout: () => {},
  updateBalance: () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user_data');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser.user_id && !parsedUser.id) {
          parsedUser.id = parsedUser.user_id;
        }
        return parsedUser;
      }
    } catch (e) {
      console.error("Помилка парсингу даних користувача:", e);
      localStorage.removeItem('user_data');
    }
    return null;
  });

  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('user_data'));
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // 📱 TELEGRAM WEBAPP AUTO-LOGIN
  useEffect(() => {
    initTelegramWebApp();

    const tmaInitData = getTMAInitData();
    if (tmaInitData && !isLoggedIn) {
      setIsAuthLoading(true);
      apiPost('/api/telegram/webapp-auth', { initData: tmaInitData })
        .then(res => {
          if (res && res.user_id) {
            login(res);
            hapticNotification('success');
          }
        })
        .catch(err => {
          console.warn('Telegram WebApp auto-auth warning:', err);
        })
        .finally(() => {
          setIsAuthLoading(false);
        });
    }
  }, []);


  // 🔄 Синхронізація актуальних даних користувача (аватар, баланс) при завантаженні
  useEffect(() => {
    if (user?.id) {
      apiGet(`/api/users/${user.id}`)
        .then(freshUser => {
          if (freshUser && (freshUser.id || freshUser.username)) {
            setUser(prev => {
              if (!prev) return prev;
              const updated = { 
                ...prev, 
                avatar: freshUser.avatar !== undefined ? freshUser.avatar : prev.avatar,
                balance: freshUser.balance !== undefined ? freshUser.balance : prev.balance
              };
              localStorage.setItem('user_data', JSON.stringify(updated));
              return updated;
            });
          }
        })
        .catch(() => {});
    }
  }, [user?.id]);

  const login = (userData) => {
    // Гарантуємо, що завжди є поле id
    const normalizedUser = {
      ...userData,
      id: userData.id || userData.user_id
    };
    
    setUser(normalizedUser);
    setIsLoggedIn(true);

    localStorage.setItem('user_data', JSON.stringify(normalizedUser));
    localStorage.setItem('user_id', normalizedUser.id);
    // Токени тепер безпечно лежать в HttpOnly Cookies, нам не треба їх чіпати
  };

  const logout = async () => {
    // Викидаємо запит на бекенд, щоб він "вбив" (очистив) HttpOnly cookies
    try {
      await apiPost('/api/logout', {});
    } catch (error) {
      console.error('Помилка при logout на сервері:', error);
    }

    // Очищаємо фронтенд
    setUser(null);
    setIsLoggedIn(false);

    localStorage.removeItem('user_data');
    localStorage.removeItem('user_id');
    localStorage.removeItem('access_token'); // Якщо раптом залишився від старої версії
    localStorage.removeItem('refresh_token'); 
  };

  const updateBalance = (newBalance) => {
    if (user) {
      const updatedUser = { ...user, balance: newBalance };
      setUser(updatedUser);
      localStorage.setItem('user_data', JSON.stringify(updatedUser));
    }
  };

  const updateUser = (fields) => {
    if (user) {
      const updatedUser = { ...user, ...fields };
      setUser(updatedUser);
      localStorage.setItem('user_data', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, isAuthLoading, login, logout, updateBalance, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};