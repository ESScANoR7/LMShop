from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import json
import requests
import os

from database import get_db
import models
import schemas
from utils import (
    get_current_admin, get_current_user, check_is_admin,
    escape_html, generate_receipt_text, generate_full_order_text
)

# Завантажуємо токени для розсилок в межах замовлень
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_FORUM_CHAT_ID = os.getenv("TELEGRAM_FORUM_CHAT_ID")

router = APIRouter(tags=["Orders"])


# ==========================================
# 🔥 ГЛОБАЛЬНА ЛОГІКА СТАТУСІВ ТА РЕФЕРАЛІВ 🔥
# ==========================================
def _process_order_status_change(db: Session, order_id: int, new_status: str, confirmed_by_user=False):
    db_order = db.query(models.OrderDB).filter(models.OrderDB.id == order_id).first()
    if not db_order:
        return False, "Замовлення не знайдено"

    old_status = db_order.status
    if old_status == new_status:
        return True, "Статус вже такий"

    db_order.status = new_status

    if new_status in ["completed", "cancelled"]:
        db.query(models.TicketMessageDB).filter(
            models.TicketMessageDB.order_id == order_id,
            models.TicketMessageDB.is_secret == True
        ).delete()

    target_chat_id = None
    buyer = db.query(models.UserDB).filter(models.UserDB.id == db_order.user_id).first() if db_order.user_id else None

    # Визначаємо мову клієнта та його TG ID
    is_uk_client = False
    try:
        cart_items = json.loads(db_order.cart_data)
        if cart_items and len(cart_items) > 0 and isinstance(cart_items[0], dict):
            if "_lang" in cart_items[0] and cart_items[0]["_lang"]:
                lang_code = str(cart_items[0]["_lang"]).strip().lower()
                is_uk_client = lang_code.startswith("uk")
            for item in cart_items:
                if item.get("_tg_chat_id"):
                    target_chat_id = item["_tg_chat_id"]
                    break
    except Exception:
        pass

    if buyer and buyer.telegram_chat_id:
        target_chat_id = buyer.telegram_chat_id

    # Видалення секретних повідомлень з чату клієнта
    if new_status in ["completed", "cancelled"] and target_chat_id:
        try:
            cart_items = json.loads(db_order.cart_data)
            secret_ids = cart_items[0].get("_secret_msg_ids", []) if cart_items else []
            for msg_id in secret_ids:
                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/deleteMessage",
                              json={"chat_id": target_chat_id, "message_id": msg_id})
        except Exception:
            pass

    title = f"Замовлення #{db_order.id} оновлено" if is_uk_client else f"Order #{db_order.id} updated"

    if new_status == "completed":
        msg = generate_receipt_text(db_order, is_uk_client)
        ntype = "success"
    elif new_status == "delivered":
        msg = f"🔔 <b>{title}</b>\n\n🚚 Ваше замовлення <b>ДОСТАВЛЕНО!</b> Будь ласка, перевірте товар та підтвердіть отримання, натиснувши кнопку нижче." if is_uk_client else f"🔔 <b>{title}</b>\n\n🚚 Your order is <b>DELIVERED!</b> Please check the item and confirm receipt by clicking the button below."
        ntype = "info"
    elif new_status == "paid_processing":
        msg = f"🔔 <b>{title}</b>\n\n🟢 Оплату отримано! Ваше замовлення взято в роботу. Очікуйте." if is_uk_client else f"🔔 <b>{title}</b>\n\n🟢 Payment received! Your order is in progress. Please wait."
        ntype = "info"
    elif new_status == "awaiting_payment":
        msg = f"🔔 <b>{title}</b>\n\n⏳ Замовлення створено. Очікуємо на вашу оплату." if is_uk_client else f"🔔 <b>{title}</b>\n\n⏳ Order created. Awaiting your payment."
        ntype = "warning"
    elif new_status == "cancelled":
        msg = f"🔔 <b>{title}</b>\n\n❌ На жаль, ваше замовлення було скасовано." if is_uk_client else f"🔔 <b>{title}</b>\n\n❌ Unfortunately, your order has been cancelled."
        ntype = "warning"
    else:
        msg = f"🔔 <b>{title}</b>\n\nСтатус замовлення змінено." if is_uk_client else f"🔔 <b>{title}</b>\n\nOrder status changed."

    if db_order.user_id:
        db.add(models.NotificationDB(user_id=db_order.user_id, title=title, message=msg, type=ntype))

    # Відправка статусу в Телеграм клієнта
    if target_chat_id and not confirmed_by_user:
        payload = {"chat_id": target_chat_id, "text": msg, "parse_mode": "HTML"}
        if new_status == "delivered":
            btn_text = "✅ Підтвердити отримання" if is_uk_client else "✅ Confirm receipt"
            payload["reply_markup"] = {"inline_keyboard": [
                [{"text": btn_text, "callback_data": f"client_confirm_{order_id}"}]]}

        res = requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage", json=payload)
        if not res.ok:
            print("❌ Помилка відправки статусу:", res.text)

    # Адмінам в форум шлемо підтвердження
    if confirmed_by_user and new_status == "completed" and TELEGRAM_BOT_TOKEN and TELEGRAM_FORUM_CHAT_ID:
        topic = db.query(models.OrderTopicDB).filter(models.OrderTopicDB.order_id == order_id).first()
        if topic:
            requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                          json={"chat_id": TELEGRAM_FORUM_CHAT_ID, "message_thread_id": topic.topic_id,
                                "text": f"✅ <b>Клієнт підтвердив отримання!</b>\nЗамовлення #{db_order.id} успішно закрито.",
                                "parse_mode": "HTML"})

    # Нарахування зарплати воркеру
    if new_status == "completed" and old_status != "completed":
        assignment = db.query(models.OrderAssignmentDB).filter(models.OrderAssignmentDB.order_id == order_id).first()
        if assignment and not assignment.is_credited:
            worker_acc = db.query(models.WorkerAccountingDB).filter(
                models.WorkerAccountingDB.worker_name == assignment.worker_name).first()
            if not worker_acc:
                worker_acc = models.WorkerAccountingDB(worker_name=assignment.worker_name, current_unpaid=0.0,
                                                       total_paid=0.0)
                db.add(worker_acc)
            worker_acc.current_unpaid += assignment.cost_amount
            assignment.is_credited = True

    pm_lower = str(db_order.payment_method).lower()
    is_balance_payment = any(
        w in pm_lower for w in ["balance", "wallet", "з балансу", "from balance", "гаманець", "coins", "баланс"])

    # Повернення коштів при скасуванні
    if new_status == "cancelled" and old_status != "cancelled":
        if is_balance_payment and buyer:
            new_bal = float(buyer.balance) + float(db_order.total)
            db.query(models.UserDB).filter(models.UserDB.id == buyer.id).update({"balance": new_bal},
                                                                                synchronize_session=False)

    # Фінанси при успішному виконанні
    if new_status == "completed" and old_status != "completed" and buyer:
        try:
            cart_items = json.loads(db_order.cart_data)
            is_topup = any(item.get("type") == "topup" for item in cart_items)

            # Нарахування при поповненні балансу
            if is_topup:
                topup_amount = sum(float(item.get("coins", 0)) for item in cart_items if item.get("type") == "topup")
                new_bal = float(buyer.balance) + topup_amount
                db.query(models.UserDB).filter(models.UserDB.id == buyer.id).update({"balance": new_bal},
                                                                                    synchronize_session=False)

            used_promo_code = next(
                (item.get("promo_code") for item in cart_items if isinstance(item, dict) and item.get("_meta_promo")),
                None)

            is_ref_allowed, is_cb_allowed = True, True
            if used_promo_code:
                promo_model = db.query(models.PromoCodeDB).filter(models.PromoCodeDB.code == used_promo_code).first()
                if promo_model and promo_model.target == "guild":
                    is_ref_allowed, is_cb_allowed = False, False

            # Реферальні бонуси
            ref_settings = db.query(models.ReferralSettingsDB).first()
            if buyer.referred_by and not is_topup and not is_balance_payment and (
                    ref_settings.is_active if ref_settings else True) and is_ref_allowed:
                referrer = db.query(models.UserDB).filter(models.UserDB.username == buyer.referred_by).first()
                if referrer:
                    ref_bonus = float(db_order.total) * ((ref_settings.percent if ref_settings else 5.0) / 100.0)
                    if ref_bonus > 0:
                        new_ref_bal = float(referrer.balance) + ref_bonus
                        new_ref_earn = float(referrer.referral_earnings) + ref_bonus
                        db.query(models.UserDB).filter(models.UserDB.id == referrer.id).update(
                            {"balance": new_ref_bal, "referral_earnings": new_ref_earn},
                            synchronize_session=False
                        )

            # Кешбек
            if not is_topup and not is_balance_payment and is_cb_allowed:
                settings = db.query(models.CashbackSettingsDB).first()
                cb = float(db_order.total) * ((settings.percent if settings else 0.0) / 100)
                if cb > 0:
                    new_cb_bal = float(buyer.balance) + cb
                    db.query(models.UserDB).filter(models.UserDB.id == buyer.id).update({"balance": new_cb_bal},
                                                                                        synchronize_session=False)
                    if buyer.telegram_chat_id:
                        cb_msg = f"💰 <b>Кешбек нараховано!</b>\n+${cb:.2f}" if is_uk_client else f"💰 <b>Cashback added!</b>\n+${cb:.2f}"
                        requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                      json={"chat_id": buyer.telegram_chat_id, "text": cb_msg, "parse_mode": "HTML"})
        except Exception as e:
            print("Помилка нарахування фінансів:", e)

    db.commit()
    return True, "Успіх"


