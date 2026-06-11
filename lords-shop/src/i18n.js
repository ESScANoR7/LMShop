import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  ua: {
    translation: {
      "nav": {
        "home": "ГОЛОВНА",
        "resources": "РЕСУРСИ",
        "sapphires": "САПФІРИ",
        "gems": "САПФІРИ",
        "accounts": "АКАУНТИ",
        "other": "ІНШЕ",
        "guarantees": "ГАРАНТІЇ",
        "calculator": "КАЛЬКУЛЯТОР",
        "topup": "ПОПОВНЕННЯ"
      },
      "header": {
        "search": "Пошук...",
        "profile": "Профіль",
        "cart": "Кошик",
        "login": "Увійти",
        "logout": "Вийти",
        "admin": "Адмін",
        "balance": "Баланс"
      },
      "orderModal": {
        "title": "Оформлення: {{name}}",
        "nickname": "Нікнейм (нік)",
        "guild": "Гільдія",
        "rssWarning": "⚠️ Гільдія повинна бути відкритою!",
        "coordinates": "Координати замку",
        "confirm": "Підтвердити"
      },
      "topup": {
        "title": "Поповнення балансу",
        "subtitle1": "Купуйте внутрішні монети сайту. Використовуйте їх для швидкої оплати будь-яких товарів.",
        "subtitle2": "1 USDT = 1 Монета",
        "selectAmount": "Оберіть суму поповнення",
        "bestseller": "Хіт продажу",
        "price": "Ціна:",
        "customAmount": {
          "title": "Інша сума",
          "subtitle": "Введіть скільки хочете поповнити"
        },
        "payment": {
          "title": "Виберіть спосіб оплати",
          "crypto": {
            "name": "Криптовалюта (USDT / BTC)",
            "desc": "Без комісії, автоматичне зарахування"
          },
          "card": {
            "name": "Банківська картка",
            "desc": "Visa / Mastercard (Комісія 2%)"
          }
        },
        "summary": {
          "title": "Підсумок",
          "receive": "Отримуєте монет:",
          "method": "Метод оплати:",
          "total": "До сплати:",
          "payBtn": "Оплатити",
          "secure": "Безпечний платіж • SSL Шифрування"
        },
        "errors": {
          "loginRequired": "Будь ласка, увійдіть в акаунт для поповнення балансу!",
          "minAmount": "Мінімальна сума поповнення: $1",
          "serverError": "Помилка сервера.",
          "networkError": "Немає зв'язку з сервером"
        },
        "cartItemName": "💳 Поповнення балансу: {{amount}} USDT",
        "successMessage": "Заявку створено! Оплатіть ${{amount}} вибраним способом."
      },
      "resources_page": {
        "title": "Ресурси та Сапфіри (Gems)",
        "subtitle": "Виберіть необхідний пакет ресурсів або сапфірів (gems) для швидкого розвитку вашого королівства.",
        "rssTitle": "Пакети ресурсів",
        "gemsTitle": "Сапфіри (Gems)",
        "mightLabel": "Міць:",
        "tooltipTitle": "Як це працює?",
        "tooltipDesc": "Виберіть діапазон міці вашого акаунта. Після цього ви перейдете до конфігуратора, де зможете вибрати точну кількість сапфірів (gems).",
        "loading": "Завантаження актуальних цін...",
        "noRss": "Немає доступних пакетів ресурсів.",
        "noGems": "Немає доступних сапфірів (gems).",
        "activeCode": "Код активний:",
        "addToWishlist": "Додати в улюблене",
        "removeFromWishlist": "Видалити з улюбленого"
      },
      "builder": {
        "backToShop": "Назад до магазину",
        "settingsTitle": "Налаштування покупки",
        "howManyGems": "Скільки купуємо? (1 = 100k)",
        "totalGems": "Всього Сапфірів (Gems):",
        "ratePer100k": "Ціна (за 100k):",
        "totalToPay": "До сплати:",
        "gameDataTitle": "Ваші ігрові дані",
        "nicknamePlaceholder": "Нікнейм гравця (Eng)",
        "guildPlaceholder": "Гільдія (необов'язково)",
        "guildWarning": "Гільдія має бути лише відкритою! Інакше ми не зможемо доставити товар.",
        "mightPlaceholder": "Точна міць (Напр: 1b 200m або 500m)",
        "recognizedMight": "✅ Розпізнано: {{might}}M. Ціна адаптована!",
        "usedForGifts": "Використано для подарунків:",
        "itemNameTitle": "Назва товару",
        "itemPriceTitle": "Ціна (Gems)",
        "actionTitle": "Дія",
        "addBtn": "+ Додати",
        "wishlistTitle": "Сформований подарунок",
        "addToCartBtn": "Додати замовлення у Кошик",
        "selectItemsFirst": "Оберіть товари для додавання",
        "loadingBuilder": "Завантаження калькулятора...",
        "errorNotEnoughGems": "Недостатньо Сапфірів (Gems)! Збільшіть кількість пакетів зліва.",
        "errorFillData": "Заповніть ваші ігрові дані (Нікнейм та Точну міць)!",
        "successAdded": "Замовлення додано до кошика!",
        "giftName": "Подарунки за {{amount}} Gems"
      },
      "special_page": {
        "title": "Спеціальні пропозиції",
        "subtitle": "Ексклюзивні набори, послуги та сапфіри. Виберіть товар, і ми доставимо його на ваш акаунт.",
        "loading": "Завантаження товарів...",
        "noItems": "Поки що немає доступних товарів.",
        "activeCode": "Діє код:",
        "addToWishlist": "Додати в улюблене",
        "removeFromWishlist": "Видалити з улюбленого",
        "buy": "Купити",
        "modalTitle": "Оформлення замовлення",
        "enterPrefix": "Введіть",
        "modalInfo": "Переконайтеся у правильності даних. Товар буде додано до Кошика.",
        "addToCartBtn": "Додати в Кошик",
        "addedSuccess": "додано до кошика!"
      },
      "home": {
        "hero": {
          "title": "Твій арсенал у",
          "subtitle": "Купуй ресурси, сапфіри та топові акаунти за найкращими цінами. Швидка доставка, гарантія безпеки та підтримка 24/7.",
          "btnResources": "Купити ресурси",
          "btnAccounts": "Переглянути акаунти"
        },
        "trust": {
          "title1": "Миттєва видача",
          "desc1": "Відправляємо ресурси відразу після підтвердження оплати.",
          "title2": "100% Безпека",
          "desc2": "Чисті ресурси та акаунти без ризику бану від IGG.",
          "title3": "Підтримка 24/7",
          "desc3": "Завжди на зв'язку в Telegram для вирішення будь-яких питань."
        }
      },
      "accounts": {
        "title": "Галерея Акаунтів",
        "subtitle": "Топові акаунти Lords Mobile з перевіреною статистикою",
        "filter": {
          "all": "Всі",
          "active": "У продажу",
          "sold": "Продані",
          "processing": "В обробці"
        },
        "sortBy": "Сортувати:",
        "priceAsc": "Ціна: дешевше",
        "priceDesc": "Ціна: дорожче",
        "noAccounts": "Нічого не знайдено",
        "details": "Переглянути",
        "unavailable": "Недоступно",
        "addToCart": "Додати в кошик",
        "inCart": "У кошику",
        "bind": "Прив'язка",
        "activeCode": "Діє код:",
        "addToCompare": "Додати до порівняння",
        "addToWishlist": "Додати в улюблене",
        "removeFromWishlist": "Видалити з улюбленого",
        "status": {
          "active": "Активний",
          "sold": "Продано",
          "processing": "Обробляється"
        }
      },
      "accountDetails": {
        "backToGallery": "Назад до галереї",
        "price": "Ціна",
        "bind": "Прив'язка",
        "status": "Статус",
        "description": "Опис",
        "stats": "Характеристики",
        "might": "Міць",
        "troops": "Війська",
        "heroes": "Герої",
        "artifacts": "Артефакти",
        "images": "Зображення",
        "addToCart": "Додати в кошик",
        "inCart": "У кошику",
        "buyNow": "Купити зараз"
      },
      "resources": {
        "title": "Магазин Ресурсів",
        "subtitle": "Швидка доставка RSS за вигідними цінами",
        "packTitle": "Пакети Ресурсів",
        "name": "Назва",
        "description": "Опис",
        "price": "Ціна",
        "basePrice": "Базова ціна",
        "addToCart": "Додати",
        "inCart": "У кошику"
      },
      "gems": {
        "title": "Сапфіри (Gems)",
        "subtitle": "Вигідний курс на сапфіри Lords Mobile",
        "range": "Діапазон",
        "rate": "Курс",
        "basePrice": "Базова ціна",
        "calculate": "Розрахувати",
        "mightLabel": "Might акаунта",
        "amountLabel": "Кількість сапфірів",
        "totalPrice": "Загальна ціна"
      },
      "calculator": {
        "title": "Калькулятор Lords Mobile",
        "subtitle": "Розрахунок часу тренування, ресурсів та прискорювачів",
        "tabs": {
          "train": "Тренування T1-T4",
          "t5": "Тренування T5",
          "speedups": "Прискорювачі",
          "convert": "Конвертер"
        },
        "train": {
          "amount": "Кількість військ",
          "speed": "Швидкість тренування (%)",
          "tier": "Тір військ",
          "time": "Час тренування",
          "resources": "Потрібні ресурси",
          "speedupsNeeded": "Потрібні прискорювачі"
        },
        "t5": {
          "hasLunite": "Є Лунний Камінь",
          "speed": "Швидкість майстерні (%)"
        },
        "speedups": {
          "title": "Прискорювачі у сумці",
          "total": "Всього часу",
          "clear": "Очистити"
        },
        "results": {
          "time": "Час",
          "food": "Їжа",
          "wood": "Дерево",
          "stone": "Камінь",
          "ore": "Руда",
          "gold": "Золото"
        }
      },
      "cart": {
        "title": "Оформлення замовлення",
        "empty": "Кошик порожній",
        "emptyDesc": "Але ви все ще можете перевірити свій промокод справа 👉",
        "backToCatalog": "Повернутися до каталогу",
        "discountActive": "Знижка активна",
        "nickname": "Нікнейм:",
        "withDiscount": "Зі знижкою!",
        "remove": "Видалити",
        "paymentTitle": "Оплата",
        "accountWarning": "Оплата за акаунти приймається",
        "accountWarningBold": "виключно у криптовалюті (USDT)",
        "balanceMethod": "Баланс монет",
        "balanceAvailable": "Доступно: {{amount}} монет",
        "cryptoMethod": "Криптовалюта (USDT)",
        "cardMethod": "Банківська картка",
        "cardFee": "Visa / Mastercard (Комісія 2%)",
        "promoTitle": "У вас є промокод?",
        "promoPlaceholder": "Введіть код",
        "applyBtn": "Застосувати",
        "summary": "Сума товарів:",
        "savings": "Економія:",
        "total": "Разом:",
        "coins": "Монет",
        "cashback": "Кешбек",
        "cashbackAuth": "Потрібна авторизація",
        "cashbackAvail": "Можна буде витратити",
        "payBalanceBtn": "Оплатити з балансу",
        "orderBtn": "Замовити зараз",
        "promoUsed": "Ви вже використовували цей промокод!",
        "promoSuccess": "Промокод успішно застосовано!",
        "promoInvalid": "Промокод недійсний або не підходить для цих товарів",
        "balanceLoginReq": "Для оплати з балансу потрібно увійти в акаунт!",
        "balanceInsuff": "Недостатньо монет на балансі!",
        "sending": "Відправка замовлення...",
        "successBalance": "Успішно! З балансу списано {{amount}} монет.",
        "successCrypto": "Замовлення прийнято! Спосіб оплати: {{method}}",
        "checkoutErr": "Помилка оформлення замовлення",
        "discountPercent": "Знижка {{value}}%",
        "discountFixed": "Знижка ${{value}}",
        "gift": "Подарунок: {{value}}",
        "appliesTo": "Діє на: {{items}}",
        "appliesToEmpty": "Діє на визначені товари (додайте їх у кошик)",
        "appliesToAll": "Діє на все замовлення",
        "removePromo": "Видалити промокод"
      },
      "profile": {
        "title": "Мій Кабінет",
        "welcome": "Вітаємо",
        "balance": "Баланс монет",
        "player": "Гравець",
        "buyCoins": "Купити монети",
        "tabs": {
          "settings": "Особисті дані",
          "security": "Безпека",
          "orders": "Мої замовлення",
          "wishlist": "Улюблене",
          "payment": "Оплата",
          "referrals": "Реферали",
          "notifications": "Сповіщення",
          "logout": "Вийти з акаунта"
        },
        "settings": {
          "title": "Особисті дані",
          "basicInfo": "Основна інформація",
          "publicName": "Публічний Нікнейм",
          "minChars": "Мінімум 5 символів",
          "contacts": "Контакти для зв'язку",
          "tgBindTitle": "Прив'язка Telegram",
          "tgBindDesc": "Прив'яжіть свого Telegram-бота, щоб миттєво отримувати сповіщення про зміну статусів ваших замовлень та нарахування кешбеку!",
          "bindBtn": "Прив'язати",
          "discordId": "Discord ID",
          "saveContacts": "Зберегти контакти"
        },
        "security": {
          "title": "Безпека акаунта",
          "changePass": "Зміна пароля",
          "newPass": "Новий пароль",
          "confirmPass": "Підтвердіть новий пароль",
          "updateSecurity": "Оновити захист",
          "activeSessions": "Активні сесії",
          "logoutOther": "Вийти з інших пристроїв",
          "current": "Поточний"
        },
        "orders": {
          "title": "Моя історія покупок",
          "empty": "Тут поки порожньо",
          "emptyDesc": "Ви ще нічого не замовляли.",
          "toCatalog": "До каталогу",
          "orderNum": "Замовлення #",
          "items": "товар(ів)",
          "content": "Вміст замовлення:",
          "total": "Загальна сума:",
          "profit": "Прибуток:",
          "status": {
            "new": "Нове",
            "processing": "В обробці",
            "completed": "Виконано",
            "cancelled": "Скасовано"
          }
        },
        "wishlist": {
          "title": "Моє улюблене",
          "empty": "Ваш список бажаного порожній",
          "emptyDesc": "Додавайте сюди товари, які плануєте придбати пізніше, щоб не загубити їх.",
          "toProducts": "Перейти до товарів"
        },
        "payment": {
          "title": "Оплата та Фінанси",
          "mainMethod": "Основний спосіб оплати",
          "methodDesc": "Оберіть зручний для вас спосіб оплати, який буде автоматично підставлятися при оформленні замовлення.",
          "crypto": "Криптовалюта (USDT)",
          "cryptoDesc": "Найшвидший та найбезпечніший спосіб",
          "card": "Банківська картка",
          "cardDesc": "Visa / Mastercard",
          "wallet": "PayPal / Wise",
          "walletDesc": "Електронні гаманці"
        },
        "referrals": {
          "title": "Запроси друга",
          "desc": "Отримуйте 5% від кожної покупки ваших друзів прямо на свій баланс. Що більше друзів — то більше безкоштовних ресурсів!",
          "copy": "Копіювати"
        },
        "notifications": {
          "title": "Центр сповіщень",
          "markRead": "Позначити всі як прочитані",
          "empty": "У вас поки немає нових сповіщень."
        },
        "login": {
          "title": "Вхід у кабінет",
          "subtitle": "Отримуйте кешбек з кожної покупки!",
          "username": "Логін (Нікнейм)",
          "password": "Пароль",
          "remember": "Запам'ятати мене",
          "forgot": "Забули пароль?",
          "btn": "Увійти в кабінет",
          "noAccount": "Вперше у нас?",
          "toRegister": "Реєстрація"
        },
        "register": {
          "title": "Створення акаунта",
          "username": "Нікнейм",
          "email": "Електронна пошта",
          "password": "Пароль",
          "confirmPassword": "Повторіть пароль",
          "btn": "Створити акаунт",
          "hasAccount": "Вже маєте акаунт?",
          "toLogin": "Авторизація"
        },
        "validation": {
          "passMismatch": "Паролі не співпадають",
          "passMatch": "Паролі співпадають!",
          "minChars": "Мінімум символів",
          "left": "залишилось",
          "perfect": "Відмінно!"
        }
      },
      "admin": {
        "title": "Адмін Панель",
        "sidebar": {
          "dashboard": "Дашборд",
          "orders": "Замовлення",
          "users": "Користувачі",
          "cashback": "Кешбек",
          "accounts": "Акаунти",
          "resources": "Ресурси та Gems",
          "other": "Інші товари",
          "promo": "Промокоди"
        },
        "dashboard": {
          "title": "Огляд магазину",
          "desc": "Ключові показники вашого бізнесу",
          "revenue": "Загальний оборот",
          "profit": "Чистий прибуток",
          "completedOrders": "Виконані замовлення",
          "totalUsers": "Всього клієнтів",
          "promoActivations": "Активацій промокодів",
          "recentOrders": "Останні 5 замовлень",
          "viewAllOrders": "Всі замовлення →",
          "noOrders": "Немає замовлень",
          "sum": "Сума:",
          "items": "товар(ів)"
        },
        "users": {
          "title": "Клієнтська база",
          "desc": "Контроль акаунтів, статистика рефералів та бани",
          "filterAll": "Всі",
          "filterActive": "Активні",
          "filterBanned": "В бані",
          "searchPlaceholder": "Пошук за Ніком, IP або ID...",
          "thUser": "Користувач",
          "thBalance": "Баланс",
          "thIP": "IP Адреса",
          "thRef": "Реферали (Заробіток)",
          "thActions": "Статус / Дії",
          "notFound": "Клієнтів не знайдено",
          "noData": "Немає даних",
          "referredBy": "Привів:",
          "bannedLabel": "Заблоковано",
          "unbanBtn": "Розбанити",
          "banBtn": "Бан",
          "banModalTitle": "Блокування користувача",
          "banModalDesc1": "Ви збираєтеся забанити",
          "banModalDesc2": ". Вхід для цієї мережі буде закрито.",
          "banReasonLabel": "Причина блокування",
          "banReasonPlaceholder": "Наприклад: Шахрайство з оплатою",
          "cancelBtn": "Скасувати",
          "confirmBanBtn": "Підтвердити Бан"
        },
        "cashback": {
          "title": "Програма Лояльності (Кешбек)",
          "desc": "Заохочуйте клієнтів купувати частіше! За кожне замовлення авторизований користувач отримуватиме відсоток від суми на свій баланс. Зібрані монети можна витратити на наступні покупки.",
          "baseRateTitle": "Базова ставка кешбеку",
          "baseRateLabel": "Скільки % від суми замовлення повертати клієнту?",
          "example": "Приклад: Якщо клієнт купує ресурсів на $100, він отримає",
          "example2": "на свій баланс для майбутніх покупок.",
          "restrictionsTitle": "Обмеження категорій",
          "restrictionsDesc": "Виберіть, за покупку яких товарів кешбек НЕ нараховуватиметься:",
          "catAccount": "Акаунти (Рекомендується виключити)",
          "catRss": "Ресурси",
          "catGems": "Сапфіри",
          "catSpecial": "Спеціальні пропозиції",
          "saveBtn": "Зберегти налаштування"
        },
        "orders": {
          "title": "База Замовлень",
          "desc": "Управління покупками клієнтів",
          "filterAll": "Всі",
          "filterNew": "🔵 Нові",
          "filterProcessing": "🟡 В процесі",
          "filterCompleted": "🟢 Виконані",
          "filterCancelled": "🔴 Скасовані",
          "searchPlaceholder": "Пошук за ID, Ніком, Координатами...",
          "notFound": "Замовлень не знайдено.",
          "orderContent": "Вміст замовлення:",
          "totalSum": "Загальна сума:",
          "profit": "Прибуток:",
          "statusLabel": "Статус замовлення",
          "nickname": "Нікнейм:",
          "guild": "Гільдія:",
          "coords": "Координати:",
          "details": "Додатково:",
          "statusNew": "🔵 Нове",
          "statusProcessing": "🟡 В процесі",
          "statusCompleted": "🟢 Виконано",
          "statusCancelled": "🔴 Скасовано"
        },
        "promo": {
          "title": "Генератор промокодів",
          "desc": "Створюйте знижки або бонусні подарунки для клієнтів.",
          "saveBtn": "Зберегти промокод",
          "createTitle": "Створити промокод",
          "genRandom": "Згенерувати випадковий",
          "codeLabel": "Код",
          "typeLabel": "Тип бонусу",
          "typePercent": "Відсоток (%)",
          "typeFixed": "Фіксована сума ($)",
          "typeItem": "Подарунок (Item)",
          "valueLabel": "Значення",
          "valuePlaceholderPercent": "Напр: 10",
          "valuePlaceholderFixed": "Напр: 50",
          "valuePlaceholderItem": "Напр: Щит 24г",
          "limitLabel": "Ліміт активацій (0=∞)",
          "minSumLabel": "Мін. сума ($)",
          "expiryLabel": "Діє до (Дата)",
          "targetLabel": "На які товари діє?",
          "targetAll": "На всі товари",
          "targetAcc": "Тільки Акаунти",
          "targetOther": "Тільки Послуги",
          "targetSpecific": "Обрати конкретні",
          "activeTitle": "Активні промокоди",
          "noActive": "Немає активних промокодів",
          "giftLabel": "Подарунок:",
          "usesLabel": "Використань:"
        },
        "accounts": {
          "title": "Керування Акаунтами",
          "publishBtn": "Опублікувати",
          "textInfoTitle": "Текстова інформація",
          "nameLabel": "Назва акаунта",
          "descLabel": "Короткий опис",
          "pricingTitle": "Характеристики та Ціна",
          "costLabel": "Собівартість (USDT)",
          "markupLabel": "Націнка",
          "finalPriceLabel": "Фінальна ціна:",
          "tagsLabel": "Теги акаунта (Через кому)",
          "tagsPlaceholder": "Напр: T5, Mythic, Пастка, 1.2B",
          "bindLabel": "Прив'язка (Bind)",
          "bindPlaceholder": "Напр: Steam + FB",
          "statsTitle": "Характеристики (Для порівняння)",
          "mightLabel": "Міць (Напр: 1.5B)",
          "troopsLabel": "Війська (Напр: 20M)",
          "mixAtkLabel": "Mix Атака (Напр: 850%)",
          "heroesLabel": "Донат Герої (Напр: 5 Золотих)",
          "artifactsLabel": "Артефакти (Напр: 600 Зірок)",
          "mainPhotoTitle": "Головне фото (Обкладинка)",
          "addMainPhoto": "Додати головне фото",
          "additionalPhotosTitle": "Додаткові фотографії (Скріншоти)",
          "addAdditionalPhotos": "Додати ще фотографії",
          "dbTitle": "База Акаунтів",
          "searchPlaceholder": "Пошук за назвою чи ID...",
          "statusAll": "Усі статуси",
          "statusActive": "🟢 В продажі",
          "statusProcessing": "🟡 На обробці",
          "statusSold": "🔴 Продано",
          "notFound": "Акаунтів не знайдено.",
          "soldLabel": "Продано",
          "editBtn": "Редаг.",
          "unavailableBtn": "Недоступно"
        },
        "resources": {
          "title": "Ресурси та Сапфіри",
          "saveAllBtn": "Зберегти все",
          "rssTitle": "Ресурси (RSS)",
          "addBtn": "Додати",
          "packNameLabel": "Назва пакунку",
          "costLabel": "Собіварт.",
          "priceLabel": "Ціна",
          "gemsTitle": "Сапфіри (Gems)",
          "rangeLabel": "Діапазон міці"
        },
        "other": {
          "title": "Інші товари (Послуги, Пакунки)",
          "saveOrderBtn": "Зберегти порядок",
          "publishBtn": "Опублікувати",
          "saveChangesBtn": "Зберегти зміни",
          "createTitle": "Створити товар",
          "editTitle": "Редагувати товар",
          "cancelBtn": "Скасувати",
          "nameLabel": "Назва товару",
          "namePlaceholder": "Напр: Набір Золотий Дракон",
          "descLabel": "Опис (Що входить у набір)",
          "tagLabel": "Стікер (Тег)",
          "tagPlaceholder": "Напр: Хіт продажу",
          "colorLabel": "Колір картки",
          "colorBlue": "Синій (Стандартний)",
          "colorOrange": "Помаранчевий (Легендарний)",
          "colorGreen": "Смарагдовий (Епік)",
          "colorPurple": "Фіолетовий (Міфік)",
          "colorRed": "Червоний (Ексклюзив)",
          "pricingTitle": "Ціна та Комісія",
          "costLabel": "Собівартість ($)",
          "markupLabel": "Націнка",
          "finalPriceLabel": "Фінальна ціна для клієнта:",
          "receiveDataTitle": "Дані для отримання",
          "receiveDataDesc": "Додайте поля, які клієнт має заповнити при покупці цього товару.",
          "fieldPlaceholder": "Напр: Ваш IGG ID...",
          "addBtn": "Додати",
          "itemsTitle": "Ваші товари",
          "noItems": "Ви ще не додали жодного товару"
        }
      },
      "common": {
        "loading": "Завантаження...",
        "error": "Помилка",
        "success": "Успішно",
        "confirm": "Підтвердити",
        "cancel": "Скасувати",
        "save": "Зберегти",
        "delete": "Видалити",
        "edit": "Редагувати",
        "add": "Додати",
        "search": "Пошук",
        "filter": "Фільтр",
        "sort": "Сортування",
        "close": "Закрити",
        "back": "Назад",
        "next": "Далі",
        "previous": "Назад",
        "viewAll": "Переглянути все",
        "learnMore": "Дізнатися більше"
      },
      "footer": {
        "about": "Про нас",
        "aboutDesc": "Ваш надійний партнер у світі Lords Mobile. Ми надаємо безпечні послуги з продажу акаунтів, ресурсів та сапфірів з гарантією якості.",
        "navTitle": "Навігація",
        "navHome": "Головна",
        "navAccounts": "Галерея акаунтів",
        "navResources": "Купити ресурси",
        "navSpecial": "Спеціальні пропозиції",
        "clientTitle": "Клієнтам",
        "clientGuarantees": "Гарантії та FAQ",
        "clientTerms": "Умови використання",
        "clientPrivacy": "Політика конфіденційності",
        "supportTitle": "Підтримка",
        "tgSupport": "Telegram Підтримка",
        "copyright": "© {{year}} LORDS SHOP. Всі права захищені. Не є офіційним продуктом IGG."
      },
      "guarantees": {
        "title": "Гарант-Сервіс",
        "subtitle": "Ваша безпека — наш головний пріоритет. Дізнайтеся, як ми захищаємо покупців і продавців на кожному етапі угоди.",
        "howItWorks": "Як працює безпечна угода?",
        "steps": {
          "step1": {
            "title": "Оплата та Резерв",
            "desc": "Покупець оплачує товар. Гроші утримуються на рахунку гаранта, продавець їх ще не отримує."
          },
          "step2": {
            "title": "Перевірка акаунта",
            "desc": "Гарант отримує дані від продавця, заходить на акаунт і перевіряє, чи все відповідає опису."
          },
          "step3": {
            "title": "Переприв'язка",
            "desc": "Гарант відв'язує пошти та соцмережі продавця і прив'язує акаунт на дані покупця."
          },
          "step4": {
            "title": "Успішна угода",
            "desc": "Покупець заходить на акаунт і підтверджує отримання. Тільки після цього гарант переказує гроші продавцю."
          }
        },
        "faqTitle": "Часті запитання (FAQ)",
        "faqs": [
          {
            "question": "Як довго триває процес передачі акаунта?",
            "answer": "Зазвичай передача акаунта займає від 15 до 60 хвилин після підтвердження оплати. У деяких випадках (наприклад, якщо потрібна відв'язка складних сервісів) це може зайняти до 24 годин. Ми завжди тримаємо вас у курсі."
          },
          {
            "question": "Які способи оплати ви приймаєте?",
            "answer": "На даний момент ми працюємо з криптовалютою (USDT TRC20/ERC20) для максимальної безпеки та швидкості, а також приймаємо перекази на банківські картки (Visa/Mastercard) за попередньою домовленістю."
          },
          {
            "question": "Що робити, якщо акаунт не відповідає опису?",
            "answer": "Наш гарант особисто перевіряє акаунт перед передачею. Якщо ми виявимо розбіжності з описом на сайті (менше міці, відсутність заявлених героїв), угода скасовується, і вам повертаються всі кошти у повному обсязі."
          },
          {
            "question": "Чи можна купити ресурси без передачі пароля?",
            "answer": "Так! Продаж ресурсів та сапфірів (подарунками) відбувається без доступу до вашого акаунта. Вам потрібно лише вказати ваш ігровий нікнейм, координати або тег гільдії."
          }
        ]
      }
    }
  },

  en: {
    translation: {
      "nav": {
        "home": "HOME",
        "resources": "RESOURCES",
        "sapphires": "SAPPHIRES",
        "gems": "GEMS",
        "accounts": "ACCOUNTS",
        "other": "OTHER",
        "guarantees": "GUARANTEES",
        "calculator": "CALCULATOR",
        "topup": "TOP-UP"
      },
      "header": {
        "search": "Search...",
        "profile": "Profile",
        "cart": "Cart",
        "login": "Login",
        "logout": "Logout",
        "admin": "Admin",
        "balance": "Balance"
      },
      "orderModal": {
        "title": "Checkout: {{name}}",
        "nickname": "Nickname",
        "guild": "Guild",
        "rssWarning": "⚠️ Guild must be open!",
        "coordinates": "Castle Coordinates",
        "confirm": "Confirm"
      },
      "topup": {
        "title": "Balance Top-Up",
        "subtitle1": "Buy internal site coins. Use them for fast payment of any products.",
        "subtitle2": "1 USDT = 1 Coin",
        "selectAmount": "Select Top-Up Amount",
        "bestseller": "Bestseller",
        "price": "Price:",
        "customAmount": {
          "title": "Custom Amount",
          "subtitle": "Enter how much you want to top up"
        },
        "payment": {
          "title": "Select Payment Method",
          "crypto": {
            "name": "Cryptocurrency (USDT / BTC)",
            "desc": "No commission, automatic crediting"
          },
          "card": {
            "name": "Credit Card",
            "desc": "Visa / Mastercard (2% Commission)"
          }
        },
        "summary": {
          "title": "Summary",
          "receive": "You receive coins:",
          "method": "Payment method:",
          "total": "Total to pay:",
          "payBtn": "Pay",
          "secure": "Secure Payment • SSL Encryption"
        },
        "errors": {
          "loginRequired": "Please log in to top up your balance!",
          "minAmount": "Minimum top-up amount: $1",
          "serverError": "Server error.",
          "networkError": "No connection to the server"
        },
        "cartItemName": "💳 Balance Top-Up: {{amount}} USDT",
        "successMessage": "Request created! Please pay ${{amount}} using the selected method."
      },
      "resources_page": {
        "title": "Resources & Gems",
        "subtitle": "Choose the required resource or gem pack for the rapid development of your kingdom.",
        "rssTitle": "Resource Packs",
        "gemsTitle": "Gem Rates",
        "mightLabel": "Might:",
        "tooltipTitle": "How it works?",
        "tooltipDesc": "Select your account's might range. After that, you will be taken to the configurator where you can choose the exact amount of gems.",
        "loading": "Loading current prices...",
        "noRss": "No resource packs available.",
        "noGems": "No gem rates available.",
        "activeCode": "Code active:",
        "addToWishlist": "Add to Wishlist",
        "removeFromWishlist": "Remove from Wishlist"
      },
      "builder": {
        "backToShop": "Back to store",
        "settingsTitle": "Purchase Settings",
        "howManyGems": "How much to buy? (1 = 100k)",
        "totalGems": "Total Gems:",
        "ratePer100k": "Rate (per 100k):",
        "totalToPay": "Total to pay:",
        "gameDataTitle": "Your Game Data",
        "nicknamePlaceholder": "Player Nickname (Eng)",
        "guildPlaceholder": "Guild (optional)",
        "guildWarning": "The guild must be open! Otherwise we cannot deliver the order.",
        "mightPlaceholder": "Exact might (E.g.: 1b 200m or 500m)",
        "recognizedMight": "✅ Recognized: {{might}}M. Rate adapted!",
        "usedForGifts": "Used for gifts:",
        "itemNameTitle": "Item Name",
        "itemPriceTitle": "Price (Gems)",
        "actionTitle": "Action",
        "addBtn": "+ Add",
        "wishlistTitle": "Formed Gift",
        "addToCartBtn": "Add Order to Cart",
        "selectItemsFirst": "Select items to add",
        "loadingBuilder": "Loading configurator...",
        "errorNotEnoughGems": "Not enough Gems! Increase the pack quantity on the left.",
        "errorFillData": "Please fill in your game data (Nickname and Exact Might)!",
        "successAdded": "Order added to cart!",
        "giftName": "Gifts for {{amount}} Gems"
      },
      "special_page": {
        "title": "Special Offers",
        "subtitle": "Exclusive packs, services, and sapphires. Choose an item, and we'll deliver it to your account.",
        "loading": "Loading items...",
        "noItems": "No items available at the moment.",
        "activeCode": "Code applied:",
        "addToWishlist": "Add to Wishlist",
        "removeFromWishlist": "Remove from Wishlist",
        "buy": "Buy",
        "modalTitle": "Checkout",
        "enterPrefix": "Enter",
        "modalInfo": "Make sure the details are correct. The item will be added to your Cart.",
        "addToCartBtn": "Add to Cart",
        "addedSuccess": "added to cart!"
      },
      "home": {
        "hero": {
          "title": "Your arsenal in",
          "subtitle": "Buy resources, gems, and top accounts at the best prices. Fast delivery, guaranteed security, and 24/7 support.",
          "btnResources": "Buy Resources",
          "btnAccounts": "View Accounts"
        },
        "trust": {
          "title1": "Instant Delivery",
          "desc1": "We send resources immediately after payment confirmation.",
          "title2": "100% Security",
          "desc2": "Clean resources and accounts with no risk of IGG ban.",
          "title3": "24/7 Support",
          "desc3": "Always available on Telegram to resolve any issues."
        }
      },
      "accounts": {
        "title": "Account Gallery",
        "subtitle": "Top Lords Mobile accounts with verified stats",
        "filter": {
          "all": "All",
          "active": "On Sale",
          "sold": "Sold",
          "processing": "Processing"
        },
        "sortBy": "Sort by:",
        "priceAsc": "Price: Low to High",
        "priceDesc": "Price: High to Low",
        "noAccounts": "No accounts found",
        "details": "View",
        "unavailable": "Unavailable",
        "addToCart": "Add to Cart",
        "inCart": "In Cart",
        "bind": "Binding",
        "activeCode": "Code applied:",
        "addToCompare": "Add to Compare",
        "addToWishlist": "Add to Wishlist",
        "removeFromWishlist": "Remove from Wishlist",
        "status": {
          "active": "Active",
          "sold": "Sold",
          "processing": "Processing"
        }
      },
      "accountDetails": {
        "backToGallery": "Back to Gallery",
        "price": "Price",
        "bind": "Binding",
        "status": "Status",
        "description": "Description",
        "stats": "Stats",
        "might": "Might",
        "troops": "Troops",
        "heroes": "Heroes",
        "artifacts": "Artifacts",
        "images": "Images",
        "addToCart": "Add to Cart",
        "inCart": "In Cart",
        "buyNow": "Buy Now"
      },
      "resources": {
        "title": "Resource Shop",
        "subtitle": "Fast RSS delivery at great prices",
        "packTitle": "Resource Packs",
        "name": "Name",
        "description": "Description",
        "price": "Price",
        "basePrice": "Base Price",
        "addToCart": "Add",
        "inCart": "In Cart"
      },
      "gems": {
        "title": "Gems",
        "subtitle": "Great rates on Lords Mobile gems",
        "range": "Range",
        "rate": "Rate",
        "basePrice": "Base Price",
        "calculate": "Calculate",
        "mightLabel": "Account Might",
        "amountLabel": "Gems Amount",
        "totalPrice": "Total Price"
      },
      "calculator": {
        "title": "Lords Mobile Calculator",
        "subtitle": "Calculate training time, resources, and speedups",
        "tabs": {
          "train": "T1-T4 Training",
          "t5": "T5 Training",
          "speedups": "Speedups",
          "convert": "Converter"
        },
        "train": {
          "amount": "Troop Amount",
          "speed": "Training Speed (%)",
          "tier": "Troop Tier",
          "time": "Training Time",
          "resources": "Required Resources",
          "speedupsNeeded": "Speedups Needed"
        },
        "t5": {
          "hasLunite": "Has Lunite Stone",
          "speed": "Workshop Speed (%)"
        },
        "speedups": {
          "title": "Speedups in Bag",
          "total": "Total Time",
          "clear": "Clear"
        },
        "results": {
          "time": "Time",
          "food": "Food",
          "wood": "Wood",
          "stone": "Stone",
          "ore": "Ore",
          "gold": "Gold"
        }
      },
      "cart": {
        "title": "Checkout",
        "empty": "Your cart is empty",
        "emptyDesc": "But you can still check your promo code on the right 👉",
        "backToCatalog": "Back to Catalog",
        "discountActive": "Discount active",
        "nickname": "Nickname:",
        "withDiscount": "Discounted!",
        "remove": "Remove",
        "paymentTitle": "Payment",
        "accountWarning": "Payment for accounts is accepted",
        "accountWarningBold": "exclusively in cryptocurrency (USDT)",
        "balanceMethod": "Coin Balance",
        "balanceAvailable": "Available: {{amount}} coins",
        "cryptoMethod": "Cryptocurrency (USDT)",
        "cardMethod": "Credit Card",
        "cardFee": "Visa / Mastercard (2% Commission)",
        "promoTitle": "Have a promo code?",
        "promoPlaceholder": "Enter code",
        "applyBtn": "Apply",
        "summary": "Items Subtotal:",
        "savings": "Savings:",
        "total": "Total:",
        "coins": "Coins",
        "cashback": "Cashback",
        "cashbackAuth": "Authorization required",
        "cashbackAvail": "You will earn",
        "payBalanceBtn": "Pay with balance",
        "orderBtn": "Order Now",
        "promoUsed": "You have already used this promo code!",
        "promoSuccess": "Promo code applied successfully!",
        "promoInvalid": "Promo code is invalid or not applicable for these items",
        "balanceLoginReq": "You must log in to pay with your balance!",
        "balanceInsuff": "Insufficient coins on your balance!",
        "sending": "Sending order...",
        "successBalance": "Success! {{amount}} coins deducted from your balance.",
        "successCrypto": "Order accepted! Payment method: {{method}}",
        "checkoutErr": "Checkout error",
        "discountPercent": "{{value}}% Discount",
        "discountFixed": "${{value}} Discount",
        "gift": "Gift: {{value}}",
        "appliesTo": "Applies to: {{items}}",
        "appliesToEmpty": "Applies to specific items (add them to cart)",
        "appliesToAll": "Applies to the entire order",
        "removePromo": "Remove promo code"
      },
      "profile": {
        "title": "My Account",
        "welcome": "Welcome",
        "balance": "Coin Balance",
        "player": "Player",
        "buyCoins": "Buy Coins",
        "tabs": {
          "settings": "Personal Data",
          "security": "Security",
          "orders": "My Orders",
          "wishlist": "Wishlist",
          "payment": "Payment",
          "referrals": "Referrals",
          "notifications": "Notifications",
          "logout": "Logout"
        },
        "settings": {
          "title": "Personal Data",
          "basicInfo": "Basic Information",
          "publicName": "Public Nickname",
          "minChars": "Minimum 5 characters",
          "contacts": "Contact Information",
          "tgBindTitle": "Link Telegram",
          "tgBindDesc": "Link your Telegram bot to instantly receive notifications about your order status changes and cashback accruals!",
          "bindBtn": "Link",
          "discordId": "Discord ID",
          "saveContacts": "Save Contacts"
        },
        "security": {
          "title": "Account Security",
          "changePass": "Change Password",
          "newPass": "New Password",
          "confirmPass": "Confirm New Password",
          "updateSecurity": "Update Security",
          "activeSessions": "Active Sessions",
          "logoutOther": "Logout from other devices",
          "current": "Current"
        },
        "orders": {
          "title": "My Order History",
          "empty": "It's empty here",
          "emptyDesc": "You haven't ordered anything yet.",
          "toCatalog": "To Catalog",
          "orderNum": "Order #",
          "items": "item(s)",
          "content": "Order Content:",
          "total": "Total Amount:",
          "profit": "Profit:",
          "status": {
            "new": "New",
            "processing": "Processing",
            "completed": "Completed",
            "cancelled": "Cancelled"
          }
        },
        "wishlist": {
          "title": "My Wishlist",
          "empty": "Your wishlist is empty",
          "emptyDesc": "Add items here that you plan to buy later so you don't lose them.",
          "toProducts": "Go to Products"
        },
        "payment": {
          "title": "Payment & Finance",
          "mainMethod": "Primary Payment Method",
          "methodDesc": "Choose your preferred payment method, which will be automatically selected during checkout.",
          "crypto": "Cryptocurrency (USDT)",
          "cryptoDesc": "Fastest and safest method",
          "card": "Credit Card",
          "cardDesc": "Visa / Mastercard",
          "wallet": "PayPal / Wise",
          "walletDesc": "E-Wallets"
        },
        "referrals": {
          "title": "Invite a Friend",
          "desc": "Get 5% of every purchase your friends make directly to your balance. The more friends, the more free resources!",
          "copy": "Copy"
        },
        "notifications": {
          "title": "Notification Center",
          "markRead": "Mark all as read",
          "empty": "You have no new notifications yet."
        },
        "login": {
          "title": "Account Login",
          "subtitle": "Get cashback from every purchase!",
          "username": "Username",
          "password": "Password",
          "remember": "Remember me",
          "forgot": "Forgot password?",
          "btn": "Login",
          "noAccount": "New here?",
          "toRegister": "Register"
        },
        "register": {
          "title": "Create Account",
          "username": "Username",
          "email": "Email",
          "password": "Password",
          "confirmPassword": "Confirm Password",
          "btn": "Create Account",
          "hasAccount": "Already have an account?",
          "toLogin": "Login"
        },
        "validation": {
          "passMismatch": "Passwords do not match",
          "passMatch": "Passwords match!",
          "minChars": "Minimum characters",
          "left": "left",
          "perfect": "Perfect!"
        }
      },
      "admin": {
        "title": "Admin Panel",
        "sidebar": {
          "dashboard": "Dashboard",
          "orders": "Orders",
          "users": "Users",
          "cashback": "Cashback",
          "accounts": "Accounts",
          "resources": "Resources & Gems",
          "other": "Other Items",
          "promo": "Promo Codes"
        },
        "dashboard": {
          "title": "Store Overview",
          "desc": "Key metrics of your business",
          "revenue": "Total Revenue",
          "profit": "Net Profit",
          "completedOrders": "Completed Orders",
          "totalUsers": "Total Clients",
          "promoActivations": "Promo Activations",
          "recentOrders": "Last 5 Orders",
          "viewAllOrders": "All Orders →",
          "noOrders": "No orders",
          "sum": "Sum:",
          "items": "item(s)"
        },
        "users": {
          "title": "Client Base",
          "desc": "Account control, referral stats and bans",
          "filterAll": "All",
          "filterActive": "Active",
          "filterBanned": "Banned",
          "searchPlaceholder": "Search by Nickname, IP or ID...",
          "thUser": "User",
          "thBalance": "Balance",
          "thIP": "IP Address",
          "thRef": "Referrals (Earnings)",
          "thActions": "Status / Actions",
          "notFound": "No clients found",
          "noData": "No data",
          "referredBy": "Referred by:",
          "bannedLabel": "Banned",
          "unbanBtn": "Unban",
          "banBtn": "Ban",
          "banModalTitle": "Block User",
          "banModalDesc1": "You are about to ban",
          "banModalDesc2": ". Login for this network will be closed.",
          "banReasonLabel": "Ban Reason",
          "banReasonPlaceholder": "E.g.: Payment fraud",
          "cancelBtn": "Cancel",
          "confirmBanBtn": "Confirm Ban"
        },
        "cashback": {
          "title": "Loyalty Program (Cashback)",
          "desc": "Encourage clients to buy more! For each order, authorized users will receive a percentage of the amount to their balance.",
          "baseRateTitle": "Base Cashback Rate",
          "baseRateLabel": "What % of the order amount to return to the client?",
          "example": "Example: If a client buys resources for $100, they will receive",
          "example2": "to their balance for future purchases.",
          "restrictionsTitle": "Category Restrictions",
          "restrictionsDesc": "Choose for which items cashback will NOT be credited:",
          "catAccount": "Accounts (Recommended to exclude)",
          "catRss": "Resources",
          "catGems": "Gems",
          "catSpecial": "Special Offers",
          "saveBtn": "Save Settings"
        },
        "orders": {
          "title": "Order Database",
          "desc": "Client purchases management",
          "filterAll": "All",
          "filterNew": "🔵 New",
          "filterProcessing": "🟡 Processing",
          "filterCompleted": "🟢 Completed",
          "filterCancelled": "🔴 Cancelled",
          "searchPlaceholder": "Search by ID, Nickname, Coordinates...",
          "notFound": "No orders found.",
          "orderContent": "Order Content:",
          "totalSum": "Total Amount:",
          "profit": "Profit:",
          "statusLabel": "Order Status",
          "nickname": "Nickname:",
          "guild": "Guild:",
          "coords": "Coordinates:",
          "details": "Details:",
          "statusNew": "🔵 New",
          "statusProcessing": "🟡 Processing",
          "statusCompleted": "🟢 Completed",
          "statusCancelled": "🔴 Cancelled"
        },
        "promo": {
          "title": "Promo Code Generator",
          "desc": "Create discounts or bonus gifts for clients.",
          "saveBtn": "Save Promo Code",
          "createTitle": "Create Promo Code",
          "genRandom": "Generate Random",
          "codeLabel": "Code",
          "typeLabel": "Bonus Type",
          "typePercent": "Percentage (%)",
          "typeFixed": "Fixed Amount ($)",
          "typeItem": "Gift (Item)",
          "valueLabel": "Value",
          "valuePlaceholderPercent": "E.g.: 10",
          "valuePlaceholderFixed": "E.g.: 50",
          "valuePlaceholderItem": "E.g.: 24h Shield",
          "limitLabel": "Usage Limit (0=∞)",
          "minSumLabel": "Min. Amount ($)",
          "expiryLabel": "Valid until (Date)",
          "targetLabel": "Which items does it apply to?",
          "targetAll": "All Items",
          "targetAcc": "Only Accounts",
          "targetOther": "Only Services",
          "targetSpecific": "Select Specific",
          "activeTitle": "Active Promo Codes",
          "noActive": "No active promo codes",
          "giftLabel": "Gift:",
          "usesLabel": "Uses:"
        },
        "accounts": {
          "title": "Account Management",
          "publishBtn": "Publish",
          "textInfoTitle": "Text Information",
          "nameLabel": "Account Name",
          "descLabel": "Short Description",
          "pricingTitle": "Features & Price",
          "costLabel": "Cost Price (USDT)",
          "markupLabel": "Markup",
          "finalPriceLabel": "Final Price:",
          "tagsLabel": "Account Tags (Comma separated)",
          "tagsPlaceholder": "E.g.: T5, Mythic, Trap, 1.2B",
          "bindLabel": "Binding",
          "bindPlaceholder": "E.g.: Steam + FB",
          "statsTitle": "Stats (For Comparison)",
          "mightLabel": "Might (E.g.: 1.5B)",
          "troopsLabel": "Troops (E.g.: 20M)",
          "mixAtkLabel": "Mix Attack (E.g.: 850%)",
          "heroesLabel": "P2P Heroes (E.g.: 5 Gold)",
          "artifactsLabel": "Artifacts (E.g.: 600 Stars)",
          "mainPhotoTitle": "Main Photo (Cover)",
          "addMainPhoto": "Add main photo",
          "additionalPhotosTitle": "Additional Photos (Screenshots)",
          "addAdditionalPhotos": "Add more photos",
          "dbTitle": "Account Database",
          "searchPlaceholder": "Search by name or ID...",
          "statusAll": "All statuses",
          "statusActive": "🟢 Active",
          "statusProcessing": "🟡 Processing",
          "statusSold": "🔴 Sold",
          "notFound": "No accounts found.",
          "soldLabel": "Sold",
          "editBtn": "Edit",
          "unavailableBtn": "Unavailable"
        },
        "resources": {
          "title": "Resources & Gems",
          "saveAllBtn": "Save All",
          "rssTitle": "Resources (RSS)",
          "addBtn": "Add",
          "packNameLabel": "Pack Name",
          "costLabel": "Cost",
          "priceLabel": "Price",
          "gemsTitle": "Gems (Rates)",
          "rangeLabel": "Might Range"
        },
        "other": {
          "title": "Other Items (Services, Packs)",
          "saveOrderBtn": "Save Order",
          "publishBtn": "Publish",
          "saveChangesBtn": "Save Changes",
          "createTitle": "Create Item",
          "editTitle": "Edit Item",
          "cancelBtn": "Cancel",
          "nameLabel": "Item Name",
          "namePlaceholder": "E.g.: Golden Dragon Pack",
          "descLabel": "Description (What's included)",
          "tagLabel": "Sticker (Tag)",
          "tagPlaceholder": "E.g.: Best Seller",
          "colorLabel": "Card Color",
          "colorBlue": "Blue (Standard)",
          "colorOrange": "Orange (Legendary)",
          "colorGreen": "Emerald (Epic)",
          "colorPurple": "Purple (Mythic)",
          "colorRed": "Red (Exclusive)",
          "pricingTitle": "Price & Commission",
          "costLabel": "Cost Price ($)",
          "markupLabel": "Markup",
          "finalPriceLabel": "Final price for client:",
          "receiveDataTitle": "Receiving Data",
          "receiveDataDesc": "Add fields the client must fill out when purchasing this item.",
          "fieldPlaceholder": "E.g.: Your IGG ID...",
          "addBtn": "Add",
          "itemsTitle": "Your Items",
          "noItems": "You haven't added any items yet"
        }
      },
      "common": {
        "loading": "Loading...",
        "error": "Error",
        "success": "Success",
        "confirm": "Confirm",
        "cancel": "Cancel",
        "save": "Save",
        "delete": "Delete",
        "edit": "Edit",
        "add": "Add",
        "search": "Search",
        "filter": "Filter",
        "sort": "Sort",
        "close": "Close",
        "back": "Back",
        "next": "Next",
        "previous": "Previous",
        "viewAll": "View All",
        "learnMore": "Learn More"
      },
      "footer": {
        "about": "About Us",
        "aboutDesc": "Your reliable partner in the Lords Mobile world. We provide safe account, resource, and sapphire sales services with quality guarantee.",
        "navTitle": "Navigation",
        "navHome": "Home",
        "navAccounts": "Account Gallery",
        "navResources": "Buy Resources",
        "navSpecial": "Special Offers",
        "clientTitle": "For Clients",
        "clientGuarantees": "Guarantees & FAQ",
        "clientTerms": "Terms of Service",
        "clientPrivacy": "Privacy Policy",
        "supportTitle": "Support",
        "tgSupport": "Telegram Support",
        "copyright": "© {{year}} LORDS SHOP. All rights reserved. Not an official IGG product."
      },
      "guarantees": {
        "title": "Guarantee Service",
        "subtitle": "Your security is our top priority. Learn how we protect buyers and sellers at every stage of the transaction.",
        "howItWorks": "How does a secure transaction work?",
        "steps": {
          "step1": {
            "title": "Payment and Reserve",
            "desc": "The buyer pays for the item. The money is held in the guarantor's account, the seller does not receive it yet."
          },
          "step2": {
            "title": "Account Verification",
            "desc": "The guarantor receives data from the seller, logs into the account and checks if everything matches the description."
          },
          "step3": {
            "title": "Re-binding",
            "desc": "The guarantor unbinds the seller's emails and social networks and binds the account to the buyer's data."
          },
          "step4": {
            "title": "Successful Transaction",
            "desc": "The buyer logs into the account and confirms receipt. Only after that the guarantor transfers money to the seller."
          }
        },
        "faqTitle": "Frequently Asked Questions (FAQ)",
        "faqs": [
          {
            "question": "How long does the account transfer process take?",
            "answer": "Usually the account transfer takes from 15 to 60 minutes after payment confirmation. In some cases (for example, if you need to unbind complex services) it may take up to 24 hours. We always keep you informed."
          },
          {
            "question": "What payment methods do you accept?",
            "answer": "We currently work with cryptocurrency (USDT TRC20/ERC20) for maximum security and speed, and also accept bank card transfers (Visa/Mastercard) by prior arrangement."
          },
          {
            "question": "What to do if the account does not match the description?",
            "answer": "Our guarantor personally checks the account before transfer. If we find discrepancies with the description on the site (less might, missing heroes), the deal is canceled and you get a full refund."
          },
          {
            "question": "Can I buy resources without giving my password?",
            "answer": "Yes! Sale of resources and sapphires (as gifts) happens without access to your account. You only need to provide your in-game nickname, coordinates or guild tag."
          }
        ]
      }
    }
  },

  de: {
    translation: {
      "nav": {
        "home": "STARTSEITE",
        "resources": "RESSOURCEN",
        "sapphires": "SAPHIRE",
        "gems": "EDELSTEINE",
        "accounts": "ACCOUNTS",
        "other": "SONSTIGES",
        "guarantees": "GARANTIEN",
        "calculator": "RECHNER",
        "topup": "AUFLADEN"
      },
      "header": {
        "search": "Suche...",
        "profile": "Profil",
        "cart": "Warenkorb",
        "login": "Anmelden",
        "logout": "Abmelden",
        "admin": "Admin",
        "balance": "Guthaben"
      },
      "orderModal": {
        "title": "Kasse: {{name}}",
        "nickname": "Benutzername",
        "guild": "Gilde",
        "rssWarning": "⚠️ Gilde muss offen sein!",
        "coordinates": "Schlosskoordinaten",
        "confirm": "Bestätigen"
      },
      "topup": {
        "title": "Guthaben aufladen",
        "subtitle1": "Kaufen Sie interne Website-Münzen. Verwenden Sie diese zur schnellen Bezahlung beliebiger Produkte.",
        "subtitle2": "1 USDT = 1 Münze",
        "selectAmount": "Aufladebetrag auswählen",
        "bestseller": "Bestseller",
        "price": "Preis:",
        "customAmount": {
          "title": "Anderer Betrag",
          "subtitle": "Geben Sie ein, wie viel Sie aufladen möchten"
        },
        "payment": {
          "title": "Zahlungsmethode auswählen",
          "crypto": {
            "name": "Kryptowährung (USDT / BTC)",
            "desc": "Ohne Provision, automatische Gutschrift"
          },
          "card": {
            "name": "Kreditkarte",
            "desc": "Visa / Mastercard (2% Provision)"
          }
        },
        "summary": {
          "title": "Zusammenfassung",
          "receive": "Sie erhalten Münzen:",
          "method": "Zahlungsmethode:",
          "total": "Zu zahlen:",
          "payBtn": "Bezahlen",
          "secure": "Sichere Zahlung • SSL-Verschlüsselung"
        },
        "errors": {
          "loginRequired": "Bitte loggen Sie sich ein, um Ihr Guthaben aufzuladen!",
          "minAmount": "Mindestaufladebetrag: $1",
          "serverError": "Serverfehler.",
          "networkError": "Keine Verbindung zum Server"
        },
        "cartItemName": "💳 Guthaben aufladen: {{amount}} USDT",
        "successMessage": "Anfrage erstellt! Bitte zahlen Sie ${{amount}} mit der ausgewählten Methode."
      },
      "resources_page": {
        "title": "Ressourcen & Edelsteine",
        "subtitle": "Wähle das benötigte Ressourcen- oder Edelsteinpaket für die schnelle Entwicklung deines Königreichs.",
        "rssTitle": "Ressourcenpakete",
        "gemsTitle": "Edelsteinraten",
        "mightLabel": "Macht:",
        "tooltipTitle": "Wie es funktioniert?",
        "tooltipDesc": "Wähle den Machtbereich deines Accounts. Danach gelangst du zum Konfigurator, wo du die genaue Menge der Edelsteine auswählen kannst.",
        "loading": "Aktuelle Preise werden geladen...",
        "noRss": "Keine Ressourcenpakete verfügbar.",
        "noGems": "Keine Edelsteinraten verfügbar.",
        "activeCode": "Code aktiv:",
        "addToWishlist": "Auf die Wunschliste",
        "removeFromWishlist": "Von der Wunschliste entfernen"
      },
      "builder": {
        "backToShop": "Zurück zum Shop",
        "settingsTitle": "Kauf-Einstellungen",
        "howManyGems": "Wie viel kaufen? (1 = 100k)",
        "totalGems": "Gems gesamt:",
        "ratePer100k": "Preis (pro 100k):",
        "totalToPay": "Zu zahlen:",
        "gameDataTitle": "Deine Spieldaten",
        "nicknamePlaceholder": "Spieler-Nickname (Eng)",
        "guildPlaceholder": "Gilde (optional)",
        "guildWarning": "Die Gilde muss offen sein! Sonst können wir die Bestellung nicht liefern.",
        "mightPlaceholder": "Genaue Macht (Z.B.: 1b 200m oder 500m)",
        "recognizedMight": "✅ Erkannt: {{might}}M. Preis angepasst!",
        "usedForGifts": "Für Geschenke verwendet:",
        "itemNameTitle": "Artikelname",
        "itemPriceTitle": "Preis (Gems)",
        "actionTitle": "Aktion",
        "addBtn": "+ Hinzufügen",
        "wishlistTitle": "Zusammengestelltes Geschenk",
        "addToCartBtn": "Bestellung in den Warenkorb",
        "selectItemsFirst": "Wähle Artikel zum Hinzufügen",
        "loadingBuilder": "Konfigurator wird geladen...",
        "errorNotEnoughGems": "Nicht genug Gems! Erhöhe die Paketanzahl auf der linken Seite.",
        "errorFillData": "Bitte fülle deine Spieldaten aus (Nickname und Genaue Macht)!",
        "successAdded": "Bestellung zum Warenkorb hinzugefügt!",
        "giftName": "Geschenke für {{amount}} Gems"
      },
      "special_page": {
        "title": "Sonderangebote",
        "subtitle": "Exklusive Pakete, Dienstleistungen und Saphire. Wähle einen Artikel, und wir liefern ihn auf dein Konto.",
        "loading": "Artikel werden geladen...",
        "noItems": "Derzeit keine Artikel verfügbar.",
        "activeCode": "Code aktiv:",
        "addToWishlist": "Auf die Wunschliste",
        "removeFromWishlist": "Von der Wunschliste entfernen",
        "buy": "Kaufen",
        "modalTitle": "Kasse",
        "enterPrefix": "Eingeben",
        "modalInfo": "Stelle sicher, dass die Daten korrekt sind. Der Artikel wird dem Warenkorb hinzugefügt.",
        "addToCartBtn": "In den Warenkorb",
        "addedSuccess": "zum Warenkorb hinzugefügt!"
      },
      "home": {
        "hero": {
          "title": "Dein Arsenal in",
          "subtitle": "Kaufe Ressourcen, Edelsteine und Top-Accounts zu den besten Preisen. Schnelle Lieferung, garantierte Sicherheit und 24/7-Support.",
          "btnResources": "Ressourcen kaufen",
          "btnAccounts": "Accounts ansehen"
        },
        "trust": {
          "title1": "Sofortige Lieferung",
          "desc1": "Wir versenden Ressourcen sofort nach Zahlungsbestätigung.",
          "title2": "100% Sicherheit",
          "desc2": "Saubere Ressourcen und Accounts ohne Risiko eines IGG-Banns.",
          "title3": "24/7 Support",
          "desc3": "Immer über Telegram erreichbar, um alle Fragen zu klären."
        }
      },
      "accounts": {
        "title": "Account-Galerie",
        "subtitle": "Top Lords Mobile Accounts mit verifizierten Stats",
        "filter": {
          "all": "Alle",
          "active": "Zum Verkauf",
          "sold": "Verkauft",
          "processing": "In Bearbeitung"
        },
        "sortBy": "Sortieren nach:",
        "priceAsc": "Preis: Aufsteigend",
        "priceDesc": "Preis: Absteigend",
        "noAccounts": "Keine Accounts gefunden",
        "details": "Ansehen",
        "unavailable": "Nicht verfügbar",
        "addToCart": "In den Warenkorb",
        "inCart": "Im Warenkorb",
        "bind": "Bindung",
        "activeCode": "Code aktiv:",
        "addToCompare": "Zum Vergleich hinzufügen",
        "addToWishlist": "Auf die Wunschliste",
        "removeFromWishlist": "Von der Wunschliste entfernen",
        "status": {
          "active": "Aktiv",
          "sold": "Verkauft",
          "processing": "In Bearbeitung"
        }
      },
      "accountDetails": {
        "backToGallery": "Zurück zur Galerie",
        "price": "Preis",
        "bind": "Bindung",
        "status": "Status",
        "description": "Beschreibung",
        "stats": "Statistiken",
        "might": "Macht",
        "troops": "Truppen",
        "heroes": "Helden",
        "artifacts": "Artefakte",
        "images": "Bilder",
        "addToCart": "In den Warenkorb",
        "inCart": "Im Warenkorb",
        "buyNow": "Jetzt kaufen"
      },
      "resources": {
        "title": "Ressourcen-Shop",
        "subtitle": "Schnelle RSS-Lieferung zu günstigen Preisen",
        "packTitle": "Ressourcen-Pakete",
        "name": "Name",
        "description": "Beschreibung",
        "price": "Preis",
        "basePrice": "Basispreis",
        "addToCart": "Hinzufügen",
        "inCart": "Im Warenkorb"
      },
      "gems": {
        "title": "Edelsteine (Gems)",
        "subtitle": "Tolle Raten für Lords Mobile Gems",
        "range": "Bereich",
        "rate": "Rate",
        "basePrice": "Basispreis",
        "calculate": "Berechnen",
        "mightLabel": "Account-Macht",
        "amountLabel": "Gem-Menge",
        "totalPrice": "Gesamtpreis"
      },
      "calculator": {
        "title": "Lords Mobile Rechner",
        "subtitle": "Berechne Trainingszeit, Ressourcen und Beschleuniger",
        "tabs": {
          "train": "T1-T4 Training",
          "t5": "T5 Training",
          "speedups": "Beschleuniger",
          "convert": "Konverter"
        },
        "train": {
          "amount": "Truppenanzahl",
          "speed": "Trainingsgeschwindigkeit (%)",
          "tier": "Truppen-Tier",
          "time": "Trainingszeit",
          "resources": "Benötigte Ressourcen",
          "speedupsNeeded": "Benötigte Beschleuniger"
        },
        "t5": {
          "hasLunite": "Hat Luniten-Stein",
          "speed": "Werkstatt-Geschwindigkeit (%)"
        },
        "speedups": {
          "title": "Beschleuniger in der Tasche",
          "total": "Gesamtzeit",
          "clear": "Löschen"
        },
        "results": {
          "time": "Zeit",
          "food": "Nahrung",
          "wood": "Holz",
          "stone": "Stein",
          "ore": "Erz",
          "gold": "Gold"
        }
      },
      "cart": {
        "title": "Kasse",
        "empty": "Ihr Warenkorb ist leer",
        "emptyDesc": "Aber Sie können Ihren Promo-Code immer noch rechts überprüfen 👉",
        "backToCatalog": "Zurück zum Katalog",
        "discountActive": "Rabatt aktiv",
        "nickname": "Nickname:",
        "withDiscount": "Mit Rabatt!",
        "remove": "Entfernen",
        "paymentTitle": "Zahlung",
        "accountWarning": "Die Zahlung für Accounts wird",
        "accountWarningBold": "ausschließlich in Kryptowährung (USDT)",
        "balanceMethod": "Münzguthaben",
        "balanceAvailable": "Verfügbar: {{amount}} Münzen",
        "cryptoMethod": "Kryptowährung (USDT)",
        "cardMethod": "Kreditkarte",
        "cardFee": "Visa / Mastercard (2% Provision)",
        "promoTitle": "Haben Sie einen Promo-Code?",
        "promoPlaceholder": "Code eingeben",
        "applyBtn": "Anwenden",
        "summary": "Zwischensumme:",
        "savings": "Ersparnis:",
        "total": "Gesamt:",
        "coins": "Münzen",
        "cashback": "Cashback",
        "cashbackAuth": "Autorisierung erforderlich",
        "cashbackAvail": "Sie verdienen",
        "payBalanceBtn": "Mit Guthaben bezahlen",
        "orderBtn": "Jetzt bestellen",
        "promoUsed": "Sie haben diesen Promo-Code bereits verwendet!",
        "promoSuccess": "Promo-Code erfolgreich angewendet!",
        "promoInvalid": "Promo-Code ist ungültig oder gilt nicht für diese Artikel",
        "balanceLoginReq": "Sie müssen sich einloggen, um mit Ihrem Guthaben zu bezahlen!",
        "balanceInsuff": "Unzureichende Münzen auf Ihrem Guthaben!",
        "sending": "Bestellung wird gesendet...",
        "successBalance": "Erfolg! {{amount}} Münzen von Ihrem Guthaben abgezogen.",
        "successCrypto": "Bestellung angenommen! Zahlungsmethode: {{method}}",
        "checkoutErr": "Kassenfehler",
        "discountPercent": "{{value}}% Rabatt",
        "discountFixed": "${{value}} Rabatt",
        "gift": "Geschenk: {{value}}",
        "appliesTo": "Gilt für: {{items}}",
        "appliesToEmpty": "Gilt für bestimmte Artikel (zum Warenkorb hinzufügen)",
        "appliesToAll": "Gilt für die gesamte Bestellung",
        "removePromo": "Promo-Code entfernen"
      },
      "profile": {
        "title": "Mein Konto",
        "welcome": "Willkommen",
        "balance": "Münzguthaben",
        "player": "Spieler",
        "buyCoins": "Münzen kaufen",
        "tabs": {
          "settings": "Persönliche Daten",
          "security": "Sicherheit",
          "orders": "Meine Bestellungen",
          "wishlist": "Wunschliste",
          "payment": "Zahlung",
          "referrals": "Empfehlungen",
          "notifications": "Benachrichtigungen",
          "logout": "Abmelden"
        },
        "settings": {
          "title": "Persönliche Daten",
          "basicInfo": "Grundinformationen",
          "publicName": "Öffentlicher Name",
          "minChars": "Mindestens 5 Zeichen",
          "contacts": "Kontaktinformationen",
          "tgBindTitle": "Telegram verknüpfen",
          "tgBindDesc": "Verknüpfe deinen Telegram-Bot, um sofort Benachrichtigungen über den Status deiner Bestellungen und Cashback zu erhalten!",
          "bindBtn": "Verknüpfen",
          "discordId": "Discord ID",
          "saveContacts": "Kontakte speichern"
        },
        "security": {
          "title": "Kontosicherheit",
          "changePass": "Passwort ändern",
          "newPass": "Neues Passwort",
          "confirmPass": "Neues Passwort bestätigen",
          "updateSecurity": "Sicherheit aktualisieren",
          "activeSessions": "Aktive Sitzungen",
          "logoutOther": "Von anderen Geräten abmelden",
          "current": "Aktuell"
        },
        "orders": {
          "title": "Mein Bestellverlauf",
          "empty": "Hier ist es leer",
          "emptyDesc": "Sie haben noch nichts bestellt.",
          "toCatalog": "Zum Katalog",
          "orderNum": "Bestellung #",
          "items": "Artikel",
          "content": "Bestellinhalt:",
          "total": "Gesamtsumme:",
          "profit": "Gewinn:",
          "status": {
            "new": "Neu",
            "processing": "In Bearbeitung",
            "completed": "Abgeschlossen",
            "cancelled": "Storniert"
          }
        },
        "wishlist": {
          "title": "Meine Wunschliste",
          "empty": "Ihre Wunschliste ist leer",
          "emptyDesc": "Fügen Sie hier Artikel hinzu, die Sie später kaufen möchten.",
          "toProducts": "Zu den Produkten"
        },
        "payment": {
          "title": "Zahlung & Finanzen",
          "mainMethod": "Hauptzahlungsmethode",
          "methodDesc": "Wählen Sie Ihre bevorzugte Zahlungsmethode, die beim Checkout automatisch ausgewählt wird.",
          "crypto": "Kryptowährung (USDT)",
          "cryptoDesc": "Schnellste und sicherste Methode",
          "card": "Kreditkarte",
          "cardDesc": "Visa / Mastercard",
          "wallet": "PayPal / Wise",
          "walletDesc": "E-Wallets"
        },
        "referrals": {
          "title": "Freund einladen",
          "desc": "Erhalte 5% von jedem Einkauf deiner Freunde direkt auf dein Guthaben. Je mehr Freunde, desto mehr kostenlose Ressourcen!",
          "copy": "Kopieren"
        },
        "notifications": {
          "title": "Benachrichtigungscenter",
          "markRead": "Alle als gelesen markieren",
          "empty": "Sie haben noch keine neuen Benachrichtigungen."
        },
        "login": {
          "title": "Anmelden",
          "subtitle": "Erhalte Cashback für jeden Einkauf!",
          "username": "Benutzername",
          "password": "Passwort",
          "remember": "Angemeldet bleiben",
          "forgot": "Passwort vergessen?",
          "btn": "Anmelden",
          "noAccount": "Neu hier?",
          "toRegister": "Registrieren"
        },
        "register": {
          "title": "Konto erstellen",
          "username": "Benutzername",
          "email": "E-Mail",
          "password": "Passwort",
          "confirmPassword": "Passwort bestätigen",
          "btn": "Konto erstellen",
          "hasAccount": "Bereits ein Konto?",
          "toLogin": "Anmelden"
        },
        "validation": {
          "passMismatch": "Passwörter stimmen nicht überein",
          "passMatch": "Passwörter stimmen überein!",
          "minChars": "Mindestzeichen",
          "left": "verbleibend",
          "perfect": "Perfekt!"
        }
      },
      "admin": {
        "title": "Admin-Panel",
        "sidebar": {
          "dashboard": "Dashboard",
          "orders": "Bestellungen",
          "users": "Benutzer",
          "cashback": "Cashback",
          "accounts": "Accounts",
          "resources": "Ressourcen",
          "gems": "Edelsteine",
          "other": "Sonstige Artikel",
          "promo": "Promo-Codes"
        },
        "dashboard": {
          "title": "Shop-Übersicht",
          "desc": "Wichtige Kennzahlen Ihres Unternehmens",
          "revenue": "Umsatz",
          "profit": "Gewinn",
          "completedOrders": "Abgeschlossene Bestellungen",
          "totalUsers": "Gesamte Kunden",
          "promoActivations": "Promo-Aktivierungen",
          "recentOrders": "Letzte 5 Bestellungen",
          "viewAllOrders": "Alle Bestellungen →",
          "noOrders": "Keine Bestellungen",
          "sum": "Summe:",
          "items": "Artikel"
        },
        "users": {
          "title": "Kundenstamm",
          "desc": "Account-Kontrolle, Empfehlungsstatistiken und Bans",
          "filterAll": "Alle",
          "filterActive": "Aktiv",
          "filterBanned": "Gesperrt",
          "searchPlaceholder": "Suche nach Nick, IP oder ID...",
          "thUser": "Benutzer",
          "thBalance": "Guthaben",
          "thIP": "IP-Adresse",
          "thRef": "Empfehlungen (Einnahmen)",
          "thActions": "Status / Aktionen",
          "notFound": "Keine Kunden gefunden",
          "noData": "Keine Daten",
          "referredBy": "Geworben von:",
          "bannedLabel": "Gesperrt",
          "unbanBtn": "Entsperren",
          "banBtn": "Sperren",
          "banModalTitle": "Benutzer sperren",
          "banModalDesc1": "Sie sind dabei zu sperren",
          "banModalDesc2": ". Die Anmeldung für dieses Netzwerk wird geschlossen.",
          "banReasonLabel": "Sperrgrund",
          "banReasonPlaceholder": "Z.B.: Zahlungsbetrug",
          "cancelBtn": "Abbrechen",
          "confirmBanBtn": "Sperre bestätigen"
        },
        "cashback": {
          "title": "Treueprogramm (Cashback)",
          "desc": "Ermutigen Sie Kunden, öfter zu kaufen! Für jede Bestellung erhalten autorisierte Benutzer einen Prozentsatz des Betrags auf ihr Guthaben.",
          "baseRateTitle": "Basis-Cashback-Rate",
          "baseRateLabel": "Wie viel % des Bestellwerts sollen an den Kunden zurückgegeben werden?",
          "example": "Beispiel: Wenn ein Kunde Ressourcen für 100 $ kauft, erhält er",
          "example2": "auf sein Guthaben für zukünftige Einkäufe.",
          "restrictionsTitle": "Kategorie-Beschränkungen",
          "restrictionsDesc": "Wählen Sie, für welche Artikel KEIN Cashback gutgeschrieben wird:",
          "catAccount": "Accounts (Ausschluss empfohlen)",
          "catRss": "Ressourcen",
          "catGems": "Edelsteine",
          "catSpecial": "Sonderangebote",
          "saveBtn": "Einstellungen speichern"
        },
        "orders": {
          "title": "Bestelldatenbank",
          "desc": "Kundenkäufe verwalten",
          "filterAll": "Alle",
          "filterNew": "🔵 Neu",
          "filterProcessing": "🟡 In Bearbeitung",
          "filterCompleted": "🟢 Abgeschlossen",
          "filterCancelled": "🔴 Storniert",
          "searchPlaceholder": "Suche nach ID, Nickname, Koordinaten...",
          "notFound": "Keine Bestellungen gefunden.",
          "orderContent": "Bestellinhalt:",
          "totalSum": "Gesamtsumme:",
          "profit": "Gewinn:",
          "statusLabel": "Bestellstatus",
          "nickname": "Nickname:",
          "guild": "Gilde:",
          "coords": "Koordinaten:",
          "details": "Details:",
          "statusNew": "🔵 Neu",
          "statusProcessing": "🟡 In Bearbeitung",
          "statusCompleted": "🟢 Abgeschlossen",
          "statusCancelled": "🔴 Storniert"
        },
        "promo": {
          "title": "Promo-Code-Generator",
          "desc": "Erstellen Sie Rabatte oder Bonusgeschenke für Kunden.",
          "saveBtn": "Promo-Code speichern",
          "createTitle": "Promo-Code erstellen",
          "genRandom": "Zufällig generieren",
          "codeLabel": "Code",
          "typeLabel": "Bonusart",
          "typePercent": "Prozentsatz (%)",
          "typeFixed": "Fester Betrag ($)",
          "typeItem": "Geschenk (Item)",
          "valueLabel": "Wert",
          "valuePlaceholderPercent": "Z.B.: 10",
          "valuePlaceholderFixed": "Z.B.: 50",
          "valuePlaceholderItem": "Z.B.: 24h Schild",
          "limitLabel": "Nutzungslimit (0=∞)",
          "minSumLabel": "Min. Betrag ($)",
          "expiryLabel": "Gültig bis (Datum)",
          "targetLabel": "Für welche Artikel gilt er?",
          "targetAll": "Alle Artikel",
          "targetAcc": "Nur Accounts",
          "targetOther": "Nur Dienstleistungen",
          "targetSpecific": "Spezifisch auswählen",
          "activeTitle": "Aktive Promo-Codes",
          "noActive": "Keine aktiven Promo-Codes",
          "giftLabel": "Geschenk:",
          "usesLabel": "Nutzungen:"
        },
        "accounts": {
          "title": "Account-Verwaltung",
          "publishBtn": "Veröffentlichen",
          "textInfoTitle": "Textinformationen",
          "nameLabel": "Accountname",
          "descLabel": "Kurzbeschreibung",
          "pricingTitle": "Eigenschaften & Preis",
          "costLabel": "Selbstkosten (USDT)",
          "markupLabel": "Aufschlag",
          "finalPriceLabel": "Endpreis:",
          "tagsLabel": "Account-Tags (Kommagetrennt)",
          "tagsPlaceholder": "Z.B.: T5, Mythic, Falle, 1.2B",
          "bindLabel": "Bindung",
          "bindPlaceholder": "Z.B.: Steam + FB",
          "statsTitle": "Stats (Für Vergleich)",
          "mightLabel": "Macht (Z.B.: 1.5B)",
          "troopsLabel": "Truppen (Z.B.: 20M)",
          "mixAtkLabel": "Mix Angriff (Z.B.: 850%)",
          "heroesLabel": "P2P Helden (Z.B.: 5 Gold)",
          "artifactsLabel": "Artefakte (Z.B.: 600 Sterne)",
          "mainPhotoTitle": "Hauptfoto (Cover)",
          "addMainPhoto": "Hauptfoto hinzufügen",
          "additionalPhotosTitle": "Zusätzliche Fotos (Screenshots)",
          "addAdditionalPhotos": "Weitere Fotos hinzufügen",
          "dbTitle": "Account-Datenbank",
          "searchPlaceholder": "Suche nach Name oder ID...",
          "statusAll": "Alle Status",
          "statusActive": "🟢 Aktiv",
          "statusProcessing": "🟡 In Bearbeitung",
          "statusSold": "🔴 Verkauft",
          "notFound": "Keine Accounts gefunden.",
          "soldLabel": "Verkauft",
          "editBtn": "Bearb.",
          "unavailableBtn": "Nicht verfügbar"
        },
        "resources": {
          "title": "Ressourcen & Edelsteine",
          "saveAllBtn": "Alles speichern",
          "rssTitle": "Ressourcen (RSS)",
          "addBtn": "Hinzufügen",
          "packNameLabel": "Paketname",
          "costLabel": "Kosten",
          "priceLabel": "Preis",
          "gemsTitle": "Edelsteine (Raten)",
          "rangeLabel": "Machtbereich"
        },
        "other": {
          "title": "Andere Artikel (Dienste, Pakete)",
          "saveOrderBtn": "Reihenfolge speichern",
          "publishBtn": "Veröffentlichen",
          "saveChangesBtn": "Änderungen speichern",
          "createTitle": "Artikel erstellen",
          "editTitle": "Artikel bearbeiten",
          "cancelBtn": "Abbrechen",
          "nameLabel": "Artikelname",
          "namePlaceholder": "Z.B.: Goldenes Drachen-Paket",
          "descLabel": "Beschreibung (Was ist enthalten)",
          "tagLabel": "Sticker (Tag)",
          "tagPlaceholder": "Z.B.: Bestseller",
          "colorLabel": "Kartenfarbe",
          "colorBlue": "Blau (Standard)",
          "colorOrange": "Orange (Legendär)",
          "colorGreen": "Smaragd (Episch)",
          "colorPurple": "Lila (Mythisch)",
          "colorRed": "Rot (Exklusiv)",
          "pricingTitle": "Preis & Provision",
          "costLabel": "Selbstkosten ($)",
          "markupLabel": "Aufschlag",
          "finalPriceLabel": "Endpreis für den Kunden:",
          "receiveDataTitle": "Daten empfangen",
          "receiveDataDesc": "Fügen Sie Felder hinzu, die der Kunde beim Kauf ausfüllen muss.",
          "fieldPlaceholder": "Z.B.: Deine IGG ID...",
          "addBtn": "Hinzufügen",
          "itemsTitle": "Deine Artikel",
          "noItems": "Du hast noch keine Artikel hinzugefügt"
        }
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "ua",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;