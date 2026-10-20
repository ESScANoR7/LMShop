import React from 'react';
import { useTranslation } from 'react-i18next';
import { PackageOpen, Plus, Trash2, Gem, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiPost, handleApiError } from '../../config/apiClient';
import { API_ENDPOINTS, getFullUrl } from '../../config/api';

const AdminResources = ({ 
  adminRssPacks, setAdminRssPacks, 
  adminGemsRates, setAdminGemsRates, 
  fetchResourcesAndGems 
}) => {
  const { t } = useTranslation();

  const handleSaveResourcesAndGems = async () => {
    const toastId = toast.loading(t('common.loading'));
    try {
      await Promise.all([
        apiPost(getFullUrl(API_ENDPOINTS.RESOURCES_BULK), adminRssPacks),
        apiPost(getFullUrl(API_ENDPOINTS.GEMS_BULK), adminGemsRates)
      ]);
      toast.success(t('common.success'), { id: toastId });
      fetchResourcesAndGems();
    } catch (error) {
      handleApiError(error, t('common.error'));
      toast.dismiss(toastId);
    }
  };

  const updateRss = (id, field, value) => setAdminRssPacks(prev => prev.map(pack => pack.id === id ? { ...pack, [field]: value } : pack));
  const removeRss = (id) => setAdminRssPacks(prev => prev.filter(pack => pack.id !== id));
  const addRss = () => setAdminRssPacks(prev => [...prev, { id: Date.now(), name: "100M Ресурсів", desc: "100M Їжі / Дерева", price: "1.00", base_price: "0.50" }]);

  const updateGems = (id, field, value) => setAdminGemsRates(prev => prev.map(gem => gem.id === id ? { ...gem, [field]: value } : gem));
  const removeGem = (id) => setAdminGemsRates(prev => prev.filter(gem => gem.id !== id));
  const addGem = () => setAdminGemsRates(prev => [...prev, { id: Date.now(), range: "0 - 0M", rate: "0.00", base_price: "0.00" }]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#0c1017] border border-white/[0.08] p-6 rounded-3xl shadow-2xl gap-4">
        <div>
          <h1 className="text-2xl font-black text-white mb-1 flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-gradient-to-br from-red-600/20 to-rose-600/10 border border-red-500/20 text-rose-500">
              <PackageOpen className="w-6 h-6" />
            </span>
            {t('admin.resources.title', 'Ресурси та Сапфіри')}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Налаштуйте опис, собівартість та роздрібні ціни. Після редагування обов'язково натисніть кнопку «Зберегти все»
          </p>
        </div>
        <button 
          onClick={handleSaveResourcesAndGems} 
          className="px-6 py-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_18px_rgba(225,29,72,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Save className="w-5 h-5" /> {t('admin.resources.saveAllBtn', 'Зберегти все')}
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* RSS PACKS */}
        <div className="bg-[#0c1017] border border-white/[0.08] rounded-3xl p-6 shadow-2xl flex flex-col">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.06]">
            <h2 className="text-lg font-black text-white flex items-center gap-2.5">
              <PackageOpen className="w-5 h-5 text-emerald-400" /> {t('admin.resources.rssTitle', 'Паки Ресурсів')}
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {adminRssPacks.length}
              </span>
            </h2>
            <button 
              onClick={addRss} 
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 rounded-xl font-bold text-xs transition-all"
            >
              <Plus className="w-4 h-4" /> {t('admin.resources.addBtn', 'Додати пак')}
            </button>
          </div>

          <div className="space-y-3.5 overflow-y-auto custom-scrollbar max-h-[600px] pr-1">
            {adminRssPacks.map((pack) => {
              const profit = (parseFloat(pack.price || 0) - parseFloat(pack.base_price || 0)).toFixed(2);
              const isProfitable = parseFloat(profit) >= 0;

              return (
                <div key={pack.id} className="bg-[#070b12] border border-white/[0.06] hover:border-red-500/30 p-4 rounded-2xl flex flex-col gap-3 transition-all group">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col flex-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('admin.resources.packNameLabel', 'Назва паку')}</label>
                      <input 
                        type="text" 
                        value={pack.name} 
                        onChange={(e) => updateRss(pack.id, 'name', e.target.value)} 
                        className="w-full bg-[#0c1017] border border-white/[0.08] focus:border-red-500 rounded-xl px-3 py-2 text-white font-bold text-sm outline-none transition-colors" 
                      />
                    </div>
                    
                    <div className="flex flex-col w-24">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('admin.resources.costLabel', 'Собів-сть ($)')}</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={pack.base_price || 0} 
                        onChange={(e) => updateRss(pack.id, 'base_price', e.target.value)} 
                        className="w-full bg-[#0c1017] border border-white/[0.08] focus:border-red-500 rounded-xl px-2.5 py-2 text-slate-300 font-mono text-sm outline-none transition-colors" 
                      />
                    </div>

                    <div className="flex flex-col w-24">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('admin.resources.priceLabel', 'Ціна ($)')}</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={pack.price} 
                        onChange={(e) => updateRss(pack.id, 'price', e.target.value)} 
                        className="w-full bg-[#0c1017] border border-white/[0.08] focus:border-emerald-500 rounded-xl px-2.5 py-2 text-emerald-400 font-mono font-black text-sm outline-none transition-colors" 
                      />
                    </div>

                    <button 
                      onClick={() => removeRss(pack.id)} 
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors mt-4"
                      title="Видалити"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Опис паку */}
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      {t('admin.resources.packDescLabel', 'Опис паку (на сайті та в TG)')}
                    </label>
                    <input 
                      type="text" 
                      value={pack.desc || ''} 
                      placeholder="Опис паку (напр.: 100M Їжі, 50M Дерева...)"
                      onChange={(e) => updateRss(pack.id, 'desc', e.target.value)} 
                      className="w-full bg-[#0c1017] border border-white/[0.08] focus:border-red-500 rounded-xl px-3 py-2 text-slate-300 font-medium text-xs outline-none transition-colors" 
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-xs">
                    <span className="text-[11px] text-slate-500">Чистий профіт з паку:</span>
                    <span className={`text-xs font-mono font-black px-2 py-0.5 rounded-full border ${
                      isProfitable 
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30' 
                        : 'bg-rose-950/40 text-rose-400 border-rose-500/30'
                    }`}>
                      {isProfitable ? '+' : ''}${profit} USD
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* GEMS RATES */}
        <div className="bg-[#0c1017] border border-white/[0.08] rounded-3xl p-6 shadow-2xl flex flex-col">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.06]">
            <h2 className="text-lg font-black text-white flex items-center gap-2.5">
              <Gem className="w-5 h-5 text-blue-400" /> {t('admin.resources.gemsTitle', 'Курси Сапфірів (Gems)')}
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {adminGemsRates.length}
              </span>
            </h2>
            <button 
              onClick={addGem} 
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/20 rounded-xl font-bold text-xs transition-all"
            >
              <Plus className="w-4 h-4" /> {t('admin.resources.addBtn', 'Додати діапазон')}
            </button>
          </div>

          <div className="space-y-3.5 overflow-y-auto custom-scrollbar max-h-[600px] pr-1">
            {adminGemsRates.map((gem) => {
              const profit = (parseFloat(gem.rate || 0) - parseFloat(gem.base_price || 0)).toFixed(2);
              const isProfitable = parseFloat(profit) >= 0;

              return (
                <div key={gem.id} className="bg-[#070b12] border border-white/[0.06] hover:border-red-500/30 p-4 rounded-2xl flex flex-col gap-3 transition-all group">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col flex-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('admin.resources.rangeLabel', 'Діапазон / К-сть')}</label>
                      <input 
                        type="text" 
                        value={gem.range} 
                        onChange={(e) => updateGems(gem.id, 'range', e.target.value)} 
                        placeholder="0 - 1b або 1b - 2.5b"
                        className="w-full bg-[#0c1017] border border-white/[0.08] focus:border-red-500 rounded-xl px-3 py-2 text-white font-bold text-sm outline-none transition-colors" 
                      />
                    </div>

                    <div className="flex flex-col w-24">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('admin.resources.costLabel', 'Собів-сть ($)')}</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={gem.base_price || 0} 
                        onChange={(e) => updateGems(gem.id, 'base_price', e.target.value)} 
                        className="w-full bg-[#0c1017] border border-white/[0.08] focus:border-red-500 rounded-xl px-2.5 py-2 text-slate-300 font-mono text-sm outline-none transition-colors" 
                      />
                    </div>

                    <div className="flex flex-col w-24">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('admin.resources.priceLabel', 'Курс ($)')}</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={gem.rate} 
                        onChange={(e) => updateGems(gem.id, 'rate', e.target.value)} 
                        className="w-full bg-[#0c1017] border border-white/[0.08] focus:border-blue-500 rounded-xl px-2.5 py-2 text-blue-400 font-mono font-black text-sm outline-none transition-colors" 
                      />
                    </div>

                    <button 
                      onClick={() => removeGem(gem.id)} 
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors mt-4"
                      title="Видалити"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-xs">
                    <span className="text-[11px] text-slate-500">Маржа з 1M:</span>
                    <span className={`text-xs font-mono font-black px-2 py-0.5 rounded-full border ${
                      isProfitable 
                        ? 'bg-blue-950/40 text-blue-400 border-blue-500/30' 
                        : 'bg-rose-950/40 text-rose-400 border-rose-500/30'
                    }`}>
                      {isProfitable ? '+' : ''}${profit} USD
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminResources;