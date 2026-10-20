import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Settings, Trash2, Save, Ticket, ShieldAlert, CheckCircle2, Gift, Percent, DollarSign, HelpCircle, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiPost, apiDelete, handleApiError } from '../../config/apiClient';
import { API_ENDPOINTS, getFullUrl } from '../../config/api';

const AdminPromo = ({ 
  adminPromoList = [], 
  fetchPromocodes, 
  adminAccounts = [], 
  adminOtherItems = [], 
  adminRssPacks = [], 
  adminGemsRates = [] 
}) => {
  const { t } = useTranslation();

  const [promoCode, setPromoCode] = useState('');
  const [promoType, setPromoType] = useState('percent'); 
  const [promoValue, setPromoValue] = useState('');
  const [promoTarget, setPromoTarget] = useState('all'); 
  const [selectedSpecificItems, setSelectedSpecificItems] = useState([]);
  
  // 🔥 ТЕГ ТА КАТЕГОРІЇ ГІЛЬДІЇ 🔥
  const [guildTag, setGuildTag] = useState('');
  const [guildCategories, setGuildCategories] = useState(['rss_all', 'gem_all', 'oth_all']);
  
  const [maxUses, setMaxUses] = useState(0);
  const [minAmount, setMinAmount] = useState(0);
  const [expiryDate, setExpiryDate] = useState('');

  // Генерація випадкового коду
  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = 'LORDS-';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPromoCode(result);
  };


  const addPromoCode = async () => {
    if (!promoCode.trim()) return toast.error('Введіть промокод!');
    if (promoTarget !== 'guild' && !promoValue && promoValue !== 0) {
      return toast.error('Вкажіть розмір знижки або опис подарунка!');
    }

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
      toast.success('Промокод успішно створено!');
      if (fetchPromocodes) fetchPromocodes();
      setPromoCode(''); 
      setPromoValue(''); 
      setMaxUses(0); 
      setMinAmount(0); 
      setExpiryDate(''); 
      setSelectedSpecificItems([]); 
      setGuildTag(''); 
      setGuildCategories(['rss_all', 'gem_all', 'oth_all']);
    } catch (error) {
      handleApiError(error, t('common.error'));
    }
  };

  const removePromoCode = async (id) => {
    if (!window.confirm('Ви впевнені, що хочете видалити цей промокод?')) return;
    try {
      await apiDelete(getFullUrl(API_ENDPOINTS.PROMOCODE_DELETE(id)));
      if (fetchPromocodes) fetchPromocodes();
      toast.success('Промокод видалено');
    } catch (error) {
      handleApiError(error, t('common.error'));
    }
  };

  const getGuildCatsStr = (items) => {
    if (!items || items.length === 0) return 'Усі товари';
    let cats = [];
    if (items.includes('rss_all')) cats.push('Ресурси');
    if (items.includes('gem_all')) cats.push('Сапфіри');
    if (items.includes('oth_all')) cats.push('Послуги');
    if (items.includes('acc_all')) cats.push('Акаунти');
    return cats.join(', ');
  };

  const getTargetBadge = (promo, parsedNames, parsedTargets) => {
    switch (promo.target) {
      case 'rss':
        return <span className="text-xs bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg font-bold">🌾 Тільки Ресурси (RSS)</span>;
      case 'gems':
        return <span className="text-xs bg-cyan-950/40 text-cyan-400 border border-cyan-500/30 px-2.5 py-0.5 rounded-lg font-bold">💎 Тільки Сапфіри (Gems)</span>;
      case 'other':
        return <span className="text-xs bg-purple-950/40 text-purple-400 border border-purple-500/30 px-2.5 py-0.5 rounded-lg font-bold">📦 Тільки Послуги</span>;
      case 'accounts':
        return <span className="text-xs bg-rose-950/40 text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-lg font-bold">🏰 Тільки Акаунти</span>;
      case 'specific':
        return <span className="text-xs bg-blue-950/40 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-lg font-bold">🎯 Обрані товари ({parsedTargets.length || 0})</span>;
      case 'guild':
        return <span className="text-xs bg-amber-950/40 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-lg font-bold">🛡️ Гільдія: [{parsedNames[0] || 'Свої'}] ({getGuildCatsStr(parsedTargets)})</span>;
      default:
        return <span className="text-xs bg-white/[0.04] text-slate-300 border border-white/[0.08] px-2.5 py-0.5 rounded-lg font-bold">🌐 Всі товари</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* ВЕРХНЯ ШАПКА */}
      <div className="flex flex-col sm:flex-row items-center justify-between bg-[#0c1017] border border-white/[0.08] p-6 rounded-3xl shadow-2xl gap-4">
        <div>
          <h1 className="text-2xl font-black text-white mb-1 flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-gradient-to-br from-red-600/20 to-rose-600/10 border border-red-500/20 text-rose-500">
              <Ticket className="w-6 h-6" />
            </span>
            Промокоди та Знижки
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Створюйте знижки у %, фіксовані бонуси в $, безкоштовні паки ресурсів або спеціальні ціни для гільдій
          </p>
        </div>
        
        <button 
          onClick={addPromoCode} 
          className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_18px_rgba(225,29,72,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Save className="w-4 h-4" /> Створити промокод
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* ЛІВА КОЛОНКА: ФОРМА СТВОРЕННЯ */}
        <div className="xl:col-span-7 bg-[#0c1017] border border-white/[0.08] rounded-3xl p-6 shadow-2xl space-y-6">
          
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-rose-500" /> Налаштування нового промокоду
            </h3>
            <button 
              onClick={generateRandomCode}
              type="button"
              className="text-xs font-bold text-rose-400 hover:text-white flex items-center gap-1.5 transition-colors px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20"
            >
              <Settings className="w-3.5 h-3.5" /> Згенерувати код
            </button>
          </div>


          <div className="space-y-5">
            
            {/* РЯДОК 1: КОД, ТИП ЗНИЖКИ, РОЗМІР/ЗНАЧЕННЯ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* КОД ПРОМОКОДУ */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Промокод (текст)
                </label>
                <input 
                  type="text" 
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="OPEN-FREE-RSS"
                  className="w-full bg-[#070b12] border border-white/[0.08] rounded-xl px-4 py-3 text-white font-black font-mono tracking-widest focus:border-red-500 outline-none transition-colors text-sm" 
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Те, що клієнт вводить у кошику</span>
              </div>

              {/* ТИП ЗНИЖКИ */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Тип знижки
                </label>
                <select 
                  value={promoTarget === 'guild' ? 'percent' : promoType} 
                  onChange={(e) => setPromoType(e.target.value)} 
                  disabled={promoTarget === 'guild'}
                  className="w-full bg-[#070b12] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-xs font-bold outline-none focus:border-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <option value="percent">📉 Відсоток (%) — 100% = Free</option>
                  <option value="fixed">💵 Фіксована сума ($)</option>
                  <option value="item">🎁 Подарунок (Item/Text)</option>
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {promoType === 'percent' ? 'Знижка у % від вартості' : promoType === 'fixed' ? 'Точна сума в доларах' : 'Бонусний подарунок'}
                </span>
              </div>

              {/* ЗНАЧЕННЯ / РОЗМІР ЗНИЖКИ (ЗРОБЛЕНО ДИНАМІЧНИМ ТА ЗРОЗУМІЛИМ!) */}
              <div>
                <label className="block text-xs font-bold text-emerald-400 mb-1.5 uppercase tracking-wider">
                  {promoTarget === 'guild' ? 'Ціна гільдії' : promoType === 'percent' ? 'Розмір знижки (%)' : promoType === 'fixed' ? 'Сума знижки ($)' : 'Опис подарунка'}
                </label>
                <div className="relative">
                  <input 
                    type={promoType === 'item' ? "text" : "number"}
                    value={promoTarget === 'guild' ? '' : promoValue}
                    onChange={(e) => setPromoValue(e.target.value)}
                    disabled={promoTarget === 'guild'}
                    placeholder={
                      promoTarget === 'guild' 
                        ? 'Собівартість' 
                        : promoType === 'percent' 
                        ? '100 (для Free) або 20' 
                        : promoType === 'fixed' 
                        ? '5.00' 
                        : '+500M Ресурсів'
                    }
                    className={`w-full bg-[#070b12] border border-white/[0.08] rounded-xl px-4 py-3 text-emerald-400 font-mono font-black text-sm focus:border-red-500 outline-none transition-colors ${promoTarget === 'guild' ? 'opacity-40 cursor-not-allowed' : ''}`} 
                  />
                  {promoType === 'percent' && promoTarget !== 'guild' && (
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500">%</span>
                  )}
                  {promoType === 'fixed' && promoTarget !== 'guild' && (
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500">$</span>
                  )}
                </div>
                <span className="text-[10px] text-emerald-500/80 mt-1 block font-medium">
                  {promoType === 'percent' ? '💡 Введіть 100 для 100% безкоштовного товару' : promoType === 'fixed' ? '💡 Наприклад 5 — чек зменшиться на $5' : '💡 Опис подарунка, який покупець отримає'}
                </span>
              </div>
            </div>

            {/* РЯДОК 2: ЛІМІТ ВИКОРИСТАНЬ, МІНІМАЛЬНА СУМА, ДАТА */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-white/[0.04]">
              
              {/* ЛІМІТ АКТИВАЦІЙ */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Ліміт використань
                </label>
                <input 
                  type="number" 
                  value={maxUses} 
                  onChange={(e) => setMaxUses(e.target.value)} 
                  placeholder="0 = безлімітно" 
                  className="w-full bg-[#070b12] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:border-red-500 outline-none transition-colors" 
                />
                <span className="text-[10px] text-slate-500 mt-1 block">0 = необмежено, 10 = для 10 людей</span>
              </div>

              {/* МІНІМАЛЬНА СУМА ЗАМОВЛЕННЯ */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Мін. сума замовлення ($)
                </label>
                <input 
                  type="number" 
                  step="0.1"
                  value={minAmount} 
                  onChange={(e) => setMinAmount(e.target.value)} 
                  placeholder="0.00" 
                  className="w-full bg-[#070b12] border border-white/[0.08] rounded-xl px-4 py-2.5 text-emerald-400 font-mono font-bold text-sm focus:border-red-500 outline-none transition-colors" 
                />
                <span className="text-[10px] text-slate-500 mt-1 block">0 = діє на будь-яку суму (навіть $0)</span>
              </div>

              {/* ДАТА ЗАКІНЧЕННЯ */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Діє до (необов'язково)
                </label>
                <input 
                  type="datetime-local" 
                  value={expiryDate} 
                  onChange={(e) => setExpiryDate(e.target.value)} 
                  className="w-full bg-[#070b12] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-xs focus:border-red-500 outline-none transition-colors" 
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Залиште пустим для безстрокового</span>
              </div>
            </div>

            {/* РЯДОК 3: ДЛЯ ЯКИХ ТОВАРІВ (ЦІЛЬОВІ КАТЕГОРІЇ) */}
            <div className="pt-2 border-t border-white/[0.04]">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-rose-500" /> На які товари діє промокод:
                </label>
                <span className="text-[10px] text-slate-500">Оберіть конкретну категорію</span>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { id: 'all', label: '🌐 Всі товари' },
                  { id: 'rss', label: '🌾 Ресурси (RSS)' },
                  { id: 'gems', label: '💎 Сапфіри (Gems)' },
                  { id: 'other', label: '📦 Послуги' },
                  { id: 'accounts', label: '🏰 Акаунти' },
                  { id: 'specific', label: '🎯 Обрані товари' },
                  { id: 'guild', label: '🛡️ Гільдія (Собівартість)' }
                ].map((item) => (
                  <button 
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setPromoTarget(item.id);
                      if (item.id === 'guild') {
                        setPromoType('percent'); 
                        setPromoValue('');
                      }
                    }}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                      promoTarget === item.id 
                        ? 'bg-gradient-to-r from-red-600 to-rose-600 border-red-500 text-white shadow-[0_0_12px_rgba(225,29,72,0.35)]' 
                        : 'bg-[#070b12] border-white/[0.08] text-slate-300 hover:text-white hover:border-white/[0.2]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* ДОДАТКОВІ НАЛАШТУВАННЯ ДЛЯ ГІЛЬДІЇ */}
              {promoTarget === 'guild' && (
                <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 mb-4 animate-in fade-in zoom-in-95 duration-200">
                  <label className="block text-xs font-bold text-amber-400 mb-1.5 uppercase tracking-wide">Тег гільдії (Наприклад: K1O або PRO)</label>
                  <input 
                    type="text" 
                    value={guildTag}
                    onChange={(e) => setGuildTag(e.target.value.toUpperCase())}
                    placeholder="Введіть тег..."
                    className="w-full bg-[#070b12] border border-amber-500/50 rounded-xl px-4 py-2.5 text-white font-bold outline-none focus:border-amber-400 mb-4 text-sm"
                  />

                  <label className="block text-xs font-bold text-amber-400 mb-2 uppercase tracking-wide">Категорії для знижки (До Собівартості)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    {[
                      { id: 'rss_all', name: 'Ресурси' },
                      { id: 'gem_all', name: 'Сапфіри' },
                      { id: 'oth_all', name: 'Послуги' },
                      { id: 'acc_all', name: 'Акаунти' }
                    ].map(cat => (
                      <label key={cat.id} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${guildCategories.includes(cat.id) ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-[#070b12] border-white/[0.06] text-slate-400 hover:border-slate-500'}`}>
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

                  <p className="text-[11px] text-amber-500/80 mt-2 flex items-center gap-1.5 font-medium">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" /> 
                    <span>Знижка до собівартості діє тільки для вибраних категорій. Кешбек і реферальні бонуси скасовуються.</span>
                  </p>
                </div>
              )}

              {/* ДОДАТКОВІ НАЛАШТУВАННЯ ДЛЯ СПЕЦИФІЧНИХ ТОВАРІВ */}
              {promoTarget === 'specific' && (
                <div className="bg-[#070b12] border border-white/[0.08] rounded-2xl p-4 max-h-[220px] overflow-y-auto custom-scrollbar space-y-2 animate-in fade-in">
                  {[
                    ...adminAccounts.map(a => ({ id: `acc_${a.id}`, name: `[Акаунт] ${a.title}`, price: a.price })),
                    ...adminOtherItems.map(o => ({ id: `oth_${o.id}`, name: `[Послуга] ${o.name}`, price: o.price })),
                    ...adminRssPacks.map(r => ({ id: `rss_${r.id}`, name: `[Ресурси] ${r.name}`, price: r.price })),
                    ...adminGemsRates.map(g => ({ id: `gem_${g.id}`, name: `[Сапфіри] ${g.range}`, price: g.rate }))
                  ].map(item => (
                    <label key={item.id} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${selectedSpecificItems.includes(item.id) ? 'bg-red-950/30 border-red-500/50' : 'bg-[#0c1017] border-white/[0.04] hover:border-white/[0.1]'}`}>
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={selectedSpecificItems.includes(item.id)}
                          onChange={() => {
                            setSelectedSpecificItems(prev => 
                              prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id]
                            )
                          }}
                          className="w-4 h-4 rounded text-red-600 focus:ring-red-500 bg-[#070b12] border-slate-700"
                        />
                        <span className="text-xs font-medium text-white">{item.name}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400">${item.price}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ПРАВА КОЛОНКА: СПИСОК АКТИВНИХ ПРОМОКОДІВ */}
        <div className="xl:col-span-5 bg-[#0c1017] border border-white/[0.08] rounded-3xl p-6 shadow-2xl flex flex-col">
          <h3 className="text-base font-bold text-white mb-4 pb-3 border-b border-white/[0.06] flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-rose-500" /> Активні промокоди
            </span>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/[0.06] text-slate-300">
              {adminPromoList.length}
            </span>
          </h3>
          
          <div className="space-y-3 overflow-y-auto custom-scrollbar pr-1 max-h-[550px]">
            {adminPromoList.length === 0 ? (
              <div className="text-center text-slate-500 py-12 text-sm">Немає створених промокодів</div>
            ) : (
              adminPromoList.map(promo => {
                let parsedNames = [];
                let parsedTargets = [];
                try { parsedNames = typeof promo.target_names === 'string' ? JSON.parse(promo.target_names) : (promo.target_names || []); } catch(e) {}
                try { parsedTargets = typeof promo.target_items === 'string' ? JSON.parse(promo.target_items) : (promo.target_items || []); } catch(e) {}

                const isFree100 = promo.type === 'percent' && parseFloat(promo.value) >= 100;

                return (
                  <div key={promo.id} className="bg-[#070b12] border border-white/[0.06] rounded-2xl p-4 flex flex-col gap-3 group hover:border-red-500/30 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="text-base font-black text-white font-mono tracking-widest bg-white/[0.04] px-3 py-1 rounded-xl border border-white/[0.06]">
                        {promo.code}
                      </div>
                      <button 
                        onClick={() => removePromoCode(promo.id)} 
                        title="Видалити промокод"
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {/* БЕЙДЖ ЗНИЖКИ */}
                      <span className={`text-xs px-2.5 py-0.5 rounded-lg font-bold border ${
                        isFree100 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.25)]' 
                          : 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {promo.target === 'guild' ? 'Собівартість (Base Price)' : (
                          <>
                            {promo.type === 'percent' && (isFree100 ? '🎉 100% БЕЗКОШТОВНО ($0)' : `-${promo.value}%`)}
                            {promo.type === 'fixed' && `-${promo.value}$`}
                            {promo.type === 'item' && `🎁 Подарунок: ${promo.value}`}
                          </>
                        )}
                      </span>

                      {/* БЕЙДЖ КАТЕГОРІЇ */}
                      {getTargetBadge(promo, parsedNames, parsedTargets)}

                      {/* БЕЙДЖ ЛІМІТУ */}
                      <span className="text-xs bg-blue-950/40 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-lg font-mono">
                        {promo.max_uses > 0 ? `${promo.current_uses} / ${promo.max_uses} вик.` : `Безліміт (${promo.current_uses} вик.)`}
                      </span>

                      {/* МІНІМАЛЬНА СУМА */}
                      {promo.min_order_amount > 0 && (
                        <span className="text-xs bg-amber-950/30 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-lg font-mono">
                          Від ${promo.min_order_amount}
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
