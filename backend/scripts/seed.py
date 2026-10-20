"""
Lords Shop - Скрипт наповнення бази даних (Seed Script)
Повністю наповнює магазин реальними даними:
- 5 детальних топових акаунтів (зі статистикою White, Mix, Blast, артефактами, маною)
- Пакети ресурсів (RSS)
- Тарифи на сапфіри (Gems)
- Розширений асортимент інших товарів (Gold Pass, щити, міграції, прискорення тощо)
- Промокоди для тестування
"""

import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import json
import shutil
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
import models

print("🚀 Запуск seed.py для наповнення бази даних Lords Shop...")

# Переконуємось, що таблиці існують
Base.metadata.create_all(bind=engine)

db: Session = SessionLocal()

STATIC_UPLOADS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "uploads")
os.makedirs(STATIC_UPLOADS, exist_ok=True)

try:
    # ==========================================
    # 1. АКАУНТИ (5 ДЕТАЛЬНИХ ТОП-АКАУНТІВ)
    # ==========================================
    print("\n🎮 Створення/Оновлення акаунтів...")

    accounts_data = [
        # --- АКАУНТ 1 ---
        {
            "title": "✈️ Can go K1451 | Low Might Lead 2600+MM (1439-1389-1464%)",
            "shortDesc": (
                "✈️ Can go K1451\n"
                "Low might lead | 2600+MM\n"
                "Stats: 1439-1389-1464% Blasts\n"
                "Base (White): 530/534/547%\n"
                "Mix Stats: 1044-817-1019%\n"
                "Army ATK: +396.1% | Army HP: +793.98%\n"
                "8 max fams, good bags\n"
                "187 castle stars ⭐️ 76 Blessed ⭐️\n"
                "Single IGG / Clean bind"
            ),
            "price": "1250.00",
            "base_price": "1400.00",
            "tags": "K1451, Low Might, 2600+MM, 1400%+, 8 Fams, Champ",
            "bind": "Clean Single IGG",
            "images": json.dumps(["/static/uploads/acc_k1451.jpg"]),
            "status": "active",
            "stats": json.dumps({
                "might": "2600+MM",
                "max_kd": "1451",
                "is_low_might": True,
                "white_stats": "530-534-547",
                "mix_stats": "1044-817-1019",
                "blast_stats": "1439-1389-1464",
                "army_atk": "396.1",
                "army_hp": "793.98",
                "mana_troops_lvl": 4,
                "castle_skins_lvl": 187,
                "artifact_lvl": 1250,
                "champ_pieces": 8,
                "castle": "187⭐️",
                "blessed": "76 Blessed",
                "heroes": "8 Max Fams",
                "familiars": "8 Max Fams",
                "artifacts": "76 Blessed",
                "attribute_lvl": "55",
                "mix_atk": {"leader": "1044-817-1019", "base": "530-534-547"},
                "mono_atk": {"leader": "1439-1389-1464", "base": "530-534-547"},
                "army_mix_atk": {"leader": "396.1%", "base": "284.4%"},
                "army_mix_def": {"leader": "317.95%", "base": "235.7%"},
                "army_mix_hp": {"leader": "793.98%", "base": "312.4%"},
                "custom_inventory": [
                    {"label": "Castle Stars", "value": "187⭐️"},
                    {"label": "Blessed Artifacts", "value": "76"},
                    {"label": "Max Fams", "value": "8"},
                    {"label": "Migration", "value": "Can go K1451✈️"}
                ]
            })
        },

        # --- АКАУНТ 2 ---
        {
            "title": "✈️ Can go K1862 | 1 Emperor + Low Might Lead 30K+MM (1901-1911-1903%)",
            "shortDesc": (
                "✈️ Can go K1862\n"
                "1 Emperor + Low might lead\n"
                "Max stats: 1901-1911-1903% Blasts\n"
                "Base (White): 824/834/816%\n"
                "1048~179 blessed~1835lvls artifacts\n"
                "10 army ATK jewels + 3 barons\n"
                "10.5M lunite, 11k Castle Scrolls\n"
                "300k royal coins, good bag\n"
                "6781 tokens, doing 6lvl mana troops\n"
                "Might: 30k+MM (25k+MM Core)"
            ),
            "price": "4800.00",
            "base_price": "5500.00",
            "tags": "K1862, Emperor, 30k+MM, 1900%+, 10 Army Atk, Barons, Mana T6",
            "bind": "Gmail + FB",
            "images": json.dumps(["/static/uploads/acc_k1862.jpg"]),
            "status": "active",
            "stats": json.dumps({
                "might": "30k+MM",
                "max_kd": "1862",
                "is_low_might": True,
                "white_stats": "824-834-816",
                "mix_stats": "1394-1285-1185",
                "blast_stats": "1901-1911-1903",
                "army_atk": "580.0",
                "army_hp": "1080.0",
                "mana_troops_lvl": 6,
                "castle_skins_lvl": 280,
                "artifact_lvl": 1835,
                "champ_pieces": 11,
                "castle": "280⭐️",
                "blessed": "179 Blessed",
                "heroes": "1 Emperor + Champ",
                "familiars": "Max Fams",
                "artifacts": "1835 Lvls / 179 Blessed",
                "attribute_lvl": "85",
                "mix_atk": {"leader": "1394-1285-1185", "base": "824-834-816"},
                "mono_atk": {"leader": "1901-1911-1903", "base": "824-834-816"},
                "army_mix_atk": {"leader": "580.0%", "base": "395.0%"},
                "army_mix_hp": {"leader": "1080.0%", "base": "550.0%"},
                "custom_inventory": [
                    {"label": "Title", "value": "1 Emperor + 3 Barons"},
                    {"label": "Army Jewels", "value": "10 Gold Army ATK"},
                    {"label": "Lunite", "value": "10.5M Lunite"},
                    {"label": "Castle Scrolls", "value": "11k Scrolls"},
                    {"label": "Royal Coins", "value": "300k Coins"},
                    {"label": "Mana Troops", "value": "Level 6"}
                ]
            })
        },

        # --- АКАУНТ 3 ---
        {
            "title": "✈️ Can go K1639 | Low Quest Might 7700+MM (1675-1606-1620%)",
            "shortDesc": (
                "✈️ Can go K1639\n"
                "Low quest might | 7700+MM\n"
                "Stats: 1675-1606-1620% Blasts\n"
                "Base (White): 709/681/680%\n"
                "Mix Stats: 1203-1018-1159%\n"
                "Army ATK: +580.4% | Army Max HP: +1015.02%\n"
                "5lvl mana castle, 2lvl mana troops\n"
                "2 leader skins (Shrek + Fox), 3 route skins\n"
                "Great bag & jewels"
            ),
            "price": "2400.00",
            "base_price": "2750.00",
            "tags": "K1639, 7700+MM, 1600%+, Mana Castle 5, Shrek Skin, Champ",
            "bind": "Gmail",
            "images": json.dumps(["/static/uploads/acc_k1639.jpg"]),
            "status": "active",
            "stats": json.dumps({
                "might": "7700+MM",
                "max_kd": "1639",
                "is_low_might": True,
                "white_stats": "709-681-680",
                "mix_stats": "1203-1018-1159",
                "blast_stats": "1675-1606-1620",
                "army_atk": "580.4",
                "army_hp": "1015.02",
                "mana_troops_lvl": 2,
                "castle_skins_lvl": 210,
                "artifact_lvl": 1450,
                "champ_pieces": 9,
                "castle": "Lv.5 Mana Castle",
                "blessed": "115 Blessed",
                "heroes": "2 Leader Skins (Shrek)",
                "familiars": "Max Fams",
                "artifacts": "1450 Lvls",
                "attribute_lvl": "65",
                "mix_atk": {"leader": "1203-1018-1159", "base": "709-681-680"},
                "mono_atk": {"leader": "1675-1606-1620", "base": "709-681-680"},
                "army_mix_atk": {"leader": "580.4%", "base": "413.8%"},
                "army_mix_def": {"leader": "518.85%", "base": "358.1%"},
                "army_mix_hp": {"leader": "1015.02%", "base": "440.7%"},
                "custom_inventory": [
                    {"label": "Mana Castle", "value": "Level 5"},
                    {"label": "Mana Troops", "value": "Level 2"},
                    {"label": "Leader Skins", "value": "2 Skins (Shrek)"},
                    {"label": "Route Skins", "value": "3 Skins"}
                ]
            })
        },

        # --- АКАУНТ 4 ---
        {
            "title": "✈️ Zero Quest Might Beast 12.5k+MM (1858-1815-1834%)",
            "shortDesc": (
                "12.5k+MM Zero Quest might beast.\n"
                "13 Champs (4×Lv15, 5×Lv12, 1×Lv11)\n"
                "12 Gold army Jewels, 3 Gold Sigils\n"
                "Base (White): 790-782-788%\n"
                "Blasts: 1858-1815-1834%\n"
                "Wonder sets: 668/569/659 & 686 sets\n"
                "1×11k hero Purple + 39 medals\n"
                "307 Castle Stars ⭐️ 144 Blessed ⭐️\n"
                "4 Leaderskins, 982% Hp\n"
                "Links: Gmail + GC"
            ),
            "price": "3200.00",
            "base_price": "3600.00",
            "tags": "12.5k+MM, Zero Quest, 13 Champs, 1850%+, 307 Stars, 11k Hero",
            "bind": "Gmail + Game Center",
            "images": json.dumps(["/static/uploads/acc_12kmm.jpg"]),
            "status": "active",
            "stats": json.dumps({
                "might": "12.5k+MM",
                "max_kd": "1750",
                "is_low_might": True,
                "white_stats": "790-782-788",
                "mix_stats": "1266-1300-1237",
                "blast_stats": "1858-1815-1834",
                "army_atk": "528.6",
                "army_hp": "982.0",
                "mana_troops_lvl": 4,
                "castle_skins_lvl": 307,
                "artifact_lvl": 1650,
                "champ_pieces": 13,
                "castle": "307⭐️",
                "blessed": "144 Blessed",
                "heroes": "11k Hero (Purple+39) + 4 Skins",
                "familiars": "Max Fams",
                "artifacts": "144 Blessed",
                "attribute_lvl": "78",
                "mix_atk": {"leader": "1266-1300-1237", "base": "790-782-788"},
                "mono_atk": {"leader": "1858-1815-1834", "base": "790-782-788"},
                "army_mix_atk": {"leader": "528.6%", "base": "335.2%"},
                "army_mix_def": {"leader": "475.63%", "base": "341.6%"},
                "army_mix_hp": {"leader": "982.0%", "base": "406.65%"},
                "custom_inventory": [
                    {"label": "Champ Gear", "value": "13 Champs (4xLv15, 5xLv12)"},
                    {"label": "Army Jewels", "value": "12 Gold Army Jewels"},
                    {"label": "Gold Sigils", "value": "3 Gold Sigils"},
                    {"label": "11k Hero", "value": "Purple + 39 medals"},
                    {"label": "Castle Stars", "value": "307⭐️ (144 Blessed)"},
                    {"label": "Leader Skins", "value": "4 Leader Skins"}
                ]
            })
        },

        # --- АКАУНТ 5 ---
        {
            "title": "✈️ Can go K1955 | Low Might Rally Lead 7.5K+MM (1630-1560-1626%)",
            "shortDesc": (
                "✈️ Can go up to K1955\n"
                "Low Might Beast ‼️ | 7.5K+MM\n"
                "645-623-643% White (Base stats)\n"
                "1630-1560-1626% Blasts\n"
                "950% HP - 0 Quest Might\n"
                "185⭐️ 71 Blessed Artefacts\n"
                "Mana 4 Troops - Castle 5-6\n"
                "4 Route - 10 Army Skins - 4 Lead Skins - 103 Scrolls\n"
                "Good Bags - Single IGG"
            ),
            "price": "1950.00",
            "base_price": "2200.00",
            "tags": "K1955, 7.5K+MM, Low Might, 1600%+, Mana T4, Single IGG",
            "bind": "Single IGG",
            "images": json.dumps(["/static/uploads/374f524e28794558b85601ed0fdd77b1.webp"]),
            "status": "active",
            "stats": json.dumps({
                "might": "7.5K+MM",
                "max_kd": "1955",
                "is_low_might": True,
                "white_stats": "645-623-643",
                "mix_stats": "1180-1120-1160",
                "blast_stats": "1630-1560-1626",
                "army_atk": "460.0",
                "army_hp": "950.0",
                "mana_troops_lvl": 4,
                "castle_skins_lvl": 185,
                "artifact_lvl": 1350,
                "champ_pieces": 8,
                "castle": "185⭐️ (Lv5-6 Mana)",
                "blessed": "71 Blessed",
                "heroes": "4 Lead Skins",
                "familiars": "Max Fams",
                "artifacts": "71 Blessed",
                "attribute_lvl": "60",
                "mix_atk": {"leader": "1180-1120-1160", "base": "645-623-643"},
                "mono_atk": {"leader": "1630-1560-1626", "base": "645-623-643"},
                "army_mix_atk": {"leader": "460.0%", "base": "320.0%"},
                "army_mix_hp": {"leader": "950.0%", "base": "380.0%"},
                "custom_inventory": [
                    {"label": "Mana Troops", "value": "Level 4"},
                    {"label": "Mana Castle", "value": "Level 5-6"},
                    {"label": "Skins", "value": "10 Army + 4 Lead + 4 Route"},
                    {"label": "Migration", "value": "Can go K1955✈️ (103 Scrolls)"}
                ]
            })
        }
    ]

    # Видаляємо старі тестові акаунти та вставляємо 5 детальних
    db.query(models.AccountDB).delete()
    for acc in accounts_data:
        db_acc = models.AccountDB(**acc)
        db.add(db_acc)
    db.commit()
    print(f"✅ Успішно додано {len(accounts_data)} топових акаунтів!")

    # ==========================================
    # 2. РЕСУРСИ ТА САМОЦВІТИ (ЗАЛИШАЄМО І ДОПОВНЮЄМО)
    # ==========================================
    print("\n📦 Перевірка ресурсів та самоцвітів...")
    existing_rss = db.query(models.ResourceDB).count()
    if existing_rss == 0:
        resources = [
            {"name": "Package 44444", "desc": "Standard RSS Package 44444", "price": "0.80", "base_price": "0.70"},
            {"name": "Package 44442", "desc": "Standard RSS Package 44442", "price": "0.60", "base_price": "0.50"},
            {"name": "Package 44440", "desc": "Standard RSS Package 44440", "price": "0.40", "base_price": "0.30"},
            {"name": "Package 22222", "desc": "Standard RSS Package 22222", "price": "0.60", "base_price": "0.50"},
            {"name": "Package 11111", "desc": "Standard RSS Package 11111", "price": "0.40", "base_price": "0.30"},
            {"name": "4B Food (Їжа)", "desc": "4 Billion Food Package", "price": "0.40", "base_price": "0.30"}
        ]
        for r in resources:
            db.add(models.ResourceDB(**r))
        db.commit()
        print(f"✅ Додано {len(resources)} паків ресурсів.")
    else:
        print(f"ℹ️ Ресурси вже наявні ({existing_rss} шт.), залишено без змін.")

    existing_gems = db.query(models.GemDB).count()
    if existing_gems == 0:
        gems = [
            {"range": "0-790m", "rate": "3.50", "base_price": "3.50"},
            {"range": "790-1090m", "rate": "3.60", "base_price": "3.55"},
            {"range": "1090-1390m", "rate": "3.70", "base_price": "3.65"},
            {"range": "1390-2490m", "rate": "3.75", "base_price": "3.70"}
        ]
        for g in gems:
            db.add(models.GemDB(**g))
        db.commit()
        print(f"✅ Додано {len(gems)} тарифів на самоцвіти.")
    else:
        print(f"ℹ️ Сапфіри вже наявні ({existing_gems} шт.), залишено без змін.")

    # ==========================================
    # 3. ІНШІ ТОВАРИ (РОЗШИРЕНИЙ СПИСОК)
    # ==========================================
    print("\n🎁 Створення/Оновлення розширеного списку інших товарів...")
    other_items = [
        {
            "name": "Золотий Пропуск (Gold Pass)",
            "desc": "Купівля золотого пропуску на ваш акаунт офіційно через магазин гри. Активує додаткові нагороди сезону.",
            "price": "4.99",
            "base_price": "3.50",
            "tag": "Хіт",
            "color": "orange",
            "requiredFields": "IGG ID гравця"
        },
        {
            "name": "Щит 24 години x5",
            "desc": "Відправка подарунком набору з 5-ти щитів тривалістю 24 години кожен. Надійний захист замку.",
            "price": "2.50",
            "base_price": "1.00",
            "tag": "Знижка",
            "color": "blue",
            "requiredFields": "Нікнейм,Гільдія,Координати"
        },
        {
            "name": "Експедиційний пропуск (Kingdom Pass)",
            "desc": "Сезонний пропуск королівства для максимальних бонусів армії та рідкісних нагород експедиції.",
            "price": "9.99",
            "base_price": "7.50",
            "tag": "Топ",
            "color": "purple",
            "requiredFields": "IGG ID гравця"
        },
        {
            "name": "Свиток міграції x5 (Migration Scrolls)",
            "desc": "Набір з 5 сувоїв міграції для швидкого перельоту до нового цільового королівства.",
            "price": "6.50",
            "base_price": "4.00",
            "tag": "Швидко",
            "color": "blue",
            "requiredFields": "Нікнейм,Координати,Королівство"
        },
        {
            "name": "Прискорення 24 години x50 (Speed Up 24h)",
            "desc": "Пак прискорень 50 штук по 24 години (1200 годин). Підходить для досліджень, будівель та тренування військ.",
            "price": "7.99",
            "base_price": "5.00",
            "tag": "Вигідно",
            "color": "emerald",
            "requiredFields": "Нікнейм,Гільдія,Координати"
        },
        {
            "name": "Зірки замку x1000 (Castle Stars)",
            "desc": "1,000 зірок для прокачування скінів замку та отримання бойових бонусів армії.",
            "price": "12.99",
            "base_price": "9.00",
            "tag": "Преміум",
            "color": "amber",
            "requiredFields": "IGG ID гравця"
        },
        {
            "name": "Токени лабіринту x100,000 (Holy Stars)",
            "desc": "100k святих зірок для лабіринту. Шанс вибити золото та матеріали спорядження монстрів.",
            "price": "14.50",
            "base_price": "10.00",
            "tag": "Хіт",
            "color": "cyan",
            "requiredFields": "Нікнейм,Гільдія,Координати"
        },
        {
            "name": "Артефактні монети x50,000 (Artifact Coins)",
            "desc": "50,000 монет для кування та відкриття нових артефактів в Артефактному залі.",
            "price": "10.99",
            "base_price": "7.50",
            "tag": "Новинка",
            "color": "indigo",
            "requiredFields": "IGG ID гравця"
        },
        {
            "name": "Скриня чемпіона x100 (Champion Chests)",
            "desc": "100 скринь Чемпіона для крафту та прокачування найсильнішого імперського одягу гри.",
            "price": "18.00",
            "base_price": "13.00",
            "tag": "Ексклюзив",
            "color": "red",
            "requiredFields": "Нікнейм,Гільдія,Координати"
        },
        {
            "name": "Кастомне прокачування / Бот-ферма (30 днів)",
            "desc": "Автоматичний збір ресурсів, будівництво, захист та виконання квестів 24/7 протягом місяця.",
            "price": "24.99",
            "base_price": "18.00",
            "tag": "Сервіс",
            "color": "purple",
            "requiredFields": "IGG ID гравця,Контакт в Telegram"
        }
    ]

    db.query(models.OtherItemDB).delete()
    for item in other_items:
        db.add(models.OtherItemDB(**item))
    db.commit()
    print(f"✅ Успішно додано {len(other_items)} найменувань інших товарів!")

    # ==========================================
    # 4. ПРОМОКОДИ ДЛЯ ТЕСТУВАННЯ
    # ==========================================
    print("\n🎟️ Створення/Оновлення промокодів...")
    promocodes = [
        {
            "code": "TEST10",
            "type": "percent",
            "value": "10",
            "target": "all",
            "max_uses": 100,
            "current_uses": 0,
            "min_order_amount": 0.0,
            "is_active": 1,
            "target_items": "[]",
            "target_names": "[]"
        },
        {
            "code": "MEGA50",
            "type": "fixed",
            "value": "50",
            "target": "accounts",
            "max_uses": 20,
            "current_uses": 0,
            "min_order_amount": 100.0,
            "is_active": 1,
            "target_items": "[]",
            "target_names": "[]"
        },
        {
            "code": "GUILD2026",
            "type": "percent",
            "value": "15",
            "target": "guild",
            "max_uses": 50,
            "current_uses": 0,
            "min_order_amount": 0.0,
            "is_active": 1,
            "target_items": "[]",
            "target_names": "[]"
        }
    ]

    for promo in promocodes:
        existing = db.query(models.PromoCodeDB).filter(models.PromoCodeDB.code == promo["code"]).first()
        if existing:
            for k, v in promo.items():
                setattr(existing, k, v)
        else:
            db.add(models.PromoCodeDB(**promo))
    db.commit()
    print(f"✅ Додано/Оновлено {len(promocodes)} промокодів.")

    print("\n🎉 ГОТОВО! База даних MySQL (ALTLM) успішно наповнена всіма товарами!")

except Exception as e:
    db.rollback()
    print(f"\n❌ Помилка під час наповнення бази: {e}")
    raise e
finally:
    db.close()