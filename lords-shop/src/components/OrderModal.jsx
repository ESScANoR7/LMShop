import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext';

const OrderModal = ({ isOpen, onClose, product, type }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    nickname: '',
    guild: '',
    coords: '',
    might: '',
    amount: 100000,
    itemToBuy: ''
  });
    const { addToCart } = useCart();

  if (!isOpen) return null;

 const handleSubmit = (e) => {
  e.preventDefault();
  
  // Додаємо в кошик весь об'єкт з даними товару та введеними даними користувача
  addToCart({
    product: product,
    type: type,
    userData: formData,
    price: product.price || product.rate // Враховуємо і ресурси, і самоцвіти
  });

  onClose();
};

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay - затемнення фону */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Вміст вікна */}
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold text-white mb-6 pr-8">
          {t('order.title')}: <span className="text-blue-400">{product?.name || 'Sapphires'}</span>
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">{t('order.nickname')}</label>
            <input 
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              onChange={(e) => setFormData({...formData, nickname: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">{t('order.guild')}</label>
            <input 
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              onChange={(e) => setFormData({...formData, guild: e.target.value})}
            />
            {type === 'rss' && (
              <p className="text-amber-400 text-[10px] mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {t('order.rssWarning')}
              </p>
            )}
          </div>

          {type === 'rss' ? (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">{t('order.coordinates')}</label>
              <input 
                required
                placeholder="K:123 X:456 Y:789"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                onChange={(e) => setFormData({...formData, coords: e.target.value})}
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">{t('order.might')}</label>
                <input 
                  required
                  type="number"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  onChange={(e) => setFormData({...formData, might: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">{t('order.gemsAmount')}</label>
                <input 
                  required
                  type="number"
                  step="100000"
                  min="100000"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">{t('order.gemsItem')}</label>
                <input 
                  required
                  placeholder="Наприклад: 3x Щит 24г"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  onChange={(e) => setFormData({...formData, itemToBuy: e.target.value})}
                />
              </div>
            </>
          )}

          <button 
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all mt-4 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" /> {t('order.confirm')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OrderModal;