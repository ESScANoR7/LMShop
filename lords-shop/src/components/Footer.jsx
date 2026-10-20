import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, MessageCircle, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="pt-12 pb-8 mt-auto"
      style={{
        background: 'var(--bg-base)',
        borderTop: '1px solid var(--border-default)',
      }}
    >
      <div className="container mx-auto px-4 max-w-[1400px]">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          
          {/* Блок 1: Про нас */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <img src="/logo.png" alt="LordTreasury" className="w-9 h-9 object-contain" style={{ filter: 'drop-shadow(0 0 5px rgba(245,158,11,0.4))' }} />
              <h3
                className="text-xl font-black tracking-wider"
                style={{ color: 'var(--text-accent)' }}
              >
                Lord<span style={{ color: 'var(--text-primary)' }}>Treasury</span>
              </h3>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {t('footer.aboutDesc')}
            </p>
          </div>

          {/* Блок 2: Навігація */}
          <div>
            <h4
              className="font-bold mb-4 uppercase text-sm tracking-wider"
              style={{ color: 'var(--text-primary)' }}
            >
              {t('footer.navTitle')}
            </h4>
            <ul className="space-y-2">
              {[
                { to: '/', label: t('footer.navHome') },
                { to: '/accounts', label: t('footer.navAccounts') },
                { to: '/resources', label: t('footer.navResources') },
                { to: '/other-items', label: t('footer.navSpecial') },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-sm transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Блок 3: Клієнтам */}
          <div>
            <h4
              className="font-bold mb-4 uppercase text-sm tracking-wider"
              style={{ color: 'var(--text-primary)' }}
            >
              {t('footer.clientTitle')}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/guarantees"
                  className="text-sm transition-colors flex items-center gap-2"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                >
                  <ShieldCheck className="w-4 h-4" /> {t('footer.clientGuarantees')}
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-sm transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                >
                  {t('footer.clientTerms')}
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="text-sm transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                >
                  {t('footer.clientPrivacy')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Блок 4: Контакти */}
          <div>
            <h4
              className="font-bold mb-4 uppercase text-sm tracking-wider"
              style={{ color: 'var(--text-primary)' }}
            >
              {t('footer.supportTitle')}
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://t.me/ALTLM1"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 text-sm transition-all p-2 rounded-lg border group"
                  style={{
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-card)',
                    borderColor: 'var(--border-default)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = 'var(--gold)';
                    e.currentTarget.style.borderColor = 'var(--border-accent)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.borderColor = 'var(--border-default)';
                  }}
                >
                  <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" style={{ color: 'var(--text-accent)' }} />
                  <span>{t('footer.tgSupport')}</span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:lordtreasury@gmail.com"
                  className="flex items-center gap-3 text-sm transition-all p-2 rounded-lg border group"
                  style={{
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-card)',
                    borderColor: 'var(--border-default)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = 'var(--gold)';
                    e.currentTarget.style.borderColor = 'var(--border-accent)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.borderColor = 'var(--border-default)';
                  }}
                >
                  <Mail className="w-5 h-5 group-hover:scale-110 transition-transform" style={{ color: 'var(--gold)' }} />
                  <span>lordtreasury@gmail.com</span>
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Копірайт */}
        <div
          className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 border-t"
          style={{ borderColor: 'var(--border-default)' }}
        >
          <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {t('footer.copyright', { year: currentYear })}
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open_cookie_settings'))}
              className="text-xs transition-colors hover:underline cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('cookie.footerLink', 'Налаштування cookie')}
            </button>
            <div className="flex gap-2">
              {['USDT', 'VISA'].map(label => (
                <div
                  key={label}
                  className="w-8 h-5 rounded flex items-center justify-center text-[8px] font-bold border"
                  style={{
                    background: 'var(--bg-card)',
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
        
      </div>
    </footer>
  );
};

export default Footer;