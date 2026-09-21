import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';

const OrderModal = ({ isOpen, onClose, product, type }) => {
  const { t } = useTranslation();
  const { addToCart } = useCart();

  const [formData, setFormData] = useState({
    rssData: '', // 🔥 Єдине поле для ресурсів
    nickname: '',
    guild: '',
    might: '',
    amount: 100000,
    itemToBuy: ''
  });

  // Підтягуємо дані, якщо користувач вже ввів їх на сторінці Resources
  useEffect(() => {
    if (isOpen && product) {
      setFormData(prev => ({
        ...prev,
        rssData: product.prefilledData || ''
      }));
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Передаємо єдиний об'єкт у кошик
    const cartItem = {
      product: product,
      type: type,
      userData: formData,
      price: product.price || product.rate || product.base_price || 0
    };

    addToCart(cartItem);
    
    toast.success(t('special_page.addedSuccess', 'Додано до кошика!'));
    setFormData({ rssData: '', nickname: '', guild: '', might: '', amount: 100000, itemToBuy: '' });
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
          {t('orderModal.title', 'Оформлення')}: <span className={type === 'rss' ? 'text-amber-400' : 'text-blue-400'}>{product?.name || product?.title || 'Товар'}</span>
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* ============================================== */}
          {/* ФОРМА ДЛЯ РЕСУРСІВ (RSS) */}
          {/* ============================================== */}
          {type === 'rss' ? (
            <>
              {/* 🔥 ПОПЕРЕДЖЕННЯ ПРО FORT ТА ГІЛЬДІЮ 🔥 */}
              <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-amber-400 text-sm font-bold leading-snug">
                  {t('orderModal.rssWarningFull', '⚠️ Гравець має бути подалі від Fort та знаходитись у відкритій гільдії у себе в королівстві!')}
                </p>
              </div>

              {/* ЄДИНЕ ПОЛЕ ДЛЯ ДАНИХ */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">
                  {t('orderModal.rssDataLabel', 'Ваші дані (Гільдія, Нікнейм, Координати)')}
                </label>
                <input 
                  required
                  placeholder="[xxx]name123 K:1111 X:111 Y:111"
                  className="w-full bg-slate-950 border-2 border-slate-800 hover:border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono text-sm placeholder:text-slate-600"
                  onChange={(e) => setFormData({...formData, rssData: e.target.value})}
                  value={formData.rssData}
                />
              </div>
            </>
          ) : (
            /* ============================================== */
            /* ФОРМА ДЛЯ САМОЦВІТІВ ТА ІНШОГО (GEMS)          */
            /* ============================================== */
            <>
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

              {/* Міць */}
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

              {/* Кількість */}
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

              {/* Товари */}
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

          {/* 🔥 ІНФОРМАЦІЯ ПРО ТІКЕТ 🔥 */}
          <div className="bg-blue-900/20 border border-blue-800/30 p-3 rounded-lg flex items-start gap-2 mt-4">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-blue-300 text-xs leading-relaxed">
              {t('orderModal.ticketInfo', 'Після оформлення буде створено тікет у Telegram. Як тільки адміністратор звільниться, він відповість вам та виконає замовлення.')}
            </p>
          </div>

          <button 
            type="submit"
            className={`w-full text-white font-bold py-4 rounded-xl transition-all mt-4 flex items-center justify-center gap-2 shadow-lg ${type === 'rss' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'}`}
          >
            <CheckCircle2 className="w-5 h-5" /> 
            {t('orderModal.confirm', 'Додати в кошик')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OrderModal;