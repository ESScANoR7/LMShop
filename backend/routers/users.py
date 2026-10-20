from fastapi import APIRouter, Depends, HTTPException, Request, status, File, UploadFile, Form
import os, uuid
from typing import Optional
from fastapi.responses import JSONResponse
from sqlalchemy import func
from sqlalchemy.orm import Session
import bcrypt
import json
from jose import jwt, JWTError
from datetime import timedelta

from database import get_db
import models
import schemas
from utils import (
    FRONTEND_URL, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES,
    create_access_token, create_refresh_token, create_reset_token,
    send_reset_email, get_current_user, check_is_admin, limiter,
    COOKIE_SECURE, COOKIE_SAMESITE
)

# Створюємо роутер
router = APIRouter(tags=["Users"])


def get_user_total_spent(db: Session, user_id: int) -> float:
    """
    Рахує реальну суму виконаних покупок користувача за весь час (без поповнень балансу)
    """
    orders = db.query(models.OrderDB).filter(
        models.OrderDB.user_id == user_id,
        models.OrderDB.status == "completed"
    ).all()
    total = 0.0
    for o in orders:
        try:
            items = json.loads(o.cart_data)
            if any(isinstance(it, dict) and it.get("type") == "topup" for it in items):
                continue
        except Exception:
            pass
        try:
            total += float(o.total or 0.0)
        except (ValueError, TypeError):
            pass
    return round(total, 2)


def calculate_tier_progress(total_spent: float, tiers: list):
    """
    Визначає поточний та наступний ранг кешбеку користувача, залишок до підвищення та відсоток прогресу
    """
    from routers.products import DEFAULT_CASHBACK_TIERS
    if not tiers or not isinstance(tiers, list):
        tiers = DEFAULT_CASHBACK_TIERS
    try:
        sorted_tiers = sorted(tiers, key=lambda x: float(x.get("threshold", 0)))
    except Exception:
        sorted_tiers = DEFAULT_CASHBACK_TIERS

    current_tier = sorted_tiers[0]
    next_tier = None

    for t in sorted_tiers:
        try:
            t_thresh = float(t.get("threshold", 0))
        except Exception:
            t_thresh = 0.0
        if total_spent >= t_thresh:
            current_tier = t
        else:
            if next_tier is None:
                next_tier = t

    needed_for_next = 0.0
    progress_percent = 100.0
    if next_tier:
        try:
            next_thresh = float(next_tier.get("threshold", 0))
            curr_thresh = float(current_tier.get("threshold", 0))
            needed_for_next = max(0.0, round(next_thresh - total_spent, 2))
            span = next_thresh - curr_thresh
            if span > 0:
                progress_percent = min(100.0, max(0.0, round(((total_spent - curr_thresh) / span) * 100.0, 1)))
            else:
                progress_percent = 100.0
        except Exception:
            needed_for_next = 0.0
            progress_percent = 100.0

    return {
        "total_spent": total_spent,
        "current_tier": current_tier,
        "next_tier": next_tier,
        "needed_for_next": needed_for_next,
        "progress_percent": progress_percent,
        "progress_pct": progress_percent,
        "tiers": sorted_tiers,
        "all_tiers": sorted_tiers
    }

@router.post("/api/register")
@limiter.limit("5/minute")
def register_user(request: Request, user: schemas.UserRegister, db: Session = Depends(get_db)):
    client_ip = request.client.host
    if len(user.username) > 50 or len(user.password) > 100:
        raise HTTPException(status_code=400, detail="Дані занадто довгі")

    if db.query(models.UserDB).filter(models.UserDB.registered_ip == client_ip,
                                      models.UserDB.is_banned == True).first():
        raise HTTPException(status_code=403, detail="Ваш IP у чорному списку. Доступ заборонено.")

    if db.query(models.UserDB).filter(
            (models.UserDB.username == user.username) | (models.UserDB.email == user.email)).first():
        raise HTTPException(status_code=400, detail="Користувач з таким нікнеймом або email вже існує")

    hashed_pwd = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    referrer_name = None
    if user.ref and user.ref.strip() != "":
        clean_ref = user.ref.strip()
        referrer = db.query(models.UserDB).filter(models.UserDB.username.ilike(clean_ref)).first()
        if referrer and referrer.username.lower() != user.username.lower():
            referrer_name = referrer.username
            referrer.referral_count = (referrer.referral_count or 0) + 1

    new_user = models.UserDB(username=user.username, email=user.email, password_hash=hashed_pwd,
                             registered_ip=client_ip, referred_by=referrer_name)
    db.add(new_user)
    db.commit()
    db.add(models.NotificationDB(user_id=new_user.id, title="Ласкаво просимо!",
                                 message="Дякуємо за реєстрацію на LordTreasury!", type="info"))
    db.commit()
    return {"status": "success", "message": "Реєстрація успішна!"}


