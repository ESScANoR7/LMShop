from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import requests
import json
import uuid
import os
from datetime import datetime

from database import get_db
import models
import schemas
from utils import get_current_user, escape_html
from routers.orders import _process_order_status_change

# Завантажуємо змінні оточення
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_FORUM_CHAT_ID = os.getenv("TELEGRAM_FORUM_CHAT_ID")
FRONTEND_URL = os.getenv("VITE_FRONTEND_URL", "http://localhost:5173")

# Налаштування вітрини (ID каналу та гілок)
STOREFRONT_CHAT_ID = os.getenv("STOREFRONT_CHAT_ID") or os.getenv("TELEGRAM_CHAT_ID")
STOREFRONT_TOPIC_ACC = os.getenv("STOREFRONT_TOPIC_ACC")
STOREFRONT_TOPIC_GEM = os.getenv("STOREFRONT_TOPIC_GEM")
STOREFRONT_TOPIC_RES = os.getenv("STOREFRONT_TOPIC_RES")
STOREFRONT_TOPIC_OTH = os.getenv("STOREFRONT_TOPIC_OTH")
STOREFRONT_TOPIC_COINS = os.getenv("STOREFRONT_TOPIC_COINS")

router = APIRouter(tags=["Telegram"])

# ==========================================
# 🧠 ПАМ'ЯТЬ БОТА (Для калькулятора та списків)
# ==========================================
USER_STATES = {}
USER_LANGUAGES = {}
LINK_TOKENS = {}


# 🔥 ДОПОМІЖНА ФУНКЦІЯ: ГЕНЕРАЦІЯ КЛАВІАТУРИ ЧЕКАУТУ З ПРОМОКОДОМ 🔥
def get_checkout_markup(user, final_price, has_promo, is_uk):
    kb = {"inline_keyboard": [
        [{"text": "💬 Оплатити готівкою (Чат)" if is_uk else "💬 Pay with Cash (Chat)", "callback_data": "statepay_chat"}]
    ]}

    if not has_promo:
        kb["inline_keyboard"].append(
            [{"text": "🎟 Ввести промокод" if is_uk else "🎟 Enter Promo Code", "callback_data": "enter_promo"}])

    if user and user.balance >= final_price:
        kb["inline_keyboard"].insert(0, [{
                                             "text": f"🪙 Оплатити з балансу (${final_price:.2f})" if is_uk else f"🪙 Pay from balance (${final_price:.2f})",
                                             "callback_data": "statepay_bal"}])

    safe_url = FRONTEND_URL if FRONTEND_URL.startswith("http") else f"https://{FRONTEND_URL}"
    if "localhost" in safe_url or "127.0.0.1" in safe_url: safe_url = "https://t.me"

    kb["inline_keyboard"].append([{"text": "🌐 Відкрити сайт" if is_uk else "🌐 Open Website", "url": safe_url}])
    return kb


