import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

const ErrorState = ({ error, onRetry, title = "Помилка завантаження" }) => {
  return (
    <div className="card flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-400" />
      </div>

      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>

      <p className="text-slate-300 mb-6 max-w-md">
        {error || "Щось пішло не так. Спробуйте ще раз."}
      </p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="btn btn-primary flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Спробувати знову
        </button>
      )}
    </div>
  );
};

export default ErrorState;
