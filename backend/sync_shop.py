import os
import requests
import json
from dotenv import load_dotenv
from database import SessionLocal
import models

# Завантажуємо змінні з .env
load_dotenv()
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

# 🔥 ВПИШИ СЮДИ НІКНЕЙМ СВОГО БОТА (БЕЗ @) 🔥
BOT_USERNAME = "lmshopGbot"

# ID твоєї групи-вітрини (обов'язково з -100)
CHAT_ID = "-1004482826975"

# ID тем
TOPICS = {
    "accounts": 1,
    "sapphires": 3,
    "resources": 5,
    "other": 7,
    "coins": 9
}


def send_post(topic_id, text, button_payload, image_url=None):
    url = f"https://api.telegram.org/bot{TOKEN}/"

    # Кнопка, яка веде в приватні повідомлення бота з конкретним товаром
    keyboard = {
        "inline_keyboard": [[
            {"text": "🛒 Купити", "url": f"https://t.me/{BOT_USERNAME}?start={button_payload}"}
        ]]
    }

    if image_url:
        method = "sendPhoto"
        payload = {
            "chat_id": CHAT_ID,
            "message_thread_id": topic_id,
            "photo": image_url,
            "caption": text,
            "parse_mode": "HTML",
            "reply_markup": json.dumps(keyboard)
        }
    else:
        method = "sendMessage"
        payload = {
            "chat_id": CHAT_ID,
            "message_thread_id": topic_id,
            "text": text,
            "parse_mode": "HTML",
            "reply_markup": json.dumps(keyboard),
            "disable_web_page_preview": True
        }

    res = requests.post(url + method, json=payload)
    if not res.ok:
        print(f"Помилка публікації: {res.text}")


def sync_all():
    db = SessionLocal()
    print("🚀 Починаємо заповнення Вітрини...\n")

    # 1. АКАУНТИ
    print("⏳ Публікуємо Акаунти...")
    accounts = db.query(models.AccountDB).filter(models.AccountDB.status == "active").all()
    for acc in accounts:
        try:
            images = json.loads(acc.images)
            img = images[0] if images else None
        except:
            img = None

        text = f"🎮 <b>{acc.title}</b>\n\n📝 {acc.shortDesc}\n🔗 <b>Прив'язка:</b> {acc.bind}\n\n💰 <b>Ціна:</b> ${acc.price}"
        send_post(TOPICS["accounts"], text, f"buy_acc_{acc.id}", img)

    # 2. САПФІРИ (ГЕМИ)
    print("⏳ Публікуємо Сапфіри...")
    gems = db.query(models.GemDB).all()
    for gem in gems:
        text = f"💎 <b>Сапфіри ({gem.range})</b>\n\n📊 <b>Рейт:</b> {gem.rate}\n\n💰 <b>Ціна:</b> Залежить від кількості"
        send_post(TOPICS["sapphires"], text, f"buy_gem_{gem.id}")

    # 3. РЕСУРСИ
    print("⏳ Публікуємо Ресурси...")
    resources = db.query(models.ResourceDB).all()
    for res in resources:
        text = f"🌾 <b>{res.name}</b>\n\n📝 {res.desc}\n\n💰 <b>Ціна:</b> ${res.price}"
        send_post(TOPICS["resources"], text, f"buy_res_{res.id}")

    # 4. ІНШЕ
    print("⏳ Публікуємо Інші товари...")
    others = db.query(models.OtherItemDB).all()
    for oth in others:
        text = f"📦 <b>{oth.name}</b>\n\n📝 {oth.desc}\n\n💰 <b>Ціна:</b> ${oth.price}"
        send_post(TOPICS["other"], text, f"buy_oth_{oth.id}")

    # 5. МОНЕТИ (Один статичний пост)
    print("⏳ Публікуємо Монети...")
    text = "🪙 <b>Купити Монети (Поповнення балансу)</b>\n\nСплачуйте за товари на сайті зручніше та миттєво!\n1 Монета = 1 USDT.\n\nНатисніть кнопку нижче, щоб вказати суму поповнення."
    send_post(TOPICS["coins"], text, "buy_coins")

    print("\n✅ Усі товари успішно перенесено в Telegram-Магазин!")
    db.close()


if __name__ == "__main__":
    sync_all()