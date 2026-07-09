import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, MessageCircle, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    // 🔥 ФОН ФУТЕРА: ZINC + ЧЕРВОНА ЛІНІЯ ЗВЕРХУ 🔥
    <footer className="bg-zinc-950 border-t border-red-900/30 pt-12 pb-8 mt-auto">
      <div className="container mx-auto px-4 max-w-[1400px]">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          
          {/* Блок 1: Про нас */}
          <div className="space-y-4">
            <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-500 tracking-wider uppercase font-serif">
              LORDS SHOP
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {t('footer.aboutDesc')}
            </p>
          </div>

          {/* Блок 2: Навігація */}
          <div>
            <h4 className="text-white font-bold mb-4 uppercase text-sm tracking-wider">{t('footer.navTitle')}</h4>
            <ul className="space-y-2">
              <li><Link to="/" className="text-sm text-zinc-400 hover:text-amber-400 transition-colors">{t('footer.navHome')}</Link></li>
              <li><Link to="/accounts" className="text-sm text-zinc-400 hover:text-amber-400 transition-colors">{t('footer.navAccounts')}</Link></li>
              <li><Link to="/resources" className="text-sm text-zinc-400 hover:text-amber-400 transition-colors">{t('footer.navResources')}</Link></li>
              <li><Link to="/sapphires" className="text-sm text-zinc-400 hover:text-amber-400 transition-colors">{t('footer.navSpecial')}</Link></li>
            </ul>
          </div>

          {/* Блок 3: Клієнтам (Юридична інфа) */}
          <div>
            <h4 className="text-white font-bold mb-4 uppercase text-sm tracking-wider">{t('footer.clientTitle')}</h4>
            <ul className="space-y-2">
              <li><Link to="/guarantees" className="text-sm text-zinc-400 hover:text-amber-400 transition-colors flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> {t('footer.clientGuarantees')}</Link></li>
              <li><Link to="#" className="text-sm text-zinc-400 hover:text-amber-400 transition-colors">{t('footer.clientTerms')}</Link></li>
              <li><Link to="#" className="text-sm text-zinc-400 hover:text-amber-400 transition-colors">{t('footer.clientPrivacy')}</Link></li>
            </ul>
          </div>

          {/* Блок 4: Контакти */}
          <div>
            <h4 className="text-white font-bold mb-4 uppercase text-sm tracking-wider">{t('footer.supportTitle')}</h4>
            <ul className="space-y-3">
              <li>
                <a href="https://t.me/ESScANoR7" target="_blank" rel="noreferrer" className="flex items-center gap-3 text-sm text-zinc-400 hover:text-amber-400 transition-colors p-2 bg-zinc-900/50 rounded-lg border border-zinc-800 hover:border-red-500/50 group">
                  <MessageCircle className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform" />
                  <span>{t('footer.tgSupport')}</span>
                </a>
              </li>
              <li>
                <a href="mailto:support@lords-shop.com" className="flex items-center gap-3 text-sm text-zinc-400 hover:text-amber-400 transition-colors p-2 bg-zinc-900/50 rounded-lg border border-zinc-800 hover:border-red-500/50 group">
                  <Mail className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
                  <span>support@lords-shop.com</span>
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Копірайт */}
        <div className="pt-8 border-t border-zinc-800/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-500 font-medium">
            {t('footer.copyright', { year: currentYear })}
          </p>
          <div className="flex gap-2">
            <div className="w-8 h-5 bg-zinc-900 rounded border border-zinc-800 flex items-center justify-center text-[8px] text-zinc-500 font-bold">USDT</div>
            <div className="w-8 h-5 bg-zinc-900 rounded border border-zinc-800 flex items-center justify-center text-[8px] text-zinc-500 font-bold">VISA</div>
          </div>
        </div>
        
      </div>
    </footer>
  );
};

export default Footer;