import os
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from database import get_db
import models

# Завантажуємо змінні середовища
load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("JWT_SECRET_KEY must be set in .env file")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))
FRONTEND_URL = os.getenv("VITE_FRONTEND_URL", "http://localhost:5173")

security_scheme = HTTPBearer()

# ==========================================
# ⚙️ РОБОТА З КОНФІГОМ МАГАЗИНУ
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


# ==========================================
# 🔐 СИСТЕМА JWT ТОКЕНІВ ТА АВТОРИЗАЦІЯ
# ==========================================
def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta if expires_delta else timedelta(minutes=15))
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
          <p style="color: #d4d4d8;">You received this email because of a password reset request.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_link}" style="background-color: #dc2626; color: white; padding: 14px 30px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; border: 1px solid #f87171;">Reset Password</a>
          </div>
          <p style="color: #71717a; font-size: 12px; text-align: center;">Valid for 30 minutes.</p>
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

    credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Не вдалося валідувати токен")

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
                        "might": "Міць", "amount": "Кількість", "itemToBuy": "Товари", "details": "Додатково"}.get(k, k.capitalize())

            if isinstance(v, list):
                if not v: continue
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

    user_model = db.query(models.UserDB).filter(models.UserDB.id == db_order.user_id).first() if db_order.user_id else None
    buyer_name = escape_html(user_model.username) if user_model else 'Гість'

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

    user_model = db.query(models.UserDB).filter(models.UserDB.id == db_order.user_id).first() if db_order.user_id else None
    buyer_name = escape_html(user_model.username) if user_model else 'Гість'

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
        if worker_name: msg += f"🧑‍💻 <b>Виконав:</b> {worker_name}\n" if is_uk else f"🧑‍💻 <b>Worker:</b> {worker_name}\n"
    elif status == "delivered":
        msg = f"🚚 Замовлення #{db_order.id} <b>ДОСТАВЛЕНО</b>\nОчікуємо підтвердження клієнта...\n" if is_uk else f"🚚 Order #{db_order.id} <b>DELIVERED</b>\nAwaiting client confirmation...\n"
        if worker_name: msg += f"🧑‍💻 <b>Доставив:</b> {worker_name}\n" if is_uk else f"🧑‍💻 <b>Delivered by:</b> {worker_name}\n"
    elif status == "paid_processing":
        msg = f"🟢 Замовлення #{db_order.id} <b>В РОБОТІ (Оплачено)</b>\n" if is_uk else f"🟢 Order #{db_order.id} <b>IN PROGRESS (Paid)</b>\n"
        if worker_name: msg += f"🧑‍💻 <b>Прийняв:</b> {worker_name}\n" if is_uk else f"🧑‍💻 <b>Accepted by:</b> {worker_name}\n"
    else:
        refund_txt = '(кошти повернуто)' if db_order.payment_method == 'balance' else ''
        refund_txt_en = '(refunded)' if db_order.payment_method == 'From balance' else ''
        msg = f"❌ Замовлення #{db_order.id} <b>СКАСОВАНО</b> {refund_txt}\n" if is_uk else f"❌ Order #{db_order.id} <b>CANCELLED</b> {refund_txt_en}\n"

    msg += "🛒 <b>Товари:</b>\n" if is_uk else "🛒 <b>Items:</b>\n"
    for index, item in enumerate(visible_cart, 1):
        product_name = escape_html(item.get("product", {}).get("name") or item.get("product", {}).get("title"))
        msg += f" 🔸 {product_name}\n"
    return msg