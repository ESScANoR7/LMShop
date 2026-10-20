/**
 * Telegram Mini App (TMA) Helper & Haptics Engine
 */

export const getTelegramWebApp = () => {
  if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
};

export const isTelegramWebApp = () => {
  const tg = getTelegramWebApp();
  return Boolean(tg && tg.initData && tg.initData.length > 0);
};

export const initTelegramWebApp = () => {
  const tg = getTelegramWebApp();
  if (!tg) return null;

  try {
    tg.ready();
    tg.expand();
    
    // Встановлюємо колір хедера під темну тему сайту
    if (tg.setHeaderColor) {
      tg.setHeaderColor('#020617'); // slate-950
    }
    if (tg.setBackgroundColor) {
      tg.setBackgroundColor('#020617');
    }
  } catch (e) {
    console.warn('Telegram WebApp init error:', e);
  }

  return tg;
};

export const getTMAInitData = () => {
  const tg = getTelegramWebApp();
  return tg ? tg.initData : '';
};

export const getTMAUser = () => {
  const tg = getTelegramWebApp();
  return tg?.initDataUnsafe?.user || null;
};

/**
 * Вібровідгук (Haptic Feedback) для нативного мобільного досвіду
 * styles: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'
 */
export const hapticImpact = (style = 'medium') => {
  try {
    const tg = getTelegramWebApp();
    if (tg?.HapticFeedback?.impactOccurred) {
      tg.HapticFeedback.impactOccurred(style);
    } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
      // Fallback на стандартну вібрацію мобільних браузерів
      navigator.vibrate(style === 'heavy' ? 40 : 20);
    }
  } catch (e) {
    // Ignore
  }
};

/**
 * Сповіщення через вібрацію
 * types: 'error' | 'success' | 'warning'
 */
export const hapticNotification = (type = 'success') => {
  try {
    const tg = getTelegramWebApp();
    if (tg?.HapticFeedback?.notificationOccurred) {
      tg.HapticFeedback.notificationOccurred(type);
    } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (type === 'success') navigator.vibrate([15, 50, 20]);
      else if (type === 'error') navigator.vibrate([30, 80, 30, 80, 30]);
      else navigator.vibrate([20, 50, 20]);
    }
  } catch (e) {
    // Ignore
  }
};

/**
 * Легкий клік при зміні елементів списку чи виборі опцій
 */
export const hapticSelection = () => {
  try {
    const tg = getTelegramWebApp();
    if (tg?.HapticFeedback?.selectionChanged) {
      tg.HapticFeedback.selectionChanged();
    }
  } catch (e) {
    // Ignore
  }
};
