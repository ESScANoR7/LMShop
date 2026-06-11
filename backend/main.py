from fastapi import FastAPI, Depends, HTTPException, Request, status, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
import requests
import json
import bcrypt
import os
import uuid
from PIL import Image
from typing import Optional, List
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from jose import JWTError, jwt
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.security import HTTPBearer

from database import engine, get_db
import models

load_dotenv()
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("JWT_SECRET_KEY must be set in .env file")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))
FRONTEND_URL = os.getenv("VITE_FRONTEND_URL", "http://localhost:5173")

models.Base.metadata.create_all(bind=engine)

limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# 🔥 Створюємо папку для збереження фотографій 🔥
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
# 🗄️ МОДЕЛІ ДАНИХ (Pydantic)
# ==========================================
class UserRegister(BaseModel):
    username: str
    email: str
    password: str
    ref: Optional[str] = None


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


class OrderData(BaseModel):
    cart: list
    paymentMethod: str
    total: str
    profit: str = "0"
    user_id: Optional[int] = None


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

# 🔥 Додано модель для прив'язки Telegram
class TelegramLinkData(BaseModel):
    user_id: int
    chat_id: str


# ==========================================
# 🔐 СИСТЕМА JWT ТОКЕНІВ ТА УТИЛІТИ БЕЗПЕКИ
# ==========================================
security_scheme = HTTPBearer()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def escape_html(text: str) -> str:
    if not text: return ""
    return str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def get_current_admin(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "): token = auth_header.split(" ")[1]

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Токен доступу відсутній")

    credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                          detail="Не вдалося валідувати токен")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("username")
        user_id: str = payload.get("sub")
        if username is None or user_id is None: raise credentials_exception
    except JWTError:
        raise credentials_exception

    admin_usernames_str = os.getenv("VITE_ADMIN_USERNAMES", "admin")
    allowed_admins = [name.strip().lower() for name in admin_usernames_str.split(',')]

    if username.lower() not in allowed_admins:
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

    if not token: raise credentials_exception

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None: raise credentials_exception
    except JWTError:
        raise credentials_exception

    db_user = db.query(models.UserDB).filter(models.UserDB.id == int(user_id)).first()
    if not db_user or db_user.is_banned: raise HTTPException(status_code=401,
                                                             detail="Користувача не знайдено або обліковий запис заблоковано")
    return db_user


# ==========================================
# 👤 КОРИСТУВАЧІ, АВТОРИЗАЦІЯ ТА РЕФЕРАЛИ
# ==========================================
@app.post("/api/register")
@limiter.limit("3/minute")
def register_user(request: Request, user: UserRegister, db: Session = Depends(get_db)):
    client_ip = request.client.host
    if len(user.username) > 50 or len(user.password) > 100: raise HTTPException(status_code=400,
                                                                                detail="Дані занадто довгі")

    banned_ip_check = db.query(models.UserDB).filter(models.UserDB.registered_ip == client_ip,
                                                     models.UserDB.is_banned == True).first()
    if banned_ip_check: raise HTTPException(status_code=403,
                                            detail="Реєстрація заблокована. Ваша мережа знаходиться в чорному списку.")

    existing_user = db.query(models.UserDB).filter(
        (models.UserDB.username == user.username) | (models.UserDB.email == user.email)).first()
    if existing_user: raise HTTPException(status_code=400, detail="Користувач з таким ніком або email вже існує")

    salt = bcrypt.gensalt()
    hashed_pwd = bcrypt.hashpw(user.password.encode('utf-8'), salt).decode('utf-8')

    referrer_name = None
    if user.ref:
        referrer = db.query(models.UserDB).filter(models.UserDB.username.ilike(user.ref.strip())).first()
        if referrer and referrer.username.lower() != user.username.lower():
            referrer_name = referrer.username
            referrer.referral_count += 1

    new_user = models.UserDB(username=user.username, email=user.email, password_hash=hashed_pwd,
                             registered_ip=client_ip, referred_by=referrer_name)
    db.add(new_user)
    db.commit()
    return {"status": "success", "message": "Реєстрація успішна!"}


