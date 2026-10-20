import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Cookie, Shield, Check, X, Settings2, ChevronDown, ChevronUp } from 'lucide-react';

const STORAGE_KEY = 'lord_cookie_consent_v1';

const CookieConsent = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Категорії cookie
  const [preferences, setPreferences] = useState({
    necessary: true, // Завжди true
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Перевіряємо збережений вибір
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      // Показуємо банер через невелику затримку для плавності
      const timer = setTimeout(() => setIsVisible(true), 600);
      return () => clearTimeout(timer);
    } else {
      try {
        const parsed = JSON.parse(saved);
        setPreferences({
          necessary: true,
          analytics: Boolean(parsed.analytics),
          marketing: Boolean(parsed.marketing),
        });
      } catch (e) {
        setIsVisible(true);
      }
    }

    // Слухаємо подію відкриття налаштувань (наприклад, з футера)
    const handleOpenSettings = () => {
      setShowSettings(true);
      setIsVisible(true);
    };

    window.addEventListener('open_cookie_settings', handleOpenSettings);
    return () => window.removeEventListener('open_cookie_settings', handleOpenSettings);
  }, []);

  const saveConsent = (prefs) => {
    const consentData = {
      necessary: true,
      analytics: Boolean(prefs.analytics),
      marketing: Boolean(prefs.marketing),
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consentData));
    setPreferences(consentData);
    setIsVisible(false);
    setShowSettings(false);
  };

  const handleAcceptAll = () => {
    saveConsent({ necessary: true, analytics: true, marketing: true });
  };

  const handleAcceptNecessary = () => {
    saveConsent({ necessary: true, analytics: false, marketing: false });
  };

  const handleSaveCustom = () => {
    saveConsent(preferences);
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-xl z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
      style={{
        // Залишаємо місце праворуч для Telegram кнопки на планшетах/десктопі
        maxWidth: 'min(92vw, 560px)',
      }}
    >
      <div
        className="rounded-3xl border shadow-2xl backdrop-blur-xl p-5 sm:p-6 text-left transition-all"
        style={{
          background: 'var(--bg-card, rgba(15, 23, 42, 0.95))',
          borderColor: 'var(--border-accent, rgba(245, 158, 11, 0.3))',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 25px var(--accent-glow, rgba(245, 158, 11, 0.15))',
          color: 'var(--text-primary, #ffffff)',
        }}
      >
        {/* Шапка банера */}
        <div className="flex items-start gap-3.5 mb-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border"
            style={{
              background: 'rgba(245, 158, 11, 0.12)',
              color: 'var(--gold, #f59e0b)',
              borderColor: 'rgba(245, 158, 11, 0.25)',
            }}
          >
            <Cookie className="w-5 h-5 animate-spin-slow" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-black tracking-tight" style={{ color: 'var(--text-primary, #fff)' }}>
              {t('cookie.title', 'Файли Cookie та конфіденційність')}
            </h3>
            <p className="text-xs sm:text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-secondary, #94a3b8)' }}>
              {t('cookie.description', 'Ми використовуємо обов’язкові файли cookie для функціонування сайту, кошика та безпеки. Додаткові cookie допомагають нам аналізувати трафік та покращувати сервіс.')}
            </p>
          </div>
        </div>

        {/* Детальні налаштування категорій */}
        {showSettings && (
          <div className="mt-4 pt-4 border-t border-slate-700/60 space-y-3 animate-in fade-in duration-200">
            {/* 1. Обов'язкові */}
            <div
              className="p-3.5 rounded-2xl border flex items-center justify-between gap-3"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderColor: 'var(--border-default, #334155)',
              }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs sm:text-sm" style={{ color: 'var(--text-primary, #fff)' }}>
                    {t('cookie.necessary.title', 'Обов’язкові (технічні)')}
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {t('cookie.alwaysActive', 'Завжди активні')}
                  </span>
                </div>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary, #94a3b8)' }}>
                  {t('cookie.necessary.desc', 'Необхідні для авторизації, безпеки сесії та збереження товарів у кошику.')}
                </p>
              </div>
              <input
                type="checkbox"
                checked={true}
                disabled={true}
                className="w-4 h-4 accent-amber-500 rounded cursor-not-allowed opacity-80"
              />
            </div>

            {/* 2. Аналітичні */}
            <label
              className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-colors"
              style={{
                background: preferences.analytics ? 'rgba(245, 158, 11, 0.05)' : 'rgba(255, 255, 255, 0.03)',
                borderColor: preferences.analytics ? 'var(--border-accent, #f59e0b)' : 'var(--border-default, #334155)',
              }}
            >
              <div className="min-w-0">
                <span className="font-bold text-xs sm:text-sm" style={{ color: 'var(--text-primary, #fff)' }}>
                  {t('cookie.analytics.title', 'Аналітичні')}
                </span>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary, #94a3b8)' }}>
                  {t('cookie.analytics.desc', 'Допомагають вимірювати швидкість завантаження сторінок та оптимізувати магазин.')}
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.analytics}
                onChange={(e) => setPreferences(prev => ({ ...prev, analytics: e.target.checked }))}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </label>

            {/* 3. Маркетингові */}
            <label
              className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-colors"
              style={{
                background: preferences.marketing ? 'rgba(245, 158, 11, 0.05)' : 'rgba(255, 255, 255, 0.03)',
                borderColor: preferences.marketing ? 'var(--border-accent, #f59e0b)' : 'var(--border-default, #334155)',
              }}
            >
              <div className="min-w-0">
                <span className="font-bold text-xs sm:text-sm" style={{ color: 'var(--text-primary, #fff)' }}>
                  {t('cookie.marketing.title', 'Персоналізація та маркетинг')}
                </span>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary, #94a3b8)' }}>
                  {t('cookie.marketing.desc', 'Дозволяють адаптувати спеціальні знижки та персональні акції під ваш профіль.')}
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.marketing}
                onChange={(e) => setPreferences(prev => ({ ...prev, marketing: e.target.checked }))}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </label>
          </div>
        )}

        {/* Кнопки дій */}
        <div className="mt-4 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-700/40">
          {showSettings ? (
            <>
              <button
                type="button"
                onClick={handleSaveCustom}
                className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                {t('cookie.savePreferences', 'Зберегти вибір')}
              </button>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="py-2.5 px-3 border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold text-xs sm:text-sm rounded-xl transition-all"
              >
                {t('common.cancel', 'Назад')}
              </button>
            </>
          ) : (
            <>
              {/* Прийняти всі */}
              <button
                type="button"
                onClick={handleAcceptAll}
                className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-1.5"
                style={{
                  boxShadow: '0 0 15px rgba(245, 158, 11, 0.3)',
                }}
              >
                <Check className="w-4 h-4" />
                {t('cookie.acceptAll', 'Прийняти всі')}
              </button>

              {/* Тільки обов'язкові */}
              <button
                type="button"
                onClick={handleAcceptNecessary}
                className="py-2.5 px-3.5 bg-slate-800/80 hover:bg-slate-700/80 text-white font-bold text-xs sm:text-sm rounded-xl border border-slate-700 transition-all"
              >
                {t('cookie.rejectOptional', 'Тільки обов’язкові')}
              </button>

              {/* Налаштування */}
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="py-2.5 px-3 hover:bg-slate-800/60 text-slate-400 hover:text-white font-medium text-xs sm:text-sm rounded-xl transition-all flex items-center gap-1"
                title={t('cookie.customize', 'Налаштувати')}
              >
                <Settings2 className="w-4 h-4" />
                <span className="hidden sm:inline">{t('cookie.customize', 'Налаштувати')}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
