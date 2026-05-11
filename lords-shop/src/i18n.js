import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  ua: {
    translation: {
      "nav": {
        "home": "ГОЛОВНА",
        "resources": "КУПИТИ РЕСУРСИ",
        "sapphires": "КУПИТИ САПФІРИ",
        "accounts": "ГАЛЕРЕЯ АКАУНТІВ"
      },
      "header": {
        "search": "Пошук...",
        "profile": "Профіль",
        "cart": "Кошик"
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
        },
        "offer": {
          "badge": "Хіт продажу",
          "title": "Набір \"Мільярдер\"",
          "desc": "1B Їжі + 1B Дерева + 500M Каменю. Ідеально для тренування Т4/Т5!",
          "buy": "Придбати"
        }
      },
      "resources_page": {
        "title": "Магазин Ресурсів",
        "subtitle": "Швидка доставка RSS та вигідний курс на самоцвіти. Оплата в USDT або UAH за актуальним курсом.",
        "rssTitle": "Пакети Ресурсів (RSS)",
        "gemsTitle": "Самоцвіти (Gems)",
        "tooltipTitle": "Як рахується курс?",
        "tooltipDesc": "Курс залежить від сили (Might) цільового акаунту. Вказана ціна в USDT за стандартний об'єм.",
        "mightLabel": "Might (Сила)",
        "rateLabel": "Рейт (USDT)"
      },
      "order": {
        "title": "Оформлення замовлення",
        "nickname": "Нікнейм гравця",
        "guild": "Гільдія",
        "coordinates": "Координати (K:0 X:0 Y:0)",
        "might": "Точна міць (Might)",
        "gemsAmount": "Кількість сапфірів (мін. 100к, крок 100к)",
        "gemsItem": "Який товар купити? (Наприклад: 3x Щит 24г)",
        "rssWarning": "УВАГА: Гільдія повинна бути відкритою!",
        "confirm": "Підтвердити замовлення",
        "cancel": "Скасувати",
        "errorStep": "Кількість має бути кратною 100,000"
      }
    }
  },
  en: {
    translation: {
      "nav": {
        "home": "HOME",
        "resources": "BUY RESOURCES",
        "sapphires": "BUY SAPPHIRES",
        "accounts": "ACCOUNT GALLERY"
      },
      "header": {
        "search": "Search...",
        "profile": "Profile",
        "cart": "Cart"
      },
      "home": {
        "hero": {
          "title": "Your arsenal in",
          "subtitle": "Buy resources, sapphires, and top accounts at the best prices. Fast delivery, 100% security, and 24/7 support.",
          "btnResources": "Buy Resources",
          "btnAccounts": "View Accounts"
        },
        "trust": {
          "title1": "Instant Delivery",
          "desc1": "We send resources immediately after payment confirmation.",
          "title2": "100% Security",
          "desc2": "Clean resources and accounts with no risk of an IGG ban.",
          "title3": "24/7 Support",
          "desc3": "Always in touch on Telegram to resolve any issues."
        },
        "offer": {
          "badge": "Bestseller",
          "title": "\"Billionaire\" Pack",
          "desc": "1B Food + 1B Wood + 500M Stone. Ideal for training T4/T5!",
          "buy": "Purchase"
        }
      },
      "resources_page": {
        "title": "Resource Shop",
        "subtitle": "Fast RSS delivery and great rates on gems. Payment in USDT or UAH at current exchange rates.",
        "rssTitle": "Resource Packs (RSS)",
        "gemsTitle": "Gems",
        "tooltipTitle": "How is the rate calculated?",
        "tooltipDesc": "The rate depends on the Might of the target account. The price is in USDT for standard volume.",
        "mightLabel": "Might",
        "rateLabel": "Rate (USDT)"
      },
      "order": {
        "title": "Checkout",
        "nickname": "Player Nickname",
        "guild": "Guild Tag",
        "coordinates": "Coordinates (K:0 X:0 Y:0)",
        "might": "Exact Might",
        "gemsAmount": "Amount of Gems (min. 100k, 100k step)",
        "gemsItem": "What to buy? (e.g., 3x 24h Shield)",
        "rssWarning": "WARNING: Guild must be set to Open!",
        "confirm": "Confirm Order",
        "cancel": "Cancel",
        "errorStep": "Amount must be a multiple of 100,000"
      }
    }
  },
  de: {
    translation: {
      "nav": {
        "home": "STARTSEITE",
        "resources": "RESSOURCEN KAUFEN",
        "sapphires": "SAPHIR KAUFEN",
        "accounts": "ACCOUNT-GALERIE"
      },
      "header": {
        "search": "Suche...",
        "profile": "Profil",
        "cart": "Warenkorb"
      },
      "home": {
        "hero": {
          "title": "Dein Arsenal in",
          "subtitle": "Kaufe Ressourcen, Saphire und Top-Accounts zu den besten Preisen. Schnelle Lieferung, garantierte Sicherheit und 24/7-Support.",
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
        },
        "offer": {
          "badge": "Bestseller",
          "title": "\"Milliardär\"-Paket",
          "desc": "1B Nahrung + 1B Holz + 500M Stein. Ideal für das Training von T4/T5!",
          "buy": "Kaufen"
        }
      },
      "resources_page": {
        "title": "Ressourcen-Shop",
        "subtitle": "Schnelle RSS-Lieferung und super Gem-Raten. Zahlung in USDT oder UAH zum aktuellen Kurs.",
        "rssTitle": "Ressourcen-Pakete (RSS)",
        "gemsTitle": "Saphire (Gems)",
        "tooltipTitle": "Wie wird die Rate berechnet?",
        "tooltipDesc": "Die Rate hängt von der Macht (Might) des Ziel-Accounts ab. Preis in USDT für Standardmengen.",
        "mightLabel": "Macht (Might)",
        "rateLabel": "Rate (USDT)"
      },
      "order": {
        "title": "Bestellung aufgeben",
        "nickname": "Spieler-Nickname",
        "guild": "Gilde",
        "coordinates": "Koordinaten (K:0 X:0 Y:0)",
        "might": "Genaue Macht (Might)",
        "gemsAmount": "Anzahl Saphire (min. 100k, in 100k-Schritten)",
        "gemsItem": "Was für Saphire kaufen? (z.B. 3x 24h Schild)",
        "rssWarning": "ACHTUNG: Die Gilde muss offen sein!",
        "confirm": "Bestellung bestätigen",
        "cancel": "Abbrechen",
        "errorStep": "Die Menge muss ein Vielfaches von 100.000 sein"
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "ua", // Змінено на ua за замовчуванням
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;