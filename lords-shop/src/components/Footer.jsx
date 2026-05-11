import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, MessageCircle, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-slate-950 border-t border-slate-800 pt-12 pb-8 mt-auto">
      <div className="container mx-auto px-4 max-w-[1400px]">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          
          {/* Блок 1: Про нас */}
          <div className="space-y-4">
            <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500 tracking-wider uppercase">
              LORDS SHOP
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Ваш надійний партнер у світі Lords Mobile. Ми надаємо безпечні послуги з продажу акаунтів, ресурсів та сапфірів з гарантією якості.
            </p>
          </div>

          {/* Блок 2: Навігація */}
          <div>
            <h4 className="text-white font-bold mb-4 uppercase text-sm tracking-wider">Навігація</h4>
            <ul className="space-y-2">
              <li><Link to="/" className="text-sm text-slate-400 hover:text-blue-400 transition-colors">Головна</Link></li>
              <li><Link to="/accounts" className="text-sm text-slate-400 hover:text-blue-400 transition-colors">Галерея акаунтів</Link></li>
              <li><Link to="/resources" className="text-sm text-slate-400 hover:text-blue-400 transition-colors">Купити ресурси</Link></li>
              <li><Link to="/sapphires" className="text-sm text-slate-400 hover:text-blue-400 transition-colors">Спеціальні пропозиції</Link></li>
            </ul>
          </div>

          {/* Блок 3: Клієнтам (Юридична інфа) */}
          <div>
            <h4 className="text-white font-bold mb-4 uppercase text-sm tracking-wider">Клієнтам</h4>
            <ul className="space-y-2">
              <li><Link to="/guarantees" className="text-sm text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Гарантії та FAQ</Link></li>
              <li><Link to="#" className="text-sm text-slate-400 hover:text-blue-400 transition-colors">Умови використання</Link></li>
              <li><Link to="#" className="text-sm text-slate-400 hover:text-blue-400 transition-colors">Політика конфіденційності</Link></li>
            </ul>
          </div>

          {/* Блок 4: Контакти */}
          <div>
            <h4 className="text-white font-bold mb-4 uppercase text-sm tracking-wider">Підтримка</h4>
            <ul className="space-y-3">
              <li>
                <a href="https://t.me/your_telegram" target="_blank" rel="noreferrer" className="flex items-center gap-3 text-sm text-slate-400 hover:text-blue-400 transition-colors p-2 bg-slate-900 rounded-lg border border-slate-800 hover:border-blue-500/50">
                  <MessageCircle className="w-5 h-5 text-blue-400" />
                  <span>Telegram Підтримка</span>
                </a>
              </li>
              <li>
                <a href="mailto:support@lords-shop.com" className="flex items-center gap-3 text-sm text-slate-400 hover:text-blue-400 transition-colors p-2 bg-slate-900 rounded-lg border border-slate-800 hover:border-blue-500/50">
                  <Mail className="w-5 h-5 text-emerald-400" />
                  <span>support@lords-shop.com</span>
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Копірайт */}
        <div className="pt-8 border-t border-slate-800/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} LORDS SHOP. Всі права захищені. Не є офіційним продуктом IGG.
          </p>
          <div className="flex gap-2">
            <div className="w-8 h-5 bg-slate-800 rounded border border-slate-700 flex items-center justify-center text-[8px] text-slate-400 font-bold">USDT</div>
            <div className="w-8 h-5 bg-slate-800 rounded border border-slate-700 flex items-center justify-center text-[8px] text-slate-400 font-bold">VISA</div>
          </div>
        </div>
        
      </div>
    </footer>
  );
};

export default Footer;