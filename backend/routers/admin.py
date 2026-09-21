from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import requests
import os

from database import get_db
import models
import schemas
from utils import get_current_admin

# Завантажуємо токен для розсилки повідомлень
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

# Створюємо роутер
router = APIRouter(tags=["Admin"])


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
                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
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
                    requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                  json={"chat_id": u.telegram_chat_id,
                                        "text": f"📢 <b>{data.title}</b>\n\n{data.message}", "parse_mode": "HTML"})
                except Exception:
                    pass
    db.commit()
    return {"status": "success"}


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