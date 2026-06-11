import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Переиспользуемый компонент для текстовых полей форм с валидацией
 */
const FormInput = ({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  touched,
  disabled = false,
  required = false,
  autoComplete,
  maxLength,
  minLength,
  pattern,
  title,
  hint,
  ...props
}) => {
  const showError = touched && error;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-white mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          maxLength={maxLength}
          minLength={minLength}
          pattern={pattern}
          title={title}
          aria-invalid={showError}
          aria-describedby={showError ? `${name}-error` : hint ? `${name}-hint` : undefined}
          className={`w-full px-4 py-2 rounded-lg border transition-colors
            ${
              showError
                ? 'bg-red-950/20 border-red-500/50 text-white focus:border-red-500'
                : 'bg-slate-800/50 border-slate-700/50 text-white focus:border-blue-500'
            }
            focus:outline-none focus:ring-2
            ${showError ? 'focus:ring-red-500/20' : 'focus:ring-blue-500/20'}
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          {...props}
        />
      </div>

      {showError && (
        <div
          id={`${name}-error`}
          className="mt-2 flex items-center gap-2 text-red-400 text-sm"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {hint && !showError && (
        <div id={`${name}-hint`} className="mt-1 text-xs text-slate-400">
          {hint}
        </div>
      )}
    </div>
  );
};

export default FormInput;
