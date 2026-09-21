from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn
import requests
import os
from dotenv import load_dotenv

from database import engine
import models
import schemas
from utils import get_store_config, save_store_config, get_current_admin

# 🔥 ПІДКЛЮЧАЄМО НАШІ ЧИСТІ РОУТЕРИ 🔥
from routers import users, admin, products, orders, telegram

# Завантажуємо .env
load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
FRONTEND_URL = os.getenv("VITE_FRONTEND_URL", "http://localhost:5173")

# Створюємо таблиці в БД (якщо їх ще немає)
models.Base.metadata.create_all(bind=engine)

# ==========================================
# 🤖 СТВОРЕННЯ МЕНЮ ДЛЯ TELEGRAM-БОТА
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
            print("❌ Помилка з'єднання з Telegram API:", e)
    yield

# Ініціалізація додатку
app = FastAPI(lifespan=lifespan)

# Статичні файли (для картинок)
os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Захисні заголовки
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return response

# CORS для зв'язку з фронтендом
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173", "https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 🔌 ПІДКЛЮЧЕННЯ РОУТЕРІВ
# ==========================================
app.include_router(users.router)
app.include_router(admin.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(telegram.router)

# ==========================================
# 🛑 МАРШРУТИ МАГАЗИНУ (ОФЛАЙН РЕЖИМ)
# ==========================================
@app.get("/api/store/status")
def get_store_status():
    return get_store_config()

@app.put("/api/store/status")
def update_store_status(config: schemas.StoreConfigUpdate, current_admin: models.UserDB = Depends(get_current_admin)):
    save_store_config(config.dict())
    return {"status": "success", "message": "Статус магазину оновлено!"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)