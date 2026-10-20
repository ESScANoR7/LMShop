from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn
import requests
import os
import sys
from urllib.parse import urlparse
from dotenv import load_dotenv

# Фікс для Windows-консолі: примусово UTF-8
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

from database import engine
import models
import schemas
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from utils import get_store_config, save_store_config, get_current_admin, limiter

# 🔥 ПІДКЛЮЧАЄМО НАШІ ЧИСТІ РОУТЕРИ 🔥
from routers import users, admin, products, orders, telegram

# Завантажуємо .env
load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
FRONTEND_URL = os.getenv("VITE_FRONTEND_URL", "http://localhost:5173")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
AUTO_CREATE_TABLES = os.getenv(
    "AUTO_CREATE_TABLES",
    "true" if ENVIRONMENT != "production" else "false"
).lower() == "true"


def validate_production_config():
    if ENVIRONMENT != "production":
        return

    required = {
        "DATABASE_URL": os.getenv("DATABASE_URL", ""),
        "JWT_SECRET_KEY": os.getenv("JWT_SECRET_KEY", ""),
        "VITE_FRONTEND_URL": FRONTEND_URL,
        "PRODUCTION_URL": os.getenv("PRODUCTION_URL", ""),
    }
    placeholders = ("YOUR_", "GENERATE_", "yourdomain.com", "DB_USER", "DB_PASSWORD", "DB_HOST")
    missing = [
        name for name, value in required.items()
        if not value or any(placeholder in value for placeholder in placeholders)
    ]
    if missing:
        raise RuntimeError(f"Production configuration is incomplete: {', '.join(missing)}")
    if len(required["JWT_SECRET_KEY"]) < 32:
        raise RuntimeError("JWT_SECRET_KEY must contain at least 32 characters in production")
    for name in ("VITE_FRONTEND_URL", "PRODUCTION_URL"):
        parsed = urlparse(required[name])
        if parsed.scheme != "https" or not parsed.netloc:
            raise RuntimeError(f"{name} must be a valid HTTPS URL in production")
    if required["DATABASE_URL"].startswith("sqlite"):
        raise RuntimeError("SQLite is not allowed as the production database")


validate_production_config()

# Локально створюємо таблиці автоматично. У production схему змінюють міграціями,
# щоб запуск нового процесу не виконував DDL непередбачувано.
if AUTO_CREATE_TABLES:
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
                print("[OK] Telegram menu commands set successfully!")
            else:
                print("[WARN] Telegram menu error:", res.text)
        except Exception as e:
            print("[WARN] Telegram API connection error:", e)

        # Автоматична реєстрація Webhook у продакшені
        prod_target = os.getenv("PRODUCTION_URL") or FRONTEND_URL
        if prod_target and prod_target.startswith("https://"):
            webhook_target = f"{prod_target.rstrip('/')}/api/telegram/webhook"
            try:
                wb_res = requests.post(
                    f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/setWebhook",
                    json={
                        "url": webhook_target,
                        "allowed_updates": ["message", "edited_message", "channel_post", "edited_channel_post", "callback_query"]
                    },
                    timeout=10
                )
                if wb_res.status_code == 200 and wb_res.json().get("ok"):
                    print(f"[OK] Telegram webhook registered: {webhook_target}")
                else:
                    print(f"[WARN] Telegram webhook registration response: {wb_res.text}")
            except Exception as e:
                print(f"[WARN] Failed to register Telegram webhook: {e}")
    yield

# Ініціалізація додатку
app = FastAPI(lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Глобальний обробник 500 помилок
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"❌ Unhandled exception: {type(exc).__name__}: {exc}")
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=500,
        content={"detail": "Внутрішня помилка сервера. Спробуйте пізніше."}
    )

# Статичні файли (для картинок)
os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

from fastapi.responses import FileResponse
from fastapi import HTTPException

# Захисні заголовки
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    # Дозволяємо відображення у Telegram WebApp (не блокуємо фрейми через DENY)
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    # ✅ БЕЗПЕКА: Content-Security-Policy (захист від XSS через зовнішні скрипти)
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://telegram.org; "
        "img-src * data: blob:; "
        "connect-src *; "
        "style-src 'self' 'unsafe-inline'; "
        "font-src 'self' data:;"
    )
    return response

# CORS для зв'язку з фронтендом та Telegram WebApp
NGROK_URL = os.getenv("NGROK_URL", "")
PRODUCTION_URL = os.getenv("PRODUCTION_URL", "")  # ✅ Для продакшену: https://yourdomain.com

allowed_origins = [] if ENVIRONMENT == "production" else [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

# Dev: додаємо FRONTEND_URL з .env
if FRONTEND_URL and FRONTEND_URL not in allowed_origins:
    allowed_origins.append(FRONTEND_URL)

# Dev: додаємо ngrok якщо є
if ENVIRONMENT != "production" and NGROK_URL and NGROK_URL not in allowed_origins:
    allowed_origins.append(NGROK_URL)

# Prod: додаємо продакшн домен якщо є
if PRODUCTION_URL and PRODUCTION_URL not in allowed_origins:
    allowed_origins.append(PRODUCTION_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # ✅ БЕЗПЕКА: завжди використовуємо білий список
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


# ==========================================
# 🌐 РОЗДАЧА FRONTEND (REACT SPA) ДЛЯ TELEGRAM WEBAPP ТА САЙТУ
# ==========================================
DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "lords-shop", "dist"))

if os.path.exists(DIST_DIR):
    assets_dir = os.path.join(DIST_DIR, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    async def serve_spa_root():
        return FileResponse(
            os.path.join(DIST_DIR, "index.html"),
            headers={"Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache", "Expires": "0"}
        )

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Запити до API або статики бекенду не перехоплюємо
        if full_path.startswith("api") or full_path.startswith("static"):
            raise HTTPException(status_code=404, detail="Not Found")

        file_path = os.path.join(DIST_DIR, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(
            os.path.join(DIST_DIR, "index.html"),
            headers={"Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache", "Expires": "0"}
        )


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)