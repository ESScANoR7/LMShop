// Централізований конфіг для API запитів
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '30000', 10);

export const API_ENDPOINTS = {
  // Аутентифікація
  LOGIN: '/api/login',
  LOGOUT: '/api/logout',
  REFRESH_TOKEN: '/api/refresh-token',
  REGISTER: '/api/register',

  // Акаунти
  ACCOUNTS: '/api/accounts',
  ACCOUNT_DETAILS: (id) => `/api/accounts/${id}`,
  ACCOUNT_CREATE: '/api/accounts',
  ACCOUNT_UPDATE: (id) => `/api/accounts/${id}`,
  ACCOUNT_DELETE: (id) => `/api/accounts/${id}`,
  ACCOUNT_STATUS: (id) => `/api/accounts/${id}/status`,

  // Ресурси
  RESOURCES: '/api/resources',
  RESOURCES_BULK: '/api/resources/bulk',

  // Самоцвіти (Gems)
  GEMS: '/api/gems',
  GEMS_BULK: '/api/gems/bulk',

  // Інші предмети
  OTHER_ITEMS: '/api/other-items',
  OTHER_ITEMS_BULK: '/api/other-items/bulk',

  // Замовлення
  CHECKOUT: '/api/checkout',
  ORDERS: '/api/orders',
  ORDER_STATUS: (id) => `/api/orders/${id}/status`,

  // Промокоди
  PROMOCODES: '/api/promocodes',
  PROMOCODE_VALIDATE: (code) => `/api/promocodes/validate/${code}`,
  PROMOCODE_CREATE: '/api/promocodes',
  PROMOCODE_DELETE: (id) => `/api/promocodes/${id}`,
  PROMOCODE_TOGGLE: (id) => `/api/promocodes/${id}/toggle`,

  // Кешбек
  CASHBACK_SETTINGS: '/api/cashback/settings',
  CASHBACK_SETTINGS_PUBLIC: '/api/cashback/settings/public',

  // Користувач
  USER_DATA: (id) => `/api/users/${id}`,
  USER_UPDATE: (id) => `/api/users/${id}/update`,
  USER_NOTIFICATIONS: (id) => `/api/users/${id}/notifications`,
  USER_NOTIFICATIONS_READ: (id) => `/api/users/${id}/notifications/read`,

  // Admin - користувачі
  ADMIN_USERS: '/api/admin/users',
  ADMIN_USER_BAN: (id) => `/api/admin/users/${id}/ban`,
  ADMIN_USER_UNBAN: (id) => `/api/admin/users/${id}/unban`,

  // Admin - інші товари
  OTHER_ITEM_CREATE: '/api/other-items',
  OTHER_ITEM_UPDATE: (id) => `/api/other-items/${id}`,
  OTHER_ITEM_DELETE: (id) => `/api/other-items/${id}`,
};

/**
 * Утиліта для формування повного URL
 * @param {string} endpoint - Параметр endpoint з API_ENDPOINTS
 * @returns {string} - Повний URL до API
 */
export const getFullUrl = (endpoint) => {
  if (typeof endpoint === 'function') {
    throw new Error('Параметризований endpoint повинен бути викликаний з ID перед передачею до getFullUrl');
  }
  return `${API_URL}${endpoint}`;
};
