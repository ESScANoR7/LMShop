/**
 * Перевіряє чи користувач аутентифікований
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem('access_token');
};

/**
 * Повертає токен аутентифікації
 */
export const getAuthToken = () => {
  return localStorage.getItem('access_token');
};

/**
 * Зберігає токен аутентифікації
 */
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('access_token', token);
  } else {
    localStorage.removeItem('access_token');
  }
};

/**
 * Очищує дані аутентифікації
 */
export const clearAuth = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
  localStorage.removeItem('admin_session');
};

/**
 * Декодує JWT токен без перевірки підпису (тільки payload)
 */
export const decodeJWT = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
    return payload;
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
};

/**
 * Перевіряє чи токен експайрився
 */
export const isTokenExpired = (token) => {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return true;

  const now = Math.floor(Date.now() / 1000);
  return now > payload.exp;
};

/**
 * Повертає кількість секунд до експайру токена
 */
export const getTokenTimeToExpire = (token) => {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return 0;

  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, payload.exp - now);
};
