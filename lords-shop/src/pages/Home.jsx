import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, ShieldCheck, Clock, ChevronRight, Flame, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Home = () => {
  const { t } = useTranslation();

  return (
    // 🔥 ГЛОБАЛЬНИЙ ФОН ТА СІТКА 🔥
    <div className="relative min-h-screen bg-zinc-950 overflow-hidden rounded-3xl -mx-4 px-4 sm:mx-0 sm:px-0">
      
      {/* Декоративна сітка на фоні */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      {/* Червоне світіння зверху (Центральне) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] bg-red-900/30 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 flex flex-col gap-20 pb-20 pt-16">
        
        {/* ========================================== */}
        {/* 1. ГОЛОВНИЙ БАНЕР (HERO) */}
        {/* ========================================== */}
        <section className="flex flex-col items-center text-center px-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
          
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tighter leading-tight drop-shadow-2xl">
            {t('home.hero.title')} <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-red-500 to-amber-500 drop-shadow-[0_0_20px_rgba(220,38,38,0.4)]">
              Твій Арсенал
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-10 font-medium">
            {t('home.hero.subtitle', 'Купуй ресурси, сапфіри та топові акаунти за найкращими цінами. Швидка доставка та гарантія безпеки 24/7.')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto">
            <Link 
              to="/resources" 
              className="px-8 py-4 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-black text-lg rounded-2xl transition-all hover:-translate-y-1 flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(185,28,28,0.4)] hover:shadow-[0_0_40px_rgba(220,38,38,0.6)] border border-red-500/50"
            >
              {t('home.hero.btnResources')} <ChevronRight className="w-6 h-6 text-amber-300" />
            </Link>
            <Link 
              to="/accounts" 
              className="px-8 py-4 bg-zinc-900/80 backdrop-blur-md hover:bg-zinc-800 text-amber-500 font-black text-lg rounded-2xl transition-all hover:-translate-y-1 border border-red-900/50 hover:border-amber-500/50 flex items-center justify-center shadow-lg group"
            >
              <Crown className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
              {t('home.hero.btnAccounts')}
            </Link>
          </div>
        </section>

        {/* ========================================== */}
        {/* 3. БЛОК ДОВІРИ (БЕЗ ЕФЕКТІВ НАВЕДЕННЯ + ПОЛУМ'Я ПО КУТАХ) */}
        {/* ========================================== */}
        <section className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Картка 1: Миттєва видача */}
            <div className="p-8 bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-zinc-800/50 flex flex-col items-center text-center shadow-xl relative overflow-hidden">
              {/* Вогонь у правому верхньому куті */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/20 rounded-full blur-[50px] pointer-events-none"></div>
              {/* Вогонь у лівому нижньому куті */}
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-red-600/20 rounded-full blur-[50px] pointer-events-none"></div>
              
              <div className="w-16 h-16 bg-gradient-to-br from-red-950 to-zinc-900 border border-red-900/50 text-amber-500 rounded-2xl flex items-center justify-center mb-6 relative z-10">
                <Zap className="w-8 h-8 drop-shadow-md" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3 relative z-10">{t('home.trust.title1')}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed relative z-10">{t('home.trust.desc1')}</p>
            </div>
            
            {/* Картка 2: 100% Безпека */}
            <div className="p-8 bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-zinc-800/50 flex flex-col items-center text-center shadow-xl relative overflow-hidden">
              {/* Вогонь у правому верхньому куті */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/20 rounded-full blur-[50px] pointer-events-none"></div>
              {/* Вогонь у лівому нижньому куті */}
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-600/20 rounded-full blur-[50px] pointer-events-none"></div>

              <div className="w-16 h-16 bg-gradient-to-br from-amber-950 to-zinc-900 border border-amber-900/50 text-amber-500 rounded-2xl flex items-center justify-center mb-6 relative z-10">
                <ShieldCheck className="w-8 h-8 drop-shadow-md" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3 relative z-10">{t('home.trust.title2')}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed relative z-10">{t('home.trust.desc2')}</p>
            </div>
            
            {/* Картка 3: Підтримка */}
            <div className="p-8 bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-zinc-800/50 flex flex-col items-center text-center shadow-xl relative overflow-hidden">
              {/* Вогонь у правому верхньому куті */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-500/20 rounded-full blur-[50px] pointer-events-none"></div>
              {/* Вогонь у лівому нижньому куті */}
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-500/20 rounded-full blur-[50px] pointer-events-none"></div>

              <div className="w-16 h-16 bg-gradient-to-br from-red-950 to-zinc-900 border border-red-900/50 text-amber-500 rounded-2xl flex items-center justify-center mb-6 relative z-10">
                <Clock className="w-8 h-8 drop-shadow-md" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3 relative z-10">{t('home.trust.title3')}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed relative z-10">{t('home.trust.desc3')}</p>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
};

export default Home;