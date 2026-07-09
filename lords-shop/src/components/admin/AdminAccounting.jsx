import React, { useState, useEffect } from 'react';
import { Wallet, DollarSign, CheckCircle2, AlertCircle, Loader2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiGet, apiPost, handleApiError } from '../../config/apiClient'; // Переконайся що шлях вірний
import { getFullUrl } from '../../config/api';

const AdminAccounting = ({ openConfirmDialog }) => {
  const [workers, setWorkers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    setIsLoading(true);
    try {
      const data = await apiGet(getFullUrl('/api/admin/workers/accounting'));
      setWorkers(data);
    } catch (error) {
      handleApiError(error, 'Помилка завантаження бухгалтерії');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePay = (workerName) => {
    openConfirmDialog(
      'Підтвердження виплати',
      `Ви дійсно переказали гроші для ${workerName}? Сума буде обнулена і перенесена в історію виплат.`,
      async () => {
        setIsProcessing(true);
        try {
          const res = await apiPost(getFullUrl('/api/admin/workers/pay_all'), { worker_name: workerName });
          toast.success(res.message || `Виплату для ${workerName} зафіксовано!`);
          fetchWorkers(); // Оновлюємо дані після оплати
        } catch (error) {
          handleApiError(error, 'Помилка виплати');
        } finally {
          setIsProcessing(false);
        }
      },
      false // Це не небезпечна дія (червона кнопка не потрібна)
    );
  };

  const totalUnpaid = workers.reduce((acc, w) => acc + w.current_unpaid, 0);
  const totalPaid = workers.reduce((acc, w) => acc + w.total_paid, 0);

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 shadow-xl">
      <div className="flex items-center gap-3 mb-6 border-b border-slate-700 pb-4">
        <div className="p-3 bg-emerald-600 rounded-xl shadow-lg shadow-emerald-900/20">
          <Wallet className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Зарплати Адмінів</h2>
          <p className="text-sm text-slate-400">Облік собівартості виконаних замовлень та виплати працівникам.</p>
        </div>
      </div>

      {/* СТАТИСТИКА */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-slate-900/50 border border-slate-700 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-red-900/30 text-red-400 rounded-xl flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-slate-400 font-bold mb-1">Загальний борг (до виплати)</div>
            <div className="text-2xl font-black text-red-400">${totalUnpaid.toFixed(2)}</div>
          </div>
        </div>
        <div className="bg-slate-900/50 border border-slate-700 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-900/30 text-emerald-400 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-slate-400 font-bold mb-1">Виплачено за весь час</div>
            <div className="text-2xl font-black text-emerald-400">${totalPaid.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* ТАБЛИЦЯ / СПИСОК ПРАЦІВНИКІВ */}
      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
      ) : workers.length === 0 ? (
        <div className="text-center py-10 bg-slate-900/50 rounded-2xl border border-slate-700 border-dashed">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-bold">Ще немає жодного адміна, який брав замовлення.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {workers.map((worker) => (
            <div key={worker.worker_name} className="bg-slate-900 border border-slate-700 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 transition-all hover:border-slate-500">
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-lg font-bold text-white mb-1">{worker.worker_name}</div>
                  <div className="text-xs text-slate-500 font-medium flex gap-3">
                    <span>Всього виплачено: <span className="text-emerald-400 font-bold">${worker.total_paid.toFixed(2)}</span></span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-center w-full sm:w-auto">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">До виплати</div>
                  <div className="text-lg font-black text-amber-400">${worker.current_unpaid.toFixed(2)}</div>
                </div>
                <button 
                  onClick={() => handlePay(worker.worker_name)}
                  disabled={isProcessing || worker.current_unpaid <= 0}
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
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