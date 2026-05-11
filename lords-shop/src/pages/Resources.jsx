import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Gem, PackageOpen, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import OrderModal from '../components/OrderModal';
import { useAuth } from '../context/AuthContext'; 

const Resources = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getPrice, isLoggedIn } = useAuth(); 

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderType, setOrderType] = useState('rss');

  // --- НОВІ СТАНИ ДЛЯ БАЗИ ДАНИХ ---
  const [rssList, setRssList] = useState([]);
  const [gemsList, setGemsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // ЗАВАНТАЖЕННЯ ДАНИХ З СЕРВЕРА
  useEffect(() => {
    const fetchResourcesAndGems = async () => {
      try {
        const [resRss, resGems] = await Promise.all([
          fetch('http://localhost:8000/api/resources'),
          fetch('http://localhost:8000/api/gems')
        ]);

        if (resRss.ok) {
          setRssList(await resRss.json());
        }
        if (resGems.ok) {
          setGemsList(await resGems.json());
        }
      } catch (error) {
        console.error("Помилка завантаження даних:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResourcesAndGems();
  }, []);

  const openOrder = (product, type) => {
    if (type === 'gems') {
      navigate('/gems-builder', { state: { baseRate: product.rate } });
    } else {
      setSelectedProduct({ ...product, price: getPrice(product.price) });
      setOrderType(type);
      setIsModalOpen(true);
    }
  };

  if (isLoading) {
    return <div className="text-center text-slate-400 py-32 text-xl font-bold animate-pulse">Завантаження актуальних цін...</div>;
  }

  return (
    <div className="flex flex-col gap-12 pb-20 pt-8">
      
      <header className="text-center">
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">{t('resources_page.title')}</h1>
        <p className="text-slate-400 max-w-xl mx-auto">
          {t('resources_page.subtitle')}
        </p>
      </header>

      {/* РЕСУРСИ (RSS) */}
      <section>
        <div className="flex items-center gap-3 mb-6 border-b border-slate-700/50 pb-4">
          <div className="p-2 bg-emerald-900/50 rounded-lg text-emerald-400">
            <PackageOpen className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white">{t('resources_page.rssTitle')}</h2>
        </div>

        {rssList.length === 0 ? (
          <div className="text-slate-500 py-4">Немає доступних пакунків ресурсів.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {rssList.map((pack) => (
              <article key={pack.id} className="bg-slate-800/40 border border-slate-700 hover:border-emerald-500/50 rounded-2xl p-5 transition-all hover:bg-slate-800/80 group flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">{pack.name}</h3>
                  </div>
                  <p className="text-sm text-slate-400 mb-6">{pack.desc}</p>
                </div>
                
                <div className="flex items-center justify-between mt-auto">
                  <div>
                    {!isLoggedIn && (
                      <div className="text-xs text-slate-500 line-through">${pack.price}</div>
                    )}
                    <div className="text-2xl font-bold text-white">
                      ${getPrice(pack.price)}
                    </div>
                  </div>

                  <button 
                   onClick={() => openOrder(pack, 'rss')}
                   className="p-3 rounded-xl transition-all bg-blue-600 hover:bg-blue-500 text-white focus:ring-2 focus:ring-blue-400 outline-none"
                  >
                   <ShoppingCart className="w-5 h-5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* САМОЦВІТИ (GEMS) */}
      <section className="mt-8">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-700/50 pb-4">
          <div className="p-2 bg-blue-900/50 rounded-lg text-blue-400">
            <Gem className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white">{t('resources_page.gemsTitle')}</h2>
          
          <div className="ml-auto group relative flex items-center cursor-help">
            <span className="text-xs text-slate-500 mr-2 hidden sm:block">{t('resources_page.tooltipTitle')}</span>
            <Info className="w-5 h-5 text-slate-500 hover:text-blue-400 transition-colors" />
            <div className="absolute right-0 bottom-8 w-64 p-3 bg-slate-800 border border-slate-600 rounded-xl text-xs text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
              {t('resources_page.tooltipDesc')}
            </div>
          </div>
        </div>

        {gemsList.length === 0 ? (
          <div className="text-slate-500 py-4">Немає доступних рейтiв самоцвітів.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {gemsList.map((gem) => (
              <article key={gem.id} className="relative overflow-hidden bg-slate-800/40 border border-slate-700 hover:border-blue-500/50 rounded-2xl p-5 transition-all hover:bg-slate-800/80 group">
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-500/10 blur-xl rounded-full group-hover:bg-blue-500/20 transition-all"></div>
                
                <div className="text-sm text-slate-400 mb-1">{t('resources_page.mightLabel')}</div>
                <h3 className="text-xl font-bold text-white mb-4">{gem.range}</h3>
                
                <div className="flex items-center justify-between border-t border-slate-700/50 pt-4">
                  <div>
                    {!isLoggedIn && (
                      <div className="text-xs text-slate-500 line-through">${gem.rate}</div>
                    )}
                    <div className="text-2xl font-bold text-blue-400">
                      ${getPrice(gem.rate)}
                    </div>
                  </div>
                  
                  <button 
                   onClick={() => openOrder(gem, 'gems')}
                   className="p-3 rounded-xl transition-all bg-slate-700 hover:bg-blue-500 text-white focus:ring-2 focus:ring-blue-400 outline-none"
                  >
                  <ShoppingCart className="w-5 h-5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      
      <OrderModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        product={selectedProduct}
        type={orderType}
      />

    </div>
  );
};

export default Resources;