@app.post("/api/login")
@limiter.limit("5/minute")
def login_user(request: Request, user: UserLogin, db: Session = Depends(get_db)):
    client_ip = request.client.host
    db_user = db.query(models.UserDB).filter(models.UserDB.username == user.username).first()

    if not db_user or not bcrypt.checkpw(user.password.encode('utf-8'), db_user.password_hash.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Невірний логін або пароль")

    if db_user.is_banned: raise HTTPException(status_code=403,
                                              detail=f"Ваш акаунт заблоковано! Причина: {db_user.ban_reason or 'Порушення правил магазину'}")

    if db.query(models.UserDB).filter(models.UserDB.registered_ip == client_ip,
                                      models.UserDB.is_banned == True).first():
        raise HTTPException(status_code=403, detail="Вхід заблоковано. Ваш IP знаходиться у чорному списку.")

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
        if payload.get("type") != "refresh" or not user_id: raise HTTPException(status_code=401,
                                                                                detail="Невалідний refresh token")

        db_user = db.query(models.UserDB).filter(models.UserDB.id == int(user_id)).first()
        if not db_user or db_user.is_banned: raise HTTPException(status_code=401,
                                                                 detail="Користувача не знайдено або обліковий запис заблоковано")

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
def get_user_data(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.UserDB).filter(models.UserDB.id == user_id).first()
    if user: return {"balance": user.balance, "referral_count": user.referral_count,
                     "referral_earnings": user.referral_earnings}
    return {"error": "Користувача не знайдено"}


@app.put("/api/users/{user_id}/update")
def update_user_profile(user_id: int, data: UserProfileUpdate, current_user: models.UserDB = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    if current_user.id != user_id: raise HTTPException(status_code=403, detail="Ви не можете редагувати чужий профіль")
    user = db.query(models.UserDB).filter(models.UserDB.id == user_id).first()

    if data.username: user.username = data.username
    if data.new_password: user.password_hash = bcrypt.hashpw(data.new_password.encode('utf-8'),
                                                             bcrypt.gensalt()).decode('utf-8')
    if data.telegram: user.telegram_chat_id = data.telegram

    db.commit()
    return {"status": "success", "message": "Профіль оновлено"}


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
# 👑 АДМІН-МАРШРУТИ: МОНІТОРІНГ ТА БАНИ
# ==========================================
@app.get("/api/admin/users")
def admin_get_all_users(db: Session = Depends(get_db), current_admin: models.UserDB = Depends(get_current_admin)):
    users = db.query(models.UserDB).order_by(models.UserDB.id.desc()).all()
    result = []
    for u in users:
        result.append(
            {"id": u.id, "username": u.username, "email": u.email, "balance": u.balance, "is_banned": u.is_banned,
             "ban_reason": u.ban_reason, "ip": u.registered_ip or "Невідомо", "referred_by": u.referred_by or "Ніхто",
             "referral_count": u.referral_count, "referral_earnings": u.referral_earnings})
    return result


@app.post("/api/admin/users/{user_id}/ban")
def admin_ban_user(user_id: int, data: BanActionRequest, db: Session = Depends(get_db),
                   current_admin: models.UserDB = Depends(get_current_admin)):
    user = db.query(models.UserDB).filter(models.UserDB.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="Користувача не знайдено")
    user.is_banned, user.ban_reason = True, data.reason
    db.commit()
    return {"status": "success", "message": f"Гравця {user.username} успішно забанено."}


@app.post("/api/admin/users/{user_id}/unban")
def admin_unban_user(user_id: int, db: Session = Depends(get_db),
                     current_admin: models.UserDB = Depends(get_current_admin)):
    user = db.query(models.UserDB).filter(models.UserDB.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="Користувача не знайдено")
    user.is_banned, user.ban_reason = False, None
    db.commit()
    return {"status": "success", "message": f"Гравця {user.username} успішно розбанено."}


# ==========================================
# 🔥 ГЛОБАЛЬНА ЛОГІКА СТАТУСІВ 🔥
# ==========================================
def _process_order_status_change(db: Session, order_id: int, new_status: str, confirmed_by_user=False):
    db_order = db.query(models.OrderDB).filter(models.OrderDB.id == order_id).first()
    if not db_order: return False, "Замовлення не знайдено"

    old_status = db_order.status
    if old_status == new_status: return True, "Статус вже такий"

    db_order.status = new_status

    if db_order.user_id:
        title = f"Замовлення #{db_order.id} оновлено"
        if new_status == "completed":
            msg, ntype = "Ваше замовлення успішно завершено! Дякуємо за покупку.", "success"
        elif new_status == "delivered":
            msg, ntype = "Ваше замовлення ДОСТАВЛЕНО! Будь ласка, перевірте та підтвердіть отримання у своєму Кабінеті.", "info"
        elif new_status == "processing":
            msg, ntype = "Ваше замовлення взято в роботу. Очікуйте.", "info"
        elif new_status == "cancelled":
            msg, ntype = "На жаль, ваше замовлення було скасовано.", "warning"
        else:
            msg, ntype = "Статус замовлення змінено.", "info"

        db.add(models.NotificationDB(user_id=db_order.user_id, title=title, message=msg, type=ntype))
        buyer = db.query(models.UserDB).filter(models.UserDB.id == db_order.user_id).first()
        if buyer and buyer.telegram_chat_id:
            try:
                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                              json={"chat_id": buyer.telegram_chat_id,
                                    "text": f"🔔 <b>Оновлення замовлення #{db_order.id}</b>\n\n{msg}",
                                    "parse_mode": "HTML"})
            except:
                pass

    # Сповіщення адміну, якщо клієнт сам підтвердив замовлення
    if confirmed_by_user and new_status == "completed":
        if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
            try:
                admin_msg = f"✅ <b>Клієнт підтвердив отримання!</b>\nЗамовлення #{db_order.id} успішно закрито, кешбек нараховано."
                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                              json={"chat_id": TELEGRAM_CHAT_ID, "text": admin_msg, "parse_mode": "HTML"})
            except:
                pass

    if new_status == "cancelled" and old_status != "cancelled":
        if db_order.payment_method == "balance" and db_order.user_id:
            buyer = db.query(models.UserDB).filter(models.UserDB.id == db_order.user_id).first()
            if buyer: buyer.balance += float(db_order.total)

    if new_status == "completed" and old_status != "completed" and db_order.user_id:
        try:
            cart_items = json.loads(db_order.cart_data)
            is_topup = any(item.get("type") == "topup" for item in cart_items)
            buyer = db.query(models.UserDB).filter(models.UserDB.id == db_order.user_id).first()

            if buyer and buyer.referred_by and not is_topup and db_order.payment_method != "balance":
                referrer = db.query(models.UserDB).filter(models.UserDB.username == buyer.referred_by).first()
                if referrer:
                    ref_bonus = float(db_order.total) * 0.05
                    referrer.balance += ref_bonus
                    referrer.referral_earnings += ref_bonus

            if not is_topup and db_order.payment_method != "balance":
                settings = db.query(models.CashbackSettingsDB).first()
                if buyer: buyer.balance += float(db_order.total) * ((settings.percent if settings else 0.0) / 100)
        except Exception:
            pass

    db.commit()
    return True, "Успіх"


