import React, { useState } from 'react';
import { Send, Bell, AlertTriangle, CheckCircle2, Info, Users, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { apiPost } from '../../config/apiClient';
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
    bgClass = 'bg-emerald-950/30 text-emerald-400';
    borderClass = 'border-emerald-500/30';
  } else if (formData.type === 'warning') {
    PreviewIcon = AlertTriangle;
    bgClass = 'bg-rose-950/30 text-rose-400';
    borderClass = 'border-rose-500/30';
  } else {
    PreviewIcon = Info;
    bgClass = 'bg-blue-950/30 text-blue-400';
    borderClass = 'border-blue-500/30';
  }

  return (
    <div className="bg-[#0c1017] border border-white/[0.08] rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 shadow-2xl space-y-6">
      <div className="flex items-center gap-3.5 border-b border-white/[0.06] pb-5">
        <div className="p-3 bg-gradient-to-br from-red-600/20 to-rose-600/10 border border-red-500/20 text-rose-500 rounded-2xl shadow-lg">
          <Bell className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">Центр сповіщень</h2>
          <p className="text-xs text-slate-400 mt-0.5">Розсилайте оголошення, промокоди або повідомлення користувачам на сайт та в Telegram</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ФОРМА СТВОРЕННЯ */}
        <form onSubmit={handleSend} className="space-y-4 bg-[#070b12] p-6 rounded-2xl border border-white/[0.06]">
          
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Одержувач</label>
            <div className="relative">
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <select
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                className="w-full bg-[#0c1017] border border-white/[0.08] rounded-xl pl-11 pr-4 py-3 text-white text-xs font-bold focus:border-red-500 outline-none transition-colors appearance-none cursor-pointer"
              >
                <option value="">📢 Усім зареєстрованим (Масова розсилка)</option>
                {adminUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    👤 {u.username} (ID: #{u.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Тип сповіщення</label>
            <div className="grid grid-cols-3 gap-2">
              <button 
                type="button" 
                onClick={() => setFormData({ ...formData, type: 'info' })} 
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  formData.type === 'info' 
                    ? 'bg-blue-950/40 border-blue-500 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.2)]' 
                    : 'bg-[#0c1017] border-white/[0.06] text-slate-400 hover:text-white'
                }`}
              >
                <Info className="w-4 h-4" /> <span className="text-xs font-bold">Інфо</span>
              </button>
              <button 
                type="button" 
                onClick={() => setFormData({ ...formData, type: 'success' })} 
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  formData.type === 'success' 
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]' 
                    : 'bg-[#0c1017] border-white/[0.06] text-slate-400 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" /> <span className="text-xs font-bold">Успіх</span>
              </button>
              <button 
                type="button" 
                onClick={() => setFormData({ ...formData, type: 'warning' })} 
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  formData.type === 'warning' 
                    ? 'bg-rose-950/40 border-rose-500 text-rose-400 shadow-[0_0_12px_rgba(225,29,72,0.2)]' 
                    : 'bg-[#0c1017] border-white/[0.06] text-slate-400 hover:text-white'
                }`}
              >
                <AlertTriangle className="w-4 h-4" /> <span className="text-xs font-bold">Увага</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Заголовок</label>
            <input 
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Наприклад: 🔥 Нове надходження акаунтів!"
              className="w-full bg-[#0c1017] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:border-red-500 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Текст повідомлення</label>
            <textarea 
              required
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Введіть текст сповіщення для клієнтів..."
              rows="4"
              className="w-full bg-[#0c1017] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:border-red-500 outline-none transition-colors resize-none leading-relaxed"
            />
          </div>

          <button 
            type="submit"
            disabled={isSending || !formData.title || !formData.message}
            className="w-full bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 disabled:opacity-40 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_18px_rgba(225,29,72,0.35)]"
          >
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {isSending ? 'Відправка...' : 'Відправити сповіщення'}
          </button>
        </form>

        {/* ПОПЕРЕДНІЙ ПЕРЕГЛЯД */}
        <div className="flex flex-col justify-between">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Попередній перегляд (як побачить клієнт)</label>
            <div className="bg-[#070b12] p-6 rounded-2xl border border-white/[0.06]">
              
              <div className={`p-4 rounded-2xl flex gap-3.5 ${bgClass} border ${borderClass} shadow-inner`}>
                <div className="mt-0.5 flex-shrink-0">
                  <PreviewIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1.5 gap-2">
                    <div className="text-sm font-bold text-white break-words">
                      {formData.title || "Заголовок сповіщення"}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono flex-shrink-0 whitespace-nowrap">
                      {new Date().toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' })}
                    </div>
                  </div>
                  <div className="text-xs text-slate-300 whitespace-pre-wrap break-words leading-relaxed">
                    {formData.message || "Тут буде текст вашого повідомлення. Він може бути довгим і містити деталі про акцію чи статус."}
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-sky-950/20 border border-sky-500/20 rounded-2xl flex items-start gap-3">
                <Info className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-sky-200/90 leading-relaxed">
                  Якщо користувач запустив нашого Telegram-бота, це сповіщення також <span className="font-bold text-sky-300">миттєво надійде йому в особисті повідомлення</span>!
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminNotifications;