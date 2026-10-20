from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
import requests
import os
import bcrypt
from datetime import datetime, timedelta

from database import get_db
import models
import schemas
from utils import get_current_admin, limiter, COOKIE_SECURE, COOKIE_SAMESITE, tg_session

# Завантажуємо токен для розсилки повідомлень
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

# Створюємо роутер
router = APIRouter(tags=["Admin"])


# ==========================================
# 👥 УПРАВЛІННЯ КОРИСТУВАЧАМИ
# ==========================================

@router.get("/api/admin/users")
def admin_get_all_users(db: Session = Depends(get_db), current_admin: models.UserDB = Depends(get_current_admin)):
    users = db.query(models.UserDB).order_by(models.UserDB.id.desc()).all()
    return [{"id": u.id, "username": u.username, "email": u.email, "balance": u.balance, "is_banned": u.is_banned,
             "ban_reason": u.ban_reason, "ip": u.registered_ip or "Невідомо", "referred_by": u.referred_by or "Ніхто",
             "referral_count": u.referral_count, "referral_earnings": u.referral_earnings} for u in users]


@router.post("/api/admin/users/{user_id}/balance")
def admin_update_user_balance(user_id: int, data: schemas.UserBalanceUpdate, db: Session = Depends(get_db),
                              current_admin: models.UserDB = Depends(get_current_admin)):
    user = db.query(models.UserDB).filter(models.UserDB.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Користувача не знайдено")

    old_balance = user.balance
    if data.action == "add":
        new_balance = float(user.balance) + float(data.amount)
        db.query(models.UserDB).filter(models.UserDB.id == user.id).update({"balance": new_balance},
                                                                           synchronize_session=False)
    elif data.action == "set":
        db.query(models.UserDB).filter(models.UserDB.id == user.id).update({"balance": float(data.amount)},
                                                                           synchronize_session=False)
    elif data.action == "reset":
        db.query(models.UserDB).filter(models.UserDB.id == user.id).update({"balance": 0.0}, synchronize_session=False)
    else:
        raise HTTPException(status_code=400, detail="Невідома дія")

    db.commit()

    user.balance = float(db.query(models.UserDB).filter(models.UserDB.id == user_id).first().balance)

    msg = f"Ваш баланс було оновлено адміністратором. Поточний баланс: ${user.balance:.2f}"
    db.add(models.NotificationDB(user_id=user.id, title="💳 Оновлення балансу", message=msg, type="info"))
    db.commit()
    return {"status": "success", "new_balance": user.balance, "old_balance": old_balance}


@router.post("/api/admin/users/{user_id}/ban")
def admin_ban_user(user_id: int, data: schemas.BanActionRequest, db: Session = Depends(get_db),
                   current_admin: models.UserDB = Depends(get_current_admin)):
    user = db.query(models.UserDB).filter(models.UserDB.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404)
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Ви не можете забанити самого себе.")
    user.is_banned = True
    user.ban_reason = data.reason
    db.commit()
    return {"status": "success"}


@router.post("/api/admin/users/{user_id}/unban")
def admin_unban_user(user_id: int, db: Session = Depends(get_db),
                     current_admin: models.UserDB = Depends(get_current_admin)):
    user = db.query(models.UserDB).filter(models.UserDB.id == user_id).first()
    user.is_banned = False
    user.ban_reason = None
    db.commit()
    return {"status": "success"}


# ==========================================
# 🔔 СПОВІЩЕННЯ
# ==========================================

@router.post("/api/admin/notifications/send")
def admin_send_notification(data: schemas.AdminNotificationSend, db: Session = Depends(get_db),
                            current_admin: models.UserDB = Depends(get_current_admin)):
    if data.user_id:
        user = db.query(models.UserDB).filter(models.UserDB.id == data.user_id).first()
        if not user:
            raise HTTPException(status_code=404)
        db.add(models.NotificationDB(user_id=user.id, title=data.title, message=data.message, type=data.type))
        if user.telegram_chat_id and TELEGRAM_BOT_TOKEN:
            try:
                tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                              json={"chat_id": user.telegram_chat_id,
                                    "text": f"🔔 <b>{data.title}</b>\n\n{data.message}", "parse_mode": "HTML"})
            except Exception:
                pass
    else:
        users = db.query(models.UserDB).all()
        for u in users:
            db.add(models.NotificationDB(user_id=u.id, title=data.title, message=data.message, type=data.type))
            if u.telegram_chat_id and TELEGRAM_BOT_TOKEN:
                try:
                    tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                  json={"chat_id": u.telegram_chat_id,
                                        "text": f"📢 <b>{data.title}</b>\n\n{data.message}", "parse_mode": "HTML"})
                except Exception:
                    pass
    db.commit()
    return {"status": "success"}


# ==========================================
# 💰 ЗАРПЛАТИ ВОРКЕРІВ
# ==========================================

@router.get("/api/admin/workers/accounting")
def get_workers_accounting(db: Session = Depends(get_db), current_admin: models.UserDB = Depends(get_current_admin)):
    workers = db.query(models.WorkerAccountingDB).all()
    return [{"worker_name": w.worker_name, "current_unpaid": w.current_unpaid, "total_paid": w.total_paid} for w in
            workers]


@router.post("/api/admin/workers/pay_all")
def pay_worker_all(data: schemas.WorkerPayRequest, db: Session = Depends(get_db),
                   current_admin: models.UserDB = Depends(get_current_admin)):
    worker_acc = db.query(models.WorkerAccountingDB).filter(models.WorkerAccountingDB.worker_name == data.worker_name).first()
    if not worker_acc:
        raise HTTPException(status_code=404, detail="Адміна не знайдено")
    worker_acc.total_paid += worker_acc.current_unpaid
    worker_acc.current_unpaid = 0.0
    db.commit()
    return {"status": "success", "message": f"Виплату для {data.worker_name} успішно зафіксовано!"}


