import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X, DollarSign, Percent, Save, ListChecks, Star, Edit, Trash2, ArrowUp, ArrowDown, Send, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiPost, apiPut, apiDelete, handleApiError } from '../../config/apiClient';
import { API_ENDPOINTS, getFullUrl } from '../../config/api';

const AdminOther = ({ adminOtherItems, setAdminOtherItems, fetchOtherItems, openConfirmDialog }) => {
  const { t } = useTranslation();
  const [editingOtherId, setEditingOtherId] = useState(null); 

  const [otherItemName, setOtherItemName] = useState('');
  const [otherItemDesc, setOtherItemDesc] = useState('');
  const [otherItemTag, setOtherItemTag] = useState('');
  const [otherItemColor, setOtherItemColor] = useState('blue');

  const [otherItemPrice, setOtherItemPrice] = useState('');
  const [otherItemMarkup, setOtherItemMarkup] = useState('');
  const [otherMarkupType, setOtherMarkupType] = useState('fixed');
  const [requiredFields, setRequiredFields] = useState(['Nickname', 'Guild']); 
  const [newField, setNewField] = useState('');
  const [isTgOnly, setIsTgOnly] = useState(false);

  const getFinalPrice = (price, mup, type) => {
    const p = parseFloat(price || 0);
    const m = parseFloat(mup || 0);
    return type === 'fixed' ? (p + m).toFixed(2) : (p + (p * (m / 100))).toFixed(2);
  };

  const handleEditOtherClick = (item) => {
    setEditingOtherId(item.id);
    setOtherItemName(item.name);
    setOtherItemDesc(item.desc);
    setOtherItemTag(item.tag || '');
    setOtherItemColor(item.color || 'blue');
    setOtherItemPrice(item.base_price || item.price); 
    setOtherItemMarkup('');
    setOtherMarkupType('fixed');
    setRequiredFields(item.requiredFields || []);
    setIsTgOnly(Boolean(item.is_tg_only));
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.success(t('common.success'));
  };

  const cancelEditOther = () => {
    setEditingOtherId(null);
    setOtherItemName(''); setOtherItemDesc(''); setOtherItemTag(''); setOtherItemPrice(''); setOtherItemMarkup(''); 
    setRequiredFields(['Nickname', 'Guild']);
    setIsTgOnly(false);
  };

  const handlePublishOtherItem = async (forceTgOnly = null) => {
    if (!otherItemName || !otherItemPrice) return toast.error(t('common.error'));

    const tgOnlyVal = forceTgOnly !== null ? forceTgOnly : isTgOnly;

    const newItemData = {
      name: otherItemName,
      desc: otherItemDesc,
      price: getFinalPrice(otherItemPrice, otherItemMarkup, otherMarkupType),
      base_price: otherItemPrice.toString(),
      tag: otherItemTag,
      color: otherItemColor,
      requiredFields: requiredFields,
      is_tg_only: Boolean(tgOnlyVal)
    };

    const toastId = toast.loading(t('common.loading'));
    try {
      if (editingOtherId) {
        await apiPut(getFullUrl(API_ENDPOINTS.OTHER_ITEM_UPDATE(editingOtherId)), newItemData);
        toast.success(t('common.success'), { id: toastId });
      } else {
        await apiPost(getFullUrl(API_ENDPOINTS.OTHER_ITEM_CREATE), newItemData);
        toast.success(tgOnlyVal ? 'Товар збережено та додано лише в Telegram!' : t('common.success'), { id: toastId });
      }
      fetchOtherItems();
      cancelEditOther();
    } catch (error) {
      handleApiError(error, t('common.error'));
      toast.dismiss(toastId);
    }
  };

  const handlePublishToTg = async (item) => {
    const toastId = toast.loading('Надсилання товару в Telegram-вітрину...');
    try {
      await apiPost(getFullUrl(API_ENDPOINTS.OTHER_ITEM_PUBLISH_TG(item.id)), {});
      toast.success('Товар успішно надіслано в Telegram!', { id: toastId });
    } catch (error) {
      handleApiError(error, 'Помилка надсилання в Telegram');
      toast.dismiss(toastId);
    }
  };

  const handleDeleteOtherItem = async (id) => {
    openConfirmDialog(
      t('common.delete'),
      t('common.confirm'),
      async () => {
        const toastId = toast.loading('Видалення товару...');
        try {
          await apiDelete(getFullUrl(API_ENDPOINTS.OTHER_ITEM_DELETE(id)));
          if (editingOtherId === id) {
            cancelEditOther();
          }
          fetchOtherItems();
          toast.success('Товар успішно видалено!', { id: toastId });
        } catch (error) {
          handleApiError(error, t('common.error'));
          toast.dismiss(toastId);
        }
      },
      true
    );
  };

  const moveOtherItem = (index, direction) => {
    const newItems = [...adminOtherItems];
    if (direction === 'up' && index > 0) {
      [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    } else if (direction === 'down' && index < newItems.length - 1) {
      [newItems[index + 1], newItems[index]] = [newItems[index], newItems[index + 1]];
    }
    setAdminOtherItems(newItems);
  };

  const saveOtherItemsOrder = async () => {
    const toastId = toast.loading(t('common.loading'));
    try {
      const payload = adminOtherItems.map(it => ({
        name: it.name,
        desc: it.desc,
        price: it.price,
        base_price: it.base_price || it.price,
        tag: it.tag || '',
        color: it.color || 'blue',
        requiredFields: it.requiredFields || [],
        is_tg_only: Boolean(it.is_tg_only)
      }));
      await apiPost(getFullUrl(API_ENDPOINTS.OTHER_ITEMS_BULK), payload);
      toast.success(t('common.success'), { id: toastId });
      fetchOtherItems();
    } catch (error) {
      handleApiError(error, t('common.error'));
      toast.dismiss(toastId);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-center justify-between bg-[#0c1017] border border-white/[0.08] p-6 rounded-3xl shadow-2xl gap-4">
        <div>
          <h1 className="text-2xl font-black text-white mb-1 flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-gradient-to-br from-red-600/20 to-rose-600/10 border border-red-500/20 text-rose-500">
              <Star className="w-6 h-6" />
            </span>
            {t('admin.other.title', 'Інші товари та послуги')}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Керування кастомними товарами, бустом та додатковими послугами магазину (з підтримкою товарів лише для Telegram)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button onClick={saveOtherItemsOrder} className="flex-1 sm:flex-none px-4 py-3 bg-[#070b12] hover:bg-white/[0.06] text-slate-300 hover:text-white border border-white/[0.08] font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all">
            <ListChecks className="w-4 h-4" /> {t('admin.other.saveOrderBtn', 'Зберегти порядок')}
          </button>
          
          <button onClick={() => handlePublishOtherItem(true)} className="flex-1 sm:flex-none px-5 py-3 bg-gradient-to-r from-sky-600 via-sky-500 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_18px_rgba(14,165,233,0.35)] transition-all">
            <Send className="w-4 h-4" /> Лише в Telegram
          </button>

          <button onClick={() => handlePublishOtherItem(null)} className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_18px_rgba(225,29,72,0.35)] transition-all">
            <Save className="w-4 h-4" /> {editingOtherId ? t('admin.other.saveChangesBtn', 'Зберегти зміни') : t('admin.other.publishBtn', 'Опублікувати')}
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* ФОРМА СТВОРЕННЯ / РЕДАГУВАННЯ */}
        <div className="xl:col-span-7 bg-[#0c1017] border border-white/[0.08] rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.06]">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-rose-500" /> {editingOtherId ? t('admin.other.editTitle', 'Редагування товару') : t('admin.other.createTitle', 'Новий товар / послуга')}
            </h3>
            {editingOtherId && (
              <button onClick={cancelEditOther} className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1">
                <X className="w-4 h-4" /> {t('admin.other.cancelBtn', 'Скасувати')}
              </button>
            )}
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('admin.other.nameLabel', 'Назва')}</label>
              <input type="text" value={otherItemName} onChange={e => setOtherItemName(e.target.value)} placeholder={t('admin.other.namePlaceholder', 'Наприклад: Буст замку...')} className="w-full bg-[#070b12] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:border-red-500 outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('admin.other.descLabel', 'Опис')}</label>
              <textarea rows="2" value={otherItemDesc} onChange={e => setOtherItemDesc(e.target.value)} className="w-full bg-[#070b12] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm resize-none focus:border-red-500 outline-none transition-colors" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('admin.other.tagLabel', 'Тег (бейдж)')}</label>
                <input type="text" value={otherItemTag} onChange={e => setOtherItemTag(e.target.value)} placeholder={t('admin.other.tagPlaceholder', 'HOT / VIP / ТОП')} className="w-full bg-[#070b12] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:border-red-500 outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('admin.other.colorLabel', 'Колір акценту')}</label>
                <select value={otherItemColor} onChange={e => setOtherItemColor(e.target.value)} className="w-full bg-[#070b12] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:border-red-500 outline-none appearance-none">
                  <option value="blue">{t('admin.other.colorBlue', 'Синій')}</option>
                  <option value="red">{t('admin.other.colorRed', 'Червоний')}</option>
                  <option value="orange">{t('admin.other.colorOrange', 'Помаранчевий')}</option>
                  <option value="green">{t('admin.other.colorGreen', 'Зелений')}</option>
                  <option value="purple">{t('admin.other.colorPurple', 'Фіолетовий')}</option>
                </select>
              </div>
            </div>

            {/* ПЕРЕМИКАЧ: ТІЛЬКИ В TELEGRAM */}
            <div className={`p-4 rounded-2xl border transition-all ${isTgOnly ? 'bg-sky-500/10 border-sky-500/30' : 'bg-[#070b12] border-white/[0.08]'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border transition-colors ${isTgOnly ? 'bg-sky-500/20 border-sky-500/40 text-sky-400' : 'bg-white/[0.05] border-white/[0.08] text-slate-400'}`}>
                    {isTgOnly ? <Send className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      {isTgOnly ? '📱 Товар лише в Telegram' : '🌐 Сайт + Telegram'}
                      {isTgOnly && (
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">Приховано на сайті</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {isTgOnly 
                        ? 'Товар НЕ буде відображатись клієнтам на сайті, доступний лише в Telegram-вітрині та адмінці' 
                        : 'Товар публікується і в каталозі сайту, і в Telegram-вітрині'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsTgOnly(!isTgOnly)}
                  className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isTgOnly ? 'bg-sky-500' : 'bg-slate-700'}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${isTgOnly ? 'translate-x-6' : 'translate-x-0'}`}
                  />
                </button>
              </div>
            </div>
          </div>
          
          <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">{t('admin.other.pricingTitle', 'Ціноутворення та націнка')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#070b12] p-4 rounded-2xl border border-white/[0.06]">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('admin.other.costLabel', 'Собівартість ($)')}</label>
              <input type="number" value={otherItemPrice} onChange={(e) => setOtherItemPrice(e.target.value)} className="w-full bg-[#0c1017] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:border-red-500 outline-none transition-colors" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-400">{t('admin.other.markupLabel', 'Націнка')}</label>
                <div className="flex bg-[#0c1017] border border-white/[0.08] rounded-lg p-0.5">
                  <button onClick={() => setOtherMarkupType('fixed')} className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${otherMarkupType === 'fixed' ? 'bg-red-600 text-white' : 'text-slate-400'}`}><DollarSign className="w-3 h-3" /></button>
                  <button onClick={() => setOtherMarkupType('percent')} className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${otherMarkupType === 'percent' ? 'bg-red-600 text-white' : 'text-slate-400'}`}><Percent className="w-3 h-3" /></button>
                </div>
              </div>
              <input type="number" value={otherItemMarkup} onChange={(e) => setOtherItemMarkup(e.target.value)} className="w-full bg-[#0c1017] border border-white/[0.08] rounded-xl px-4 py-2.5 text-rose-400 font-mono font-bold text-sm focus:border-red-500 outline-none transition-colors" />
            </div>
            <div className="sm:col-span-2 pt-2 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-xs text-slate-400 font-bold">{t('admin.other.finalPriceLabel', 'Фінальна ціна для клієнта')}:</span>
              <span className="text-xl font-black text-emerald-400 font-mono">${getFinalPrice(otherItemPrice, otherItemMarkup, otherMarkupType)}</span>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-white/[0.06]">
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2"><ListChecks className="w-4 h-4 text-blue-400" /> {t('admin.other.receiveDataTitle', 'Дані для отримання від клієнта')}</h3>
            <p className="text-xs text-slate-400 mb-3">{t('admin.other.receiveDataDesc', 'Поля, які клієнт обов’язково вказує при оформленні')}</p>
            
            <div className="flex gap-2 mb-3">
              <input type="text" value={newField} onChange={(e) => setNewField(e.target.value)} placeholder={t('admin.other.fieldPlaceholder', 'Наприклад: IGG ID, Координати...')} className="flex-1 bg-[#070b12] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:border-red-500 outline-none transition-colors" />
              <button onClick={() => { if(newField.trim()) { setRequiredFields([...requiredFields, newField.trim()]); setNewField(''); } }} className="px-4 py-2.5 bg-white/[0.06] hover:bg-white/[0.12] text-white font-bold text-xs rounded-xl transition-colors">{t('admin.other.addBtn', 'Додати')}</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {requiredFields.map((field, index) => (
                <div key={index} className="flex items-center gap-2 bg-[#070b12] border border-white/[0.08] text-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold">
                  {field}
                  <button onClick={() => setRequiredFields(requiredFields.filter((_, i) => i !== index))} className="text-slate-500 hover:text-rose-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* СПИСОК СТВОРЕНИХ ТОВАРІВ */}
        <div className="xl:col-span-5 bg-[#0c1017] border border-white/[0.08] rounded-3xl p-6 shadow-2xl flex flex-col">
          <h3 className="text-base font-bold text-white mb-4 pb-3 border-b border-white/[0.06] flex items-center justify-between">
            <span className="flex items-center gap-2"><Star className="w-4 h-4 text-emerald-400" /> {t('admin.other.itemsTitle', 'Активні пропозиції')}</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300">{adminOtherItems.length}</span>
          </h3>
          
          <div className="space-y-3 overflow-y-auto custom-scrollbar pr-1 max-h-[600px]">
            {adminOtherItems.length === 0 ? (
              <div className="text-center text-slate-500 py-12 text-sm">{t('admin.other.noItems', 'Товарів ще не додано')}</div>
            ) : (
              adminOtherItems.map((item, index) => (
                <div key={item.id} className="bg-[#070b12] border border-white/[0.06] rounded-2xl p-4 flex flex-col group hover:border-red-500/30 transition-all">
                  <div className="flex justify-between items-start mb-1.5 gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-white font-bold text-sm">{item.name}</h4>
                      {item.is_tg_only ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                          <Send className="w-2.5 h-2.5" /> Лише в TG
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <Globe className="w-2.5 h-2.5" /> Сайт
                        </span>
                      )}
                    </div>
                    <span className="text-emerald-400 font-mono font-black text-sm whitespace-nowrap">${item.price}</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3 line-clamp-2 leading-relaxed">{item.desc}</p>
                  
                  <div className="flex justify-between items-center mt-auto pt-3 border-t border-white/[0.04]">
                    {/* СТРІЛКИ ДЛЯ ЗМІНИ ПОРЯДКУ */}
                    <div className="flex gap-1 bg-[#0c1017] rounded-xl p-1 border border-white/[0.06]">
                      <button 
                        onClick={() => moveOtherItem(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        title="Вгору"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => moveOtherItem(index, 'down')}
                        disabled={index === adminOtherItems.length - 1}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        title="Вниз"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => handlePublishToTg(item)} 
                        className="text-slate-400 hover:text-sky-400 p-2 hover:bg-sky-500/10 rounded-xl transition-colors"
                        title="Опублікувати / надіслати в Telegram вітрину"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleEditOtherClick(item)} 
                        className="text-slate-400 hover:text-white p-2 hover:bg-white/[0.06] rounded-xl transition-colors"
                        title={t('common.edit', 'Редагувати')}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteOtherItem(item.id)} 
                        className="text-slate-400 hover:text-rose-400 p-2 hover:bg-rose-500/10 rounded-xl transition-colors"
                        title={t('common.delete', 'Видалити')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOther;