@router.put("/api/orders/{order_id}/status")
def update_order_status(order_id: int, status_data: schemas.OrderStatusUpdate, db: Session = Depends(get_db),
                        current_admin: models.UserDB = Depends(get_current_admin)):
    valid_statuses = ["new", "awaiting_payment", "paid_processing", "delivered", "completed", "cancelled"]
    if status_data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Невірний статус")
    success, msg = _process_order_status_change(db, order_id, status_data.status)
    if not success:
        return {"error": msg}
    return {"status": "success"}


@router.post("/api/orders/{order_id}/confirm")
def confirm_order_delivery(order_id: int, db: Session = Depends(get_db),
                           current_user: models.UserDB = Depends(get_current_user)):
    db_order = db.query(models.OrderDB).filter(models.OrderDB.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404)
    if db_order.user_id != current_user.id:
        raise HTTPException(status_code=403)
    if db_order.status != "delivered":
        raise HTTPException(status_code=400)
    success, msg = _process_order_status_change(db, order_id, "completed", confirmed_by_user=True)
    if not success:
        raise HTTPException(status_code=400)
    return {"status": "success"}


@router.get("/api/orders")
def get_orders(db: Session = Depends(get_db), current_user: models.UserDB = Depends(get_current_user)):
    is_admin = check_is_admin(current_user.username)
    if is_admin:
        orders = db.query(models.OrderDB).order_by(models.OrderDB.id.desc()).all()
    else:
        orders = db.query(models.OrderDB).filter(models.OrderDB.user_id == current_user.id).order_by(
            models.OrderDB.id.desc()).all()
    result = []
    for o in orders:
        try:
            cart = json.loads(o.cart_data)
        except Exception:
            cart = []
        result.append(
            {"id": o.id, "cart": cart, "paymentMethod": o.payment_method, "total": o.total, "profit": o.profit,
             "status": o.status, "user_id": o.user_id,
             "created_at": o.created_at.isoformat() if o.created_at else None})
    return result