@router.post("/api/login")
@limiter.limit("5/minute")
def login_user(request: Request, user: schemas.UserLogin, db: Session = Depends(get_db)):
    client_ip = request.client.host
    db_user = db.query(models.UserDB).filter(models.UserDB.username == user.username).first()

    if not db_user or not bcrypt.checkpw(user.password.encode('utf-8'), db_user.password_hash.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Невірний логін або пароль")

    if db_user.is_banned:
        raise HTTPException(status_code=403,
                            detail=f"Ваш акаунт заблоковано! Причина: {db_user.ban_reason or 'Порушення правил'}")
    if db.query(models.UserDB).filter(models.UserDB.registered_ip == client_ip,
                                      models.UserDB.is_banned == True).first():
        raise HTTPException(status_code=403, detail="Ваш IP у чорному списку.")

    db_user.registered_ip = client_ip
    db.commit()

    access_token = create_access_token(data={"sub": str(db_user.id), "username": db_user.username},
                                       expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    refresh_token = create_refresh_token(data={"sub": str(db_user.id), "username": db_user.username})

    response = JSONResponse(
        {"status": "success", "user_id": db_user.id, "username": db_user.username, "balance": db_user.balance, "avatar": db_user.avatar})
    response.set_cookie("access_token", access_token, httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE,
                        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    response.set_cookie("refresh_token", refresh_token, httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE,
                        max_age=7 * 24 * 60 * 60)
    return response


@router.post("/api/forgot-password")
@limiter.limit("3/10minute")
def forgot_password(request: Request, data: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.UserDB).filter(models.UserDB.email == data.email).first()
    if user:
        token = create_reset_token(user.email, user.password_hash)
        reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
        send_reset_email(user.email, reset_link)
    return {"status": "success", "message": "Якщо email знайдено, ми надіслали інструкції."}


@router.post("/api/reset-password")
def reset_password(request: Request, data: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(data.token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "reset":
            raise HTTPException(status_code=400, detail="Невалідний токен")
        email = payload.get("sub")
        secret = payload.get("secret")
        user = db.query(models.UserDB).filter(models.UserDB.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="Користувача не знайдено")
        if user.password_hash[-10:] != secret:
            raise HTTPException(status_code=400, detail="Це посилання вже використане!")
        if len(data.new_password) < 8:
            raise HTTPException(status_code=400, detail="Пароль занадто короткий")

        hashed_pwd = bcrypt.hashpw(data.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        user.password_hash = hashed_pwd
        db.commit()
        return {"status": "success", "message": "Пароль успішно змінено!"}
    except JWTError:
        raise HTTPException(status_code=400, detail="Посилання застаріло або недійсне")


@router.post("/api/logout")
def logout_user():
    response = JSONResponse({"status": "success", "message": "Ви успішно вийшли з акаунта"})
    response.delete_cookie("access_token", samesite=COOKIE_SAMESITE, secure=COOKIE_SECURE)
    response.delete_cookie("refresh_token", samesite=COOKIE_SAMESITE, secure=COOKIE_SECURE)
    return response


@router.post("/api/refresh-token")
def refresh_access_token(request: Request, db: Session = Depends(get_db)):
    try:
        token = request.cookies.get("refresh_token")
        if not token:
            raise HTTPException(status_code=401, detail="Refresh token не знайдено")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if payload.get("type") != "refresh" or not user_id:
            raise HTTPException(status_code=401)
        db_user = db.query(models.UserDB).filter(models.UserDB.id == int(user_id)).first()
        if not db_user or db_user.is_banned:
            raise HTTPException(status_code=401)

        new_access_token = create_access_token(data={"sub": str(db_user.id), "username": db_user.username},
                                               expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
        new_refresh_token = create_refresh_token(data={"sub": str(db_user.id), "username": db_user.username})

        response = JSONResponse({"status": "success"})
        response.set_cookie("access_token", new_access_token, httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE,
                            max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60)
        response.set_cookie("refresh_token", new_refresh_token, httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE,
                            max_age=7 * 24 * 60 * 60)
        return response
    except JWTError:
        raise HTTPException(status_code=401, detail="Невалідний або минулий refresh token")


@router.get("/api/users/{user_id}")
def get_user_data(user_id: int, db: Session = Depends(get_db), current_user: models.UserDB = Depends(get_current_user)):
    if current_user.id != user_id and not check_is_admin(current_user.username):
        raise HTTPException(status_code=403, detail="Доступ заборонено")

    db.expire_all()

    user = db.query(models.UserDB).filter(models.UserDB.id == user_id).first()
    if user:
        from routers.products import DEFAULT_CASHBACK_TIERS
        settings = db.query(models.CashbackSettingsDB).first()
        tiers = DEFAULT_CASHBACK_TIERS
        if settings and settings.tiers:
            try:
                parsed = json.loads(settings.tiers)
                if isinstance(parsed, list) and len(parsed) > 0:
                    tiers = parsed
            except Exception:
                tiers = DEFAULT_CASHBACK_TIERS
        total_spent = get_user_total_spent(db, user_id)
        tier_info = calculate_tier_progress(total_spent, tiers)

        return {
            "balance": float(user.balance),
            "referral_count": user.referral_count,
            "referral_earnings": float(user.referral_earnings),
            "total_spent": total_spent,
            "tier": tier_info["current_tier"],
            "tier_name": tier_info["current_tier"].get("name", "Base"),
            "avatar": user.avatar,
            # ✅ БЕЗПЕКА: не повертаємо Telegram chat_id, лише факт прив'язки
            "telegram": bool(user.telegram_chat_id),
            "telegram_id": user.telegram_chat_id if check_is_admin(current_user.username) else None
        }
    return {"error": "Користувача не знайдено"}


@router.post("/api/users/{user_id}/unlink-telegram")
def unlink_telegram_web(user_id: int, db: Session = Depends(get_db),
                        current_user: models.UserDB = Depends(get_current_user)):
    if current_user.id != user_id:
        raise HTTPException(status_code=403)
    user = db.query(models.UserDB).filter(models.UserDB.id == user_id).first()
    if user:
        user.telegram_chat_id = None
        db.commit()
    return {"status": "success"}


@router.get("/api/users/{user_id}/referrals")
def get_user_referrals(user_id: int, db: Session = Depends(get_db),
                       current_user: models.UserDB = Depends(get_current_user)):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Доступ заборонено")
    referrals = db.query(models.UserDB).filter(models.UserDB.referred_by.ilike(current_user.username)).order_by(models.UserDB.id.desc()).all()
    
    ref_settings = db.query(models.ReferralSettingsDB).first()
    ref_percent = (ref_settings.percent if ref_settings else 2.0) / 100.0

    ref_list = []
    for r in referrals:
        # 1. Шукаємо в таблиці referral_rewards
        reward_sum = db.query(func.sum(models.ReferralRewardDB.amount)).filter(
            models.ReferralRewardDB.referrer_id == current_user.id,
            models.ReferralRewardDB.referral_id == r.id
        ).scalar()

        # 2. Якщо записів у таблиці ще немає (старі замовлення до міграції) - рахуємо по виконаних замовленнях
        if reward_sum is None or reward_sum == 0.0:
            comp_orders = db.query(models.OrderDB).filter(
                models.OrderDB.user_id == r.id,
                models.OrderDB.status == "completed"
            ).all()
            calc_sum = 0.0
            for co in comp_orders:
                pm_lower = str(co.payment_method).lower()
                is_balance = any(w in pm_lower for w in ["balance", "wallet", "з балансу", "from balance", "coins", "баланс"])
                if not is_balance:
                    try:
                        import json
                        items = json.loads(co.cart_data)
                        if any(item.get("type") == "topup" for item in items):
                            continue
                    except Exception:
                        pass
                    calc_sum += float(co.total or 0.0) * ref_percent
            reward_sum = calc_sum

        orders_count = db.query(models.OrderDB).filter(
            models.OrderDB.user_id == r.id,
            models.OrderDB.status == "completed"
        ).count()

        ref_list.append({
            "id": r.id,
            "username": r.username,
            "earned": round(float(reward_sum or 0.0), 2),
            "orders_count": orders_count
        })

    real_count = max(current_user.referral_count or 0, len(ref_list))

    from routers.telegram import get_bot_username
    bot_name = get_bot_username() or "LordTreasury_bot"

    cat_p = {}
    if ref_settings and ref_settings.category_percents:
        try:
            import json
            cat_p = json.loads(ref_settings.category_percents) if isinstance(ref_settings.category_percents, str) else ref_settings.category_percents
        except Exception:
            cat_p = {}

    return {
        "status": "success",
        "referral_count": real_count,
        "referral_earnings": current_user.referral_earnings or 0.0,
        "referrals": ref_list,
        "bot_username": bot_name,
        "category_percents": cat_p
    }


@router.put("/api/users/{user_id}/update")
def update_user_profile(user_id: int, data: schemas.UserProfileUpdate, current_user: models.UserDB = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    if current_user.id != user_id:
        raise HTTPException(status_code=403)
    user = db.query(models.UserDB).filter(models.UserDB.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404)

    if data.username:
        if len(data.username) < 3 or len(data.username) > 20:
            raise HTTPException(status_code=400, detail="Нікнейм повинен бути від 3 до 20 символів")
        import re
        if not re.match(r'^[a-zA-Z0-9_-]+$', data.username):
            raise HTTPException(status_code=400, detail="Нікнейм може містити тільки букви, цифри, _ та -")
        # Перевіряємо чи нікнейм вже зайнятий
        existing = db.query(models.UserDB).filter(
            models.UserDB.username == data.username,
            models.UserDB.id != user_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Цей нікнейм вже зайнятий")
        user.username = data.username

    if data.new_password:
        if len(data.new_password) < 8:
            raise HTTPException(status_code=400, detail="Пароль повинен бути мінімум 8 символів")
        user.password_hash = bcrypt.hashpw(data.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    if data.avatar is not None:
        user.avatar = data.avatar

    # ✅ БЕЗПЕКА: telegram_chat_id НЕ оновлюється тут — тільки через /api/telegram/link
    # Поле data.telegram ігнорується для запобігання підміни TG ID

    db.commit()
    return {"status": "success"}


@router.get("/api/users/{user_id}/notifications")
def get_user_notifications(user_id: int, db: Session = Depends(get_db),
                           current_user: models.UserDB = Depends(get_current_user)):
    if current_user.id != user_id and not check_is_admin(current_user.username):
        raise HTTPException(status_code=403, detail="Доступ заборонено")
    return db.query(models.NotificationDB).filter(models.NotificationDB.user_id == user_id).order_by(
        models.NotificationDB.id.desc()).all()


@router.put("/api/users/{user_id}/notifications/read")
def read_user_notifications(user_id: int, db: Session = Depends(get_db),
                            current_user: models.UserDB = Depends(get_current_user)):
    if current_user.id != user_id and not check_is_admin(current_user.username):
        raise HTTPException(status_code=403, detail="Доступ заборонено")
    db.query(models.NotificationDB).filter(models.NotificationDB.user_id == user_id,
                                           models.NotificationDB.is_read == False).update({"is_read": True})
    db.commit()
    return {"status": "success"}


@router.put("/api/users/{user_id}/notifications/{notif_id}/read")
def read_single_user_notification(user_id: int, notif_id: int, db: Session = Depends(get_db),
                                   current_user: models.UserDB = Depends(get_current_user)):
    if current_user.id != user_id and not check_is_admin(current_user.username):
        raise HTTPException(status_code=403, detail="Доступ заборонено")
    notif = db.query(models.NotificationDB).filter(
        models.NotificationDB.id == notif_id,
        models.NotificationDB.user_id == user_id
    ).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"status": "success"}


@router.post("/api/users/{user_id}/avatar")
async def upload_user_avatar(
    user_id: int,
    file: UploadFile = File(None),
    avatar_url: Optional[str] = Form(None),
    current_user: models.UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.id != user_id and not check_is_admin(current_user.username):
        raise HTTPException(status_code=403, detail="Доступ заборонено")

    user = db.query(models.UserDB).filter(models.UserDB.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Користувача не знайдено")

    if file and file.filename:
        upload_dir = os.path.join("static", "uploads", "avatars")
        os.makedirs(upload_dir, exist_ok=True)
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
            raise HTTPException(status_code=400, detail="Непідтримуваний формат зображення (дозволені: JPG, PNG, WEBP, GIF)")

        unique_name = f"avatar_{user_id}_{uuid.uuid4().hex[:8]}{ext}"
        file_path = os.path.join(upload_dir, unique_name)

        contents = await file.read()
        if len(contents) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Розмір фото перевищує 10 МБ")

        with open(file_path, "wb") as out_f:
            out_f.write(contents)

        avatar_path = f"/static/uploads/avatars/{unique_name}"
        user.avatar = avatar_path
        db.commit()
        return {"status": "success", "avatar": avatar_path}
    elif avatar_url:
        user.avatar = avatar_url
        db.commit()
        return {"status": "success", "avatar": avatar_url}
    else:
        raise HTTPException(status_code=400, detail="Файл або аватар обов'язкові")


@router.get("/api/users/{user_id}/cashback-tier")
def get_user_cashback_tier(user_id: int, db: Session = Depends(get_db),
                           current_user: models.UserDB = Depends(get_current_user)):
    if current_user.id != user_id and not check_is_admin(current_user.username):
        raise HTTPException(status_code=403, detail="Доступ заборонено")

    from routers.products import DEFAULT_CASHBACK_TIERS
    settings = db.query(models.CashbackSettingsDB).first()
    tiers = DEFAULT_CASHBACK_TIERS
    if settings and settings.tiers:
        try:
            parsed = json.loads(settings.tiers)
            if isinstance(parsed, list) and len(parsed) > 0:
                tiers = parsed
        except Exception:
            tiers = DEFAULT_CASHBACK_TIERS

    total_spent = get_user_total_spent(db, user_id)
    info = calculate_tier_progress(total_spent, tiers)
    info["status"] = "success"
    info["user_id"] = user_id
    return info