@app.put("/api/orders/{order_id}/status")
def update_order_status(order_id: int, status_data: OrderStatusUpdate, db: Session = Depends(get_db),
                        current_admin: models.UserDB = Depends(get_current_admin)):
    if status_data.status not in ["new", "processing", "delivered", "completed", "cancelled"]: raise HTTPException(
        status_code=400)
    success, msg = _process_order_status_change(db, order_id, status_data.status)
    if not success: return {"error": msg}
    return {"status": "success"}


# 🔥 НОВИЙ МАРШРУТ ДЛЯ ПІДТВЕРДЖЕННЯ ЗАМОВЛЕННЯ КЛІЄНТОМ 🔥
@app.post("/api/orders/{order_id}/confirm")
def confirm_order_delivery(order_id: int, db: Session = Depends(get_db),
                           current_user: models.UserDB = Depends(get_current_user)):
    db_order = db.query(models.OrderDB).filter(models.OrderDB.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Замовлення не знайдено")

    if db_order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Це не ваше замовлення")

    if db_order.status != "delivered":
        raise HTTPException(status_code=400, detail="Замовлення ще не доставлено або вже закрито")

    success, msg = _process_order_status_change(db, order_id, "completed", confirmed_by_user=True)
    if not success:
        raise HTTPException(status_code=400, detail=msg)

    return {"status": "success", "message": "Замовлення успішно підтверджено! Кешбек нараховано."}


@app.get("/api/orders")
def get_orders(db: Session = Depends(get_db), current_admin: models.UserDB = Depends(get_current_admin)):
    orders = db.query(models.OrderDB).order_by(models.OrderDB.id.desc()).all()
    result = []
    for o in orders:
        try:
            cart = json.loads(o.cart_data)
        except:
            cart = []
        result.append(
            {"id": o.id, "cart": cart, "paymentMethod": o.payment_method, "total": o.total, "profit": o.profit,
             "status": o.status, "user_id": o.user_id,
             "created_at": o.created_at.isoformat() if o.created_at else None})
    return result


# ==========================================
# 🚀 ГЕНЕРАТОРИ КРАСИВИХ ПОВІДОМЛЕНЬ TELEGRAM
# ==========================================
def format_item_details(item):
    msg = ""
    account_id = item.get("product", {}).get("id") if item.get("type") == "account" else None
    if account_id: msg += f"   🆔 <b>ID Акаунта:</b> <code>#{escape_html(str(account_id))}</code>\n"

    if "userData" in item:
        for k, v in item["userData"].items():
            if v is None or str(v).strip() == "": continue
            if k == 'amount' and item.get('type') != 'gems': continue
            key_name = {"nickname": "Нікнейм", "guild": "Гільдія", "coords": "Координати", "coordinates": "Координати",
                        "might": "Міць", "amount": "Кількість", "itemToBuy": "Товари", "details": "Додатково"}.get(k,
                                                                                                                   k.capitalize())

            if isinstance(v, list):
                if not v: continue
                msg += f"   🔸 {key_name}:\n"
                for li in v: msg += f"      🔹 {escape_html(str(li))}\n"
            else:
                msg += f"   🔸 {key_name}: <code>{escape_html(str(v))}</code>\n"
    return msg


def generate_full_order_text(db, db_order, status="new"):
    try:
        cart = json.loads(db_order.cart_data)
    except:
        cart = []
    is_topup = any(item.get("type") == "topup" for item in cart)

    user_model = db.query(models.UserDB).filter(
        models.UserDB.id == db_order.user_id).first() if db_order.user_id else None
    buyer_name = escape_html(user_model.username) if user_model else 'Гість'

    if status == "new":
        msg = f"🔥 <b>НОВЕ ЗАМОВЛЕННЯ #{db_order.id}</b> 🔥\n\n"
    elif status == "processing":
        msg = f"🟡 <b>ЗАМОВЛЕННЯ #{db_order.id} В РОБОТІ</b> 🟡\n\n"

    msg += f"💳 <b>Оплата:</b> {'З БАЛАНСУ' if db_order.payment_method == 'balance' else escape_html(db_order.payment_method).upper()}\n💰 <b>Сума:</b> ${db_order.total}\n"
    if not is_topup:
        msg += f"📈 <b>Чистий прибуток:</b> ${db_order.profit}\n"
    else:
        msg += f"⚡️ <b>Тип:</b> ПОПОВНЕННЯ БАЛАНСУ\n"
    msg += f"👤 <b>Покупець:</b> {buyer_name}\n\n🛒 <b>Кошик:</b>\n"

    for index, item in enumerate(cart, 1):
        product_name = escape_html(item.get("product", {}).get("name") or item.get("product", {}).get("title"))
        msg += f"<b>{index}. {product_name}</b> | ${escape_html(str(item.get('price')))}\n"
        msg += format_item_details(item)
        msg += "\n"
    return msg


def generate_worker_message_text(db_order):
    try:
        cart = json.loads(db_order.cart_data)
    except:
        cart = []

    msg_worker = f"⬇️ <i>Для пересилання виконавцю</i> ⬇️\n\n📦 <b>ДЕТАЛІ ДЛЯ ДОСТАВКИ (Замовлення #{db_order.id})</b>\n\n🛒 <b>Товари:</b>\n"
    for index, item in enumerate(cart, 1):
        product_name = escape_html(item.get("product", {}).get("name") or item.get("product", {}).get("title"))
        msg_worker += f"<b>{index}. {product_name}</b>\n"
        msg_worker += format_item_details(item)
        msg_worker += "\n"
    return msg_worker


def generate_short_status_message(db_order, status):
    try:
        cart = json.loads(db_order.cart_data)
    except:
        cart = []

    if status == "completed":
        msg = f"✅ Замовлення #{db_order.id} <b>ВИКОНАНО</b>\n🛒 <b>Доставлено:</b>\n"
    elif status == "delivered":
        msg = f"🚚 Замовлення #{db_order.id} <b>ДОСТАВЛЕНО</b>\nОчікуємо підтвердження клієнта на сайті.\n"
    else:
        msg = f"❌ Замовлення #{db_order.id} <b>СКАСОВАНО</b> {'(кошти повернуто)' if db_order.payment_method == 'balance' else ''}\n🛒 <b>Скасовано:</b>\n"

    for index, item in enumerate(cart, 1):
        product_name = escape_html(item.get("product", {}).get("name") or item.get("product", {}).get("title"))
        msg += f" 🔸 {product_name}\n"
    return msg


# ==========================================
# 🚀 ЗАМОВЛЕННЯ ТА WEBHOOK ТЕЛЕГРАМУ
# ==========================================
@app.post("/api/checkout")
@limiter.limit("10/minute")
async def checkout(request: Request, order: OrderData, db: Session = Depends(get_db)):
    is_topup = False
    topup_amount = 0.0
    total_float = float(order.total)

    if order.paymentMethod == "balance":
        if not order.user_id: raise HTTPException(status_code=401)
        user = db.query(models.UserDB).filter(models.UserDB.id == order.user_id).first()
        if not user or user.balance < total_float: raise HTTPException(status_code=400)
        user.balance -= total_float

    for item in order.cart:
        if item.get("type") == "topup":
            is_topup = True
            topup_amount += float(item.get("coins", 0))

    new_order = models.OrderDB(
        user_id=order.user_id, cart_data=json.dumps(order.cart), payment_method=escape_html(order.paymentMethod),
        total=order.total, profit=order.profit, status="completed" if is_topup else "new"
    )
    db.add(new_order)

    if is_topup and order.user_id:
        user = db.query(models.UserDB).filter(models.UserDB.id == order.user_id).first()
        if user: user.balance += topup_amount

    db.commit()
    db.refresh(new_order)

    if TELEGRAM_BOT_TOKEN:
        if is_topup:
            short_msg = generate_short_status_message(new_order, "completed")
            requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                          json={"chat_id": TELEGRAM_CHAT_ID, "text": short_msg, "parse_mode": "HTML"})
        else:
            msg_admin = generate_full_order_text(db, new_order, "new")
            keyboard = {"inline_keyboard": [
                [{"text": "🟡 В роботу", "callback_data": f"admin_processing_{new_order.id}"},
                 {"text": "🔴 Скасувати", "callback_data": f"admin_cancelled_{new_order.id}"}]
            ]}
            requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                          json={"chat_id": TELEGRAM_CHAT_ID, "text": msg_admin, "parse_mode": "HTML",
                                "reply_markup": keyboard})

    return {"status": "success", "order_id": new_order.id}


