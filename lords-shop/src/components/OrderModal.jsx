import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';

const OrderModal = ({ isOpen, onClose, product, type }) => {
  const { t } = useTranslation();
  const { addToCart } = useCart();

  const [formData, setFormData] = useState({
    nickname: '',
    guild: '',
    coords: '',
    might: '',
    amount: 100000,
    itemToBuy: ''
  });

  if (!isOpen || !product) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // 🔥 ТЕПЕР ІНФОРМАЦІЯ ТОЧНО ДІЙДЕ ДО БАЗИ: 
    // Передаємо єдиний об'єкт, як того вимагає твій CartContext
    const cartItem = {
      product: product,
      type: type,
      userData: formData,
      price: product.price || product.rate || product.base_price || 0
    };

    addToCart(cartItem);
    
    toast.success(t('special_page.addedSuccess', 'Додано до кошика!'));
    setFormData({ nickname: '', guild: '', coords: '', might: '', amount: 100000, itemToBuy: '' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay - затемнення фону */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Вміст вікна */}
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 overflow-y-auto max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 hover:bg-rose-500 rounded-full p-1.5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-white mb-6 pr-8 border-b border-slate-800 pb-4 flex items-center gap-2">
          {t('orderModal.title', 'Оформлення')}: <span className="text-blue-400">{product?.name || product?.title || 'Товар'}</span>
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Нікнейм */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">
              {t('orderModal.nickname', 'Нікнейм (нік)')}
            </label>
            <input 
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              onChange={(e) => setFormData({...formData, nickname: e.target.value})}
              value={formData.nickname}
            />
          </div>

          {/* Гільдія */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">
              {t('orderModal.guild', 'Гільдія')}
            </label>
            <input 
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              onChange={(e) => setFormData({...formData, guild: e.target.value})}
              value={formData.guild}
            />
          </div>

          {/* 🔥 ВЕЛИКЕ ЖОВТЕ ПОПЕРЕДЖЕННЯ ТІЛЬКИ ДЛЯ RSS 🔥 */}
          {type === 'rss' && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-amber-400 text-sm font-bold leading-snug">
                {t('orderModal.rssWarning', '⚠️ Гільдія повинна бути відкритою, щоб ми могли доставити ресурси!')}
              </p>
            </div>
          )}

          {/* УМОВНІ ПОЛЯ: Для Ресурсів (RSS) або для Самоцвітів (GEMS) */}
          {type === 'rss' ? (
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">
                {t('orderModal.coordinates', 'Координати замку')}
              </label>
              <input 
                required
                placeholder="K:123 X:456 Y:789"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono text-sm"
                onChange={(e) => setFormData({...formData, coords: e.target.value})}
                value={formData.coords}
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">
                  {t('order.might', 'Міць акаунта')}
                </label>
                <input 
                  required
                  type="number"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  onChange={(e) => setFormData({...formData, might: e.target.value})}
                  value={formData.might}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">
                  {t('order.gemsAmount', 'Кількість самоцвітів')}
                </label>
                <input 
                  required
                  type="number"
                  step="100000"
                  min="100000"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  value={formData.amount}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">
                  {t('order.gemsItem', 'Що саме купити (Товари)')}
                </label>
                <input 
                  required
                  placeholder="Наприклад: 3x Щит 24г, 2x Телепорт"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  onChange={(e) => setFormData({...formData, itemToBuy: e.target.value})}
                  value={formData.itemToBuy}
                />
              </div>
            </>
          )}

          <button 
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all mt-6 flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
          >
            <CheckCircle2 className="w-5 h-5" /> 
            {t('orderModal.confirm', 'Підтвердити')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OrderModal;