from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
import json
import requests
import os
import threading

from database import get_db, SessionLocal
import models
import schemas
from utils import (
    tg_session, safe_tg_post,
    get_current_admin, get_current_user, get_current_user_optional, check_is_admin,
    escape_html, generate_receipt_text, generate_full_order_text, check_cart_blocked_by_offline,
    limiter
)

# Завантажуємо токени для розсилок в межах замовлень
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_FORUM_CHAT_ID = os.getenv("TELEGRAM_FORUM_CHAT_ID")

router = APIRouter(tags=["Orders"])


# ==========================================
# 🔥 ГЛОБАЛЬНА ЛОГІКА СТАТУСІВ ТА РЕФЕРАЛІВ 🔥
# ==========================================
def get_item_category(item: dict) -> str:
    """
    Визначає категорію товару: 'rss', 'gems', 'account', 'other'
    """
    if not isinstance(item, dict):
        return "other"
    itype = str(item.get("type") or "").strip().lower()
    igroup = str(item.get("item_group") or "").strip().lower()
    prod = item.get("product")
    pcat = ""
    if isinstance(prod, dict):
        pcat = str(prod.get("category") or prod.get("type") or "").strip().lower()

    if itype in ["rss", "resource", "resources"] or igroup in ["rss", "res"] or pcat in ["rss", "resource", "resources"]:
        return "rss"
    if itype in ["gems", "gem", "sapphire", "sapphires"] or igroup in ["gem", "gems"] or pcat in ["gems", "gem", "sapphire", "sapphires"]:
        return "gems"
    if itype in ["account", "acc", "accounts"] or igroup in ["acc", "account"] or pcat in ["account", "acc", "accounts"]:
        return "account"
    return "other"


def calculate_order_reward(cart_items: list, order_total: float, settings, default_pct: float = 0.0, override_category_percents: dict = None) -> float:
    """
    Розраховує винагороду (кешбек або реферальний бонус) з урахуванням гнучких відсотків по категоріях та рангів
    """
    if not settings and not override_category_percents:
        return 0.0

    cat_data = override_category_percents
    if not cat_data and getattr(settings, "category_percents", None):
        if isinstance(settings.category_percents, str):
            try:
                cat_data = json.loads(settings.category_percents)
            except Exception:
                cat_data = None
        elif isinstance(settings.category_percents, dict):
            cat_data = settings.category_percents

    base_pct = float(settings.percent if settings and settings.percent is not None else default_pct)
    if not cat_data or not isinstance(cat_data, dict):
        return max(0.0, round(order_total * (base_pct / 100.0), 2))

    parsed_items = []
    subtotal = 0.0
    for it in cart_items:
        if isinstance(it, dict) and it.get("type") != "topup" and not it.get("_meta_promo"):
            try:
                p = float(it.get("price", 0))
            except Exception:
                p = 0.0
            if p > 0:
                cat = get_item_category(it)
                parsed_items.append((cat, p))
                subtotal += p

    if not parsed_items or subtotal <= 0:
        return max(0.0, round(order_total * (base_pct / 100.0), 2))

    discount_ratio = (order_total / subtotal) if subtotal > 0 else 1.0

    total_reward = 0.0
    for cat, p in parsed_items:
        effective_price = p * discount_ratio
        cat_pct = base_pct
        if cat in cat_data and cat_data[cat] is not None and str(cat_data[cat]).strip() != "":
            try:
                cat_pct = float(cat_data[cat])
            except (ValueError, TypeError):
                cat_pct = base_pct
        total_reward += effective_price * (cat_pct / 100.0)

    return max(0.0, round(total_reward, 2))


