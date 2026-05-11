import React, { useState } from 'react';
import { Shield, Moon, Clock, RefreshCw, Trash2, Gem, PackageOpen, Info } from 'lucide-react';

const Calculator = () => {
  const [activeTab, setActiveTab] = useState('train');

  // --- СТАНИ ДЛЯ Т1-Т4 (Казарма) ---
  const [trainAmount, setTrainAmount] = useState('');
  const [trainSpeed, setTrainSpeed] = useState('350');
  const [trainTier, setTrainTier] = useState(120); // 15, 30, 60, 120 (Час 1 юніта)

  // --- СТАНИ ДЛЯ Т5 (Цех) ---
  const [t5Tab, setT5Tab] = useState('speed');
  const [t5Amount, setT5Amount] = useState('');
  const [t5Speed, setT5Speed] = useState('104');
  const [t5HasLunite, setT5HasLunite] = useState(false);

  // --- СТАНИ ДЛЯ СУМКИ (Прискорювачі) ---
  const initialBag = { 1: '', 5: '', 10: '', 15: '', 30: '', 60: '', 180: '', 480: '', 900: '', 1440: '', 4320: '', 10080: '', 43200: '' };
  const [bag, setBag] = useState(initialBag);

  // --- СТАНИ ДЛЯ КОНВЕРТА (Дні -> Армія) ---
  const [oldDays, setOldDays] = useState('30');
  const [oldSpeed, setOldSpeed] = useState('350');
  const [oldSubsidy, setOldSubsidy] = useState('0');
  const [oldTier, setOldTier] = useState('T4');
  const [oldType, setOldType] = useState('Піхи');

  const tiersInfo = {
    T1: { time: 15, cost: [50, 50, 50, 50, 0] },
    T2: { time: 30, cost: [100, 100, 100, 100, 0] },
    T3: { time: 60, cost: [250, 250, 250, 250, 10] },
    T4: { time: 120, cost: [1000, 1000, 1000, 1000, 500] }
  };

  // --- ФУНКЦІЇ ДОПОМОГИ ---
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds) || seconds <= 0) return "0д 0г 0хв";
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}д ${h}г ${m}хв`;
    if (h > 0) return `${h}г ${m}хв`;
    return `${m}хв`;
  };

  const formatRes = (val) => val >= 1000 ? (val / 1000).toFixed(1) + 'B' : val.toFixed(1) + 'M';

  // --- АВТО-РОЗРАХУНКИ (Миттєві) ---
  // 1. Казарма
  const trainSecs = (parseFloat(trainAmount) > 0) ? (trainTier * parseFloat(trainAmount)) / (1 + (parseFloat(trainSpeed) || 0) / 100) : 0;

  // 2. Т5 Цех
  const t5BaseTime = 120;
  const t5Secs = (parseFloat(t5Amount) > 0) ? (parseFloat(t5Amount) * t5BaseTime) / (1 + (parseFloat(t5Speed) || 0) / 100) : 0;
  const t5LuniteVal = parseFloat(t5Amount) * 100 / 1000;
  
  const timeGems = t5Amount > 0 ? Math.ceil(Math.ceil(t5Secs / 60) * 1.01855) : 0;
  const luniteGems = (t5Amount > 0 && !t5HasLunite) ? Math.ceil(t5LuniteVal * 5.5) : 0;

  // 3. Сумка
  const totalMins = Object.entries(bag).reduce((acc, [mins, qty]) => acc + (parseInt(mins) * (parseInt(qty) || 0)), 0);

  // 4. Конверт
  const activeTierObj = tiersInfo[oldTier];
  const oldUnits = (parseFloat(oldDays) > 0) ? Math.floor((parseFloat(oldDays) * 86400 * (1 + (parseFloat(oldSpeed) || 0) / 100)) / activeTierObj.time) : 0;
  const costMult = 1 - ((parseFloat(oldSubsidy) || 0) / 100);
  const oldResCosts = activeTierObj.cost.map(c => (oldUnits * c * costMult) / 1000000);


  return (
    <div className="min-h-screen bg-slate-950 pb-20 pt-8">
      <div className="max-w-4xl mx-auto px-4">
        
        {/* ЗАГОЛОВОК */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-3">Військовий Калькулятор</h1>
          <p className="text-slate-400 text-sm">Розрахуйте час, ресурси та самоцвіти для створення армії миттєво.</p>
        </div>

        {/* НАВІГАЦІЯ (ТАБИ) */}
        <div className="flex flex-wrap justify-center gap-2 mb-8 bg-slate-900/50 p-2 rounded-2xl border border-slate-800">
          <button onClick={() => setActiveTab('train')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'train' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><Shield className="w-4 h-4"/> Т1-Т4</button>
          <button onClick={() => setActiveTab('t5')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 't5' ? 'bg-amber-500 text-white shadow-lg shadow-amber-900/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><Moon className="w-4 h-4"/> Т5 (Цех)</button>
          <button onClick={() => setActiveTab('speed')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'speed' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><Clock className="w-4 h-4"/> Сумка</button>
          <button onClick={() => setActiveTab('old')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'old' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><RefreshCw className="w-4 h-4"/> Конверт</button>
        </div>

        {/* КОНТЕНТ КАЛЬКУЛЯТОРІВ */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
          
          {/* ФОНОВИЙ БЛІК ДЛЯ КРАСИ */}
          <div className={`absolute top-0 right-0 w-64 h-64 blur-[100px] opacity-20 pointer-events-none rounded-full
            ${activeTab === 'train' ? 'bg-blue-500' : activeTab === 't5' ? 'bg-amber-500' : activeTab === 'speed' ? 'bg-emerald-500' : 'bg-purple-500'}
          `}></div>

          {/* ============================== */}
          {/* ВКЛАДКА: Т1-Т4 (Казарма)       */}
          {/* ============================== */}
          {activeTab === 'train' && (
            <div className="animate-in fade-in zoom-in-95 duration-300 relative z-10">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Shield className="text-blue-400"/> Тренування військ</h2>
                <button onClick={() => {setTrainAmount(''); setTrainSpeed('350');}} className="p-2 bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"><Trash2 className="w-5 h-5"/></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Кількість військ</label>
                  <input type="number" value={trainAmount} onChange={e => setTrainAmount(e.target.value)} placeholder="Напр: 100000" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3.5 text-white text-lg font-black focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Швидкість тренування (%)</label>
                  <input type="number" value={trainSpeed} onChange={e => setTrainSpeed(e.target.value)} placeholder="350" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3.5 text-blue-400 text-lg font-black focus:border-blue-500 outline-none" />
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Виберіть рівень військ (Tier)</label>
                <div className="grid grid-cols-4 gap-3">
                  {[{t: 'T1', s: 15}, {t: 'T2', s: 30}, {t: 'T3', s: 60}, {t: 'T4', s: 120}].map(tier => (
                    <button key={tier.t} onClick={() => setTrainTier(tier.s)} className={`py-3 rounded-xl font-bold text-sm transition-all border ${trainTier === tier.s ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}>
                      {tier.t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                <span className="text-sm font-bold text-blue-400 mb-1">Загальний час тренування:</span>
                <span className="text-3xl md:text-5xl font-black text-white">{formatTime(trainSecs)}</span>
              </div>
            </div>
          )}

          {/* ============================== */}
          {/* ВКЛАДКА: Т5 (Місячний Цех)     */}
          {/* ============================== */}
          {activeTab === 't5' && (
            <div className="animate-in fade-in zoom-in-95 duration-300 relative z-10">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Moon className="text-amber-400"/> Крафт Т5</h2>
                <button onClick={() => {setT5Amount(''); setT5Speed('104'); setT5HasLunite(false);}} className="p-2 bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"><Trash2 className="w-5 h-5"/></button>
              </div>

              {/* Перемикач під-вкладок Т5 */}
              <div className="flex bg-slate-950 rounded-xl p-1 mb-6 border border-slate-800">
                <button onClick={() => setT5Tab('speed')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${t5Tab === 'speed' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>⏳ За прискори</button>
                <button onClick={() => setT5Tab('gems')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${t5Tab === 'gems' ? 'bg-amber-500/20 text-amber-400 shadow' : 'text-slate-500 hover:text-slate-300'}`}>💎 За Сапфіри</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Кількість Т5</label>
                  <input type="number" value={t5Amount} onChange={e => setT5Amount(e.target.value)} placeholder="0" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3.5 text-white text-lg font-black focus:border-amber-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Швидкість крафту (%)</label>
                  <input type="number" value={t5Speed} onChange={e => setT5Speed(e.target.value)} placeholder="104" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3.5 text-amber-400 text-lg font-black focus:border-amber-500 outline-none" />
                </div>
              </div>

              {/* РЕЗУЛЬТАТ: ЗА ПРИСКОРИ */}
              {t5Tab === 'speed' && (
                <div className="space-y-4">
                  <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 text-center">
                    <span className="text-sm font-bold text-slate-400 mb-1 block">Потрібно часу:</span>
                    <span className="text-3xl font-black text-white">{formatTime(t5Secs)}</span>
                  </div>
                  
                  {parseFloat(t5Amount) > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="bg-amber-900/20 border border-amber-500/30 p-3 rounded-xl flex justify-between items-center"><span className="text-xs text-amber-200/70">🌕 Луніт</span><span className="font-bold text-amber-400">{t5LuniteVal.toFixed(0)}K</span></div>
                      <div className="bg-slate-800 p-3 rounded-xl flex justify-between items-center"><span className="text-xs text-slate-400">🌾 Їжа</span><span className="font-bold text-white">{formatRes(parseFloat(t5Amount) * 100 / 1000000)}</span></div>
                      <div className="bg-slate-800 p-3 rounded-xl flex justify-between items-center"><span className="text-xs text-slate-400">🪨 Камінь</span><span className="font-bold text-white">{formatRes(parseFloat(t5Amount) * 100 / 1000000)}</span></div>
                      <div className="bg-slate-800 p-3 rounded-xl flex justify-between items-center"><span className="text-xs text-slate-400">🪵 Дерево</span><span className="font-bold text-white">{formatRes(parseFloat(t5Amount) * 100 / 1000000)}</span></div>
                      <div className="bg-slate-800 p-3 rounded-xl flex justify-between items-center"><span className="text-xs text-slate-400">💎 Руда</span><span className="font-bold text-white">{formatRes(parseFloat(t5Amount) * 100 / 1000000)}</span></div>
                      <div className="bg-yellow-900/20 border border-yellow-500/30 p-3 rounded-xl flex justify-between items-center"><span className="text-xs text-yellow-200/70">💰 Золото</span><span className="font-bold text-yellow-400">{formatRes(parseFloat(t5Amount) * 50 / 1000000)}</span></div>
                    </div>
                  )}
                </div>
              )}

              {/* РЕЗУЛЬТАТ: ЗА САПФІРИ */}
              {t5Tab === 'gems' && (
                <div className="space-y-6">
                  <label className="flex items-center gap-3 p-4 border border-slate-700 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors">
                    <input type="checkbox" checked={t5HasLunite} onChange={e => setT5HasLunite(e.target.checked)} className="w-5 h-5 rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-600" />
                    <span className="text-sm font-bold text-slate-300">У мене вже є Луніт (плачу лише за час)</span>
                  </label>

                  <div className="bg-amber-900/20 border border-amber-500/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                    <span className="text-sm font-bold text-amber-500/70 mb-1">Загальна ціна:</span>
                    <span className="text-4xl font-black text-amber-400 flex items-center gap-2">{timeGems + luniteGems} <Gem className="w-8 h-8"/></span>
                  </div>

                  {parseFloat(t5Amount) > 0 && (
                    <div className="flex justify-center gap-6 text-sm">
                      <div className="text-slate-400">⏳ За час: <b className="text-white">{timeGems}</b></div>
                      <div className="text-slate-400">🌕 За Луніт: <b className="text-white">{luniteGems}</b></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ============================== */}
          {/* ВКЛАДКА: СУМКА (Прискорювачі)  */}
          {/* ============================== */}
          {activeTab === 'speed' && (
            <div className="animate-in fade-in zoom-in-95 duration-300 relative z-10">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Clock className="text-emerald-400"/> Вміст Сумки</h2>
                <button onClick={() => setBag(initialBag)} className="p-2 bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"><Trash2 className="w-5 h-5"/></button>
              </div>

              <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-2xl p-6 mb-8 flex justify-between items-center sticky top-4 backdrop-blur-md z-20 shadow-lg shadow-emerald-900/10">
                <span className="text-emerald-400 font-bold uppercase tracking-wider text-sm">Загальний час:</span>
                <span className="text-2xl md:text-3xl font-black text-white">{Math.floor(totalMins/1440)}д {Math.floor((totalMins%1440)/60)}г {totalMins%60}хв</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { m: 1, l: '1 хв' }, { m: 5, l: '5 хв' }, { m: 10, l: '10 хв' }, { m: 15, l: '15 хв' },
                  { m: 30, l: '30 хв' }, { m: 60, l: '60 хв' },
                  { m: 180, l: '3 год', c: 'blue' }, { m: 480, l: '8 год', c: 'blue' }, { m: 900, l: '15 год', c: 'blue' }, { m: 1440, l: '24 год', c: 'blue' },
                  { m: 4320, l: '3 дні', c: 'gold' }, { m: 10080, l: '7 днів', c: 'gold' }, { m: 43200, l: '30 днів', c: 'gold' }
                ].map(item => (
                  <div key={item.m} className={`flex items-center justify-between p-2 pl-3 rounded-xl border ${item.c === 'blue' ? 'bg-blue-900/10 border-blue-500/20' : item.c === 'gold' ? 'bg-amber-900/10 border-amber-500/20' : 'bg-slate-800 border-slate-700'}`}>
                    <span className={`text-xs font-bold ${item.c === 'blue' ? 'text-blue-400' : item.c === 'gold' ? 'text-amber-400' : 'text-slate-400'}`}>{item.l}</span>
                    <input 
                      type="number" 
                      value={bag[item.m]} 
                      onChange={e => setBag({...bag, [item.m]: e.target.value})} 
                      placeholder="0"
                      className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-center text-sm font-bold focus:border-emerald-500 outline-none" 
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================== */}
          {/* ВКЛАДКА: КОНВЕРТ (Дні в Армію) */}
          {/* ============================== */}
          {activeTab === 'old' && (
            <div className="animate-in fade-in zoom-in-95 duration-300 relative z-10">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2"><RefreshCw className="text-purple-400"/> Конвертер: Дні ➝ Війська</h2>
                <button onClick={() => {setOldDays(''); setOldSpeed('350'); setOldSubsidy('0');}} className="p-2 bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"><Trash2 className="w-5 h-5"/></button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div><label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Є прискорень (Днів)</label><input type="number" value={oldDays} onChange={e => setOldDays(e.target.value)} placeholder="30" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm font-bold focus:border-purple-500 outline-none" /></div>
                <div><label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Швидкість (%)</label><input type="number" value={oldSpeed} onChange={e => setOldSpeed(e.target.value)} placeholder="350" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm font-bold focus:border-purple-500 outline-none" /></div>
                <div><label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Субсидія РСС (%)</label><input type="number" value={oldSubsidy} onChange={e => setOldSubsidy(e.target.value)} placeholder="0" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm font-bold focus:border-purple-500 outline-none" /></div>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Рівень військ (Tier)</label>
                <div className="grid grid-cols-4 gap-3">
                  {['T1', 'T2', 'T3', 'T4'].map(tier => (
                    <button key={tier} onClick={() => setOldTier(tier)} className={`py-2.5 rounded-xl font-bold text-sm transition-all border ${oldTier === tier ? 'bg-purple-600 border-purple-500 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}>
                      {tier}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Тип військ</label>
                <div className="grid grid-cols-4 gap-3">
                  {['Піхи', 'Луки', 'Коні', 'Осада'].map(type => (
                    <button key={type} onClick={() => setOldType(type)} className={`py-2 rounded-xl font-bold text-xs transition-all border ${oldType === type ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-white hover:bg-slate-800'}`}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-purple-900/20 border border-purple-500/30 rounded-2xl p-6 text-center mb-6">
                <span className="text-sm font-bold text-purple-400 mb-1 block">Вийде військ ({oldType}):</span>
                <span className="text-4xl font-black text-white">{oldUnits.toLocaleString()}</span>
              </div>

              {oldUnits > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-slate-800 p-3 rounded-xl text-center"><span className="text-xs text-slate-400 block mb-1">🌾 Їжа</span><span className="font-bold text-white text-sm">{formatRes(oldResCosts[0])}</span></div>
                  <div className="bg-slate-800 p-3 rounded-xl text-center"><span className="text-xs text-slate-400 block mb-1">🪨 Камінь</span><span className="font-bold text-white text-sm">{formatRes(oldResCosts[1])}</span></div>
                  <div className="bg-slate-800 p-3 rounded-xl text-center"><span className="text-xs text-slate-400 block mb-1">🪵 Дерево</span><span className="font-bold text-white text-sm">{formatRes(oldResCosts[2])}</span></div>
                  <div className="bg-slate-800 p-3 rounded-xl text-center"><span className="text-xs text-slate-400 block mb-1">💎 Руда</span><span className="font-bold text-white text-sm">{formatRes(oldResCosts[3])}</span></div>
                  <div className="bg-yellow-900/20 border border-yellow-500/30 p-3 rounded-xl text-center"><span className="text-xs text-yellow-500 block mb-1">💰 Золото</span><span className="font-bold text-yellow-400 text-sm">{formatRes(oldResCosts[4])}</span></div>
                </div>
              )}
            </div>
          )}

        </div>

        <div className="mt-6 text-center flex items-center justify-center gap-2 text-slate-500 text-xs">
          <Info className="w-4 h-4"/> Усі розрахунки відбуваються миттєво під час вводу.
        </div>
      </div>
    </div>
  );
};

export default Calculator;