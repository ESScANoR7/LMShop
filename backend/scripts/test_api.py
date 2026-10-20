import requests
import time

BASE_URL = "http://localhost:8000"

# Список маршрутів для перевірки (GET запити)
ENDPOINTS_TO_TEST = [
    {"name": "Статус магазину", "path": "/api/store/status", "expected": 200},
    {"name": "Список ресурсів", "path": "/api/resources", "expected": 200},
    {"name": "Список гемів", "path": "/api/gems", "expected": 200},
    {"name": "Список акаунтів", "path": "/api/accounts", "expected": 200},
    {"name": "Інші товари", "path": "/api/other-items", "expected": 200},
    {"name": "Промокоди (захищено)", "path": "/api/promocodes", "expected": 200},
    {"name": "Налаштування кешбеку", "path": "/api/cashback/settings/public", "expected": 200},

    # Захищені маршрути (мають видати 401 Unauthorized або 403, що означає, що вони ЖИВІ, просто потрібен токен)
    {"name": "Замовлення (без токена)", "path": "/api/orders", "expected": 401},
    {"name": "Профіль юзера (без токена)", "path": "/api/users/1", "expected": 401},
    {"name": "Адмін юзери (без токена)", "path": "/api/admin/users", "expected": 401},
    {"name": "Бухгалтерія (без токена)", "path": "/api/admin/workers/accounting", "expected": 401},
]


def run_tests():
    print("🚀 Починаємо перевірку життєздатності API...\n")
    passed = 0
    failed = 0

    for endpoint in ENDPOINTS_TO_TEST:
        url = f"{BASE_URL}{endpoint['path']}"
        try:
            response = requests.get(url, timeout=5)
            # Якщо ми очікували 401 (бо немає авторизації), і отримали 401 або 403 - тест пройдено
            if response.status_code == endpoint['expected'] or (
                    endpoint['expected'] == 401 and response.status_code in [401, 403]):
                print(f"✅ [ОК] {endpoint['name']} ({endpoint['path']}) -> Статус: {response.status_code}")
                passed += 1
            else:
                print(
                    f"❌ [ПОМИЛКА] {endpoint['name']} ({endpoint['path']}) -> Очікували: {endpoint['expected']}, Отримали: {response.status_code}")
                failed += 1
        except requests.exceptions.ConnectionError:
            print(f"⚠️ Сервер вимкнено! Запусти uvicorn main:app перед перевіркою.")
            return
        except Exception as e:
            print(f"❌ [ПОМИЛКА] {endpoint['name']} -> {e}")
            failed += 1

        time.sleep(0.1)  # Невелика пауза щоб не спамити

    print("\n" + "=" * 40)
    print(f"📊 РЕЗУЛЬТАТИ: Успішно: {passed} | Зламано/Відсутні: {failed}")
    if failed == 0:
        print("🎉 Всі перевірені функції в строю!")
    print("=" * 40)


if __name__ == "__main__":
    run_tests()