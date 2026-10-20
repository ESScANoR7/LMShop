from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import json
import uuid
import os
from datetime import datetime
from PIL import Image

from database import get_db
import models
import schemas
from utils import get_current_admin

from routers.telegram import tg_post_product, tg_delete_product, tg_delete_all_in_group, format_account_telegram_desc

router = APIRouter(tags=["Products"])

import time

MAX_IMAGE_SIZE = 50 * 1024 * 1024  # 50 MB (дозволяє завантажувати багато якісних фото)

# ==========================================
# ⚡ РОЗУМНЕ КЕШУВАННЯ ПУБЛІЧНИХ ЕНДПОІНТІВ (5.4)
# ==========================================
_product_cache = {}
CACHE_TTL = 60  # кеш на 60 секунд

def get_from_cache(key: str):
    item = _product_cache.get(key)
    if item and (time.time() - item["time"]) < CACHE_TTL:
        return item["data"]
    return None

def set_in_cache(key: str, data):
    _product_cache[key] = {"data": data, "time": time.time()}

def invalidate_cache(key_prefix: str = None):
    if key_prefix:
        for k in list(_product_cache.keys()):
            if k.startswith(key_prefix):
                _product_cache.pop(k, None)
    else:
        _product_cache.clear()

DEFAULT_CASHBACK_TIERS = [
    {"id": "base", "name": "Base", "threshold": 0.0, "rss": 10.0, "gems": 1.0, "other": 5.0, "account": 0.0},
    {"id": "paladin", "name": "Paladin", "threshold": 100.0, "rss": 12.0, "gems": 1.5, "other": 6.0, "account": 0.0},
    {"id": "overlord", "name": "Overlord", "threshold": 300.0, "rss": 15.0, "gems": 2.0, "other": 7.0, "account": 0.0},
    {"id": "baron", "name": "Baron", "threshold": 700.0, "rss": 18.0, "gems": 2.5, "other": 8.0, "account": 0.0},
    {"id": "emperor", "name": "Emperor", "threshold": 1500.0, "rss": 20.0, "gems": 3.0, "other": 10.0, "account": 0.0},
]

# ==========================================
# 💰 НАЛАШТУВАННЯ КЕШБЕКУ ТА РЕФЕРАЛОК
# ==========================================
@router.get("/api/cashback/settings")
def get_cashback_settings(db: Session = Depends(get_db)):
    settings = db.query(models.CashbackSettingsDB).first()
    if not settings:
        settings = models.CashbackSettingsDB(
            percent=5.0,
            excluded_types="account",
            tiers=json.dumps(DEFAULT_CASHBACK_TIERS)
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)

    cat_p = {}
    if settings.category_percents:
        try:
            cat_p = json.loads(settings.category_percents)
        except Exception:
            cat_p = {}

    tiers_data = DEFAULT_CASHBACK_TIERS
    if settings.tiers:
        try:
            parsed = json.loads(settings.tiers)
            if isinstance(parsed, list) and len(parsed) > 0:
                tiers_data = parsed
        except Exception:
            tiers_data = DEFAULT_CASHBACK_TIERS

    return {
        "id": settings.id,
        "percent": settings.percent,
        "excluded_types": settings.excluded_types or "",
        "category_percents": cat_p,
        "tiers": tiers_data
    }

@router.put("/api/cashback/settings")
def update_cashback_settings(data: schemas.CashbackSettingsUpdate, db: Session = Depends(get_db),
                             current_admin: models.UserDB = Depends(get_current_admin)):
    settings = db.query(models.CashbackSettingsDB).first()
    cat_str = json.dumps(data.category_percents) if isinstance(data.category_percents, dict) else data.category_percents
    tiers_str = json.dumps(data.tiers) if isinstance(data.tiers, (list, dict)) else data.tiers

    if not settings:
        settings = models.CashbackSettingsDB(
            percent=data.percent,
            excluded_types=data.excluded_types or "",
            category_percents=cat_str,
            tiers=tiers_str or json.dumps(DEFAULT_CASHBACK_TIERS)
        )
        db.add(settings)
    else:
        settings.percent = data.percent
        settings.excluded_types = data.excluded_types or ""
        settings.category_percents = cat_str
        if tiers_str is not None:
            settings.tiers = tiers_str
    db.commit()
    return {"status": "success"}

@router.get("/api/cashback/settings/public")
def get_public_cashback_settings(db: Session = Depends(get_db)):
    settings = db.query(models.CashbackSettingsDB).first()
    if not settings:
        return {
            "percent": 5.0,
            "excluded_types": "account",
            "category_percents": {},
            "tiers": DEFAULT_CASHBACK_TIERS
        }
    cat_p = {}
    if settings.category_percents:
        try:
            cat_p = json.loads(settings.category_percents)
        except Exception:
            cat_p = {}

    tiers_data = DEFAULT_CASHBACK_TIERS
    if settings.tiers:
        try:
            parsed = json.loads(settings.tiers)
            if isinstance(parsed, list) and len(parsed) > 0:
                tiers_data = parsed
        except Exception:
            tiers_data = DEFAULT_CASHBACK_TIERS

    return {
        "percent": settings.percent,
        "excluded_types": settings.excluded_types or "",
        "category_percents": cat_p,
        "tiers": tiers_data
    }

@router.get("/api/referral/settings")
def get_referral_settings(db: Session = Depends(get_db), current_admin: models.UserDB = Depends(get_current_admin)):
    settings = db.query(models.ReferralSettingsDB).first()
    if not settings:
        settings = models.ReferralSettingsDB(percent=5.0, is_active=True)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    cat_p = {}
    if settings.category_percents:
        try:
            cat_p = json.loads(settings.category_percents)
        except Exception:
            cat_p = {}

    return {
        "id": settings.id,
        "percent": settings.percent,
        "is_active": settings.is_active,
        "category_percents": cat_p
    }

@router.put("/api/referral/settings")
def update_referral_settings(data: schemas.ReferralSettingsUpdate, db: Session = Depends(get_db),
                             current_admin: models.UserDB = Depends(get_current_admin)):
    settings = db.query(models.ReferralSettingsDB).first()
    cat_str = json.dumps(data.category_percents) if isinstance(data.category_percents, dict) else data.category_percents
    if not settings:
        settings = models.ReferralSettingsDB(
            percent=data.percent,
            is_active=data.is_active,
            category_percents=cat_str
        )
        db.add(settings)
    else:
        settings.percent = data.percent
        settings.is_active = data.is_active
        settings.category_percents = cat_str
    db.commit()
    return {"status": "success"}

# ==========================================
# 📦 ІНШІ ТОВАРИ (OTHER ITEMS)
# ==========================================
@router.get("/api/other-items")
def get_other_items(all: bool = False, db: Session = Depends(get_db)):
    cache_key = "other_items_all" if all else "other_items_public"
    cached = get_from_cache(cache_key)
    if cached is not None:
        return cached
    query = db.query(models.OtherItemDB)
    if not all:
        # Лише публічні товари (не приховані для TG)
        query = query.filter((models.OtherItemDB.is_tg_only == False) | (models.OtherItemDB.is_tg_only == None))
    items = query.all()
    data = [{"id": i.id, "name": i.name, "desc": i.desc, "price": i.price, "base_price": i.base_price, "tag": i.tag,
             "color": i.color, "requiredFields": i.requiredFields.split(",") if i.requiredFields else [],
             "is_tg_only": bool(i.is_tg_only)} for i in items]
    set_in_cache(cache_key, data)
    return data

@router.post("/api/other-items")
def create_other_item(item: schemas.OtherItemCreate, db: Session = Depends(get_db),
                      current_admin: models.UserDB = Depends(get_current_admin)):
    new_item = models.OtherItemDB(
        name=item.name, desc=item.desc, price=item.price, base_price=item.base_price,
        tag=item.tag, color=item.color, requiredFields=",".join(item.requiredFields),
        is_tg_only=bool(item.is_tg_only)
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    invalidate_cache("other_items")
    tg_post_product(db, "oth", new_item.id, new_item.name, new_item.desc, float(new_item.price))
    return {"status": "success", "id": new_item.id}

@router.put("/api/other-items/{item_id}")
def update_other_item(item_id: int, item: schemas.OtherItemCreate, db: Session = Depends(get_db),
                      current_admin: models.UserDB = Depends(get_current_admin)):
    db_item = db.query(models.OtherItemDB).filter(models.OtherItemDB.id == item_id).first()
    if db_item:
        db_item.name = item.name
        db_item.desc = item.desc
        db_item.price = item.price
        db_item.base_price = item.base_price
        db_item.tag = item.tag
        db_item.color = item.color
        db_item.requiredFields = ",".join(item.requiredFields)
        db_item.is_tg_only = bool(item.is_tg_only)
        db.commit()
        invalidate_cache("other_items")
    return {"status": "success"}

@router.post("/api/other-items/{item_id}/publish-tg")
def publish_other_item_tg(item_id: int, db: Session = Depends(get_db),
                          current_admin: models.UserDB = Depends(get_current_admin)):
    db_item = db.query(models.OtherItemDB).filter(models.OtherItemDB.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Товар не знайдено")
    desc_text = db_item.desc or ""
    posted = tg_post_product(db, "oth", db_item.id, db_item.name, desc_text, float(db_item.price))
    return {"status": "success", "posted": bool(posted)}

@router.delete("/api/other-items/{item_id}")
def delete_other_item(item_id: int, db: Session = Depends(get_db),
                      current_admin: models.UserDB = Depends(get_current_admin)):
    tg_delete_product(db, "oth", item_id)
    db.query(models.OtherItemDB).filter(models.OtherItemDB.id == item_id).delete()
    db.commit()
    invalidate_cache("other_items")
    return {"status": "success"}

@router.post("/api/other-items/bulk")
def update_all_other_items(items: list[schemas.OtherItemCreate], db: Session = Depends(get_db),
                           current_admin: models.UserDB = Depends(get_current_admin)):
    tg_delete_all_in_group(db, "oth")
    db.query(models.OtherItemDB).delete()
    db.commit()
    for item in items:
        new_item = models.OtherItemDB(
            name=item.name, desc=item.desc, price=item.price, base_price=item.base_price,
            tag=item.tag, color=item.color, requiredFields=",".join(item.requiredFields),
            is_tg_only=bool(item.is_tg_only)
        )
        db.add(new_item)
        db.commit()
        db.refresh(new_item)
        tg_post_product(db, "oth", new_item.id, new_item.name, new_item.desc, float(new_item.price))
    invalidate_cache("other_items")
    return {"status": "success"}

# ==========================================
# 💎 РЕСУРСИ ТА ГЕМИ
# ==========================================
@router.get("/api/resources")
def get_resources(db: Session = Depends(get_db)):
    cached = get_from_cache("resources")
    if cached is not None:
        return cached
    data = [{"id": r.id, "name": r.name, "desc": r.desc, "price": r.price, "base_price": r.base_price} for r in db.query(models.ResourceDB).all()]
    set_in_cache("resources", data)
    return data

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
    invalidate_cache("resources")
    return {"status": "success"}

@router.get("/api/gems")
def get_gems(db: Session = Depends(get_db)):
    cached = get_from_cache("gems")
    if cached is not None:
        return cached
    data = [{"id": g.id, "range": g.range, "rate": g.rate, "base_price": g.base_price} for g in db.query(models.GemDB).all()]
    set_in_cache("gems", data)
    return data

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
    invalidate_cache("gems")
    return {"status": "success"}

# ==========================================
# 🎮 АКАУНТИ
# ==========================================
@router.get("/api/accounts")
def get_accounts(db: Session = Depends(get_db)):
    cached = get_from_cache("accounts")
    if cached is not None:
        return cached
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
    set_in_cache("accounts", result)
    return result


@router.get("/api/accounts/{account_id}")
def get_account(account_id: int, db: Session = Depends(get_db)):
    acc = db.query(models.AccountDB).filter(models.AccountDB.id == account_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Акаунт не знайдено")
    try:
        images_list = json.loads(acc.images) if acc.images else []
    except Exception:
        images_list = []
    try:
        stats_dict = json.loads(acc.stats) if acc.stats else {}
    except Exception:
        stats_dict = {}
    return {
        "id": acc.id, "title": acc.title, "shortDesc": acc.shortDesc, "price": acc.price,
        "base_price": acc.base_price, "tags": acc.tags.split(",") if acc.tags else [],
        "status": acc.status, "bind": acc.bind, "images": images_list, "stats": stats_dict
    }


@router.post("/api/accounts")
async def create_account(title: str = Form(...), shortDesc: str = Form(...), price: str = Form(...),
                         base_price: str = Form("0"), tags: str = Form(...), bind: str = Form(...),
                         stats: str = Form("{}"), images: List[UploadFile] = File(...), db: Session = Depends(get_db),
                         current_admin: models.UserDB = Depends(get_current_admin)):
    image_urls = []
    for img in images:
        try:
            img.file.seek(0, 2)
            file_size = img.file.tell()
            img.file.seek(0)
            if file_size > MAX_IMAGE_SIZE:
                raise HTTPException(status_code=400, detail="Розмір зображення перевищує ліміт 50 МБ")

            image = Image.open(img.file)
            if image.mode in ("RGBA", "P"):
                image = image.convert("RGB")
            filename = f"{uuid.uuid4().hex}.webp"
            filepath = os.path.join("static/uploads", filename)
            image.save(filepath, "WEBP", quality=80, method=4)
            image_urls.append(f"/static/uploads/{filename}")
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=400, detail="Помилка обробки зображення")

    new_account = models.AccountDB(title=title, shortDesc=shortDesc, price=price, base_price=base_price, tags=tags,
                                   bind=bind, images=json.dumps(image_urls), status="active", stats=stats)
    db.add(new_account)
    db.commit()
    db.refresh(new_account)
    invalidate_cache("accounts")

    # 🔥 ФОРМУЄМО КРАСИВИЙ ТЕКСТ ДЛЯ ТЕЛЕГРАМУ (АНГЛІЙСЬКОЮ) 🔥
    tg_desc = format_account_telegram_desc(shortDesc, bind, tags, stats)

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
                img.file.seek(0, 2)
                file_size = img.file.tell()
                img.file.seek(0)
                if file_size > MAX_IMAGE_SIZE:
                    raise HTTPException(status_code=400, detail="Розмір зображення перевищує ліміт 50 МБ")

                image = Image.open(img.file)
                if image.mode in ("RGBA", "P"):
                    image = image.convert("RGB")
                filename = f"{uuid.uuid4().hex}.webp"
                filepath = os.path.join("static/uploads", filename)
                image.save(filepath, "WEBP", quality=80, method=4)
                new_image_urls.append(f"/static/uploads/{filename}")
            except HTTPException:
                raise
            except Exception:
                pass

        if new_image_urls:
            image_urls = new_image_urls
            db_account.images = json.dumps(image_urls)

    db.commit()
    db.refresh(db_account)
    invalidate_cache("accounts")

    # ==========================================
    # 🔥 ОНОВЛЕННЯ ПОСТА В ТЕЛЕГРАМІ 🔥
    # ==========================================

    # 3. Видаляємо старий пост та альбом з Телеграму
    tg_delete_product(db, "acc", account_id)

    # 4. Формуємо новий красивий текст (Англійською)
    tg_desc = format_account_telegram_desc(shortDesc, bind, tags, stats)

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
    invalidate_cache("accounts")

    if status_data.status != "active":
        tg_delete_product(db, "acc", account_id)

    return {"status": "success"}

@router.delete("/api/accounts/{account_id}")
def delete_account(account_id: int, db: Session = Depends(get_db),
                   current_admin: models.UserDB = Depends(get_current_admin)):
    tg_delete_product(db, "acc", account_id)
    db.query(models.AccountDB).filter(models.AccountDB.id == account_id).delete()
    db.commit()
    invalidate_cache("accounts")
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
def validate_promo_code(code: str, total: float = 0.0, db: Session = Depends(get_db)):
    """
    Validates a promo code without applying it.
    Returns: { valid: bool, message: str, type: str, value: float/str, target: str, target_items: list, target_names: list, min_order_amount: float }
    """
    code_clean = code.strip().upper()
    promo = db.query(models.PromoCodeDB).filter(models.PromoCodeDB.code == code_clean).first()

    if not promo:
        return {"valid": False, "message": "Промокод не знайдено"}

    if not promo.is_active:
        return {"valid": False, "message": "Промокод деактивовано"}

    if promo.max_uses > 0 and promo.current_uses >= promo.max_uses:
        return {"valid": False, "message": "Ліміт використань вичерпано"}

    if promo.expiry_date:
        try:
            if datetime.now() > datetime.fromisoformat(promo.expiry_date):
                return {"valid": False, "message": "Термін дії промокоду закінчився"}
        except Exception:
            pass

    if promo.min_order_amount > 0 and total < promo.min_order_amount:
        return {"valid": False, "message": f"Мінімальна сума замовлення для цього промокоду: ${promo.min_order_amount:.2f}"}

    # Parse target items and get names
    target_items = []
    target_names = []
    if promo.target_items:
        try:
            target_items = json.loads(promo.target_items)
        except Exception:
            target_items = []

    # Try to resolve names for targeted items
    for item_id_str in target_items:
        try:
            if item_id_str.startswith("acc_"):
                acc = db.query(models.AccountDB).filter(models.AccountDB.id == int(item_id_str[4:])).first()
                if acc:
                    target_names.append(acc.title or acc.name or str(acc.id))
            elif item_id_str.startswith("rss_"):
                rss = db.query(models.ResourceDB).filter(models.ResourceDB.id == int(item_id_str[4:])).first()
                if rss:
                    target_names.append(rss.name or str(rss.id))
            elif item_id_str.startswith("gem_"):
                gem = db.query(models.GemDB).filter(models.GemDB.id == int(item_id_str[4:])).first()
                if gem:
                    target_names.append(gem.name or str(gem.id))
            elif item_id_str.startswith("oth_"):
                oth = db.query(models.OtherItemDB).filter(models.OtherItemDB.id == int(item_id_str[4:])).first()
                if oth:
                    target_names.append(oth.name or str(oth.id))
        except Exception:
            pass

    return {
        "valid": True,
        "message": "Промокод дійсний!",
        "type": promo.type,
        "value": promo.value,
        "target": promo.target,
        "target_items": target_items,
        "target_names": target_names,
        "min_order_amount": promo.min_order_amount,
        "code": promo.code
    }

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