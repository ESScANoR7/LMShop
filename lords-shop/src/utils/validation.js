import { z } from 'zod';

/**
 * Схеми валідації для аутентифікації
 */
export const authSchemas = {
  login: z.object({
    email: z.string().email('Невалідна email адреса'),
    password: z.string().min(1, 'Пароль обов\'язковий'),
  }),

  register: z.object({
    email: z.string().email('Невалідна email адреса'),
    username: z.string()
      .min(3, 'Username повинен бути мінімум 3 символи')
      .max(20, 'Username не повинен бути більше 20 символів')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Username може містити тільки букви, цифри, _ та -'),
    password: z.string()
      .min(8, 'Пароль повинен бути мінімум 8 символів')
      .regex(/[A-Z]/, 'Пароль повинен містити велику букву')
      .regex(/[a-z]/, 'Пароль повинен містити малу букву')
      .regex(/[0-9]/, 'Пароль повинен містити цифру'),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: 'Паролі не збігаються',
    path: ['confirmPassword'],
  }),

  changePassword: z.object({
    oldPassword: z.string().min(1, 'Старий пароль обов\'язковий'),
    newPassword: z.string()
      .min(8, 'Новий пароль повинен бути мінімум 8 символів')
      .regex(/[A-Z]/, 'Пароль повинен містити велику букву')
      .regex(/[a-z]/, 'Пароль повинен містити малу букву')
      .regex(/[0-9]/, 'Пароль повинен містити цифру'),
    confirmPassword: z.string(),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Паролі не збігаються',
    path: ['confirmPassword'],
  }),

  forgotPassword: z.object({
    email: z.string().email('Невалідна email адреса'),
  }),

  resetPassword: z.object({
    token: z.string().min(1, 'Токен обов\'язковий'),
    newPassword: z.string()
      .min(8, 'Пароль повинен бути мінімум 8 символів')
      .regex(/[A-Z]/, 'Пароль повинен містити велику букву')
      .regex(/[a-z]/, 'Пароль повинен містити малу букву')
      .regex(/[0-9]/, 'Пароль повинен містити цифру'),
  }),
};

/**
 * Схеми валідації для профілю
 */
export const profileSchemas = {
  updateProfile: z.object({
    username: z.string()
      .min(3, 'Username повинен бути мінімум 3 символи')
      .max(20, 'Username не повинен бути більше 20 символів')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Username може містити тільки букви, цифри, _ та -'),
    email: z.string().email('Невалідна email адреса'),
    telegram: z.string().optional().or(z.literal('')),
    discord: z.string().optional().or(z.literal('')),
  }),

  updateBalance: z.object({
    amount: z.number()
      .min(0.01, 'Сума повинна бути більше 0')
      .max(999999, 'Сума занадто велика'),
  }),
};

/**
 * Схеми валідації для товарів
 */
export const productSchemas = {
  cartItem: z.object({
    cartId: z.number().optional(),
    product: z.object({
      id: z.number().or(z.string()),
      name: z.string().min(1, 'Назва товару обов\'язкова'),
      base_price: z.number().min(0, 'Ціна не може бути від\'ємною'),
    }),
    type: z.enum(['account', 'rss', 'gems', 'special']),
    price: z.number().min(0, 'Ціна не може бути від\'ємною'),
  }),

  account: z.object({
    id: z.number().or(z.string()),
    name: z.string().min(1, 'Назва обов\'язкова'),
    level: z.number().min(1, 'Рівень повинен бути мінімум 1'),
    might: z.number().min(0),
    price: z.number().min(0),
    base_price: z.number().min(0),
  }),
};

/**
 * Схеми валідації для замовлень
 */
export const orderSchemas = {
  checkout: z.object({
    items: z.array(z.object({
      product_id: z.number().or(z.string()),
      type: z.enum(['account', 'rss', 'gems', 'special']),
      quantity: z.number().min(1, 'Кількість повинна бути мінімум 1'),
    })).min(1, 'Кошик не повинен бути пустим'),
    promo_code: z.string().optional().or(z.literal('')),
    payment_method: z.enum(['card', 'paypal', 'crypto']),
  }),

  promoCode: z.object({
    code: z.string()
      .min(1, 'Код не може бути пустим')
      .max(50, 'Код занадто довгий')
      .toUpperCase(),
  }),
};

/**
 * Схеми валідації для админ панелі
 */
export const adminSchemas = {
  editAccount: z.object({
    id: z.number().or(z.string()),
    name: z.string().min(1, 'Назва обов\'язкова'),
    level: z.number().min(1, 'Рівень повинен бути мінімум 1'),
    might: z.number().min(0),
    price: z.number().min(0),
    base_price: z.number().min(0),
  }),

  adminLogin: z.object({
    pin: z.string()
      .length(4, 'PIN повинен бути ровно 4 цифри')
      .regex(/^\d+$/, 'PIN повинен містити тільки цифри'),
  }),
};

/**
 * Допоміжна функція для валідації з красивими помилками
 * @param {object} schema - Zod схема
 * @param {object} data - Дані для валідації
 * @returns {object} - { success: boolean, data?: any, errors?: object }
 */
export const validate = (schema, data) => {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: { general: 'Помилка валідації' } };
  }
};

/**
 * Допоміжна функція для отримання першої помилки поля
 */
export const getFieldError = (errors, fieldName) => {
  return errors?.[fieldName] || null;
};
