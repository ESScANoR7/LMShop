# Інструкція по використанню перекладів (i18n)

## ✅ Що вже зроблено:

1. **Створено повний файл перекладів** `src/i18n.js` з 3 мовами:
   - 🇺🇦 Українська (ua) - за замовчуванням
   - 🇬🇧 Англійська (en)
   - 🇩🇪 Німецька (de)

2. **Перемикач мови** вже є в Header компоненті

3. **Переклади покривають:**
   - Navigation (nav)
   - Header
   - Home page (hero, trust sections)
   - Accounts page (filters, sorting, статуси)
   - Account Details
   - Resources page
   - Gems/Sapphires page
   - Cart page (повністю)
   - Profile page (login, register, orders)
   - Admin Panel (всі секції)
   - Common (кнопки, повідомлення)
   - Footer

## 📝 Як використовувати переклади в компонентах:

### 1. Імпортувати хук
```javascript
import { useTranslation } from 'react-i18next';
```

### 2. Використати в компоненті
```javascript
const MyComponent = () => {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('accounts.title')}</h1>
      <p>{t('accounts.subtitle')}</p>
      <button>{t('common.save')}</button>
    </div>
  );
};
```

## 🔧 Приклади використання:

### Accounts.jsx
```javascript
const { t } = useTranslation();

// В JSX:
<h1>{t('accounts.title')}</h1>
<button>{t('accounts.addToCart')}</button>
<span>{t('accounts.status.active')}</span>
```

### Cart.jsx
```javascript
const { t } = useTranslation();

// В JSX:
<h2>{t('cart.title')}</h2>
<button>{t('cart.checkout')}</button>
<p>{t('cart.empty')}</p>
```

### Profile.jsx
```javascript
const { t } = useTranslation();

// В JSX:
<input placeholder={t('profile.login.username')} />
<button>{t('profile.login.loginBtn')}</button>
```

## 📂 Структура ключів перекладу:

```
nav.*              - Навігація
header.*           - Хедер (пошук, профіль, кошик)
home.*             - Головна сторінка
accounts.*         - Сторінка акаунтів
accountDetails.*   - Деталі акаунта
resources.*        - Ресурси
gems.*             - Самоцвіти
cart.*             - Кошик
profile.*          - Профіль користувача
admin.*            - Адмін панель
common.*           - Загальні елементи (кнопки, повідомлення)
footer.*           - Футер
```

## 🎯 Наступні кроки (опціонально):

### Додати переклади до компонентів, які ще не використовують i18n:

1. **Accounts.jsx** - замінити hardcoded тексти на `t('accounts.*')`
2. **AccountDetails.jsx** - замінити на `t('accountDetails.*')`
3. **Cart.jsx** - замінити на `t('cart.*')`
4. **Profile.jsx** - замінити на `t('profile.*')`
5. **Admin.jsx** - замінити на `t('admin.*')` (великий файл)

### Приклад для Accounts.jsx:

**Було:**
```javascript
<h1>Галерея Акаунтів</h1>
<button>Додати в кошик</button>
```

**Стало:**
```javascript
const { t } = useTranslation();
<h1>{t('accounts.title')}</h1>
<button>{t('accounts.addToCart')}</button>
```

## 🚀 Тестування:

1. Відкрий сайт: http://localhost:5173
2. В Header переключи мову UA → EN → DE
3. Перевір, що всі тексти перекладаються

## 📝 Додавання нових перекладів:

Якщо потрібно додати нові тексти, редагуй `src/i18n.js`:

```javascript
"newSection": {
  "title": "Заголовок UA",
  "button": "Кнопка UA"
}
```

І додай для всіх 3 мов (ua, en, de).

---

**Створено:** 2026-06-04  
**Статус:** ✅ Переклади готові, треба інтегрувати в компоненти