@app.post("/api/telegram/webhook")
async def telegram_webhook(request: Request, db: Session = Depends(get_db)):
    try:
        data = await request.json()
        if "callback_query" in data:
            callback = data["callback_query"]
            chat_id = callback["message"]["chat"]["id"]
            message_id = callback["message"]["message_id"]
            action_data = callback["data"]

            if action_data.startswith("admin_") or action_data.startswith("worker_"):
                parts = action_data.split("_")
                prefix, new_status, order_id = parts[0], parts[1], int(parts[2])

                success, _ = _process_order_status_change(db, order_id, new_status)

                if TELEGRAM_BOT_TOKEN:
                    requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                                  json={"callback_query_id": callback["id"]})

                    if success:
                        db_order = db.query(models.OrderDB).filter(models.OrderDB.id == order_id).first()
                        requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/deleteMessage",
                                      json={"chat_id": chat_id, "message_id": message_id})

                        if new_status == "processing" and prefix == "admin":
                            full_msg = generate_full_order_text(db, db_order, "processing")
                            requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                          json={"chat_id": chat_id, "text": full_msg, "parse_mode": "HTML"})

                            worker_msg = generate_worker_message_text(db_order)
                            worker_kb = {"inline_keyboard": [
                                [{"text": "🚚 Доставлено", "callback_data": f"worker_delivered_{order_id}"},
                                 {"text": "🔴 Скасувати", "callback_data": f"worker_cancelled_{order_id}"}]
                            ]}
                            requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                          json={"chat_id": chat_id, "text": worker_msg, "parse_mode": "HTML",
                                                "reply_markup": worker_kb})

                        elif new_status == "delivered":
                            short_msg = generate_short_status_message(db_order, "delivered")
                            requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                          json={"chat_id": chat_id, "text": short_msg, "parse_mode": "HTML"})

                        elif new_status == "cancelled":
                            short_msg = generate_short_status_message(db_order, "cancelled")
                            requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                          json={"chat_id": chat_id, "text": short_msg, "parse_mode": "HTML"})
        return {"status": "ok"}
    except Exception:
        return {"status": "error"}


