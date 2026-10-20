import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const TelegramSupportButton = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);

  // Ховаємо кнопку в адмін-панелі, щоб не закривати робочі таблиці та кнопки
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const isUk = i18n.language?.startsWith('uk') ?? true;
  const statusText = isUk ? 'Оператор онлайн' : 'Support Online';
  const tooltipText = isUk ? 'Написати оператору' : 'Chat in Telegram';

  return (
    <aside
      aria-label="Telegram Support"
      className="fixed bottom-6 right-6 z-40 flex items-center gap-3 pointer-events-none group"
    >
      {/* Підказка / бейдж "Оператор онлайн" при наведенні або на десктопі */}
      <div
        className={`pointer-events-auto hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-xl transition-all duration-300 ${
          isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs font-bold text-slate-200 tracking-wide select-none">
          {statusText}
        </span>
      </div>

      {/* Кругла кнопка Telegram */}
      <a
        href="https://t.me/ALTLM1"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Telegram Support @ALTLM1"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="pointer-events-auto relative w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-tr from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-[0_8px_25px_rgba(14,165,233,0.45)] hover:shadow-[0_10px_30px_rgba(14,165,233,0.65)] hover:scale-110 active:scale-95 transition-all duration-200"
        title={`${statusText} — @ALTLM1`}
      >
        {/* Зелений індикатор 'Оператор онлайн' з пульсацією */}
        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-900 shadow-sm" />
        </span>

        {/* Автентична іконка Telegram (паперовий літачок) */}
        <svg
          className="w-7 h-7 translate-x-[-1px] translate-y-[1px] fill-white"
          viewBox="0 0 24 24"
        >
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.943z" />
        </svg>
      </a>
    </aside>
  );
};

export default TelegramSupportButton;