@router.post("/api/telegram/webhook")
async def telegram_webhook(request: Request, db: Session = Depends(get_db)):
    try:
        data = await request.json()

        chat_id_for_lang = None
        user_lang_tg = "en"

        if "callback_query" in data:
            chat_id_for_lang = str(data["callback_query"]["message"]["chat"]["id"])
            user_lang_tg = str(data["callback_query"].get("from", {}).get("language_code", "en")).strip().lower()
        elif "message" in data:
            chat_id_for_lang = str(data["message"]["chat"]["id"])
            user_lang_tg = str(data["message"].get("from", {}).get("language_code", "en")).strip().lower()

        is_uk = False
        user_in_db = None
        current_lang = "en"

        if chat_id_for_lang:
            user_in_db = db.query(models.UserDB).filter(models.UserDB.telegram_chat_id == chat_id_for_lang).first()
            if user_in_db and getattr(user_in_db, "language", None):
                current_lang = user_in_db.language
            elif chat_id_for_lang in USER_LANGUAGES:
                current_lang = USER_LANGUAGES[chat_id_for_lang]
            elif user_lang_tg.startswith("uk"):
                current_lang = "uk"

            is_uk = (current_lang == "uk")

        # === 1. ОБРОБКА КНОПОК З ТЕЛЕГРАМУ ===
        if "callback_query" in data:
            callback = data["callback_query"]
            chat_id = callback["message"]["chat"]["id"]
            chat_id_str = str(chat_id)
            message_id = callback["message"]["message_id"]
            action_data = callback["data"]

            clicker_name = callback["from"].get("username", callback["from"].get("first_name", "Адмін"))
            worker_mention = f"@{clicker_name}" if callback["from"].get("username") else clicker_name

            if action_data == "change_lang":
                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                              json={"callback_query_id": callback["id"]})

                new_lang = "en" if is_uk else "uk"
                if user_in_db:
                    user_in_db.language = new_lang
                    db.commit()
                else:
                    USER_LANGUAGES[chat_id_str] = new_lang
                is_uk = (new_lang == "uk")

                text_ok = "✅ Мову змінено на <b>Українську</b>!" if is_uk else "✅ Language changed to <b>English</b>!"
                btn_lang = "🌍 Change language (EN)" if is_uk else "🌍 Змінити мову (UK)"

                keyboard = {"inline_keyboard": [
                    [{"text": "👤 Профіль / Profile", "callback_data": "profile_menu"},
                     {"text": "❓ Допомога / Help", "callback_data": "help_menu"}],
                    [{"text": "🎟 Ввести промокод / Promo Code", "callback_data": "enter_promo_profile"}],
                    [{"text": btn_lang, "callback_data": "change_lang"}]
                ]}
                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/editMessageText",
                              json={"chat_id": chat_id, "message_id": message_id, "text": text_ok, "parse_mode": "HTML",
                                    "reply_markup": keyboard})
                return {"status": "ok"}

            elif action_data == "topup_start":
                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                              json={"callback_query_id": callback["id"]})
                if not user_in_db:
                    err_msg = "❌ Спочатку прив'яжіть акаунт на сайті!" if is_uk else "❌ Link your account on the website first!"
                    requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                  json={"chat_id": chat_id, "text": err_msg})
                    return {"status": "ok"}

                USER_STATES[chat_id_str] = {"step": "wait_topup_amount"}
                text_topup = "🪙 <b>Поповнення балансу</b>\n\nВведіть бажану суму поповнення (в доларах/USDT). Наприклад: <code>50</code>" if is_uk else "🪙 <b>Top Up Balance</b>\n\nEnter the desired amount (in USD/USDT). Example: <code>50</code>"
                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                              json={"chat_id": chat_id, "text": text_topup, "parse_mode": "HTML"})
                return {"status": "ok"}

            elif action_data == "unlink_acc":
                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                              json={"callback_query_id": callback["id"]})
                if user_in_db:
                    user_in_db.telegram_chat_id = None
                    db.commit()
                    msg_unlinked = "✅ <b>Ваш акаунт успішно відв'язано!</b>\nТепер баланс сайту тут недоступний." if is_uk else "✅ <b>Your account has been unlinked!</b>\nWebsite balance is no longer available here."
                else:
                    msg_unlinked = "❌ Акаунт не знайдено." if is_uk else "❌ Account not found."

                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/editMessageText",
                              json={"chat_id": chat_id, "message_id": message_id, "text": msg_unlinked,
                                    "parse_mode": "HTML"})
                return {"status": "ok"}

            # 🔥 РЕФЕРАЛЬНА ПРОГРАМА 🔥
            elif action_data == "ref_menu":
                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                              json={"callback_query_id": callback["id"]})
                if user_in_db:
                    ref_link = f"{FRONTEND_URL}/register?ref={user_in_db.username}"
                    text = (f"🤝 <b>Реферальна програма</b>\n\n"
                            f"👥 Запрошено друзів: <b>{user_in_db.referral_count}</b>\n"
                            f"💰 Зароблено з них: <b>${user_in_db.referral_earnings:.2f}</b>\n\n"
                            f"🔗 <b>Ваше посилання для запрошення:</b>\n<code>{ref_link}</code>\n\n"
                            f"<i>Відправляйте це посилання друзям. Коли вони зареєструються та зроблять покупку, ви автоматично отримаєте відсоток на свій баланс!</i>") if is_uk else \
                        (f"🤝 <b>Referral Program</b>\n\n"
                         f"👥 Friends invited: <b>{user_in_db.referral_count}</b>\n"
                         f"💰 Earned from them: <b>${user_in_db.referral_earnings:.2f}</b>\n\n"
                         f"🔗 <b>Your invite link:</b>\n<code>{ref_link}</code>\n\n"
                         f"<i>Send this link to your friends. When they register and make a purchase, you automatically get a percentage to your balance!</i>")

                    kb = {"inline_keyboard": [[{"text": "🔙 Назад у профіль" if is_uk else "🔙 Back to Profile",
                                                "callback_data": "profile_menu"}]]}
                    requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/editMessageText",
                                  json={"chat_id": chat_id, "message_id": message_id, "text": text,
                                        "parse_mode": "HTML", "reply_markup": kb})
                return {"status": "ok"}

            # 🔥 МЕНЮ ДОПОМОГИ (КНОПКА) 🔥
            elif action_data == "help_menu":
                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                              json={"callback_query_id": callback["id"]})
                safe_url = FRONTEND_URL if FRONTEND_URL.startswith("http") else f"https://{FRONTEND_URL}"
                if "localhost" in safe_url or "127.0.0.1" in safe_url: safe_url = "https://t.me"

                if is_uk:
                    help_text = (
                        "🤖 <b>Довідка та Команди</b>\n\n"
                        "🔸 /start — Головне меню бота\n"
                        "🔸 /profile — Ваш баланс, реферальна програма та налаштування\n"
                        "🔸 /help — Ця інструкція\n\n"
                        "🛒 <b>Як зробити замовлення?</b>\n"
                        "Після того, як ви натиснете кнопку «Купити» (Buy) на вітрині, для вас буде створено окремий тікет (чат). Як тільки адміністратор звільниться, він відповість вам туди та оформить ваше замовлення.\n\n"
                        "🔗 <b>Як прив'язати акаунт?</b>\n"
                        "1. Перейдіть на сайт у розділ 'Профіль'.\n"
                        "2. Натисніть кнопку «Прив'язати».\n"
                        "3. Вас перенаправить у цей бот — просто натисніть «Start»."
                    )
                    btn_text = "🌐 Перейти на сайт"
                else:
                    help_text = (
                        "🤖 <b>Help & Commands</b>\n\n"
                        "🔸 /start — Main bot menu\n"
                        "🔸 /profile — Your balance, referral program, and settings\n"
                        "🔸 /help — This guide\n\n"
                        "🛒 <b>How to make an order?</b>\n"
                        "After you click the «Buy» button on the storefront, a separate ticket (chat) will be created for you. As soon as the admin is free, they will reply there and process your order.\n\n"
                        "🔗 <b>How to link your account?</b>\n"
                        "1. Go to your Profile on the website.\n"
                        "2. Click the «Link» button.\n"
                        "3. You will be redirected to this bot — just click «Start»."
                    )
                    btn_text = "🌐 Go to Website"

                kb = {"inline_keyboard": [[{"text": btn_text, "url": safe_url}]]}
                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/editMessageText",
                              json={"chat_id": chat_id, "message_id": message_id, "text": help_text,
                                    "parse_mode": "HTML", "reply_markup": kb})
                return {"status": "ok"}

            # 🔥 МЕНЮ ПРОФІЛЮ 🔥
            elif action_data == "profile_menu":
                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                              json={"callback_query_id": callback["id"]})
                if user_in_db:
                    text_prof = f"👤 Ваш акаунт: <b>{user_in_db.username}</b>\n💳 Баланс: <b>${user_in_db.balance:.2f}</b>" if is_uk else f"👤 Account: <b>{user_in_db.username}</b>\n💳 Balance: <b>${user_in_db.balance:.2f}</b>"
                    keyboard = {"inline_keyboard": [
                        [{"text": "🪙 Поповнити баланс" if is_uk else "🪙 Top Up Balance",
                          "callback_data": "topup_start"}],
                        [{"text": "🎟 Ввести промокод" if is_uk else "🎟 Enter Promo Code",
                          "callback_data": "enter_promo_profile"}],
                        [{"text": "🤝 Моя рефералка" if is_uk else "🤝 My Referral", "callback_data": "ref_menu"}],
                        [{"text": "❌ Відв'язати акаунт" if is_uk else "❌ Unlink Account",
                          "callback_data": "unlink_acc"}]
                    ]}
                    requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/editMessageText",
                                  json={"chat_id": chat_id, "message_id": message_id, "text": text_prof,
                                        "parse_mode": "HTML", "reply_markup": keyboard})
                else:
                    text_err = "❌ Ви не прив'язані. Перейдіть на сайт у свій Профіль, щоб прив'язати Telegram." if is_uk else "❌ You are not linked. Go to your Profile on the website to link your Telegram."
                    requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                  json={"chat_id": chat_id, "text": text_err, "parse_mode": "HTML"})
                return {"status": "ok"}

            # 🔥 ВВІД ПРОМОКОДУ З ПРОФІЛЮ 🔥
            elif action_data == "enter_promo_profile":
                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                              json={"callback_query_id": callback["id"]})
                USER_STATES[chat_id_str] = {"step": "wait_profile_promo"}
                text = "🎟 <b>Введіть ваш промокод:</b>\n<i>(Якщо це промокод на баланс, він одразу поповнить рахунок)</i>" if is_uk else "🎟 <b>Enter your promo code:</b>\n<i>(If it's a balance promo, it will top up your account)</i>"
                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                              json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"})
                return {"status": "ok"}

            # 🔥 ПРОМОКОД ПІД ЧАС КУПІВЛІ ТОВАРУ 🔥
            elif action_data == "enter_promo":
                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                              json={"callback_query_id": callback["id"]})
                if chat_id_str not in USER_STATES or USER_STATES[chat_id_str]["step"] != "ready_to_pay":
                    return {"status": "ok"}
                USER_STATES[chat_id_str]["step"] = "wait_promo"
                text = "🎟 <b>Введіть промокод на знижку:</b>" if is_uk else "🎟 <b>Enter discount promo code:</b>"
                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                              json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"})
                return {"status": "ok"}

            elif action_data.startswith("admin_"):
                parts = action_data.replace("admin_", "").rsplit("_", 1)
                new_status = parts[0]
                order_id = int(parts[1])
                success, msg = _process_order_status_change(db, order_id, new_status)

                if TELEGRAM_BOT_TOKEN:
                    requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                                  json={"callback_query_id": callback["id"],
                                        "text": "✅ Змінено!" if success else f"❌ Помилка: {msg}"})
                    if success:
                        db_order = db.query(models.OrderDB).filter(models.OrderDB.id == order_id).first()
                        from utils import generate_short_status_message
                        short_msg = generate_short_status_message(db_order, new_status, worker_mention, is_uk=True)

                        keyboard = None
                        if new_status == "paid_processing":
                            keyboard = {"inline_keyboard": [
                                [{"text": "🚚 Товар видано", "callback_data": f"admin_delivered_{order_id}"}],
                                [{"text": "🔴 Скасувати (Повернення)", "callback_data": f"admin_cancelled_{order_id}"}]
                            ]}
                        elif new_status == "delivered":
                            keyboard = {"inline_keyboard": [
                                [{"text": "🔴 Скасувати (Повернення)", "callback_data": f"admin_cancelled_{order_id}"}]]}

                        requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/editMessageText",
                                      json={"chat_id": chat_id, "message_id": message_id, "text": short_msg,
                                            "parse_mode": "HTML", "reply_markup": keyboard if keyboard else {}})

            elif action_data.startswith("client_confirm_"):
                order_id = int(action_data.replace("client_confirm_", ""))
                success, msg = _process_order_status_change(db, order_id, "completed", confirmed_by_user=True)

                if success:
                    db_order = db.query(models.OrderDB).filter(models.OrderDB.id == order_id).first()
                    from utils import generate_receipt_text
                    receipt_msg = generate_receipt_text(db_order, is_uk=is_uk)

                    requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                                  json={"callback_query_id": callback["id"],
                                        "text": "✅ Замовлення підтверджено!" if is_uk else "✅ Order confirmed!"})
                    requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/editMessageText",
                                  json={"chat_id": chat_id, "message_id": message_id, "text": receipt_msg,
                                        "parse_mode": "HTML"})
                else:
                    requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                                  json={"callback_query_id": callback["id"], "text": f"❌ Error: {msg}"})

            # 🔥 ГЛОБАЛЬНА ФІНАЛЬНА ОПЛАТА 🔥
            elif action_data.startswith("statepay_"):
                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                              json={"callback_query_id": callback["id"]})
                pay_method = action_data.split("_")[1]

                if chat_id_str not in USER_STATES or USER_STATES[chat_id_str]["step"] != "ready_to_pay":
                    text_expired = "❌ Сесія застаріла. Будь ласка, оберіть товар на вітрині ще раз." if is_uk else "❌ Session expired. Please select the product on the storefront again."
                    requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                  json={"chat_id": chat_id, "text": text_expired})
                    return {"status": "ok"}

                state = USER_STATES[chat_id_str]
                item_name = state["item_name"]
                total_price = state.get("final_price", state.get("price", 0.0))

                user = user_in_db
                if pay_method == "bal":
                    if not user or user.balance < total_price:
                        text_no_money = "❌ Недостатньо коштів на балансі." if is_uk else "❌ Insufficient balance."
                        requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                      json={"chat_id": chat_id, "text": text_no_money})
                        return {"status": "ok"}

                    new_bal = float(user.balance) - float(total_price)
                    db.query(models.UserDB).filter(models.UserDB.id == user.id).update({"balance": new_bal},
                                                                                       synchronize_session=False)

                    initial_status = "paid_processing"
                    pay_text = "З балансу / Balance"
                else:
                    initial_status = "awaiting_payment"
                    pay_text = "Готівка (чат) / Cash"

                if is_uk:
                    details_text = f"💎 Кількість: {state.get('amount')} шт." if state[
                                                                                    "item_group"] == "gem" else f"📦 Список товарів:\n{state.get('custom_text')}" if \
                    state["item_group"] == "oth" else "Дані в чаті"
                else:
                    details_text = f"💎 Amount: {state.get('amount')} pcs." if state[
                                                                                  "item_group"] == "gem" else f"📦 Item list:\n{state.get('custom_text')}" if \
                    state["item_group"] == "oth" else "Data in chat"

                cart = [{"type": "telegram_fast_buy", "price": total_price,
                         "product": {"id": state["item_id"], "name": item_name}, "userData": {"details": details_text},
                         "_tg_chat_id": chat_id, "_lang": user_lang_tg}]

                # 🔥 ЗБЕРІГАЄМО ПРОМОКОД ДЛЯ АДМІНКИ 🔥
                promo_applied = state.get("promo_code")
                if promo_applied:
                    cart.append({"_meta_promo": True, "promo_code": promo_applied})
                    promo_db = db.query(models.PromoCodeDB).filter(models.PromoCodeDB.code == promo_applied).first()
                    if promo_db:
                        promo_db.current_uses += 1

                new_order = models.OrderDB(user_id=user.id if user else None, cart_data=json.dumps(cart),
                                           payment_method=pay_text, total=str(total_price), profit="0",
                                           status=initial_status)
                db.add(new_order)
                db.commit()
                db.refresh(new_order)

                if TELEGRAM_FORUM_CHAT_ID:
                    buyer_name = user.username if user else clicker_name
                    res = requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/createForumTopic",
                                        json={"chat_id": TELEGRAM_FORUM_CHAT_ID,
                                              "name": f"#{new_order.id} {buyer_name}"}).json()
                    if res.get("ok"):
                        topic_id = res["result"]["message_thread_id"]
                        db.add(models.OrderTopicDB(order_id=new_order.id, topic_id=topic_id))
                        db.commit()

                        keyboard = {"inline_keyboard": [[{"text": "🟢 Оплачено (В роботу)",
                                                          "callback_data": f"admin_paid_processing_{new_order.id}"}],
                                                        [{"text": "🚚 Товар видано",
                                                          "callback_data": f"admin_delivered_{new_order.id}"}],
                                                        [{"text": "🔴 Скасувати",
                                                          "callback_data": f"admin_cancelled_{new_order.id}"}]]}

                        details_admin = f"💎 Кількість: {state.get('amount')} шт." if state[
                                                                                         "item_group"] == "gem" else f"📦 Список товарів:\n{state.get('custom_text')}" if \
                        state["item_group"] == "oth" else ""
                        promo_admin = f"\n🎟 <b>Промокод:</b> {promo_applied}" if promo_applied else ""
                        msg_admin = f"<b>ЗАМОВЛЕННЯ #{new_order.id}</b>\n💳 <b>Оплата:</b> {pay_text}\n💰 <b>Сума:</b> ${total_price}{promo_admin}\n👤 <b>Покупець:</b> {buyer_name}\n\n🛒 <b>Товар:</b>\n1. {item_name} | ${total_price}\n{details_admin}\n\n🔸 <i>Очікуємо дані від клієнта.</i>"

                        res_msg = requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                                json={"chat_id": TELEGRAM_FORUM_CHAT_ID, "message_thread_id": topic_id,
                                                      "text": msg_admin, "parse_mode": "HTML",
                                                      "reply_markup": keyboard}).json()

                        if res_msg.get("ok"):
                            requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/unpinChatMessage",
                                          json={"chat_id": TELEGRAM_FORUM_CHAT_ID,
                                                "message_id": res_msg["result"]["message_id"]})

                if is_uk:
                    success_msg = f"✅ <b>Замовлення #{new_order.id} створено!</b>\n💰 Списано: ${total_price}\n\n" if pay_method == "bal" else f"✅ <b>Замовлення #{new_order.id} створено!</b>\n💳 Очікуємо на оплату (Адмін надішле реквізити).\n\n"
                    success_msg += "👇 <b>Напишіть ваші дані (ID акаунта, координати або гільдію) прямо в цей чат!</b>"
                else:
                    success_msg = f"✅ <b>Order #{new_order.id} created!</b>\n💰 Paid: ${total_price}\n\n" if pay_method == "bal" else f"✅ <b>Order #{new_order.id} created!</b>\n💳 Awaiting payment (Admin will send details).\n\n"
                    success_msg += "👇 <b>Please write your data (Account ID, coordinates or guild) directly in this chat!</b>"

                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                              json={"chat_id": chat_id, "text": success_msg, "parse_mode": "HTML"})
                del USER_STATES[chat_id_str]


        # === 2. ОБРОБКА ПОВІДОМЛЕНЬ ===
        elif "message" in data:
            msg = data["message"]
            chat_id = str(msg["chat"]["id"])
            chat_type = msg["chat"].get("type", "")

            text = msg.get("text") or msg.get("caption") or ""
            photo_file_id = None

            if "photo" in msg and len(msg["photo"]) > 0:
                photo_file_id = msg["photo"][-1]["file_id"]

            if not text and not photo_file_id:
                if any(k in msg for k in ("sticker", "document", "video", "voice")):
                    text = "[Вкладення]"

            # А) Повідомлення від АДМІНА у Форумі (Пересилаємо клієнту!)
            if chat_id == str(TELEGRAM_FORUM_CHAT_ID) and "message_thread_id" in msg:
                topic = db.query(models.OrderTopicDB).filter(
                    models.OrderTopicDB.topic_id == msg["message_thread_id"]).first()
                if topic:
                    order = db.query(models.OrderDB).filter(models.OrderDB.id == topic.order_id).first()
                    is_secret = False
                    send_text = text

                    if send_text.startswith("!"):
                        is_secret = True
                        send_text = send_text[1:].strip()

                    db_text = f"[Фото] {send_text}" if photo_file_id else send_text
                    db.add(models.TicketMessageDB(order_id=topic.order_id, sender="admin", text=db_text,
                                                  is_secret=is_secret))
                    db.commit()

                    if order:
                        target_chat_id = None
                        if order.user_id:
                            buyer = db.query(models.UserDB).filter(models.UserDB.id == order.user_id).first()
                            if buyer and buyer.telegram_chat_id: target_chat_id = buyer.telegram_chat_id

                        if not target_chat_id:
                            try:
                                cart_data = json.loads(order.cart_data)
                                for item in cart_data:
                                    if item.get("_tg_chat_id"):
                                        target_chat_id = item["_tg_chat_id"]
                                        break
                            except Exception:
                                pass

                        if target_chat_id:
                            is_uk_client = False
                            buyer_in_db = db.query(models.UserDB).filter(
                                models.UserDB.telegram_chat_id == target_chat_id).first()
                            if buyer_in_db and getattr(buyer_in_db, "language", None):
                                is_uk_client = buyer_in_db.language == "uk"

                            prefix = "🤫 <b>Реквізити для оплати:</b>" if is_secret else "👨‍💻 <b>Адміністратор:</b>"
                            if not is_uk_client: prefix = "🤫 <b>Payment details:</b>" if is_secret else "👨‍💻 <b>Administrator:</b>"

                            final_msg_text = f"{prefix}\n{send_text}" if send_text else prefix

                            if photo_file_id:
                                res_tg = requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto",
                                                       json={"chat_id": target_chat_id, "photo": photo_file_id,
                                                             "caption": final_msg_text, "parse_mode": "HTML"}).json()
                            else:
                                res_tg = requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                                       json={"chat_id": target_chat_id, "text": final_msg_text,
                                                             "parse_mode": "HTML"}).json()

                            if is_secret and res_tg.get("ok"):
                                try:
                                    client_msg_id = res_tg["result"]["message_id"]
                                    c_data = json.loads(order.cart_data)
                                    if len(c_data) > 0:
                                        if "_secret_msg_ids" not in c_data[0]: c_data[0]["_secret_msg_ids"] = []
                                        c_data[0]["_secret_msg_ids"].append(client_msg_id)
                                        order.cart_data = json.dumps(c_data)
                                        db.commit()
                                except Exception:
                                    pass

            # Б) Повідомлення від КЛІЄНТА в особистих
            elif chat_type == "private":
                text_lower = text.strip().lower()
                parts = text.split(" ")

                if text_lower.startswith("/start"):
                    if len(parts) > 1 and parts[1].startswith("link_"):
                        token = parts[1].replace("link_", "").strip()
                        user_id = LINK_TOKENS.get(token)

                        if user_id:
                            db_user = db.query(models.UserDB).filter(models.UserDB.id == user_id).first()
                            if db_user:
                                db_user.telegram_chat_id = chat_id
                                if not getattr(db_user, "language", None):
                                    db_user.language = "uk" if is_uk else "en"
                                db.commit()

                                text_linked = (
                                    f"✅ <b>Ваш акаунт ({db_user.username}) успішно прив'язано до Telegram!</b>\n"
                                    f"💳 Ваш баланс: <b>${db_user.balance:.2f}</b>\n\n"
                                    "Тепер ви можете оплачувати замовлення з балансу прямо тут!"
                                    if is_uk else
                                    f"✅ <b>Your account ({db_user.username}) has been successfully linked!</b>\n"
                                    f"💳 Your balance: <b>${db_user.balance:.2f}</b>\n\n"
                                    "You can now make payments directly here!"
                                )
                                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                              json={"chat_id": chat_id, "text": text_linked, "parse_mode": "HTML"})
                                del LINK_TOKENS[token]
                            else:
                                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                              json={"chat_id": chat_id,
                                                    "text": "❌ Користувача не знайдено." if is_uk else "❌ User not found."})
                        else:
                            err_txt = "❌ Посилання недійсне або застаріло. Згенеруйте нове на сайті." if is_uk else "❌ Link is invalid or expired. Please generate a new one on the website."
                            requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                          json={"chat_id": chat_id, "text": err_txt})
                        return {"status": "ok"}

                    elif len(parts) > 1 and parts[1].startswith("buy_"):
                        payload = parts[1]
                        payload_parts = payload.split("_")
                        item_group = payload_parts[1] if len(payload_parts) > 1 else ""

                        try:
                            item_id = int(payload_parts[2]) if len(payload_parts) > 2 else None
                        except ValueError:
                            item_id = None

                        if item_group == "coins":
                            safe_url = FRONTEND_URL if FRONTEND_URL.startswith("http") else f"https://{FRONTEND_URL}"
                            text_coins = "🪙 <b>Поповнення балансу</b>\nВкажіть бажану суму поповнення на нашому сайті:" if is_uk else "🪙 <b>Top Up Balance</b>\nEnter the desired amount on our website:"
                            requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                          json={"chat_id": chat_id, "text": text_coins, "parse_mode": "HTML",
                                                "reply_markup": {"inline_keyboard": [
                                                    [{"text": "🌐 Перейти до поповнення" if is_uk else "🌐 Go to Top Up",
                                                      "url": safe_url}]]}})
                            return {"status": "ok"}

                        if item_group == "gem":
                            db_item = db.query(models.GemDB).filter(models.GemDB.id == item_id).first()
                            if db_item:
                                USER_STATES[chat_id] = {"step": "wait_gem_amount", "item_id": item_id,
                                                        "rate": float(db_item.rate), "item_group": "gem",
                                                        "item_name": f"Gems / Сапфіри ({db_item.range})"}
                                text_gem = "💎 <b>Вкажіть бажану кількість сапфірів</b>\n\nНапишіть цифрою (наприклад: <code>100000</code> або <code>200k</code>)." if is_uk else "💎 <b>Enter desired amount of Gems</b>\n\nType a number (e.g., <code>100000</code> or <code>200k</code>)."
                                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                              json={"chat_id": chat_id, "text": text_gem, "parse_mode": "HTML"})
                                return {"status": "ok"}

                        if item_group == "oth":
                            db_item = db.query(models.OtherItemDB).filter(models.OtherItemDB.id == item_id).first()
                            if db_item:
                                USER_STATES[chat_id] = {"step": "wait_oth_text", "item_id": item_id,
                                                        "price": float(db_item.price), "item_group": "oth",
                                                        "item_name": db_item.name}
                                text_oth = f"📦 <b>{db_item.name}</b>\n\nНапишіть в одному повідомленні (текстом), які саме товари з цього набору ви бажаєте отримати:" if is_uk else f"📦 <b>{db_item.name}</b>\n\nPlease write in one message which specific items from this set you want:"
                                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                              json={"chat_id": chat_id, "text": text_oth, "parse_mode": "HTML"})
                                return {"status": "ok"}

                        # Швидка покупка для акаунтів та ресурсів
                        item_name, total_price = "", 0.0
                        if item_group == "acc":
                            db_item = db.query(models.AccountDB).filter(models.AccountDB.id == item_id).first()
                            if db_item: item_name, total_price = db_item.title, float(db_item.price)
                        elif item_group == "res":
                            db_item = db.query(models.ResourceDB).filter(models.ResourceDB.id == item_id).first()
                            if db_item: item_name, total_price = db_item.name, float(db_item.price)

                        if not item_name:
                            requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                          json={"chat_id": chat_id,
                                                "text": "❌ Товар не знайдено." if is_uk else "❌ Item not found."})
                            return {"status": "ok"}

                        # Формуємо єдиний стейт для всіх товарів
                        USER_STATES[chat_id_str] = {
                            "step": "ready_to_pay",
                            "item_group": item_group,
                            "item_id": item_id,
                            "item_name": item_name,
                            "final_price": total_price,
                            "original_price": total_price
                        }

                        kb = get_checkout_markup(user_in_db, total_price, False, is_uk)
                        text_order = f"🛍 <b>Оформлення замовлення</b>\n\nВи обрали: <b>{item_name}</b>\n💰 Сума: <b>${total_price:.2f}</b>\n\nОберіть спосіб оплати:" if is_uk else f"🛍 <b>Checkout</b>\n\nYou selected: <b>{item_name}</b>\n💰 Total: <b>${total_price:.2f}</b>\n\nChoose payment method:"
                        requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                      json={"chat_id": chat_id, "text": text_order, "parse_mode": "HTML",
                                            "reply_markup": kb})
                        return {"status": "ok"}

                    else:
                        welcome_text = "👋 <b>Вітаємо у Lords Shop!</b>\n\nЩоб зробити замовлення, перейдіть до нашої вітрини та натисніть кнопку «Купити» під потрібним товаром." if is_uk else "👋 <b>Welcome to Lords Shop!</b>\n\nTo make an order, go to our storefront and click «Buy» under the desired item."
                        btn_lang = "🌍 Change language (EN)" if is_uk else "🌍 Змінити мову (UK)"
                        if user_in_db:
                            welcome_text += f"\n\n👤 Ваш акаунт: <b>{user_in_db.username}</b>\n💳 Баланс: <b>${user_in_db.balance:.2f}</b>" if is_uk else f"\n\n👤 Your account: <b>{user_in_db.username}</b>\n💳 Balance: <b>${user_in_db.balance:.2f}</b>"

                        # Оновлене головне меню з інлайн-кнопками
                        keyboard = {"inline_keyboard": [
                            [{"text": "👤 Профіль / Profile", "callback_data": "profile_menu"},
                             {"text": "❓ Допомога / Help", "callback_data": "help_menu"}],
                            [{"text": "🎟 Ввести промокод / Promo Code", "callback_data": "enter_promo_profile"}],
                            [{"text": btn_lang, "callback_data": "change_lang"}]
                        ]}
                        requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                      json={"chat_id": chat_id, "text": welcome_text, "parse_mode": "HTML",
                                            "reply_markup": keyboard})
                        return {"status": "ok"}

                elif text_lower in ["/profile", "/balance", "профіль", "баланс", "profile", "balance"]:
                    if user_in_db:
                        text_prof = f"👤 Ваш акаунт: <b>{user_in_db.username}</b>\n💳 Баланс: <b>${user_in_db.balance:.2f}</b>" if is_uk else f"👤 Account: <b>{user_in_db.username}</b>\n💳 Balance: <b>${user_in_db.balance:.2f}</b>"
                        keyboard = {"inline_keyboard": [
                            [{"text": "🪙 Поповнити баланс" if is_uk else "🪙 Top Up Balance",
                              "callback_data": "topup_start"}],
                            [{"text": "🎟 Ввести промокод" if is_uk else "🎟 Enter Promo Code",
                              "callback_data": "enter_promo_profile"}],
                            [{"text": "🤝 Моя рефералка" if is_uk else "🤝 My Referral", "callback_data": "ref_menu"}],
                            [{"text": "❌ Відв'язати акаунт" if is_uk else "❌ Unlink Account",
                              "callback_data": "unlink_acc"}]
                        ]}
                        requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                      json={"chat_id": chat_id, "text": text_prof, "parse_mode": "HTML",
                                            "reply_markup": keyboard})
                    else:
                        text_err = "❌ Ви не прив'язані. Перейдіть на сайт у свій Профіль, щоб прив'язати Telegram." if is_uk else "❌ You are not linked. Go to your Profile on the website to link your Telegram."
                        requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                      json={"chat_id": chat_id, "text": text_err, "parse_mode": "HTML"})
                    return {"status": "ok"}

                elif text_lower in ["/help", "/menu", "допомога", "меню", "help"]:
                    safe_url = FRONTEND_URL if FRONTEND_URL.startswith("http") else f"https://{FRONTEND_URL}"
                    if "localhost" in safe_url or "127.0.0.1" in safe_url: safe_url = "https://t.me"

                    if is_uk:
                        help_text = (
                            "🤖 <b>Довідка та Команди</b>\n\n"
                            "🔸 /start — Головне меню бота\n"
                            "🔸 /profile — Ваш баланс, реферальна програма та налаштування\n"
                            "🔸 /help — Ця інструкція\n\n"
                            "🛒 <b>Як зробити замовлення?</b>\n"
                            "Після того, як ви натиснете кнопку «Купити» (Buy) на вітрині, для вас буде створено окремий тікет (чат). Як тільки адміністратор звільниться, він відповість вам туди та оформить ваше замовлення.\n\n"
                            "🔗 <b>Як прив'язати акаунт?</b>\n"
                            "1. Перейдіть на сайт у розділ 'Профіль'.\n"
                            "2. Натисніть кнопку «Прив'язати».\n"
                            "3. Вас перенаправить у цей бот — просто натисніть «Start»."
                        )
                        btn_text = "🌐 Перейти на сайт"
                    else:
                        help_text = (
                            "🤖 <b>Help & Commands</b>\n\n"
                            "🔸 /start — Main bot menu\n"
                            "🔸 /profile — Your balance, referral program, and settings\n"
                            "🔸 /help — This guide\n\n"
                            "🛒 <b>How to make an order?</b>\n"
                            "After you click the «Buy» button on the storefront, a separate ticket (chat) will be created for you. As soon as the admin is free, they will reply there and process your order.\n\n"
                            "🔗 <b>How to link your account?</b>\n"
                            "1. Go to your Profile on the website.\n"
                            "2. Click the «Link» button.\n"
                            "3. You will be redirected to this bot — just click «Start»."
                        )
                        btn_text = "🌐 Go to Website"

                    kb = {"inline_keyboard": [[{"text": btn_text, "url": safe_url}]]}
                    requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                  json={"chat_id": chat_id, "text": help_text, "parse_mode": "HTML",
                                        "reply_markup": kb})
                    return {"status": "ok"}

                elif chat_id in USER_STATES:
                    state = USER_STATES[chat_id]
                    user = user_in_db

                    if state["step"] == "wait_topup_amount":
                        try:
                            amount = float(text.replace(',', '.').strip())
                            if amount < 1: raise ValueError()

                            cart = [{
                                "type": "topup", "coins": amount, "price": amount,
                                "product": {"id": 0,
                                            "title": f"Поповнення балансу: ${amount:.2f}" if is_uk else f"Balance Top-up: ${amount:.2f}"},
                                "userData": {"details": "Дані в чаті / Data in chat"},
                                "_tg_chat_id": chat_id, "_lang": user_lang_tg
                            }]

                            new_order = models.OrderDB(user_id=user.id, cart_data=json.dumps(cart),
                                                       payment_method="Готівка/Крипта (чат)" if is_uk else "Cash/Crypto (chat)",
                                                       total=str(amount), profit="0", status="awaiting_payment")
                            db.add(new_order)
                            db.commit()
                            db.refresh(new_order)

                            if TELEGRAM_FORUM_CHAT_ID:
                                buyer_name = escape_html(user.username) if user else "Клієнт"
                                res = requests.post(
                                    f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/createForumTopic",
                                    json={"chat_id": TELEGRAM_FORUM_CHAT_ID,
                                          "name": f"#{new_order.id} {buyer_name}"}).json()
                                if res.get("ok"):
                                    topic_id = res["result"]["message_thread_id"]
                                    db.add(models.OrderTopicDB(order_id=new_order.id, topic_id=topic_id))
                                    db.commit()

                                    keyboard_admin = {"inline_keyboard": [[{"text": "✅ Оплачено (Нарахувати)",
                                                                            "callback_data": f"admin_completed_{new_order.id}"}],
                                                                          [{"text": "🔴 Скасувати",
                                                                            "callback_data": f"admin_cancelled_{new_order.id}"}]]}
                                    msg_admin = f"<b>ПОПОВНЕННЯ БАЛАНСУ #{new_order.id}</b>\n👤 <b>Клієнт:</b> {buyer_name}\n💰 <b>Сума:</b> ${amount:.2f}\n\n🔸 <i>Надішліть клієнту реквізити в цей чат. Після оплати натисніть «Оплачено», і баланс автоматично нарахується.</i>"
                                    res_msg = requests.post(
                                        f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                        json={"chat_id": TELEGRAM_FORUM_CHAT_ID, "message_thread_id": topic_id,
                                              "text": msg_admin, "parse_mode": "HTML",
                                              "reply_markup": keyboard_admin}).json()

                                    if res_msg.get("ok"):
                                        requests.post(
                                            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/unpinChatMessage",
                                            json={"chat_id": TELEGRAM_FORUM_CHAT_ID,
                                                  "message_id": res_msg["result"]["message_id"]})

                            success_msg = f"✅ <b>Заявка #{new_order.id} на поповнення створена!</b>\nСума: ${amount:.2f}\n\n💳 <i>Очікуйте, адміністратор надішле реквізити для оплати в цей чат.</i>" if is_uk else f"✅ <b>Top-up request #{new_order.id} created!</b>\nAmount: ${amount:.2f}\n\n💳 <i>Please wait, admin will send payment details here.</i>"
                            requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                          json={"chat_id": chat_id, "text": success_msg, "parse_mode": "HTML"})
                            del USER_STATES[chat_id]

                        except ValueError:
                            requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                          json={"chat_id": chat_id,
                                                "text": "❌ Введіть коректну суму (мінімум 1)." if is_uk else "❌ Enter a valid amount (minimum 1)."})
                        return {"status": "ok"}

                    elif state["step"] == "wait_gem_amount":
                        try:
                            amt_str = text.lower().replace("k", "000").replace("к", "000").replace(" ", "").replace(",",
                                                                                                                    "")
                            amount = int(amt_str)
                            if amount <= 0: raise ValueError()

                            if amount % 100000 != 0:
                                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                              json={"chat_id": chat_id,
                                                    "text": "❌ <b>Помилка!</b> Кількість має бути кратною <b>100,000</b>." if is_uk else "❌ <b>Error!</b> Amount must be a multiple of <b>100,000</b>.",
                                                    "parse_mode": "HTML"})
                                return {"status": "ok"}

                            final_price = round((amount / 100000.0) * state["rate"], 2)
                            USER_STATES[chat_id]["amount"] = amount
                            USER_STATES[chat_id]["final_price"] = final_price
                            USER_STATES[chat_id]["original_price"] = final_price
                            USER_STATES[chat_id]["step"] = "ready_to_pay"

                            kb = get_checkout_markup(user, final_price, False, is_uk)
                            calc_text = f"💎 <b>Розрахунок Сапфірів</b>\nВи купуєте: {amount:,} шт.\n\n💰 <b>Сума до сплати:</b> ${final_price:.2f}\n\nОберіть спосіб оплати:" if is_uk else f"💎 <b>Calculation</b>\nBuying: {amount:,} pcs.\n💰 <b>Total:</b> ${final_price:.2f}\n\nChoose payment method:"
                            requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                          json={"chat_id": chat_id, "text": calc_text, "parse_mode": "HTML",
                                                "reply_markup": kb})
                        except ValueError:
                            requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                          json={"chat_id": chat_id,
                                                "text": "❌ Будь ласка, введіть число (наприклад: 100000 або 200k)." if is_uk else "❌ Enter a valid number (e.g., 100k)."})
                        return {"status": "ok"}

                    elif state["step"] == "wait_oth_text":
                        final_price = state["price"]
                        USER_STATES[chat_id]["custom_text"] = text
                        USER_STATES[chat_id]["final_price"] = final_price
                        USER_STATES[chat_id]["original_price"] = final_price
                        USER_STATES[chat_id]["step"] = "ready_to_pay"

                        kb = get_checkout_markup(user, final_price, False, is_uk)
                        calc_text = f"📦 <b>Ваш список збережено!</b>\n\n💰 <b>Сума до сплати:</b> ${final_price:.2f}\n\nОберіть спосіб оплати:" if is_uk else f"📦 <b>Saved!</b>\n💰 <b>Total:</b> ${final_price:.2f}\n\nChoose payment method:"
                        requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                      json={"chat_id": chat_id, "text": calc_text, "parse_mode": "HTML",
                                            "reply_markup": kb})
                        return {"status": "ok"}

                    # 🔥 ЛОГІКА ПРОМОКОДІВ (ЗНИЖКА ЧИ БАЛАНС) 🔥
                    elif state["step"] == "wait_promo" or state["step"] == "wait_profile_promo":
                        promo_code = text.strip().upper()
                        promo = db.query(models.PromoCodeDB).filter(models.PromoCodeDB.code == promo_code).first()

                        is_valid = True
                        err_msg = ""
                        is_profile = state["step"] == "wait_profile_promo"
                        orig_price = state.get("original_price", state.get("final_price", 0.0))

                        if not promo or promo.is_active == 0:
                            is_valid, err_msg = False, "Промокод недійсний." if is_uk else "Invalid promo code."
                        elif promo.max_uses > 0 and promo.current_uses >= promo.max_uses:
                            is_valid, err_msg = False, "Ліміт використань вичерпано." if is_uk else "Usage limit reached."
                        elif promo.expiry_date and datetime.now() > datetime.fromisoformat(promo.expiry_date):
                            is_valid, err_msg = False, "Термін дії промокоду вийшов." if is_uk else "Promo code expired."
                        elif not is_profile and orig_price < promo.min_order_amount:
                            is_valid, err_msg = False, f"Мінімальна сума для цього коду: ${promo.min_order_amount}" if is_uk else f"Minimum order amount: ${promo.min_order_amount}"

                        if not is_valid:
                            requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                          json={"chat_id": chat_id, "text": f"❌ {err_msg}"})
                            if is_profile:
                                del USER_STATES[chat_id]
                            else:
                                USER_STATES[chat_id]["step"] = "ready_to_pay"
                            return {"status": "ok"}

                        # Якщо промокод ввели з профілю (Головного меню)
                        if is_profile:
                            if promo.target == "balance" or promo.type in ["balance", "coins", "topup"]:
                                if not user_in_db:
                                    err_text = "❌ Спочатку прив'яжіть акаунт на сайті!" if is_uk else "❌ Link your account on the website first!"
                                    requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                                  json={"chat_id": chat_id, "text": err_text})
                                else:
                                    user_in_db.balance += float(promo.value)
                                    promo.current_uses += 1
                                    db.commit()
                                    msg = f"✅ Промокод застосовано! Ваш баланс поповнено на <b>${float(promo.value):.2f}</b>\n💳 Поточний баланс: <b>${user_in_db.balance:.2f}</b>" if is_uk else f"✅ Promo code applied! Your balance was topped up by <b>${float(promo.value):.2f}</b>\n💳 Current balance: <b>${user_in_db.balance:.2f}</b>"
                                    requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                                  json={"chat_id": chat_id, "text": msg, "parse_mode": "HTML"})
                            else:
                                msg = "💡 Цей промокод дає знижку на товар! Введіть його під час оформлення замовлення (після натискання кнопки 'Купити')." if is_uk else "💡 This promo code gives a discount! Enter it during checkout (after clicking 'Buy')."
                                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                              json={"chat_id": chat_id, "text": msg, "parse_mode": "HTML"})
                            del USER_STATES[chat_id]

                        # Якщо промокод ввели під час оформлення замовлення (Знижка)
                        else:
                            if promo.target == "balance" or promo.type in ["balance", "coins", "topup"]:
                                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                              json={"chat_id": chat_id,
                                                    "text": "❌ Цей промокод тільки для поповнення балансу. Введіть його в головному меню." if is_uk else "❌ This promo is for balance top-up only. Enter it in the main menu."})
                                USER_STATES[chat_id]["step"] = "ready_to_pay"
                            else:
                                discount = orig_price * (
                                            float(promo.value) / 100) if promo.type == "percent" else float(promo.value)
                                new_price = max(0.0, orig_price - discount)

                                USER_STATES[chat_id]["final_price"] = new_price
                                USER_STATES[chat_id]["promo_code"] = promo.code
                                USER_STATES[chat_id]["step"] = "ready_to_pay"

                                success_txt = f"✅ Промокод застосовано! Знижка: <b>${discount:.2f}</b>" if is_uk else f"✅ Promo code applied! Discount: <b>${discount:.2f}</b>"
                                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                              json={"chat_id": chat_id, "text": success_txt, "parse_mode": "HTML"})

                                final_price = USER_STATES[chat_id]["final_price"]
                                item_name = USER_STATES[chat_id]["item_name"]
                                kb = get_checkout_markup(user, final_price, True, is_uk)
                                checkout_text = f"🛍 <b>Оформлення замовлення</b>\n\nВи обрали: <b>{item_name}</b>\n💰 До сплати: <b>${final_price:.2f}</b>\n\nОберіть спосіб оплати:" if is_uk else f"🛍 <b>Checkout</b>\n\nYou selected: <b>{item_name}</b>\n💰 To pay: <b>${final_price:.2f}</b>\n\nChoose payment method:"
                                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                              json={"chat_id": chat_id, "text": checkout_text, "parse_mode": "HTML",
                                                    "reply_markup": kb})
                        return {"status": "ok"}

                else:
                    latest_order = None
                    active_orders = db.query(models.OrderDB).filter(
                        models.OrderDB.status.in_(["new", "awaiting_payment", "paid_processing"])).order_by(
                        models.OrderDB.id.desc()).all()

                    for o in active_orders:
                        if user_in_db and o.user_id == user_in_db.id:
                            latest_order = o
                            break
                        try:
                            cart_data = json.loads(o.cart_data)
                            if any(item.get("_tg_chat_id") in [int(chat_id), str(chat_id)] for item in cart_data):
                                latest_order = o
                                break
                        except Exception:
                            pass

                    if latest_order:
                        topic = db.query(models.OrderTopicDB).filter(
                            models.OrderTopicDB.order_id == latest_order.id).first()
                        if topic:
                            final_msg_text = f"👤 <b>Клієнт:</b>\n{text}" if text else "👤 <b>Клієнт надіслав фото:</b>"
                            if photo_file_id:
                                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto",
                                              json={"chat_id": TELEGRAM_FORUM_CHAT_ID,
                                                    "message_thread_id": topic.topic_id, "photo": photo_file_id,
                                                    "caption": final_msg_text, "parse_mode": "HTML"})
                            else:
                                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                              json={"chat_id": TELEGRAM_FORUM_CHAT_ID,
                                                    "message_thread_id": topic.topic_id, "text": final_msg_text,
                                                    "parse_mode": "HTML"})

                            db.add(models.TicketMessageDB(order_id=latest_order.id, sender="user",
                                                          text=f"[Фото] {text}" if photo_file_id else text))
                            db.commit()
                    else:
                        no_orders_text = "У вас зараз немає активних замовлень 🤷‍♂️ Оберіть товар на вітрині, щоб почати." if is_uk else "You currently have no active orders 🤷‍♂️ Select a product on the storefront to start."
                        requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                      json={"chat_id": chat_id, "text": no_orders_text})

        return {"status": "ok"}
    except Exception as e:
        print("Webhook Error:", e)
        return {"status": "error"}