@router.get("/api/orders/{order_id}/chat")
def get_order_chat(order_id: int, db: Session = Depends(get_db),
                   current_user: models.UserDB = Depends(get_current_user)):
    order = db.query(models.OrderDB).filter(models.OrderDB.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Замовлення не знайдено")
    is_admin = check_is_admin(current_user.username)
    if order.user_id != current_user.id and not is_admin:
        raise HTTPException(status_code=403, detail="Доступ заборонено")
    query = db.query(models.TicketMessageDB).filter(models.TicketMessageDB.order_id == order_id)
    messages = query.order_by(models.TicketMessageDB.created_at.asc()).all()
    return [{"id": m.id, "sender": m.sender, "text": m.text, "is_secret": m.is_secret,
             "created_at": m.created_at.isoformat()} for m in messages]


@router.post("/api/orders/{order_id}/chat")
def send_order_message(order_id: int, message: schemas.TicketMessageCreate, db: Session = Depends(get_db),
                       current_user: models.UserDB = Depends(get_current_user)):
    order = db.query(models.OrderDB).filter(models.OrderDB.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Замовлення не знайдено")
    is_admin = check_is_admin(current_user.username)
    if order.user_id != current_user.id and not is_admin:
        raise HTTPException(status_code=403, detail="Доступ заборонено")

    is_secret = message.is_secret if is_admin else False
    sender = "admin" if is_admin else "user"

    new_msg = models.TicketMessageDB(order_id=order_id, sender=sender, text=message.text, is_secret=is_secret)
    db.add(new_msg)
    db.commit()

    if TELEGRAM_BOT_TOKEN:
        if TELEGRAM_FORUM_CHAT_ID:
            topic = db.query(models.OrderTopicDB).filter(models.OrderTopicDB.order_id == order_id).first()
            if topic:
                prefix = "👨‍💻 <b>Адмін (з сайту):</b>" if is_admin else f"👤 <b>Клієнт ({current_user.username}):</b>"
                secret_tag = "\n<i>[Секретно: буде видалено після закриття]</i>" if is_secret else ""
                try:
                    requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage", json={
                        "chat_id": TELEGRAM_FORUM_CHAT_ID,
                        "message_thread_id": topic.topic_id,
                        "text": f"{prefix}\n{message.text}{secret_tag}",
                        "parse_mode": "HTML"
                    })
                except Exception:
                    pass

        if is_admin:
            target_chat_id = None
            if order.user_id:
                buyer = db.query(models.UserDB).filter(models.UserDB.id == order.user_id).first()
                if buyer and buyer.telegram_chat_id:
                    target_chat_id = buyer.telegram_chat_id

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
                try:
                    cart_data = json.loads(order.cart_data)
                    if cart_data and len(cart_data) > 0 and "_lang" in cart_data[0] and cart_data[0]["_lang"]:
                        is_uk_client = str(cart_data[0]["_lang"]).strip().lower().startswith("uk")
                except Exception:
                    pass

                prefix_client = "🤫 <b>Реквізити для оплати:</b>" if is_secret else "👨‍💻 <b>Адміністратор:</b>"
                if not is_uk_client:
                    prefix_client = "🤫 <b>Payment details:</b>" if is_secret else "👨‍💻 <b>Administrator:</b>"

                try:
                    res_tg = requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage", json={
                        "chat_id": target_chat_id,
                        "text": f"{prefix_client}\n{message.text}",
                        "parse_mode": "HTML"
                    }).json()

                    if is_secret and res_tg.get("ok"):
                        client_msg_id = res_tg["result"]["message_id"]
                        c_data = json.loads(order.cart_data)
                        if len(c_data) > 0:
                            if "_secret_msg_ids" not in c_data[0]:
                                c_data[0]["_secret_msg_ids"] = []
                            c_data[0]["_secret_msg_ids"].append(client_msg_id)
                            order.cart_data = json.dumps(c_data)
                            db.commit()
                except Exception:
                    pass

    return {"status": "success"}


