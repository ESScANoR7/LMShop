import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, CheckCircle2, Lock, Tag, ImageIcon } from 'lucide-react';

// Ми залишаємо цей пустий масив для того, щоб інші сторінки не зламалися, поки ми їх не оновимо
export const mockAccounts = [];

const Accounts = () => {
  // --- НОВИЙ СТАН ДЛЯ БАЗИ ДАНИХ ---
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active'); 
  const [selectedTag, setSelectedTag] = useState('Всі');

  // --- МАГІЯ: Завантажуємо акаунти з сервера ---
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/accounts');
        if (response.ok) {
          const data = await response.json();
          // Перевертаємо масив, щоб нові акаунти були зверху (reverse)
          setAccounts(data.reverse()); 
        }
      } catch (error) {
        console.error("Помилка завантаження бази даних:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAccounts();
  }, []);

  // ДІСТАЄМО УНІКАЛЬНІ ТЕГИ З УСІХ АКАУНТІВ (які вже завантажені)
  const allTags = ['Всі', ...new Set(accounts.flatMap(acc => acc.tags || []))];

  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = acc.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = acc.status === activeTab;
    const matchesTag = selectedTag === 'Всі' || (acc.tags && acc.tags.includes(selectedTag));
    return matchesSearch && matchesStatus && matchesTag;
  });

  return (
    <div className="pb-20 pt-8 max-w-6xl mx-auto px-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">Галерея Акаунтів</h1>
        </div>
        <div className="flex bg-slate-800/50 p-1.5 rounded-xl border border-slate-700 w-full md:w-auto">
          <button onClick={() => setActiveTab('active')} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'active' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}><CheckCircle2 className="w-4 h-4" /> У продажу</button>
          <button onClick={() => setActiveTab('sold')} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'sold' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}><Lock className="w-4 h-4" /> Продані</button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input type="text" placeholder="Пошук..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-12 pr-4 py-4 text-white focus:border-blue-500 outline-none" />
        </div>
      </div>

      {/* ФІЛЬТР ПО ТЕГАХ */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {allTags.map(tag => (
          <button 
            key={tag} 
            onClick={() => setSelectedTag(tag)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap border transition-all ${selectedTag === tag ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'}`}
          >
            {tag !== 'Всі' && '#'}{tag}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-slate-400 animate-pulse font-bold text-xl">Завантаження бази даних...</div>
      ) : filteredAccounts.length === 0 ? (
        <div className="text-center py-20 text-slate-500 font-bold">Нічого не знайдено 😔</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAccounts.map(acc => (
            <div key={acc.id} className={`group bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden hover:border-blue-500/50 transition-all shadow-lg flex flex-col ${acc.status === 'sold' ? 'opacity-80 grayscale hover:grayscale-0' : ''}`}>
              <div className="relative aspect-video overflow-hidden bg-slate-800 flex items-center justify-center">
                {acc.images && acc.images.length > 0 ? (
                  <img src={acc.images[0]} alt={acc.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <ImageIcon className="w-12 h-12 text-slate-600" />
                )}
                <div className="absolute top-4 left-4 flex gap-2"><span className="px-3 py-1 bg-slate-900/80 border border-slate-700 text-white text-xs font-bold rounded-full border-blue-500/50">ID: #{acc.id}</span></div>
                {acc.status === 'sold' && <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center z-10"><div className="px-6 py-2 border-2 border-red-500 text-red-500 text-2xl font-black uppercase rotate-[-15deg] rounded-lg bg-slate-950/80">Продано</div></div>}
              </div>
              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{acc.title}</h3>
                <p className="text-sm text-slate-400 mb-4 line-clamp-2">{acc.shortDesc}</p>
                
                {/* ВІДОБРАЖЕННЯ ТЕГІВ НА КАРТЦІ */}
                <div className="flex flex-wrap gap-2 mb-6 mt-auto">
                  {acc.tags && acc.tags.map(tag => (
                    tag.trim() !== '' && (
                      <span key={tag} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">
                        <Tag className="w-3 h-3 text-blue-400" /> {tag.trim()}
                      </span>
                    )
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <div className="text-2xl font-black text-emerald-400">${acc.price}</div>
                  {acc.status === 'active' ? (
                    <Link to={`/accounts/${acc.id}`} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all">Переглянути</Link>
                  ) : (
                    <button disabled className="px-6 py-3 bg-slate-800 text-slate-500 text-sm font-bold rounded-xl">Недоступно</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default Accounts;