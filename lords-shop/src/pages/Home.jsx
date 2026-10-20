import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, ShieldCheck, Clock, Crown, PackageOpen, Gem, Gift, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiGet } from '../config/apiClient';
import { PriceDisplay } from '../context/CurrencyContext';
import { API_ENDPOINTS, getFullUrl, getImageUrl } from '../config/api';

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [latestAccount, setLatestAccount] = useState(null);
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);

  // ==========================================
  // 🕵️ ПАСХАЛКА — 7 КЛІКІВ НА "Lord"
  // ==========================================
  const [eggClicks, setEggClicks] = useState(0);
  const handleLordClick = () => {
    const next = eggClicks + 1;
    setEggClicks(next);
    if (next >= 7) {
      setEggClicks(0);
      navigate('/easter-egg');
    }
    clearTimeout(window._lordEggTimer);
    window._lordEggTimer = setTimeout(() => setEggClicks(0), 1500);
  };
  // ==========================================

  useEffect(() => {
    const loadAccount = async () => {
      try {
        const data = await apiGet(getFullUrl(API_ENDPOINTS.ACCOUNTS));
        if (Array.isArray(data)) {
          const active = data.filter(acc => acc.status === 'active');
          if (active.length > 0) {
            const sorted = [...active].sort((a, b) => Number(b.id) - Number(a.id));
            setLatestAccount(sorted[0]);
          } else {
            setLatestAccount(null);
          }
        }
      } catch (err) {
        console.error("Помилка завантаження акаунта на головній:", err);
      } finally {
        setIsLoadingAccount(false);
      }
    };
    loadAccount();
  }, []);

  return (
    <div
      className="relative min-h-screen overflow-hidden rounded-3xl -mx-4 px-4 sm:mx-0 sm:px-0"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Декоративна сітка на фоні */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      {/* Світіння зверху — колір залежить від теми */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] blur-[120px] rounded-full pointer-events-none"
        style={{ background: 'var(--accent-glow)' }}
      />

      <div className="relative z-10 flex flex-col gap-16 pb-20 pt-12">

        {/* ========================================== */}
        {/* 1. ГОЛОВНИЙ БАНЕР (HERO) */}
        {/* ========================================== */}
        <section className="flex flex-col items-center text-center px-4 animate-in fade-in slide-in-from-bottom-8 duration-700">

          <h1
            className="text-4xl sm:text-6xl md:text-7xl font-black mb-6 tracking-tighter leading-tight drop-shadow-2xl"
            style={{ color: 'var(--text-primary)' }}
          >
            {/* "Lord" — пасхалка 7 кліків */}
            <span
              onClick={handleLordClick}
              className="cursor-pointer select-none transition-opacity hover:opacity-80"
              style={{ color: 'var(--text-accent)' }}
              title={eggClicks > 0 ? `🔓 ${eggClicks}/7` : undefined}
            >
              Lord
            </span>
            {/* "Treasury" — просто текст */}
            <span style={{ color: 'var(--text-primary)' }}>
              Treasury
            </span>
          </h1>

          <p
            className="text-base sm:text-lg md:text-xl max-w-2xl mb-8 font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t('home.hero.subtitle', 'Купуй ресурси, сапфіри та топові акаунти за найкращими цінами. Швидка доставка та гарантія безпеки 24/7.')}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 w-full sm:w-auto">
            {/* Головна кнопка — акцент */}
            <Link
              to="/accounts"
              className="w-full sm:w-auto px-8 py-4 text-white font-black text-base sm:text-lg rounded-2xl transition-all hover:-translate-y-1 flex items-center justify-center gap-2 border"
              style={{
                background: 'var(--accent)',
                borderColor: 'var(--border-accent)',
                boxShadow: '0 0 30px var(--accent-glow)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
            >
              <Crown className="w-5 h-5" style={{ color: 'var(--gold)' }} />
              {t('home.hero.btnAccounts')}
            </Link>
            {/* Вторинна кнопка */}
            <Link
              to="/resources"
              className="w-full sm:w-auto px-8 py-4 backdrop-blur-md font-black text-base sm:text-lg rounded-2xl transition-all hover:-translate-y-1 border flex items-center justify-center shadow-lg"
              style={{
                background: 'var(--bg-card)',
                color: 'var(--gold)',
                borderColor: 'var(--border-default)',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
            >
              <PackageOpen className="w-5 h-5 mr-2" />
              {t('home.hero.btnResources')}
            </Link>
          </div>
        </section>


        {/* ========================================== */}
        {/* 2. БАНЕР НАЙНОВІШОГО АКАУНТА */}
        {/* ========================================== */}
        <section className="container mx-auto px-4 max-w-6xl">
          <div
            className="flex items-center justify-between mb-6 pb-4 border-b"
            style={{ borderColor: 'var(--border-default)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="p-2.5 rounded-xl"
                style={{
                  background: 'var(--accent-muted)',
                  border: '1px solid var(--border-accent)',
                  color: 'var(--gold)',
                }}
              >
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black" style={{ color: 'var(--text-primary)' }}>
                  {t('home.latestAccount.sectionTitle')}
                </h2>
                <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {t('home.latestAccount.sectionSubtitle')}
                </p>
              </div>
            </div>
            <Link
              to="/accounts"
              className="flex items-center gap-1.5 font-bold text-xs sm:text-sm transition-colors hover:underline"
              style={{ color: 'var(--gold)' }}
            >
              {t('home.latestAccount.allBtn')}
            </Link>
          </div>

          {isLoadingAccount ? (
            <div
              className="text-center py-16 rounded-3xl border animate-pulse font-bold"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
            >
              {t('home.latestAccount.loading')}
            </div>
          ) : !latestAccount ? (
            <div
              className="text-center py-12 rounded-3xl p-6 border shadow-lg"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
            >
              <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
                {t('home.latestAccount.emptyTitle')}
              </h3>
              <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>
                {t('home.latestAccount.emptyDesc')}
              </p>
              <Link
                to="/resources"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-md transition-transform hover:-translate-y-0.5"
                style={{ background: 'var(--accent)' }}
              >
                {t('home.hero.btnResources')} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div
              className="group relative rounded-3xl border overflow-hidden backdrop-blur-md shadow-2xl transition-all hover:border-amber-500/50"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
            >
              <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-[100px] pointer-events-none opacity-40" style={{ background: 'var(--accent-glow)' }} />
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8 relative z-10 items-center">
                {/* Зображення / Прев'ю */}
                <div className="lg:col-span-5 relative">
                  <div
                    className="relative aspect-video sm:aspect-[16/10] rounded-2xl overflow-hidden border flex items-center justify-center shadow-lg"
                    style={{ background: 'var(--bg-base)', borderColor: 'var(--border-default)' }}
                  >
                    {latestAccount.images && latestAccount.images.length > 0 ? (
                      <img
                        src={getImageUrl(latestAccount.images[0])}
                        alt={latestAccount.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <Crown className="w-16 h-16" style={{ color: 'var(--border-default)' }} />
                    )}

                    {/* Бедж "Нове надходження" */}
                    <div className="absolute top-3 left-3">
                      <span
                        className="px-3 py-1 text-xs font-black rounded-full shadow-lg backdrop-blur-md border flex items-center gap-1.5"
                        style={{
                          background: 'rgba(0,0,0,0.75)',
                          borderColor: 'var(--border-accent)',
                          color: 'var(--gold)',
                        }}
                      >
                        {t('home.latestAccount.badge')}
                      </span>
                    </div>

                    {/* ID */}
                    <div className="absolute top-3 right-3">
                      <span
                        className="px-2.5 py-1 text-xs font-bold rounded-lg shadow-md backdrop-blur-md border"
                        style={{
                          background: 'rgba(0,0,0,0.75)',
                          borderColor: 'var(--border-default)',
                          color: '#fff',
                        }}
                      >
                        ID: #{latestAccount.id}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Інформація та Дії */}
                <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                  <div>
                    <h3
                      className="text-2xl sm:text-3xl font-black mb-2 tracking-tight line-clamp-2"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {latestAccount.title}
                    </h3>

                    <p
                      className="text-sm sm:text-base leading-relaxed line-clamp-3 mb-4 font-medium"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {latestAccount.shortDesc || latestAccount.description}
                    </p>

                    {/* Теги */}
                    {latestAccount.tags && latestAccount.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {latestAccount.tags.slice(0, 5).map(tag => tag.trim() && (
                          <span
                            key={tag}
                            className="text-xs font-bold px-2.5 py-1 rounded-lg border shadow-sm"
                            style={{
                              background: 'var(--bg-base)',
                              borderColor: 'var(--border-default)',
                              color: 'var(--gold)',
                            }}
                          >
                            #{tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Нижня панель: Ціна та кнопки */}
                  <div
                    className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t"
                    style={{ borderColor: 'var(--border-default)' }}
                  >
                    <div>
                      <span className="text-xs font-bold block uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {t('accountDetails.price', 'Ціна')}
                      </span>
                      <PriceDisplay price={latestAccount.price} size="lg" />
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <Link
                        to={`/accounts/${latestAccount.id}`}
                        className="flex-1 sm:flex-initial px-6 py-3 rounded-xl text-white font-black text-sm tracking-wide shadow-lg transition-all hover:scale-105 flex items-center justify-center gap-2 border"
                        style={{
                          background: 'var(--accent)',
                          borderColor: 'var(--border-accent)',
                        }}
                      >
                        <Crown className="w-4 h-4" style={{ color: 'var(--gold)' }} />
                        {t('home.latestAccount.viewBtn')}
                      </Link>

                      <Link
                        to="/accounts"
                        className="px-5 py-3 rounded-xl font-bold text-sm tracking-wide transition-all border flex items-center justify-center"
                        style={{
                          background: 'var(--bg-base)',
                          borderColor: 'var(--border-default)',
                          color: 'var(--text-primary)',
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-accent)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
                      >
                        {t('home.latestAccount.allBtn')}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ========================================== */}
        {/* 4. БЛОК ДОВІРИ */}
        {/* ========================================== */}
        <section className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Картка 1: Миттєва видача */}
            <div
              className="p-8 backdrop-blur-md rounded-3xl flex flex-col items-center text-center shadow-xl relative overflow-hidden border"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[50px] pointer-events-none" style={{ background: 'var(--accent-glow)' }} />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full blur-[50px] pointer-events-none" style={{ background: 'rgba(245,158,11,0.15)' }} />
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 relative z-10 border"
                style={{
                  background: 'var(--accent-muted)',
                  borderColor: 'var(--border-accent)',
                  color: 'var(--gold)',
                }}
              >
                <Zap className="w-8 h-8 drop-shadow-md" />
              </div>
              <h3 className="text-2xl font-bold mb-3 relative z-10" style={{ color: 'var(--text-primary)' }}>{t('home.trust.title1')}</h3>
              <p className="text-sm leading-relaxed relative z-10" style={{ color: 'var(--text-secondary)' }}>{t('home.trust.desc1')}</p>
            </div>

            {/* Картка 2: 100% Безпека */}
            <div
              className="p-8 backdrop-blur-md rounded-3xl flex flex-col items-center text-center shadow-xl relative overflow-hidden border"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[50px] pointer-events-none" style={{ background: 'rgba(245,158,11,0.15)' }} />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full blur-[50px] pointer-events-none" style={{ background: 'var(--accent-glow)' }} />
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 relative z-10 border"
                style={{
                  background: 'rgba(245,158,11,0.1)',
                  borderColor: 'rgba(245,158,11,0.3)',
                  color: 'var(--gold)',
                }}
              >
                <ShieldCheck className="w-8 h-8 drop-shadow-md" />
              </div>
              <h3 className="text-2xl font-bold mb-3 relative z-10" style={{ color: 'var(--text-primary)' }}>{t('home.trust.title2')}</h3>
              <p className="text-sm leading-relaxed relative z-10" style={{ color: 'var(--text-secondary)' }}>{t('home.trust.desc2')}</p>
            </div>

            {/* Картка 3: Підтримка */}
            <div
              className="p-8 backdrop-blur-md rounded-3xl flex flex-col items-center text-center shadow-xl relative overflow-hidden border"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[50px] pointer-events-none" style={{ background: 'var(--accent-glow)' }} />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full blur-[50px] pointer-events-none" style={{ background: 'rgba(245,158,11,0.15)' }} />
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 relative z-10 border"
                style={{
                  background: 'var(--accent-muted)',
                  borderColor: 'var(--border-accent)',
                  color: 'var(--gold)',
                }}
              >
                <Clock className="w-8 h-8 drop-shadow-md" />
              </div>
              <h3 className="text-2xl font-bold mb-3 relative z-10" style={{ color: 'var(--text-primary)' }}>{t('home.trust.title3')}</h3>
              <p className="text-sm leading-relaxed relative z-10" style={{ color: 'var(--text-secondary)' }}>{t('home.trust.desc3')}</p>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
};

export default Home;