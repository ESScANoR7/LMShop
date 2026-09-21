import React from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

const ConfirmDialog = ({ title, message, onConfirm, onCancel, isDangerous = false, isLoading = false }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" 
        onClick={!isLoading ? onCancel : undefined} 
      />

      {/* Dialog */}
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close button */}
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="absolute top-4 right-4 text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-all active:scale-95 disabled:opacity-50"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isDangerous ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
          <AlertTriangle className={`w-6 h-6 ${isDangerous ? 'text-red-400' : 'text-blue-400'}`} />
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-white mb-2">{title}</h2>

        {/* Message */}
        <p className="text-slate-300 mb-6 font-medium leading-relaxed">{message}</p>

        {/* Buttons */}
        <div className="flex gap-3 mt-2">
          {/* Кнопка "Скасувати" */}
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-xl border border-slate-700 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Скасувати
          </button>
          
          {/* Кнопка "Підтвердити" */}
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-3 font-bold rounded-xl transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${
              isDangerous 
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/20 border border-red-500/50' 
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20 border border-blue-500/50'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Підтвердити'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;