@router.post("/api/checkout")
async def checkout(request: Request, order: schemas.OrderData, db: Session = Depends(get_db)):
    is_topup = False
    topup_amount = 0.0
    total_float = float(order.total)

    pm_lower = order.paymentMethod.strip().lower()
    is_balance_payment = any(
        w in pm_lower for w in ["balance", "wallet", "з балансу", "from balance", "гаманець", "coins", "баланс"])

    if is_balance_payment:
        if not order.user_id:
            raise HTTPException(status_code=401, detail="Ви не авторизовані / Not authorized")
        user = db.query(models.UserDB).filter(models.UserDB.id == order.user_id).first()
        if not user or user.balance < total_float:
            raise HTTPException(status_code=400, detail="Недостатньо коштів на балансі / Insufficient balance")

        # 🔥 Зняття балансу
        new_bal = float(user.balance) - total_float
        db.query(models.UserDB).filter(models.UserDB.id == user.id).update({"balance": new_bal},
                                                                           synchronize_session=False)

    # 🔥 САНІТИЗАЦІЯ КОШИКА (Усуває всі приховані помилки в Телеграм-генераторах) 🔥
    cart_dicts = []
    for item in order.cart:
        item_dict = item.dict() if hasattr(item, "dict") else dict(item)

        # Гарантуємо наявність правильних ключів назви, щоб бот не падав
        if "product" in item_dict and isinstance(item_dict["product"], dict):
            if "name" in item_dict["product"] and "title" not in item_dict["product"]:
                item_dict["product"]["title"] = item_dict["product"]["name"]
            elif "title" in item_dict["product"] and "name" not in item_dict["product"]:
                item_dict["product"]["name"] = item_dict["product"]["title"]
        else:
            item_dict["product"] = {"title": "Товар", "name": "Товар"}

        if item_dict.get("type") == "topup":
            is_topup = True
            topup_amount += float(item_dict.get("coins", 0))

        cart_dicts.append(item_dict)

    if order.promo_code:
        cart_dicts.append({
            "_meta_promo": True,
            "promo_code": order.promo_code.upper(),
            "product": {"title": f"Промокод: {order.promo_code.upper()}",
                        "name": f"Промокод: {order.promo_code.upper()}"}
        })

    initial_status = "paid_processing" if (is_balance_payment and not is_topup) else (
        "completed" if (is_balance_payment and is_topup) else "awaiting_payment")

    final_payment_method = "З балансу / Balance" if is_balance_payment else escape_html(order.paymentMethod)

    new_order = models.OrderDB(user_id=order.user_id, cart_data=json.dumps(cart_dicts),
                               payment_method=final_payment_method, total=order.total, profit=order.profit,
                               status=initial_status)
    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    if initial_status == "awaiting_payment":
        sys_msg = models.TicketMessageDB(order_id=new_order.id, sender="system",
                                         text="Welcome! Your order has been created. Please wait for payment details.\n\nВітаємо! Ваше замовлення створено. Очікуйте реквізити для оплати.",
                                         is_secret=False)
        db.add(sys_msg)
        db.commit()

    # Топап з балансу (теоретичний захист)
    if is_topup and is_balance_payment and order.user_id:
        user = db.query(models.UserDB).filter(models.UserDB.id == order.user_id).first()
        if user:
            new_bal = float(user.balance) + topup_amount
            db.query(models.UserDB).filter(models.UserDB.id == user.id).update({"balance": new_bal},
                                                                               synchronize_session=False)
        db.commit()

    if order.user_id and not is_topup:
        db.add(models.NotificationDB(user_id=order.user_id, title="Order Created! / Замовлення оформлено!",
                                     message=f"Order #{new_order.id} created. Go to chat for details. / Ваше замовлення #{new_order.id} створено. Перейдіть у чат для деталей.",
                                     type="info"))
        db.commit()
        buyer = db.query(models.UserDB).filter(models.UserDB.id == order.user_id).first()
        if buyer and buyer.telegram_chat_id and TELEGRAM_BOT_TOKEN:
            try:
                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                              json={"chat_id": buyer.telegram_chat_id,
                                    "text": f"✅ <b>Order #{new_order.id} created! / Замовлення #{new_order.id} оформлено!</b>\nCheck the status on the website. / Перевірте статус на сайті.",
                                    "parse_mode": "HTML"})
            except Exception:
                pass

    if TELEGRAM_BOT_TOKEN and TELEGRAM_FORUM_CHAT_ID:
        buyer_name = "Гість"
        if order.user_id:
            user_db = db.query(models.UserDB).filter(models.UserDB.id == order.user_id).first()
            if user_db:
                buyer_name = escape_html(user_db.username)

        topic_name = f"#{new_order.id} {buyer_name}"
        topic_id = None
        try:
            res = requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/createForumTopic",
                                json={"chat_id": TELEGRAM_FORUM_CHAT_ID, "name": topic_name}).json()
            if res.get("ok"):
                topic_id = res["result"]["message_thread_id"]
                db.add(models.OrderTopicDB(order_id=new_order.id, topic_id=topic_id))
                db.commit()
        except Exception as e:
            print("Помилка створення теми:", e)

        if topic_id:
            # 🔥 Розумна клавіатура: уникаємо просити адміна тиснути "Оплачено", якщо оплата була з Балансу 🔥
            if is_topup:
                keyboard = {"inline_keyboard": [
                    [{"text": "✅ Оплачено (Нарахувати)", "callback_data": f"admin_completed_{new_order.id}"}],
                    [{"text": "🔴 Скасувати", "callback_data": f"admin_cancelled_{new_order.id}"}]]}
            else:
                if initial_status == "paid_processing":
                    keyboard = {"inline_keyboard": [
                        [{"text": "🚚 Товар видано", "callback_data": f"admin_delivered_{new_order.id}"}],
                        [{"text": "🔴 Скасувати (Повернення)", "callback_data": f"admin_cancelled_{new_order.id}"}]]}
                else:
                    keyboard = {"inline_keyboard": [
                        [{"text": "🟢 Оплачено (В роботу)", "callback_data": f"admin_paid_processing_{new_order.id}"}],
                        [{"text": "🚚 Товар видано", "callback_data": f"admin_delivered_{new_order.id}"}],
                        [{"text": "🔴 Скасувати", "callback_data": f"admin_cancelled_{new_order.id}"}]]}

            msg_admin = generate_full_order_text(db, new_order, initial_status, hide_finance=False)
            try:
                res_msg = requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                        json={"chat_id": TELEGRAM_FORUM_CHAT_ID, "message_thread_id": topic_id,
                                              "text": msg_admin,
                                              "parse_mode": "HTML", "reply_markup": keyboard}).json()

                if res_msg.get("ok"):
                    requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/unpinChatMessage",
                                  json={"chat_id": TELEGRAM_FORUM_CHAT_ID,
                                        "message_id": res_msg["result"]["message_id"]})
            except Exception as e:
                print("Помилка відправки в тему:", e)

    return {"status": "success", "order_id": new_order.id}