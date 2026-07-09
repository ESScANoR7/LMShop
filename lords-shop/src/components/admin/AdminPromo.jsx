import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Settings, Trash2, Save, Ticket, ShieldAlert, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiPost, apiDelete, handleApiError } from '../../config/apiClient';
import { API_ENDPOINTS, getFullUrl } from '../../config/api';

const AdminPromo = ({ 
  adminPromoList, 
  fetchPromocodes, 
  adminAccounts, 
  adminOtherItems, 
  adminRssPacks, 
  adminGemsRates 
}) => {
  const { t } = useTranslation();

  const [promoCode, setPromoCode] = useState('');
  const [promoType, setPromoType] = useState('percent'); 
  const [promoValue, setPromoValue] = useState('');
  const [promoTarget, setPromoTarget] = useState('all'); 
  const [selectedSpecificItems, setSelectedSpecificItems] = useState([]);
  
  // 🔥 ТЕГ ТА КАТЕГОРІЇ ГІЛЬДІЇ 🔥
  const [guildTag, setGuildTag] = useState('');
  const [guildCategories, setGuildCategories] = useState(['rss_all', 'gem_all', 'oth_all']); // Без акаунтів за замовчуванням!
  
  const [maxUses, setMaxUses] = useState(0);
  const [minAmount, setMinAmount] = useState(0);
  const [expiryDate, setExpiryDate] = useState('');

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'LORDS-';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPromoCode(result);
  };

  const addPromoCode = async () => {
    // 🔥 Виправлена валідація: для гільдії promoValue не обов'язкове 🔥
    if (!promoCode) return toast.error(t('common.error') || 'Введіть код');
    if (promoTarget !== 'guild' && !promoValue) return toast.error(t('common.error') || 'Введіть значення');

    let targetIds = [];
    let targetNames = [];

    if (promoTarget === 'specific' && selectedSpecificItems.length > 0) {
      selectedSpecificItems.forEach(complexId => {
        const [prefix, idStr] = complexId.split('_');
        const numId = parseInt(idStr);
        targetIds.push(complexId);

        if (prefix === 'acc') {
          const item = adminAccounts.find(a => a.id === numId);
          if (item) targetNames.push(item.title);
        } else if (prefix === 'oth') {
          const item = adminOtherItems.find(o => o.id === numId);
          if (item) targetNames.push(item.name);
        } else if (prefix === 'rss') {
          const item = adminRssPacks.find(r => r.id === numId);
          if (item) targetNames.push(item.name);
        } else if (prefix === 'gem') {
          const item = adminGemsRates.find(g => g.id === numId);
          if (item) targetNames.push(item.range);
        }
      });
    } else if (promoTarget === 'guild') {
      if (!guildTag.trim()) return toast.error("Введіть тег гільдії!");
      if (guildCategories.length === 0) return toast.error("Виберіть хоча б одну категорію для гільдії!");
      
      targetIds = [...guildCategories];
      targetNames = [guildTag.trim()]; 
    }

    const newPromo = {
      code: promoCode.trim().toUpperCase(),
      type: promoTarget === 'guild' ? 'percent' : promoType, 
      // 🔥 Для гільдії передаємо технічний "0", бо ціна все одно рахується від base_price
      value: promoTarget === 'guild' ? "0" : String(promoValue),
      target: promoTarget,
      max_uses: parseInt(maxUses) || 0,
      min_order_amount: parseFloat(minAmount) || 0,
      expiry_date: expiryDate ? expiryDate : null,
      target_items: targetIds,
      target_names: targetNames
    };

    try {
      await apiPost(getFullUrl(API_ENDPOINTS.PROMOCODE_CREATE), newPromo);
      toast.success(t('common.success'));
      fetchPromocodes();
      setPromoCode(''); setPromoValue(''); setMaxUses(0); setMinAmount(0); setExpiryDate(''); 
      setSelectedSpecificItems([]); setGuildTag(''); setGuildCategories(['rss_all', 'gem_all', 'oth_all']);
    } catch (error) {
      handleApiError(error, t('common.error'));
    }
  };

  const removePromoCode = async (id) => {
    try {
      await apiDelete(getFullUrl(API_ENDPOINTS.PROMOCODE_DELETE(id)));
      fetchPromocodes();
      toast.success(t('common.success'));
    } catch (error) {
      handleApiError(error, t('common.error'));
    }
  };

  const getGuildCatsStr = (items) => {
    if (!items || items.length === 0) return 'Усі товари';
    let cats = [];
    if (items.includes('rss_all')) cats.push('Ресурси');
    if (items.includes('gem_all')) cats.push('Геми');
    if (items.includes('oth_all')) cats.push('Послуги');
    if (items.includes('acc_all')) cats.push('Акаунти');
    return cats.join(', ');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{t('admin.promo.title')}</h1>
          <p className="text-sm text-slate-400">{t('admin.promo.desc')}</p>
        </div>
        <button onClick={addPromoCode} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all hover:-translate-y-1">
          <Save className="w-5 h-5" /> {t('admin.promo.saveBtn')}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-400" /> {t('admin.promo.createTitle')}
            </h3>
            <button 
              onClick={generateRandomCode}
              className="text-xs font-bold text-blue-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <Settings className="w-3 h-3" /> {t('admin.promo.genRandom')}
            </button>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">{t('admin.promo.codeLabel')}</label>
                <input 
                  type="text" 
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-black tracking-widest" 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">{t('admin.promo.typeLabel')}</label>
                <select 
                  value={promoTarget === 'guild' ? 'percent' : promoType} 
                  onChange={(e) => setPromoType(e.target.value)} 
                  disabled={promoTarget === 'guild'}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="percent">{t('admin.promo.typePercent')}</option>
                  <option value="fixed">{t('admin.promo.typeFixed')}</option>
                  <option value="item">{t('admin.promo.typeItem')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">{t('admin.promo.valueLabel')}</label>
                <input 
                  type={promoType === 'item' ? "text" : "number"}
                  value={promoTarget === 'guild' ? '' : promoValue}
                  onChange={(e) => setPromoValue(e.target.value)}
                  disabled={promoTarget === 'guild'}
                  placeholder={promoTarget === 'guild' ? 'До собівартості' : promoType === 'percent' ? t('admin.promo.valuePlaceholderPercent') : promoType === 'fixed' ? t('admin.promo.valuePlaceholderFixed') : t('admin.promo.valuePlaceholderItem')}
                  className={`w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-emerald-400 font-bold text-sm focus:border-blue-500 outline-none ${promoTarget === 'guild' ? 'opacity-50 cursor-not-allowed' : ''}`} 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">{t('admin.promo.limitLabel')}</label>
                <input type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">{t('admin.promo.minSumLabel')}</label>
                <input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-emerald-400 font-bold" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">{t('admin.promo.expiryLabel')}</label>
                <input type="datetime-local" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-xs" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">{t('admin.promo.targetLabel')}</label>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                {['all', 'accounts', 'other', 'specific', 'guild'].map((target) => (
                  <button 
                    key={target}
                    type="button"
                    onClick={() => {
                      setPromoTarget(target);
                      if (target === 'guild') {
                        setPromoType('percent'); 
                        setPromoValue(''); // Очищаємо значення, воно для гільдії не треба
                      }
                    }}
                    className={`py-2 px-2 rounded-lg text-xs font-bold transition-all border ${promoTarget === target ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white'}`}
                  >
                    {target === 'all' && t('admin.promo.targetAll')}
                    {target === 'accounts' && t('admin.promo.targetAcc')}
                    {target === 'other' && t('admin.promo.targetOther')}
                    {target === 'specific' && t('admin.promo.targetSpecific')}
                    {target === 'guild' && 'Гільдія (Без %)'}
                  </button>
                ))}
              </div>

              {/* 🔥 ПОЛЕ ТА КАТЕГОРІЇ ГІЛЬДІЇ 🔥 */}
              {promoTarget === 'guild' && (
                <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 mb-4 animate-in fade-in zoom-in-95 duration-200">
                  <label className="block text-xs font-bold text-amber-400 mb-2 uppercase tracking-wide">Тег гільдії (Наприклад: K1O)</label>
                  <input 
                    type="text" 
                    value={guildTag}
                    onChange={(e) => setGuildTag(e.target.value)}
                    placeholder="Введіть тег..."
                    className="w-full bg-slate-900 border border-amber-500/50 rounded-lg px-4 py-3 text-white font-bold outline-none focus:border-amber-400 mb-6 shadow-inner"
                  />

                  <label className="block text-xs font-bold text-amber-400 mb-3 uppercase tracking-wide">Категорії для знижки (До Собівартості)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {[
                      { id: 'rss_all', name: 'Ресурси' },
                      { id: 'gem_all', name: 'Самоцвіти' },
                      { id: 'oth_all', name: 'Послуги' },
                      { id: 'acc_all', name: 'Акаунти' }
                    ].map(cat => (
                      <label key={cat.id} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${guildCategories.includes(cat.id) ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:bg-slate-800'}`}>
                        <input 
                          type="checkbox" 
                          className="hidden" 
                          checked={guildCategories.includes(cat.id)} 
                          onChange={() => {
                            setGuildCategories(prev => prev.includes(cat.id) ? prev.filter(c => c !== cat.id) : [...prev, cat.id]);
                          }} 
                        />
                        <CheckCircle2 className={`w-4 h-4 transition-all ${guildCategories.includes(cat.id) ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} />
                        <span className="text-xs font-bold">{cat.name}</span>
                      </label>
                    ))}
                  </div>

                  <p className="text-[11px] text-amber-500/80 mt-3 flex items-center gap-1.5 font-medium">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" /> 
                    <span>Знижка до собівартості застосується <b>ТІЛЬКИ</b> до вибраних категорій вище. Кешбек і реферальні нарахування за це замовлення будуть скасовані.</span>
                  </p>
                </div>
              )}

              {promoTarget === 'specific' && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 max-h-[200px] overflow-y-auto scrollbar-hide space-y-2 animate-in fade-in">
                  {[
                    ...adminAccounts.map(a => ({ id: `acc_${a.id}`, name: `[Account] ${a.title}`, price: a.price })),
                    ...adminOtherItems.map(o => ({ id: `oth_${o.id}`, name: `[Service] ${o.name}`, price: o.price })),
                    ...adminRssPacks.map(r => ({ id: `rss_${r.id}`, name: `[RSS] ${r.name}`, price: r.price })),
                    ...adminGemsRates.map(g => ({ id: `gem_${g.id}`, name: `[Gems] ${g.range}`, price: g.rate }))
                  ].map(item => (
                    <label key={item.id} className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border transition-all ${selectedSpecificItems.includes(item.id) ? 'bg-blue-900/30 border-blue-500/50' : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'}`}>
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={selectedSpecificItems.includes(item.id)}
                          onChange={() => {
                            setSelectedSpecificItems(prev => 
                              prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id]
                            )
                          }}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-600"
                        />
                        <span className="text-sm font-medium text-white">{item.name}</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-400">${item.price}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        <div className="xl:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg flex flex-col">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-emerald-400" /> {t('admin.promo.activeTitle')}
          </h3>
          
          <div className="space-y-3 overflow-y-auto pr-2 max-h-[400px] scrollbar-hide">
            {adminPromoList.length === 0 ? (
              <div className="text-center text-slate-500 py-10 text-sm">{t('admin.promo.noActive')}</div>
            ) : (
              adminPromoList.map(promo => {
                let parsedNames = [];
                let parsedTargets = [];
                try { parsedNames = typeof promo.target_names === 'string' ? JSON.parse(promo.target_names) : (promo.target_names || []); } catch(e) {}
                try { parsedTargets = typeof promo.target_items === 'string' ? JSON.parse(promo.target_items) : (promo.target_items || []); } catch(e) {}

                return (
                  <div key={promo.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col gap-3 group hover:border-blue-500/50 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-black text-white tracking-wider">{promo.code}</div>
                      <button onClick={() => removePromoCode(promo.id)} className="p-2 text-slate-400 hover:text-red-400 transition-colors bg-slate-900 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs bg-emerald-900/30 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                        {promo.target === 'guild' ? 'Собівартість' : (
                          <>
                            {promo.type === 'percent' && `-${promo.value}%`}
                            {promo.type === 'fixed' && `-${promo.value}$`}
                            {promo.type === 'item' && `${t('admin.promo.giftLabel')} ${promo.value}`}
                          </>
                        )}
                      </span>
                      <span className={`text-xs border px-2 py-0.5 rounded font-bold ${promo.target === 'guild' ? 'bg-amber-900/30 text-amber-400 border-amber-500/30' : 'bg-slate-800 text-slate-400 border-slate-600'}`}>
                        {promo.target === 'all' && t('admin.promo.targetAll')}
                        {promo.target === 'accounts' && t('admin.promo.targetAcc')}
                        {promo.target === 'other' && t('admin.promo.targetOther')}
                        {promo.target === 'specific' && t('admin.promo.targetSpecific')}
                        {promo.target === 'guild' && `🛡️ Гільдія: ${parsedNames[0] || 'Для своїх'} (${getGuildCatsStr(parsedTargets)})`}
                      </span>
                      {promo.max_uses > 0 && (
                        <span className="text-xs bg-blue-900/30 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
                          {t('admin.promo.usesLabel')} {promo.current_uses} / {promo.max_uses}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPromo;