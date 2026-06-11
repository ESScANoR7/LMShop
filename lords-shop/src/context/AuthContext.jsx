import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext({
  isLoggedIn: false,
  user: null, 
  isAuthLoading: false, // Нам більше не треба чекати!
  login: () => {},
  logout: () => {},
  updateBalance: () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  // 🔥 СИНХРОННА ІНІЦІАЛІЗАЦІЯ 🔥
  // Читаємо localStorage одразу, до того як React Router почне перевіряти права
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user_data');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        // Нормалізуємо ID (на випадок, якщо бекенд повернув user_id замість id)
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

  // Одразу ставимо true, якщо юзер є
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('user_data'));
  
  // Ми прочитали дані миттєво, тому стан завантаження більше не потрібен
  const [isAuthLoading, setIsAuthLoading] = useState(false);

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
      await fetch('http://localhost:8000/api/logout', {
        method: 'POST',
        credentials: 'include' // Обов'язково передаємо куки для їх видалення
      });
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

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, isAuthLoading, login, logout, updateBalance }}>
      {children}
    </AuthContext.Provider>
  );
};