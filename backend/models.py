from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey,Boolean
from database import Base
from datetime import datetime


# ==========================================
# 👤 КОРИСТУВАЧІ ТА АВТОРИЗАЦІЯ
# ==========================================
class UserDB(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    balance = Column(Float, default=0.0)

    # 🔥 НОВІ ПОЛЯ ДЛЯ БЕЗПЕКИ ТА РЕФЕРАЛІВ 🔥
    is_banned = Column(Boolean, default=False)
    ban_reason = Column(String, nullable=True)
    registered_ip = Column(String, nullable=True)  # Трейсимо IP для бану по мережі
    referred_by = Column(String, nullable=True)  # Нікнейм того, хто запросив
    referral_count = Column(Integer, default=0)  # Кількість запрошених друзів
    referral_earnings = Column(Float, default=0.0)  # Скільки заробив на друзях

    #  НОВЕ ПОЛЕ ДЛЯ ОСОБИСТИХ СПОВІЩЕНЬ
    telegram_chat_id = Column(String, nullable=True)


# ==========================================
# ⚙️ НАЛАШТУВАННЯ КЕШБЕКУ (З АДМІНКИ)
# ==========================================
class CashbackSettingsDB(Base):
    __tablename__ = "cashback_settings"

    id = Column(Integer, primary_key=True, index=True)
    percent = Column(Float, default=5.0)  # Відсоток кешбеку
    excluded_types = Column(String, default="account")  # Що виключаємо


# ==========================================
# 🛒 ТОВАРИ ТА ЗАМОВЛЕННЯ
# ==========================================
class AccountDB(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    shortDesc = Column(String)
    price = Column(String)
    base_price = Column(String, default="0")
    tags = Column(String)
    bind = Column(String)
    images = Column(String)
    status = Column(String, default="active")

    stats = Column(String, nullable=True)


class ResourceDB(Base):
    __tablename__ = "resources"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    desc = Column(String)
    price = Column(String)
    base_price = Column(String, default="0")


class GemDB(Base):
    __tablename__ = "gems"
    id = Column(Integer, primary_key=True, index=True)
    range = Column(String)
    rate = Column(String)
    base_price = Column(String, default="0")


class OtherItemDB(Base):
    __tablename__ = "other_items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    desc = Column(String)
    price = Column(String)
    base_price = Column(String, default="0")
    tag = Column(String)
    color = Column(String)
    requiredFields = Column(String)


class PromoCodeDB(Base):
    __tablename__ = "promocodes"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True)
    type = Column(String)
    value = Column(String)
    target = Column(String)
    max_uses = Column(Integer, default=0)
    current_uses = Column(Integer, default=0)
    min_order_amount = Column(Float, default=0.0)
    expiry_date = Column(String, nullable=True)
    is_active = Column(Integer, default=1)
    target_items = Column(String, default="[]")
    target_names = Column(String, default="[]")


class OrderDB(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Хто купив (може бути None, якщо це Гість)
    cart_data = Column(String)
    payment_method = Column(String)
    total = Column(String)
    profit = Column(String, default="0")
    status = Column(String, default="new")
    created_at = Column(DateTime, default=datetime.utcnow)

class NotificationDB(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    message = Column(String)
    type = Column(String, default="info") # 'success', 'warning', 'info'
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)