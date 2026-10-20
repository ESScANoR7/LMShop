from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
from database import Base
from datetime import datetime



# ==========================================
# 👤 КОРИСТУВАЧІ ТА АВТОРИЗАЦІЯ
# ==========================================
class UserDB(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(191), unique=True, index=True)
    email = Column(String(191), unique=True, index=True)
    password_hash = Column(String(255))
    balance = Column(Float, default=0.0)

    # 🔥 ПОЛЯ ДЛЯ БЕЗПЕКИ ТА РЕФЕРАЛІВ 🔥
    is_banned = Column(Boolean, default=False)
    ban_reason = Column(String(255), nullable=True)
    registered_ip = Column(String(100), nullable=True)
    referred_by = Column(String(191), nullable=True)
    referral_count = Column(Integer, default=0)
    referral_earnings = Column(Float, default=0.0)

    # СПОВІЩЕННЯ ТА МОВА
    telegram_chat_id = Column(String(100), nullable=True)
    language = Column(String(10), default="en", nullable=False)
    avatar = Column(String(255), nullable=True)

# ==========================================
# ⚙️ НАЛАШТУВАННЯ КЕШБЕКУ (З АДМІНКИ)
# ==========================================
class CashbackSettingsDB(Base):
    __tablename__ = "cashback_settings"

    id = Column(Integer, primary_key=True, index=True)
    percent = Column(Float, default=5.0)
    excluded_types = Column(String(255), default="account")
    category_percents = Column(Text, nullable=True)
    tiers = Column(Text, nullable=True)


# ==========================================
# 🛒 ТОВАРИ ТА ЗАМОВЛЕННЯ
# ==========================================
class AccountDB(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), index=True)
    shortDesc = Column(Text)
    price = Column(String(50))
    base_price = Column(String(50), default="0")
    tags = Column(String(255))
    bind = Column(String(255))
    images = Column(Text)
    status = Column(String(50), default="active")

    stats = Column(Text, nullable=True)


class ResourceDB(Base):
    __tablename__ = "resources"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(191))
    desc = Column(Text)
    price = Column(String(50))
    base_price = Column(String(50), default="0")


class GemDB(Base):
    __tablename__ = "gems"
    id = Column(Integer, primary_key=True, index=True)
    range = Column(String(100))
    rate = Column(String(50))
    base_price = Column(String(50), default="0")


class OtherItemDB(Base):
    __tablename__ = "other_items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(191))
    desc = Column(Text)
    price = Column(String(50))
    base_price = Column(String(50), default="0")
    tag = Column(String(100))
    color = Column(String(50))
    requiredFields = Column(Text)
    is_tg_only = Column(Boolean, default=False)


class PromoCodeDB(Base):
    __tablename__ = "promocodes"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(191), unique=True, index=True)
    type = Column(String(50))
    value = Column(String(50))
    target = Column(String(100))
    max_uses = Column(Integer, default=0)
    current_uses = Column(Integer, default=0)
    min_order_amount = Column(Float, default=0.0)
    expiry_date = Column(String(50), nullable=True)
    is_active = Column(Integer, default=1)
    target_items = Column(Text, default="[]")
    target_names = Column(Text, default="[]")


class OrderDB(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    cart_data = Column(Text)
    payment_method = Column(String(50))
    total = Column(String(50))
    profit = Column(String(50), default="0")
    status = Column(String(50), default="new")
    is_reward_credited = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class NotificationDB(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(255))
    message = Column(Text)
    type = Column(String(50), default="info")
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# ==========================================
# 💬 ЧАТИ ЗАМОВЛЕНЬ (ТІКЕТИ ТА РЕКВІЗИТИ)
# ==========================================
class TicketMessageDB(Base):
    __tablename__ = "ticket_messages"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), index=True)
    sender = Column(String(50))
    text = Column(Text)
    is_secret = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# ==========================================
# 🗄️ АВТОБУХГАЛТЕРІЯ ТА РЕФЕРАЛКА
# ==========================================

class WorkerAccountingDB(Base):
    __tablename__ = "worker_accounting"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    worker_name = Column(String(191), unique=True, index=True)
    current_unpaid = Column(Float, default=0.0)
    total_paid = Column(Float, default=0.0)

class OrderAssignmentDB(Base):
    __tablename__ = "order_assignments"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, unique=True, index=True)
    worker_name = Column(String(191))
    cost_amount = Column(Float, default=0.0)
    is_credited = Column(Boolean, default=False)

class ReferralSettingsDB(Base):
    __tablename__ = "referral_settings"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    percent = Column(Float, default=5.0)
    is_active = Column(Boolean, default=True)
    category_percents = Column(Text, nullable=True)

class OrderTopicDB(Base):
    __tablename__ = "order_topics"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, unique=True, index=True)
    topic_id = Column(Integer, index=True)

class StorefrontMessageDB(Base):
    __tablename__ = "storefront_messages"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    item_group = Column(String(100), index=True)
    item_id = Column(Integer, index=True)
    message_id = Column(Integer)

class ReferralRewardDB(Base):
    __tablename__ = "referral_rewards"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    referrer_id = Column(Integer, ForeignKey("users.id"), index=True)
    referral_id = Column(Integer, ForeignKey("users.id"), index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    amount = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)


class TelegramSessionDB(Base):
    __tablename__ = "telegram_sessions"
    __table_args__ = {'extend_existing': True}

    chat_id = Column(String(50), primary_key=True, index=True)
    state = Column(Text, default="{}")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

