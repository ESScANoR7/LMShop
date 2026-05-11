import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, ShieldCheck, Clock, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next'; // Додаємо хук для перекладу

const Home = () => {
  const { t } = useTranslation(); // Ініціалізуємо переклад

  return (
    <div className="flex flex-col gap-16 pb-20">
      
      {/* 1. ГОЛОВНИЙ БАНЕР */}
      <section className="relative mt-10 lg:mt-20 flex flex-col items-center text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 blur-[100px] rounded-full -z-10 pointer-events-none"></div>
        
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
          {t('home.hero.title')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Lords Mobile</span>
        </h1>
        
        <p className="text-lg text-slate-400 max-w-2xl mb-10">
          {t('home.hero.subtitle')}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Link to="/resources" className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all hover:scale-105 flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20">
            {t('home.hero.btnResources')} <ChevronRight className="w-5 h-5" />
          </Link>
          <Link to="/accounts" className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-all hover:scale-105 border border-slate-700 flex items-center justify-center">
            {t('home.hero.btnAccounts')}
          </Link>
        </div>
      </section>

      {/* 2. БЛОК ДОВІРИ */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="p-6 bg-slate-800/30 rounded-2xl border border-slate-700/50 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-blue-900/50 text-blue-400 rounded-full flex items-center justify-center mb-4">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">{t('home.trust.title1')}</h3>
          <p className="text-slate-400 text-sm">{t('home.trust.desc1')}</p>
        </div>
        
        <div className="p-6 bg-slate-800/30 rounded-2xl border border-slate-700/50 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-emerald-900/50 text-emerald-400 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">{t('home.trust.title2')}</h3>
          <p className="text-slate-400 text-sm">{t('home.trust.desc2')}</p>
        </div>
        
        <div className="p-6 bg-slate-800/30 rounded-2xl border border-slate-700/50 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-purple-900/50 text-purple-400 rounded-full flex items-center justify-center mb-4">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">{t('home.trust.title3')}</h3>
          <p className="text-slate-400 text-sm">{t('home.trust.desc3')}</p>
        </div>
      </section>

      {/* 3. ГАРЯЧА ПРОПОЗИЦІЯ */}
      <section className="mt-8">
        <div className="relative overflow-hidden p-8 bg-gradient-to-r from-blue-900/40 to-slate-900 border border-blue-500/30 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none"></div>
          
          <div className="z-10">
            <span className="inline-block px-3 py-1 bg-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider rounded-full mb-3">
              {t('home.offer.badge')}
            </span>
            <h2 className="text-3xl font-bold text-white mb-2">{t('home.offer.title')}</h2>
            <p className="text-slate-300">{t('home.offer.desc')}</p>
          </div>
          
          <div className="z-10 flex items-center gap-6">
            <div className="text-right">
              <div className="text-sm text-slate-400 line-through">1200 UAH</div>
              <div className="text-3xl font-bold text-emerald-400">899 UAH</div>
            </div>
            <button className="px-6 py-3 bg-white text-slate-900 hover:bg-slate-200 font-bold rounded-xl transition-colors">
              {t('home.offer.buy')}
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;