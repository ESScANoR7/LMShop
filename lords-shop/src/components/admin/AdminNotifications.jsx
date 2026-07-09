import React, { useState } from 'react';
import { Send, Bell, AlertTriangle, CheckCircle2, Info, Users, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { apiPost } from '../../config/apiClient'; // Переконайся, що шлях правильний
import { getFullUrl } from '../../config/api';

const AdminNotifications = ({ adminUsers }) => {
  const { t } = useTranslation();
  
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    user_id: '' // Порожнє = Всім
  });
  const [isSending, setIsSending] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.message) {
      toast.error('Заповніть заголовок та текст!');
      return;
    }

    setIsSending(true);
    try {
      const payload = {
        title: formData.title,
        message: formData.message,
        type: formData.type,
        user_id: formData.user_id ? parseInt(formData.user_id) : null
      };

      const res = await apiPost(getFullUrl('/api/admin/notifications/send'), payload);
      toast.success(res.message || 'Сповіщення успішно відправлено!');
      
      setFormData({ title: '', message: '', type: 'info', user_id: '' });
    } catch (error) {
      toast.error('Помилка відправки сповіщення');
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  // Вибір іконки та стилів для попереднього перегляду
  let PreviewIcon, bgClass, borderClass;
  if (formData.type === 'success') {
    PreviewIcon = CheckCircle2;
    bgClass = 'bg-emerald-900/20 text-emerald-400';
    borderClass = 'border-emerald-500/30';
  } else if (formData.type === 'warning') {
    PreviewIcon = AlertTriangle;
    bgClass = 'bg-red-900/20 text-red-400';
    borderClass = 'border-red-500/30';
  } else {
    PreviewIcon = Info;
    bgClass = 'bg-blue-900/20 text-blue-400';
    borderClass = 'border-blue-500/30';
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 shadow-xl">
      <div className="flex items-center gap-3 mb-6 border-b border-slate-700 pb-4">
        <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-900/20">
          <Bell className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Розсилка сповіщень</h2>
          <p className="text-sm text-slate-400">Відправляйте новини, промокоди або попередження клієнтам на сайт та в Telegram.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ФОРМА СТВОРЕННЯ */}
        <form onSubmit={handleSend} className="space-y-5 bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50">
          
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Кому відправити?</label>
            <div className="relative">
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <select
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white text-sm focus:border-blue-500 outline-none transition-colors appearance-none cursor-pointer"
              >
                <option value="">📢 Усім користувачам (Масова розсилка)</option>
                {adminUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    👤 {u.username} (ID: {u.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Тип сповіщення</label>
            <div className="grid grid-cols-3 gap-3">
              <button type="button" onClick={() => setFormData({ ...formData, type: 'info' })} className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${formData.type === 'info' ? 'bg-blue-900/30 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'}`}>
                <Info className="w-5 h-5" /> <span className="text-xs font-bold">Інфо</span>
              </button>
              <button type="button" onClick={() => setFormData({ ...formData, type: 'success' })} className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${formData.type === 'success' ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'}`}>
                <CheckCircle2 className="w-5 h-5" /> <span className="text-xs font-bold">Успіх</span>
              </button>
              <button type="button" onClick={() => setFormData({ ...formData, type: 'warning' })} className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${formData.type === 'warning' ? 'bg-red-900/30 border-red-500 text-red-400' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'}`}>
                <AlertTriangle className="w-5 h-5" /> <span className="text-xs font-bold">Увага</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Заголовок</label>
            <input 
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Наприклад: 🔥 Новий промокод!"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Текст повідомлення</label>
            <textarea 
              required
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Введіть текст повідомлення..."
              rows="4"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none transition-colors resize-none"
            />
          </div>

          <button 
            type="submit"
            disabled={isSending || !formData.title || !formData.message}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-blue-900/40"
          >
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {isSending ? 'Відправка...' : 'Відправити сповіщення'}
          </button>
        </form>

        {/* ПОПЕРЕДНІЙ ПЕРЕГЛЯД */}
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-4 uppercase tracking-wide">Попередній перегляд (як побачить клієнт)</label>
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50">
            
            <div className={`p-4 rounded-xl flex gap-4 ${bgClass} border ${borderClass} shadow-inner`}>
              <div className="mt-1 flex-shrink-0">
                <PreviewIcon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm font-bold text-white break-words">
                    {formData.title || "Заголовок сповіщення"}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono flex-shrink-0 whitespace-nowrap ml-4">
                    {new Date().toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' })}
                  </div>
                </div>
                <div className="text-xs text-slate-300 whitespace-pre-wrap break-words leading-relaxed">
                  {formData.message || "Тут буде текст вашого повідомлення. Він може бути довгим і містити деталі про акцію чи статус."}
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <p className="text-xs text-blue-200 leading-relaxed">
                Якщо користувач прив'язав свій Telegram-акаунт до нашого бота, це повідомлення також <span className="font-bold text-blue-400">миттєво прийде йому в особисті повідомлення</span> в Telegram!
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminNotifications;