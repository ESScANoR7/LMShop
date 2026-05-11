import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Gift, AlertCircle, ChevronsDown } from 'lucide-react';

const SharinganEye = ({ isLeft }) => {
  const eyePath = isLeft
    ? "M 280 100 Q 150 -20 20 50 Q 150 160 280 100 Z"
    : "M 20 100 Q 150 -20 280 50 Q 150 160 20 100 Z";

  return (
    <svg viewBox="0 0 300 150" className="sharingan-svg w-[140px] sm:w-[200px] md:w-[320px] drop-shadow-[0_0_50px_rgba(255,0,0,0.2)]">
      <defs>
        <clipPath id={`eye-clip-${isLeft}`}>
          <path d={eyePath} />
        </clipPath>
        <radialGradient id="eye-inner-glow" cx="50%" cy="50%" r="50%">
          <stop offset="50%" stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(0,0,0,1)" />
        </radialGradient>
      </defs>

      <g className="eye-frame-group" style={{ transformOrigin: 'center' }}>
        <path d={eyePath} fill="#020202" />
        <g clipPath={`url(#eye-clip-${isLeft})`}>
          <circle cx="150" cy="75" r="58" fill="#700000" />
          <g className="iris-spin" style={{ transformOrigin: '150px 75px' }}>
            <g className="layer-base" style={{ transformOrigin: '150px 75px' }}>
              <image href="/base_sharingan.png" x="92" y="17" width="116" height="116" />
            </g>
            <g className="layer-ems" style={{ transformOrigin: '150px 75px' }}>
              <image href="/ems.png" x="92" y="17" width="116" height="116" />
            </g>
          </g>
          <circle cx="150" cy="75" r="58" fill="url(#eye-inner-glow)" />
          <path d="M 0 0 L 300 0 L 300 75 L 0 75 Z" fill="#000" className="eyelid-top" />
          <path d="M 0 150 L 300 150 L 300 75 L 0 75 Z" fill="#000" className="eyelid-bottom" />
        </g>
      </g>
    </svg>
  );
};

const SHARINGAN = () => {
  const [secretCode, setSecretCode] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSecretCode = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/promocodes');
        if (response.ok) {
          const data = await response.json();
          const validSecret = data.find(p => (p.code === 'SHARINGAN' || p.code.startsWith('SECRET-')) && (p.max_uses === 0 || p.current_uses < p.max_uses));
          if (validSecret) setSecretCode(validSecret.code);
        }
      } catch (error) { console.error("Database Error", error); } 
      finally { setIsLoading(false); }
    };
    fetchSecretCode();
  }, []);

  return (
    <div id="easter-egg-page" className="h-screen w-full flex flex-col items-center justify-center relative overflow-hidden bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#450a0a]/60 via-[#020202] to-black p-4">
      
      <style>{`
        .eye-frame-group { animation: frame-close 14s ease-in-out infinite; }
        @keyframes frame-close {
          0%, 30%, 60%, 100% { transform: scaleY(1); opacity: 1; }
          42%, 48% { transform: scaleY(0); opacity: 0; }
        }
        .eyelid-top { transform: translateY(-75px); animation: lid-top 14s ease-in-out infinite; }
        .eyelid-bottom { transform: translateY(75px); animation: lid-bottom 14s ease-in-out infinite; }
        @keyframes lid-top { 0%, 30%, 60%, 100% { transform: translateY(-75px); } 42%, 48% { transform: translateY(0px); } }
        @keyframes lid-bottom { 0%, 30%, 60%, 100% { transform: translateY(75px); } 42%, 48% { transform: translateY(0px); } }
        .iris-spin { animation: spin 10s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .layer-base { animation: fade-out 12s ease-in-out infinite; }
        .layer-ems { animation: fade-in 12s ease-in-out infinite; }
        @keyframes fade-out { 0%, 35%, 85%, 100% { opacity: 1; transform: scale(1); filter: blur(0px); } 45%, 75% { opacity: 0; transform: scale(0.6); filter: blur(15px); } }
        @keyframes fade-in { 0%, 35%, 85%, 100% { opacity: 0; transform: scale(1.5); filter: blur(15px); } 45%, 75% { opacity: 1; transform: scale(1); filter: blur(0px); } }
        .genjutsu-title { text-shadow: 0 0 20px rgba(255, 0, 0, 0.4); animation: pulse-red 4s ease-in-out infinite; }
        @keyframes pulse-red { 0%, 100% { opacity: 0.8; transform: scale(1); } 50% { opacity: 1; transform: scale(1.01); } }
      `}</style>

      {/* ОЧІ */}
      <div className="flex justify-center items-center gap-4 md:gap-8 mb-4">
        <SharinganEye isLeft={true} />
        <SharinganEye isLeft={false} />
      </div>

      {/* КОНТЕНТ */}
      <div className="text-center z-10 w-full max-w-2xl">
        <h1 className="genjutsu-title text-3xl sm:text-4xl md:text-5xl font-black text-[#8b0000] mb-2 tracking-widest uppercase">
          Ти потрапив у гендзюцу
        </h1>
        
        {secretCode ? (
          <div className="flex flex-col items-center">
            <p className="text-red-900/60 text-[10px] sm:text-xs md:text-sm italic mb-2">
              "Під час нескінченної подорожі ти знайшов записку..."
            </p>
            
            <ChevronsDown className="w-6 h-6 text-red-950 mb-2 animate-bounce opacity-40" />

            <div className="relative group scale-90 sm:scale-100">
              <div className="absolute -inset-1 bg-red-900/10 rounded-xl blur-2xl transition duration-1000 group-hover:opacity-30"></div>
              <div className="relative bg-black/80 border border-red-950/50 rounded-xl px-8 py-5 md:px-12 md:py-8 shadow-[0_0_50px_rgba(0,0,0,1)] backdrop-blur-md">
                <div className="text-red-950 font-bold uppercase tracking-[0.3em] text-[8px] md:text-[10px] mb-3">Секретний промокод</div>
                <div className="text-4xl md:text-6xl font-black text-[#b30000] tracking-wider select-all drop-shadow-[0_0_15px_rgba(179,0,0,0.6)]">
                  {secretCode}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-red-950 font-serif italic tracking-widest uppercase text-[10px] mt-4 opacity-30">
            Темрява поглинула твій шанс...
          </div>
        )}

        <div className="mt-8">
          <Link to="/" className="inline-flex items-center gap-2 px-6 py-2 text-red-950 hover:text-red-800 border border-red-950/20 hover:border-red-900/40 rounded-full transition-all duration-700 uppercase tracking-[0.2em] text-[9px] font-bold bg-black/40">
            <ArrowLeft className="w-3 h-3" /> Розвіяти ілюзію
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SHARINGAN;