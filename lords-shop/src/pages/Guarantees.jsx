import React, { useState } from 'react';
import { ShieldCheck, Lock, RefreshCcw, ThumbsUp, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Guarantees = () => {
  const { t } = useTranslation();
  const [openFaq, setOpenFaq] = useState(null);

  // Отримуємо FAQ з перекладів
  const faqs = t('guarantees.faqs', { returnObjects: true });

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="pb-20 pt-8 max-w-5xl mx-auto px-4">
      
      {/* Заголовок */}
      <header className="text-center mb-16">
        <div className="w-20 h-20 bg-emerald-900/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-900/20">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">{t('guarantees.title')}</h1>
        <p className="text-slate-400 max-w-xl mx-auto">
          {t('guarantees.subtitle')}
        </p>
      </header>

      {/* Покроковий процес угоди */}
      <section className="mb-20">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">{t('guarantees.howItWorks')}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Крок 1 */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative group hover:border-blue-500/50 transition-colors">
            <div className="absolute -top-4 -left-4 w-8 h-8 bg-blue-600 text-white font-bold rounded-full flex items-center justify-center shadow-lg">1</div>
            <div className="w-12 h-12 bg-blue-900/30 text-blue-400 rounded-2xl flex items-center justify-center mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{t('guarantees.steps.step1.title')}</h3>
            <p className="text-sm text-slate-400">{t('guarantees.steps.step1.desc')}</p>
          </div>

          {/* Крок 2 */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative group hover:border-emerald-500/50 transition-colors">
            <div className="absolute -top-4 -left-4 w-8 h-8 bg-emerald-600 text-white font-bold rounded-full flex items-center justify-center shadow-lg">2</div>
            <div className="w-12 h-12 bg-emerald-900/30 text-emerald-400 rounded-2xl flex items-center justify-center mb-4">
              <RefreshCcw className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{t('guarantees.steps.step2.title')}</h3>
            <p className="text-sm text-slate-400">{t('guarantees.steps.step2.desc')}</p>
          </div>

          {/* Крок 3 */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative group hover:border-amber-500/50 transition-colors">
            <div className="absolute -top-4 -left-4 w-8 h-8 bg-amber-600 text-white font-bold rounded-full flex items-center justify-center shadow-lg">3</div>
            <div className="w-12 h-12 bg-amber-900/30 text-amber-400 rounded-2xl flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{t('guarantees.steps.step3.title')}</h3>
            <p className="text-sm text-slate-400">{t('guarantees.steps.step3.desc')}</p>
          </div>

          {/* Крок 4 */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative group hover:border-purple-500/50 transition-colors">
            <div className="absolute -top-4 -left-4 w-8 h-8 bg-purple-600 text-white font-bold rounded-full flex items-center justify-center shadow-lg">4</div>
            <div className="w-12 h-12 bg-purple-900/30 text-purple-400 rounded-2xl flex items-center justify-center mb-4">
              <ThumbsUp className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{t('guarantees.steps.step4.title')}</h3>
            <p className="text-sm text-slate-400">{t('guarantees.steps.step4.desc')}</p>
          </div>
        </div>
      </section>

      {/* FAQ Секція */}
      <section className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <HelpCircle className="w-8 h-8 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">{t('guarantees.faqTitle')}</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className={`bg-slate-900 border rounded-2xl overflow-hidden transition-colors ${openFaq === index ? 'border-blue-500/50 shadow-lg shadow-blue-900/10' : 'border-slate-800'}`}
            >
              <button 
                onClick={() => toggleFaq(index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
              >
                <span className="text-white font-bold pr-4">{faq.question}</span>
                {openFaq === index ? (
                  <ChevronUp className="w-5 h-5 text-blue-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-500 flex-shrink-0" />
                )}
              </button>
              
              <div 
                className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${openFaq === index ? 'max-h-40 pb-5 opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <p className="text-sm text-slate-400 leading-relaxed border-t border-slate-800 pt-4">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};

export default Guarantees;