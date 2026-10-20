import React, { createContext, useContext, useState, useEffect } from 'react';
import { Coins } from 'lucide-react';
import { getFullUrl } from '../config/api';

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrencyState] = useState(() => {
    return localStorage.getItem('selected_currency') || 'USD';
  });

  const [rate, setRate] = useState(() => {
    const saved = localStorage.getItem('usd_to_uah_rate');
    return saved ? parseFloat(saved) : 41.5;
  });

  // Завантажуємо актуальний курс з бекенду (налаштування магазину)
  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await fetch(getFullUrl('/api/store/status'));
        if (res.ok) {
          const data = await res.json();
          if (data && data.usd_to_uah_rate) {
            const newRate = parseFloat(data.usd_to_uah_rate);
            if (!isNaN(newRate) && newRate > 0) {
              setRate(newRate);
              localStorage.setItem('usd_to_uah_rate', newRate.toString());
            }
          }
        }
      } catch (err) {
        console.warn('CurrencyContext: Could not fetch store currency rate:', err);
      }
    };
    fetchRate();
  }, []);

  const setCurrency = (newCurr) => {
    setCurrencyState(newCurr);
    localStorage.setItem('selected_currency', newCurr);
  };

  // Розрахунок ціни в обраній валюті
  const convertPrice = (amountInUsd) => {
    const num = parseFloat(amountInUsd || 0);
    if (currency === 'UAH') {
      return num * rate;
    }
    return num;
  };

  // Форматування відображення: наприклад "$40.00" або "1 660 ₴"
  const formatAmount = (amountInUsd) => {
    const num = parseFloat(amountInUsd || 0);
    if (currency === 'UAH') {
      const uah = num * rate;
      const formatted = uah.toLocaleString('uk-UA', {
        minimumFractionDigits: uah % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2
      });
      return `${formatted} ₴`;
    } else {
      return `$${num.toFixed(2)}`;
    }
  };

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency,
      rate,
      setRate,
      convertPrice,
      formatAmount,
      isUah: currency === 'UAH'
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

/**
 * Універсальний компонент для відображення ціни з урахуванням обраної валюти
 * і показом еквіваленту в монетах сайту біля гривні.
 */
export const PriceDisplay = ({ 
  price = 0, 
  originalPrice = null, 
  className = "",
  coinsClassName = "",
  size = "normal" // 'sm' | 'normal' | 'lg' | 'xl'
}) => {
  const { currency, formatAmount, isUah } = useCurrency();
  const numPrice = parseFloat(price || 0);
  const numOrig = originalPrice !== null ? parseFloat(originalPrice || 0) : null;
  const hasDiscount = numOrig !== null && numOrig > numPrice;

  // Визначення розмірів шрифтів
  let mainTextClass = "text-xl font-black";
  let origTextClass = "text-xs line-through opacity-70 font-bold";
  let coinBadgeClass = "text-[11px] font-bold";

  if (size === 'sm') {
    mainTextClass = "text-sm font-black";
    origTextClass = "text-[10px] line-through opacity-70 font-bold";
    coinBadgeClass = "text-[9px] font-bold";
  } else if (size === 'lg') {
    mainTextClass = "text-2xl font-black";
    origTextClass = "text-xs line-through opacity-70 font-bold";
    coinBadgeClass = "text-xs font-bold";
  } else if (size === 'xl') {
    mainTextClass = "text-3xl font-black";
    origTextClass = "text-sm line-through opacity-70 font-bold";
    coinBadgeClass = "text-xs font-bold";
  }

  return (
    <div className={`inline-flex flex-col items-start ${className}`}>
      {hasDiscount && (
        <span className={`${origTextClass} text-slate-400`}>
          {formatAmount(numOrig)}
        </span>
      )}
      <div className="inline-flex items-center flex-wrap gap-1.5">
        <span className={mainTextClass}>
          {formatAmount(numPrice)}
        </span>

        {/* Біля ціни у гривні показуємо еквівалент у монетах сайту з іконкою монет */}
        {isUah && (
          <span 
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg border shadow-sm backdrop-blur-md ${coinBadgeClass} ${coinsClassName}`}
            style={{
              background: 'rgba(245, 158, 11, 0.12)',
              borderColor: 'rgba(245, 158, 11, 0.3)',
              color: 'var(--gold, #f59e0b)'
            }}
            title="1 монета сайту = $1 USD"
          >
            <Coins className="w-3 h-3 text-amber-400" />
            <span>{numPrice.toFixed(numPrice % 1 === 0 ? 0 : 2)} монет</span>
          </span>
        )}
      </div>
    </div>
  );
};
