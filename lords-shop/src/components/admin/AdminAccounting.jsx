import React, { useState, useEffect } from 'react';
import { Wallet, DollarSign, CheckCircle2, AlertCircle, Loader2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiGet, apiPost, handleApiError } from '../../config/apiClient';
import { getFullUrl } from '../../config/api';

const AdminAccounting = ({ openConfirmDialog }) => {
  const [workers, setWorkers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchWorkers();
  }, []);

  async function fetchWorkers() {
    setIsLoading(true);
    try {
      const data = await apiGet(getFullUrl('/api/admin/workers/accounting'));
      setWorkers(data);
    } catch (error) {
      handleApiError(error, 'Помилка завантаження бухгалтерії');
    } finally {
      setIsLoading(false);
    }
  }

  const handlePay = (workerName) => {
    openConfirmDialog(
      'Підтвердження виплати',
      `Ви дійсно переказали гроші для ${workerName}? Сума буде обнулена і перенесена в історію виплат.`,
      async () => {
        setIsProcessing(true);
        try {
          const res = await apiPost(getFullUrl('/api/admin/workers/pay_all'), { worker_name: workerName });
          toast.success(res.message || `Виплату для ${workerName} зафіксовано!`);
          fetchWorkers();
        } catch (error) {
          handleApiError(error, 'Помилка виплати');
        } finally {
          setIsProcessing(false);
        }
      },
      false
    );
  };

  const totalUnpaid = workers.reduce((acc, w) => acc + (parseFloat(w.current_unpaid) || 0), 0);
  const totalPaid = workers.reduce((acc, w) => acc + (parseFloat(w.total_paid) || 0), 0);

  return (
    <div className="bg-[#0c1017] border border-white/[0.08] rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 shadow-2xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-red-600/20 to-rose-600/10 border border-red-500/20 text-rose-500 rounded-2xl shadow-lg">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Бухгалтерія та Зарплати Адмінів</h2>
            <p className="text-xs text-slate-400 mt-0.5">Облік собівартості виконаних замовлень та виплати операторам магазину</p>
          </div>
        </div>
      </div>

      {/* СТАТИСТИКА */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#070b12] border border-white/[0.06] hover:border-red-500/30 rounded-2xl p-5 flex items-center gap-4 transition-all">
          <div className="w-12 h-12 bg-red-950/40 text-rose-400 border border-rose-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold mb-0.5 uppercase tracking-wider">Загальний борг (до виплати)</div>
            <div className="text-2xl font-black text-rose-400 font-mono">${totalUnpaid.toFixed(2)}</div>
          </div>
        </div>

        <div className="bg-[#070b12] border border-white/[0.06] hover:border-emerald-500/30 rounded-2xl p-5 flex items-center gap-4 transition-all">
          <div className="w-12 h-12 bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold mb-0.5 uppercase tracking-wider">Виплачено за весь час</div>
            <div className="text-2xl font-black text-emerald-400 font-mono">${totalPaid.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* ТАБЛИЦЯ / СПИСОК ПРАЦІВНИКІВ */}
      {isLoading ? (
        <div className="flex justify-center py-14"><Loader2 className="w-8 h-8 text-rose-500 animate-spin" /></div>
      ) : workers.length === 0 ? (
        <div className="text-center py-14 bg-[#070b12] rounded-2xl border border-white/[0.06] border-dashed">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-bold text-sm">Ще немає жодного адміна, який брав замовлення в роботу.</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {workers.map((worker) => (
            <div key={worker.worker_name} className="bg-[#070b12] border border-white/[0.06] hover:border-red-500/30 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all">
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="w-12 h-12 bg-white/[0.04] border border-white/[0.06] rounded-xl flex items-center justify-center text-rose-500 font-black text-lg">
                  {worker.worker_name?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div>
                  <div className="text-base font-bold text-white mb-0.5">{worker.worker_name}</div>
                  <div className="text-xs text-slate-400 font-medium">
                    Всього виплачено: <span className="text-emerald-400 font-bold font-mono">${(parseFloat(worker.total_paid) || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <div className="bg-[#0c1017] px-5 py-2.5 rounded-xl border border-white/[0.08] text-center w-full sm:w-auto">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">До виплати</div>
                  <div className="text-lg font-black text-amber-400 font-mono">${(parseFloat(worker.current_unpaid) || 0).toFixed(2)}</div>
                </div>
                <button 
                  onClick={() => handlePay(worker.worker_name)}
                  disabled={isProcessing || (parseFloat(worker.current_unpaid) || 0) <= 0}
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-white/[0.04] disabled:text-slate-600 text-white font-bold text-sm rounded-xl transition-all shadow-[0_0_12px_rgba(16,185,129,0.25)] disabled:shadow-none flex items-center justify-center gap-2"
                >
                  <DollarSign className="w-4 h-4" /> Оплачено
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminAccounting;