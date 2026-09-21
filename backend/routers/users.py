from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import bcrypt
from jose import jwt, JWTError
from datetime import timedelta

from database import get_db
import models
import schemas
from utils import (
    FRONTEND_URL, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES,
    create_access_token, create_refresh_token, create_reset_token,
    send_reset_email, get_current_user, check_is_admin
)

# Створюємо роутер
router = APIRouter(tags=["Users"])

@router.post("/api/register")
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
        referrer = db.query(models.UserDB).filter(models.UserDB.username.ilike(user.ref.strip())).first()
        if referrer and referrer.username.lower() != user.username.lower():
            referrer_name = referrer.username
            referrer.referral_count += 1

    new_user = models.UserDB(username=user.username, email=user.email, password_hash=hashed_pwd,
                             registered_ip=client_ip, referred_by=referrer_name)
    db.add(new_user)
    db.commit()
    db.add(models.NotificationDB(user_id=new_user.id, title="Welcome! / Ласкаво просимо!",
                                 message="Welcome to LORDS SHOP. / Дякуємо за реєстрацію на LORDS SHOP.", type="info"))
    db.commit()
    return {"status": "success", "message": "Реєстрація успішна!"}


@router.post("/api/login")
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
        {"status": "success", "user_id": db_user.id, "username": db_user.username, "balance": db_user.balance})
    response.set_cookie("access_token", access_token, httponly=True, secure=False, samesite="Lax",
                        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    response.set_cookie("refresh_token", refresh_token, httponly=True, secure=False, samesite="Lax",
                        max_age=7 * 24 * 60 * 60)
    return response


@router.post("/api/forgot-password")
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
    response.delete_cookie("access_token", samesite="Lax")
    response.delete_cookie("refresh_token", samesite="Lax")
    return response


@router.post("/api/refresh-token")
def refresh_access_token(request: schemas.RefreshTokenRequest, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(request.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
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
        response.set_cookie("access_token", new_access_token, httponly=True, secure=False, samesite="Lax",
                            max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60)
        response.set_cookie("refresh_token", new_refresh_token, httponly=True, secure=False, samesite="Lax",
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
        return {
            "balance": float(user.balance),
            "referral_count": user.referral_count,
            "referral_earnings": float(user.referral_earnings),
            "telegram": user.telegram_chat_id
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
    referrals = db.query(models.UserDB).filter(models.UserDB.referred_by == current_user.username).all()
    ref_list = [{"id": r.id, "username": r.username} for r in referrals]
    return {"status": "success", "referral_count": current_user.referral_count,
            "referral_earnings": current_user.referral_earnings, "referrals": ref_list}


@router.put("/api/users/{user_id}/update")
def update_user_profile(user_id: int, data: schemas.UserProfileUpdate, current_user: models.UserDB = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    if current_user.id != user_id:
        raise HTTPException(status_code=403)
    user = db.query(models.UserDB).filter(models.UserDB.id == user_id).first()
    if data.username:
        user.username = data.username
    if data.new_password:
        user.password_hash = bcrypt.hashpw(data.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    if data.telegram:
        user.telegram_chat_id = data.telegram
    db.commit()
    return {"status": "success"}


@router.get("/api/users/{user_id}/notifications")
def get_user_notifications(user_id: int, db: Session = Depends(get_db)):
    return db.query(models.NotificationDB).filter(models.NotificationDB.user_id == user_id).order_by(
        models.NotificationDB.id.desc()).all()


@router.put("/api/users/{user_id}/notifications/read")
def read_user_notifications(user_id: int, db: Session = Depends(get_db)):
    db.query(models.NotificationDB).filter(models.NotificationDB.user_id == user_id,
                                           models.NotificationDB.is_read == False).update({"is_read": True})
    db.commit()
    return {"status": "success"}