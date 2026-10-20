import React, { useState } from 'react';
import { ShieldCheck, Eye, EyeOff, Lock, KeyRound, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { apiPost, handleApiError } from '../../config/apiClient';
import { API_ENDPOINTS, getFullUrl } from '../../config/api';
import toast from 'react-hot-toast';

const PasswordStrength = ({ password }) => {
  const checks = [
    { label: 'Мінімум 12 символів', ok: password.length >= 12 },
    { label: 'Є велика літера', ok: /[A-Z]/.test(password) },
    { label: 'Є мала літера', ok: /[a-z]/.test(password) },
    { label: 'Є цифра', ok: /\d/.test(password) },
    { label: 'Є спеціальний символ (!@#...)', ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const passed = checks.filter(c => c.ok).length;
  const strength = passed <= 2 ? 'weak' : passed <= 3 ? 'medium' : 'strong';
  const labels = { weak: 'Слабкий', medium: 'Середній', strong: 'Сильний' };
  const colors = { weak: '#ef4444', medium: '#f59e0b', strong: '#10b981' };

  if (!password) return null;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500">Надійність пароля:</span>
        <span className="text-xs font-black" style={{ color: colors[strength] }}>{labels[strength]}</span>
      </div>
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-all duration-300"
            style={{ background: i < passed ? colors[strength] : '#1e293b' }}
          />
        ))}
      </div>
      <div className="space-y-1">
        {checks.map((check, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${check.ok ? 'bg-emerald-400' : 'bg-slate-700'}`} />
            <span className={`text-[11px] font-medium ${check.ok ? 'text-slate-400' : 'text-slate-600'}`}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminSecurity = () => {
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      toast.error('Новий пароль та підтвердження не збігаються');
      return;
    }
    if (newPass.length < 12) {
      toast.error('Пароль має бути мінімум 12 символів');
      return;
    }
    setIsLoading(true);
    try {
      await apiPost(getFullUrl(API_ENDPOINTS.ADMIN_CHANGE_PASSWORD), {
        old_password: oldPass,
        new_password: newPass,
        confirm_password: confirmPass,
      });
      setSuccess(true);
      toast.success('Пароль змінено! Виконується вихід...', { duration: 3000 });
      // Після успіху — logout через 2 секунди (токени вже інвалідовані)
      setTimeout(() => {
        window.location.href = '/login';
      }, 2500);
    } catch (err) {
      if (err?.status === 429) {
        toast.error('Перевищено ліміт спроб. Спробуйте через 1 годину.', { duration: 6000 });
      } else if (err?.status === 401) {
        toast.error('Невірний поточний пароль', { duration: 4000 });
      } else {
        handleApiError(err, 'Помилка зміни пароля');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-4">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        </div>
        <h2 className="text-xl font-black text-white">Пароль змінено!</h2>
        <p className="text-slate-400 text-sm font-medium text-center">
          Виконується вихід з усіх пристроїв...
        </p>
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    );
  }

  const inputClass = "w-full bg-[#070b12] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm font-medium focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all pr-12";

  return (
    <div className="space-y-6 max-w-lg">

      {/* Заголовок */}
      <div className="bg-[#0c1017] border border-white/[0.08] rounded-3xl p-6 shadow-2xl">
        <h1 className="text-xl font-black text-white flex items-center gap-3 mb-1">
          <span className="p-2.5 rounded-xl bg-gradient-to-br from-red-600/20 to-rose-600/10 border border-red-500/20 text-rose-500">
            <ShieldCheck className="w-5 h-5" />
          </span>
          Безпека та пароль
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Зміна пароля доступу до адміністративної панелі магазину
        </p>
      </div>

      {/* Попередження */}
      <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-500/20 bg-amber-950/20">
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-amber-300">Важливо знати</p>
          <p className="text-xs text-amber-400/80 mt-0.5 font-medium leading-relaxed">
            Після успішної зміни пароля відбудеться автоматичний вихід з усіх пристроїв. Ліміт спроб: 3 рази на годину.
          </p>
        </div>
      </div>

      {/* Форма */}
      <form onSubmit={handleSubmit} className="bg-[#0c1017] border border-white/[0.08] rounded-3xl p-6 shadow-2xl space-y-4">

        {/* Старий пароль */}
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
            Поточний пароль
          </label>
          <div className="relative">
            <input
              type={showOld ? 'text' : 'password'}
              value={oldPass}
              onChange={e => setOldPass(e.target.value)}
              className={inputClass}
              placeholder="Введіть поточний пароль"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowOld(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
            >
              {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Новий пароль */}
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
            Новий пароль
          </label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              className={inputClass}
              placeholder="Мінімум 12 символів"
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowNew(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <PasswordStrength password={newPass} />
        </div>

        {/* Підтвердження */}
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
            Підтвердіть новий пароль
          </label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPass}
              onChange={e => setConfirmPass(e.target.value)}
              className={`${inputClass} ${confirmPass && confirmPass !== newPass ? '!border-rose-500/60 !ring-rose-500/20' : confirmPass && confirmPass === newPass ? '!border-emerald-500/60 !ring-emerald-500/20' : ''}`}
              placeholder="Повторіть новий пароль"
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirmPass && confirmPass !== newPass && (
            <p className="text-rose-400 text-xs font-bold mt-1.5">Паролі не збігаються</p>
          )}
          {confirmPass && confirmPass === newPass && newPass.length >= 12 && (
            <p className="text-emerald-400 text-xs font-bold mt-1.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Паролі збігаються
            </p>
          )}
        </div>

        {/* Кнопка */}
        <button
          type="submit"
          disabled={isLoading || !oldPass || !newPass || !confirmPass || newPass !== confirmPass || newPass.length < 12}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white shadow-[0_0_18px_rgba(225,29,72,0.35)]"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Зміна пароля...
            </>
          ) : (
            <>
              <KeyRound className="w-4 h-4" />
              Змінити пароль
            </>
          )}
        </button>
      </form>

    </div>
  );
};

export default AdminSecurity;
