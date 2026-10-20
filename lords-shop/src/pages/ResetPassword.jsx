import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, ShieldCheck, Loader2, ArrowRight, XCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiPost } from '../config/apiClient';
import { API_URL } from '../config/api';
import { useTranslation } from 'react-i18next';

// ==========================================
// КОМПОНЕНТ ВАЛІДАЦІЇ ПАРОЛІВ
// ==========================================
const ValidationMessage = ({ value, minLength, isPasswordConfirm, matchValue, t }) => {
  if (!value) return null; 

  if (isPasswordConfirm) {
    if (value !== matchValue) {
      return (
        <div className="text-red-500 text-[11px] mt-1.5 flex items-center gap-1.5 font-bold animate-in fade-in slide-in-from-top-1">
          <XCircle className="w-3.5 h-3.5"/> {t('profile.validation.passMismatch', 'Паролі не співпадають')}
        </div>
      );
    } else {
      return (
        <div className="text-amber-500 text-[11px] mt-1.5 flex items-center gap-1.5 font-bold animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 className="w-3.5 h-3.5"/> {t('profile.validation.passMatch', 'Паролі співпадають!')}
        </div>
      );
    }
  }

  if (value.length < minLength) {
    return (
      <div className="text-red-500 text-[11px] mt-1.5 flex items-center gap-1.5 font-bold animate-in fade-in slide-in-from-top-1">
        <XCircle className="w-3.5 h-3.5"/> {t('profile.validation.minChars', 'Мінімум символів')} {minLength} ({t('profile.validation.left', 'залишилось')} {minLength - value.length})
      </div>
    );
  }
  
  return (
    <div className="text-amber-500 text-[11px] mt-1.5 flex items-center gap-1.5 font-bold animate-in fade-in slide-in-from-top-1">
      <CheckCircle2 className="w-3.5 h-3.5"/> {t('profile.validation.perfect', 'Відмінно!')}
    </div>
  );
};

const ResetPassword = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error(t('resetPassword.invalidToken', 'Недійсне посилання для відновлення'));
      navigate('/profile');
    }
  }, [token, navigate, t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Перевіряємо, чи пароль має мінімум 8 символів
    if (password.length < 8) return toast.error(t('resetPassword.passTooShort', 'Пароль занадто короткий'));
    if (password !== confirmPassword) return toast.error(t('profile.validation.passMismatch', 'Паролі не співпадають'));

    setIsLoading(true);
    try {
      const data = await apiPost(`${API_URL}/api/reset-password`, { token, new_password: password });
      toast.success(data?.message || t('resetPassword.success', 'Пароль успішно змінено!'), { icon: '🎉' });
      navigate('/profile');
    } catch (error) {
      toast.error(error.message || t('common.error', 'Виникла помилка'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 max-w-md mx-auto min-h-[75vh]">
      <div className="w-20 h-20 bg-red-900/30 text-red-500 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(220,38,38,0.2)] rotate-3">
        <ShieldCheck className="w-10 h-10 drop-shadow-md" />
      </div>
      <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-wide">{t('resetPassword.title', 'Створення пароля')}</h2>
      <p className="text-zinc-400 text-sm font-medium mb-8 text-center">{t('resetPassword.desc', 'Придумайте новий надійний пароль для вашого акаунта.')}</p>

      <form className="w-full bg-zinc-900/60 backdrop-blur-md border border-zinc-800 p-6 md:p-8 rounded-3xl shadow-2xl relative overflow-hidden" onSubmit={handleSubmit}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-[40px] pointer-events-none"></div>
        
        <div className="mb-4 group relative z-10">
          <label className="block text-[10px] font-black text-zinc-500 mb-2 uppercase tracking-wider">{t('resetPassword.newPassword', 'Новий пароль')}</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-red-500 transition-colors" />
            <input 
              required 
              type={showPassword ? "text" : "password"} 
              value={password} 
              onChange={(e) => setPassword(e.target.value.replace(/\s/g, ''))} 
              placeholder={t('resetPassword.placeholderMin', 'Мінімум 8 символів')} 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-12 py-4 text-white text-sm focus:border-red-500 outline-none transition-all shadow-inner font-medium" 
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-amber-500 transition-colors">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {/* 🔥 ВАЛІДАЦІЯ ПАРОЛЯ 🔥 */}
          <ValidationMessage value={password} minLength={8} t={t} />
        </div>

        <div className="mb-8 group relative z-10">
          <label className="block text-[10px] font-black text-zinc-500 mb-2 uppercase tracking-wider">{t('resetPassword.confirmPassword', 'Підтвердіть пароль')}</label>
          <div className="relative">
            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-red-500 transition-colors" />
            <input 
              required 
              type={showConfirmPassword ? "text" : "password"} 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value.replace(/\s/g, ''))} 
              placeholder={t('resetPassword.placeholderRepeat', 'Повторіть пароль')} 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-12 py-4 text-white text-sm focus:border-red-500 outline-none transition-all shadow-inner font-medium" 
            />
            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-amber-500 transition-colors">
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {/* 🔥 ВАЛІДАЦІЯ ПІДТВЕРДЖЕННЯ ПАРОЛЯ 🔥 */}
          <ValidationMessage value={confirmPassword} isPasswordConfirm matchValue={password} t={t} />
        </div>

        <button disabled={isLoading} type="submit" className="relative z-10 w-full bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-black py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:scale-[1.02] flex items-center justify-center gap-2 uppercase tracking-wide">
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
          {t('resetPassword.submitBtn', 'Зберегти пароль')}
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;
