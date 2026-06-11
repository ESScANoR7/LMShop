import { useEffect, useState, useRef, useCallback } from 'react';
import { apiGet } from '../config/apiClient';

/**
 * Хук для кешування API запитів з автоматичним оновленням
 * @param {string} url - URL для запиту
 * @param {number} cacheTime - Час кешу в мс (за замовчуванням 5 хв)
 * @param {boolean} skip - Пропустити запит
 */
export const useApiCache = (url, cacheTime = 5 * 60 * 1000, skip = false) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cacheRef = useRef(new Map());
  const timeoutRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (skip || !url) {
      setLoading(false);
      return;
    }

    // Перевіряємо кеш
    const cached = cacheRef.current.get(url);
    if (cached && Date.now() - cached.timestamp < cacheTime) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await apiGet(url);

      // Зберігаємо в кеш
      cacheRef.current.set(url, {
        data: result,
        timestamp: Date.now(),
      });

      setData(result);
    } catch (err) {
      setError(err);
      // При помилці використовуємо старі дані з кешу
      if (cached) {
        setData(cached.data);
      }
    } finally {
      setLoading(false);
    }
  }, [url, skip, cacheTime]);

  useEffect(() => {
    fetchData();

    // Оновлюємо дані кожні N мс
    timeoutRef.current = setInterval(fetchData, cacheTime);

    return () => {
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
      }
    };
  }, [fetchData, cacheTime]);

  const refetch = useCallback(() => {
    cacheRef.current.delete(url);
    fetchData();
  }, [url, fetchData]);

  return { data, loading, error, refetch };
};

/**
 * Хук для отримання списку з пагінацією та фільтрацією
 */
export const useApiList = (baseUrl, pageSize = 20) => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page,
        limit: pageSize,
        ...(search && { search }),
      });

      const url = `${baseUrl}?${params.toString()}`;
      const result = await apiGet(url);

      setItems(result.items || result);
      setTotalCount(result.total || result.length);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, page, pageSize, search]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    items,
    page,
    setPage,
    search,
    setSearch,
    totalPages,
    totalCount,
    loading,
    error,
    refetch: fetchItems,
  };
};

/**
 * Хок для debounced пошуку
 */
export const useDebouncedSearch = (initialValue = '', delay = 300) => {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return { value, setValue, debouncedValue };
};
