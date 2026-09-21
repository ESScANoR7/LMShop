from fastapi import FastAPI, Depends, HTTPException, Request, status, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr
from contextlib import asynccontextmanager
import uvicorn
import requests
import json
import bcrypt
import os
import uuid
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from PIL import Image
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Float, Boolean
from datetime import datetime, timedelta

from jose import JWTError, jwt
from dotenv import load_dotenv
from fastapi.security import HTTPBearer

from database import engine, get_db
import models
from utils import *

# Завантажуємо .env файл НА САМОМУ ПОЧАТКУ
load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
TELEGRAM_CHAT_ID_ACCOUNTS = os.getenv("TELEGRAM_CHAT_ID_ACCOUNTS")
TELEGRAM_FORUM_CHAT_ID = os.getenv("TELEGRAM_FORUM_CHAT_ID")

# Завантажуємо налаштування вітрини (ID каналу та гілок)
STOREFRONT_CHAT_ID = os.getenv("STOREFRONT_CHAT_ID") or TELEGRAM_CHAT_ID
STOREFRONT_TOPIC_ACC = os.getenv("STOREFRONT_TOPIC_ACC")
STOREFRONT_TOPIC_GEM = os.getenv("STOREFRONT_TOPIC_GEM")
STOREFRONT_TOPIC_RES = os.getenv("STOREFRONT_TOPIC_RES")
STOREFRONT_TOPIC_OTH = os.getenv("STOREFRONT_TOPIC_OTH")
STOREFRONT_TOPIC_COINS = os.getenv("STOREFRONT_TOPIC_COINS")

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("JWT_SECRET_KEY must be set in .env file")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))
FRONTEND_URL = os.getenv("VITE_FRONTEND_URL", "http://localhost:5173")


# ==========================================
# 🗄️ НОВІ МОДЕЛІ (АВТОБУХГАЛТЕРІЯ ТА РЕФЕРАЛКА)
# ==========================================
class WorkerAccountingDB(models.Base):
    __tablename__ = "worker_accounting"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    worker_name = Column(String, unique=True, index=True)
    current_unpaid = Column(Float, default=0.0)
    total_paid = Column(Float, default=0.0)


class OrderAssignmentDB(models.Base):
    __tablename__ = "order_assignments"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, unique=True, index=True)
    worker_name = Column(String)
    cost_amount = Column(Float, default=0.0)
    is_credited = Column(Boolean, default=False)


class ReferralSettingsDB(models.Base):
    __tablename__ = "referral_settings"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    percent = Column(Float, default=5.0)
    is_active = Column(Boolean, default=True)


class OrderTopicDB(models.Base):
    __tablename__ = "order_topics"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, unique=True, index=True)
    topic_id = Column(Integer, index=True)


# 🔥 НОВА ТАБЛИЦЯ: Пам'ять для автоматичної публікації на вітрині
class StorefrontMessageDB(models.Base):
    __tablename__ = "storefront_messages"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    item_group = Column(String, index=True)  # 'acc', 'gem', 'res', 'oth', 'coins'
    item_id = Column(Integer, index=True)
    message_id = Column(Integer)


models.Base.metadata.create_all(bind=engine)


# ==========================================
# 🤖 СТВОРЕННЯ МЕНЮ ДЛЯ TELEGRAM-БОТА (НОВИЙ СТАНДАРТ)
# ==========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    if TELEGRAM_BOT_TOKEN:
        commands = [
            {"command": "start", "description": "Головне меню / Main Menu"},
            {"command": "profile", "description": "Профіль та Баланс / Profile & Balance"},
            {"command": "help", "description": "Допомога (Інструкція) / Help"}
        ]
        try:
            res = requests.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/setMyCommands",
                json={"commands": commands}
            )
            if res.status_code == 200:
                print("✅ Меню команд Telegram успішно встановлено!")
            else:
                print("❌ Помилка встановлення меню Telegram:", res.text)
        except Exception as e:
            print("❌ Помилка з'єднання з Telegram API при встановленні меню:", e)
    yield


app = FastAPI(lifespan=lifespan)

os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173", "https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# ==========================================
# 🗄️ МОДЕЛІ ДАНИХ ТА КОНФІГИ (Pydantic)
# ==========================================
STORE_CONFIG_FILE = "store_config.json"


