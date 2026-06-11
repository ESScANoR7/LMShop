import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmDialog = ({ title, message, onConfirm, onCancel, isDangerous = false, isLoading = false }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onCancel} />

      {/* Dialog */}
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in-up">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
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
        <p className="text-slate-300 mb-6">{message}</p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 btn btn-ghost"
            disabled={isLoading}
          >
            Скасувати
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 btn ${isDangerous ? 'btn-danger' : 'btn-primary'}`}
          >
            {isLoading ? '...' : 'Підтвердити'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
