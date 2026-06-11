import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X, DollarSign, Percent, Save, ListChecks, Star, Edit, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
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
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.success(t('common.success'));
  };

  const cancelEditOther = () => {
    setEditingOtherId(null);
    setOtherItemName(''); setOtherItemDesc(''); setOtherItemTag(''); setOtherItemPrice(''); setOtherItemMarkup(''); 
    setRequiredFields(['Nickname', 'Guild']);
  };

  const handlePublishOtherItem = async () => {
    if (!otherItemName || !otherItemPrice) return toast.error(t('common.error'));

    const newItemData = {
      name: otherItemName,
      desc: otherItemDesc,
      price: getFinalPrice(otherItemPrice, otherItemMarkup, otherMarkupType),
      base_price: otherItemPrice.toString(),
      tag: otherItemTag,
      color: otherItemColor,
      requiredFields: requiredFields
    };

    const toastId = toast.loading(t('common.loading'));
    try {
      if (editingOtherId) {
        await apiPut(getFullUrl(API_ENDPOINTS.OTHER_ITEM_UPDATE(editingOtherId)), newItemData);
        toast.success(t('common.success'), { id: toastId });
      } else {
        await apiPost(getFullUrl(API_ENDPOINTS.OTHER_ITEM_CREATE), newItemData);
        toast.success(t('common.success'), { id: toastId });
      }
      fetchOtherItems();
      cancelEditOther();
    } catch (error) {
      handleApiError(error, t('common.error'));
      toast.dismiss(toastId);
    }
  };

  const handleDeleteOtherItem = async (id) => {
    openConfirmDialog(
      t('common.delete'),
      t('common.confirm'),
      async () => {
        try {
          await apiDelete(getFullUrl(API_ENDPOINTS.OTHER_ITEM_DELETE(id)));
          fetchOtherItems();
          toast.success(t('common.success'));
        } catch (error) {
          handleApiError(error, t('common.error'));
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
      await apiPost(getFullUrl(API_ENDPOINTS.OTHER_ITEMS_BULK), adminOtherItems);
      toast.success(t('common.success'), { id: toastId });
      fetchOtherItems();
    } catch (error) {
      handleApiError(error, t('common.error'));
      toast.dismiss(toastId);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-lg gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{t('admin.other.title')}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={saveOtherItemsOrder} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg transition-all hover:-translate-y-1">
            <ListChecks className="w-5 h-5" /> {t('admin.other.saveOrderBtn')}
          </button>
          <button onClick={handlePublishOtherItem} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-900/20 hover:-translate-y-1 transition-all">
            <Save className="w-5 h-5" /> {editingOtherId ? t('admin.other.saveChangesBtn') : t('admin.other.publishBtn')}
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* ФОРМА СТВОРЕННЯ / РЕДАГУВАННЯ */}
        <div className="xl:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-400" /> {editingOtherId ? t('admin.other.editTitle') : t('admin.other.createTitle')}
            </h3>
            {editingOtherId && (
              <button onClick={cancelEditOther} className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1">
                <X className="w-4 h-4" /> {t('admin.other.cancelBtn')}
              </button>
            )}
          </div>

          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">{t('admin.other.nameLabel')}</label>
              <input type="text" value={otherItemName} onChange={e => setOtherItemName(e.target.value)} placeholder={t('admin.other.namePlaceholder')} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">{t('admin.other.descLabel')}</label>
              <textarea rows="2" value={otherItemDesc} onChange={e => setOtherItemDesc(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm resize-none focus:border-blue-500 outline-none" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">{t('admin.other.tagLabel')}</label>
                <input type="text" value={otherItemTag} onChange={e => setOtherItemTag(e.target.value)} placeholder={t('admin.other.tagPlaceholder')} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">{t('admin.other.colorLabel')}</label>
                <select value={otherItemColor} onChange={e => setOtherItemColor(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none appearance-none">
                  <option value="blue">{t('admin.other.colorBlue')}</option>
                  <option value="orange">{t('admin.other.colorOrange')}</option>
                  <option value="green">{t('admin.other.colorGreen')}</option>
                  <option value="purple">{t('admin.other.colorPurple')}</option>
                  <option value="red">{t('admin.other.colorRed')}</option>
                </select>
              </div>
            </div>
          </div>
          
          <h3 className="text-lg font-bold text-white mb-4">{t('admin.other.pricingTitle')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
            <div><label className="block text-xs font-medium text-slate-400 mb-2">{t('admin.other.costLabel')}</label><input type="number" value={otherItemPrice} onChange={(e) => setOtherItemPrice(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none" /></div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-slate-400">{t('admin.other.markupLabel')}</label>
                <div className="flex bg-slate-900 border border-slate-700 rounded p-0.5">
                  <button onClick={() => setOtherMarkupType('fixed')} className={`px-2 py-0.5 rounded text-xs font-bold ${otherMarkupType === 'fixed' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}><DollarSign className="w-3 h-3" /></button>
                  <button onClick={() => setOtherMarkupType('percent')} className={`px-2 py-0.5 rounded text-xs font-bold ${otherMarkupType === 'percent' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}><Percent className="w-3 h-3" /></button>
                </div>
              </div>
              <input type="number" value={otherItemMarkup} onChange={(e) => setOtherItemMarkup(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-blue-400 font-bold text-sm focus:border-blue-500 outline-none" />
            </div>
            <div className="sm:col-span-2 pt-2 border-t border-slate-700/50 flex items-center justify-between">
              <span className="text-sm text-slate-400 font-bold">{t('admin.other.finalPriceLabel')}</span>
              <span className="text-2xl font-black text-white">${getFinalPrice(otherItemPrice, otherItemMarkup, otherMarkupType)}</span>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><ListChecks className="w-5 h-5 text-blue-400" /> {t('admin.other.receiveDataTitle')}</h3>
            <p className="text-xs text-slate-400 mb-4">{t('admin.other.receiveDataDesc')}</p>
            
            <div className="flex gap-2 mb-4">
              <input type="text" value={newField} onChange={(e) => setNewField(e.target.value)} placeholder={t('admin.other.fieldPlaceholder')} className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 outline-none" />
              <button onClick={() => { if(newField.trim()) { setRequiredFields([...requiredFields, newField.trim()]); setNewField(''); } }} className="px-4 py-2.5 bg-slate-700 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors">{t('admin.other.addBtn')}</button>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {requiredFields.map((field, index) => (
                <div key={index} className="flex items-center gap-2 bg-blue-900/30 border border-blue-500/30 text-blue-300 px-3 py-1.5 rounded-lg text-sm">
                  {field}
                  <button onClick={() => setRequiredFields(requiredFields.filter((_, i) => i !== index))} className="text-blue-400 hover:text-red-400"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* СПИСОК СТВОРЕНИХ ТОВАРІВ */}
        <div className="xl:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg flex flex-col">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Star className="w-5 h-5 text-emerald-400" /> {t('admin.other.itemsTitle')}
          </h3>
          
          <div className="space-y-3 overflow-y-auto pr-2 max-h-[600px] scrollbar-hide">
            {adminOtherItems.length === 0 ? (
              <div className="text-center text-slate-500 py-10 text-sm">{t('admin.other.noItems')}</div>
            ) : (
              adminOtherItems.map((item, index) => (
                <div key={item.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col group hover:border-blue-500/50 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-white font-bold text-md">{item.name}</h4>
                    <span className="text-emerald-400 font-black">${item.price}</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3 line-clamp-2">{item.desc}</p>
                  
                  <div className="flex justify-between items-center mt-auto pt-3 border-t border-slate-700/50">
                    {/* СТРІЛКИ ДЛЯ ЗМІНИ ПОРЯДКУ */}
                    <div className="flex gap-1 bg-slate-900 rounded-lg p-1 border border-slate-700">
                      <button 
                        onClick={() => moveOtherItem(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => moveOtherItem(index, 'down')}
                        disabled={index === adminOtherItems.length - 1}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEditOtherClick(item)} 
                        className="text-slate-500 hover:text-blue-400 transition-colors p-2 bg-slate-900 rounded-lg"
                        title={t('common.edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteOtherItem(item.id)} 
                        className="text-slate-500 hover:text-red-400 transition-colors p-2 bg-slate-900 rounded-lg"
                        title={t('common.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
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