@app.post("/api/telegram/link")
def link_telegram(data: TelegramLinkData, db: Session = Depends(get_db)):
    user = db.query(models.UserDB).filter(models.UserDB.id == data.user_id).first()
    if not user: raise HTTPException(status_code=404)
    user.telegram_chat_id = data.chat_id
    db.commit()
    return {"status": "success"}


# ==========================================
# 💰 ІНШІ МАРШРУТИ (НАЛАШТУВАННЯ, ТОВАРИ ТОЩО)
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
    db.query(models.OtherItemDB).filter(models.OtherItemDB.id == item_id).delete()
    db.commit()
    return {"status": "success"}


@app.post("/api/other-items/bulk")
def update_all_other_items(items: list[OtherItemCreate], db: Session = Depends(get_db),
                           current_admin: models.UserDB = Depends(get_current_admin)):
    db.query(models.OtherItemDB).delete()
    for item in items: db.add(
        models.OtherItemDB(name=item.name, desc=item.desc, price=item.price, base_price=item.base_price, tag=item.tag,
                           color=item.color, requiredFields=",".join(item.requiredFields)))
    db.commit()
    return {"status": "success"}


@app.get("/api/resources")
def get_resources(db: Session = Depends(get_db)):
    return db.query(models.ResourceDB).all()


