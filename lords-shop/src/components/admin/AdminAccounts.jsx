import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  Save, Globe, Calculator, DollarSign, Percent, ListChecks,
  Image as ImageIcon, X, Plus, Search, Edit, Trash2, Loader2, Swords, ShieldCheck, Heart, Crown,
  Zap, Award, TrendingUp, Sparkles, Scale, Send, ArrowLeft
} from 'lucide-react';
import { apiPost, apiPut, apiDelete, handleApiError } from '../../config/apiClient';
import { API_ENDPOINTS, getFullUrl, getImageUrl } from '../../config/api';
import { calculateAccountValuation } from '../../utils/accountValuation';

const StatInputField = ({ label, fieldKey, placeholder, accStats, updateStat, colorMode }) => {
  const isGreen = colorMode === 'leader';
  return (
    <div className={`p-3 rounded-xl border ${isGreen ? 'bg-emerald-900/10 border-emerald-500/30' : 'bg-slate-900/50 border-slate-700/50'}`}>
      <label className={`block text-[11px] font-bold mb-2 uppercase tracking-wider ${isGreen ? 'text-emerald-500' : 'text-slate-400'}`}>
        {label}
      </label>
      <input
        type="text"
        placeholder={placeholder}
        value={accStats[fieldKey] || ''}
        onChange={(e) => updateStat(fieldKey, e.target.value)}
        className={`w-full bg-slate-950 border rounded-lg px-3 py-2 font-bold text-xs outline-none transition-colors ${
          isGreen ? 'border-emerald-500/50 text-emerald-400 focus:border-emerald-400' : 'border-slate-700 text-slate-300 focus:border-slate-500'
        }`}
      />
    </div>
  );
};

const SingleStatInput = ({ label, fieldKey, placeholder, accStats, updateStat }) => (
  <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider">{label}</label>
    <input
      type="text"
      placeholder={placeholder}
      value={accStats[fieldKey] || ''}
      onChange={(e) => updateStat(fieldKey, e.target.value)}
      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold text-xs focus:border-blue-500 outline-none transition-colors"
    />
  </div>
);

