import React, { useState } from 'react';
import { Coins, Zap, ShieldCheck, Wallet, CreditCard, Loader2, ArrowRight, CheckCircle2, Calculator } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next'; // 🔥 ІМПОРТ ПЕРЕКЛАДІВ

const TopUp = () => {
  const { t } = useTranslation(); // 🔥 ІНІЦІАЛІЗАЦІЯ ПЕРЕКЛАДУ
  const { isLoggedIn, user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  // Стани для суми
  const [amount, setAmount] = useState(50);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('crypto');

  // Оновлені фіксовані пакети без бонусів
  const presetPackages = [10, 25, 50, 100];

  const handlePresetClick = (val) => {
    setAmount(val);
    setIsCustomMode(false);
  };

  const handleCustomChange = (e) => {
    const val = e.target.value;
    setAmount(val);
    setIsCustomMode(true);
  };

  const handleCheckout = async () => {
    if (!isLoggedIn) {
      toast.error(t('topup.errors.loginRequired'));
      navigate('/profile');
      return;
    }

    const finalAmount = parseFloat(amount);
    if (isNaN(finalAmount) || finalAmount < 1) {
      toast.error(t('topup.errors.minAmount'));
      return;
    }

    setIsLoading(true);

    const orderData = {
      cart: [{
        product: { name: t('topup.cartItemName', { amount: finalAmount.toFixed(2) }) },
        price: finalAmount.toFixed(2),
        type: "topup",
        coins: finalAmount // 1 долар = 1 монета
      }],
      paymentMethod: paymentMethod,
      total: finalAmount.toFixed(2),
      profit: "0.00", 
      user_id: user.id
    };

    try {
      const res = await fetch('http://localhost:8000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (res.ok) {
        toast.success(t('topup.successMessage', { amount: finalAmount.toFixed(2) }));
        navigate('/profile');
      } else {
        toast.error(t('topup.errors.serverError'));
      }
    } catch (error) {
      toast.error(t('topup.errors.networkError'));
    } finally {
      setIsLoading(false);
    }
  };

  const currentAmount = parseFloat(amount) || 0;

  return (
    <div className="pb-20 pt-8 max-w-5xl mx-auto px-4 min-h-[80vh]">
      <div className="text-center mb-12">
        <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.15)] relative">
          <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl animate-pulse"></div>
          <Coins className="w-12 h-12 text-amber-400 relative z-10" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white mb-4">{t('topup.title')}</h1>
        <p className="text-slate-400 max-w-xl mx-auto text-lg">
          {t('topup.subtitle1')} <strong className="text-amber-400 font-bold px-2 py-1 bg-amber-900/20 rounded-lg ml-1">{t('topup.subtitle2')}</strong>
        </p>
      </div>

      <div className="max-w-4xl mx-auto mb-12">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" /> {t('topup.selectAmount')}
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {presetPackages.map((preset) => {
            const isSelected = !isCustomMode && amount === preset;
            return (
              <div 
                key={preset}
                onClick={() => handlePresetClick(preset)}
                className={`relative p-6 rounded-3xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${isSelected ? 'bg-amber-900/20 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)] transform -translate-y-1' : 'bg-slate-900/50 border-slate-800 hover:border-slate-600 hover:bg-slate-800/80'}`}
              >
                {preset === 50 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
                    {t('topup.bestseller')}
                  </div>
                )}
                <div className={`text-3xl font-black flex items-center gap-1.5 transition-colors ${isSelected ? 'text-amber-400' : 'text-white'}`}>
                  {preset} <Coins className={`w-6 h-6 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
                </div>
                <div className="text-sm font-bold text-slate-400">
                  {t('topup.price')} ${preset}
                </div>
              </div>
            );
          })}
        </div>

        {/* ПОЛЕ ВВЕДЕННЯ ДОВІЛЬНОЇ СУМИ */}
        <div 
          onClick={() => setIsCustomMode(true)}
          className={`relative p-1 rounded-3xl border-2 cursor-text transition-all overflow-hidden ${isCustomMode ? 'bg-amber-900/10 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)]' : 'bg-slate-900/50 border-slate-800 hover:border-slate-600'}`}
        >
          {isCustomMode && <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-orange-500/5 pointer-events-none"></div>}
          <div className="flex flex-col sm:flex-row items-center justify-between p-5 relative z-10 gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isCustomMode ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>
                <Calculator className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className={`font-bold ${isCustomMode ? 'text-white' : 'text-slate-300'}`}>{t('topup.customAmount.title')}</div>
                <div className="text-xs text-slate-500">{t('topup.customAmount.subtitle')}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <div className="relative w-full sm:w-48">
                <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-black text-lg transition-colors ${isCustomMode ? 'text-amber-400' : 'text-slate-500'}`}>$</span>
                <input 
                  type="number" 
                  min="1"
                  step="1"
                  placeholder="0.00"
                  value={isCustomMode ? amount : ''}
                  onChange={handleCustomChange}
                  onFocus={() => setIsCustomMode(true)}
                  className={`w-full bg-slate-950 border-2 rounded-2xl pl-8 pr-4 py-3 text-right text-xl font-black outline-none transition-colors ${isCustomMode ? 'border-amber-500/50 text-white focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10' : 'border-slate-700 text-slate-300'}`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* МЕТОДИ ОПЛАТИ */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" /> {t('topup.payment.title')}
          </h3>
          
          <div className="space-y-3">
            <label className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${paymentMethod === 'crypto' ? 'bg-blue-900/20 border-blue-500 shadow-md' : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'}`}>
              <input type="radio" checked={paymentMethod === 'crypto'} onChange={() => setPaymentMethod('crypto')} className="hidden" />
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${paymentMethod === 'crypto' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                <Wallet className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className={`font-bold ${paymentMethod === 'crypto' ? 'text-white' : 'text-slate-300'}`}>{t('topup.payment.crypto.name')}</div>
                <div className="text-xs text-slate-500 mt-1">{t('topup.payment.crypto.desc')}</div>
              </div>
              {paymentMethod === 'crypto' && <CheckCircle2 className="w-6 h-6 text-blue-500" />}
            </label>
            
            <label className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${paymentMethod === 'card' ? 'bg-blue-900/20 border-blue-500 shadow-md' : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'}`}>
              <input type="radio" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} className="hidden" />
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${paymentMethod === 'card' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className={`font-bold ${paymentMethod === 'card' ? 'text-white' : 'text-slate-300'}`}>{t('topup.payment.card.name')}</div>
                <div className="text-xs text-slate-500 mt-1">{t('topup.payment.card.desc')}</div>
              </div>
              {paymentMethod === 'card' && <CheckCircle2 className="w-6 h-6 text-blue-500" />}
            </label>
          </div>
        </div>

        {/* ЧЕК І КНОПКА ОПЛАТИ */}
        <div className="lg:col-span-5">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl sticky top-24">
            <h3 className="text-lg font-bold text-white mb-6">{t('topup.summary.title')}</h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <span className="text-slate-400">{t('topup.summary.receive')}</span>
                <span className="text-xl font-black text-amber-400 flex items-center gap-1">
                  {currentAmount > 0 ? currentAmount.toFixed(0) : '0'} <Coins className="w-4 h-4" />
                </span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <span className="text-slate-400">{t('topup.summary.method')}</span>
                <span className="font-bold text-white uppercase">{paymentMethod}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-lg font-bold text-slate-300">{t('topup.summary.total')}</span>
                <span className="text-3xl font-black text-white">${currentAmount > 0 ? currentAmount.toFixed(2) : '0.00'}</span>
              </div>
            </div>

            <button 
              onClick={handleCheckout}
              disabled={isLoading || currentAmount < 1}
              className="w-full py-4.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-950 font-black rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 text-lg h-14"
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                <>{t('topup.summary.payBtn')} <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
            <p className="text-center text-[10px] text-slate-500 mt-4 uppercase tracking-wider font-bold">
              {t('topup.summary.secure')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopUp;