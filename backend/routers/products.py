from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import json
import uuid
import os
from PIL import Image

from database import get_db
import models
import schemas
from utils import get_current_admin

# Імпортуємо функції Telegram для вітрини
from routers.telegram import tg_post_product, tg_delete_product, tg_delete_all_in_group

router = APIRouter(tags=["Products"])

# ==========================================
# 💰 НАЛАШТУВАННЯ КЕШБЕКУ ТА РЕФЕРАЛОК
# ==========================================
@router.get("/api/cashback/settings")
def get_cashback_settings(db: Session = Depends(get_db)):
    settings = db.query(models.CashbackSettingsDB).first()
    if not settings:
        settings = models.CashbackSettingsDB(percent=5.0, excluded_types="account")
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.put("/api/cashback/settings")
def update_cashback_settings(data: schemas.CashbackSettingsUpdate, db: Session = Depends(get_db),
                             current_admin: models.UserDB = Depends(get_current_admin)):
    settings = db.query(models.CashbackSettingsDB).first()
    if not settings:
        db.add(models.CashbackSettingsDB(percent=data.percent, excluded_types=data.excluded_types))
    else:
        settings.percent, settings.excluded_types = data.percent, data.excluded_types
    db.commit()
    return {"status": "success"}

@router.get("/api/cashback/settings/public")
def get_public_cashback_settings(db: Session = Depends(get_db)):
    settings = db.query(models.CashbackSettingsDB).first()
    return {"percent": settings.percent, "excluded_types": settings.excluded_types} if settings else {"percent": 5.0,
                                                                                                      "excluded_types": "account"}

@router.get("/api/referral/settings")
def get_referral_settings(db: Session = Depends(get_db), current_admin: models.UserDB = Depends(get_current_admin)):
    settings = db.query(models.ReferralSettingsDB).first()
    if not settings:
        settings = models.ReferralSettingsDB(percent=5.0, is_active=True)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.put("/api/referral/settings")
def update_referral_settings(data: schemas.ReferralSettingsUpdate, db: Session = Depends(get_db),
                             current_admin: models.UserDB = Depends(get_current_admin)):
    settings = db.query(models.ReferralSettingsDB).first()
    if not settings:
        db.add(models.ReferralSettingsDB(percent=data.percent, is_active=data.is_active))
    else:
        settings.percent = data.percent
        settings.is_active = data.is_active
    db.commit()
    return {"status": "success"}

# ==========================================
# 📦 ІНШІ ТОВАРИ (OTHER ITEMS)
# ==========================================
@router.get("/api/other-items")
def get_other_items(db: Session = Depends(get_db)):
    return [{"id": i.id, "name": i.name, "desc": i.desc, "price": i.price, "base_price": i.base_price, "tag": i.tag,
             "color": i.color, "requiredFields": i.requiredFields.split(",") if i.requiredFields else []} for i in
            db.query(models.OtherItemDB).all()]

@router.post("/api/other-items")
def create_other_item(item: schemas.OtherItemCreate, db: Session = Depends(get_db),
                      current_admin: models.UserDB = Depends(get_current_admin)):
    new_item = models.OtherItemDB(name=item.name, desc=item.desc, price=item.price, base_price=item.base_price,
                                  tag=item.tag, color=item.color, requiredFields=",".join(item.requiredFields))
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    tg_post_product(db, "oth", new_item.id, new_item.name, new_item.desc, float(new_item.price))
    return {"status": "success", "id": new_item.id}

@router.put("/api/other-items/{item_id}")
def update_other_item(item_id: int, item: schemas.OtherItemCreate, db: Session = Depends(get_db),
                      current_admin: models.UserDB = Depends(get_current_admin)):
    db_item = db.query(models.OtherItemDB).filter(models.OtherItemDB.id == item_id).first()
    if db_item:
        db_item.name, db_item.desc, db_item.price, db_item.base_price, db_item.tag, db_item.color, db_item.requiredFields = item.name, item.desc, item.price, item.base_price, item.tag, item.color, ",".join(
            item.requiredFields)
        db.commit()
    return {"status": "success"}

@router.delete("/api/other-items/{item_id}")
def delete_other_item(item_id: int, db: Session = Depends(get_db),
                      current_admin: models.UserDB = Depends(get_current_admin)):
    tg_delete_product(db, "oth", item_id)
    db.query(models.OtherItemDB).filter(models.OtherItemDB.id == item_id).delete()
    db.commit()
    return {"status": "success"}

@router.post("/api/other-items/bulk")
def update_all_other_items(items: list[schemas.OtherItemCreate], db: Session = Depends(get_db),
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

# ==========================================
# 💎 РЕСУРСИ ТА ГЕМИ
# ==========================================
@router.get("/api/resources")
def get_resources(db: Session = Depends(get_db)):
    return db.query(models.ResourceDB).all()

@router.post("/api/resources/bulk")
def update_all_resources(resources: list[schemas.ResourceCreate], db: Session = Depends(get_db),
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

@router.get("/api/gems")
def get_gems(db: Session = Depends(get_db)):
    return db.query(models.GemDB).all()

@router.post("/api/gems/bulk")
def update_all_gems(gems: list[schemas.GemCreate], db: Session = Depends(get_db),
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

# ==========================================
# 🎮 АКАУНТИ
# ==========================================
@router.get("/api/accounts")
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


@router.post("/api/accounts")
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
            backend_domain = "http://localhost:8000"  # ЗАМІНИТИ НА СВІЙ ДОМЕН НА ПРОДАКШЕНІ
            image_urls.append(f"{backend_domain}/static/uploads/{filename}")
        except Exception:
            raise HTTPException(status_code=400, detail="Помилка обробки зображення")

    new_account = models.AccountDB(title=title, shortDesc=shortDesc, price=price, base_price=base_price, tags=tags,
                                   bind=bind, images=json.dumps(image_urls), status="active", stats=stats)
    db.add(new_account)
    db.commit()
    db.refresh(new_account)

    # 🔥 ФОРМУЄМО КРАСИВИЙ ТЕКСТ ДЛЯ ТЕЛЕГРАМУ (АНГЛІЙСЬКОЮ) 🔥
    parsed_stats = json.loads(stats)

    tg_desc = f"{shortDesc}\n\n"
    if bind: tg_desc += f"🔗 <b>Bind:</b> {bind}\n"
    if tags: tg_desc += f"🏷 <b>Tags:</b> {tags}\n\n"

    # Додаємо основні характеристики (English)
    stats_added = False
    stat_map = {
        "castle": "🏰 Castle",
        "blessed": "✨ Blessed",
        "champ_gear": "👑 Champ Gear",
        "heroes": "🦸‍♂️ Heroes",
        "familiars": "🐉 Familiars",
        "artifacts": "🏺 Artifacts",
        "attribute_lvl": "⭐ Attribute Lvl",
        "max_kd": "🌍 Max KD"
    }

    for key, name in stat_map.items():
        if parsed_stats.get(key):
            if not stats_added:
                tg_desc += "📊 <b>Stats:</b>\n"
                stats_added = True
            tg_desc += f" 🔸 {name}: <b>{parsed_stats[key]}</b>\n"

    # Додаємо бойові статі (ATK), якщо є лідерські
    if parsed_stats.get("mix_atk", {}).get("leader"):
        tg_desc += f" ⚔️ Mix ATK: <b>{parsed_stats['mix_atk']['leader']}</b>\n"
    if parsed_stats.get("mono_atk", {}).get("leader"):
        tg_desc += f" ⚔️ Mono ATK: <b>{parsed_stats['mono_atk']['leader']}</b>\n"

    # Додаємо кастомний інвентар (English)
    custom_inv = parsed_stats.get("custom_inventory", [])
    if custom_inv:
        tg_desc += "\n🎒 <b>Inventory:</b>\n"
        for item in custom_inv:
            tg_desc += f" 🔹 {item['label']}: <b>{item['value']}</b>\n"

    # Відправляємо товар та всі фото в Телеграм
    tg_post_product(db, "acc", new_account.id, title, tg_desc, float(price), image_urls)

    return {"status": "success"}


@router.put("/api/accounts/{account_id}")
async def edit_account(
        account_id: int,
        title: str = Form(...),
        shortDesc: str = Form(...),
        price: str = Form(...),
        base_price: str = Form("0"),
        tags: str = Form(...),
        bind: str = Form(...),
        stats: str = Form("{}"),
        images: Optional[List[UploadFile]] = File(None),
        db: Session = Depends(get_db),
        current_admin: models.UserDB = Depends(get_current_admin)
):
    db_account = db.query(models.AccountDB).filter(models.AccountDB.id == account_id).first()
    if not db_account:
        raise HTTPException(status_code=404, detail="Акаунт не знайдено")

    # 1. Оновлюємо текстові поля в БД
    db_account.title = title
    db_account.shortDesc = shortDesc
    db_account.price = price
    db_account.base_price = base_price
    db_account.tags = tags
    db_account.bind = bind
    db_account.stats = stats

    # Отримуємо поточні картинки (якщо адмін їх не міняв)
    image_urls = json.loads(db_account.images) if db_account.images else []

    # 2. Оновлюємо картинки ТІЛЬКИ якщо адмін завантажив нові
    if images and len(images) > 0 and getattr(images[0], "filename", "") != "":
        new_image_urls = []
        for img in images:
            try:
                image = Image.open(img.file)
                if image.mode in ("RGBA", "P"):
                    image = image.convert("RGB")
                filename = f"{uuid.uuid4().hex}.webp"
                filepath = os.path.join("static/uploads", filename)
                image.save(filepath, "WEBP", quality=80, method=4)
                backend_domain = "http://localhost:8000"  # ЗАМІНИ НА СВІЙ ДОМЕН
                new_image_urls.append(f"{backend_domain}/static/uploads/{filename}")
            except Exception:
                pass

        if new_image_urls:
            image_urls = new_image_urls
            db_account.images = json.dumps(image_urls)

    db.commit()
    db.refresh(db_account)

    # ==========================================
    # 🔥 ОНОВЛЕННЯ ПОСТА В ТЕЛЕГРАМІ 🔥
    # ==========================================

    # 3. Видаляємо старий пост та альбом з Телеграму
    tg_delete_product(db, "acc", account_id)

    # 4. Формуємо новий красивий текст (Англійською)
    parsed_stats = json.loads(stats)
    tg_desc = f"{shortDesc}\n\n"
    if bind: tg_desc += f"🔗 <b>Bind:</b> {bind}\n"
    if tags: tg_desc += f"🏷 <b>Tags:</b> {tags}\n\n"

    stats_added = False
    stat_map = {
        "castle": "🏰 Castle", "blessed": "✨ Blessed", "champ_gear": "👑 Champ Gear",
        "heroes": "🦸‍♂️ Heroes", "familiars": "🐉 Familiars", "artifacts": "🏺 Artifacts",
        "attribute_lvl": "⭐ Attribute Lvl", "max_kd": "🌍 Max KD"
    }

    for key, name in stat_map.items():
        if parsed_stats.get(key):
            if not stats_added:
                tg_desc += "📊 <b>Stats:</b>\n"
                stats_added = True
            tg_desc += f" 🔸 {name}: <b>{parsed_stats[key]}</b>\n"

    if parsed_stats.get("mix_atk", {}).get("leader"):
        tg_desc += f" ⚔️ Mix ATK: <b>{parsed_stats['mix_atk']['leader']}</b>\n"
    if parsed_stats.get("mono_atk", {}).get("leader"):
        tg_desc += f" ⚔️ Mono ATK: <b>{parsed_stats['mono_atk']['leader']}</b>\n"

    custom_inv = parsed_stats.get("custom_inventory", [])
    if custom_inv:
        tg_desc += "\n🎒 <b>Inventory:</b>\n"
        for item in custom_inv:
            tg_desc += f" 🔹 {item['label']}: <b>{item['value']}</b>\n"

    # 5. Публікуємо новий пост зі свіжою ціною та даними!
    tg_post_product(db, "acc", account_id, title, tg_desc, float(price), image_urls)

    return {"status": "success"}

@router.put("/api/accounts/{account_id}/status")
def update_account_status(account_id: int, status_data: schemas.AccountStatusUpdate, db: Session = Depends(get_db),
                          current_admin: models.UserDB = Depends(get_current_admin)):
    db_account = db.query(models.AccountDB).filter(models.AccountDB.id == account_id).first()
    if not db_account:
        return {"error": "Акаунт не знайдено"}
    db_account.status = status_data.status
    db.commit()

    if status_data.status != "active":
        tg_delete_product(db, "acc", account_id)

    return {"status": "success"}

@router.delete("/api/accounts/{account_id}")
def delete_account(account_id: int, db: Session = Depends(get_db),
                   current_admin: models.UserDB = Depends(get_current_admin)):
    tg_delete_product(db, "acc", account_id)
    db.query(models.AccountDB).filter(models.AccountDB.id == account_id).delete()
    db.commit()
    return {"status": "success"}

# ==========================================
# 🎟 ПРОМОКОДИ
# ==========================================
@router.get("/api/promocodes")
def get_promocodes(db: Session = Depends(get_db)):
    return db.query(models.PromoCodeDB).all()

@router.post("/api/promocodes")
def create_promocode(promo: schemas.PromoCodeCreate, db: Session = Depends(get_db),
                     current_admin: models.UserDB = Depends(get_current_admin)):
    if db.query(models.PromoCodeDB).filter(models.PromoCodeDB.code == promo.code.upper()).first():
        return {"error": "Такий код вже існує"}
    db.add(models.PromoCodeDB(code=promo.code.upper(), type=promo.type, value=promo.value, target=promo.target,
                              max_uses=promo.max_uses, min_order_amount=promo.min_order_amount,
                              expiry_date=promo.expiry_date, is_active=1, target_items=json.dumps(promo.target_items),
                              target_names=json.dumps(promo.target_names)))
    db.commit()
    return {"status": "success"}

@router.get("/api/promocodes/validate/{code}")
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

@router.delete("/api/promocodes/{id}")
def delete_promo(id: int, db: Session = Depends(get_db), current_admin: models.UserDB = Depends(get_current_admin)):
    db.query(models.PromoCodeDB).filter(models.PromoCodeDB.id == id).delete()
    db.commit()
    return {"status": "success"}

@router.put("/api/promocodes/{id}/toggle")
def toggle_promo(id: int, db: Session = Depends(get_db), current_admin: models.UserDB = Depends(get_current_admin)):
    promo = db.query(models.PromoCodeDB).filter(models.PromoCodeDB.id == id).first()
    if promo:
        promo.is_active = 0 if promo.is_active == 1 else 1
        db.commit()
    return {"status": "success", "new_status": promo.is_active}