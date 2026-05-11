import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  Shield, PackageOpen, Gift, Settings, Plus, Image as ImageIcon, 
  UploadCloud, Star, Save, Globe, Calculator, Percent, DollarSign, Gem, Trash2, ListChecks, LayoutGrid, Type, X, Edit, Ticket,Search
} from 'lucide-react';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('promo'); 
  const [accountFormLng, setAccountFormLng] = useState('ua'); 

  // --- СТАНИ ДЛЯ АКАУНТІВ ---
  const [sellerPrice, setSellerPrice] = useState('');
  const [markup, setMarkup] = useState('');
  const [markupType, setMarkupType] = useState('fixed'); 

  const [adminAccounts, setAdminAccounts] = useState([]);
  // --- ПОШУК ТА ФІЛЬТР АКАУНТІВ ---
  const [accSearchQuery, setAccSearchQuery] = useState('');
  const [accStatusFilter, setAccStatusFilter] = useState('all');
  
  const [accTitle, setAccTitle] = useState('');
  const [accShortDesc, setAccShortDesc] = useState('');
  const [accTags, setAccTags] = useState('');
  const [accBind, setAccBind] = useState('');
  
  const [mainImage, setMainImage] = useState(null);
  const [additionalImages, setAdditionalImages] = useState([]);

  const handleMainImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setMainImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleAdditionalImagesUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setAdditionalImages(prev => [...prev, reader.result]);
      reader.readAsDataURL(file);
    });
  };

  const removeAdditionalImage = (indexToRemove) => {
    setAdditionalImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  useEffect(() => {
    fetchAccounts();
    fetchResourcesAndGems();
    fetchOtherItems();
    fetchPromocodes(); 
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/accounts');
      if (response.ok) setAdminAccounts(await response.json());
    } catch (error) { console.error("Помилка завантаження акаунтів:", error); }
  };

  const handlePublishAccount = async () => {
    if (!accTitle || !sellerPrice) return toast.error('Заповніть назву та ціну акаунта!');

    const newAccountData = {
      title: accTitle,
      shortDesc: accShortDesc,
      price: finalPriceAcc.toFixed(2),
      tags: accTags,
      bind: accBind,
      images: [mainImage, ...additionalImages].filter(Boolean) 
    };

    const toastId = toast.loading('Збереження в базу даних...');

    try {
      const response = await fetch('http://localhost:8000/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAccountData)
      });

      if (response.ok) {
        toast.success('Акаунт успішно опубліковано!', { id: toastId });
        fetchAccounts(); 
        
        setAccTitle(''); setAccShortDesc(''); setSellerPrice(''); setMarkup('');
        setAccTags(''); setAccBind(''); setMainImage(null); setAdditionalImages([]);
      } else {
        toast.error('Помилка збереження на сервері.', { id: toastId });
      }
    } catch (error) { toast.error("Немає зв'язку з БД.", { id: toastId }); }
  };
   
  const handleStatusChange = async (id, newStatus) => {
    const toastId = toast.loading('Оновлення статусу...');
    try {
      const response = await fetch(`http://localhost:8000/api/accounts/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        toast.success('Статус оновлено!', { id: toastId });
        fetchAccounts(); // Оновлюємо список акаунтів
      } else {
        toast.error('Помилка сервера', { id: toastId });
      }
    } catch (error) {
      toast.error("Помилка з'єднання", { id: toastId });
    }
  };

  let finalPriceAcc = 0;
  const sPrice = parseFloat(sellerPrice || 0);
  const mValue = parseFloat(markup || 0);

  if (markupType === 'fixed') finalPriceAcc = sPrice + mValue;
  else finalPriceAcc = sPrice + (sPrice * (mValue / 100));

  
  // --- СТАНИ ДЛЯ РЕСУРСІВ (БАЗА ДАНИХ) ---
  const [adminRssPacks, setAdminRssPacks] = useState([]);
  const [adminGemsRates, setAdminGemsRates] = useState([]);

  const fetchResourcesAndGems = async () => {
    try {
      const resRss = await fetch('http://localhost:8000/api/resources');
      const resGems = await fetch('http://localhost:8000/api/gems');
      if (resRss.ok) setAdminRssPacks(await resRss.json());
      if (resGems.ok) setAdminGemsRates(await resGems.json());
    } catch (error) { console.error("Помилка:", error); }
  };

  const handleSaveResourcesAndGems = async () => {
    const toastId = toast.loading('Збереження даних...');
    try {
      await fetch('http://localhost:8000/api/resources/bulk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(adminRssPacks)
      });
      await fetch('http://localhost:8000/api/gems/bulk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(adminGemsRates)
      });
      toast.success('Ресурси та Самоцвіти успішно збережено!', { id: toastId });
      fetchResourcesAndGems(); 
    } catch (error) { toast.error('Помилка збереження.', { id: toastId }); }
  };

  const updateRss = (id, field, value) => setAdminRssPacks(prev => prev.map(pack => pack.id === id ? { ...pack, [field]: value } : pack));
  const removeRss = (id) => setAdminRssPacks(prev => prev.filter(pack => pack.id !== id));
  const addRss = () => setAdminRssPacks(prev => [...prev, { id: Date.now(), name: "Новий пакунок", desc: "Опис ресурсу...", price: "0.00" }]);

  const updateGems = (id, field, value) => setAdminGemsRates(prev => prev.map(gem => gem.id === id ? { ...gem, [field]: value } : gem));
  const removeGem = (id) => setAdminGemsRates(prev => prev.filter(gem => gem.id !== id));
  const addGem = () => setAdminGemsRates(prev => [...prev, { id: Date.now(), range: "0 - 0M", rate: "0.00" }]);

  // --- СТАНИ ДЛЯ ІНШИХ ТОВАРІВ ---
  const [adminOtherItems, setAdminOtherItems] = useState([]); 
  const [otherItemName, setOtherItemName] = useState('');
  const [otherItemDesc, setOtherItemDesc] = useState('');
  const [otherItemTag, setOtherItemTag] = useState('');
  const [otherItemColor, setOtherItemColor] = useState('blue');

  const [otherItemPrice, setOtherItemPrice] = useState('');
  const [otherItemMarkup, setOtherItemMarkup] = useState('');
  const [otherMarkupType, setOtherMarkupType] = useState('fixed');
  const [requiredFields, setRequiredFields] = useState(['Нікнейм гравця', 'Гільдія']); 
  const [newField, setNewField] = useState('');

  const getFinalPrice = (price, mup, type) => {
    const p = parseFloat(price || 0);
    const m = parseFloat(mup || 0);
    return type === 'fixed' ? (p + m).toFixed(2) : (p + (p * (m / 100))).toFixed(2);
  };

  const fetchOtherItems = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/other-items');
      if (response.ok) setAdminOtherItems(await response.json());
    } catch (error) { console.error("Помилка:", error); }
  };

  const handlePublishOtherItem = async () => {
    if (!otherItemName || !otherItemPrice) return toast.error('Заповніть назву та собівартість!');

    const newItemData = {
      name: otherItemName, desc: otherItemDesc, price: getFinalPrice(otherItemPrice, otherItemMarkup, otherMarkupType),
      tag: otherItemTag, color: otherItemColor, requiredFields: requiredFields
    };

    const toastId = toast.loading('Публікація товару...');
    try {
      const response = await fetch('http://localhost:8000/api/other-items', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newItemData)
      });
      if (response.ok) {
        toast.success('Товар успішно додано!', { id: toastId });
        fetchOtherItems(); 
        setOtherItemName(''); setOtherItemDesc(''); setOtherItemTag(''); setOtherItemPrice(''); setOtherItemMarkup(''); setRequiredFields(['Нікнейм гравця', 'Гільдія']);
      }
    } catch (error) { toast.error("Помилка сервера", { id: toastId }); }
  };

  const handleDeleteOtherItem = async (id) => {
    if (!window.confirm("Видалити цей товар?")) return;
    try {
      await fetch(`http://localhost:8000/api/other-items/${id}`, { method: 'DELETE' });
      fetchOtherItems();
      toast.success("Видалено!");
    } catch (error) { toast.error("Помилка видалення"); }
  };

  // --- СТАНИ ДЛЯ ПРОМОКОДІВ ---
  const [adminPromoList, setAdminPromoList] = useState([]);

  const [promoCode, setPromoCode] = useState('');
  const [promoType, setPromoType] = useState('percent'); 
  const [promoValue, setPromoValue] = useState(''); // ПОВЕРНУЛИ ЦЕ ПОЛЕ
  const [promoTarget, setPromoTarget] = useState('all'); 
  const [selectedSpecificItems, setSelectedSpecificItems] = useState([]);
  
  const [maxUses, setMaxUses] = useState(0);
  const [minAmount, setMinAmount] = useState(0);
  const [expiryDate, setExpiryDate] = useState('');

  const fetchPromocodes = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/promocodes');
      if (response.ok) setAdminPromoList(await response.json());
    } catch (error) { console.error("Помилка завантаження промокодів:", error); }
  };

  const addPromoCode = async () => {
    if (!promoCode || !promoValue) return toast.error("Заповніть код та значення!");
    
    const newPromo = {
      code: promoCode.trim().toUpperCase(),
      type: promoType,
      value: String(promoValue), // Примусово робимо текстом
      target: promoTarget,
      max_uses: parseInt(maxUses) || 0,
      min_order_amount: parseFloat(minAmount) || 0,
      expiry_date: expiryDate ? expiryDate : null, 
      specific_items: promoTarget === 'specific' && selectedSpecificItems.length > 0 ? selectedSpecificItems.join(',') : null
    };

    try {
      const res = await fetch('http://localhost:8000/api/promocodes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newPromo)
      });
      if (res.ok) {
        toast.success("Промокод збережено!");
        fetchPromocodes(); 
        setPromoCode(''); setPromoValue(''); setMaxUses(0); setMinAmount(0); setExpiryDate(''); setSelectedSpecificItems([]);
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Помилка збереження");
      }
    } catch (error) { toast.error("Помилка збереження"); }
  };

  const removePromoCode = async (id) => {
    try {
      await fetch(`http://localhost:8000/api/promocodes/${id}`, { method: 'DELETE' });
      fetchPromocodes();
      toast.success("Промокод видалено!");
    } catch (error) { toast.error("Помилка видалення"); }
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'LORDS-';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPromoCode(result);
  };

