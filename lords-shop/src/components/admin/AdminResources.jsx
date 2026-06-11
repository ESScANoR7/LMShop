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
  const addRss = () => setAdminRssPacks(prev => [...prev, { id: Date.now(), name: "New", desc: "Desc...", price: "0.00", base_price: "0.00" }]);

  const updateGems = (id, field, value) => setAdminGemsRates(prev => prev.map(gem => gem.id === id ? { ...gem, [field]: value } : gem));
  const removeGem = (id) => setAdminGemsRates(prev => prev.filter(gem => gem.id !== id));
  const addGem = () => setAdminGemsRates(prev => [...prev, { id: Date.now(), range: "0 - 0M", rate: "0.00", base_price: "0.00" }]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-lg">
        <div><h1 className="text-2xl font-bold text-white mb-1">{t('admin.resources.title')}</h1></div>
        <button onClick={handleSaveResourcesAndGems} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all hover:-translate-y-1">
          <Save className="w-5 h-5" /> {t('admin.resources.saveAllBtn')}
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2"><PackageOpen className="w-6 h-6 text-emerald-400" /> {t('admin.resources.rssTitle')}</h2>
            <button onClick={addRss} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg font-bold text-sm"><Plus className="w-4 h-4" /> {t('admin.resources.addBtn')}</button>
          </div>
          <div className="space-y-4">
            {adminRssPacks.map((pack) => (
              <div key={pack.id} className="bg-slate-800/50 border border-slate-700 p-4 rounded-2xl flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col flex-1">
                    <label className="text-[10px] text-slate-500 uppercase">{t('admin.resources.packNameLabel')}</label>
                    <input type="text" value={pack.name} onChange={(e) => updateRss(pack.id, 'name', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                  </div>
                  <div className="flex flex-col w-20">
                    <label className="text-[10px] text-slate-500 uppercase">{t('admin.resources.costLabel')}</label>
                    <input type="number" step="0.01" value={pack.base_price || 0} onChange={(e) => updateRss(pack.id, 'base_price', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm" />
                  </div>
                  <div className="flex flex-col w-20">
                    <label className="text-[10px] text-slate-500 uppercase">{t('admin.resources.priceLabel')}</label>
                    <input type="number" step="0.01" value={pack.price} onChange={(e) => updateRss(pack.id, 'price', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-2 text-emerald-400 text-sm" />
                  </div>
                  <button onClick={() => removeRss(pack.id)} className="text-slate-500 hover:text-red-400 mt-4"><Trash2 className="w-5 h-5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2"><Gem className="w-6 h-6 text-blue-400" /> {t('admin.resources.gemsTitle')}</h2>
            <button onClick={addGem} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg font-bold text-sm"><Plus className="w-4 h-4" /> {t('admin.resources.addBtn')}</button>
          </div>
          <div className="space-y-4">
            {adminGemsRates.map((gem) => (
              <div key={gem.id} className="bg-slate-800/50 border border-slate-700 p-3 rounded-xl flex items-center gap-2">
                <div className="flex flex-col flex-1">
                  <label className="text-[10px] text-slate-500 uppercase">{t('admin.resources.rangeLabel')}</label>
                  <input type="text" value={gem.range} onChange={(e) => updateGems(gem.id, 'range', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
                <div className="flex flex-col w-20">
                  <label className="text-[10px] text-slate-500 uppercase">{t('admin.resources.costLabel')}</label>
                  <input type="number" step="0.01" value={gem.base_price || 0} onChange={(e) => updateGems(gem.id, 'base_price', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm" />
                </div>
                <div className="flex flex-col w-20">
                  <label className="text-[10px] text-slate-500 uppercase">{t('admin.resources.priceLabel')}</label>
                  <input type="number" step="0.01" value={gem.rate} onChange={(e) => updateGems(gem.id, 'rate', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-2 text-blue-400 text-sm" />
                </div>
                <button onClick={() => removeGem(gem.id)} className="text-slate-500 hover:text-red-400 mt-4"><Trash2 className="w-5 h-5" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminResources;