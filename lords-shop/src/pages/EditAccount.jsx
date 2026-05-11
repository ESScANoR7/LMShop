import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Image as ImageIcon, X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const EditAccount = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  // СТАНИ ФОРМИ
  const [accTitle, setAccTitle] = useState('');
  const [accShortDesc, setAccShortDesc] = useState('');
  const [price, setPrice] = useState('');
  const [accTags, setAccTags] = useState('');
  const [accBind, setAccBind] = useState('');
  
  // СТАНИ ФОТОГРАФІЙ
  const [mainImage, setMainImage] = useState(null);
  const [additionalImages, setAdditionalImages] = useState([]);

  // ЗАВАНТАЖУЄМО ДАНІ ПРИ ВІДКРИТТІ
  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/accounts');
        if (response.ok) {
          const data = await response.json();
          const foundAccount = data.find(acc => acc.id === parseInt(id));
          
          if (foundAccount) {
            // Заповнюємо поля даними з бази
            setAccTitle(foundAccount.title);
            setAccShortDesc(foundAccount.shortDesc);
            setPrice(foundAccount.price);
            setAccTags(foundAccount.tags ? foundAccount.tags.join(', ') : '');
            setAccBind(foundAccount.bind || '');
            
            // Розподіляємо картинки: перша -> головна, інші -> додаткові
            if (foundAccount.images && foundAccount.images.length > 0) {
              setMainImage(foundAccount.images[0]);
              setAdditionalImages(foundAccount.images.slice(1));
            }
          }
        }
      } catch (error) {
        toast.error("Помилка завантаження даних");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAccount();
  }, [id]);

  // ОБРОБКА ФОТОГРАФІЙ
  const handleMainImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setMainImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleAdditionalImagesUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setAdditionalImages(prev => [...prev, reader.result]);
      reader.readAsDataURL(file);
    });
  };

  const removeAdditionalImage = (indexToRemove) => {
    setAdditionalImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  // ЗБЕРЕЖЕННЯ ОНОВЛЕНИХ ДАНИХ (PUT-запит)
  const handleUpdateAccount = async () => {
    if (!accTitle || !price) {
      toast.error('Заповніть назву та ціну!');
      return;
    }

    const updatedData = {
      title: accTitle,
      shortDesc: accShortDesc,
      price: price.toString(),
      tags: accTags,
      bind: accBind,
      images: [mainImage, ...additionalImages].filter(Boolean) 
    };

    const toastId = toast.loading('Оновлення в базі даних...');

    try {
      const response = await fetch(`http://localhost:8000/api/accounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });

      if (response.ok) {
        toast.success('Акаунт успішно оновлено!', { id: toastId });
        navigate('/admin'); // Повертаємо в адмінку після збереження
      } else {
        toast.error('Помилка сервера.', { id: toastId });
      }
    } catch (error) {
      toast.error('Немає зв\'язку з базою.', { id: toastId });
    }
  };

  if (isLoading) return <div className="text-white text-center py-20 font-bold">Завантаження...</div>;

  return (
    <div className="min-h-screen bg-slate-950 pb-20 pt-8 max-w-4xl mx-auto px-4">
      <div className="flex items-center justify-between mb-8">
        <Link to="/admin" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" /> Назад в Адмінку
        </Link>
        <button onClick={handleUpdateAccount} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20">
          <Save className="w-5 h-5" /> Зберегти зміни
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-10 shadow-lg space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-6">Редагування Акаунта #{id}</h1>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">Назва акаунта</label>
              <input type="text" value={accTitle} onChange={(e) => setAccTitle(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">Короткий опис</label>
              <textarea rows="3" value={accShortDesc} onChange={(e) => setAccShortDesc(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white resize-none focus:border-blue-500 outline-none" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">Фінальна Ціна (USDT)</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-emerald-400 font-bold focus:border-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">Прив'язка</label>
            <input type="text" value={accBind} onChange={(e) => setAccBind(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">Теги (Через кому)</label>
            <input type="text" value={accTags} onChange={(e) => setAccTags(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none" />
          </div>
        </div>

        {/* БЛОК ФОТОГРАФІЙ */}
        <div className="pt-6 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-bold text-white mb-4">Головне фото</h3>
            {mainImage ? (
              <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-700 group">
                <img src={mainImage} className="w-full h-full object-cover" />
                <button onClick={() => setMainImage(null)} className="absolute top-2 right-2 bg-red-500 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all text-white"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <label className="w-full border-2 border-dashed border-slate-700 hover:border-emerald-500 bg-slate-800/50 rounded-xl flex flex-col items-center justify-center min-h-[150px] cursor-pointer group">
                <input type="file" accept="image/*" className="hidden" onChange={handleMainImageUpload} />
                <ImageIcon className="w-8 h-8 text-slate-500 mb-2 group-hover:text-emerald-400" />
                <span className="text-xs font-bold text-slate-300">Додати фото</span>
              </label>
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold text-white mb-4">Додаткові фото</h3>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {additionalImages.map((imgBase64, idx) => (
                <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-slate-700 group">
                  <img src={imgBase64} className="w-full h-full object-cover" />
                  <button onClick={() => removeAdditionalImage(idx)} className="absolute top-1 right-1 bg-red-500 p-1 rounded text-white opacity-0 group-hover:opacity-100"><X className="w-3 h-3" /></button>
                </div>
              ))}
              <label className="border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-800/50 rounded-lg flex flex-col items-center justify-center aspect-video cursor-pointer group">
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleAdditionalImagesUpload} />
                <Plus className="w-6 h-6 text-slate-500 group-hover:text-blue-400" />
              </label>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EditAccount;