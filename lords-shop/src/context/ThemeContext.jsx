import React, { createContext, useContext, useState, useEffect } from 'react';

export const THEMES = [
  { id: 'blue', name: 'Синя', desc: 'Спокійна', icon: '🔵', accentColor: '#2563eb' },
  { id: 'red', name: 'Червона', desc: 'Бойова', icon: '🔴', accentColor: '#dc2626' },
  { id: 'pink', name: 'Рожево-біла', desc: 'Сакура', icon: '🌸', accentColor: '#ec4899' },
  { id: 'monochrome', name: 'Чорно-біла', desc: 'Класика', icon: '⚪', accentColor: '#f8fafc' },
];

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('lords_theme');
    const valid = THEMES.some(t => t.id === saved);
    return valid ? saved : 'blue';
  });

  useEffect(() => {
    localStorage.setItem('lords_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      const idx = THEMES.findIndex(t => t.id === prev);
      const nextIdx = (idx + 1) % THEMES.length;
      return THEMES[nextIdx].id;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
