import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Lock, EyeOff, Cookie, Database, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Privacy = () => {
  const { t } = useTranslation();

  const sections = [
    {
      icon: <Database className="w-6 h-6 text-blue-400" />,
      title: t('privacy.sections.collectTitle'),
      text: t('privacy.sections.collectText'),
    },
    {
      icon: <Lock className="w-6 h-6 text-emerald-400" />,
      title: t('privacy.sections.usageTitle'),
      text: t('privacy.sections.usageText'),
    },
    {
      icon: <EyeOff className="w-6 h-6 text-amber-400" />,
      title: t('privacy.sections.sharingTitle'),
      text: t('privacy.sections.sharingText'),
    },
    {
      icon: <Cookie className="w-6 h-6 text-orange-400" />,
      title: t('privacy.sections.cookiesTitle'),
      text: t('privacy.sections.cookiesText'),
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-indigo-400" />,
      title: t('privacy.sections.securityTitle'),
      text: t('privacy.sections.securityText'),
    },
  ];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="text-center mb-10">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border"
          style={{
            background: 'var(--accent-muted)',
            borderColor: 'var(--border-accent)',
            color: 'var(--gold)',
          }}
        >
          <ShieldCheck className="w-4 h-4" />
          {t('privacy.lastUpdated')}
        </div>
        <h1
          className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          {t('privacy.title')}
        </h1>
        <p
          className="text-sm sm:text-base max-w-2xl mx-auto leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          {t('privacy.subtitle')}
        </p>
      </div>

      {/* Sections List */}
      <div className="space-y-6">
        {sections.map((section, idx) => (
          <div
            key={idx}
            className="p-6 sm:p-7 rounded-3xl border transition-all shadow-md"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-default)',
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="p-3 rounded-2xl flex-shrink-0 border"
                style={{
                  background: 'var(--bg-base)',
                  borderColor: 'var(--border-default)',
                }}
              >
                {section.icon}
              </div>
              <div className="space-y-2">
                <h2
                  className="text-lg sm:text-xl font-bold tracking-tight"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {section.title}
                </h2>
                <p
                  className="text-sm sm:text-base leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {section.text}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Navigation Footer */}
      <div
        className="mt-12 p-6 sm:p-8 rounded-3xl border text-center flex flex-col sm:flex-row items-center justify-between gap-4"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border-default)',
        }}
      >
        <div className="text-left">
          <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
            {t('footer.clientTerms')}
          </h3>
          <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
            {t('terms.subtitle')}
          </p>
        </div>
        <Link
          to="/terms"
          className="px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 border transition-all hover:-translate-y-0.5"
          style={{
            background: 'var(--accent)',
            color: '#fff',
            borderColor: 'var(--border-accent)',
          }}
        >
          {t('footer.clientTerms')} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

export default Privacy;