@router.get("/api/telegram/get-link")
def get_telegram_link(current_user: models.UserDB = Depends(get_current_user)):
    token = uuid.uuid4().hex[:10]
    LINK_TOKENS[token] = current_user.id
    return {"status": "success", "link": f"https://t.me/{get_bot_username()}?start=link_{token}"}


@router.post("/api/telegram/link")
def link_telegram(data: schemas.TelegramLinkData, db: Session = Depends(get_db)):
    user = db.query(models.UserDB).filter(models.UserDB.id == data.user_id).first()
    if not user: raise HTTPException(status_code=404)
    user.telegram_chat_id = data.chat_id
    db.commit()
    if TELEGRAM_BOT_TOKEN:
        try:
            requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                          json={"chat_id": data.chat_id,
                                "text": f"✅ <b>Account linked successfully! / Акаунт успішно прив'язано!</b>",
                                "parse_mode": "HTML"})
        except:
            pass
    return {"status": "success"}


BOT_USERNAME = None


def get_bot_username():
    global BOT_USERNAME
    if BOT_USERNAME: return BOT_USERNAME
    try:
        res = requests.get(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getMe").json()
        if res.get("ok"):
            BOT_USERNAME = res["result"]["username"]
            return BOT_USERNAME
    except:
        pass
    return "YOUR_BOT_NAME"


def tg_post_product(db: Session, item_group: str, item_id: int, title: str, desc: str, price: float,
                    image_urls: list = None):
    if not TELEGRAM_BOT_TOKEN or not STOREFRONT_CHAT_ID: return
    bot_link = f"https://t.me/{get_bot_username()}?start=buy_{item_group}_{item_id}"
    keyboard = {"inline_keyboard": [[{"text": "🛒 Купити / Buy", "url": bot_link}]]}
    msg_text = f"📦 <b>{escape_html(title)}</b>\n\n{desc}\n\n💰 <b>Ціна / Price:</b> ${price:.2f}"

    topic_id = {"acc": STOREFRONT_TOPIC_ACC, "gem": STOREFRONT_TOPIC_GEM, "res": STOREFRONT_TOPIC_RES,
                "oth": STOREFRONT_TOPIC_OTH, "coins": STOREFRONT_TOPIC_COINS}.get(item_group)

    try:
        image_urls = image_urls if isinstance(image_urls, list) else ([image_urls] if image_urls else [])
        main_image = image_urls[0] if len(image_urls) > 0 else None
        extra_images = image_urls[1:] if len(image_urls) > 1 else []

        res = None
        if main_image and "static/uploads/" in main_image:
            l_path = os.path.join("static", "uploads", main_image.split("/")[-1])
            if os.path.exists(l_path):
                payload = {"chat_id": STOREFRONT_CHAT_ID, "caption": msg_text, "parse_mode": "HTML",
                           "reply_markup": json.dumps(keyboard)}
                if topic_id: payload["message_thread_id"] = int(topic_id)
                with open(l_path, "rb") as f:
                    res = requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto", data=payload,
                                        files={"photo": f}).json()
        else:
            payload = {"chat_id": STOREFRONT_CHAT_ID, "text": msg_text, "parse_mode": "HTML", "reply_markup": keyboard}
            if topic_id: payload["message_thread_id"] = int(topic_id)
            res = requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage", json=payload).json()

        if res and res.get("ok"):
            main_msg_id = res["result"]["message_id"]
            db.add(models.StorefrontMessageDB(item_group=item_group, item_id=item_id, message_id=main_msg_id))
            db.commit()

            if extra_images:
                media_group, files = [], {}
                for i, img in enumerate(extra_images):
                    if "static/uploads/" in img:
                        l_path = os.path.join("static", "uploads", img.split("/")[-1])
                        if os.path.exists(l_path):
                            media_group.append({"type": "photo", "media": f"attach://photo{i}"})
                            files[f"photo{i}"] = open(l_path, "rb")
                if media_group:
                    payload = {"chat_id": STOREFRONT_CHAT_ID, "media": json.dumps(media_group),
                               "reply_to_message_id": main_msg_id}
                    if topic_id: payload["message_thread_id"] = int(topic_id)
                    res_mg = requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMediaGroup",
                                           data=payload, files=files).json()
                    if res_mg and res_mg.get("ok"):
                        for msg in res_mg["result"]: db.add(
                            models.StorefrontMessageDB(item_group=item_group, item_id=item_id,
                                                       message_id=msg["message_id"]))
                        db.commit()
                    for f in files.values(): f.close()
    except Exception as e:
        print("❌ Помилка публікації:", e)


def tg_delete_product(db: Session, item_group: str, item_id: int):
    for r in db.query(models.StorefrontMessageDB).filter_by(item_group=item_group, item_id=item_id).all():
        try:
            requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/deleteMessage",
                          json={"chat_id": STOREFRONT_CHAT_ID, "message_id": r.message_id})
        except:
            pass
        db.delete(r)
    db.commit()


def tg_delete_all_in_group(db: Session, item_group: str):
    for r in db.query(models.StorefrontMessageDB).filter_by(item_group=item_group).all():
        try:
            requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/deleteMessage",
                          json={"chat_id": STOREFRONT_CHAT_ID, "message_id": r.message_id})
        except:
            pass
        db.delete(r)
    db.commit()