from sqlalchemy import Column, Integer, String, Float
from database import Base

class AccountDB(Base):
    __tablename__ = "accounts"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    shortDesc = Column(String)
    price = Column(String)
    tags = Column(String)
    status = Column(String, default="active")
    bind = Column(String)
    images = Column(String)

class ResourceDB(Base):
    __tablename__ = "resources"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    desc = Column(String)
    price = Column(String)

class GemDB(Base):
    __tablename__ = "gems"
    id = Column(Integer, primary_key=True, index=True)
    range = Column(String)
    rate = Column(String)

class OtherItemDB(Base):
    __tablename__ = "other_items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    desc = Column(String)
    price = Column(String)
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
    specific_items = Column(String, nullable=True) # НОВЕ ПОЛЕ: зберігатиме "acc_1,oth_3"