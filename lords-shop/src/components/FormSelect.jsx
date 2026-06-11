import React from 'react';

/**
 * Переиспользуемый компонент для select полей с валидацией
 */
const FormSelect = ({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  touched,
  options,
  disabled = false,
  required = false,
  placeholder = 'Виберіть опцію',
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

      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        aria-invalid={showError}
        aria-describedby={showError ? `${name}-error` : undefined}
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
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {showError && (
        <div
          id={`${name}-error`}
          className="mt-2 text-red-400 text-sm flex items-center gap-2"
        >
          <span>⚠️</span>
          {error}
        </div>
      )}
    </div>
  );
};

export default FormSelect;
