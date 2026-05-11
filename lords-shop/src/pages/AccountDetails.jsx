import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle2, Tag, Image as ImageIcon, 
  ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut 
} from 'lucide-react';
import { useCart } from '../context/CartContext'; 
import toast from 'react-hot-toast'; 

const AccountDetails = () => {
  const { id } = useParams();
  const { addToCart } = useCart(); 
  
  const [account, setAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // --- СТАНИ ДЛЯ ЗУМУ ТА ПЕРЕМІЩЕННЯ (PAN) ---
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Відстежуємо, чи ми саме тягнули фото
  const isPanDragRef = useRef(false);

  // Стан для свайпів
  const [touchStartPos, setTouchStartPos] = useState(null);
  const [touchEndPos, setTouchEndPos] = useState(null);

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/accounts');
        if (response.ok) {
          const data = await response.json();
          const foundAccount = data.find(acc => acc.id === parseInt(id));
          setAccount(foundAccount);
        }
      } catch (error) {
        console.error("Помилка завантаження акаунта:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccount();
  }, [id]);

  const handleBuy = () => {
    if (!account) return;
    addToCart({ product: account, type: 'account', price: account.price });
    toast.success('Акаунт додано до кошика!');
  };

  const resetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const nextImage = (e) => {
    if (e) e.stopPropagation();
    setActiveImage((prev) => (prev === account.images.length - 1 ? 0 : prev + 1));
    resetZoom(); // Автоматично скидаємо зум при перемиканні фото
  };

  const prevImage = (e) => {
    if (e) e.stopPropagation();
    setActiveImage((prev) => (prev === 0 ? account.images.length - 1 : prev - 1));
    resetZoom(); // Автоматично скидаємо зум при перемиканні фото
  };

  // ==========================================
  // ЛОГІКА ПЕРЕТЯГУВАННЯ ФОТО
  // ==========================================
  const startDrag = (clientX, clientY) => {
    if (scale <= 1) return;
    setIsDragging(true);
    isPanDragRef.current = false;
    setDragStart({ x: clientX - pan.x, y: clientY - pan.y });
  };

  const onDragMove = (clientX, clientY) => {
    if (!isDragging || scale <= 1) return;
    
    const newX = clientX - dragStart.x;
    const newY = clientY - dragStart.y;
    
    if (Math.abs(newX - pan.x) > 3 || Math.abs(newY - pan.y) > 3) {
        isPanDragRef.current = true; 
    }

    setPan({ x: newX, y: newY });
  };

  const stopDrag = () => {
    setIsDragging(false);
  };

  // --- ТАЧ ІВЕНТИ (ТЕЛЕФОН) ---
  const handleTouchStart = (e) => {
    if (scale > 1) {
      startDrag(e.touches[0].clientX, e.touches[0].clientY);
    } else {
      setTouchEndPos(null);
      setTouchStartPos(e.targetTouches[0].clientX);
    }
  };

  const handleTouchMove = (e) => {
    if (scale > 1) {
      onDragMove(e.touches[0].clientX, e.touches[0].clientY);
    } else {
      setTouchEndPos(e.targetTouches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    if (scale > 1) {
      stopDrag();
    } else {
      if (!touchStartPos || !touchEndPos) return;
      const distance = touchStartPos - touchEndPos;
      if (distance > 50) nextImage();
      else if (distance < -50) prevImage();
    }
  };

  // --- МИШКА (ПК) ---
  const handleMouseDown = (e) => {
    startDrag(e.clientX, e.clientY);
  };
  const handleMouseMove = (e) => {
    onDragMove(e.clientX, e.clientY);
  };

  const handleWheel = (e) => {
    if (e.deltaY < 0) {
      setScale(prev => Math.min(prev + 0.25, 4));
    } else {
      setScale(prev => {
        const newScale = Math.max(prev - 0.25, 1);
        if (newScale === 1) setPan({ x: 0, y: 0 });
        return newScale;
      });
    }
  };

  if (isLoading) {
    return <div className="text-center text-slate-400 py-20 text-xl font-bold animate-pulse">Завантаження даних акаунта...</div>;
  }

  if (!account) {
    return (
      <div className="text-center text-white py-20 flex flex-col items-center">
        <h2 className="text-2xl font-bold mb-4">Акаунт не знайдено</h2>
        <Link to="/accounts" className="px-6 py-3 bg-blue-600 rounded-xl font-bold">Повернутися до галереї</Link>
      </div>
    );
  }

  const hasImages = account.images && account.images.length > 0;

  return (
    <div className="pb-20 pt-8 max-w-5xl mx-auto px-4">
      <Link to="/accounts" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-5 h-5" /> Назад
      </Link>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* КАРТКИ НА СТОРІНЦІ */}
        <div className="space-y-4">
          <div 
            className={`aspect-video w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 flex items-center justify-center shadow-lg relative group ${hasImages ? 'cursor-pointer' : ''}`}
            onClick={() => hasImages && setIsLightboxOpen(true)}
          >
            {hasImages ? (
              <>
                <img src={account.images[activeImage]} alt="Фото" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <span className="text-white font-bold bg-slate-900/80 border border-slate-700 px-6 py-3 rounded-xl backdrop-blur-sm flex items-center gap-2">
                     <ImageIcon className="w-5 h-5" /> Розгорнути
                   </span>
                </div>
              </>
            ) : (
              <ImageIcon className="w-16 h-16 text-slate-700" />
            )}
          </div>
          
          {hasImages && account.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {account.images.map((img, index) => (
                <button 
                  key={index} 
                  onClick={() => { setActiveImage(index); resetZoom(); }} 
                  className={`w-24 h-16 rounded-lg border-2 flex-shrink-0 transition-all overflow-hidden ${activeImage === index ? 'border-blue-500' : 'border-transparent opacity-50 hover:opacity-100'}`}
                >
                  <img src={img} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <div className="mb-4">
            <span className="px-3 py-1 bg-slate-900 text-slate-400 text-xs rounded-full border border-slate-700 font-bold">
              ID: #{account.id}
            </span>
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-4">{account.title}</h1>
          <div className="text-4xl font-black text-emerald-400 mb-6">${account.price}</div>

          {account.tags && account.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {account.tags.map(tag => (
                tag.trim() !== '' && (
                  <span key={tag} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-blue-400 border border-slate-700 rounded-xl text-sm font-bold shadow-sm">
                    <Tag className="w-4 h-4" /> {tag.trim()}
                  </span>
                )
              ))}
            </div>
          )}

          <div className="mb-8">
            <h3 className="text-lg font-bold text-white mb-3">Опис акаунта</h3>
            <p className="text-slate-400 leading-relaxed bg-slate-900/50 p-4 rounded-xl border border-slate-800 whitespace-pre-line">
              {account.shortDesc || 'Опис відсутній.'}
            </p>
          </div>

          <button onClick={handleBuy} className="mt-auto w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl flex justify-center items-center gap-2 shadow-lg shadow-blue-900/20 transition-all hover:-translate-y-1">
            <CheckCircle2 className="w-6 h-6" /> Придбати акаунт
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* 🌟 МАГІЯ: RGB ЛАЙТБОКС + ЗУМ З ПЕРЕТЯГУВАННЯМ */}
      {/* ========================================== */}
      {isLightboxOpen && hasImages && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center overflow-hidden animate-in fade-in duration-200"
          onClick={() => { setIsLightboxOpen(false); resetZoom(); }}
          onWheel={handleWheel} 
        >
          <style>
            {`
              @keyframes rgbBreath {
                0% { color: #3b82f6; filter: drop-shadow(0 0 10px rgba(59,130,246,0.8)); }
                33% { color: #8b5cf6; filter: drop-shadow(0 0 15px rgba(139,92,246,0.8)); }
                66% { color: #10b981; filter: drop-shadow(0 0 15px rgba(16,185,129,0.8)); }
                100% { color: #3b82f6; filter: drop-shadow(0 0 10px rgba(59,130,246,0.8)); }
              }
              .rgb-glow {
                animation: rgbBreath 4s infinite ease-in-out;
                transition: transform 0.2s;
              }
              .rgb-glow:hover {
                transform: scale(1.2);
              }
            `}
          </style>

          {/* Кнопка закриття */}
          <button 
            className="absolute top-6 right-6 p-2 bg-slate-900/80 hover:bg-slate-800 rounded-full z-30 border border-slate-700"
            onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(false); resetZoom(); }}
          >
            <X className="w-7 h-7 rgb-glow" />
          </button>

          {/* Стрілка вліво (ТЕПЕР ВИДНА ЗАВЖДИ, z-30 щоб бути поверх збільшеного фото) */}
          {account.images.length > 1 && (
            <button className="absolute left-1 md:left-6 p-2 md:p-4 outline-none z-30" onClick={prevImage}>
              <ChevronLeft className="w-10 h-10 md:w-16 md:h-16 rgb-glow" />
            </button>
          )}

          {/* ВІКНО КАРТИНКИ (З ТАЧ-ПЕРЕТЯГУВАННЯМ) */}
          <div 
            className="w-full h-full flex items-center justify-center z-10" 
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart} 
            onTouchMove={handleTouchMove}   
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={stopDrag}
            onMouseLeave={stopDrag}
          >
            <img 
              src={account.images[activeImage]} 
              draggable="false" 
              className="max-w-[95vw] max-h-[85vh] object-contain rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-slate-800 select-none" 
              style={{ 
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, 
                cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
                transition: isDragging ? 'none' : 'transform 0.2s ease-out'
              }}
              alt="Розгорнуте фото" 
              onClick={(e) => { 
                e.stopPropagation(); 
                if (isPanDragRef.current) return; 
                if (scale > 1) resetZoom(); else setScale(2);
              }}
            />
          </div>

          {/* Стрілка вправо (ТЕПЕР ВИДНА ЗАВЖДИ, z-30) */}
          {account.images.length > 1 && (
            <button className="absolute right-1 md:right-6 p-2 md:p-4 outline-none z-30" onClick={nextImage}>
              <ChevronRight className="w-10 h-10 md:w-16 md:h-16 rgb-glow" />
            </button>
          )}

          {/* ПАНЕЛЬ УПРАВЛІННЯ ЗУМОМ */}
          <div 
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-30 bg-slate-900/80 backdrop-blur-md px-6 py-3 rounded-full border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => {
                const newScale = Math.max(scale - 0.5, 1);
                setScale(newScale);
                if (newScale === 1) setPan({ x: 0, y: 0 });
              }}
              className="text-slate-400 hover:text-white p-1"
            >
              <ZoomOut className="w-6 h-6" />
            </button>
            <span className="text-white font-bold text-sm min-w-[3rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button 
              onClick={() => setScale(prev => Math.min(prev + 0.5, 4))}
              className="text-slate-400 hover:text-white p-1"
            >
              <ZoomIn className="w-6 h-6" />
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

export default AccountDetails;