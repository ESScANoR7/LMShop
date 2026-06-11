import React from 'react';

/**
 * Переиспользуемый компонент для textarea полей с валидацией
 */
const FormTextarea = ({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  touched,
  placeholder,
  disabled = false,
  required = false,
  rows = 4,
  maxLength,
  hint,
  ...props
}) => {
  const showError = touched && error;
  const charCount = value?.length || 0;

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

      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={showError}
        aria-describedby={showError ? `${name}-error` : hint ? `${name}-hint` : undefined}
        className={`w-full px-4 py-2 rounded-lg border transition-colors resize-none
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

      <div className="flex justify-between items-start mt-2">
        {showError && (
          <div
            id={`${name}-error`}
            className="text-red-400 text-sm flex items-center gap-2"
          >
            <span>⚠️</span>
            {error}
          </div>
        )}
        {maxLength && (
          <div className={`text-xs ${charCount > maxLength * 0.9 ? 'text-yellow-400' : 'text-slate-400'}`}>
            {charCount}/{maxLength}
          </div>
        )}
      </div>

      {hint && !showError && (
        <div id={`${name}-hint`} className="mt-1 text-xs text-slate-400">
          {hint}
        </div>
      )}
    </div>
  );
};

export default FormTextarea;