def _dispatch_tg_status_notifications(order_id: int, new_status: str, confirmed_by_user: bool,
                                      target_chat_id: str, is_uk_client: bool, is_de_client: bool,
                                      msg: str, secret_ids: list,
                                      cb: float, buyer_chat_id: str,
                                      referrer_chat_id: str = None, ref_bonus: float = 0.0,
                                      buyer_tier_name: str = "Base"):
    if not TELEGRAM_BOT_TOKEN:
        return

    # 1. Видалення секретних повідомлень з чату клієнта
    if new_status in ["completed", "cancelled"] and target_chat_id and secret_ids:
        for msg_id in secret_ids:
            try:
                tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/deleteMessage",
                                json={"chat_id": target_chat_id, "message_id": msg_id}, timeout=3)
            except Exception:
                pass

    # 2. Відправка статусу в Телеграм клієнта
    if target_chat_id and not confirmed_by_user and msg:
        payload = {"chat_id": target_chat_id, "text": msg, "parse_mode": "HTML"}
        if new_status == "delivered":
            btn_text = "✅ Підтвердити отримання" if is_uk_client else (
                "✅ Empfang bestätigen" if is_de_client else "✅ Confirm receipt"
            )
            payload["reply_markup"] = {"inline_keyboard": [
                [{"text": btn_text, "callback_data": f"client_confirm_{order_id}"}]]}
        try:
            res = tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage", json=payload, timeout=5)
            if not res.ok:
                print("❌ Помилка відправки статусу в TG:", res.text)
        except Exception as e:
            print("❌ Exception sending status to TG:", e)

    # 3. Адмінам в форум шлемо підтвердження
    if confirmed_by_user and new_status == "completed" and TELEGRAM_FORUM_CHAT_ID:
        db = SessionLocal()
        try:
            topic = db.query(models.OrderTopicDB).filter(models.OrderTopicDB.order_id == order_id).first()
            if topic:
                tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                json={"chat_id": TELEGRAM_FORUM_CHAT_ID, "message_thread_id": topic.topic_id,
                                      "text": f"✅ <b>Клієнт підтвердив отримання!</b>\nЗамовлення #{order_id} успішно закрито.",
                                      "parse_mode": "HTML"}, timeout=5)
        except Exception as e:
            print("❌ Помилка сповіщення форуму адмінів:", e)
        finally:
            db.close()

    # 4. Кешбек покупцю
    recipient_chat_id = buyer_chat_id or target_chat_id
    if cb > 0 and recipient_chat_id:
        try:
            tier_badge = f"👑 Ваш ранг кешбеку: <b>{buyer_tier_name}</b>\n" if is_uk_client else (
                f"👑 Ihr Cashback-Rang: <b>{buyer_tier_name}</b>\n" if is_de_client else
                f"👑 Your cashback tier: <b>{buyer_tier_name}</b>\n"
            )
            cb_msg = (
                f"{tier_badge}💰 <b>Кешбек нараховано!</b>\n+${cb:.2f} додано на ваш баланс магазину."
                if is_uk_client else
                (f"{tier_badge}💰 <b>Cashback gutgeschrieben!</b>\n+${cb:.2f} auf Ihr Guthaben überwiesen." if is_de_client else
                 f"{tier_badge}💰 <b>Cashback credited!</b>\n+${cb:.2f} added to your store balance.")
            )
            tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                            json={"chat_id": recipient_chat_id, "text": cb_msg, "parse_mode": "HTML"}, timeout=5)
        except Exception as e:
            print("❌ Помилка надсилання кешбеку в TG:", e)

    # 5. Реферальний бонус рефереру
    if ref_bonus > 0 and referrer_chat_id:
        try:
            ref_msg = (
                f"🤝 <b>Реферальний бонус!</b>\n"
                f"Ваш реферал зробив замовлення #{order_id}.\n"
                f"Вам нараховано: <b>+${ref_bonus:.2f}</b> на баланс магазину!"
            )
            tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                            json={"chat_id": referrer_chat_id, "text": ref_msg, "parse_mode": "HTML"}, timeout=5)
        except Exception as e:
            print("❌ Помилка надсилання реферального бонусу в TG:", e)


def _process_order_status_change(db: Session, order_id: int, new_status: str, confirmed_by_user=False, background_tasks: BackgroundTasks = None):
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
    is_uk_client = True
    is_de_client = False
    secret_ids = []
    try:
        cart_items = json.loads(db_order.cart_data)
        if cart_items and len(cart_items) > 0 and isinstance(cart_items[0], dict):
            if "_lang" in cart_items[0] and cart_items[0]["_lang"]:
                lang_code = str(cart_items[0]["_lang"]).strip().lower()
                is_uk_client = lang_code.startswith("uk") or lang_code.startswith("ua")
                is_de_client = lang_code.startswith("de")
            for item in cart_items:
                if item.get("_tg_chat_id"):
                    target_chat_id = item["_tg_chat_id"]
                    break
            secret_ids = cart_items[0].get("_secret_msg_ids", []) if cart_items else []
    except Exception:
        pass

    if buyer and buyer.telegram_chat_id:
        target_chat_id = buyer.telegram_chat_id

    if is_uk_client:
        title = f"Замовлення #{db_order.id} оновлено"
    elif is_de_client:
        title = f"Bestellung #{db_order.id} aktualisiert"
    else:
        title = f"Order #{db_order.id} updated"

    if new_status == "completed":
        msg = generate_receipt_text(db_order, is_uk_client)
        site_msg = "Замовлення успішно виконано! Дякуємо за покупку." if is_uk_client else (
            "Bestellung erfolgreich abgeschlossen! Vielen Dank für Ihren Einkauf." if is_de_client else
            "Order completed successfully! Thank you for your purchase."
        )
        ntype = "success"
    elif new_status == "delivered":
        msg = f"🔔 <b>{title}</b>\n\n🚚 Ваше замовлення <b>ДОСТАВЛЕНО!</b> Будь ласка, перевірте товар та підтвердіть отримання, натиснувши кнопку нижче." if is_uk_client else (
            f"🔔 <b>{title}</b>\n\n🚚 Ihre Bestellung wurde <b>GELIEFERT!</b> Bitte überprüfen Sie den Artikel und bestätigen Sie den Empfang." if is_de_client else
            f"🔔 <b>{title}</b>\n\n🚚 Your order is <b>DELIVERED!</b> Please check the item and confirm receipt by clicking the button below."
        )
        site_msg = "Ваше замовлення доставлено! Будь ласка, перевірте товар та підтвердіть отримання." if is_uk_client else (
            "Ihre Bestellung wurde geliefert! Bitte überprüfen Sie den Artikel und bestätigen Sie den Empfang." if is_de_client else
            "Your order is delivered! Please check the item and confirm receipt."
        )
        ntype = "info"
    elif new_status == "paid_processing":
        msg = f"🔔 <b>{title}</b>\n\n🟢 Оплату отримано! Ваше замовлення взято в роботу. Очікуйте." if is_uk_client else (
            f"🔔 <b>{title}</b>\n\n🟢 Zahlung erhalten! Ihre Bestellung wird bearbeitet. Bitte warten." if is_de_client else
            f"🔔 <b>{title}</b>\n\n🟢 Payment received! Your order is in progress. Please wait."
        )
        site_msg = "Оплату отримано! Ваше замовлення взято в роботу." if is_uk_client else (
            "Zahlung erhalten! Ihre Bestellung wird bearbeitet." if is_de_client else
            "Payment received! Your order is in progress."
        )
        ntype = "info"
    elif new_status == "awaiting_payment":
        msg = f"🔔 <b>{title}</b>\n\n⏳ Замовлення створено. Очікуємо на вашу оплату." if is_uk_client else (
            f"🔔 <b>{title}</b>\n\n⏳ Bestellung erstellt. Warten auf Ihre Zahlung." if is_de_client else
            f"🔔 <b>{title}</b>\n\n⏳ Order created. Awaiting your payment."
        )
        site_msg = "Замовлення створено. Очікуємо на вашу оплату." if is_uk_client else (
            "Bestellung erstellt. Warten auf Ihre Zahlung." if is_de_client else
            "Order created. Awaiting your payment."
        )
        ntype = "warning"
    elif new_status == "cancelled":
        msg = f"🔔 <b>{title}</b>\n\n❌ На жаль, ваше замовлення було скасовано." if is_uk_client else (
            f"🔔 <b>{title}</b>\n\n❌ Leider wurde Ihre Bestellung storniert." if is_de_client else
            f"🔔 <b>{title}</b>\n\n❌ Unfortunately, your order has been cancelled."
        )
        site_msg = "На жаль, ваше замовлення було скасовано." if is_uk_client else (
            "Leider wurde Ihre Bestellung storniert." if is_de_client else
            "Unfortunately, your order has been cancelled."
        )
        ntype = "warning"
    else:
        msg = f"🔔 <b>{title}</b>\n\nСтатус замовлення змінено." if is_uk_client else (
            f"🔔 <b>{title}</b>\n\nBestellstatus wurde geändert." if is_de_client else
            f"🔔 <b>{title}</b>\n\nOrder status changed."
        )
        site_msg = "Статус замовлення змінено." if is_uk_client else (
            "Bestellstatus wurde geändert." if is_de_client else
            "Order status changed."
        )
        ntype = "info"

    if db_order.user_id:
        db.add(models.NotificationDB(user_id=db_order.user_id, title=title, message=site_msg, type=ntype))

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
        # Відновлюємо статус акаунтів на active, якщо замовлення скасовано
        try:
            cart_items_cancel = json.loads(db_order.cart_data)
            for ci in cart_items_cancel:
                if isinstance(ci, dict) and (ci.get("type") in ["account", "acc"] or ci.get("item_group") == "acc"):
                    acc_id = ci.get("id") or (ci.get("product") and ci.get("product").get("id"))
                    if acc_id:
                        db.query(models.AccountDB).filter(models.AccountDB.id == acc_id).update({"status": "active"}, synchronize_session=False)
        except Exception as e:
            print("Помилка відновлення статусу акаунта при скасуванні:", e)

    cb_amount = 0.0
    ref_bonus_amount = 0.0
    referrer_chat_id = None
    buyer_tier_name = "Base"

    # Фінанси при успішному виконанні
    if new_status == "completed" and old_status != "completed" and buyer:
        if not getattr(db_order, "is_reward_credited", False):
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

                # Реферальні бонуси (нараховуються рефереру, якщо покупка була за реальні гроші, а не з балансу)
                ref_settings = db.query(models.ReferralSettingsDB).first()
                clean_ref = buyer.referred_by.strip() if (buyer and buyer.referred_by) else None
                if not clean_ref and cart_items:
                    for ci in cart_items:
                        if isinstance(ci, dict) and ci.get("_tg_referred_by"):
                            clean_ref = str(ci.get("_tg_referred_by")).strip()
                            break

                if clean_ref and not is_topup and not is_balance_payment and (
                        ref_settings.is_active if ref_settings else True) and is_ref_allowed:
                    referrer = db.query(models.UserDB).filter(models.UserDB.username.ilike(clean_ref)).first()
                    if referrer and (not buyer or referrer.id != buyer.id):
                        ref_bonus = calculate_order_reward(cart_items, float(db_order.total), ref_settings, default_pct=0.0)
                        if ref_bonus > 0:
                            ref_bonus_amount = ref_bonus
                            if referrer.telegram_chat_id:
                                referrer_chat_id = referrer.telegram_chat_id
                            new_ref_bal = float(referrer.balance) + ref_bonus
                            new_ref_earn = float(referrer.referral_earnings or 0.0) + ref_bonus
                            db.query(models.UserDB).filter(models.UserDB.id == referrer.id).update(
                                {"balance": new_ref_bal, "referral_earnings": new_ref_earn},
                                synchronize_session=False
                            )
                            # Зберігаємо історію нарахування по конкретному рефералу
                            db.add(models.ReferralRewardDB(
                                referrer_id=referrer.id,
                                referral_id=buyer.id if buyer else None,
                                order_id=db_order.id,
                                amount=ref_bonus
                            ))

                # Кешбек: НАРАХОВУЄТЬСЯ ТІЛЬКИ ПРИ ОПЛАТІ МОНЕТАМИ САЙТУ (З БАЛАНСУ)!
                if is_balance_payment and not is_topup and is_cb_allowed:
                    settings = db.query(models.CashbackSettingsDB).first()
                    from routers.products import DEFAULT_CASHBACK_TIERS

                    tiers = DEFAULT_CASHBACK_TIERS
                    if settings and settings.tiers:
                        try:
                            parsed = json.loads(settings.tiers)
                            if isinstance(parsed, list) and len(parsed) > 0:
                                tiers = parsed
                        except Exception:
                            tiers = DEFAULT_CASHBACK_TIERS

                    # Визначаємо поточний ранг покупця та його персональні відсотки
                    from routers.users import get_user_total_spent, calculate_tier_progress
                    total_spent = get_user_total_spent(db, buyer.id)
                    tier_info = calculate_tier_progress(total_spent, tiers)
                    current_tier = tier_info.get("current_tier", {})
                    buyer_tier_name = current_tier.get("name", "Base")

                    tier_cat_percents = {
                        "rss": current_tier.get("rss"),
                        "gems": current_tier.get("gems"),
                        "other": current_tier.get("other"),
                        "account": current_tier.get("account")
                    }

                    cb = calculate_order_reward(
                        cart_items, float(db_order.total), settings,
                        default_pct=0.0, override_category_percents=tier_cat_percents
                    )
                    if cb > 0:
                        cb_amount = cb
                        new_cb_bal = float(buyer.balance) + cb
                        db.query(models.UserDB).filter(models.UserDB.id == buyer.id).update(
                            {"balance": new_cb_bal}, synchronize_session=False
                        )

                db_order.is_reward_credited = True
            except Exception as e:
                print("Помилка нарахування фінансів:", e)

    db.commit()

    # ⚡ Всі Telegram повідомлення надсилаються асинхронно у фоні (миттєвий HTTP 200 відповідь)
    buyer_chat_id = buyer.telegram_chat_id if buyer else None
    if background_tasks:
        background_tasks.add_task(
            _dispatch_tg_status_notifications,
            order_id, new_status, confirmed_by_user,
            target_chat_id, is_uk_client, is_de_client,
            msg, secret_ids,
            cb_amount, buyer_chat_id,
            referrer_chat_id, ref_bonus_amount,
            buyer_tier_name
        )
    else:
        threading.Thread(
            target=_dispatch_tg_status_notifications,
            args=(order_id, new_status, confirmed_by_user,
                  target_chat_id, is_uk_client, is_de_client,
                  msg, secret_ids,
                  cb_amount, buyer_chat_id,
                  referrer_chat_id, ref_bonus_amount,
                  buyer_tier_name),
            daemon=True
        ).start()

    return True, "Успіх"


@router.put("/api/orders/{order_id}/status")
def update_order_status(order_id: int, status_data: schemas.OrderStatusUpdate,
                        background_tasks: BackgroundTasks,
                        db: Session = Depends(get_db),
                        current_admin: models.UserDB = Depends(get_current_admin)):
    valid_statuses = ["new", "awaiting_payment", "paid_processing", "delivered", "completed", "cancelled"]
    if status_data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Невірний статус")
    success, msg = _process_order_status_change(db, order_id, status_data.status, background_tasks=background_tasks)
    if not success:
        return {"error": msg}
    return {"status": "success"}


@router.post("/api/orders/{order_id}/confirm")
def confirm_order_delivery(order_id: int,
                           background_tasks: BackgroundTasks,
                           db: Session = Depends(get_db),
                           current_user: models.UserDB = Depends(get_current_user)):
    db_order = db.query(models.OrderDB).filter(models.OrderDB.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404)
    if db_order.user_id != current_user.id:
        raise HTTPException(status_code=403)
    if db_order.status != "delivered":
        raise HTTPException(status_code=400)
    success, msg = _process_order_status_change(db, order_id, "completed", confirmed_by_user=True, background_tasks=background_tasks)
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


def relay_chat_to_telegram(order_id: int, text: str, is_secret: bool, is_admin: bool, username: str):
    if not TELEGRAM_BOT_TOKEN:
        return
    db = SessionLocal()
    try:
        order = db.query(models.OrderDB).filter(models.OrderDB.id == order_id).first()
        if not order:
            return

        if TELEGRAM_FORUM_CHAT_ID:
            topic = db.query(models.OrderTopicDB).filter(models.OrderTopicDB.order_id == order_id).first()
            if topic:
                prefix = "👨‍💻 <b>Адмін (з сайту):</b>" if is_admin else f"👤 <b>Клієнт ({username}):</b>"
                secret_tag = "\n<i>[Секретно: буде видалено після закриття]</i>" if is_secret else ""
                try:
                    tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage", json={
                        "chat_id": TELEGRAM_FORUM_CHAT_ID,
                        "message_thread_id": topic.topic_id,
                        "text": f"{prefix}\n{text}{secret_tag}",
                        "parse_mode": "HTML"
                    }, timeout=5)
                except Exception as e:
                    print("Error relaying to forum topic:", e)

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
                    res_tg = tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage", json={
                        "chat_id": target_chat_id,
                        "text": f"{prefix_client}\n{text}",
                        "parse_mode": "HTML"
                    }, timeout=5).json()

                    if is_secret and res_tg.get("ok"):
                        client_msg_id = res_tg["result"]["message_id"]
                        c_data = json.loads(order.cart_data)
                        if len(c_data) > 0:
                            if "_secret_msg_ids" not in c_data[0]:
                                c_data[0]["_secret_msg_ids"] = []
                            c_data[0]["_secret_msg_ids"].append(client_msg_id)
                            order.cart_data = json.dumps(c_data)
                            db.commit()
                except Exception as e:
                    print("Error sending to client TG:", e)
    finally:
        db.close()


@router.post("/api/orders/{order_id}/chat")
def send_order_message(order_id: int, message: schemas.TicketMessageCreate,
                       background_tasks: BackgroundTasks,
                       db: Session = Depends(get_db),
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

    # ⚡ Миттєва відповідь клієнту (< 5ms), відправка в Telegram — асинхронно у фоні
    background_tasks.add_task(relay_chat_to_telegram, order_id, message.text, is_secret, is_admin, current_user.username)
    return {"status": "success"}


def dispatch_telegram_order_notification(order_id: int, secure_user_id: int = None, is_topup: bool = False, initial_status: str = "new"):
    """
    Фонова задача для надсилання сповіщень та створення гілки замовлення в Telegram Forum
    Не блокує відповідь клієнту (/api/checkout завершується миттєво < 30ms)
    """
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_FORUM_CHAT_ID:
        return

    db = SessionLocal()
    try:
        new_order = db.query(models.OrderDB).filter(models.OrderDB.id == order_id).first()
        if not new_order:
            return

        buyer_name = "Гість"
        if secure_user_id:
            user_db = db.query(models.UserDB).filter(models.UserDB.id == secure_user_id).first()
            if user_db:
                buyer_name = escape_html(user_db.username)

        topic_name = f"#{new_order.id} {buyer_name}"
        topic_id = None
        try:
            res = safe_tg_post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/createForumTopic",
                json={"chat_id": TELEGRAM_FORUM_CHAT_ID, "name": topic_name},
                timeout=8
            )
            if res.get("ok"):
                topic_id = res["result"]["message_thread_id"]
                db.add(models.OrderTopicDB(order_id=new_order.id, topic_id=topic_id))
                db.commit()
            else:
                print("❌ createForumTopic failed:", res)
        except Exception as e:
            print("Помилка створення теми:", e)

        if topic_id:
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
                res_msg = safe_tg_post(
                    f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                    json={
                        "chat_id": TELEGRAM_FORUM_CHAT_ID,
                        "message_thread_id": topic_id,
                        "text": msg_admin,
                        "parse_mode": "HTML",
                        "reply_markup": keyboard
                    },
                    timeout=8
                )

                if res_msg.get("ok"):
                    safe_tg_post(
                        f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/unpinChatMessage",
                        json={
                            "chat_id": TELEGRAM_FORUM_CHAT_ID,
                            "message_id": res_msg["result"]["message_id"]
                        },
                        timeout=5
                    )
            except Exception as e:
                print("Помилка відправки в тему:", e)
    finally:
        db.close()


@router.post("/api/checkout")
@limiter.limit("10/minute")
async def checkout(request: Request, order: schemas.OrderData, background_tasks: BackgroundTasks,
                   db: Session = Depends(get_db),
                   current_user: models.UserDB = Depends(get_current_user_optional)):
    # 🛑 ПЕРЕВІРКА ОФЛАЙН РЕЖИМУ МАГАЗИНУ (БЛОКУВАННЯ ЗАМОВЛЕНЬ)
    is_blocked, blocked_reason = check_cart_blocked_by_offline(order.cart)
    if is_blocked:
        raise HTTPException(
            status_code=400,
            detail=blocked_reason or "🌙 Магазин зараз в офлайн-режимі. Створення замовлень тимчасово призупинено."
        )

    # 🔐 БЕЗПЕКА: user_id береться ТІЛЬКИ з сесії, не з тіла запиту
    secure_user_id = current_user.id if current_user else None

    # 🛡️ СЕРВЕРНИЙ РОЗРАХУНОК ЦІН ТА ВАЛІДАЦІЯ ТОВАРІВ (Захист від підміни сум клієнтом)
    verified_subtotal = 0.0
    verified_total_cost = 0.0
    verified_cart_items = []
    is_topup = False
    topup_amount = 0.0
    purchased_account_ids = []

    for item in order.cart:
        item_dict = item.dict() if hasattr(item, "dict") else dict(item)
        itype = item_dict.get("type", "other")
        prod_obj = item_dict.get("product") if isinstance(item_dict.get("product"), dict) else {}
        item_id = item_dict.get("id") or prod_obj.get("id")

        item_price = 0.0
        item_cost = 0.0

        if itype in ["topup", "balance", "coins"]:
            is_topup = True
            coins_amount = float(item_dict.get("coins", 0) or item_dict.get("price", 0))
            if coins_amount <= 0:
                raise HTTPException(status_code=400, detail="Невірна сума поповнення")
            item_price = coins_amount
            item_cost = 0.0
            topup_amount += coins_amount

        elif itype in ["account", "acc"]:
            if not item_id:
                raise HTTPException(status_code=400, detail="Не вказано ID акаунта")
            acc_db = db.query(models.AccountDB).filter(models.AccountDB.id == item_id).first()
            if not acc_db:
                raise HTTPException(status_code=400, detail=f"Акаунт #{item_id} не знайдено")
            if acc_db.status != "active":
                raise HTTPException(status_code=400, detail=f"Акаунт '{acc_db.title}' вже продано або він недоступний")
            try:
                item_price = float(acc_db.price)
            except Exception:
                item_price = 0.0
            try:
                item_cost = float(acc_db.base_price or 0)
            except Exception:
                item_cost = 0.0
            purchased_account_ids.append(acc_db.id)

        elif itype in ["rss", "resources"]:
            if item_id:
                rss_db = db.query(models.ResourceDB).filter(models.ResourceDB.id == item_id).first()
                if rss_db:
                    try:
                        item_price = float(rss_db.price)
                    except Exception:
                        item_price = float(item_dict.get("price", 0))
                    try:
                        item_cost = float(rss_db.base_price or 0)
                    except Exception:
                        item_cost = 0.0
                else:
                    item_price = float(item_dict.get("price", 0))
                    item_cost = float(prod_obj.get("base_price", 0) or 0)
            else:
                item_price = float(item_dict.get("price", 0))
                item_cost = float(prod_obj.get("base_price", 0) or 0)

        elif itype in ["gems", "gem"]:
            if item_id and item_id != "custom_gems":
                gem_db = db.query(models.GemDB).filter(models.GemDB.id == item_id).first()
                if gem_db:
                    try:
                        item_price = float(gem_db.rate)
                    except Exception:
                        item_price = float(item_dict.get("price", 0))
                    try:
                        item_cost = float(gem_db.base_price or 0)
                    except Exception:
                        item_cost = 0.0
                else:
                    item_price = float(item_dict.get("price", 0))
                    item_cost = float(prod_obj.get("base_price", 0) or 0)
            else:
                item_price = float(item_dict.get("price", 0))
                item_cost = float(prod_obj.get("base_price", 0) or 0)

        elif itype in ["other", "special"]:
            if item_id:
                oth_db = db.query(models.OtherItemDB).filter(models.OtherItemDB.id == item_id).first()
                if oth_db:
                    try:
                        item_price = float(oth_db.price)
                    except Exception:
                        item_price = float(item_dict.get("price", 0))
                    try:
                        item_cost = float(oth_db.base_price or 0)
                    except Exception:
                        item_cost = 0.0
                else:
                    item_price = float(item_dict.get("price", 0))
                    item_cost = float(prod_obj.get("base_price", 0) or 0)
            else:
                item_price = float(item_dict.get("price", 0))
                item_cost = float(prod_obj.get("base_price", 0) or 0)

        else:
            item_price = float(item_dict.get("price", 0))
            item_cost = float(prod_obj.get("base_price", 0) or 0)

        item_dict["price"] = f"{item_price:.2f}"
        if "product" in item_dict and isinstance(item_dict["product"], dict):
            item_dict["product"]["price"] = f"{item_price:.2f}"
            item_dict["product"]["base_price"] = f"{item_cost:.2f}"
            if "name" in item_dict["product"] and "title" not in item_dict["product"]:
                item_dict["product"]["title"] = item_dict["product"]["name"]
            elif "title" in item_dict["product"] and "name" not in item_dict["product"]:
                item_dict["product"]["name"] = item_dict["product"]["title"]
        else:
            item_dict["product"] = {"title": "Товар", "name": "Товар", "price": f"{item_price:.2f}", "base_price": f"{item_cost:.2f}"}

        verified_subtotal += item_price
        verified_total_cost += item_cost
        verified_cart_items.append(item_dict)

    # 🎫 ВАЛІДАЦІЯ ТА РОЗРАХУНОК ПРОМОКОДУ
    discount_amount = 0.0
    promo_db = None
    if order.promo_code:
        promo_code_clean = order.promo_code.strip().upper()
        promo_db = db.query(models.PromoCodeDB).filter(models.PromoCodeDB.code == promo_code_clean).first()
        if not promo_db or promo_db.is_active == 0:
            raise HTTPException(status_code=400, detail="Промокод недійсний або деактивований")
        if (promo_db.max_uses or 0) > 0 and (promo_db.current_uses or 0) >= (promo_db.max_uses or 0):
            raise HTTPException(status_code=400, detail="Ліміт використання промокоду вичерпано")
        if verified_subtotal < promo_db.min_order_amount:
            raise HTTPException(status_code=400, detail=f"Мінімальна сума для промокоду: ${promo_db.min_order_amount}")
        if promo_db.expiry_date:
            try:
                from datetime import datetime
                if datetime.now() > datetime.fromisoformat(promo_db.expiry_date):
                    raise HTTPException(status_code=400, detail="Термін дії промокоду закінчився")
            except Exception:
                pass

        if promo_db.target == "guild":
            # Для гільдії ціна розраховується за собівартістю (base_price)
            discount_amount = max(0.0, verified_subtotal - verified_total_cost)
        else:
            target_ids = []
            if promo_db.target_items:
                try:
                    target_ids = json.loads(promo_db.target_items)
                except Exception:
                    target_ids = []

            eligible_sum = 0.0
            p_target = (promo_db.target or "all").lower()
            if p_target in ["rss", "resources", "res"]:
                for v_item in verified_cart_items:
                    if v_item.get("type") in ["rss", "resources", "res"]:
                        eligible_sum += float(v_item.get("price", 0))
            elif p_target in ["gems", "gem", "sapphires"]:
                for v_item in verified_cart_items:
                    if v_item.get("type") in ["gems", "gem"]:
                        eligible_sum += float(v_item.get("price", 0))
            elif p_target in ["other", "special", "oth"]:
                for v_item in verified_cart_items:
                    if v_item.get("type") in ["special", "other", "oth"]:
                        eligible_sum += float(v_item.get("price", 0))
            elif p_target in ["accounts", "account", "acc"]:
                for v_item in verified_cart_items:
                    if v_item.get("type") in ["account", "acc"]:
                        eligible_sum += float(v_item.get("price", 0))
            elif p_target == "specific" or target_ids:
                for v_item in verified_cart_items:
                    v_type = v_item.get("type", "")
                    prefix = "acc_" if v_type in ["account", "acc"] else (
                             "rss_" if v_type in ["rss", "resources"] else (
                             "gem_" if v_type in ["gems", "gem"] else (
                             "oth_" if v_type in ["special", "other"] else "")))
                    p_id = v_item.get("id") or (v_item.get("product") and v_item.get("product").get("id"))
                    complex_id = f"{prefix}{p_id}"
                    if complex_id in target_ids:
                        eligible_sum += float(v_item.get("price", 0))
            else:
                eligible_sum = verified_subtotal

            if promo_db.target != "guild" and p_target not in ["all", "global", ""] and eligible_sum <= 0.0:
                raise HTTPException(status_code=400, detail="Цей промокод не діє на обрані товари у замовленні")

            if promo_db.type == "percent":
                try:
                    val_pct = float(promo_db.value)
                    discount_amount = eligible_sum * (val_pct / 100.0)
                except Exception:
                    discount_amount = 0.0
            elif promo_db.type == "fixed":
                try:
                    val_fix = float(promo_db.value)
                    discount_amount = min(eligible_sum, val_fix)
                except Exception:
                    discount_amount = 0.0

    verified_total = max(0.0, round(verified_subtotal - discount_amount, 2))
    verified_profit = max(0.0, round(verified_total - verified_total_cost, 2))

    # Перевірка суми від клієнта проти перевіреної серверної (допуск 0.15$ на можливі розбіжності JS-округлення)
    client_total = float(order.total)
    if abs(verified_total - client_total) > 0.15:
        raise HTTPException(
            status_code=400,
            detail=f"Невідповідність суми замовлення. Розрахунок сервера: ${verified_total:.2f}, отримано від клієнта: ${client_total:.2f}"
        )

    pm_lower = order.paymentMethod.strip().lower()
    is_balance_payment = any(
        w in pm_lower for w in ["balance", "wallet", "з балансу", "from balance", "гаманець", "coins", "баланс"])

    # 💳 АТОМАРНА ОПЛАТА З БАЛАНСУ (Race Condition & Double Spend Protection)
    if is_balance_payment:
        if is_topup:
            raise HTTPException(status_code=400, detail="Неможливо поповнити баланс з власного балансу")
        if not secure_user_id:
            raise HTTPException(status_code=401, detail="Ви не авторизовані / Not authorized")

        affected = db.query(models.UserDB).filter(
            models.UserDB.id == secure_user_id,
            models.UserDB.balance >= verified_total
        ).update(
            {"balance": models.UserDB.balance - verified_total},
            synchronize_session=False
        )
        if affected == 0:
            raise HTTPException(status_code=400, detail="Недостатньо коштів на балансі / Insufficient balance")
        db.commit()

    # Фіксація використання промокоду
    if promo_db:
        promo_db.current_uses = (promo_db.current_uses or 0) + 1
        if (promo_db.max_uses or 0) > 0 and (promo_db.current_uses or 0) >= (promo_db.max_uses or 0):
            promo_db.is_active = 0
        db.commit()
        verified_cart_items.append({
            "_meta_promo": True,
            "promo_code": promo_db.code,
            "product": {"title": f"Промокод: {promo_db.code}", "name": f"Промокод: {promo_db.code}"}
        })

    # 🔒 Блокування куплених акаунтів (переводимо в 'sold')
    for acc_id in purchased_account_ids:
        db.query(models.AccountDB).filter(models.AccountDB.id == acc_id).update(
            {"status": "sold"}, synchronize_session=False
        )
    if purchased_account_ids:
        db.commit()

    initial_status = "paid_processing" if (is_balance_payment and not is_topup) else (
        "completed" if (is_balance_payment and is_topup) else "awaiting_payment")

    final_payment_method = "З балансу / Balance" if is_balance_payment else escape_html(order.paymentMethod)

    new_order = models.OrderDB(
        user_id=secure_user_id,
        cart_data=json.dumps(verified_cart_items),
        payment_method=final_payment_method,
        total=f"{verified_total:.2f}",
        profit=f"{verified_profit:.2f}",
        status=initial_status
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    # 1. Автоматична бухгалтерія для воркерів
    for item in verified_cart_items:
        if item.get("type") == "account":
            acc_id = item.get("id") or (item.get("product") and item.get("product").get("id"))
            if acc_id:
                acc_in_db = db.query(models.AccountDB).filter(models.AccountDB.id == acc_id).first()
                if acc_in_db and acc_in_db.tags:
                    raw_tags = acc_in_db.tags.split(",")
                    worker_tag = None
                    for t in raw_tags:
                        t_clean = t.strip()
                        if t_clean.startswith("@"):
                            worker_tag = t_clean
                            break
                    if worker_tag:
                        cost_price = float(acc_in_db.base_price or 0)
                        assignment = models.OrderAssignmentDB(
                            order_id=new_order.id,
                            worker_name=worker_tag,
                            cost_amount=cost_price,
                            is_credited=False
                        )
                        db.add(assignment)
                        db.commit()

    # 2. Кешбек - нараховується ТІЛЬКИ при завершенні замовлення (completed)
    # ⚠️ НЕ нараховуємо тут щоб уникнути подвійного нарахування!
    # Нарахування відбувається в _process_order_status_change коли статус -> completed

    # 3. Сповіщення покупця на сайті
    client_lang = "ua"
    if verified_cart_items and isinstance(verified_cart_items[0], dict) and verified_cart_items[0].get("_lang"):
        client_lang = str(verified_cart_items[0]["_lang"]).strip().lower()
    is_uk_client = client_lang.startswith("uk") or client_lang.startswith("ua")
    is_de_client = client_lang.startswith("de")

    if secure_user_id and not is_topup:
        if is_uk_client:
            notif_title = f"Замовлення #{new_order.id} оформлено!"
            notif_msg = f"Ваше замовлення #{new_order.id} створено. Перейдіть у чат для деталей."
            tg_msg = f"✅ <b>Замовлення #{new_order.id} оформлено!</b>\nПеревірте статус на сайті."
        elif is_de_client:
            notif_title = f"Bestellung #{new_order.id} aufgegeben!"
            notif_msg = f"Ihre Bestellung #{new_order.id} wurde erstellt. Gehen Sie zum Chat für Details."
            tg_msg = f"✅ <b>Bestellung #{new_order.id} aufgegeben!</b>\nÜberprüfen Sie den Status auf der Website."
        else:
            notif_title = f"Order #{new_order.id} created!"
            notif_msg = f"Order #{new_order.id} created. Go to chat for details."
            tg_msg = f"✅ <b>Order #{new_order.id} created!</b>\nCheck the status on the website."

        db.add(models.NotificationDB(
            user_id=secure_user_id,
            title=notif_title,
            message=notif_msg,
            type="info"
        ))
        db.commit()
        buyer = db.query(models.UserDB).filter(models.UserDB.id == secure_user_id).first()
        if buyer and buyer.telegram_chat_id and TELEGRAM_BOT_TOKEN:
            def _send_buyer_tg(b_chat_id, text_to_send):
                try:
                    r_buyer = tg_session.post(
                        f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                        json={
                            "chat_id": b_chat_id,
                            "text": text_to_send,
                            "parse_mode": "HTML"
                        },
                        timeout=5
                    )
                    if not r_buyer.ok:
                        print(f"⚠️ Помилка відправки в TG покупцю ({b_chat_id}): {r_buyer.text}")
                except Exception as e:
                    print("⚠️ Exception sending TG notification to buyer:", e)
            import threading
            threading.Thread(target=_send_buyer_tg, args=(buyer.telegram_chat_id, tg_msg), daemon=True).start()

    if initial_status == "awaiting_payment":
        if is_uk_client:
            sys_text = "Вітаємо! Ваше замовлення створено. Очікуйте реквізити для оплати."
        elif is_de_client:
            sys_text = "Herzlich willkommen! Ihre Bestellung wurde erstellt. Bitte warten Sie auf die Zahlungsdaten."
        else:
            sys_text = "Welcome! Your order has been created. Please wait for payment details."

        sys_msg = models.TicketMessageDB(
            order_id=new_order.id, sender="system",
            text=sys_text,
            is_secret=False
        )
        db.add(sys_msg)
        db.commit()

    # 4. ⚡ НАДШВИДКА ВІДПОВІДЬ: Створення теми в форумі адмінів переноситься у BackgroundTasks
    background_tasks.add_task(
        dispatch_telegram_order_notification,
        new_order.id, secure_user_id, is_topup, initial_status
    )

    return {"status": "success", "order_id": new_order.id}