# ==========================================
# 🔐 БЕЗПЕКА АДМІНА: ЗМІНА ПАРОЛЯ
# ==========================================

@router.post("/api/admin/change-password")
@limiter.limit("3/hour")  # ← максимум 3 спроби на годину
def admin_change_password(
    request: Request,
    data: schemas.AdminChangePassword,
    db: Session = Depends(get_db),
    current_admin: models.UserDB = Depends(get_current_admin)
):
    # 1. Перевірка що паролі збігаються
    if data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Новий пароль та підтвердження не збігаються")

    # 2. Мінімальна довжина для адміна — 12 символів
    if len(data.new_password) < 12:
        raise HTTPException(status_code=400, detail="Пароль адміна має бути мінімум 12 символів")

    # 3. Верифікація старого пароля
    if not bcrypt.checkpw(data.old_password.encode('utf-8'), current_admin.password_hash.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Невірний поточний пароль")

    # 4. Хешуємо та зберігаємо новий пароль
    new_hash = bcrypt.hashpw(data.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    current_admin.password_hash = new_hash
    db.commit()

    # 5. Відповідь — фронтенд повинен виконати logout
    response = JSONResponse({"status": "success", "message": "Пароль успішно змінено! Виконується вихід з усіх пристроїв."})
    # Інвалідуємо поточні cookies (logout з усіх пристроїв)
    response.delete_cookie("access_token", samesite=COOKIE_SAMESITE, secure=COOKIE_SECURE)
    response.delete_cookie("refresh_token", samesite=COOKIE_SAMESITE, secure=COOKIE_SECURE)
    return response


# ==========================================
# 📊 СТАТИСТИКА ДАШБОРДУ (DASHBOARD)
# ==========================================

@router.get("/api/admin/dashboard/stats")
def admin_get_dashboard_stats(db: Session = Depends(get_db), current_admin: models.UserDB = Depends(get_current_admin)):
    """Повна статистика для дашборду адміна."""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=6)

    # --- Загальні метрики ---
    all_orders = db.query(models.OrderDB).all()
    completed_orders = [o for o in all_orders if o.status == "completed"]
    new_orders = [o for o in all_orders if o.status == "new"]
    processing_orders = [o for o in all_orders if o.status == "processing"]

    total_revenue = sum(float(o.total or 0) for o in completed_orders)
    total_profit = sum(float(o.profit or 0) for o in completed_orders)

    # --- Метрики за сьогодні ---
    today_orders = [o for o in completed_orders if o.created_at and o.created_at >= today_start]
    today_revenue = sum(float(o.total or 0) for o in today_orders)
    today_profit = sum(float(o.profit or 0) for o in today_orders)

    # --- Нові замовлення за сьогодні (всі статуси) ---
    today_all_orders = [o for o in all_orders if o.created_at and o.created_at >= today_start]

    # --- Користувачі ---
    total_users = db.query(models.UserDB).count()
    today_users = db.query(models.UserDB).count()  # спрощено, якщо немає created_at у UserDB

    # --- Графік продажів за останні 7 днів ---
    daily_revenue = []
    for i in range(6, -1, -1):
        day_start = today_start - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        day_orders = [o for o in completed_orders if o.created_at and day_start <= o.created_at < day_end]
        day_rev = sum(float(o.total or 0) for o in day_orders)
        day_prof = sum(float(o.profit or 0) for o in day_orders)
        daily_revenue.append({
            "date": day_start.strftime("%d.%m"),
            "day": day_start.strftime("%a"),
            "revenue": round(day_rev, 2),
            "profit": round(day_prof, 2),
            "orders": len(day_orders)
        })

    # --- Топ товарів (аналіз cart_data) ---
    import json
    product_counts = {}
    for order in completed_orders:
        try:
            items = json.loads(order.cart_data or "[]")
            for item in items:
                if isinstance(item, dict):
                    name = item.get("product", {}).get("name") or item.get("product", {}).get("title")
                    if name and not name.startswith("🎁") and not name.startswith("🏷️"):
                        product_counts[name] = product_counts.get(name, 0) + 1
        except Exception:
            pass

    top_products = sorted(product_counts.items(), key=lambda x: x[1], reverse=True)[:5]

    # --- Промокоди ---
    promo_list = db.query(models.PromoCodeDB).all()
    total_promo_uses = sum(p.current_uses or 0 for p in promo_list)
    active_promos = sum(1 for p in promo_list if p.is_active)

    return {
        "overview": {
            "total_revenue": round(total_revenue, 2),
            "total_profit": round(total_profit, 2),
            "total_orders": len(all_orders),
            "completed_orders": len(completed_orders),
            "new_orders": len(new_orders),
            "processing_orders": len(processing_orders),
            "total_users": total_users,
            "total_promo_uses": total_promo_uses,
            "active_promos": active_promos,
        },
        "today": {
            "revenue": round(today_revenue, 2),
            "profit": round(today_profit, 2),
            "orders": len(today_all_orders),
            "completed": len(today_orders),
        },
        "daily_chart": daily_revenue,
        "top_products": [{"name": name, "count": count} for name, count in top_products],
        "recent_orders": [
            {
                "id": o.id,
                "total": o.total,
                "profit": o.profit,
                "status": o.status,
                "payment_method": o.payment_method,
                "created_at": o.created_at.strftime("%d.%m %H:%M") if o.created_at else "—",
            }
            for o in sorted(all_orders, key=lambda x: x.id, reverse=True)[:8]
        ],
    }