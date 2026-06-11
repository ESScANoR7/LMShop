import requests
import sys
import time

BASE_URL = "http://localhost:8000/api"

print("🚀 Починаємо генерацію тестових даних для Lords Shop...\n")
print("🔒 БЕЗПЕКА УВІМКНЕНА: Для додавання товарів потрібен доступ Адміністратора.")

# Використовуємо сесію для автоматичного керування HttpOnly Cookies
session = requests.Session()

# =======================================
# 0. АВТОРИЗАЦІЯ (ОТРИМАННЯ СЕСІЇ)
# =======================================
admin_username = input("👉 Введіть логін Адміна: ")
admin_password = input("👉 Введіть пароль Адміна: ")

login_res = session.post(f"{BASE_URL}/login", json={
    "username": admin_username,
    "password": admin_password
})

if login_res.status_code != 200:
    print(f"\n❌ Помилка авторизації! Перевірте логін та пароль. ({login_res.text})")
    sys.exit(1)

print("✅ Авторизація успішна! HttpOnly Cookies отримано та збережено в сесії.\n")

def print_status(response, item_name):
    if response.status_code == 200:
        print(f"✅ Додано/Оновлено: {item_name}")
    else:
        print(f"❌ Помилка для {item_name}: {response.status_code} - {response.text}")

# =======================================
# 1. СТВОРЮЄМО АКАУНТИ З ФОТО ТА СТАТУСАМИ
# =======================================
accounts = [
    {
        "data": {
            "title": "Low Might - 1200+MM ‼️",
            "shortDesc": "Can go K1178✈️\n1204-1140-1180% Blast\n118 ⭐️ 29 Blessed Artefacts\nMax Fams - 817% HP\n10 Champ - 4 cups\nInstallment possible",
            "price": "850.00",
            "base_price": "750.00",
            "tags": "1200+MM, Champ, K1178",
            "bind": "Facebook + Gmail",
            "images": [
                "https://picsum.photos/id/10/800/450",
                "https://picsum.photos/id/11/800/450"
            ],
            "stats": {
                "might": "1200+MM",
                "mix_atk": "1204-1140-1180%",
                "heroes": "10 Champ",
                "artifacts": "29 Blessed"
            }
        },
        "status": "active"
    },
    {
        "data": {
            "title": "5900+mm‼️ 1634-1632-1678% stats",
            "shortDesc": "3 Lv.15 Champs\n288 Castle 🌟161 Blessed ⭐️\n3 Leader skins, Lv.5 Castle\n3 wow artifacts\nInstallment possible",
            "price": "2500.00",
            "base_price": "2200.00",
            "tags": "5900+mm, Lv.15 Champs, 1600+ stats",
            "bind": "Google",
            "images": [
                "https://picsum.photos/id/12/800/450"
            ],
            "stats": {
                "might": "5900+MM",
                "mix_atk": "1634-1632-1678%",
                "heroes": "3 Lv.15 Champs",
                "artifacts": "161 Blessed"
            }
        },
        "status": "active"
    }
]

print("🛡️ Generation of Accounts...")
for acc in accounts:
    res = session.post(f"{BASE_URL}/accounts", json=acc["data"])
    print_status(res, acc["data"]["title"])

    if res.status_code == 200 and acc["status"] != "active":
        acc_id = res.json().get("id")
        if acc_id:
            status_res = session.put(f"{BASE_URL}/accounts/{acc_id}/status", json={"status": acc["status"]})
            if status_res.status_code == 200:
                print(f"   🔄 Статус змінено на: {acc['status']}")
    time.sleep(0.1)

# =======================================
# 2. СТВОРЮЄМО РЕСУРСИ ТА САМОЦВІТИ
# =======================================
resources = [
    {"name": "Package 44444", "desc": "Standard RSS Package 44444", "price": "0.80", "base_price": "0.70"},
    {"name": "Package 44442", "desc": "Standard RSS Package 44442", "price": "0.60", "base_price": "0.50"},
    {"name": "Package 44440", "desc": "Standard RSS Package 44440", "price": "0.40", "base_price": "0.30"},
    {"name": "Package 22222", "desc": "Standard RSS Package 22222", "price": "0.60", "base_price": "0.50"},
    {"name": "Package 11111", "desc": "Standard RSS Package 11111", "price": "0.40", "base_price": "0.30"},
    {"name": "4B Food", "desc": "4 Billion Food Package", "price": "0.40", "base_price": "0.30"}
]

gems = [
    {"range": "0-790m", "rate": "3.50", "base_price": "3.50"},
    {"range": "790-1090m", "rate": "3.60", "base_price": "3.55"},
    {"range": "1090-1390m", "rate": "3.70", "base_price": "3.65"},
    {"range": "1390-2490m", "rate": "3.75", "base_price": "3.70"}
]

print("\n📦 Generation of Resources...")
res_rss = session.post(f"{BASE_URL}/resources/bulk", json=resources)
print_status(res_rss, "Пакунки Ресурсів")

print("\n💎 Generation of Gems...")
res_gems = session.post(f"{BASE_URL}/gems/bulk", json=gems)
print_status(res_gems, "Тарифи на Самоцвіти")

# =======================================
# 3. СТВОРЮЄМО ІНШІ ТОВАРИ
# =======================================
other_items = [
    {
        "name": "Золотий Пропуск (Gold Pass)",
        "desc": "Купівля золотого пропуску на ваш акаунт офіційно через магазин гри.",
        "price": "4.99",
        "base_price": "3.50",
        "tag": "Хіт",
        "color": "orange",
        "requiredFields": ["IGG ID гравця"]
    },
    {
        "name": "Щит 24 години x5",
        "desc": "Відправка подарунком 5-ти щитів на 24 години.",
        "price": "2.50",
        "base_price": "1.00",
        "tag": "Знижка",
        "color": "blue",
        "requiredFields": ["Нікнейм", "Гільдія", "Координати"]
    }
]

print("\n🎁 Generation of Other Items...")
for item in other_items:
    res = session.post(f"{BASE_URL}/other-items", json=item)
    print_status(res, item["name"])
    time.sleep(0.1)

# =======================================
# 4. СТВОРЮЄМО ПРОМОКОДИ
# =======================================
promocodes = [
    {
        "code": "TEST10",
        "type": "percent",
        "value": "10",
        "target": "all",
        "max_uses": 100,
        "min_order_amount": 0.0,
        "expiry_date": None,
        "target_items": [],
        "target_names": []
    },
    {
        "code": "MEGA50",
        "type": "fixed",
        "value": "50",
        "target": "accounts",
        "max_uses": 5,
        "min_order_amount": 100.0,
        "expiry_date": None,
        "target_items": [],
        "target_names": []
    }
]

print("\n🎟️ Generation of Promocodes...")
for promo in promocodes:
    res = session.post(f"{BASE_URL}/promocodes", json=promo)
    print_status(res, promo['code'])
    time.sleep(0.1)

print("\n🎉 ГОТОВО! База даних успішно заповнена.")