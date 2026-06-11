import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Coins, Percent, Shield, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiGet, apiPut, handleApiError } from '../../config/apiClient';
import { API_ENDPOINTS, getFullUrl } from '../../config/api';

const AdminCashback = () => {
  const { t } = useTranslation();
  const [cashbackPercent, setCashbackPercent] = useState('5');
  const [cashbackExcluded, setCashbackExcluded] = useState('account');

  // Перенесли завантаження сюди
  useEffect(() => {
    const fetchCashbackSettings = async () => {
      try {
        const data = await apiGet(getFullUrl(API_ENDPOINTS.CASHBACK_SETTINGS));
        setCashbackPercent(data.percent);
        setCashbackExcluded(data.excluded_types || '');
      } catch (error) {
        handleApiError(error, t('common.error'));
      }
    };
    fetchCashbackSettings();
  }, [t]);

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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
            <Coins className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white">{t('admin.cashback.title')}</h1>
        </div>
        <p className="text-sm text-slate-400 max-w-2xl mt-2">
          {t('admin.cashback.desc')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* НАЛАШТУВАННЯ ВІДСОТКА */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Percent className="w-5 h-5 text-blue-400" /> {t('admin.cashback.baseRateTitle')}
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
            <div className="p-4 bg-blue-900/20 border border-blue-500/20 rounded-xl">
               <p className="text-sm text-blue-300">
                💡 {t('admin.cashback.example')} <b>${(100 * (cashbackPercent / 100)).toFixed(2)}</b> {t('admin.cashback.example2')}
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
            className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 uppercase tracking-wide"
          >
            <Save className="w-5 h-5"/> {t('admin.cashback.saveBtn')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminCashback;