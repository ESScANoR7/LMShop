import requests
import json
import time

BASE_URL = "http://localhost:8000/api"


def print_status(response, item_name):
    if response.status_code == 200:
        print(f"✅ Додано: {item_name}")
    else:
        print(f"❌ Помилка додавання {item_name}: {response.text}")


print("🚀 Починаємо генерацію тестових даних для Lords Shop...\n")

# =======================================
# 1. СТВОРЮЄМО АКАУНТИ З ФОТО ТА СТАТУСАМИ
# =======================================
accounts = [
    {
        "data": {
            "title": "🔥 ТОП Акаунт 1.5B Міці (Міфічний шмот)",
            "shortDesc": "Ідеальний бойовий акаунт. Відкриті T5, багато донатних героїв, 500k+ самоцвітів на рахунку.",
            "price": "350.00",
            "tags": "1.5B, T5, Міфік, ТОП",
            "bind": "Facebook + Gmail",
            "images": [
                "https://picsum.photos/id/10/800/450",  # Головне фото (Ліс/Пейзаж)
                "https://picsum.photos/id/11/800/450"  # Додаткове фото
            ]
        },
        "status": "active"  # В продажі
    },
    {
        "data": {
            "title": "🛡️ Пастка (Rally Trap) 400M",
            "shortDesc": "Готова пастка для приймання зборів. Мільйони військ Т2, високі стати.",
            "price": "85.50",
            "tags": "Пастка, 400M, T2/T4",
            "bind": "Тільки Steam",
            "images": [
                "https://picsum.photos/id/12/800/450"
            ]
        },
        "status": "processing"  # На обробці (куплений, але ще не переданий)
    },
    {
        "data": {
            "title": "🌾 Ферма 200M (Гіпер-Дерево)",
            "shortDesc": "Виробляє 50M дерева на добу. Є багато ресурсів у рюкзаку.",
            "price": "25.00",
            "tags": "Ферма, Дерево, 200M",
            "bind": "Google",
            "images": [
                "https://picsum.photos/id/13/800/450",
                "https://picsum.photos/id/14/800/450"
            ]
        },
        "status": "sold"  # ПРОДАНО
    }
]

print("🛡️ Генерація Акаунтів...")
for acc in accounts:
    # Спочатку створюємо акаунт
    res = requests.post(f"{BASE_URL}/accounts", json=acc["data"])
    print_status(res, acc["data"]["title"])

    # Якщо акаунт створено і йому треба змінити статус
    if res.status_code == 200 and acc["status"] != "active":
        acc_id = res.json().get("id")
        if acc_id:
            # Викликаємо наш новий маршрут для зміни статусу
            status_res = requests.put(f"{BASE_URL}/accounts/{acc_id}/status", json={"status": acc["status"]})
            if status_res.status_code == 200:
                print(f"   🔄 Статус змінено на: {acc['status']}")

    time.sleep(0.1)

# =======================================
# 2. СТВОРЮЄМО РЕСУРСИ ТА САМОЦВІТИ
# =======================================
resources = [
    {"name": "Дерево", "desc": "1 Мільярд Дерева", "price": "1.50"},
    {"name": "Руда", "desc": "1 Мільярд Руди", "price": "1.50"},
    {"name": "Камінь", "desc": "1 Мільярд Каменю", "price": "1.50"},
    {"name": "Золото", "desc": "1 Мільярд Золота", "price": "3.00"}
]

gems = [
    {"range": "0 - 100K", "rate": "0.15"},
    {"range": "100K - 500K", "rate": "0.13"},
    {"range": "500K+", "rate": "0.10"}
]

print("\n📦 Генерація Ресурсів...")
requests.post(f"{BASE_URL}/resources/bulk", json=resources)
print("✅ Додано: Пакунки Ресурсів")

print("\n💎 Генерація Самоцвітів...")
requests.post(f"{BASE_URL}/gems/bulk", json=gems)
print("✅ Додано: Тарифи на Самоцвіти")

# =======================================
# 3. СТВОРЮЄМО ІНШІ ТОВАРИ
# =======================================
other_items = [
    {
        "name": "Золотий Пропуск (Gold Pass)",
        "desc": "Купівля золотого пропуску на ваш акаунт офіційно через магазин гри.",
        "price": "4.99",
        "tag": "Хіт",
        "color": "orange",
        "requiredFields": ["IGG ID гравця"]
    },
    {
        "name": "Щит 24 години x5",
        "desc": "Відправка подарунком 5-ти щитів на 24 години.",
        "price": "2.50",
        "tag": "Знижка",
        "color": "blue",
        "requiredFields": ["Нікнейм", "Гільдія", "Координати"]
    }
]

print("\n🎁 Генерація Інших товарів...")
for item in other_items:
    res = requests.post(f"{BASE_URL}/other-items", json=item)
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
        "expiry_date": "",
        "specific_items": ""
    },
    {
        "code": "MEGA50",
        "type": "fixed",
        "value": "50",
        "target": "accounts",
        "max_uses": 5,
        "min_order_amount": 100.0,
        "expiry_date": "",
        "specific_items": ""
    }
]

print("\n🎟️ Генерація Промокодів...")
for promo in promocodes:
    res = requests.post(f"{BASE_URL}/promocodes", json=promo)
    if res.status_code == 200 or res.status_code == 422:
        print(f"✅ Додано: {promo['code']}")
    time.sleep(0.1)

print("\n🎉 ГОТОВО! Магазин ідеально наповнено тестовими даними.")