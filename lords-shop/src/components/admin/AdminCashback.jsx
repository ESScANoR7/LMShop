import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Coins, Percent, Shield, Save, Users, Zap, CheckCircle2, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiGet, apiPut, handleApiError } from '../../config/apiClient';
import { API_ENDPOINTS, getFullUrl } from '../../config/api';

const AdminCashback = () => {
  const { t } = useTranslation();
  
  // Вкладки: 'cashback' або 'referral'
  const [activeTab, setActiveTab] = useState('cashback');

  // --- СТАНИ ДЛЯ КЕШБЕКУ ---
  const [cashbackPercent, setCashbackPercent] = useState('5');
  const [cashbackExcluded, setCashbackExcluded] = useState('account');

  // --- СТАНИ ДЛЯ РЕФЕРАЛЬНОЇ СИСТЕМИ ---
  const [refPercent, setRefPercent] = useState('5');
  const [refIsActive, setRefIsActive] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Завантаження кешбеку
        const cbData = await apiGet(getFullUrl(API_ENDPOINTS.CASHBACK_SETTINGS));
        if (cbData) {
          setCashbackPercent(cbData.percent);
          setCashbackExcluded(cbData.excluded_types || '');
        }

        // Завантаження реферальних налаштувань
        const refData = await apiGet(getFullUrl('/api/referral/settings'));
        if (refData) {
          setRefPercent(refData.percent);
          setRefIsActive(refData.is_active);
        }
      } catch (error) {
        handleApiError(error, t('common.error'));
      }
    };
    fetchSettings();
  }, [t]);

  // --- ЗБЕРЕЖЕННЯ КЕШБЕКУ ---
  const handleSaveCashbackSettings = async () => {
    const toastId = toast.loading(t('common.loading'));
    try {
      await apiPut(getFullUrl(API_ENDPOINTS.CASHBACK_SETTINGS), {
        percent: parseFloat(cashbackPercent),
        excluded_types: cashbackExcluded
      });

      toast.success(t('common.success'), { id: toastId });
    } catch (error) {
      handleApiError(error, t('common.error'));
      toast.dismiss(toastId);
    }
  };

  const handleToggleCashbackExclude = (type) => {
    let currentArray = cashbackExcluded ? cashbackExcluded.split(',') : [];
    if (currentArray.includes(type)) {
      currentArray = currentArray.filter(t => t !== type);
    } else {
      currentArray.push(type);
    }
    setCashbackExcluded(currentArray.join(','));
  };

  // --- ЗБЕРЕЖЕННЯ РЕФЕРАЛКИ ---
  const handleSaveReferralSettings = async () => {
    const toastId = toast.loading('Збереження налаштувань...');
    try {
      await apiPut(getFullUrl('/api/referral/settings'), {
        percent: parseFloat(refPercent),
        is_active: refIsActive
      });

      toast.success('Налаштування реферальної системи збережено!', { id: toastId });
    } catch (error) {
      handleApiError(error, 'Помилка збереження');
      toast.dismiss(toastId);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      
      {/* ГОЛОВНА ШАПКА */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
              <Coins className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-white">Фінансові нагороди</h1>
          </div>
          <p className="text-sm text-slate-400 max-w-xl mt-2">
            Керуйте відсотками кешбеку та бонусами для реферальної програми. Ці налаштування безпосередньо впливають на баланс користувачів.
          </p>
        </div>

        {/* ТУМБЛЕР ВКЛАДОК */}
        <div className="flex bg-slate-800/50 p-1.5 rounded-xl border border-slate-700 shadow-inner">
          <button 
            onClick={() => setActiveTab('cashback')} 
            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'cashback' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            <Percent className="w-4 h-4" /> Кешбек
          </button>
          <button 
            onClick={() => setActiveTab('referral')} 
            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'referral' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            <Users className="w-4 h-4" /> Реферали
          </button>
        </div>
      </div>

      {/* ====================================================== */}
      {/* 🔥 ВКЛАДКА КЕШБЕКУ 🔥 */}
      {/* ====================================================== */}
      {activeTab === 'cashback' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-right-4 duration-300">
          
          {/* НАЛАШТУВАННЯ ВІДСОТКА */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Percent className="w-5 h-5 text-amber-400" /> Налаштування Кешбеку
              </h3>
              <div className="mb-6">
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">{t('admin.cashback.baseRateLabel')}</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={cashbackPercent} 
                    onChange={(e) => setCashbackPercent(e.target.value)} 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-3xl font-black text-amber-400 outline-none focus:border-amber-500 transition-colors" 
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-600">%</div>
                </div>
              </div>
              <div className="p-4 bg-amber-900/10 border border-amber-500/20 rounded-xl">
                <p className="text-sm text-amber-400/80">
                  💡 З покупки на суму $100 клієнт отримає <b>${(100 * (cashbackPercent / 100)).toFixed(2)}</b> кешбеку на баланс.
                </p>
              </div>
            </div>
          </div>

          {/* ВИКЛЮЧЕННЯ ТОВАРІВ */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-400" /> {t('admin.cashback.restrictionsTitle')}
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                {t('admin.cashback.restrictionsDesc')}
              </p>
              
              <div className="space-y-2 mb-6">
                {[
                  { type: 'account', name: t('admin.cashback.catAccount') },
                  { type: 'rss', name: t('admin.cashback.catRss') },
                  { type: 'gems', name: t('admin.cashback.catGems') },
                  { type: 'special', name: t('admin.cashback.catSpecial') }
                ].map(cat => {
                  const isExcluded = cashbackExcluded.split(',').includes(cat.type);
                  return (
                    <button 
                      key={cat.type}
                      type="button"
                      onClick={() => handleToggleCashbackExclude(cat.type)}
                      className={`w-full p-3 rounded-xl border text-sm font-bold transition-all text-left flex justify-between items-center ${isExcluded ? 'bg-red-950/40 border-red-500/40 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'}`}
                    >
                      {cat.name}
                      <div className={`w-10 h-5 rounded-full relative transition-all ${isExcluded ? 'bg-red-500' : 'bg-slate-600'}`}>
                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isExcluded ? 'right-1' : 'left-1'}`}></div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button 
              onClick={handleSaveCashbackSettings}
              className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 uppercase tracking-wide"
            >
              <Save className="w-5 h-5"/> Зберегти кешбек
            </button>
          </div>
        </div>
      )}

      {/* ====================================================== */}
      {/* 🔥 ВКЛАДКА РЕФЕРАЛІВ 🔥 */}
      {/* ====================================================== */}
      {activeTab === 'referral' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-left-4 duration-300">
          
          {/* НАЛАШТУВАННЯ ВІДСОТКА РЕФЕРАЛІВ */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" /> Реферальна система
                </h3>
                
                {/* Тумблер Увімкнути/Вимкнути */}
                <button 
                  onClick={() => setRefIsActive(!refIsActive)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${refIsActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}
                >
                  {refIsActive ? <CheckCircle2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  {refIsActive ? 'Увімкнена' : 'Вимкнена'}
                </button>
              </div>

              <p className="text-xs text-slate-400 mb-6">
                Вкажіть відсоток від суми замовлення, який отримає гравець, якщо за його посиланням зареєструється новий клієнт і зробить покупку.
              </p>

              <div className={`mb-6 transition-all ${!refIsActive ? 'opacity-50 pointer-events-none' : ''}`}>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">Відсоток винагороди</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={refPercent} 
                    onChange={(e) => setRefPercent(e.target.value)} 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-3xl font-black text-blue-400 outline-none focus:border-blue-500 transition-colors" 
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-600">%</div>
                </div>
              </div>

              <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl">
                <p className="text-sm text-blue-400/80">
                  💡 Якщо реферал зробить покупку на $100, запросивший гравець отримає <b>${(100 * (refPercent / 100)).toFixed(2)}</b> на баланс.
                </p>
              </div>
            </div>
          </div>

          {/* ІНФОРМАЦІЯ ПРО ПРАВИЛА */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" /> Як це працює?
              </h3>
              
              <ul className="space-y-4 text-sm text-slate-300">
                <li className="flex gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-slate-400 text-xs font-bold shrink-0">1</span>
                  <span>Бонус нараховується <b>тільки тоді</b>, коли замовлення реферала переходить у статус <span className="text-emerald-400 font-bold">"ВИКОНАНО"</span>.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-slate-400 text-xs font-bold shrink-0">2</span>
                  <span>Якщо реферал застосовує <b>промокод гільдії</b>, нарахування за це замовлення автоматично скасовується (бо маржа сайту нульова).</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-slate-400 text-xs font-bold shrink-0">3</span>
                  <span>При купівлі товарів за гроші з балансу (USDT) — реферальні бонуси не нараховуються.</span>
                </li>
              </ul>
            </div>

            <button 
              onClick={handleSaveReferralSettings}
              className="w-full mt-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:shadow-[0_0_25px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2 uppercase tracking-wide"
            >
              <Save className="w-5 h-5"/> Зберегти рефералку
            </button>
          </div>

        </div>
      )}

    </div>
  );
};

export default AdminCashback;