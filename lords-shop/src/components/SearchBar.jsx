import React, { useState, useCallback, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Компонент глобального пошуку
 */
const SearchBar = ({ isOpen, onClose, accounts = [], resources = [] }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  // Фільтруємо результати на основі запиту
  const results = useMemo(() => {
    if (!query.trim()) return { accounts: [], resources: [] };

    const lowerQuery = query.toLowerCase();

    return {
      accounts: accounts.filter(
        (acc) =>
          acc.name?.toLowerCase().includes(lowerQuery) ||
          acc.id?.toString().includes(query)
      ).slice(0, 5),
      resources: resources.filter(
        (res) =>
          res.name?.toLowerCase().includes(lowerQuery) ||
          res.id?.toString().includes(query)
      ).slice(0, 5),
    };
  }, [query, accounts, resources]);

  const handleSelect = useCallback((type, id) => {
    if (type === 'account') {
      navigate(`/accounts/${id}`);
    } else if (type === 'resource') {
      navigate(`/resources/${id}`);
    }
    onClose();
    setQuery('');
  }, [navigate, onClose]);

  const handleClear = useCallback(() => {
    setQuery('');
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-slate-900 rounded-xl border border-slate-700/50 shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="p-4 border-b border-slate-700/50 flex items-center gap-3">
            <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Пошук акаунтів, ресурсів..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-white placeholder-slate-400"
            />
            {query && (
              <button
                onClick={handleClear}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Results */}
          {query.trim() && (
            <div className="max-h-96 overflow-y-auto">
              {results.accounts.length === 0 && results.resources.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  Результатів не знайдено
                </div>
              ) : (
                <>
                  {results.accounts.length > 0 && (
                    <div className="px-4 py-3">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                        Акаунти
                      </p>
                      {results.accounts.map((acc) => (
                        <button
                          key={acc.id}
                          onClick={() => handleSelect('account', acc.id)}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors mb-2 last:mb-0"
                        >
                          <p className="text-white font-medium">{acc.name}</p>
                          <p className="text-sm text-slate-400">
                            Рівень {acc.level} • Might {acc.might}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}

                  {results.resources.length > 0 && (
                    <div className="px-4 py-3 border-t border-slate-700/50">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                        Ресурси
                      </p>
                      {results.resources.map((res) => (
                        <button
                          key={res.id}
                          onClick={() => handleSelect('resource', res.id)}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors mb-2 last:mb-0"
                        >
                          <p className="text-white font-medium">{res.name}</p>
                          <p className="text-sm text-slate-400">ID: {res.id}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Tips */}
          {!query.trim() && (
            <div className="p-4 text-sm text-slate-400">
              <p className="mb-2">💡 Введіть назву або ID для пошуку</p>
              <p>Натисніть ESC для закриття</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