// Фільтрація акаунтів для відображення
  const filteredAccounts = adminAccounts.filter(acc => {
    const matchesSearch = acc.title.toLowerCase().includes(accSearchQuery.toLowerCase()) || 
                          (acc.id && acc.id.toString() === accSearchQuery);
    const matchesStatus = accStatusFilter === 'all' || acc.status === accStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row pb-20 pt-8 gap-6 max-w-[1400px] mx-auto px-4">
      
      {/* ЛІВА ПАНЕЛЬ: МЕНЮ */}
      <aside className="w-full md:w-64 flex-shrink-0">
        <div className="bg-slate-900 border border-blue-500/30 rounded-3xl p-4 sticky top-24 shadow-2xl shadow-blue-900/10">
          <div className="px-4 pb-6 mb-4 border-b border-slate-800">
            <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 uppercase tracking-widest">
              Admin Panel
            </h2>
          </div>

          <nav className="space-y-2">
            <button onClick={() => setActiveTab('accounts')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold ${activeTab === 'accounts' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <Shield className="w-5 h-5" /> Акаунти
            </button>
            <button onClick={() => setActiveTab('resources')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold ${activeTab === 'resources' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <PackageOpen className="w-5 h-5" /> Ресурси та Gems
            </button>
            <button onClick={() => setActiveTab('other')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold ${activeTab === 'other' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <LayoutGrid className="w-5 h-5" /> Інші товари
            </button>
            <button onClick={() => setActiveTab('promo')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold ${activeTab === 'promo' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <Ticket className="w-5 h-5" /> Промокоди
            </button>
          </nav>
        </div>
      </aside>

      {/* ПРАВА ПАНЕЛЬ */}
      <main className="flex-1">
        
        {/* === ВКЛАДКА: ПРОМОКОДИ === */}
        {activeTab === 'promo' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-lg">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">Генератор промокодів</h1>
                <p className="text-sm text-slate-400">Створюйте знижки або бонусні подарунки для клієнтів.</p>
              </div>
              <button onClick={addPromoCode} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all hover:-translate-y-1">
                <Save className="w-5 h-5" /> Зберегти промокод
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              
              {/* ФОРМА СТВОРЕННЯ */}
              <div className="xl:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Plus className="w-5 h-5 text-blue-400" /> Створити промокод
                  </h3>
                  <button 
                    onClick={generateRandomCode}
                    className="text-xs font-bold text-blue-400 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <Settings className="w-3 h-3" /> Згенерувати випадковий
                  </button>
                </div>

                <div className="space-y-6">
                  
                  {/* РЯДОК 1: КОД, ТИП, ЗНАЧЕННЯ (ВИПРАВЛЕНО: ТЕПЕР ТУТ 3 ПОЛЯ) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">Код</label>
                      <input 
                        type="text" 
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-black tracking-widest" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">Тип бонусу</label>
                      <select value={promoType} onChange={(e) => setPromoType(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none">
                        <option value="percent">Відсоток (%)</option>
                        <option value="fixed">Фіксована сума ($)</option>
                        <option value="item">Подарунок (Item)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">Значення</label>
                      <input 
                        type={promoType === 'item' ? "text" : "number"}
                        value={promoValue}
                        onChange={(e) => setPromoValue(e.target.value)}
                        placeholder={promoType === 'percent' ? "Напр: 10" : promoType === 'fixed' ? "Напр: 50" : "Напр: Щит 24г"}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-emerald-400 font-bold text-sm focus:border-blue-500 outline-none" 
                      />
                    </div>
                  </div>

                  {/* РЯДОК 2: ЛІМІТИ ТА ДАТА */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">Ліміт активацій (0=∞)</label>
                      <input type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">Мін. сума ($)</label>
                      <input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-emerald-400 font-bold" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">Діє до (Дата)</label>
                      <input type="datetime-local" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-xs" />
                    </div>
                  </div>

                  {/* РЯДОК 3: НА ЯКІ ТОВАРИ ДІЄ */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">На які товари діє?</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                      {['all', 'accounts', 'other', 'specific'].map((target) => (
                        <button 
                          key={target}
                          type="button"
                          onClick={() => setPromoTarget(target)}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${promoTarget === target ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white'}`}
                        >
                          {target === 'all' && 'На всі товари'}
                          {target === 'accounts' && 'Тільки Акаунти'}
                          {target === 'other' && 'Тільки Послуги'}
                          {target === 'specific' && 'Обрати конкретні'}
                        </button>
                      ))}
                    </div>

                    {/* ЯКЩО ВИБРАНО КОНКРЕТНІ ТОВАРИ - ПОКАЗУЄМО СПИСОК */}
                    {promoTarget === 'specific' && (
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 max-h-[200px] overflow-y-auto scrollbar-hide space-y-2">
                        {[
                          ...adminAccounts.map(a => ({ id: `acc_${a.id}`, name: `[Акаунт] ${a.title}`, price: a.price })),
                          ...adminOtherItems.map(o => ({ id: `oth_${o.id}`, name: `[Послуга] ${o.name}`, price: o.price })),
                          ...adminRssPacks.map(r => ({ id: `rss_${r.id}`, name: `[Ресурси] ${r.name}`, price: r.price }))
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

              {/* СПИСОК АКТИВНИХ КОДІВ (З БАЗИ ДАНИХ) */}
              <div className="xl:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg flex flex-col">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-emerald-400" /> Активні промокоди
                </h3>
                
                <div className="space-y-3 overflow-y-auto pr-2 max-h-[400px] scrollbar-hide">
                  {adminPromoList.length === 0 ? (
                    <div className="text-center text-slate-500 py-10 text-sm">Немає активних промокодів</div>
                  ) : (
                    adminPromoList.map(promo => (
                      <div key={promo.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col gap-3 group hover:border-blue-500/50 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="text-lg font-black text-white tracking-wider">{promo.code}</div>
                          <button onClick={() => removePromoCode(promo.id)} className="p-2 text-slate-400 hover:text-red-400 transition-colors bg-slate-900 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs bg-emerald-900/30 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                            {promo.type === 'percent' && `-${promo.value}%`}
                            {promo.type === 'fixed' && `-${promo.value}$`}
                            {promo.type === 'item' && `Подарунок: ${promo.value}`}
                          </span>
                          <span className="text-xs bg-slate-800 text-slate-400 border border-slate-600 px-2 py-0.5 rounded">
                            {promo.target === 'all' && 'На всі товари'}
                            {promo.target === 'accounts' && 'Тільки Акаунти'}
                            {promo.target === 'other' && 'Тільки Послуги'}
                            {promo.target === 'specific' && 'Обрані товари'}
                          </span>
                          {promo.max_uses > 0 && (
                            <span className="text-xs bg-blue-900/30 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
                              Використань: {promo.current_uses} / {promo.max_uses}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ВКЛАДКА: АКАУНТИ */}
        {activeTab === 'accounts' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-lg">
              <div><h1 className="text-2xl font-bold text-white mb-1">Керування Акаунтами</h1></div>
              <button onClick={handlePublishAccount} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20 hover:-translate-y-1"><Save className="w-5 h-5" /> Опублікувати</button>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <div className="xl:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg">
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><Globe className="w-5 h-5 text-blue-400" /> Текстова інформація</h3>
                    <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                      {['ua', 'en', 'de'].map(lng => (
                        <button key={lng} onClick={() => setAccountFormLng(lng)} className={`px-4 py-1.5 rounded text-xs font-bold uppercase ${accountFormLng === lng ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>{lng}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">Назва акаунта</label>
                      <input type="text" value={accTitle} onChange={(e) => setAccTitle(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">Короткий опис</label>
                      <textarea rows="3" value={accShortDesc} onChange={(e) => setAccShortDesc(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white resize-none focus:outline-none focus:border-blue-500" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Характеристики та Ціна</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2">Ціна продавця (USDT)</label>
                      <input type="number" value={sellerPrice} onChange={(e) => setSellerPrice(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-medium text-slate-400">Націнка</label>
                        <div className="flex bg-slate-900 border border-slate-700 rounded p-0.5">
                          <button onClick={() => setMarkupType('fixed')} className={`px-2 py-0.5 rounded text-xs font-bold ${markupType === 'fixed' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}><DollarSign className="w-3 h-3" /></button>
                          <button onClick={() => setMarkupType('percent')} className={`px-2 py-0.5 rounded text-xs font-bold ${markupType === 'percent' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}><Percent className="w-3 h-3" /></button>
                        </div>
                      </div>
                      <input type="number" value={markup} onChange={(e) => setMarkup(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-emerald-400" />
                    </div>
                    <div className="sm:col-span-2 pt-2 border-t border-slate-700/50 flex items-center justify-between">
                      <span className="text-sm text-slate-400 flex items-center gap-1"><Calculator className="w-4 h-4" /> Фінальна ціна:</span><span className="text-xl font-black text-white">${finalPriceAcc.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">Теги акаунта (Через кому)</label>
                      <input type="text" value={accTags} onChange={(e) => setAccTags(e.target.value)} placeholder="Напр: T5, Mythic, Пастка, 1.2B" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">Прив'язка (Bind)</label>
                      <input type="text" value={accBind} onChange={(e) => setAccBind(e.target.value)} placeholder="Напр: Steam + FB" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="xl:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg flex flex-col gap-6">
                <div>
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-emerald-400" /> Головне фото (Обкладинка)
                  </h3>
                  {mainImage ? (
                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-700 group shadow-md">
                      <img src={mainImage} alt="Головне фото" className="w-full h-full object-cover" />
                      <button onClick={() => setMainImage(null)} className="absolute top-2 right-2 bg-red-500/90 hover:bg-red-500 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-full border-2 border-dashed border-slate-700 hover:border-emerald-500 bg-slate-800/50 rounded-2xl flex flex-col items-center justify-center min-h-[200px] cursor-pointer transition-colors group">
                      <input type="file" accept="image/*" className="hidden" onChange={handleMainImageUpload} />
                      <ImageIcon className="w-10 h-10 text-slate-500 mb-3 group-hover:text-emerald-400 transition-colors" />
                      <span className="text-sm font-bold text-slate-300">Додати головне фото</span>
                    </label>
                  )}
                </div>

                <div className="pt-6 border-t border-slate-800">
                  <h3 className="text-md font-bold text-slate-300 mb-4">Додаткові фотографії (Скріншоти)</h3>
                  {additionalImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {additionalImages.map((imgBase64, idx) => (
                        <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-slate-700 group shadow-md">
                          <img src={imgBase64} alt={`Додаткове ${idx}`} className="w-full h-full object-cover" />
                          <button onClick={() => removeAdditionalImage(idx)} className="absolute top-1 right-1 bg-red-500/90 hover:bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all scale-90 hover:scale-100">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="w-full border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-800/50 rounded-xl flex flex-col items-center justify-center min-h-[80px] cursor-pointer transition-colors group">
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleAdditionalImagesUpload} />
                    <span className="text-sm font-bold text-slate-300 flex items-center gap-2 group-hover:text-blue-400 transition-colors">
                      <Plus className="w-4 h-4"/> Додати ще фотографії
                    </span>
                  </label>
                </div>
              </div>
            </div>
            
            {/* ОНОВЛЕНИЙ СПИСОК АКАУНТІВ ЗІ СТАТУСАМИ */}
            {/* ОНОВЛЕНИЙ СПИСОК АКАУНТІВ З ПОШУКОМ ТА ФІЛЬТРАМИ */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg mt-8">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h3 className="text-xl font-bold text-white">База Акаунтів ({filteredAccounts.length})</h3>
                
                {/* ПАНЕЛЬ ПОШУКУ ТА ФІЛЬТРАЦІЇ */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder="Пошук за назвою чи ID..." 
                      value={accSearchQuery}
                      onChange={(e) => setAccSearchQuery(e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none w-full sm:w-64 transition-colors"
                    />
                  </div>
                  <select 
                    value={accStatusFilter}
                    onChange={(e) => setAccStatusFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:border-blue-500 outline-none cursor-pointer transition-colors"
                  >
                    <option value="all">Усі статуси</option>
                    <option value="active">🟢 В продажі</option>
                    <option value="processing">🟡 На обробці</option>
                    <option value="sold">🔴 Продано</option>
                  </select>
                </div>
              </div>

              {filteredAccounts.length === 0 ? (
                <div className="text-center text-slate-500 py-16 border-2 border-dashed border-slate-800 rounded-2xl">
                  <Search className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                  <p>Акаунтів не знайдено.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredAccounts.map(acc => (
                    <div key={acc.id} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex flex-col relative overflow-hidden group hover:border-blue-500/50 transition-all">
                      
                      {/* ФОТО АКАУНТА */}
                      <div className="w-full h-32 bg-slate-900 rounded-xl mb-3 overflow-hidden border border-slate-700 flex items-center justify-center text-slate-700 relative">
                        {acc.images && acc.images.length > 0 ? (
                          <img src={acc.images[0]} alt={acc.title} className={`w-full h-full object-cover transition-all ${acc.status === 'sold' ? 'grayscale opacity-50' : ''}`} />
                        ) : (
                          <ImageIcon className="w-8 h-8" />
                        )}
                        {acc.status === 'sold' && (
                          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                            <span className="bg-red-600/90 text-white font-black px-4 py-1.5 rounded-lg border-2 border-red-400 rotate-[-15deg] uppercase tracking-widest shadow-xl">Продано</span>
                          </div>
                        )}
                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded font-mono">ID: {acc.id}</div>
                      </div>
                      
                      <h4 className="text-white font-bold text-sm mb-1 line-clamp-1" title={acc.title}>{acc.title}</h4>
                      <div className="text-emerald-400 font-bold text-lg mb-3">${acc.price}</div>
                      
                      {/* МЕНЮ ВИБОРУ СТАТУСУ */}
                      <div className="mb-4 mt-auto">
                        <select 
                          value={acc.status || 'active'} 
                          onChange={(e) => handleStatusChange(acc.id, e.target.value)}
                          className={`w-full text-xs font-bold py-2 px-3 rounded-lg outline-none cursor-pointer border transition-colors
                            ${acc.status === 'sold' ? 'bg-red-900/30 text-red-400 border-red-500/30' : 
                              acc.status === 'processing' ? 'bg-amber-900/30 text-amber-400 border-amber-500/30' : 
                              'bg-emerald-900/30 text-emerald-400 border-emerald-500/30'}
                          `}
                        >
                          <option value="active">🟢 В продажі</option>
                          <option value="processing">🟡 На обробці</option>
                          <option value="sold">🔴 Продано</option>
                        </select>
                      </div>

                      {/* КНОПКИ УПРАВЛІННЯ */}
                      <div className="flex gap-2">
                        <Link to={`/admin/edit-account/${acc.id}`} className="flex-1 py-2 bg-slate-700 hover:bg-blue-600 text-white text-xs font-bold rounded-lg flex justify-center items-center gap-1 transition-colors">
                          <Edit className="w-3 h-3" /> Редаг.
                        </Link>
                        <button onClick={() => handleDeleteAccount(acc.id)} className="p-2 bg-slate-700 hover:bg-red-500 text-white rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ВКЛАДКА: РЕСУРСИ ТА САМОЦВІТИ */}
        {activeTab === 'resources' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-lg">
              <div><h1 className="text-2xl font-bold text-white mb-1">Ресурси та Самоцвіти</h1></div>
              <button onClick={handleSaveResourcesAndGems} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all hover:-translate-y-1">
                <Save className="w-5 h-5" /> Зберегти все
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2"><PackageOpen className="w-6 h-6 text-emerald-400" /> Ресурси (RSS)</h2>
                  <button onClick={addRss} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg font-bold text-sm"><Plus className="w-4 h-4" /> Додати</button>
                </div>
                <div className="space-y-4">
                  {adminRssPacks.map((pack) => (
                    <div key={pack.id} className="bg-slate-800/50 border border-slate-700 p-4 rounded-2xl flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-4">
                        <input type="text" value={pack.name} onChange={(e) => updateRss(pack.id, 'name', e.target.value)} className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                        <input type="number" step="0.01" value={pack.price} onChange={(e) => updateRss(pack.id, 'price', e.target.value)} className="w-24 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-emerald-400 text-sm" />
                        <button onClick={() => removeRss(pack.id)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2"><Gem className="w-6 h-6 text-blue-400" /> Самоцвіти (Рейти)</h2>
                  <button onClick={addGem} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg font-bold text-sm"><Plus className="w-4 h-4" /> Додати</button>
                </div>
                <div className="space-y-4">
                  {adminGemsRates.map((gem) => (
                    <div key={gem.id} className="bg-slate-800/50 border border-slate-700 p-3 rounded-xl flex items-center gap-4">
                      <input type="text" value={gem.range} onChange={(e) => updateGems(gem.id, 'range', e.target.value)} className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                      <input type="number" step="0.01" value={gem.rate} onChange={(e) => updateGems(gem.id, 'rate', e.target.value)} className="w-24 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-blue-400 text-sm" />
                      <button onClick={() => removeGem(gem.id)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ВКЛАДКА: ІНШІ ТОВАРИ */}
        {activeTab === 'other' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-lg">
              <div><h1 className="text-2xl font-bold text-white mb-1">Інші товари (Послуги, Пакунки)</h1></div>
              <button onClick={handlePublishOtherItem} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-900/20 hover:-translate-y-1 transition-all"><Save className="w-5 h-5" /> Опублікувати</button>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <div className="xl:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg">
                <div className="space-y-4 mb-8">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">Назва товару</label>
                    <input type="text" value={otherItemName} onChange={e => setOtherItemName(e.target.value)} placeholder="Напр: Набір Золотий Дракон" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">Опис (Що входить у набір)</label>
                    <textarea rows="2" value={otherItemDesc} onChange={e => setOtherItemDesc(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm resize-none focus:border-blue-500 outline-none" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">Стікер (Тег)</label>
                      <input type="text" value={otherItemTag} onChange={e => setOtherItemTag(e.target.value)} placeholder="Напр: Хіт продажу" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">Колір картки</label>
                      <select value={otherItemColor} onChange={e => setOtherItemColor(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none appearance-none">
                        <option value="blue">Синій (Стандартний)</option>
                        <option value="orange">Помаранчевий (Легендарний)</option>
                        <option value="green">Смарагдовий (Епік)</option>
                        <option value="purple">Фіолетовий (Міфік)</option>
                        <option value="red">Червоний (Ексклюзив)</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-white mb-4">Ціна та Комісія</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                  <div><label className="block text-xs font-medium text-slate-400 mb-2">Собівартість ($)</label><input type="number" value={otherItemPrice} onChange={(e) => setOtherItemPrice(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none" /></div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-medium text-slate-400">Націнка</label>
                      <div className="flex bg-slate-900 border border-slate-700 rounded p-0.5">
                        <button onClick={() => setOtherMarkupType('fixed')} className={`px-2 py-0.5 rounded text-xs font-bold ${otherMarkupType === 'fixed' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}><DollarSign className="w-3 h-3" /></button>
                        <button onClick={() => setOtherMarkupType('percent')} className={`px-2 py-0.5 rounded text-xs font-bold ${otherMarkupType === 'percent' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}><Percent className="w-3 h-3" /></button>
                      </div>
                    </div>
                    <input type="number" value={otherItemMarkup} onChange={(e) => setOtherItemMarkup(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-blue-400 font-bold text-sm focus:border-blue-500 outline-none" />
                  </div>
                  <div className="sm:col-span-2 pt-2 border-t border-slate-700/50 flex items-center justify-between">
                    <span className="text-sm text-slate-400 font-bold">Фінальна ціна для клієнта:</span>
                    <span className="text-2xl font-black text-white">${getFinalPrice(otherItemPrice, otherItemMarkup, otherMarkupType)}</span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-800">
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><ListChecks className="w-5 h-5 text-blue-400" /> Дані для отримання</h3>
                  <p className="text-xs text-slate-400 mb-4">Додайте поля, які клієнт має заповнити при покупці цього товару.</p>
                  
                  <div className="flex gap-2 mb-4">
                    <input type="text" value={newField} onChange={(e) => setNewField(e.target.value)} placeholder="Напр: Ваш IGG ID..." className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 outline-none" />
                    <button onClick={() => { if(newField.trim()) { setRequiredFields([...requiredFields, newField.trim()]); setNewField(''); } }} className="px-4 py-2.5 bg-slate-700 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors">Додати</button>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {requiredFields.map((field, index) => (
                      <div key={index} className="flex items-center gap-2 bg-blue-900/30 border border-blue-500/30 text-blue-300 px-3 py-1.5 rounded-lg text-sm">
                        {field}
                        <button onClick={() => setRequiredFields(requiredFields.filter((_, i) => i !== index))} className="text-blue-400 hover:text-red-400"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* СПИСОК СТВОРЕНИХ ТОВАРІВ */}
              <div className="xl:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg flex flex-col">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Star className="w-5 h-5 text-emerald-400" /> Ваші товари
                </h3>
                
                <div className="space-y-3 overflow-y-auto pr-2 max-h-[600px] scrollbar-hide">
                  {adminOtherItems.length === 0 ? (
                    <div className="text-center text-slate-500 py-10 text-sm">Ви ще не додали жодного товару</div>
                  ) : (
                    adminOtherItems.map(item => (
                      <div key={item.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col group hover:border-blue-500/50 transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-white font-bold text-md">{item.name}</h4>
                          <span className="text-emerald-400 font-black">${item.price}</span>
                        </div>
                        <p className="text-xs text-slate-400 mb-3 line-clamp-2">{item.desc}</p>
                        
                        <div className="flex justify-between items-center mt-auto pt-3 border-t border-slate-700/50">
                          <div className="flex gap-2">
                            {item.tag && <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded">{item.tag}</span>}
                            <span className="text-[10px] uppercase font-bold bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{item.requiredFields.length} полів</span>
                          </div>
                          <button onClick={() => handleDeleteOtherItem(item.id)} className="text-slate-500 hover:text-red-400 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default Admin;