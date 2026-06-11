import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  Save, Globe, Calculator, DollarSign, Percent, ListChecks,
  Image as ImageIcon, X, Plus, Search, Edit, Trash2, Loader2
} from 'lucide-react';
import { apiPost, apiPut, apiDelete, handleApiError } from '../../config/apiClient';
import { API_ENDPOINTS, getFullUrl } from '../../config/api';
import ConfirmDialog from '../ConfirmDialog';

const AdminAccounts = ({ adminAccounts, fetchAccounts, openConfirmDialog }) => {
  const { t } = useTranslation();

  const [accountFormLng, setAccountFormLng] = useState('ua'); 
  const [sellerPrice, setSellerPrice] = useState('');
  const [markup, setMarkup] = useState('');
  const [markupType, setMarkupType] = useState('fixed'); 

  const [accSearchQuery, setAccSearchQuery] = useState('');
  const [accStatusFilter, setAccStatusFilter] = useState('all');
  
  const [accTitle, setAccTitle] = useState('');
  const [accShortDesc, setAccShortDesc] = useState('');
  const [accTags, setAccTags] = useState('');
  const [accBind, setAccBind] = useState('');
  
  // 🔥 ОНОВЛЕННЯ: Стейт для Файлів та їх Прев'ю (Без Base64!) 🔥
  const [mainImageFile, setMainImageFile] = useState(null);
  const [mainImagePreview, setMainImagePreview] = useState(null);
  const [additionalFiles, setAdditionalFiles] = useState([]);
  const [additionalPreviews, setAdditionalPreviews] = useState([]);
  
  const [isPublishing, setIsPublishing] = useState(false);

  const [accStats, setAccStats] = useState({
    might: '', troops: '', mix_atk: '', heroes: '', artifacts: ''
  });

  const handleMainImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setMainImageFile(file);
    // Створюємо легке локальне прев'ю
    if (mainImagePreview) URL.revokeObjectURL(mainImagePreview);
    setMainImagePreview(URL.createObjectURL(file));
  };

  const handleAdditionalImagesUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    setAdditionalFiles(prev => [...prev, ...files]);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setAdditionalPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeAdditionalImage = (indexToRemove) => {
    setAdditionalFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setAdditionalPreviews(prev => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[indexToRemove]); // Очищаємо пам'ять
      newPreviews.splice(indexToRemove, 1);
      return newPreviews;
    });
  };

  const clearForm = () => {
    setAccTitle(''); setAccShortDesc(''); setSellerPrice(''); setMarkup('');
    setAccTags(''); setAccBind(''); 
    setMainImageFile(null); setMainImagePreview(null);
    setAdditionalFiles([]); setAdditionalPreviews([]);
    setAccStats({ might: '', troops: '', mix_atk: '', heroes: '', artifacts: '' });
  };

  let finalPriceAcc = 0;
  const sPrice = parseFloat(sellerPrice || 0);
  const mValue = parseFloat(markup || 0);
  if (markupType === 'fixed') finalPriceAcc = sPrice + mValue;
  else finalPriceAcc = sPrice + (sPrice * (mValue / 100));

  const handlePublishAccount = async () => {
    if (!accTitle || !sellerPrice) return toast.error(t('common.error'));
    if (!mainImageFile && additionalFiles.length === 0) return toast.error('Додайте хоча б одне фото!');

    setIsPublishing(true);
    const toastId = toast.loading('Обробка та збереження акаунта...');

    try {
      // 🔥 ОНОВЛЕННЯ: Відправляємо FormData замість JSON 🔥
      const formData = new FormData();
      formData.append('title', accTitle);
      formData.append('shortDesc', accShortDesc);
      formData.append('price', finalPriceAcc.toFixed(2));
      formData.append('base_price', sellerPrice.toString());
      formData.append('tags', accTags);
      formData.append('bind', accBind);
      formData.append('stats', JSON.stringify(accStats));

      // Додаємо файли (FastAPI очікує список `images`)
      if (mainImageFile) formData.append('images', mainImageFile);
      additionalFiles.forEach(file => {
        formData.append('images', file);
      });

      await apiPost(getFullUrl(API_ENDPOINTS.ACCOUNT_CREATE), formData);
      
      toast.success(t('common.success'), { id: toastId });
      fetchAccounts();
      clearForm();
    } catch (error) {
      handleApiError(error, t('common.error'));
      toast.dismiss(toastId);
    } finally {
      setIsPublishing(false);
    }
  };
   
  const handleStatusChange = async (id, newStatus) => {
    const toastId = toast.loading(t('common.loading'));
    try {
      await apiPut(getFullUrl(API_ENDPOINTS.ACCOUNT_STATUS(id)), { status: newStatus });
      toast.success(t('common.success'), { id: toastId });
      fetchAccounts();
    } catch (error) {
      handleApiError(error, t('common.error'));
      toast.dismiss(toastId);
    }
  };

  const handleDeleteAccount = async (id) => {
    openConfirmDialog(
      t('admin.accounts.delete'),
      t('common.confirm'),
      async () => {
        try {
          await apiDelete(getFullUrl(API_ENDPOINTS.ACCOUNT_DELETE(id)));
          fetchAccounts();
          toast.success(t('common.success'));
        } catch (error) {
          handleApiError(error, t('common.error'));
        }
      },
      true
    );
  };

  const filteredAccounts = adminAccounts.filter(acc => {
    const matchesSearch = acc.title.toLowerCase().includes(accSearchQuery.toLowerCase()) || 
                          (acc.id && acc.id.toString() === accSearchQuery);
    const matchesStatus = accStatusFilter === 'all' || acc.status === accStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-lg">
        <div><h1 className="text-2xl font-bold text-white mb-1">{t('admin.accounts.title')}</h1></div>
        <button 
          onClick={handlePublishAccount} 
          disabled={isPublishing}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20 hover:-translate-y-1"
        >
          {isPublishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} 
          {isPublishing ? t('common.loading') : t('admin.accounts.publishBtn')}
        </button>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Globe className="w-5 h-5 text-blue-400" /> {t('admin.accounts.textInfoTitle')}</h3>
              <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                {['ua', 'en', 'de'].map(lng => (
                  <button key={lng} onClick={() => setAccountFormLng(lng)} className={`px-4 py-1.5 rounded text-xs font-bold uppercase ${accountFormLng === lng ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>{lng}</button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">{t('admin.accounts.nameLabel')}</label>
                <input type="text" value={accTitle} onChange={(e) => setAccTitle(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">{t('admin.accounts.descLabel')}</label>
                <textarea rows="3" value={accShortDesc} onChange={(e) => setAccShortDesc(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white resize-none focus:outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-white mb-4">{t('admin.accounts.pricingTitle')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">{t('admin.accounts.costLabel')}</label>
                <input type="number" value={sellerPrice} onChange={(e) => setSellerPrice(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-slate-400">{t('admin.accounts.markupLabel')}</label>
                  <div className="flex bg-slate-900 border border-slate-700 rounded p-0.5">
                    <button onClick={() => setMarkupType('fixed')} className={`px-2 py-0.5 rounded text-xs font-bold ${markupType === 'fixed' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}><DollarSign className="w-3 h-3" /></button>
                    <button onClick={() => setMarkupType('percent')} className={`px-2 py-0.5 rounded text-xs font-bold ${markupType === 'percent' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}><Percent className="w-3 h-3" /></button>
                  </div>
                </div>
                <input type="number" value={markup} onChange={(e) => setMarkup(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-emerald-400" />
              </div>
              <div className="sm:col-span-2 pt-2 border-t border-slate-700/50 flex items-center justify-between">
                <span className="text-sm text-slate-400 flex items-center gap-1"><Calculator className="w-4 h-4" /> {t('admin.accounts.finalPriceLabel')}</span><span className="text-xl font-black text-white">${finalPriceAcc.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">{t('admin.accounts.tagsLabel')}</label>
                <input type="text" value={accTags} onChange={(e) => setAccTags(e.target.value)} placeholder={t('admin.accounts.tagsPlaceholder')} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">{t('admin.accounts.bindLabel')}</label>
                <input type="text" value={accBind} onChange={(e) => setAccBind(e.target.value)} placeholder={t('admin.accounts.bindPlaceholder')} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none" />
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-800">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-blue-400" /> {t('admin.accounts.statsTitle')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">{t('admin.accounts.mightLabel')}</label>
                <input type="text" value={accStats.might} onChange={(e) => setAccStats({...accStats, might: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">{t('admin.accounts.troopsLabel')}</label>
                <input type="text" value={accStats.troops} onChange={(e) => setAccStats({...accStats, troops: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">{t('admin.accounts.mixAtkLabel')}</label>
                <input type="text" value={accStats.mix_atk} onChange={(e) => setAccStats({...accStats, mix_atk: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">{t('admin.accounts.heroesLabel')}</label>
                <input type="text" value={accStats.heroes} onChange={(e) => setAccStats({...accStats, heroes: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">{t('admin.accounts.artifactsLabel')}</label>
                <input type="text" value={accStats.artifacts} onChange={(e) => setAccStats({...accStats, artifacts: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm" />
              </div>
            </div>
          </div>

        </div>

        <div className="xl:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg flex flex-col gap-6">
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-emerald-400" /> {t('admin.accounts.mainPhotoTitle')}
            </h3>
            {mainImagePreview ? (
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-700 group shadow-md">
                <img src={mainImagePreview} alt="Cover" className="w-full h-full object-cover" />
                <button onClick={() => { setMainImageFile(null); setMainImagePreview(null); }} className="absolute top-2 right-2 bg-red-500/90 hover:bg-red-500 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <label className="w-full border-2 border-dashed border-slate-700 hover:border-emerald-500 bg-slate-800/50 rounded-2xl flex flex-col items-center justify-center min-h-[200px] cursor-pointer transition-colors group">
                <input type="file" accept="image/*" className="hidden" onChange={handleMainImageUpload} />
                <ImageIcon className="w-10 h-10 text-slate-500 mb-3 group-hover:text-emerald-400 transition-colors" />
                <span className="text-sm font-bold text-slate-300">{t('admin.accounts.addMainPhoto')}</span>
              </label>
            )}
          </div>

          <div className="pt-6 border-t border-slate-800">
            <h3 className="text-md font-bold text-slate-300 mb-4">{t('admin.accounts.additionalPhotosTitle')}</h3>
            {additionalPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {additionalPreviews.map((previewUrl, idx) => (
                  <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-slate-700 group shadow-md">
                    <img src={previewUrl} alt={`Additional ${idx}`} className="w-full h-full object-cover" />
                    <button onClick={() => removeAdditionalImage(idx)} className="absolute top-1 right-1 bg-red-500/90 hover:bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all scale-90 hover:scale-100">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="w-full border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-800/50 rounded-xl flex flex-col items-center justify-center min-h-[80px] cursor-pointer transition-colors group">
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleAdditionalImagesUpload} />
              <span className="text-sm font-bold text-slate-300 flex items-center gap-2 group-hover:text-blue-400 transition-colors">
                <Plus className="w-4 h-4"/> {t('admin.accounts.addAdditionalPhotos')}
              </span>
            </label>
          </div>
        </div>
      </div>
      
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg mt-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="text-xl font-bold text-white">{t('admin.accounts.dbTitle')} ({filteredAccounts.length})</h3>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder={t('admin.accounts.searchPlaceholder')} 
                value={accSearchQuery}
                onChange={(e) => setAccSearchQuery(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none w-full sm:w-64 transition-colors"
              />
            </div>
            <select 
              value={accStatusFilter}
              onChange={(e) => setAccStatusFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:border-blue-500 outline-none cursor-pointer transition-colors"
            >
              <option value="all">{t('admin.accounts.statusAll')}</option>
              <option value="active">{t('admin.accounts.statusActive')}</option>
              <option value="processing">{t('admin.accounts.statusProcessing')}</option>
              <option value="sold">{t('admin.accounts.statusSold')}</option>
            </select>
          </div>
        </div>

        {filteredAccounts.length === 0 ? (
          <div className="text-center text-slate-500 py-16 border-2 border-dashed border-slate-800 rounded-2xl">
            <Search className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <p>{t('admin.accounts.notFound')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredAccounts.map(acc => (
              <div key={acc.id} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex flex-col relative overflow-hidden group hover:border-blue-500/50 transition-all">
                
                <div className="w-full h-32 bg-slate-900 rounded-xl mb-3 overflow-hidden border border-slate-700 flex items-center justify-center text-slate-700 relative">
                  {acc.images && acc.images.length > 0 ? (
                    // 🔥 ДОДАНО loading="lazy" ТА decoding="async" ДЛЯ ПРИШВИДШЕННЯ 🔥
                    <img src={acc.images[0]} alt={acc.title} loading="lazy" decoding="async" className={`w-full h-full object-cover transition-all ${acc.status === 'sold' ? 'grayscale opacity-50' : ''}`} />
                  ) : (
                    <ImageIcon className="w-8 h-8" />
                  )}
                  {acc.status === 'sold' && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                      <span className="bg-red-600/90 text-white font-black px-4 py-1.5 rounded-lg border-2 border-red-400 rotate-[-15deg] uppercase tracking-widest shadow-xl">{t('admin.accounts.soldLabel')}</span>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded font-mono">ID: {acc.id}</div>
                </div>
                
                <h4 className="text-white font-bold text-sm mb-1 line-clamp-1" title={acc.title}>{acc.title}</h4>
                <div className="text-emerald-400 font-bold text-lg mb-3">${acc.price}</div>
                
                <div className="mb-4 mt-auto">
                  <select 
                    value={acc.status || 'active'} 
                    onChange={(e) => handleStatusChange(acc.id, e.target.value)}
                    className={`w-full text-xs font-bold py-2 px-3 rounded-lg outline-none cursor-pointer border transition-colors
                      ${acc.status === 'sold' ? 'bg-red-900/30 text-red-400 border-red-500/30' : 
                        acc.status === 'processing' ? 'bg-amber-900/30 text-amber-400 border-amber-500/30' : 
                        'bg-emerald-900/30 text-emerald-400 border-emerald-500/30'}
                    `}
                  >
                    <option value="active">{t('admin.accounts.statusActive')}</option>
                    <option value="processing">{t('admin.accounts.statusProcessing')}</option>
                    <option value="sold">{t('admin.accounts.statusSold')}</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <Link to={`/admin/edit-account/${acc.id}`} className="flex-1 py-2 bg-slate-700 hover:bg-blue-600 text-white text-xs font-bold rounded-lg flex justify-center items-center gap-1 transition-colors">
                    <Edit className="w-3 h-3" /> {t('admin.accounts.editBtn')}
                  </Link>
                  <button onClick={() => handleDeleteAccount(acc.id)} className="p-2 bg-slate-700 hover:bg-red-500 text-white rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAccounts;