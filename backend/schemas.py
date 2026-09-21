from pydantic import BaseModel, EmailStr
from typing import Optional, List
# ==========================================
# 🗄️ МОДЕЛІ ДАНИХ ТА КОНФІГИ (Pydantic)
# ==========================================

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