const AdminAccounts = ({ adminAccounts, fetchAccounts, openConfirmDialog }) => {
  const { t } = useTranslation();

  const [editingAccountId, setEditingAccountId] = useState(null); // 🔥 НОВИЙ СТЕЙТ ДЛЯ РЕДАГУВАННЯ
  const [activeView, setActiveView] = useState('catalog'); // 'catalog' | 'form'
  const [isSyncingTg, setIsSyncingTg] = useState(false);

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

  const [mainImageFile, setMainImageFile] = useState(null);
  const [mainImagePreview, setMainImagePreview] = useState(null);
  const [additionalFiles, setAdditionalFiles] = useState([]);
  const [additionalPreviews, setAdditionalPreviews] = useState([]);

  const [isPublishing, setIsPublishing] = useState(false);

  const [statMode, setStatMode] = useState('leader');

  const initialStats = {
    // 🔥 КЛЮЧОВІ ДАНІ ДЛЯ ОЦІНКИ ТА ПОРІВНЯННЯ АКАУНТІВ (LM SCORING) 🔥
    white_stats: '',
    mix_stats: '',
    blast_stats: '',
    army_atk: '',
    army_hp: '',
    mana_troops_lvl: '0',
    artifact_lvl: '',
    castle_skins_lvl: '',
    champ_pieces: '',
    is_low_might: false,
    max_kd: '',

    // Сумісні старі поля
    mix_atk_leader: '', mix_atk_base: '',
    mono_atk_leader: '',
    army_mix_atk_leader: '', army_mix_atk_base: '',
    army_mono_atk_leader: '',
    
    mix_def_leader: '', mix_def_base: '',
    mono_def_leader: '',
    army_mix_def_leader: '', army_mix_def_base: '',
    army_mono_def_leader: '',
    
    mix_hp_leader: '', mix_hp_base: '',
    mono_hp_leader: '',
    army_mix_hp_leader: '', army_mix_hp_base: '',
    army_mono_hp_leader: '',
    
    castle: '', blessed: '', champ_gear: '', heroes: '',
    familiars: '', artifacts: '', attribute_lvl: ''
  };

  const [accStats, setAccStats] = useState(initialStats);
  const [customFields, setCustomFields] = useState([]);

  const addCustomField = () => setCustomFields([...customFields, { label: '', value: '' }]);
  const updateCustomField = (index, key, newValue) => {
    const updatedFields = [...customFields];
    updatedFields[index][key] = newValue;
    setCustomFields(updatedFields);
  };
  const removeCustomField = (index) => setCustomFields(customFields.filter((_, i) => i !== index));
  const updateStat = (key, value) => setAccStats(prev => ({ ...prev, [key]: value }));

  const handleMainImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMainImageFile(file);
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
      URL.revokeObjectURL(newPreviews[indexToRemove]);
      newPreviews.splice(indexToRemove, 1);
      return newPreviews;
    });
  };

  const clearForm = () => {
    setEditingAccountId(null);
    setAccTitle(''); setAccShortDesc(''); setSellerPrice(''); setMarkup('');
    setAccTags(''); setAccBind('');
    setMainImageFile(null); setMainImagePreview(null);
    setAdditionalFiles([]); setAdditionalPreviews([]);
    setAccStats(initialStats);
    setCustomFields([]); 
    setActiveView('catalog');
  };

  // 🔥 ФУНКЦІЯ ДЛЯ ЗАВАНТАЖЕННЯ АКАУНТА У ФОРМУ 🔥
  const handleEditClick = (acc) => {
    setEditingAccountId(acc.id);
    setActiveView('form');
    setAccTitle(acc.title);
    setAccShortDesc(acc.shortDesc);
    setSellerPrice(acc.base_price || acc.price);
    setAccTags(acc.tags ? acc.tags.join(', ') : '');
    setAccBind(acc.bind);

    if (acc.stats) {
      const s = acc.stats;
      setAccStats({
        white_stats: s.white_stats || s.mix_atk?.base || s.mix_atk_base || '',
        mix_stats: s.mix_stats || s.mix_atk?.leader || s.mix_atk_leader || '',
        blast_stats: s.blast_stats || s.mono_atk?.leader || s.mono_atk_leader || '',
        army_atk: s.army_atk || s.army_mix_atk?.leader || s.army_mix_atk_leader || '',
        army_hp: s.army_hp || s.army_mix_hp?.leader || s.army_mix_hp_leader || '',
        mana_troops_lvl: String(s.mana_troops_lvl ?? '0'),
        artifact_lvl: s.artifact_lvl || s.artifacts || '',
        castle_skins_lvl: s.castle_skins_lvl || s.castle || '',
        champ_pieces: String(s.champ_pieces || s.champ_gear || ''),
        is_low_might: Boolean(s.is_low_might),
        max_kd: s.max_kd || '',

        mix_atk_leader: s.mix_atk?.leader || s.mix_stats || '', 
        mix_atk_base: s.mix_atk?.base || s.white_stats || '',
        mono_atk_leader: s.mono_atk?.leader || s.blast_stats || '',
        army_mix_atk_leader: s.army_mix_atk?.leader || s.army_atk || '', 
        army_mix_atk_base: s.army_mix_atk?.base || '',
        army_mono_atk_leader: s.army_mono_atk?.leader || '',
        
        mix_def_leader: s.mix_def?.leader || '', mix_def_base: s.mix_def?.base || '',
        mono_def_leader: s.mono_def?.leader || '',
        army_mix_def_leader: s.army_mix_def?.leader || '', army_mix_def_base: s.army_mix_def?.base || '',
        army_mono_def_leader: s.army_mono_def?.leader || '',
        
        mix_hp_leader: s.mix_hp?.leader || '', mix_hp_base: s.mix_hp?.base || '',
        mono_hp_leader: s.mono_hp?.leader || '',
        army_mix_hp_leader: s.army_mix_hp?.leader || s.army_hp || '', 
        army_mix_hp_base: s.army_mix_hp?.base || '',
        army_mono_hp_leader: s.army_mono_hp?.leader || '',
        
        castle: s.castle || '',
        blessed: s.blessed || '',
        champ_gear: s.champ_gear || '',
        heroes: s.heroes || '',
        familiars: s.familiars || '',
        artifacts: s.artifacts || '',
        attribute_lvl: s.attribute_lvl || ''
      });
      if (s.custom_inventory) setCustomFields(s.custom_inventory);
    }

    if (acc.images && acc.images.length > 0) {
      setMainImagePreview(getImageUrl(acc.images[0]));
      setAdditionalPreviews(acc.images.slice(1).map(img => getImageUrl(img)));
    } else {
      setMainImagePreview(null);
      setAdditionalPreviews([]);
    }
    
    setMainImageFile(null);
    setAdditionalFiles([]);
    
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Скролимо сторінку вгору до форми
  };

  let finalPriceAcc = 0;
  const sPrice = parseFloat(sellerPrice || 0);
  const mValue = parseFloat(markup || 0);
  if (markupType === 'fixed') finalPriceAcc = sPrice + mValue;
  else finalPriceAcc = sPrice + (sPrice * (mValue / 100));

  const liveValuation = useMemo(() => {
    return calculateAccountValuation({
      price: finalPriceAcc || 1,
      stats: accStats,
      tags: accTags ? accTags.split(',').map(s => s.trim()) : []
    });
  }, [accStats, finalPriceAcc, accTags]);

  const handlePublishAccount = async () => {
    if (!accTitle || !sellerPrice) return toast.error(t('common.error'));
    
    // Перевірка фото потрібна тільки якщо створюємо новий акаунт
    if (!editingAccountId && !mainImageFile && additionalFiles.length === 0) {
      return toast.error('Додайте хоча б одне фото!');
    }

    setIsPublishing(true);
    const toastId = toast.loading('Обробка та збереження акаунта...');

    try {
      const formData = new FormData();
      formData.append('title', accTitle);
      formData.append('shortDesc', accShortDesc);
      formData.append('price', finalPriceAcc.toFixed(2));
      formData.append('base_price', sellerPrice.toString());
      formData.append('tags', accTags);
      formData.append('bind', accBind);

      const structuredStats = {
        // Єдина форма налаштувань для оцінки та відображення
        white_stats: accStats.white_stats || '',
        mix_stats: accStats.mix_stats || '',
        blast_stats: accStats.blast_stats || '',
        army_atk: accStats.army_atk || '',
        army_hp: accStats.army_hp || '',
        mana_troops_lvl: Number(accStats.mana_troops_lvl) || 0,
        artifact_lvl: accStats.artifact_lvl || '',
        castle_skins_lvl: accStats.castle_skins_lvl || '',
        champ_pieces: accStats.champ_pieces || '',
        is_low_might: Boolean(accStats.is_low_might),
        max_kd: accStats.max_kd || '',

        // Автоматичне зіставлення для деталей акаунта та порівняння
        mix_atk: { leader: accStats.mix_stats || '', base: accStats.white_stats || '' },
        mono_atk: { leader: accStats.blast_stats || '', base: accStats.white_stats || '' },
        army_mix_atk: { leader: accStats.army_atk || '', base: '' },
        army_mono_atk: { leader: accStats.army_atk || '', base: '' },
        army_mix_hp: { leader: accStats.army_hp || '', base: '' },
        army_mono_hp: { leader: accStats.army_hp || '', base: '' },

        champ_gear: accStats.champ_pieces ? `${accStats.champ_pieces} pcs` : '',
        artifacts: accStats.artifact_lvl ? `${accStats.artifact_lvl}` : '',
        castle: accStats.castle || '25',
        custom_inventory: customFields.filter(field => field.label && field.label.trim() !== '')
      };

      formData.append('stats', JSON.stringify(structuredStats));

      if (mainImageFile) formData.append('images', mainImageFile);
      additionalFiles.forEach(file => formData.append('images', file));

      if (editingAccountId) {
        // Оновлюємо існуючий
        await apiPut(getFullUrl(`/api/accounts/${editingAccountId}`), formData);
        toast.success('Акаунт оновлено!', { id: toastId });
      } else {
        // Створюємо новий
        await apiPost(getFullUrl(API_ENDPOINTS.ACCOUNT_CREATE), formData);
        toast.success(t('common.success'), { id: toastId });
      }
      
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
        const toastId = toast.loading('Видалення акаунта...');
        try {
          await apiDelete(getFullUrl(API_ENDPOINTS.ACCOUNT_DELETE(id)));
          if (editingAccountId === id) {
            clearForm();
          }
          fetchAccounts();
          toast.success('Акаунт успішно видалено!', { id: toastId });
        } catch (error) {
          handleApiError(error, t('common.error'));
          toast.dismiss(toastId);
        }
      },
      true
    );
  };

  const handleSyncTgAccounts = async () => {
    setIsSyncingTg(true);
    const toastId = toast.loading('Синхронізація акаунтів з Telegram...');
    try {
      const data = await apiPost(getFullUrl(API_ENDPOINTS.TELEGRAM_SYNC_STOREFRONT), {
        mode: 'overwrite',
        group: 'acc'
      });
      toast.success(data.message || 'Акаунти успішно викладено в Telegram!', { id: toastId, duration: 5000 });
    } catch (error) {
      handleApiError(error, 'Помилка синхронізації з Telegram');
      toast.dismiss(toastId);
    } finally {
      setIsSyncingTg(false);
    }
  };

  const filteredAccounts = adminAccounts.filter(acc => {
    const matchesSearch = acc.title.toLowerCase().includes(accSearchQuery.toLowerCase()) ||
                          (acc.id && acc.id.toString() === accSearchQuery);
    const matchesStatus = accStatusFilter === 'all' || acc.status === accStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ШАПКА КЕРУВАННЯ АКАУНТАМИ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0c1017] border border-slate-800 p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-red-900/30 text-red-400 border border-red-500/30">
              ACCOUNTS MANAGER
            </span>
          </div>
          <h1 className="text-2xl font-black text-white">
            {activeView === 'form' 
              ? (editingAccountId ? `Редагування Акаунта #${editingAccountId}` : 'Новий Акаунт')
              : 'Каталог акаунтів'}
          </h1>
          <p className="text-xs text-slate-400">
            {activeView === 'form' ? 'Заповніть характеристики, LM Scoring та завантажте фото' : 'Пошук, зміна статусів (Active/Sold) та синхронізація з Telegram'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Перемикач режимів: Каталог vs Створити */}
          <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveView('catalog')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeView === 'catalog'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_0_15px_rgba(225,29,72,0.35)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListChecks className="w-4 h-4" />
              <span>Список ({filteredAccounts.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (activeView !== 'form') {
                  if (!editingAccountId) clearForm();
                  setActiveView('form');
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeView === 'form'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_0_15px_rgba(225,29,72,0.35)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>{editingAccountId ? `Редагувати #${editingAccountId}` : 'Створити'}</span>
            </button>
          </div>

          {activeView === 'catalog' ? (
            <button
              type="button"
              onClick={handleSyncTgAccounts}
              disabled={isSyncingTg}
              className="px-4 py-2 bg-sky-600/20 hover:bg-sky-600 text-sky-400 hover:text-white border border-sky-500/30 disabled:opacity-50 font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg text-xs"
              title="Очистити та надіслати всі активні акаунти у гілку акаунтів Telegram"
            >
              {isSyncingTg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{isSyncingTg ? 'Синхронізація...' : 'Оновити в TG'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { clearForm(); setActiveView('catalog'); }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl flex items-center gap-1.5 transition-all text-xs border border-slate-700"
              >
                <ArrowLeft className="w-4 h-4" /> До каталогу
              </button>
              <button
                type="button"
                onClick={handlePublishAccount}
                disabled={isPublishing}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/30 text-xs"
              >
                {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isPublishing ? t('common.loading') : (editingAccountId ? 'Зберегти зміни' : 'Опублікувати')}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {activeView === 'form' && (
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg">
          
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Globe className="w-5 h-5 text-blue-400" /> Основна Інформація</h3>
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
                <input type="text" value={accTags} onChange={(e) => setAccTags(e.target.value)} placeholder="T4, T5, Champ..." className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">{t('admin.accounts.bindLabel')}</label>
                <input type="text" value={accBind} onChange={(e) => setAccBind(e.target.value)} placeholder="Facebook, Google..." className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none" />
              </div>
            </div>
          </div>
          
          {/* 🔥 СЕКЦІЯ РЕАЛЬНОЇ ОЦІНКИ ТА ПОРІВНЯННЯ СИЛИ (LM VALUATION SCORING) 🔥 */}
          <div className="mt-8 pt-6 border-t border-slate-800 bg-gradient-to-b from-blue-950/20 to-slate-950/40 p-5 rounded-2xl border border-blue-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  Оцінка та Порівняння Сили (LM Rating)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ключові параметри ринкової вартості та автоматичного розрахунку сили акаунта
                </p>
              </div>

              {liveValuation && (
                <div className="flex items-center gap-2 bg-slate-950 border border-amber-500/30 px-3 py-1.5 rounded-xl shadow-inner">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-slate-300">Live Рейтинг:</span>
                  <span className="text-sm font-black text-amber-400">{liveValuation.totalScore} pts</span>
                  <span className="text-[11px] font-bold text-emerald-400 border-l border-slate-800 pl-2">
                    {liveValuation.valueIndex} pts/$
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                  ⚪ White Stats (Inf-Rng-Cav)
                </label>
                <input
                  type="text"
                  placeholder="напр. 645-623-643"
                  value={accStats.white_stats || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateStat('white_stats', v);
                    if (!accStats.mix_atk_base) updateStat('mix_atk_base', v);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold text-xs focus:border-blue-500 outline-none transition-colors"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Чисті статки без одягу (вага ×3.0)</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                  ⚔️ Mix Stats (Inf-Rng-Cav)
                </label>
                <input
                  type="text"
                  placeholder="напр. 1333-1093-1237"
                  value={accStats.mix_stats || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateStat('mix_stats', v);
                    if (!accStats.mix_atk_leader) updateStat('mix_atk_leader', v);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold text-xs focus:border-blue-500 outline-none transition-colors"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Мікс сет в одязі (вага ×2.0)</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                  💥 Blast Stats (Inf-Rng-Cav)
                </label>
                <input
                  type="text"
                  placeholder="напр. 1630-1560-1626"
                  value={accStats.blast_stats || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateStat('blast_stats', v);
                    if (!accStats.mono_atk_leader) updateStat('mono_atk_leader', v);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold text-xs focus:border-blue-500 outline-none transition-colors"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Моно-ударний сет (вага ×1.2)</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  🛡️ Army ATK (%)
                </label>
                <input
                  type="text"
                  placeholder="напр. 450"
                  value={accStats.army_atk || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateStat('army_atk', v);
                    if (!accStats.army_mix_atk_leader) updateStat('army_mix_atk_leader', v);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold text-xs focus:border-blue-500 outline-none transition-colors"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Загальна атака армії (вага ×0.5)</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  ❤️ Army HP (%)
                </label>
                <input
                  type="text"
                  placeholder="напр. 950"
                  value={accStats.army_hp || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateStat('army_hp', v);
                    if (!accStats.army_mix_hp_leader) updateStat('army_mix_hp_leader', v);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold text-xs focus:border-blue-500 outline-none transition-colors"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Загальне HP армії (вага ×0.5)</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  ⚡ Mana Troops (Рівень 1–6)
                </label>
                <select
                  value={accStats.mana_troops_lvl || '0'}
                  onChange={(e) => updateStat('mana_troops_lvl', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold text-xs focus:border-blue-500 outline-none transition-colors"
                >
                  <option value="0">0 — Немає (0 pts)</option>
                  <option value="1">Lvl 1 — (+50 pts)</option>
                  <option value="2">Lvl 2 — (+100 pts)</option>
                  <option value="3">Lvl 3 — (+150 pts)</option>
                  <option value="4">Lvl 4 — (+200 pts)</option>
                  <option value="5">Lvl 5 — (+400 pts)</option>
                  <option value="6">Lvl 6 — (+500 pts)</option>
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">Мана війська T5</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  📜 Рівень Артефактів (Artifact Lvl)
                </label>
                <input
                  type="number"
                  placeholder="напр. 1850 (макс ~2850)"
                  value={accStats.artifact_lvl || ''}
                  onChange={(e) => updateStat('artifact_lvl', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold text-xs focus:border-blue-500 outline-none transition-colors"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Градація (700 / 1500 / 1500+)</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  🏰 Скіни Замку (Castle Skins Lvl)
                </label>
                <input
                  type="number"
                  placeholder="напр. 85 (макс ~320)"
                  value={accStats.castle_skins_lvl || ''}
                  onChange={(e) => updateStat('castle_skins_lvl', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold text-xs focus:border-blue-500 outline-none transition-colors"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Градація (20 / 80 / 80+)</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  👑 Champ Gear Pieces (0–11 шт)
                </label>
                <input
                  type="number"
                  min="0"
                  max="11"
                  placeholder="напр. 4 (по 120 балів)"
                  value={accStats.champ_pieces || ''}
                  onChange={(e) => updateStat('champ_pieces', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold text-xs focus:border-blue-500 outline-none transition-colors"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Кількість речей чемпіона</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-slate-800/80">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={Boolean(accStats.is_low_might)}
                  onChange={(e) => updateStat('is_low_might', e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-700 focus:ring-0 focus:ring-offset-0"
                />
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                  ⚡ Low Might Beast (0 Quest Might) <span className="text-emerald-400 font-black">+800 pts</span>
                </span>
              </label>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-400">✈️ Max KD:</label>
                <input
                  type="number"
                  placeholder="напр. 1955"
                  value={accStats.max_kd || ''}
                  onChange={(e) => updateStat('max_kd', e.target.value)}
                  className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-bold text-xs focus:border-blue-500 outline-none"
                />
                <span className="text-[10px] text-slate-500">(поріг 1250: +1.5 pts за KD)</span>
              </div>
            </div>
          </div>
          
          {/* Додаткові кастомні характеристики (опціонально) */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-purple-400" /> Додаткові особливості інвентарю
              </span>
              <button 
                type="button"
                onClick={addCustomField}
                className="text-xs flex items-center gap-1 font-bold text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg border border-blue-500/20"
              >
                <Plus className="w-3 h-3" /> Додати поле
              </button>
            </div>

            {customFields.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                {customFields.map((field, idx) => (
                  <div key={idx} className="bg-slate-900/80 p-3 rounded-xl border border-blue-700/50 relative group shadow-sm shadow-blue-900/10">
                    <button 
                      type="button"
                      onClick={() => removeCustomField(idx)} 
                      className="absolute top-2 right-2 text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950 rounded-md p-1"
                      title="Видалити поле"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <input 
                      type="text"
                      placeholder="Назва (напр. EMP шмотка)"
                      value={field.label}
                      onChange={(e) => updateCustomField(idx, 'label', e.target.value)}
                      className="w-[85%] bg-transparent text-[11px] font-bold text-blue-400 mb-2 uppercase tracking-wider outline-none border-b border-transparent focus:border-blue-500/50 pb-0.5 transition-colors placeholder:text-blue-900"
                    />
                    <input 
                      type="text"
                      placeholder="Значення (напр. 3 шт)"
                      value={field.value}
                      onChange={(e) => updateCustomField(idx, 'value', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold text-xs focus:border-blue-500 outline-none transition-colors"
                    />
                  </div>
                ))}
              </div>
            )}
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
      )}
      
      {/* ТАБЛИЦЯ ІСНУЮЧИХ АКАУНТІВ */}
      {activeView === 'catalog' && (
      <div className="bg-[#0c1017] border border-slate-800/90 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-black text-white">{t('admin.accounts.dbTitle')}</h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {filteredAccounts.length}
              </span>
            </div>
            <p className="text-xs text-slate-400">Швидке керування статусами, зміна цін та редагування</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('admin.accounts.searchPlaceholder')}
                value={accSearchQuery}
                onChange={(e) => setAccSearchQuery(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:border-red-500 outline-none w-full sm:w-64 transition-colors"
              />
            </div>
            <select
              value={accStatusFilter}
              onChange={(e) => setAccStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:border-red-500 outline-none cursor-pointer transition-colors"
            >
              <option value="all">{t('admin.accounts.statusAll')}</option>
              <option value="active">🟢 {t('admin.accounts.statusActive')}</option>
              <option value="processing">🟡 {t('admin.accounts.statusProcessing')}</option>
              <option value="sold">🔴 {t('admin.accounts.statusSold')}</option>
            </select>
            <button
              onClick={() => { clearForm(); setActiveView('form'); }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs rounded-xl shadow-lg shadow-red-900/20 transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" /> Додати
            </button>
          </div>
        </div>

        {filteredAccounts.length === 0 ? (
          <div className="text-center text-slate-500 py-16 border-2 border-dashed border-slate-800 rounded-2xl">
            <Search className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <p className="text-sm font-medium">{t('admin.accounts.notFound')}</p>
            <button
              onClick={() => { clearForm(); setActiveView('form'); }}
              className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors"
            >
              ➕ Додати перший акаунт
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAccounts.map(acc => (
              <div 
                key={acc.id} 
                className="bg-slate-900/70 border border-slate-800 hover:border-red-500/40 rounded-2xl p-4 flex flex-col relative overflow-hidden group transition-all duration-200 hover:shadow-xl hover:shadow-red-950/20"
              >
                <div className="w-full h-36 bg-slate-950 rounded-xl mb-3 overflow-hidden border border-slate-800 flex items-center justify-center text-slate-700 relative">
                  {acc.images && acc.images.length > 0 ? (
                    <img 
                      src={getImageUrl(acc.images[0])} 
                      alt={acc.title} 
                      loading="lazy" 
                      decoding="async" 
                      className={`w-full h-full object-cover transition-all group-hover:scale-105 duration-300 ${acc.status === 'sold' ? 'grayscale opacity-40' : ''}`} 
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8" />
                  )}
                  {acc.status === 'sold' && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none bg-black/40 backdrop-blur-[2px]">
                      <span className="bg-red-600 text-white font-black px-3 py-1 rounded-lg border border-red-400 rotate-[-12deg] uppercase tracking-wider text-xs shadow-xl animate-pulse">
                        {t('admin.accounts.soldLabel')}
                      </span>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md text-white text-[10px] px-2 py-0.5 rounded-md font-mono border border-slate-700">
                    ID #{acc.id}
                  </div>
                </div>
                
                <h4 className="text-white font-bold text-sm mb-1 line-clamp-1 group-hover:text-red-400 transition-colors" title={acc.title}>
                  {acc.title}
                </h4>
                
                <div className="flex items-center justify-between mb-3">
                  <div className="text-emerald-400 font-black text-lg">${acc.price}</div>
                  {acc.base_price && Number(acc.base_price) > 0 && (
                    <div className="text-[11px] text-slate-500 font-bold" title="Собівартість">
                      База: ${acc.base_price}
                    </div>
                  )}
                </div>
                
                <div className="mb-4 mt-auto">
                  <select
                    value={acc.status || 'active'}
                    onChange={(e) => handleStatusChange(acc.id, e.target.value)}
                    className={`w-full text-xs font-bold py-2 px-3 rounded-xl outline-none cursor-pointer border transition-colors
                      ${acc.status === 'sold' ? 'bg-red-950/40 text-red-400 border-red-500/40' :
                        acc.status === 'processing' ? 'bg-amber-950/40 text-amber-400 border-amber-500/40' :
                        'bg-emerald-950/40 text-emerald-400 border-emerald-500/40'}
                    `}
                  >
                    <option value="active">🟢 {t('admin.accounts.statusActive')}</option>
                    <option value="processing">🟡 {t('admin.accounts.statusProcessing')}</option>
                    <option value="sold">🔴 {t('admin.accounts.statusSold')}</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEditClick(acc)} 
                    className="flex-1 py-2 bg-slate-800 hover:bg-red-600 text-slate-200 hover:text-white text-xs font-bold rounded-xl flex justify-center items-center gap-1.5 transition-all border border-slate-700 hover:border-red-500 shadow-sm"
                  >
                    <Edit className="w-3.5 h-3.5" /> {t('admin.accounts.editBtn')}
                  </button>
                  <button 
                    onClick={() => handleDeleteAccount(acc.id)} 
                    className="p-2 bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/50 rounded-xl transition-all"
                    title="Видалити акаунт"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}
    </div>
  );
};

export default AdminAccounts;