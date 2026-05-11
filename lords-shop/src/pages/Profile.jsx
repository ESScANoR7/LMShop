import React, { useState } from 'react';
import { User, Package, LogOut, KeyRound, Percent, Mail, Lock, Camera, Settings, Shield, CheckCircle2, Gift } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { isLoggedIn, user, login, logout, applyPromo, promoDiscount } = useAuth(); // Додали нові функції з контексту
  
  const [isLoginView, setIsLoginView] = useState(true);
  const [activeTab, setActiveTab] = useState('settings'); // settings, security, orders, bonuses
  
  const [profileData, setProfileData] = useState({
    name: user?.name || 'Player1',
    email: user?.email || 'player@lords.com'
  });

  // Стани для промокоду
  const [promoInput, setPromoInput] = useState('');
  const [promoMessage, setPromoMessage] = useState(null);

  const handleActivatePromo = () => {
    if (!promoInput) return;
    const result = applyPromo(promoInput);
    setPromoMessage(result);
    if (result.success) setPromoInput(''); // Очищаємо поле, якщо успішно
    
    // Ховаємо повідомлення через 4 секунди
    setTimeout(() => setPromoMessage(null), 4000);
  };

  // --- ФОРМА АВТОРИЗАЦІЇ / РЕЄСТРАЦІЇ ---
  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 max-w-md mx-auto">
        <div className="w-20 h-20 bg-blue-900/30 text-blue-400 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-blue-900/20">
          <KeyRound className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">
          {isLoginView ? 'Вхід у кабінет' : 'Створення акаунта'}
        </h2>
        
        <div className="flex items-center justify-center gap-2 text-emerald-400 bg-emerald-900/20 px-4 py-2 rounded-xl border border-emerald-500/20 mb-8">
          <Percent className="w-4 h-4" /> 
          <span className="text-sm font-bold">Знижка -10% після реєстрації!</span>
        </div>

        <form 
          className="w-full bg-slate-800/50 border border-slate-700 p-6 rounded-3xl shadow-xl"
          onSubmit={(e) => {
            e.preventDefault();
            login({ name: isLoginView ? 'Повернутий Гравець' : 'Новий Гравець', email: 'user@example.com' });
          }}
        >
          {!isLoginView && (
            <div className="mb-4 relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input required placeholder="Ваш Нікнейм" className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white text-sm focus:border-blue-500 outline-none transition-colors" />
            </div>
          )}

          <div className="mb-4 relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input required type="email" placeholder="Email адреса" className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white text-sm focus:border-blue-500 outline-none transition-colors" />
          </div>

          <div className="mb-6 relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input required type="password" placeholder="Пароль" className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white text-sm focus:border-blue-500 outline-none transition-colors" />
          </div>

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:-translate-y-0.5">
            {isLoginView ? 'Увійти' : 'Зареєструватися'}
          </button>

          <div className="mt-6 text-center text-sm text-slate-400 border-t border-slate-700/50 pt-4">
            {isLoginView ? "Ще не маєте акаунта? " : "Вже зареєстровані? "}
            <button 
              type="button" 
              onClick={() => setIsLoginView(!isLoginView)} 
              className="text-blue-400 hover:text-blue-300 font-bold transition-colors"
            >
              {isLoginView ? 'Створити зараз' : 'Увійти'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // --- ОСОБИСТИЙ КАБІНЕТ ---
  return (
    <div className="pb-20 pt-8 max-w-5xl mx-auto px-4">
      <h1 className="text-3xl font-bold text-white mb-8">Особистий кабінет</h1>

      <div className="flex flex-col md:flex-row gap-8">
        
        {/* ЛІВА ПАНЕЛЬ: МЕНЮ */}
        <aside className="w-full md:w-72 flex-shrink-0">
          <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-4 sticky top-24">
            
            <div className="flex items-center gap-4 mb-6 p-2">
              <div className="w-12 h-12 bg-blue-900/50 rounded-full flex items-center justify-center border border-blue-500/30 text-blue-400 font-bold text-xl">
                {profileData.name.charAt(0)}
              </div>
              <div>
                <div className="text-white font-bold">{profileData.name}</div>
                <div className="text-xs text-emerald-400 font-medium border border-emerald-500/20 bg-emerald-900/20 px-2 py-0.5 rounded inline-block mt-1">
                  Базова знижка 10%
                </div>
              </div>
            </div>

            <nav className="space-y-2">
              <button 
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
              >
                <Settings className="w-5 h-5" /> Налаштування
              </button>
              <button 
                onClick={() => setActiveTab('bonuses')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${activeTab === 'bonuses' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
              >
                <Gift className="w-5 h-5" /> Бонуси та Промокоди
              </button>
              <button 
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${activeTab === 'security' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
              >
                <Shield className="w-5 h-5" /> Безпека та Пароль
              </button>
              <button 
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${activeTab === 'orders' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
              >
                <Package className="w-5 h-5" /> Мої замовлення
              </button>
            </nav>

            <div className="mt-8 pt-4 border-t border-slate-700">
              <button 
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
              >
                <LogOut className="w-4 h-4" /> Вийти з акаунта
              </button>
            </div>
          </div>
        </aside>

        {/* ПРАВА ПАНЕЛЬ: ВМІСТ ВКАЛОДОК */}
        <main className="flex-1">
          
          {/* ВКЛАДКА: НАЛАШТУВАННЯ */}
          {activeTab === 'settings' && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-4">Загальні налаштування</h2>
              
              <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
                <div className="relative group cursor-pointer">
                  <div className="w-24 h-24 bg-slate-700 rounded-full flex items-center justify-center border-4 border-slate-800 overflow-hidden">
                    <User className="w-12 h-12 text-slate-400" />
                  </div>
                  <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white text-xs font-medium">
                    <Camera className="w-6 h-6 mb-1" />
                    Змінити
                  </div>
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="text-white font-medium mb-1">Фото профілю</h3>
                  <p className="text-xs text-slate-400 mb-3">Рекомендований розмір 256x256px. Максимум 2MB.</p>
                  <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition-colors">
                    Завантажити фото
                  </button>
                </div>
              </div>

              <div className="space-y-5 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Нікнейм на сайті</label>
                  <input 
                    type="text" 
                    value={profileData.name}
                    onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Електронна пошта</label>
                  <input 
                    type="email" 
                    value={profileData.email}
                    onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-400 text-sm focus:border-blue-500 outline-none" 
                  />
                </div>
                <button className="mt-4 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-900/20 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> Зберегти зміни
                </button>
              </div>
            </div>
          )}

          {/* НОВА ВКЛАДКА: БОНУСИ ТА ПРОМОКОДИ */}
          {activeTab === 'bonuses' && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-4">Бонуси та Промокоди</h2>

              {/* Форма вводу промокоду */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-2xl p-6 mb-8">
                <h3 className="text-lg font-bold text-white mb-2">Активація промокоду</h3>
                <p className="text-sm text-slate-400 mb-4">Маєте промокод від адміністратора? Введіть його нижче, щоб отримати додаткову знижку до ваших замовлень.</p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Gift className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input 
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      placeholder="Введіть промокод (напр. VIP5)" 
                      className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-12 pr-4 py-3 text-white text-sm focus:border-blue-500 outline-none uppercase" 
                    />
                  </div>
                  <button 
                    onClick={handleActivatePromo}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20 whitespace-nowrap"
                  >
                    Активувати
                  </button>
                </div>
                
                {/* Повідомлення про успіх або помилку */}
                {promoMessage && (
                  <div className={`mt-3 text-sm font-bold ${promoMessage.success ? 'text-emerald-400' : 'text-red-400'}`}>
                    {promoMessage.message}
                  </div>
                )}
              </div>

              {/* Відображення активних бонусів */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-2xl p-5 relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-500/20 rounded-full blur-xl"></div>
                  <div className="text-emerald-400 font-bold mb-1">Базова знижка</div>
                  <div className="text-3xl font-black text-white">10%</div>
                  <div className="text-xs text-slate-400 mt-2">За реєстрацію на сайті</div>
                </div>

                {promoDiscount > 0 && (
                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-5 relative overflow-hidden animate-in zoom-in duration-300">
                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-500/20 rounded-full blur-xl"></div>
                    <div className="text-blue-400 font-bold mb-1">Активний промокод</div>
                    <div className="text-3xl font-black text-white">{(promoDiscount * 100).toFixed(0)}%</div>
                    <div className="text-xs text-slate-400 mt-2">Додаткова знижка до прайсу</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ВКЛАДКА: БЕЗПЕКА */}
          {activeTab === 'security' && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-4">Безпека та зміна пароля</h2>
              <div className="space-y-5 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Поточний пароль</label>
                  <input type="password" placeholder="••••••••" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Новий пароль</label>
                  <input type="password" placeholder="Мінімум 8 символів" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none" />
                </div>
                <button className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20">
                  Оновити пароль
                </button>
              </div>
            </div>
          )}

          {/* ВКЛАДКА: ІСТОРІЯ ЗАМОВЛЕНЬ */}
          {activeTab === 'orders' && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-4">Мої замовлення</h2>
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Package className="w-16 h-16 text-slate-600 mb-4" />
                <h3 className="text-lg font-bold text-slate-300 mb-2">Тут поки порожньо</h3>
                <p className="text-sm text-slate-500 max-w-sm mb-6">Коли ви зробите своє перше замовлення, воно відобразиться на цій сторінці разом зі статусом виконання.</p>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default Profile;