def get_store_config():
    if not os.path.exists(STORE_CONFIG_FILE):
        return {"is_offline": False, "offline_categories": [], "offline_message": "🌙 Оператор зараз офлайн."}
    with open(STORE_CONFIG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_store_config(config):
    with open(STORE_CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=4)


class StoreConfigUpdate(BaseModel):
    is_offline: bool
    offline_categories: List[str]
    offline_message: str


class WorkerPayRequest(BaseModel):
    worker_name: str


class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    ref: Optional[str] = ""


class UserLogin(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user_id: int
    username: str
    balance: float


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserProfileUpdate(BaseModel):
    username: Optional[str] = None
    new_password: Optional[str] = None
    telegram: Optional[str] = None
    discord: Optional[str] = None


class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str
    confirm_password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class UserBalanceUpdate(BaseModel):
    action: str
    amount: float = 0.0


class OrderData(BaseModel):
    cart: list
    paymentMethod: str
    total: str
    profit: str = "0"
    user_id: Optional[int] = None
    promo_code: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    status: str


class BanActionRequest(BaseModel):
    reason: str
    ban_ip: bool = True


class AccountCreate(BaseModel):
    title: str
    shortDesc: str
    price: str
    base_price: str = "0"
    tags: str
    bind: str
    images: list
    stats: dict = {}


class AccountStatusUpdate(BaseModel):
    status: str


class ResourceCreate(BaseModel):
    name: str
    desc: str
    price: str
    base_price: str = "0"


class GemCreate(BaseModel):
    range: str
    rate: str
    base_price: str = "0"


class OtherItemCreate(BaseModel):
    name: str
    desc: str
    price: str
    base_price: str = "0"
    tag: str
    color: str
    requiredFields: list


class PromoCodeCreate(BaseModel):
    code: str
    type: str
    value: str
    target: str
    max_uses: int
    min_order_amount: float
    expiry_date: Optional[str] = None
    target_items: Optional[list] = []
    target_names: Optional[list] = []


class CashbackSettingsUpdate(BaseModel):
    percent: float
    excluded_types: str


class ReferralSettingsUpdate(BaseModel):
    percent: float
    is_active: bool


class TelegramLinkData(BaseModel):
    user_id: int
    chat_id: str


class AdminNotificationSend(BaseModel):
    user_id: Optional[int] = None
    title: str
    message: str
    type: str = "info"


class TicketMessageCreate(BaseModel):
    text: str
    is_secret: bool = False


# ==========================================
# 🔐 СИСТЕМА JWT ТОКЕНІВ ТА УТИЛІТИ
# ==========================================
security_scheme = HTTPBearer()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_reset_token(email: str, password_hash: str):
    expire = datetime.utcnow() + timedelta(minutes=30)
    to_encode = {"sub": email, "exp": expire, "type": "reset", "secret": password_hash[-10:]}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def send_reset_email(to_email: str, reset_link: str):
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 465))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")

    if not smtp_user or not smtp_password:
        print("ПОМИЛКА: Не налаштовано SMTP_USER або SMTP_PASSWORD в .env")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Password Reset - LORDS SHOP"
    msg["From"] = f"LORDS SHOP <{smtp_user}>"
    msg["To"] = to_email

    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #09090b; color: #fff; padding: 20px;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #18181b; padding: 30px; border-radius: 15px; border: 1px solid #7f1d1d;">
          <h2 style="color: #ef4444; text-align: center;">Password Reset / Відновлення пароля</h2>
          <p style="color: #d4d4d8;">You received this email because of a password reset request. / Ви отримали цей лист, оскільки був запит на скидання пароля.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_link}" style="background-color: #dc2626; color: white; padding: 14px 30px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; border: 1px solid #f87171;">Reset Password</a>
          </div>
          <p style="color: #71717a; font-size: 12px; text-align: center;">Valid for 30 minutes. / Посилання дійсне 30 хвилин.</p>
        </div>
      </body>
    </html>
    """
    msg.attach(MIMEText(html_content, "html"))

    try:
        with smtplib.SMTP_SSL(smtp_server, smtp_port) as server:
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, to_email, msg.as_string())
    except Exception as e:
        print(f"Помилка відправки листа: {e}")


def escape_html(text: str) -> str:
    if not text:
        return ""
    return str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def check_is_admin(username: str) -> bool:
    allowed_admins = [name.strip().lower() for name in os.getenv("VITE_ADMIN_USERNAMES", "admin").split(',')]
    return username.lower() in allowed_admins


def get_current_admin(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Токен доступу відсутній")

    credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                          detail="Не вдалося валідувати токен")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("username")
        user_id: str = payload.get("sub")
        if username is None or user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    if not check_is_admin(username):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ви не адмін")

    db_user = db.query(models.UserDB).filter(models.UserDB.id == int(user_id)).first()
    if not db_user or db_user.is_banned:
        raise HTTPException(status_code=403, detail="Доступ заблоковано.")
    return db_user


def get_current_user(request: Request, db: Session = Depends(get_db)):
    credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                          detail="Не вдалося валідувати токен", headers={"WWW-Authenticate": "Bearer"})
    token = request.cookies.get("access_token")

    if not token:
        auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]
        else:
            raise credentials_exception

    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    db_user = db.query(models.UserDB).filter(models.UserDB.id == int(user_id)).first()
    if not db_user or db_user.is_banned:
        raise HTTPException(status_code=401, detail="Користувача не знайдено або заблоковано")
    return db_user


# ==========================================
# 🛑 МАРШРУТИ МАГАЗИНУ (ОФЛАЙН РЕЖИМ)
# ==========================================
@app.get("/api/store/status")
def get_store_status():
    return get_store_config()


@app.put("/api/store/status")
def update_store_status(config: StoreConfigUpdate, current_admin: models.UserDB = Depends(get_current_admin)):
    save_store_config(config.dict())
    return {"status": "success", "message": "Статус магазину оновлено!"}


# ==========================================
# 👤 КОРИСТУВАЧІ ТА АВТОРИЗАЦІЯ
# ==========================================
@app.post("/api/register")
def register_user(request: Request, user: UserRegister, db: Session = Depends(get_db)):
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


@app.post("/api/login")
def login_user(request: Request, user: UserLogin, db: Session = Depends(get_db)):
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


@app.post("/api/forgot-password")
def forgot_password(request: Request, data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.UserDB).filter(models.UserDB.email == data.email).first()
    if user:
        token = create_reset_token(user.email, user.password_hash)
        reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
        send_reset_email(user.email, reset_link)
    return {"status": "success", "message": "Якщо email знайдено, ми надіслали інструкції."}


@app.post("/api/reset-password")
def reset_password(request: Request, data: ResetPasswordRequest, db: Session = Depends(get_db)):
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


@app.post("/api/logout")
def logout_user():
    response = JSONResponse({"status": "success", "message": "Ви успішно вийшли з акаунта"})
    response.delete_cookie("access_token", samesite="Lax")
    response.delete_cookie("refresh_token", samesite="Lax")
    return response


@app.post("/api/refresh-token")
def refresh_access_token(request: RefreshTokenRequest, db: Session = Depends(get_db)):
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


@app.get("/api/users/{user_id}")
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


@app.post("/api/users/{user_id}/unlink-telegram")
def unlink_telegram_web(user_id: int, db: Session = Depends(get_db),
                        current_user: models.UserDB = Depends(get_current_user)):
    if current_user.id != user_id:
        raise HTTPException(status_code=403)
    user = db.query(models.UserDB).filter(models.UserDB.id == user_id).first()
    if user:
        user.telegram_chat_id = None
        db.commit()
    return {"status": "success"}


@app.get("/api/users/{user_id}/referrals")
def get_user_referrals(user_id: int, db: Session = Depends(get_db),
                       current_user: models.UserDB = Depends(get_current_user)):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Доступ заборонено")
    referrals = db.query(models.UserDB).filter(models.UserDB.referred_by == current_user.username).all()
    ref_list = [{"id": r.id, "username": r.username} for r in referrals]
    return {"status": "success", "referral_count": current_user.referral_count,
            "referral_earnings": current_user.referral_earnings, "referrals": ref_list}


@app.put("/api/users/{user_id}/update")
def update_user_profile(user_id: int, data: UserProfileUpdate, current_user: models.UserDB = Depends(get_current_user),
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


@app.get("/api/users/{user_id}/notifications")
def get_user_notifications(user_id: int, db: Session = Depends(get_db)):
    return db.query(models.NotificationDB).filter(models.NotificationDB.user_id == user_id).order_by(
        models.NotificationDB.id.desc()).all()


@app.put("/api/users/{user_id}/notifications/read")
def read_user_notifications(user_id: int, db: Session = Depends(get_db)):
    db.query(models.NotificationDB).filter(models.NotificationDB.user_id == user_id,
                                           models.NotificationDB.is_read == False).update({"is_read": True})
    db.commit()
    return {"status": "success"}


# ==========================================
# 👑 АДМІН-МАРШРУТИ ТА РОЗСИЛКА СПОВІЩЕНЬ
# ==========================================
@app.get("/api/admin/users")
def admin_get_all_users(db: Session = Depends(get_db), current_admin: models.UserDB = Depends(get_current_admin)):
    users = db.query(models.UserDB).order_by(models.UserDB.id.desc()).all()
    return [{"id": u.id, "username": u.username, "email": u.email, "balance": u.balance, "is_banned": u.is_banned,
             "ban_reason": u.ban_reason, "ip": u.registered_ip or "Невідомо", "referred_by": u.referred_by or "Ніхто",
             "referral_count": u.referral_count, "referral_earnings": u.referral_earnings} for u in users]


@app.post("/api/admin/users/{user_id}/balance")
def admin_update_user_balance(user_id: int, data: UserBalanceUpdate, db: Session = Depends(get_db),
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


@app.post("/api/admin/users/{user_id}/ban")
def admin_ban_user(user_id: int, data: BanActionRequest, db: Session = Depends(get_db),
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


@app.post("/api/admin/users/{user_id}/unban")
def admin_unban_user(user_id: int, db: Session = Depends(get_db),
                     current_admin: models.UserDB = Depends(get_current_admin)):
    user = db.query(models.UserDB).filter(models.UserDB.id == user_id).first()
    user.is_banned = False
    user.ban_reason = None
    db.commit()
    return {"status": "success"}


@app.post("/api/admin/notifications/send")
def admin_send_notification(data: AdminNotificationSend, db: Session = Depends(get_db),
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


@app.get("/api/admin/workers/accounting")
def get_workers_accounting(db: Session = Depends(get_db), current_admin: models.UserDB = Depends(get_current_admin)):
    workers = db.query(WorkerAccountingDB).all()
    return [{"worker_name": w.worker_name, "current_unpaid": w.current_unpaid, "total_paid": w.total_paid} for w in
            workers]


@app.post("/api/admin/workers/pay_all")
def pay_worker_all(data: WorkerPayRequest, db: Session = Depends(get_db),
                   current_admin: models.UserDB = Depends(get_current_admin)):
    worker_acc = db.query(WorkerAccountingDB).filter(WorkerAccountingDB.worker_name == data.worker_name).first()
    if not worker_acc:
        raise HTTPException(status_code=404, detail="Адміна не знайдено")
    worker_acc.total_paid += worker_acc.current_unpaid
    worker_acc.current_unpaid = 0.0
    db.commit()
    return {"status": "success", "message": f"Виплату для {data.worker_name} успішно зафіксовано!"}


# ==========================================
# 🚀 ГЕНЕРАТОРИ КРАСИВИХ ПОВІДОМЛЕНЬ TELEGRAM
# ==========================================
def format_item_details(item):
    msg = ""
    account_id = item.get("product", {}).get("id") if item.get("type") == "account" else None
    if account_id:
        msg += f"   🆔 <b>ID Акаунта:</b> <code>#{escape_html(str(account_id))}</code>\n"

    if "userData" in item:
        for k, v in item["userData"].items():
            if v is None or str(v).strip() == "":
                continue
            if k == 'amount' and item.get('type') != 'gems':
                continue
            key_name = {"nickname": "Нікнейм", "guild": "Гільдія", "coords": "Координати", "coordinates": "Координати",
                        "might": "Міць", "amount": "Кількість", "itemToBuy": "Товари", "details": "Додатково"}.get(k,
                                                                                                                   k.capitalize())

            if isinstance(v, list):
                if not v:
                    continue
                msg += f"   🔸 {key_name}:\n"
                for li in v:
                    msg += f"      🔹 {escape_html(str(li))}\n"
            else:
                msg += f"   🔸 {key_name}: <code>{escape_html(str(v))}</code>\n"
    return msg


def generate_filtered_order_text(db, db_order, status="new", filter_type="general"):
    try:
        cart = json.loads(db_order.cart_data)
    except Exception:
        cart = []

    if filter_type == "accounts":
        filtered_cart = [item for item in cart if item.get("type") == "account"]
    else:
        filtered_cart = [item for item in cart if
                         item.get("type") != "account" and item.get("type") != "topup" and not item.get("_meta_promo")]

    if not filtered_cart:
        return None

    user_model = db.query(models.UserDB).filter(
        models.UserDB.id == db_order.user_id).first() if db_order.user_id else None
    buyer_name = escape_html(user_model.username) if user_model else 'Гість'

    # 🔥 БЕЗ ЕМОДЗІ
    if status == "awaiting_payment":
        msg = f"<b>ОЧІКУЄ ОПЛАТИ #{db_order.id}</b>\n\n"
    else:
        msg = f"<b>НОВЕ ЗАМОВЛЕННЯ #{db_order.id}</b>\n\n"

    msg += f"💳 <b>Оплата:</b> {'З БАЛАНСУ' if db_order.payment_method == 'balance' else escape_html(db_order.payment_method).upper()}\n"
    msg += f"👤 <b>Покупець:</b> {buyer_name}\n\n🛒 <b>Частина кошика для обробки:</b>\n"

    for index, item in enumerate(filtered_cart, 1):
        product_name = escape_html(item.get("product", {}).get("name") or item.get("product", {}).get("title"))
        msg += f"<b>{index}. {product_name}</b>\n"
        msg += format_item_details(item)
        msg += "\n"
    return msg


def generate_full_order_text(db, db_order, status="new", hide_finance=False):
    try:
        cart = json.loads(db_order.cart_data)
    except Exception:
        cart = []

    visible_cart = [i for i in cart if not i.get("_meta_promo")]
    is_topup = any(item.get("type") == "topup" for item in visible_cart)

    user_model = db.query(models.UserDB).filter(
        models.UserDB.id == db_order.user_id).first() if db_order.user_id else None
    buyer_name = escape_html(user_model.username) if user_model else 'Гість'

    # 🔥 БЕЗ ЕМОДЗІ
    if status == "awaiting_payment":
        msg = f"<b>ОЧІКУЄ ОПЛАТИ #{db_order.id}</b>\n\n"
    else:
        msg = f"<b>НОВЕ ЗАМОВЛЕННЯ #{db_order.id}</b>\n\n"

    if not hide_finance:
        msg += f"💳 <b>Оплата:</b> {'З БАЛАНСУ' if db_order.payment_method == 'balance' else escape_html(db_order.payment_method).upper()}\n💰 <b>Сума:</b> ${db_order.total}\n"
        if not is_topup:
            msg += f"📈 <b>Чистий прибуток:</b> ${db_order.profit}\n"
        else:
            msg += f"⚡️ <b>Тип:</b> ПОПОВНЕННЯ БАЛАНСУ\n"

    msg += f"👤 <b>Покупець:</b> {buyer_name}\n\n🛒 <b>Кошик:</b>\n"

    for index, item in enumerate(visible_cart, 1):
        product_name = escape_html(item.get("product", {}).get("name") or item.get("product", {}).get("title"))
        if hide_finance:
            msg += f"<b>{index}. {product_name}</b>\n"
        else:
            msg += f"<b>{index}. {product_name}</b> | ${escape_html(str(item.get('price')))}\n"
        msg += format_item_details(item)
        msg += "\n"
    return msg


def generate_receipt_text(db_order, is_uk=False):
    try:
        c_items = json.loads(db_order.cart_data)
        receipt_items = "\n".join([
            f"🔸 {escape_html(i.get('product', {}).get('name', i.get('product', {}).get('title', 'Item')))} | ${float(i.get('price', 0)):.2f}"
            for i in c_items if not i.get("_meta_promo")])
    except Exception:
        receipt_items = "🔸 Товари" if is_uk else "🔸 Items"

    if is_uk:
        return f"🎉 <b>Ваше замовлення успішно завершено!</b>\n\n🧾 <b>ЧЕК ЗАМОВЛЕННЯ #{db_order.id}:</b>\n{receipt_items}\n\n💰 <b>Загальна сума:</b> ${db_order.total}\n💳 <b>Оплата:</b> {db_order.payment_method}\n\n💖 Дякуємо, що обираєте нас!"
    else:
        return f"🎉 <b>Your order has been successfully completed!</b>\n\n🧾 <b>ORDER RECEIPT #{db_order.id}:</b>\n{receipt_items}\n\n💰 <b>Total sum:</b> ${db_order.total}\n💳 <b>Payment:</b> {db_order.payment_method}\n\n💖 Thank you for choosing us!"


def generate_short_status_message(db_order, status, worker_name="", is_uk=False):
    try:
        cart = json.loads(db_order.cart_data)
    except Exception:
        cart = []

    visible_cart = [i for i in cart if not i.get("_meta_promo")]

    if status == "completed":
        msg = f"✅ Замовлення #{db_order.id} <b>ВИКОНАНО</b>\n" if is_uk else f"✅ Order #{db_order.id} <b>COMPLETED</b>\n"
        if worker_name:
            msg += f"🧑‍💻 <b>Виконав:</b> {worker_name}\n" if is_uk else f"🧑‍💻 <b>Worker:</b> {worker_name}\n"
    elif status == "delivered":
        msg = f"🚚 Замовлення #{db_order.id} <b>ДОСТАВЛЕНО</b>\nОчікуємо підтвердження клієнта...\n" if is_uk else f"🚚 Order #{db_order.id} <b>DELIVERED</b>\nAwaiting client confirmation...\n"
        if worker_name:
            msg += f"🧑‍💻 <b>Доставив:</b> {worker_name}\n" if is_uk else f"🧑‍💻 <b>Delivered by:</b> {worker_name}\n"
    elif status == "paid_processing":
        msg = f"🟢 Замовлення #{db_order.id} <b>В РОБОТІ (Оплачено)</b>\n" if is_uk else f"🟢 Order #{db_order.id} <b>IN PROGRESS (Paid)</b>\n"
        if worker_name:
            msg += f"🧑‍💻 <b>Прийняв:</b> {worker_name}\n" if is_uk else f"🧑‍💻 <b>Accepted by:</b> {worker_name}\n"
    else:
        refund_txt = '(кошти повернуто)' if db_order.payment_method == 'balance' else ''
        refund_txt_en = '(refunded)' if db_order.payment_method == 'From balance' else ''
        msg = f"❌ Замовлення #{db_order.id} <b>СКАСОВАНО</b> {refund_txt}\n" if is_uk else f"❌ Order #{db_order.id} <b>CANCELLED</b> {refund_txt_en}\n"

    msg += "🛒 <b>Товари:</b>\n" if is_uk else "🛒 <b>Items:</b>\n"
    for index, item in enumerate(visible_cart, 1):
        product_name = escape_html(item.get("product", {}).get("name") or item.get("product", {}).get("title"))
        msg += f" 🔸 {product_name}\n"
    return msg


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

    # Визначаємо мову клієнта
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

    if target_chat_id and not confirmed_by_user:
        payload = {"chat_id": target_chat_id, "text": msg, "parse_mode": "HTML"}
        if new_status == "delivered":
            btn_text = "✅ Підтвердити отримання" if is_uk_client else "✅ Confirm receipt"
            payload["reply_markup"] = {"inline_keyboard": [
                [{"text": btn_text, "callback_data": f"client_confirm_{order_id}"}]]}

        res = requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage", json=payload)
        if not res.ok:
            print("❌ Помилка відправки статусу:", res.text)

    # Адмінам в форум шлемо українською
    if confirmed_by_user and new_status == "completed" and TELEGRAM_BOT_TOKEN and TELEGRAM_FORUM_CHAT_ID:
        topic = db.query(OrderTopicDB).filter(OrderTopicDB.order_id == order_id).first()
        if topic:
            requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                          json={"chat_id": TELEGRAM_FORUM_CHAT_ID, "message_thread_id": topic.topic_id,
                                "text": f"✅ <b>Клієнт підтвердив отримання!</b>\nЗамовлення #{db_order.id} успішно закрито.",
                                "parse_mode": "HTML"})

    if new_status == "completed" and old_status != "completed":
        assignment = db.query(OrderAssignmentDB).filter(OrderAssignmentDB.order_id == order_id).first()
        if assignment and not assignment.is_credited:
            worker_acc = db.query(WorkerAccountingDB).filter(
                WorkerAccountingDB.worker_name == assignment.worker_name).first()
            if not worker_acc:
                worker_acc = WorkerAccountingDB(worker_name=assignment.worker_name, current_unpaid=0.0, total_paid=0.0)
                db.add(worker_acc)
            worker_acc.current_unpaid += assignment.cost_amount
            assignment.is_credited = True

    pm_lower = str(db_order.payment_method).lower()
    is_balance_payment = any(
        w in pm_lower for w in ["balance", "wallet", "з балансу", "from balance", "гаманець", "coins", "баланс"])

    if new_status == "cancelled" and old_status != "cancelled":
        if is_balance_payment and buyer:
            new_bal = float(buyer.balance) + float(db_order.total)
            db.query(models.UserDB).filter(models.UserDB.id == buyer.id).update({"balance": new_bal},
                                                                                synchronize_session=False)

    if new_status == "completed" and old_status != "completed" and buyer:
        try:
            cart_items = json.loads(db_order.cart_data)
            is_topup = any(item.get("type") == "topup" for item in cart_items)

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

            ref_settings = db.query(ReferralSettingsDB).first()
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
        except Exception:
            pass

    db.commit()
    return True, "Успіх"


@app.put("/api/orders/{order_id}/status")
def update_order_status(order_id: int, status_data: OrderStatusUpdate, db: Session = Depends(get_db),
                        current_admin: models.UserDB = Depends(get_current_admin)):
    valid_statuses = ["new", "awaiting_payment", "paid_processing", "delivered", "completed", "cancelled"]
    if status_data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Невірний статус")
    success, msg = _process_order_status_change(db, order_id, status_data.status)
    if not success:
        return {"error": msg}
    return {"status": "success"}


@app.post("/api/orders/{order_id}/confirm")
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


@app.get("/api/orders")
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


@app.get("/api/orders/{order_id}/chat")
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


@app.post("/api/orders/{order_id}/chat")
def send_order_message(order_id: int, message: TicketMessageCreate, db: Session = Depends(get_db),
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
            topic = db.query(OrderTopicDB).filter(OrderTopicDB.order_id == order_id).first()
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


@app.post("/api/checkout")
async def checkout(request: Request, order: OrderData, db: Session = Depends(get_db)):
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

        # 🔥 ЖОРСТКЕ ЗНЯТТЯ КОШТІВ (Для сайту) 🔥
        new_bal = float(user.balance) - total_float
        db.query(models.UserDB).filter(models.UserDB.id == user.id).update({"balance": new_bal},
                                                                           synchronize_session=False)

    for item in order.cart:
        if item.get("type") == "topup":
            is_topup = True
            topup_amount += float(item.get("coins", 0))

    cart_to_save = order.cart.copy()
    if order.promo_code:
        cart_to_save.append({"_meta_promo": True, "promo_code": order.promo_code.upper()})

    initial_status = "paid_processing" if (is_balance_payment and not is_topup) else (
        "completed" if (is_balance_payment and is_topup) else "awaiting_payment")

    final_payment_method = "З балансу / Balance" if is_balance_payment else escape_html(order.paymentMethod)

    new_order = models.OrderDB(user_id=order.user_id, cart_data=json.dumps(cart_to_save),
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

        # 🔥 Звичайна назва без емодзі
        topic_name = f"#{new_order.id} {buyer_name}"
        topic_id = None
        try:
            res = requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/createForumTopic",
                                json={"chat_id": TELEGRAM_FORUM_CHAT_ID, "name": topic_name}).json()
            if res.get("ok"):
                topic_id = res["result"]["message_thread_id"]
                db.add(OrderTopicDB(order_id=new_order.id, topic_id=topic_id))
                db.commit()
        except Exception as e:
            print("Помилка створення теми:", e)

        if topic_id:
            keyboard = {"inline_keyboard": [
                [{"text": "🟢 Оплачено (В роботу)", "callback_data": f"admin_paid_processing_{new_order.id}"}],
                [{"text": "🚚 Товар видано", "callback_data": f"admin_delivered_{new_order.id}"}],
                [{"text": "🔴 Скасувати", "callback_data": f"admin_cancelled_{new_order.id}"}]]}
            if is_topup:
                keyboard = {"inline_keyboard": [
                    [{"text": "✅ Оплачено (Виконати)", "callback_data": f"admin_completed_{new_order.id}"}],
                    [{"text": "🔴 Скасувати", "callback_data": f"admin_cancelled_{new_order.id}"}]]}
            msg_admin = generate_full_order_text(db, new_order, initial_status, hide_finance=False)
            try:
                res_msg = requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                        json={"chat_id": TELEGRAM_FORUM_CHAT_ID, "message_thread_id": topic_id,
                                              "text": msg_admin,
                                              "parse_mode": "HTML", "reply_markup": keyboard}).json()

                # 🔥 Відкріплюємо повідомлення автоматично
                if res_msg.get("ok"):
                    requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/unpinChatMessage",
                                  json={"chat_id": TELEGRAM_FORUM_CHAT_ID,
                                        "message_id": res_msg["result"]["message_id"]})
            except Exception as e:
                print("Помилка відправки в тему:", e)

    return {"status": "success", "order_id": new_order.id}


# ==========================================
# 🧠 ПАМ'ЯТЬ БОТА (Для калькулятора та списків)
# ==========================================
USER_STATES = {}
USER_LANGUAGES = {}
LINK_TOKENS = {}


@app.post("/api/telegram/webhook")
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

                keyboard = {
                    "inline_keyboard": [
                        [{"text": btn_lang, "callback_data": "change_lang"}]
                    ]
                }

                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/editMessageText",
                              json={"chat_id": chat_id, "message_id": message_id, "text": text_ok, "parse_mode": "HTML",
                                    "reply_markup": keyboard})
                return {"status": "ok"}

            # 🔥 ЛОГІКА КНОПКИ ПОПОВНЕННЯ БАЛАНСУ 🔥
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
                        short_msg = generate_short_status_message(db_order, new_status, worker_mention, is_uk=True)

                        keyboard = None
                        if new_status == "paid_processing":
                            keyboard = {"inline_keyboard": [
                                [{"text": "🚚 Товар видано", "callback_data": f"admin_delivered_{order_id}"}],
                                [{"text": "🔴 Скасувати (Повернення)", "callback_data": f"admin_cancelled_{order_id}"}]
                            ]}
                        elif new_status == "delivered":
                            keyboard = {"inline_keyboard": [
                                [{"text": "🔴 Скасувати (Повернення)", "callback_data": f"admin_cancelled_{order_id}"}]
                            ]}

                        requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/editMessageText",
                                      json={"chat_id": chat_id, "message_id": message_id, "text": short_msg,
                                            "parse_mode": "HTML", "reply_markup": keyboard if keyboard else {}})

            elif action_data.startswith("client_confirm_"):
                order_id = int(action_data.replace("client_confirm_", ""))
                success, msg = _process_order_status_change(db, order_id, "completed", confirmed_by_user=True)

                msg_ok = "✅ Замовлення підтверджено!" if is_uk else "✅ Order confirmed!"
                msg_err = f"❌ Помилка: {msg}" if is_uk else f"❌ Error: {msg}"

                if success:
                    db_order = db.query(models.OrderDB).filter(models.OrderDB.id == order_id).first()
                    receipt_msg = generate_receipt_text(db_order, is_uk=is_uk)

                    requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                                  json={"callback_query_id": callback["id"], "text": msg_ok})
                    requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/editMessageText",
                                  json={"chat_id": chat_id, "message_id": message_id, "text": receipt_msg,
                                        "parse_mode": "HTML"})
                else:
                    requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                                  json={"callback_query_id": callback["id"], "text": msg_err})

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
                                                                                    "item_group"] == "gem" else f"📦 Список товарів:\n{state.get('custom_text')}"
                else:
                    details_text = f"💎 Amount: {state.get('amount')} pcs." if state[
                                                                                  "item_group"] == "gem" else f"📦 Item list:\n{state.get('custom_text')}"

                cart = [{"type": "telegram_fast_buy", "price": total_price,
                         "product": {"id": state["item_id"], "name": item_name}, "userData": {"details": details_text},
                         "_tg_chat_id": chat_id,
                         "_lang": user_lang_tg}]

                new_order = models.OrderDB(user_id=user.id if user else None, cart_data=json.dumps(cart),
                                           payment_method=pay_text, total=str(total_price), profit="0",
                                           status=initial_status)
                db.add(new_order)
                db.commit()
                db.refresh(new_order)

                if TELEGRAM_FORUM_CHAT_ID:
                    buyer_name = user.username if user else clicker_name

                    # 🔥 БЕЗ ЕМОДЗІ ДЛЯ ТГ-КАЛЬКУЛЯТОРА
                    res = requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/createForumTopic",
                                        json={"chat_id": TELEGRAM_FORUM_CHAT_ID,
                                              "name": f"#{new_order.id} {buyer_name}"}).json()
                    if res.get("ok"):
                        topic_id = res["result"]["message_thread_id"]
                        db.add(OrderTopicDB(order_id=new_order.id, topic_id=topic_id))
                        db.commit()

                        keyboard = {"inline_keyboard": [[{"text": "🟢 Оплачено (В роботу)",
                                                          "callback_data": f"admin_paid_processing_{new_order.id}"}],
                                                        [{"text": "🚚 Товар видано",
                                                          "callback_data": f"admin_delivered_{new_order.id}"}],
                                                        [{"text": "🔴 Скасувати",
                                                          "callback_data": f"admin_cancelled_{new_order.id}"}]]}

                        details_admin = f"💎 Кількість: {state.get('amount')} шт." if state[
                                                                                         "item_group"] == "gem" else f"📦 Список товарів:\n{state.get('custom_text')}"
                        msg_admin = f"<b>ЗАМОВЛЕННЯ #{new_order.id}</b>\n💳 <b>Оплата:</b> {pay_text}\n💰 <b>Сума:</b> ${total_price}\n👤 <b>Покупець:</b> {buyer_name}\n\n🛒 <b>Товар:</b>\n1. {item_name} | ${total_price}\n{details_admin}\n\n🔸 <i>Очікуємо дані від клієнта.</i>"

                        res_msg = requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                                json={"chat_id": TELEGRAM_FORUM_CHAT_ID, "message_thread_id": topic_id,
                                                      "text": msg_admin, "parse_mode": "HTML",
                                                      "reply_markup": keyboard}).json()

                        # 🔥 ВІДКРІПЛЯЄМО ПОВІДОМЛЕННЯ 🔥
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

                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/editMessageText",
                              json={"chat_id": chat_id, "message_id": message_id, "text": success_msg,
                                    "parse_mode": "HTML"})
                del USER_STATES[chat_id_str]

            elif action_data.startswith("clientpay_"):
                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                              json={"callback_query_id": callback["id"]})

                parts = action_data.split("_")
                pay_method = parts[1]
                item_group = parts[3]  # 🔥 БЕЗПЕЧНИЙ ІНДЕКС 3

                # 🔥 БЕЗПЕЧНЕ ВИТЯГУВАННЯ ID 🔥
                try:
                    item_id = int(parts[4]) if len(parts) > 4 else None  # 🔥 БЕЗПЕЧНИЙ ІНДЕКС 4
                except ValueError:
                    item_id = None

                if item_group == "coins":
                    safe_url = FRONTEND_URL if FRONTEND_URL.startswith("http") else f"https://{FRONTEND_URL}"
                    if "localhost" in safe_url or "127.0.0.1" in safe_url: safe_url = "https://t.me"

                    text_coins = "🪙 <b>Поповнення балансу</b>\nВкажіть бажану суму поповнення на нашому сайті:" if is_uk else "🪙 <b>Top Up Balance</b>\nEnter the desired amount on our website:"
                    btn_coins = "🌐 Перейти до поповнення" if is_uk else "🌐 Go to Top Up"

                    requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/editMessageText",
                                  json={"chat_id": chat_id, "message_id": message_id, "text": text_coins,
                                        "parse_mode": "HTML",
                                        "reply_markup": {"inline_keyboard": [[{"text": btn_coins, "url": safe_url}]]}})
                    return {"status": "ok"}

                item_name, total_price, profit = "", 0.0, 0.0

                if item_group == "acc":
                    db_item = db.query(models.AccountDB).filter(models.AccountDB.id == item_id).first()
                    if db_item:
                        item_name, total_price, profit = db_item.title, float(db_item.price), float(
                            db_item.price) - float(db_item.base_price)
                elif item_group == "res":
                    db_item = db.query(models.ResourceDB).filter(models.ResourceDB.id == item_id).first()
                    if db_item:
                        item_name, total_price, profit = db_item.name, float(db_item.price), float(
                            db_item.price) - float(db_item.base_price)

                if not item_name:
                    text_not_found = "❌ Товар не знайдено." if is_uk else "❌ Item not found."
                    requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                  json={"chat_id": chat_id, "text": text_not_found})
                    return {"status": "ok"}

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

                details_val = "Дані в чаті" if is_uk else "Data in chat"
                cart = [
                    {"type": "telegram_fast_buy", "price": total_price, "product": {"id": item_id, "name": item_name},
                     "userData": {"details": details_val}, "_tg_chat_id": chat_id,
                     "_lang": user_lang_tg}]
                new_order = models.OrderDB(user_id=user.id if user else None, cart_data=json.dumps(cart),
                                           payment_method=pay_text, total=str(total_price), profit=str(profit),
                                           status=initial_status)
                db.add(new_order)
                db.commit()
                db.refresh(new_order)

                if TELEGRAM_FORUM_CHAT_ID:
                    buyer_name = user.username if user else clicker_name

                    # 🔥 БЕЗ ЕМОДЗІ ДЛЯ ШВИДКОЇ ПОКУПКИ
                    res = requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/createForumTopic",
                                        json={"chat_id": TELEGRAM_FORUM_CHAT_ID,
                                              "name": f"#{new_order.id} {buyer_name}"}).json()
                    if res.get("ok"):
                        topic_id = res["result"]["message_thread_id"]
                        db.add(OrderTopicDB(order_id=new_order.id, topic_id=topic_id))
                        db.commit()

                        keyboard = {"inline_keyboard": [[{"text": "🟢 Оплачено (В роботу)",
                                                          "callback_data": f"admin_paid_processing_{new_order.id}"}],
                                                        [{"text": "🚚 Товар видано",
                                                          "callback_data": f"admin_delivered_{new_order.id}"}],
                                                        [{"text": "🔴 Скасувати",
                                                          "callback_data": f"admin_cancelled_{new_order.id}"}]]}
                        msg_admin = f"<b>ШВИДКЕ ТГ-ЗАМОВЛЕННЯ #{new_order.id}</b>\n💳 <b>Оплата:</b> {pay_text}\n💰 <b>Сума:</b> ${total_price}\n👤 <b>Покупець:</b> {buyer_name}\n\n🛒 <b>Товар:</b>\n1. {item_name} | ${total_price}\n\n🔸 <i>Очікуємо дані від клієнта.</i>"

                        res_msg = requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                                json={"chat_id": TELEGRAM_FORUM_CHAT_ID, "message_thread_id": topic_id,
                                                      "text": msg_admin, "parse_mode": "HTML",
                                                      "reply_markup": keyboard}).json()

                        # 🔥 ВІДКРІПЛЯЄМО ПОВІДОМЛЕННЯ 🔥
                        if res_msg.get("ok"):
                            requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/unpinChatMessage",
                                          json={"chat_id": TELEGRAM_FORUM_CHAT_ID,
                                                "message_id": res_msg["result"]["message_id"]})

                if is_uk:
                    success_msg = f"✅ <b>Замовлення #{new_order.id} створено!</b>\n💰 Списано: ${total_price}\n\n" if pay_method == "bal" else f"✅ <b>Замовлення #{new_order.id} створено!</b>\n💳 Очікуємо на оплату (Адмін надішле реквізити).\n\n"
                    success_msg += "👇 <b>Будь ласка, напишіть ваші дані (ID акаунта, координати або гільдію) прямо в цей чат!</b>"
                else:
                    success_msg = f"✅ <b>Order #{new_order.id} created!</b>\n💰 Paid: ${total_price}\n\n" if pay_method == "bal" else f"✅ <b>Order #{new_order.id} created!</b>\n💳 Awaiting payment (Admin will send details).\n\n"
                    success_msg += "👇 <b>Please write your data (Account ID, coordinates or guild) directly in this chat!</b>"

                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/editMessageText",
                              json={"chat_id": chat_id, "message_id": message_id, "text": success_msg,
                                    "parse_mode": "HTML"})

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
                topic = db.query(OrderTopicDB).filter(OrderTopicDB.topic_id == msg["message_thread_id"]).first()
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
                            else:
                                try:
                                    cart_data = json.loads(order.cart_data)
                                    if cart_data and len(cart_data) > 0 and "_lang" in cart_data[0] and cart_data[0][
                                        "_lang"]:
                                        lang_code = str(cart_data[0]["_lang"]).strip().lower()
                                        is_uk_client = lang_code.startswith(("uk", "ru"))
                                except Exception:
                                    pass

                            prefix = "🤫 <b>Реквізити для оплати:</b>" if is_secret else "👨‍💻 <b>Адміністратор:</b>"
                            if not is_uk_client:
                                prefix = "🤫 <b>Payment details:</b>" if is_secret else "👨‍💻 <b>Administrator:</b>"

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

                # 1. КОМАНДА /start
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
                            err_txt = (
                                "❌ Посилання недійсне або застаріло. Згенеруйте нове на сайті."
                                if is_uk else
                                "❌ Link is invalid or expired. Please generate a new one on the website."
                            )
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

                        user = user_in_db
                        if is_uk:
                            balance_info = f"💳 <b>Ваш баланс:</b> ${user.balance:.2f}" if user else "⚠️ <i>Ви не авторизовані. Щоб платити монетами, прив'яжіть свій Telegram на сайті!</i>"
                            text_order = f"🛍 <b>Оформлення замовлення</b>\n\nВи обрали товар: <code>{payload}</code>\n\n{balance_info}\n\nЯк бажаєте продовжити?"
                            btn_chat = "💬 Оплатити готівкою (Чат)"
                            btn_site = "🌐 Відкрити сайт"
                            btn_bal = "🪙 Оплатити з балансу"
                        else:
                            balance_info = f"💳 <b>Your balance:</b> ${user.balance:.2f}" if user else "⚠️ <i>You are not authorized. Link your Telegram on the website to pay with coins!</i>"
                            text_order = f"🛍 <b>Checkout</b>\n\nYou selected: <code>{payload}</code>\n\n{balance_info}\n\nHow would you like to proceed?"
                            btn_chat = "💬 Pay with Cash (Chat)"
                            btn_site = "🌐 Open Website"
                            btn_bal = "🪙 Pay from balance"

                        safe_url = FRONTEND_URL if FRONTEND_URL.startswith("http") else f"https://{FRONTEND_URL}"
                        if "localhost" in safe_url or "127.0.0.1" in safe_url: safe_url = "https://t.me"

                        keyboard = {
                            "inline_keyboard": [[{"text": btn_chat, "callback_data": f"clientpay_chat_{payload}"}],
                                                [{"text": btn_site, "url": safe_url}]]}
                        if user and user.balance > 0:
                            keyboard["inline_keyboard"].insert(0, [{"text": btn_bal,
                                                                    "callback_data": f"clientpay_bal_{payload}"}])

                        requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                      json={"chat_id": chat_id, "text": text_order, "parse_mode": "HTML",
                                            "reply_markup": keyboard})
                        return {"status": "ok"}

                    else:
                        user = user_in_db
                        if is_uk:
                            welcome_text = "👋 <b>Вітаємо у Lords Shop!</b>\n\nЩоб зробити замовлення, перейдіть до нашої вітрини та натисніть кнопку «Купити» під потрібним товаром."
                            btn_lang = "🌍 Change language (EN)"
                            if user:
                                welcome_text += f"\n\n👤 Ваш акаунт: <b>{user.username}</b>\n💳 Баланс: <b>${user.balance:.2f}</b>"
                        else:
                            welcome_text = "👋 <b>Welcome to Lords Shop!</b>\n\nTo make an order, go to our storefront and click «Buy» under the desired item."
                            btn_lang = "🌍 Змінити мову (UK)"
                            if user:
                                welcome_text += f"\n\n👤 Your account: <b>{user.username}</b>\n💳 Balance: <b>${user.balance:.2f}</b>"

                        keyboard = {"inline_keyboard": [[{"text": btn_lang, "callback_data": "change_lang"}]]}
                        requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                      json={"chat_id": chat_id, "text": welcome_text, "parse_mode": "HTML",
                                            "reply_markup": keyboard})
                        return {"status": "ok"}

                # 2. КОМАНДА /profile
                elif text_lower in ["/profile", "/balance", "профіль", "баланс", "profile", "balance"]:
                    if user_in_db:
                        text_prof = f"👤 Ваш акаунт: <b>{user_in_db.username}</b>\n💳 Баланс: <b>${user_in_db.balance:.2f}</b>" if is_uk else f"👤 Account: <b>{user_in_db.username}</b>\n💳 Balance: <b>${user_in_db.balance:.2f}</b>"
                        keyboard = {"inline_keyboard": [
                            [{"text": "❌ Відв'язати акаунт" if is_uk else "❌ Unlink Account",
                              "callback_data": "unlink_acc"}],
                            [{"text": "🪙 Поповнити баланс" if is_uk else "🪙 Top Up Balance",
                              "callback_data": "topup_start"}]]}
                        requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                      json={"chat_id": chat_id, "text": text_prof, "parse_mode": "HTML",
                                            "reply_markup": keyboard})
                    else:
                        text_err = "❌ Ви не прив'язані. Перейдіть на сайт у свій Профіль, щоб прив'язати Telegram." if is_uk else "❌ You are not linked. Go to your Profile on the website to link your Telegram."
                        requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                      json={"chat_id": chat_id, "text": text_err, "parse_mode": "HTML"})
                    return {"status": "ok"}

                # 3. КОМАНДА /help
                elif text_lower in ["/help", "/menu", "допомога", "меню", "help"]:
                    safe_url = FRONTEND_URL if FRONTEND_URL.startswith("http") else f"https://{FRONTEND_URL}"
                    if "localhost" in safe_url or "127.0.0.1" in safe_url: safe_url = "https://t.me"

                    if is_uk:
                        help_text = (
                            "🤖 <b>Довідка та Команди</b>\n\n"
                            "🔸 /start — Головне меню бота\n"
                            "🔸 /profile — Ваш поточний баланс та статус\n"
                            "🔸 /help — Ця інструкція\n\n"
                            "🔗 <b>Як прив'язати акаунт?</b>\n"
                            "1. Перейдіть на сайт у свій Профіль.\n"
                            "2. Натисніть кнопку «Прив'язати».\n"
                            "3. Вас перекине в цього бота, натисніть «Start».\n\n"
                            "❌ <b>Як відв'язати акаунт?</b>\n"
                            "Надішліть команду /profile і натисніть кнопку «Відв'язати акаунт» під вашим балансом."
                        )
                        btn_text = "🌐 Перейти на сайт"
                    else:
                        help_text = (
                            "🤖 <b>Help & Commands</b>\n\n"
                            "🔸 /start — Main bot menu\n"
                            "🔸 /profile — Your balance & link status\n"
                            "🔸 /help — This guide\n\n"
                            "🔗 <b>How to link your account?</b>\n"
                            "1. Go to your Profile on the website.\n"
                            "2. Click the «Link» button.\n"
                            "3. You will be redirected here, just click «Start».\n\n"
                            "❌ <b>How to unlink your account?</b>\n"
                            "Send the /profile command and click «Unlink Account» below your balance."
                        )
                        btn_text = "🌐 Go to Website"

                    keyboard = {"inline_keyboard": [[{"text": btn_text, "url": safe_url}]]}
                    requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                  json={"chat_id": chat_id, "text": help_text, "parse_mode": "HTML",
                                        "reply_markup": keyboard})
                    return {"status": "ok"}

                # 4. КАЛЬКУЛЯТОР / ВВІД ДАНИХ ТОВАРУ ТА ПОПОВНЕННЯ БАЛАНСУ
                elif chat_id in USER_STATES:
                    state = USER_STATES[chat_id]
                    user = user_in_db

                    if is_uk:
                        balance_info = f"💳 <b>Ваш баланс:</b> ${user.balance:.2f}" if user else "⚠️ <i>Ви не авторизовані.</i>"
                    else:
                        balance_info = f"💳 <b>Balance:</b> ${user.balance:.2f}" if user else "⚠️ <i>You are not authorized.</i>"

                    # 🔥 ОБРОБКА ПОПОВНЕННЯ БАЛАНСУ 🔥
                    if state["step"] == "wait_topup_amount":
                        try:
                            amount = float(text.replace(',', '.').strip())
                            if amount < 1: raise ValueError()

                            cart = [{
                                "type": "topup",
                                "coins": amount,
                                "price": amount,
                                "product": {"id": 0,
                                            "title": f"Поповнення балансу: ${amount:.2f}" if is_uk else f"Balance Top-up: ${amount:.2f}"},
                                "userData": {"details": "Дані в чаті / Data in chat"},
                                "_tg_chat_id": chat_id,
                                "_lang": user_lang_tg
                            }]

                            new_order = models.OrderDB(
                                user_id=user.id,
                                cart_data=json.dumps(cart),
                                payment_method="Готівка/Крипта (чат)" if is_uk else "Cash/Crypto (chat)",
                                total=str(amount),
                                profit="0",
                                status="awaiting_payment"
                            )
                            db.add(new_order)
                            db.commit()
                            db.refresh(new_order)

                            if TELEGRAM_FORUM_CHAT_ID:
                                buyer_name = escape_html(user.username)

                                # 🔥 БЕЗ ЕМОДЗІ ДЛЯ ПОПОВНЕННЯ
                                res = requests.post(
                                    f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/createForumTopic",
                                    json={"chat_id": TELEGRAM_FORUM_CHAT_ID,
                                          "name": f"#{new_order.id} {buyer_name}"}).json()
                                if res.get("ok"):
                                    topic_id = res["result"]["message_thread_id"]
                                    db.add(OrderTopicDB(order_id=new_order.id, topic_id=topic_id))
                                    db.commit()

                                    keyboard_admin = {"inline_keyboard": [
                                        [{"text": "✅ Оплачено (Нарахувати)",
                                          "callback_data": f"admin_completed_{new_order.id}"}],
                                        [{"text": "🔴 Скасувати", "callback_data": f"admin_cancelled_{new_order.id}"}]
                                    ]}

                                    msg_admin = f"<b>ПОПОВНЕННЯ БАЛАНСУ #{new_order.id}</b>\n👤 <b>Клієнт:</b> {buyer_name}\n💰 <b>Сума:</b> ${amount:.2f}\n\n🔸 <i>Надішліть клієнту реквізити в цей чат. Після оплати натисніть «Оплачено», і баланс автоматично нарахується.</i>"

                                    res_msg = requests.post(
                                        f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                        json={"chat_id": TELEGRAM_FORUM_CHAT_ID,
                                              "message_thread_id": topic_id,
                                              "text": msg_admin, "parse_mode": "HTML",
                                              "reply_markup": keyboard_admin}).json()

                                    # 🔥 ВІДКРІПЛЯЄМО ПОВІДОМЛЕННЯ 🔥
                                    if res_msg.get("ok"):
                                        requests.post(
                                            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/unpinChatMessage",
                                            json={"chat_id": TELEGRAM_FORUM_CHAT_ID,
                                                  "message_id": res_msg["result"]["message_id"]})

                            if is_uk:
                                success_msg = f"✅ <b>Заявка #{new_order.id} на поповнення створена!</b>\nСума: ${amount:.2f}\n\n💳 <i>Очікуйте, адміністратор надішле реквізити для оплати в цей чат. Після переказу коштів баланс оновиться автоматично.</i>"
                            else:
                                success_msg = f"✅ <b>Top-up request #{new_order.id} created!</b>\nAmount: ${amount:.2f}\n\n💳 <i>Please wait, admin will send payment details here. After payment, balance will be credited automatically.</i>"

                            requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                          json={"chat_id": chat_id, "text": success_msg, "parse_mode": "HTML"})

                            # 🔥 ВИПРАВЛЕНА ЗМІННА: chat_id замість chat_id_str 🔥
                            if chat_id in USER_STATES:
                                del USER_STATES[chat_id]

                        except ValueError:
                            err_num = "❌ Введіть коректну суму (мінімум 1)." if is_uk else "❌ Enter a valid amount (minimum 1)."
                            requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                          json={"chat_id": chat_id, "text": err_num})
                        return {"status": "ok"}

                    elif state["step"] == "wait_gem_amount":
                        try:
                            amt_str = text.lower().replace("k", "000").replace("к", "000").replace(" ", "").replace(",",
                                                                                                                    "")
                            amount = int(amt_str)
                            if amount <= 0: raise ValueError()

                            if amount % 100000 != 0:
                                err_text = "❌ <b>Помилка!</b>\nКількість сапфірів має бути кратною <b>100,000</b> (наприклад: 100k, 200k, 500k).\n\nВведіть бажану кількість ще раз:" if is_uk else "❌ <b>Error!</b>\nGems amount must be a multiple of <b>100,000</b> (e.g., 100k, 200k).\n\nPlease enter the amount again:"
                                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                              json={"chat_id": chat_id, "text": err_text, "parse_mode": "HTML"})
                                return {"status": "ok"}

                            final_price = round((amount / 100000.0) * state["rate"], 2)
                            USER_STATES[chat_id]["amount"] = amount
                            USER_STATES[chat_id]["final_price"] = final_price
                            USER_STATES[chat_id]["step"] = "ready_to_pay"

                            btn_chat = "💬 Оплатити в чаті" if is_uk else "💬 Pay in chat"
                            btn_bal = f"🪙 Оплатити з балансу (${final_price})" if is_uk else f"🪙 Pay from balance (${final_price})"

                            keyboard = {"inline_keyboard": [[{"text": btn_chat, "callback_data": "statepay_chat"}]]}
                            if user and user.balance >= final_price:
                                keyboard["inline_keyboard"].insert(0,
                                                                   [{"text": btn_bal, "callback_data": "statepay_bal"}])

                            calc_text = f"💎 <b>Розрахунок Сапфірів</b>\nВи купуєте: {amount:,} шт.\n\n💰 <b>Сума до сплати:</b> ${final_price}\n\n{balance_info}\n\nОберіть спосіб оплати:" if is_uk else f"💎 <b>Calculation</b>\nBuying: {amount:,} pcs.\n💰 <b>Total:</b> ${final_price}\n\n{balance_info}\nChoose payment method:"
                            requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                          json={"chat_id": chat_id, "text": calc_text, "parse_mode": "HTML",
                                                "reply_markup": keyboard})
                        except ValueError:
                            err_num = "❌ Будь ласка, введіть коректне число (наприклад: 100000 або 200k)." if is_uk else "❌ Enter a valid number (e.g., 100k)."
                            requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                          json={"chat_id": chat_id, "text": err_num})
                        return {"status": "ok"}

                    elif state["step"] == "wait_oth_text":
                        final_price = state["price"]
                        USER_STATES[chat_id]["custom_text"] = text
                        USER_STATES[chat_id]["step"] = "ready_to_pay"

                        btn_chat = "💬 Оплатити в чаті" if is_uk else "💬 Pay in chat"
                        btn_bal = f"🪙 Оплатити з балансу (${final_price})" if is_uk else f"🪙 Pay from balance (${final_price})"

                        keyboard = {"inline_keyboard": [[{"text": btn_chat, "callback_data": "statepay_chat"}]]}
                        if user and user.balance >= final_price:
                            keyboard["inline_keyboard"].insert(0, [{"text": btn_bal, "callback_data": "statepay_bal"}])

                        calc_text = f"📦 <b>Ваш список збережено!</b>\n\n💰 <b>Сума до сплати:</b> ${final_price}\n\n{balance_info}\n\nОберіть спосіб оплати:" if is_uk else f"📦 <b>Saved!</b>\n💰 <b>Total:</b> ${final_price}\n\n{balance_info}\nChoose payment method:"
                        requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                      json={"chat_id": chat_id, "text": calc_text, "parse_mode": "HTML",
                                            "reply_markup": keyboard})
                        return {"status": "ok"}

                # 5. ТІКЕТ ДО АКТИВНОГО ЗАМОВЛЕННЯ
                else:
                    latest_order = None
                    user = user_in_db
                    active_orders = db.query(models.OrderDB).filter(
                        models.OrderDB.status.in_(["new", "awaiting_payment", "paid_processing"])).order_by(
                        models.OrderDB.id.desc()).all()

                    for o in active_orders:
                        if user and o.user_id == user.id:
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
                        topic = db.query(OrderTopicDB).filter(OrderTopicDB.order_id == latest_order.id).first()
                        if topic:
                            final_msg_text = f"👤 <b>Клієнт:</b>\n{text}" if text else "👤 <b>Клієнт надіслав фото:</b>"

                            if photo_file_id:
                                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto",
                                              json={"chat_id": TELEGRAM_FORUM_CHAT_ID,
                                                    "message_thread_id": topic.topic_id,
                                                    "photo": photo_file_id, "caption": final_msg_text,
                                                    "parse_mode": "HTML"})
                            else:
                                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                              json={"chat_id": TELEGRAM_FORUM_CHAT_ID,
                                                    "message_thread_id": topic.topic_id,
                                                    "text": final_msg_text, "parse_mode": "HTML"})

                            db_text = f"[Фото] {text}" if photo_file_id else text
                            db.add(models.TicketMessageDB(order_id=latest_order.id, sender="user", text=db_text))
                            db.commit()
                    else:
                        no_orders_text = "У вас зараз немає активних замовлень 🤷‍♂️ Оберіть товар на вітрині, щоб почати." if is_uk else "You currently have no active orders 🤷‍♂️ Select a product on the storefront to start."
                        requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                      json={"chat_id": chat_id, "text": no_orders_text})

        return {"status": "ok"}
    except Exception as e:
        print("Webhook Error:", e)
        return {"status": "error"}


@app.get("/api/telegram/get-link")
def get_telegram_link(current_user: models.UserDB = Depends(get_current_user)):
    token = uuid.uuid4().hex[:10]
    LINK_TOKENS[token] = current_user.id
    bot_username = get_bot_username()
    link = f"https://t.me/{bot_username}?start=link_{token}"
    return {"status": "success", "link": link}


@app.post("/api/telegram/link")
def link_telegram(data: TelegramLinkData, db: Session = Depends(get_db)):
    user = db.query(models.UserDB).filter(models.UserDB.id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404)
    user.telegram_chat_id = data.chat_id
    db.commit()

    if TELEGRAM_BOT_TOKEN:
        try:
            requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                          json={"chat_id": data.chat_id,
                                "text": f"✅ <b>Account linked successfully! / Акаунт успішно прив'язано!</b>\n\nNow you will receive order notifications here.\nТепер ви будете отримувати тут сповіщення.",
                                "parse_mode": "HTML"})
        except Exception:
            pass
    return {"status": "success"}


# ==========================================
# 📢 АВТО-ВІТРИНА TELEGRAM (Публікація товарів)
# ==========================================
BOT_USERNAME = None


def get_bot_username():
    global BOT_USERNAME
    if BOT_USERNAME: return BOT_USERNAME
    try:
        res = requests.get(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getMe").json()
        if res.get("ok"):
            BOT_USERNAME = res["result"]["username"]
            return BOT_USERNAME
    except Exception:
        pass
    return "YOUR_BOT_NAME"


def tg_post_product(db: Session, item_group: str, item_id: int, title: str, desc: str, price: float,
                    image_url: str = None):
    if not TELEGRAM_BOT_TOKEN or not STOREFRONT_CHAT_ID:
        print("⚠️ Не вказано TELEGRAM_BOT_TOKEN або STOREFRONT_CHAT_ID")
        return

    bot_link = f"https://t.me/{get_bot_username()}?start=buy_{item_group}_{item_id}"
    keyboard = {"inline_keyboard": [[{"text": "🛒 Купити / Buy", "url": bot_link}]]}
    msg_text = f"📦 <b>{escape_html(title)}</b>\n\n{escape_html(desc)}\n\n💰 <b>Ціна / Price:</b> ${price:.2f}"

    # 🔍 Визначаємо, в яку гілку відправляти
    topic_id = None
    if item_group == "acc":
        topic_id = STOREFRONT_TOPIC_ACC
    elif item_group == "gem":
        topic_id = STOREFRONT_TOPIC_GEM
    elif item_group == "res":
        topic_id = STOREFRONT_TOPIC_RES
    elif item_group == "oth":
        topic_id = STOREFRONT_TOPIC_OTH
    elif item_group == "coins":
        topic_id = STOREFRONT_TOPIC_COINS

    try:
        local_path = None
        if image_url and "static/uploads/" in image_url:
            filename = image_url.split("/")[-1]
            local_path = os.path.join("static", "uploads", filename)

        if local_path and os.path.exists(local_path):
            data_payload = {
                "chat_id": STOREFRONT_CHAT_ID,
                "caption": msg_text,
                "parse_mode": "HTML",
                "reply_markup": json.dumps(keyboard)
            }
            if topic_id: data_payload["message_thread_id"] = int(topic_id)

            with open(local_path, "rb") as f:
                res = requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto", data=data_payload,
                                    files={"photo": f}).json()
        else:
            json_payload = {
                "chat_id": STOREFRONT_CHAT_ID,
                "text": msg_text,
                "parse_mode": "HTML",
                "reply_markup": keyboard
            }
            if topic_id: json_payload["message_thread_id"] = int(topic_id)

            res = requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                json=json_payload).json()

        if res.get("ok"):
            print(f"✅ Товар '{title}' успішно опубліковано у вітрині!")
            db.add(StorefrontMessageDB(item_group=item_group, item_id=item_id, message_id=res["result"]["message_id"]))
            db.commit()
        else:
            print("❌ ПОМИЛКА ВІД ТЕЛЕГРАМУ ПРИ ПУБЛІКАЦІЇ:", res)
    except Exception as e:
        print("❌ Системна помилка публікації товару:", e)


def tg_delete_product(db: Session, item_group: str, item_id: int):
    records = db.query(StorefrontMessageDB).filter_by(item_group=item_group, item_id=item_id).all()
    for r in records:
        try:
            requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/deleteMessage",
                          json={"chat_id": STOREFRONT_CHAT_ID, "message_id": r.message_id})
        except Exception:
            pass
        db.delete(r)
    db.commit()


def tg_delete_all_in_group(db: Session, item_group: str):
    records = db.query(StorefrontMessageDB).filter_by(item_group=item_group).all()
    for r in records:
        try:
            requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/deleteMessage",
                          json={"chat_id": STOREFRONT_CHAT_ID, "message_id": r.message_id})
        except Exception:
            pass
        db.delete(r)
    db.commit()


# ==========================================
# 💰 ІНШІ МАРШРУТИ (НАЛАШТУВАННЯ ТА ТОВАРИ)
# ==========================================
@app.get("/api/cashback/settings")
def get_cashback_settings(db: Session = Depends(get_db)):
    settings = db.query(models.CashbackSettingsDB).first()
    if not settings:
        settings = models.CashbackSettingsDB(percent=5.0, excluded_types="account")
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@app.put("/api/cashback/settings")
def update_cashback_settings(data: CashbackSettingsUpdate, db: Session = Depends(get_db),
                             current_admin: models.UserDB = Depends(get_current_admin)):
    settings = db.query(models.CashbackSettingsDB).first()
    if not settings:
        db.add(models.CashbackSettingsDB(percent=data.percent, excluded_types=data.excluded_types))
    else:
        settings.percent, settings.excluded_types = data.percent, data.excluded_types
    db.commit()
    return {"status": "success"}


@app.get("/api/cashback/settings/public")
def get_public_cashback_settings(db: Session = Depends(get_db)):
    settings = db.query(models.CashbackSettingsDB).first()
    return {"percent": settings.percent, "excluded_types": settings.excluded_types} if settings else {"percent": 5.0,
                                                                                                      "excluded_types": "account"}


@app.get("/api/referral/settings")
def get_referral_settings(db: Session = Depends(get_db), current_admin: models.UserDB = Depends(get_current_admin)):
    settings = db.query(ReferralSettingsDB).first()
    if not settings:
        settings = ReferralSettingsDB(percent=5.0, is_active=True)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@app.put("/api/referral/settings")
def update_referral_settings(data: ReferralSettingsUpdate, db: Session = Depends(get_db),
                             current_admin: models.UserDB = Depends(get_current_admin)):
    settings = db.query(ReferralSettingsDB).first()
    if not settings:
        db.add(ReferralSettingsDB(percent=data.percent, is_active=data.is_active))
    else:
        settings.percent = data.percent
        settings.is_active = data.is_active
    db.commit()
    return {"status": "success"}


@app.get("/api/other-items")
def get_other_items(db: Session = Depends(get_db)):
    return [{"id": i.id, "name": i.name, "desc": i.desc, "price": i.price, "base_price": i.base_price, "tag": i.tag,
             "color": i.color, "requiredFields": i.requiredFields.split(",") if i.requiredFields else []} for i in
            db.query(models.OtherItemDB).all()]


@app.post("/api/other-items")
def create_other_item(item: OtherItemCreate, db: Session = Depends(get_db),
                      current_admin: models.UserDB = Depends(get_current_admin)):
    new_item = models.OtherItemDB(name=item.name, desc=item.desc, price=item.price, base_price=item.base_price,
                                  tag=item.tag, color=item.color, requiredFields=",".join(item.requiredFields))
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    tg_post_product(db, "oth", new_item.id, new_item.name, new_item.desc, float(new_item.price))
    return {"status": "success", "id": new_item.id}


@app.put("/api/other-items/{item_id}")
def update_other_item(item_id: int, item: OtherItemCreate, db: Session = Depends(get_db),
                      current_admin: models.UserDB = Depends(get_current_admin)):
    db_item = db.query(models.OtherItemDB).filter(models.OtherItemDB.id == item_id).first()
    if db_item:
        db_item.name, db_item.desc, db_item.price, db_item.base_price, db_item.tag, db_item.color, db_item.requiredFields = item.name, item.desc, item.price, item.base_price, item.tag, item.color, ",".join(
            item.requiredFields)
        db.commit()
    return {"status": "success"}


@app.delete("/api/other-items/{item_id}")
def delete_other_item(item_id: int, db: Session = Depends(get_db),
                      current_admin: models.UserDB = Depends(get_current_admin)):
    tg_delete_product(db, "oth", item_id)
    db.query(models.OtherItemDB).filter(models.OtherItemDB.id == item_id).delete()
    db.commit()
    return {"status": "success"}


@app.post("/api/other-items/bulk")
def update_all_other_items(items: list[OtherItemCreate], db: Session = Depends(get_db),
                           current_admin: models.UserDB = Depends(get_current_admin)):
    tg_delete_all_in_group(db, "oth")
    db.query(models.OtherItemDB).delete()
    db.commit()
    for item in items:
        new_item = models.OtherItemDB(name=item.name, desc=item.desc, price=item.price, base_price=item.base_price,
                                      tag=item.tag, color=item.color, requiredFields=",".join(item.requiredFields))
        db.add(new_item)
        db.commit()
        db.refresh(new_item)
        tg_post_product(db, "oth", new_item.id, new_item.name, new_item.desc, float(new_item.price))
    return {"status": "success"}


@app.get("/api/resources")
def get_resources(db: Session = Depends(get_db)):
    return db.query(models.ResourceDB).all()


@app.post("/api/resources/bulk")
def update_all_resources(resources: list[ResourceCreate], db: Session = Depends(get_db),
                         current_admin: models.UserDB = Depends(get_current_admin)):
    tg_delete_all_in_group(db, "res")
    db.query(models.ResourceDB).delete()
    db.commit()
    for res in resources:
        new_res = models.ResourceDB(name=res.name, desc=res.desc, price=res.price, base_price=res.base_price)
        db.add(new_res)
        db.commit()
        db.refresh(new_res)
        tg_post_product(db, "res", new_res.id, new_res.name, new_res.desc, float(new_res.price))
    return {"status": "success"}


@app.get("/api/gems")
def get_gems(db: Session = Depends(get_db)):
    return db.query(models.GemDB).all()


@app.post("/api/gems/bulk")
def update_all_gems(gems: list[GemCreate], db: Session = Depends(get_db),
                    current_admin: models.UserDB = Depends(get_current_admin)):
    tg_delete_all_in_group(db, "gem")
    db.query(models.GemDB).delete()
    db.commit()
    for gem in gems:
        new_gem = models.GemDB(range=gem.range, rate=gem.rate, base_price=gem.base_price)
        db.add(new_gem)
        db.commit()
        db.refresh(new_gem)
        tg_post_product(db, "gem", new_gem.id, f"Сапфіри ({new_gem.range})", f"Курс: {new_gem.rate}",
                        float(new_gem.base_price))
    return {"status": "success"}


@app.get("/api/accounts")
def get_accounts(db: Session = Depends(get_db)):
    accounts = db.query(models.AccountDB).order_by(models.AccountDB.id.desc()).all()
    result = []
    for acc in accounts:
        try:
            images_list = json.loads(acc.images) if acc.images else []
        except Exception:
            images_list = []
        try:
            stats_dict = json.loads(acc.stats) if acc.stats else {}
        except Exception:
            stats_dict = {}
        result.append({"id": acc.id, "title": acc.title, "shortDesc": acc.shortDesc, "price": acc.price,
                       "base_price": acc.base_price, "tags": acc.tags.split(",") if acc.tags else [],
                       "status": acc.status, "bind": acc.bind, "images": images_list, "stats": stats_dict})
    return result


@app.post("/api/accounts")
async def create_account(title: str = Form(...), shortDesc: str = Form(...), price: str = Form(...),
                         base_price: str = Form("0"), tags: str = Form(...), bind: str = Form(...),
                         stats: str = Form("{}"), images: List[UploadFile] = File(...), db: Session = Depends(get_db),
                         current_admin: models.UserDB = Depends(get_current_admin)):
    image_urls = []
    for img in images:
        try:
            image = Image.open(img.file)
            if image.mode in ("RGBA", "P"):
                image = image.convert("RGB")
            filename = f"{uuid.uuid4().hex}.webp"
            filepath = os.path.join("static/uploads", filename)
            image.save(filepath, "WEBP", quality=80, method=4)
            backend_domain = "http://localhost:8000"
            image_urls.append(f"{backend_domain}/static/uploads/{filename}")
        except Exception:
            raise HTTPException(status_code=400, detail="Помилка обробки зображення")

    new_account = models.AccountDB(title=title, shortDesc=shortDesc, price=price, base_price=base_price, tags=tags,
                                   bind=bind, images=json.dumps(image_urls), status="active", stats=stats)
    db.add(new_account)
    db.commit()
    db.refresh(new_account)

    img_url = image_urls[0] if image_urls else None
    desc = f"{shortDesc}\n🔹 Прив'язка: {bind}"
    tg_post_product(db, "acc", new_account.id, title, desc, float(price), img_url)

    return {"status": "success"}


@app.put("/api/accounts/{account_id}/status")
def update_account_status(account_id: int, status_data: AccountStatusUpdate, db: Session = Depends(get_db),
                          current_admin: models.UserDB = Depends(get_current_admin)):
    db_account = db.query(models.AccountDB).filter(models.AccountDB.id == account_id).first()
    if not db_account:
        return {"error": "Акаунт не знайдено"}
    db_account.status = status_data.status
    db.commit()

    if status_data.status != "active":
        tg_delete_product(db, "acc", account_id)

    return {"status": "success"}


@app.delete("/api/accounts/{account_id}")
def delete_account(account_id: int, db: Session = Depends(get_db),
                   current_admin: models.UserDB = Depends(get_current_admin)):
    tg_delete_product(db, "acc", account_id)
    db.query(models.AccountDB).filter(models.AccountDB.id == account_id).delete()
    db.commit()
    return {"status": "success"}


@app.get("/api/promocodes")
def get_promocodes(db: Session = Depends(get_db)):
    return db.query(models.PromoCodeDB).all()


@app.post("/api/promocodes")
def create_promocode(promo: PromoCodeCreate, db: Session = Depends(get_db),
                     current_admin: models.UserDB = Depends(get_current_admin)):
    if db.query(models.PromoCodeDB).filter(models.PromoCodeDB.code == promo.code.upper()).first():
        return {"error": "Такий код вже існує"}
    db.add(models.PromoCodeDB(code=promo.code.upper(), type=promo.type, value=promo.value, target=promo.target,
                              max_uses=promo.max_uses, min_order_amount=promo.min_order_amount,
                              expiry_date=promo.expiry_date, is_active=1, target_items=json.dumps(promo.target_items),
                              target_names=json.dumps(promo.target_names)))
    db.commit()
    return {"status": "success"}


@app.get("/api/promocodes/validate/{code}")
def validate_promo(code: str, total: float, db: Session = Depends(get_db)):
    from datetime import datetime
    promo = db.query(models.PromoCodeDB).filter(models.PromoCodeDB.code == code.upper()).first()
    if not promo or promo.is_active == 0:
        return {"valid": False, "message": "Промокод недійсний"}
    if promo.max_uses > 0 and promo.current_uses >= promo.max_uses:
        return {"valid": False, "message": "Ліміт вичерпано"}
    if total < promo.min_order_amount:
        return {"valid": False, "message": f"Мінімальна сума: ${promo.min_order_amount}"}
    if promo.expiry_date and datetime.now() > datetime.fromisoformat(promo.expiry_date):
        return {"valid": False, "message": "Термін вийшов"}
    return {"valid": True, "type": promo.type, "value": promo.value, "target": promo.target,
            "target_items": json.loads(promo.target_items) if promo.target_items else [],
            "target_names": json.loads(promo.target_names) if promo.target_names else []}


@app.delete("/api/promocodes/{id}")
def delete_promo(id: int, db: Session = Depends(get_db), current_admin: models.UserDB = Depends(get_current_admin)):
    db.query(models.PromoCodeDB).filter(models.PromoCodeDB.id == id).delete()
    db.commit()
    return {"status": "success"}


@app.put("/api/promocodes/{id}/toggle")
def toggle_promo(id: int, db: Session = Depends(get_db), current_admin: models.UserDB = Depends(get_current_admin)):
    promo = db.query(models.PromoCodeDB).filter(models.PromoCodeDB.id == id).first()
    if promo:
        promo.is_active = 0 if promo.is_active == 1 else 1
        db.commit()
    return {"status": "success", "new_status": promo.is_active}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)