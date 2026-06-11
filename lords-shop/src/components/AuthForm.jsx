import React, { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import FormInput from './FormInput';
import { useForm } from '../hooks/useForm';
import { authSchemas } from '../utils/validation';
import { apiPost } from '../config/apiClient';
import { API_ENDPOINTS, getFullUrl } from '../config/api';
import { showSuccessToast, showErrorToast } from '../utils/toast';

const AuthForm = ({ isLoginView, onSuccess, isLoading }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const schema = isLoginView ? authSchemas.login : authSchemas.register;

  const form = useForm(
    schema,
    {
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
    },
    async (data) => {
      try {
        const endpoint = isLoginView
          ? getFullUrl(API_ENDPOINTS.LOGIN)
          : getFullUrl(API_ENDPOINTS.REGISTER);

        const response = await apiPost(endpoint, {
          [isLoginView ? 'email' : 'username']: data.email || data.username,
          [isLoginView ? 'password' : 'email']: data.password || data.email,
          ...(isLoginView ? {} : { password: data.password }),
        });

        if (isLoginView) {
          showSuccessToast(`З поверненням, ${response.username}!`);
          onSuccess(response);
        } else {
          showSuccessToast('Акаунт створено! Тепер ви можете увійти.');
          onSuccess(null);
        }
      } catch (error) {
        showErrorToast(error.message || 'Помилка аутентифікації');
      }
    }
  );

  return (
    <form onSubmit={form.handleSubmit} className="w-full space-y-4">
      {!isLoginView && (
        <FormInput
          label="Нікнейм"
          name="username"
          placeholder="Введіть нікнейм (мін. 3 символи)"
          value={form.values.username}
          onChange={form.handleChange}
          onBlur={form.handleBlur}
          error={form.errors.username}
          touched={form.touched.username}
          required
          hint="Буквы, цифры, тире и подчеркивание"
        />
      )}

      <FormInput
        label={isLoginView ? 'Email абоUsername' : 'Email'}
        name="email"
        type="email"
        placeholder={isLoginView ? 'example@mail.com' : 'your@email.com'}
        value={form.values.email}
        onChange={form.handleChange}
        onBlur={form.handleBlur}
        error={form.errors.email}
        touched={form.touched.email}
        required
      />

      <FormInput
        label="Пароль"
        name="password"
        type={showPassword ? 'text' : 'password'}
        placeholder="Введіть пароль"
        value={form.values.password}
        onChange={form.handleChange}
        onBlur={form.handleBlur}
        error={form.errors.password}
        touched={form.touched.password}
        required
        hint={!isLoginView ? 'Мін. 8 символів, велика буква, цифра' : undefined}
      />

      {!isLoginView && (
        <FormInput
          label="Підтвердіть пароль"
          name="confirmPassword"
          type={showConfirmPassword ? 'text' : 'password'}
          placeholder="Повторіть пароль"
          value={form.values.confirmPassword}
          onChange={form.handleChange}
          onBlur={form.handleBlur}
          error={form.errors.confirmPassword}
          touched={form.touched.confirmPassword}
          required
        />
      )}

      <button
        type="submit"
        disabled={form.isSubmitting || isLoading}
        className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-semibold rounded-lg transition-colors"
      >
        {form.isSubmitting || isLoading ? 'Завантаження...' : (isLoginView ? 'Увійти' : 'Зареєструватися')}
      </button>
    </form>
  );
};

export default AuthForm;
