import { useState, useCallback } from 'react';
import { validate, getFieldError } from '../utils/validation';

/**
 * Хук для керування формами з валідацією
 * @param {object} schema - Zod схема валідації
 * @param {object} initialValues - Початкові значення форми
 * @param {function} onSubmit - Callback при успішній відправці
 */
export const useForm = (schema, initialValues, onSubmit) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, isSubmittingSet] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setValues((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    // Видаляємо помилку поля при зміні
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [errors]);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    const validation = validate(schema, values);

    if (!validation.success) {
      setErrors(validation.errors);
      setTouched(
        Object.keys(validation.errors).reduce((acc, key) => {
          acc[key] = true;
          return acc;
        }, {})
      );
      return;
    }

    isSubmittingSet(true);

    try {
      await onSubmit(validation.data);
    } finally {
      isSubmittingSet(false);
    }
  }, [schema, values, onSubmit]);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const setFieldValue = useCallback((name, value) => {
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const setFieldError = useCallback((name, error) => {
    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  }, []);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setFieldValue,
    setFieldError,
    getFieldError: (name) => (touched[name] ? getFieldError(errors, name) : null),
  };
};
