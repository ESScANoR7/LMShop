import { API_URL, API_TIMEOUT } from './api.js';
import toast from 'react-hot-toast';

let isRefreshing = false;
let refreshPromise = null;

/**
 * Утиліта для API запитів з вбудованим error handling та timeout
 */
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

/**
 * Оновлює access token за допомогою refresh token (тепер працює через HttpOnly Cookies)
 */
const refreshAccessToken = async () => {
  try {
    const response = await fetch(`${API_URL}/api/refresh-token`, {
      method: 'POST',
      credentials: 'include', // 🔥 ОБОВ'ЯЗКОВО для передачі refresh-cookie
      headers: { 'Content-Type': 'application/json' },
      // Передаємо заглушку, щоб бекенд не сварився на відсутність JSON-тіла,
      // але реальна валідація пройде по куках
      body: JSON.stringify({ refresh_token: "cookie_based_refresh" }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    // Бекенд сам оновить HttpOnly cookies
    return true; 
  } catch (error) {
    // Якщо рефреш не вдався (кука прострочена) - викидаємо з акаунта
    localStorage.removeItem('user_data');
    localStorage.removeItem('user_id');
    window.location.href = '/profile';
    return null;
  }
};

/**
 * Виконує fetch запит з timeout та error handling
 * @param {string} url - Повний URL
 * @param {object} options - fetch опції
 * @returns {Promise<any>} - Parsed JSON
 */
export const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT || 15000);

  // 🔥 ПРИМУСОВО додаємо credentials до всіх запитів, щоб браузер відправляв куки
  options.credentials = 'include';

  try {
    let response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Якщо 401, намагаємось оновити токен
    if (response.status === 401) {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshAccessToken().finally(() => {
          isRefreshing = false;
          refreshPromise = null;
        });
      }

      const isRefreshed = await refreshPromise;
      if (isRefreshed) {
        // Повторюємо запит (нові куки підтягнуться автоматично)
        response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
      } else {
        throw new ApiError('Невалідна сесія. Увійдіть знову.', 401, null);
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || errorData.error || response.statusText;
      throw new ApiError(errorMessage, response.status, errorData);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error.name === 'AbortError') {
      throw new ApiError(`Запит перевищив timeout (${API_TIMEOUT}ms)`, 408, null);
    }

    throw new ApiError(
      error.message || 'Помилка мережі',
      0,
      null
    );
  }
};

/**
 * GET запит
 */
export const apiGet = async (url, options = {}) => {
  return fetchWithTimeout(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    },
    ...options,
  });
};

/**
 * POST запит
 */
export const apiPost = async (url, data, options = {}) => {
  const isFormData = data instanceof FormData;
  const headers = { ...getAuthHeaders(), ...options.headers };

  // 🔥 Якщо це FormData, НЕ ставимо Content-Type! Браузер сам додасть multipart/form-data
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  return fetchWithTimeout(url, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: isFormData ? data : JSON.stringify(data),
    ...options,
  });
};

/**
 * PUT запит
 */
export const apiPut = async (url, data, options = {}) => {
  const isFormData = data instanceof FormData;
  const headers = { ...getAuthHeaders(), ...options.headers };

  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  return fetchWithTimeout(url, {
    method: 'PUT',
    credentials: 'include',
    headers,
    body: isFormData ? data : JSON.stringify(data),
    ...options,
  });
};

/**
 * DELETE запит
 */
export const apiDelete = async (url, options = {}) => {
  return fetchWithTimeout(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    },
    ...options,
  });
};

/**
 * Повертає заголовки аутентифікації (без токена — він тепер безпечно лежить у cookies)
 */
export const getAuthHeaders = () => {
  return {};
};

/**
 * Помилка обробника для UI
 */
export const handleApiError = (error, defaultMessage = 'Сталася помилка') => {
  if (error instanceof ApiError) {
    const message = error.message || defaultMessage;

    // 401 вже обробляється у fetchWithTimeout, не спамимо юзеру
    if (error.status === 401) {
      return;
    }

    toast.error(message);
    return error;
  }

  toast.error(defaultMessage);
  return new ApiError(defaultMessage, 0, null);
};

/**
 * Утиліта для retry логіки при помилках мережі
 */
export const fetchWithRetry = async (
  fetchFn,
  maxRetries = 3,
  delayMs = 1000
) => {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetchFn();
    } catch (error) {
      lastError = error;

      // Не робимо retry для client errors (4xx)
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        throw error;
      }

      // Чекаємо перед наступною спробою
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (i + 1)));
      }
    }
  }

  throw lastError;
};