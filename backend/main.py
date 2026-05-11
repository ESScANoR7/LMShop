from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import requests
from typing import Optional
from sqlalchemy.orm import Session

from database import engine, get_db
import models

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 🛑 ТВОЇ ДАНІ TELEGRAM 🛑
# ==========================================
TELEGRAM_BOT_TOKEN = "8676641304:AAFFSr1ClHgzftSmkM9Lo-oIjLi-O-iq9hs"
TELEGRAM_CHAT_ID = "921822571"


class OrderData(BaseModel):
    cart: list
    paymentMethod: str
    total: str

# ==========================================
# 🗄️ МОДЕЛІ ДАНИХ ДЛЯ БАЗИ (Pydantic)
# ==========================================
class AccountCreate(BaseModel):
    title: str
    shortDesc: str
    price: str
    tags: str
    bind: str
    images: list

class AccountStatusUpdate(BaseModel):
    status: str

class ResourceCreate(BaseModel):
    name: str
    desc: str
    price: str

class GemCreate(BaseModel):
    range: str
    rate: str

class OtherItemCreate(BaseModel):
    name: str
    desc: str
    price: str
    tag: str
    color: str
    requiredFields: list # З адмінки буде прилітати як масив

class PromoCodeCreate(BaseModel):
    code: str
    type: str
    value: str
    target: str
    max_uses: int
    min_order_amount: float
    expiry_date: Optional[str] = None      # Додали Optional
    specific_items: Optional[str] = None   # Додали Optional
# ==========================================
# 🚀 API МАРШРУТИ ДЛЯ РЕСУРСІВ (RSS) ТА GEMS
# ==========================================
@app.get("/api/other-items")
def get_other_items(db: Session = Depends(get_db)):
    items = db.query(models.OtherItemDB).all()
    result = []
    for item in items:
        result.append({
            "id": item.id,
            "name": item.name,
            "desc": item.desc,
            "price": item.price,
            "tag": item.tag,
            "color": item.color,
            "requiredFields": item.requiredFields.split(",") if item.requiredFields else []
        })
    return result

@app.post("/api/other-items")
def create_other_item(item: OtherItemCreate, db: Session = Depends(get_db)):
    new_item = models.OtherItemDB(
        name=item.name,
        desc=item.desc,
        price=item.price,
        tag=item.tag,
        color=item.color,
        requiredFields=",".join(item.requiredFields) # Зберігаємо масив як рядок через кому
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return {"status": "success", "id": new_item.id}

@app.delete("/api/other-items/{item_id}")
def delete_other_item(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.OtherItemDB).filter(models.OtherItemDB.id == item_id).first()
    if db_item:
        db.delete(db_item)
        db.commit()
    return {"status": "success"}

@app.get("/api/resources")
def get_resources(db: Session = Depends(get_db)):
    return db.query(models.ResourceDB).all()

@app.post("/api/resources/bulk")
def update_all_resources(resources: list[ResourceCreate], db: Session = Depends(get_db)):
    db.query(models.ResourceDB).delete()
    for res in resources:
        new_res = models.ResourceDB(name=res.name, desc=res.desc, price=res.price)
        db.add(new_res)
    db.commit()
    return {"status": "success"}

@app.get("/api/gems")
def get_gems(db: Session = Depends(get_db)):
    return db.query(models.GemDB).all()

@app.post("/api/gems/bulk")
def update_all_gems(gems: list[GemCreate], db: Session = Depends(get_db)):
    db.query(models.GemDB).delete()
    for gem in gems:
        new_gem = models.GemDB(range=gem.range, rate=gem.rate)
        db.add(new_gem)
    db.commit()
    return {"status": "success"}

# ==========================================
# 🚀 API МАРШРУТИ ДЛЯ АКАУНТІВ
# ==========================================
@app.post("/api/accounts")
def create_account(account: AccountCreate, db: Session = Depends(get_db)):
    import json
    images_str = json.dumps(account.images)
    new_account = models.AccountDB(
        title=account.title,
        shortDesc=account.shortDesc,
        price=account.price,
        tags=account.tags,
        bind=account.bind,
        images=images_str,
        status="active"
    )
    db.add(new_account)
    db.commit()
    db.refresh(new_account)
    return {"status": "success", "message": "Акаунт успішно додано!", "id": new_account.id}

@app.get("/api/accounts")
def get_accounts(db: Session = Depends(get_db)):
    accounts = db.query(models.AccountDB).all()
    import json
    result = []
    for acc in accounts:
        try:
            images_list = json.loads(acc.images) if acc.images else []
        except:
            images_list = []
        result.append({
            "id": acc.id,
            "title": acc.title,
            "shortDesc": acc.shortDesc,
            "price": acc.price,
            "tags": acc.tags.split(",") if acc.tags else [],
            "status": acc.status,
            "bind": acc.bind,
            "images": images_list
        })
    return result

@app.put("/api/accounts/{account_id}/status")
def update_account_status(account_id: int, status_data: AccountStatusUpdate, db: Session = Depends(get_db)):
    db_account = db.query(models.AccountDB).filter(models.AccountDB.id == account_id).first()
    if not db_account:
        return {"error": "Акаунт не знайдено"}
    db_account.status = status_data.status
    db.commit()
    return {"status": "success", "new_status": db_account.status}

@app.put("/api/accounts/{account_id}")
def update_account(account_id: int, account: AccountCreate, db: Session = Depends(get_db)):
    import json
    db_account = db.query(models.AccountDB).filter(models.AccountDB.id == account_id).first()
    if not db_account:
        return {"error": "Акаунт не знайдено"}
    db_account.title = account.title
    db_account.shortDesc = account.shortDesc
    db_account.price = account.price
    db_account.tags = account.tags
    db_account.bind = account.bind
    db_account.images = json.dumps(account.images)
    db.commit()
    return {"status": "success", "message": "Акаунт успішно оновлено!"}

@app.delete("/api/accounts/{account_id}")
def delete_account(account_id: int, db: Session = Depends(get_db)):
    db_account = db.query(models.AccountDB).filter(models.AccountDB.id == account_id).first()
    if not db_account:
        return {"error": "Акаунт не знайдено"}
    db.delete(db_account)
    db.commit()
    return {"status": "success", "message": "Акаунт видалено!"}

# ==========================================
# 🚀 API МАРШРУТ ДЛЯ TELEGRAM
# ==========================================
def send_telegram_message(text: str):
    if TELEGRAM_BOT_TOKEN == "ТВІЙ_ТОКЕН_ВІД_BOTFATHER":
        print("⚠️ УВАГА: Токен Telegram не налаштовано. Повідомлення не відправлено.")
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": text,
        "parse_mode": "HTML"
    }
    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            print("✅ Успішно відправлено в Telegram!")
        else:
            print(f"❌ Помилка Telegram: {response.text}")
    except Exception as e:
        print("❌ Помилка з'єднання з Telegram:", e)

@app.post("/api/checkout")
async def checkout(order: OrderData):
    print("\n🔥 Отримано замовлення! Формуємо повідомлення...")
    msg = f"🔥 <b>НОВЕ ЗАМОВЛЕННЯ!</b> 🔥\n\n"
    msg += f"💳 <b>Оплата:</b> {order.paymentMethod.upper()}\n"
    msg += f"💰 <b>Сума:</b> ${order.total}\n\n"
    msg += "🛒 <b>Кошик:</b>\n"

    for index, item in enumerate(order.cart, 1):
        product = item.get("product", {})
        product_name = product.get("name") or product.get("title")
        msg += f"<b>{index}. {product_name}</b> | ${item.get('price')}\n"

        if item.get("type") == "account":
            account_id = product.get("id")
            if account_id:
                msg += f"   🆔 <b>ID Акаунта:</b> <code>#{account_id}</code>\n"

        if "userData" in item:
            user_data = item["userData"]
            nickname = user_data.get("nickname")
            guild = user_data.get("guild")
            coords = user_data.get("coordinates") or user_data.get("coords")
            details = user_data.get("details")
            might = user_data.get("might")
            items_to_gift = user_data.get("itemsToGift")

            if nickname: msg += f"   👤 Нікнейм: <code>{nickname}</code>\n"
            if guild: msg += f"   🛡 Гільдія: <code>{guild}</code>\n"
            if coords: msg += f"   📍 Координати: <code>{coords}</code>\n"
            if might: msg += f"   💪 Міць: <code>{might}</code>\n"
            if items_to_gift: msg += f"   🎁 <b>Що відправити:</b> {items_to_gift}\n"
            if details: msg += f"   📝 Додатково: {details}\n"

        msg += "\n"

    send_telegram_message(msg)
    return {"status": "success", "message": "Замовлення оброблено!"}


# ==========================================
# 🚀 API МАРШРУТИ ДЛЯ ПРОМОКОДІВ
# ==========================================

@app.get("/api/promocodes")
def get_promocodes(db: Session = Depends(get_db)):
    return db.query(models.PromoCodeDB).all()


@app.post("/api/promocodes")
def create_promocode(promo: PromoCodeCreate, db: Session = Depends(get_db)):
    existing = db.query(models.PromoCodeDB).filter(models.PromoCodeDB.code == promo.code.upper()).first()
    if existing:
        return {"error": "Такий код вже існує"}

    new_promo = models.PromoCodeDB(
        code=promo.code.upper(),
        type=promo.type,
        value=promo.value,
        target=promo.target,
        max_uses=promo.max_uses,
        min_order_amount=promo.min_order_amount,
        expiry_date=promo.expiry_date,
        is_active=1,
        specific_items=promo.specific_items # Додали сюди
    )
    db.add(new_promo)
    db.commit()
    return {"status": "success"}

# Перевірка промокоду при покупці
@app.get("/api/promocodes/validate/{code}")
def validate_promo(code: str, total: float, db: Session = Depends(get_db)):
    from datetime import datetime

    promo = db.query(models.PromoCodeDB).filter(models.PromoCodeDB.code == code.upper()).first()

    if not promo or promo.is_active == 0:
        return {"valid": False, "message": "Промокод недійсний або вимкнений"}

    # 1. Перевірка ліміту використань
    if promo.max_uses > 0 and promo.current_uses >= promo.max_uses:
        return {"valid": False, "message": "Ліміт використань цього коду вичерпано"}

    # 2. Перевірка мінімальної суми
    if total < promo.min_order_amount:
        return {"valid": False, "message": f"Мінімальна сума для цього коду: ${promo.min_order_amount}"}

    # 3. Перевірка дати (якщо встановлена)
    if promo.expiry_date:
        expiry = datetime.fromisoformat(promo.expiry_date)
        if datetime.now() > expiry:
            return {"valid": False, "message": "Термін дії промокоду закінчився"}

    return {
        "valid": True,
        "type": promo.type,
        "value": promo.value,
        "target": promo.target
    }


@app.delete("/api/promocodes/{id}")
def delete_promo(id: int, db: Session = Depends(get_db)):
    db.query(models.PromoCodeDB).filter(models.PromoCodeDB.id == id).delete()
    db.commit()
    return {"status": "success"}


# Увімкнути/Вимкнути промокод
@app.put("/api/promocodes/{id}/toggle")
def toggle_promo(id: int, db: Session = Depends(get_db)):
    promo = db.query(models.PromoCodeDB).filter(models.PromoCodeDB.id == id).first()
    if promo:
        promo.is_active = 0 if promo.is_active == 1 else 1
        db.commit()
    return {"status": "success", "new_status": promo.is_active}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)