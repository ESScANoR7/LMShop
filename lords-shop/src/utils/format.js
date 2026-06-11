/**
 * Форматує число як ціну
 */
export const formatPrice = (price, currency = 'UAH') => {
  const formatted = parseFloat(price || 0).toFixed(2);
  return `${formatted} ${currency}`;
};

/**
 * Форматує число як валюту без символу
 */
export const formatCurrency = (amount) => {
  return parseFloat(amount || 0).toFixed(2);
};

/**
 * Форматує число з розділювачем тисяч
 */
export const formatNumber = (num) => {
  return (num || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Скорочує текст до максимальної довжини
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

/**
 * Капіталізує перший символ
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Копіює текст в буфер обміну
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy:', error);
    return false;
  }
};

/**
 * Форматує дату
 */
export const formatDate = (date, locale = 'uk-UA') => {
  if (!date) return '';
  return new Date(date).toLocaleDateString(locale);
};

/**
 * Форматує час
 */
export const formatTime = (date, locale = 'uk-UA') => {
  if (!date) return '';
  return new Date(date).toLocaleTimeString(locale);
};

/**
 * Форматує дату та час
 */
export const formatDateTime = (date, locale = 'uk-UA') => {
  if (!date) return '';
  return new Date(date).toLocaleString(locale);
};

/**
 * Перетворює URL параметри в об'єкт
 */
export const parseQueryString = (queryString) => {
  const params = new URLSearchParams(queryString);
  const result = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
};

/**
 * Створює URL параметри з об'єкта
 */
export const createQueryString = (params) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      searchParams.append(key, value);
    }
  });
  return searchParams.toString();
};