@app.post("/api/resources/bulk")
def update_all_resources(resources: list[ResourceCreate], db: Session = Depends(get_db),
                         current_admin: models.UserDB = Depends(get_current_admin)):
    db.query(models.ResourceDB).delete()
    for res in resources: db.add(
        models.ResourceDB(name=res.name, desc=res.desc, price=res.price, base_price=res.base_price))
    db.commit()
    return {"status": "success"}


@app.get("/api/gems")
def get_gems(db: Session = Depends(get_db)):
    return db.query(models.GemDB).all()


@app.post("/api/gems/bulk")
def update_all_gems(gems: list[GemCreate], db: Session = Depends(get_db),
                    current_admin: models.UserDB = Depends(get_current_admin)):
    db.query(models.GemDB).delete()
    for gem in gems: db.add(models.GemDB(range=gem.range, rate=gem.rate, base_price=gem.base_price))
    db.commit()
    return {"status": "success"}


@app.get("/api/accounts")
def get_accounts(db: Session = Depends(get_db)):
    accounts = db.query(models.AccountDB).order_by(models.AccountDB.id.desc()).all()
    result = []
    for acc in accounts:
        try:
            images_list = json.loads(acc.images) if acc.images else []
        except:
            images_list = []
        try:
            stats_dict = json.loads(acc.stats) if acc.stats else {}
        except:
            stats_dict = {}

        result.append({
            "id": acc.id,
            "title": acc.title,
            "shortDesc": acc.shortDesc,
            "price": acc.price,
            "base_price": acc.base_price,
            "tags": acc.tags.split(",") if acc.tags else [],
            "status": acc.status,
            "bind": acc.bind,
            "images": images_list,
            "stats": stats_dict
        })
    return result


