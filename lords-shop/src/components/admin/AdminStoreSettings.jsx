import React, { useState, useEffect } from 'react';
import { Power, PowerOff, Save, Loader2, Info, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { getFullUrl } from '../../config/api';

const AdminStoreSettings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState({
    is_offline: false,
    offline_categories: [],
    offline_message: '🌙 Оператор зараз офлайн. Замовлення цієї категорії будуть виконані пізніше.'
  });

  const categories = [
    { id: 'resources', name: 'Ресурси' },
    { id: 'gems', name: 'Сапфіри (Gems)' },
    { id: 'account', name: 'Акаунти' },
    { id: 'other', name: 'Інші послуги' }
  ];

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch(getFullUrl('/api/store/status'));
      const data = await res.json();
      setConfig(data);
    } catch (error) {
      toast.error('Помилка завантаження налаштувань');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(getFullUrl('/api/store/status'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Щоб передався токен адміна з кукі
        body: JSON.stringify(config)
      });
      
      if (res.ok) {
        toast.success('Налаштування магазину успішно збережено!');
      } else {
        toast.error('Помилка збереження');
      }
    } catch (error) {
      toast.error('Сталася помилка. Перевірте з\'єднання.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCategory = (catId) => {
    setConfig(prev => {
      const isSelected = prev.offline_categories.includes(catId);
      return {
        ...prev,
        offline_categories: isSelected 
          ? prev.offline_categories.filter(c => c !== catId)
          : [...prev.offline_categories, catId]
      };
    });
  };

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 shadow-xl max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8 border-b border-slate-700 pb-4">
        <div className={`p-3 rounded-xl shadow-lg transition-colors ${config.is_offline ? 'bg-amber-600 shadow-amber-900/20' : 'bg-blue-600 shadow-blue-900/20'}`}>
          <Power className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Режим роботи магазину</h2>
          <p className="text-sm text-slate-400">Керуйте статусом роботи операторів та попередженнями для клієнтів.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* ГОЛОВНИЙ ТУМБЛЕР */}
        <div className={`p-6 rounded-2xl border transition-all flex flex-col sm:flex-row items-center justify-between gap-6 ${config.is_offline ? 'bg-amber-900/20 border-amber-500/50' : 'bg-slate-900/50 border-slate-700/50'}`}>
          <div>
            <h3 className={`text-lg font-black flex items-center gap-2 mb-1 ${config.is_offline ? 'text-amber-400' : 'text-emerald-400'}`}>
              {config.is_offline ? <PowerOff className="w-5 h-5"/> : <Power className="w-5 h-5"/>}
              {config.is_offline ? 'Магазин в режимі ОФЛАЙН' : 'Магазин працює (ОНЛАЙН)'}
            </h3>
            <p className="text-sm text-slate-400">
              {config.is_offline ? 'Клієнти побачать плашку з попередженням у кошику.' : 'Клієнти оформлюють замовлення у звичайному режимі.'}
            </p>
          </div>
          
          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={config.is_offline}
              onChange={(e) => setConfig({...config, is_offline: e.target.checked})}
            />
            <div className="w-16 h-8 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-8 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500 shadow-inner"></div>
          </label>
        </div>

        {/* НАЛАШТУВАННЯ ОФЛАЙНУ (Показуємо тільки якщо увімкнено) */}
        {config.is_offline && (
          <div className="space-y-6 animate-in slide-in-from-top-2">
            
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50">
              <label className="block text-xs font-bold text-slate-400 mb-4 uppercase tracking-wide flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-blue-400" /> Які категорії йдуть в офлайн?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categories.map(cat => (
                  <label key={cat.id} className={`flex items-center p-4 rounded-xl border cursor-pointer transition-all ${config.offline_categories.includes(cat.id) ? 'bg-amber-900/20 border-amber-500/50 text-amber-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'}`}>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={config.offline_categories.includes(cat.id)}
                      onChange={() => toggleCategory(cat.id)}
                    />
                    <div className={`w-5 h-5 rounded border mr-3 flex items-center justify-center transition-colors ${config.offline_categories.includes(cat.id) ? 'bg-amber-500 border-amber-500 text-slate-900' : 'bg-slate-800 border-slate-600'}`}>
                      {config.offline_categories.includes(cat.id) && <CheckSquare className="w-4 h-4" />}
                    </div>
                    <span className="font-bold text-sm">{cat.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50">
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Повідомлення для клієнтів</label>
              <p className="text-xs text-slate-500 mb-4">Цей текст клієнти побачать у кошику, якщо вони купують офлайн-товар.</p>
              <textarea 
                required
                value={config.offline_message}
                onChange={(e) => setConfig({ ...config, offline_message: e.target.value })}
                placeholder="🌙 Оператор зараз офлайн..."
                rows="3"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-amber-400 font-medium text-sm focus:border-amber-500 outline-none transition-colors resize-none"
              />
            </div>
            
          </div>
        )}

        <button 
          type="submit"
          disabled={isSaving || (config.is_offline && config.offline_categories.length === 0)}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-blue-900/40"
        >
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {isSaving ? 'Збереження...' : 'Зберегти налаштування'}
        </button>
      </form>
    </div>
  );
};

export default AdminStoreSettings;