@app.post("/api/accounts")
async def create_account(
        title: str = Form(...),
        shortDesc: str = Form(...),
        price: str = Form(...),
        base_price: str = Form("0"),
        tags: str = Form(...),
        bind: str = Form(...),
        stats: str = Form("{}"),
        images: List[UploadFile] = File(...),
        db: Session = Depends(get_db),
        current_admin: models.UserDB = Depends(get_current_admin)
):
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
        except Exception as e:
            print(f"Error processing image: {e}")
            raise HTTPException(status_code=400, detail="Помилка обробки зображення")

    new_account = models.AccountDB(
        title=title, shortDesc=shortDesc, price=price, base_price=base_price,
        tags=tags, bind=bind, images=json.dumps(image_urls), status="active", stats=stats
    )
    db.add(new_account)
    db.commit()
    return {"status": "success"}


@app.put("/api/accounts/{account_id}/status")
def update_account_status(account_id: int, status_data: AccountStatusUpdate, db: Session = Depends(get_db),
                          current_admin: models.UserDB = Depends(get_current_admin)):
    db_account = db.query(models.AccountDB).filter(models.AccountDB.id == account_id).first()
    if not db_account: return {"error": "Акаунт не знайдено"}
    db_account.status = status_data.status
    db.commit()
    return {"status": "success"}


@app.delete("/api/accounts/{account_id}")
def delete_account(account_id: int, db: Session = Depends(get_db),
                   current_admin: models.UserDB = Depends(get_current_admin)):
    db.query(models.AccountDB).filter(models.AccountDB.id == account_id).delete()
    db.commit()
    return {"status": "success"}


@app.get("/api/promocodes")
def get_promocodes(db: Session = Depends(get_db)):
    return db.query(models.PromoCodeDB).all()


@app.post("/api/promocodes")
def create_promocode(promo: PromoCodeCreate, db: Session = Depends(get_db),
                     current_admin: models.UserDB = Depends(get_current_admin)):
    if db.query(models.PromoCodeDB).filter(models.PromoCodeDB.code == promo.code.upper()).first(): return {
        "error": "Такий код вже існує"}
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
    if not promo or promo.is_active == 0: return {"valid": False, "message": "Промокод недійсний"}
    if promo.max_uses > 0 and promo.current_uses >= promo.max_uses: return {"valid": False,
                                                                            "message": "Ліміт вичерпано"}
    if total < promo.min_order_amount: return {"valid": False, "message": f"Мінімальна сума: ${promo.min_order_amount}"}
    if promo.expiry_date and datetime.now() > datetime.fromisoformat(promo.expiry_date): return {"valid": False,
                                                                                                 "message": "Термін вийшов"}
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