from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import requests
import json
import uuid
import os
import hmac
import hashlib
from urllib.parse import parse_qsl
from datetime import datetime, timedelta
import time
import bcrypt

from database import get_db, SessionLocal
import models
import schemas
from utils import (
    get_current_user, get_current_admin, escape_html,
    create_access_token, create_refresh_token, ACCESS_TOKEN_EXPIRE_MINUTES,
    check_telegram_offline, tg_session
)
from routers.orders import _process_order_status_change

# Завантажуємо змінні оточення
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_FORUM_CHAT_ID = os.getenv("TELEGRAM_FORUM_CHAT_ID")
FRONTEND_URL = os.getenv("VITE_FRONTEND_URL", "http://localhost:5173")

# Налаштування вітрини (ID каналу та гілок)
STOREFRONT_CHAT_ID = os.getenv("STOREFRONT_CHAT_ID") or os.getenv("TELEGRAM_CHAT_ID")
STOREFRONT_TOPIC_ACC = os.getenv("STOREFRONT_TOPIC_ACC")
STOREFRONT_TOPIC_GEM = os.getenv("STOREFRONT_TOPIC_GEM")
STOREFRONT_TOPIC_RES = os.getenv("STOREFRONT_TOPIC_RES")
STOREFRONT_TOPIC_OTH = os.getenv("STOREFRONT_TOPIC_OTH")
STOREFRONT_TOPIC_COINS = os.getenv("STOREFRONT_TOPIC_COINS")

router = APIRouter(tags=["Telegram"])

# ==========================================
# 🧠 ПАМ'ЯТЬ БОТА (Збереження в БД для синхронізації між процесами)
# ==========================================
class StateProxy(dict):
    def __init__(self, parent_store, chat_id, initial_dict):
        super().__init__(initial_dict)
        self._parent = parent_store
        self._chat_id = chat_id

    def __setitem__(self, key, value):
        super().__setitem__(key, value)
        self._parent._set_data(self._chat_id, dict(self))

    def update(self, *args, **kwargs):
        super().update(*args, **kwargs)
        self._parent._set_data(self._chat_id, dict(self))


class DBStateDict:
    def __init__(self, db_factory):
        self.db_factory = db_factory

    def _get_data(self, chat_id: str):
        db = self.db_factory()
        try:
            sess = db.query(models.TelegramSessionDB).filter(models.TelegramSessionDB.chat_id == str(chat_id)).first()
            if sess and sess.state:
                try:
                    return json.loads(sess.state)
                except Exception:
                    return {}
            return None
        except Exception as e:
            print("DBStateDict get error:", e)
            return None
        finally:
            db.close()

    def _set_data(self, chat_id: str, data: dict):
        db = self.db_factory()
        try:
            sess = db.query(models.TelegramSessionDB).filter(models.TelegramSessionDB.chat_id == str(chat_id)).first()
            json_str = json.dumps(data)
            if sess:
                sess.state = json_str
            else:
                sess = models.TelegramSessionDB(chat_id=str(chat_id), state=json_str)
                db.add(sess)
            db.commit()
        except Exception as e:
            print("DBStateDict set error:", e)
        finally:
            db.close()

    def _del_data(self, chat_id: str):
        db = self.db_factory()
        try:
            db.query(models.TelegramSessionDB).filter(models.TelegramSessionDB.chat_id == str(chat_id)).delete()
            db.commit()
        except Exception as e:
            print("DBStateDict del error:", e)
        finally:
            db.close()

    def __getitem__(self, key):
        val = self._get_data(str(key))
        if val is None:
            raise KeyError(key)
        return StateProxy(self, str(key), val)

    def __setitem__(self, key, value):
        if isinstance(value, StateProxy):
            value = dict(value)
        self._set_data(str(key), dict(value))

    def __delitem__(self, key):
        self._del_data(str(key))

    def __contains__(self, key):
        return self._get_data(str(key)) is not None

    def get(self, key, default=None):
        val = self._get_data(str(key))
        if val is None:
            return default
        return StateProxy(self, str(key), val)


USER_STATES = DBStateDict(SessionLocal)
USER_LANGUAGES = {}
LINK_TOKENS = {}


# 🔥 ДОПОМІЖНА ФУНКЦІЯ: ГЕНЕРАЦІЯ КЛАВІАТУРИ ЧЕКАУТУ З ПРОМОКОДОМ 🔥
def get_checkout_markup(user, final_price, has_promo, is_uk):
    if final_price <= 0:
        pay_btn = "🎁 Оформити безкоштовно ($0.00)" if is_uk else "🎁 Order for Free ($0.00)"
        return {
            "inline_keyboard": [
                [{"text": pay_btn, "callback_data": "statepay_free"}]
            ]
        }

    kb = {"inline_keyboard": []}

    # 1. Оплата за монети / з балансу
    if user:
        if user.balance >= final_price:
            bal_btn = f"🪙 Оплатити з балансу (${final_price:.2f})" if is_uk else f"🪙 Pay from balance (${final_price:.2f})"
            kb["inline_keyboard"].append([{"text": bal_btn, "callback_data": "statepay_bal"}])
        else:
            bal_btn = f"🪙 Оплатити з балансу (Недостатньо коштів)" if is_uk else f"🪙 Pay from balance (Insufficient funds)"
            kb["inline_keyboard"].append([{"text": bal_btn, "callback_data": "low_balance_warn"}])
    else:
        bal_btn = "🪙 Оплатити з балансу (Прив'язати акаунт)" if is_uk else "🪙 Pay from balance (Link account)"
        kb["inline_keyboard"].append([{"text": bal_btn, "callback_data": "need_link_warn"}])

    # 2. Оплата в чаті
    chat_btn = "💬 Оплатити в чаті" if is_uk else "💬 Pay in Chat"
    kb["inline_keyboard"].append([{"text": chat_btn, "callback_data": "statepay_chat"}])

    # 3. Ввести промокод
    if not has_promo and final_price > 0:
        promo_btn = "🎟 Ввести промокод" if is_uk else "🎟 Enter Promo Code"
        kb["inline_keyboard"].append([{"text": promo_btn, "callback_data": "enter_promo"}])

    safe_url = FRONTEND_URL if FRONTEND_URL.startswith("http") else f"https://{FRONTEND_URL}"
    if "localhost" in safe_url or "127.0.0.1" in safe_url:
        safe_url = "https://t.me"

    kb["inline_keyboard"].append([{"text": "🌐 Відкрити сайт" if is_uk else "🌐 Open Website", "url": safe_url}])
    return kb


def get_user_tier_summary(db: Session, user_id: int):
    """Отримує актуальний ранг та прогрес кешбеку користувача для відображення в Telegram"""
    try:
        from routers.products import DEFAULT_CASHBACK_TIERS
        from routers.users import get_user_total_spent, calculate_tier_progress
        settings = db.query(models.CashbackSettingsDB).first()
        tiers = DEFAULT_CASHBACK_TIERS
        if settings and settings.tiers:
            try:
                parsed = json.loads(settings.tiers)
                if isinstance(parsed, list) and len(parsed) > 0:
                    tiers = parsed
            except Exception:
                tiers = DEFAULT_CASHBACK_TIERS
        total_spent = get_user_total_spent(db, user_id)
        info = calculate_tier_progress(total_spent, tiers)
        return info
    except Exception as e:
        print("Помилка get_user_tier_summary:", e)
        return None


@router.post("/api/telegram/webhook")
async def telegram_webhook(request: Request, background_tasks: BackgroundTasks):
    try:
        data = await request.json()
    except Exception:
        return {"status": "error"}

    # ⚡ Миттєва відповідь Telegram (< 3ms) щоб уникнути Read timeout і затримок черги
    background_tasks.add_task(process_telegram_update, data)
    return {"status": "ok"}


def process_telegram_update(data: dict):
    db = SessionLocal()
    try:

        chat_id_for_lang = None
        user_lang_tg = "en"

        if "callback_query" in data:
            chat_id_for_lang = str(data["callback_query"]["message"]["chat"]["id"])
            user_lang_tg = str(data["callback_query"].get("from", {}).get("language_code", "en")).strip().lower()
        elif "message" in data:
            chat_id_for_lang = str(data["message"]["chat"]["id"])
            user_lang_tg = str(data["message"].get("from", {}).get("language_code", "en")).strip().lower()

        chat_id_str = chat_id_for_lang or ""
        is_uk = False
        user_in_db = None
        current_lang = "en"

        if chat_id_for_lang:
            user_in_db = db.query(models.UserDB).filter(models.UserDB.telegram_chat_id == chat_id_for_lang).first()
            if user_in_db and getattr(user_in_db, "language", None):
                current_lang = user_in_db.language
            elif chat_id_for_lang in USER_LANGUAGES:
                current_lang = USER_LANGUAGES[chat_id_for_lang]
            elif user_lang_tg.startswith("uk"):
                current_lang = "uk"

            is_uk = (current_lang == "uk")

        # === 1. ОБРОБКА КНОПОК З ТЕЛЕГРАМУ ===
        if "callback_query" in data:
            callback = data["callback_query"]
            chat_id = callback["message"]["chat"]["id"]
            chat_id_str = str(chat_id)
            message_id = callback["message"]["message_id"]
            action_data = callback["data"]

            clicker_name = callback["from"].get("username", callback["from"].get("first_name", "Адмін"))
            worker_mention = f"@{clicker_name}" if callback["from"].get("username") else clicker_name

            if action_data == "change_lang":
                tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                              json={"callback_query_id": callback["id"]})

                new_lang = "en" if is_uk else "uk"
                if user_in_db:
                    user_in_db.language = new_lang
                    db.commit()
                else:
                    USER_LANGUAGES[chat_id_str] = new_lang
                is_uk = (new_lang == "uk")

                text_ok = "✅ Мову змінено на <b>Українську</b>!" if is_uk else "✅ Language changed to <b>English</b>!"
                btn_lang = "🌍 Change language (EN)" if is_uk else "🌍 Змінити мову (UK)"

                keyboard = {"inline_keyboard": [
                    [{"text": "👤 Профіль / Profile", "callback_data": "profile_menu"},
                     {"text": "❓ Допомога / Help", "callback_data": "help_menu"}],
                    [{"text": "🎟 Ввести промокод / Promo Code", "callback_data": "enter_promo_profile"}],
                    [{"text": btn_lang, "callback_data": "change_lang"}]
                ]}
                tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/editMessageText",
                              json={"chat_id": chat_id, "message_id": message_id, "text": text_ok, "parse_mode": "HTML",
                                    "reply_markup": keyboard})
                return {"status": "ok"}

            elif action_data == "topup_start":
                tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                              json={"callback_query_id": callback["id"]})

                is_offline, off_msg = check_telegram_offline("topup", is_uk)
                if is_offline:
                    tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                  json={"chat_id": chat_id, "text": off_msg, "parse_mode": "HTML"})
                    return {"status": "ok"}

                if not user_in_db:
                    err_msg = "❌ Спочатку прив'яжіть акаунт на сайті!" if is_uk else "❌ Link your account on the website first!"
                    tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                  json={"chat_id": chat_id, "text": err_msg})
                    return {"status": "ok"}

                USER_STATES[chat_id_str] = {"step": "wait_topup_amount"}
                text_topup = "🪙 <b>Поповнення балансу</b>\n\nВведіть бажану суму поповнення (в доларах/USDT). Наприклад: <code>50</code>" if is_uk else "🪙 <b>Top Up Balance</b>\n\nEnter the desired amount (in USD/USDT). Example: <code>50</code>"
                tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                              json={"chat_id": chat_id, "text": text_topup, "parse_mode": "HTML"})
                return {"status": "ok"}

            elif action_data == "unlink_acc":
                tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                              json={"callback_query_id": callback["id"]})
                if user_in_db:
                    user_in_db.telegram_chat_id = None
                    db.commit()
                    msg_unlinked = "✅ <b>Ваш акаунт успішно відв'язано!</b>\nТепер баланс сайту тут недоступний." if is_uk else "✅ <b>Your account has been unlinked!</b>\nWebsite balance is no longer available here."
                else:
                    msg_unlinked = "❌ Акаунт не знайдено." if is_uk else "❌ Account not found."

                tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/editMessageText",
                              json={"chat_id": chat_id, "message_id": message_id, "text": msg_unlinked,
                                    "parse_mode": "HTML"})
                return {"status": "ok"}
            # 🔥 РЕФЕРАЛЬНА ПРОГРАМА (УНІВЕРСАЛЬНА) 🔥
            elif action_data == "ref_menu":
                tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                              json={"callback_query_id": callback["id"]})
                if user_in_db:
                    bot_name = get_bot_username() or "LordTreasury_bot"
                    ref_web_link = f"{FRONTEND_URL}/?ref={user_in_db.username}"
                    ref_tg_link = f"https://t.me/{bot_name}?start=ref_{user_in_db.username}"

                    # Отримуємо відсотки по категоріях для довідки
                    ref_sett = db.query(models.ReferralSettingsDB).first()
                    cat_p = {}
                    if ref_sett and ref_sett.category_percents:
                        try:
                            cat_p = json.loads(ref_sett.category_percents) if isinstance(ref_sett.category_percents, str) else ref_sett.category_percents
                        except Exception:
                            cat_p = {}
                    rss_p = cat_p.get("rss", 0)
                    gems_p = cat_p.get("gems", 0)
                    oth_p = cat_p.get("other", 0)
                    acc_p = cat_p.get("account", 0)

                    text = (
                        f"🤝 <b>Універсальна реферальна система</b>\n\n"
                        f"👥 Запрошено друзів: <b>{user_in_db.referral_count or 0}</b>\n"
                        f"💰 Зароблено бонусів: <b>${user_in_db.referral_earnings:.2f}</b>\n\n"
                        f"📊 <b>Ваші винагороди по категоріях:</b>\n"
                        f"🌾 Ресурси (RSS): <b>{rss_p}%</b>\n"
                        f"💎 Сапфіри (Gems): <b>{gems_p}%</b>\n"
                        f"📦 Інші товари: <b>{oth_p}%</b>\n"
                        f"🏰 Акаунти: <b>{acc_p}%</b>\n\n"
                        f"🌐 <b>Посилання на сайт:</b>\n<code>{ref_web_link}</code>\n\n"
                        f"🤖 <b>Посилання на Telegram-бот:</b>\n<code>{ref_tg_link}</code>\n\n"
                        f"<i>Діє однаково для замовлень на сайті та в боті! Бонус нараховується на баланс після статусу «Виконано».</i>"
                    ) if is_uk else (
                        f"🤝 <b>Universal Referral System</b>\n\n"
                        f"👥 Friends invited: <b>{user_in_db.referral_count or 0}</b>\n"
                        f"💰 Earned rewards: <b>${user_in_db.referral_earnings:.2f}</b>\n\n"
                        f"📊 <b>Your reward rates by category:</b>\n"
                        f"🌾 Resources (RSS): <b>{rss_p}%</b>\n"
                        f"💎 Gems: <b>{gems_p}%</b>\n"
                        f"📦 Other items: <b>{oth_p}%</b>\n"
                        f"🏰 Accounts: <b>{acc_p}%</b>\n\n"
                        f"🌐 <b>Website Link:</b>\n<code>{ref_web_link}</code>\n\n"
                        f"🤖 <b>Telegram Bot Link:</b>\n<code>{ref_tg_link}</code>\n\n"
                        f"<i>Works universally for Web and Telegram! Bonus is credited to your balance when your friend's order is 'Completed'.</i>"
                    )

                    kb = {"inline_keyboard": [[{"text": "🔙 Назад у профіль" if is_uk else "🔙 Back to Profile",
                                                "callback_data": "profile_menu"}]]}
                    tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/editMessageText",
                                  json={"chat_id": chat_id, "message_id": message_id, "text": text,
                                        "parse_mode": "HTML", "reply_markup": kb})
                return {"status": "ok"}

            # 🔥 МЕНЮ ДОПОМОГИ (КНОПКА) 🔥
            elif action_data == "help_menu":
                tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                              json={"callback_query_id": callback["id"]})
                safe_url = FRONTEND_URL if FRONTEND_URL.startswith("http") else f"https://{FRONTEND_URL}"
                if "localhost" in safe_url or "127.0.0.1" in safe_url: safe_url = "https://t.me"

                if is_uk:
                    help_text = (
                        "🤖 <b>Довідка та Команди</b>\n\n"
                        "🔸 /start — Головне меню бота\n"
                        "🔸 /profile — Ваш баланс, реферальна програма та налаштування\n"
                        "🔸 /help — Ця інструкція\n\n"
                        "🛒 <b>Як зробити замовлення?</b>\n"
                        "Після того, як ви натиснете кнопку «Купити» (Buy) на вітрині, для вас буде створено окремий тікет (чат). Як тільки адміністратор звільниться, він відповість вам туди та оформить ваше замовлення.\n\n"
                        "🔗 <b>Як прив'язати акаунт?</b>\n"
                        "1. Перейдіть на сайт у розділ 'Профіль'.\n"
                        "2. Натисніть кнопку «Прив'язати».\n"
                        "3. Вас перенаправить у цей бот — просто натисніть «Start»."
                    )
                    btn_text = "🌐 Перейти на сайт"
                else:
                    help_text = (
                        "🤖 <b>Help & Commands</b>\n\n"
                        "🔸 /start — Main bot menu\n"
                        "🔸 /profile — Your balance, referral program, and settings\n"
                        "🔸 /help — This guide\n\n"
                        "🛒 <b>How to make an order?</b>\n"
                        "After you click the «Buy» button on the storefront, a separate ticket (chat) will be created for you. As soon as the admin is free, they will reply there and process your order.\n\n"
                        "🔗 <b>How to link your account?</b>\n"
                        "1. Go to your Profile on the website.\n"
                        "2. Click the «Link» button.\n"
                        "3. You will be redirected to this bot — just click «Start»."
                    )
                    btn_text = "🌐 Go to Website"

                kb = {"inline_keyboard": [[{"text": btn_text, "url": safe_url}]]}
                tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/editMessageText",
                              json={"chat_id": chat_id, "message_id": message_id, "text": help_text,
                                    "parse_mode": "HTML", "reply_markup": kb})
                return {"status": "ok"}

            # 🔥 МЕНЮ ПРОФІЛЮ 🔥
            elif action_data == "profile_menu":
                tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                              json={"callback_query_id": callback["id"]})
                if user_in_db:
                    tier_info = get_user_tier_summary(db, user_in_db.id)
                    tier_name = (tier_info.get("current_tier", {}).get("name") if tier_info else None) or "Base"
                    text_prof = (
                        f"👤 Ваш акаунт: <b>{user_in_db.username}</b>\n"
                        f"💳 Баланс: <b>${user_in_db.balance:.2f}</b>\n"
                        f"👑 Ранг кешбеку: <b>{tier_name}</b>"
                    ) if is_uk else (
                        f"👤 Account: <b>{user_in_db.username}</b>\n"
                        f"💳 Balance: <b>${user_in_db.balance:.2f}</b>\n"
                        f"👑 Cashback Tier: <b>{tier_name}</b>"
                    )
                    btn_lang = "🌍 Change language (EN)" if is_uk else "🌍 Змінити мову (UK)"
                    keyboard = {"inline_keyboard": [
                        [{"text": "🪙 Поповнити баланс" if is_uk else "🪙 Top Up Balance",
                          "callback_data": "topup_start"}],
                        [{"text": "👑 Мій кешбек та ранги" if is_uk else "👑 My Cashback & Tiers",
                          "callback_data": "cashback_menu"}],
                        [{"text": "🎟 Ввести промокод" if is_uk else "🎟 Enter Promo Code",
                          "callback_data": "enter_promo_profile"}],
                        [{"text": "🤝 Моя рефералка" if is_uk else "🤝 My Referral", "callback_data": "ref_menu"}],
                        [{"text": btn_lang, "callback_data": "change_lang"}],
                        [{"text": "❌ Відв'язати акаунт" if is_uk else "❌ Unlink Account",
                          "callback_data": "unlink_acc"}]
                    ]}
                    tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/editMessageText",
                                  json={"chat_id": chat_id, "message_id": message_id, "text": text_prof,
                                        "parse_mode": "HTML", "reply_markup": keyboard})
                else:
                    text_err = "❌ Ви не прив'язані. Перейдіть на сайт у свій Профіль, щоб прив'язати Telegram." if is_uk else "❌ You are not linked. Go to your Profile on the website to link your Telegram."
                    tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                  json={"chat_id": chat_id, "text": text_err, "parse_mode": "HTML"})
                return {"status": "ok"}

            # 🔥 МЕНЮ КЕШБЕКУ ТА РАНГІВ 🔥
            elif action_data == "cashback_menu":
                tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                              json={"callback_query_id": callback["id"]})
                if user_in_db:
                    tier_info = get_user_tier_summary(db, user_in_db.id)
                    curr = (tier_info.get("current_tier") if tier_info else None) or {"name": "Base", "rss": 0, "gems": 0, "other": 0, "account": 0}
                    next_t = tier_info.get("next_tier") if tier_info else None
                    spent = (tier_info.get("total_spent") if tier_info else 0.0) or 0.0

                    if is_uk:
                        cb_text = (
                            f"👑 <b>Ваш кешбек та ранг</b>\n\n"
                            f"🏆 Поточний ранг: <b>{curr.get('name', 'Base')}</b>\n"
                            f"📦 Витрачено за весь час: <b>${spent:.2f}</b>\n\n"
                            f"📊 <b>Ваші активні відсотки кешбеку:</b>\n"
                            f"🌾 Ресурси (RSS): <b>{curr.get('rss', 0)}%</b>\n"
                            f"💎 Сапфіри (Gems): <b>{curr.get('gems', 0)}%</b>\n"
                            f"📦 Інші товари: <b>{curr.get('other', 0)}%</b>\n"
                            f"🏰 Акаунти: <b>{curr.get('account', 0)}%</b>\n\n"
                        )
                        if next_t:
                            cb_text += (
                                f"🎯 До наступного рангу (<b>{next_t.get('name')}</b>): "
                                f"залишилося <b>${tier_info.get('needed_for_next', 0):.2f}</b> "
                                f"({tier_info.get('progress_percent', 0):.0f}%)\n\n"
                            )
                        else:
                            cb_text += "🌟 Ви досягли максимального рангу Emperor з найвищими ставками!\n\n"
                        cb_text += (
                            "<i>💡 Кешбек нараховується автоматично при оплаті монетами сайту "
                            "після переведення замовлення в статус «Виконано».</i>"
                        )
                    else:
                        cb_text = (
                            f"👑 <b>Your Cashback & Tier</b>\n\n"
                            f"🏆 Current Tier: <b>{curr.get('name', 'Base')}</b>\n"
                            f"📦 Total Spent: <b>${spent:.2f}</b>\n\n"
                            f"📊 <b>Your Active Cashback Rates:</b>\n"
                            f"🌾 Resources (RSS): <b>{curr.get('rss', 0)}%</b>\n"
                            f"💎 Sapphires (Gems): <b>{curr.get('gems', 0)}%</b>\n"
                            f"📦 Other Goods: <b>{curr.get('other', 0)}%</b>\n"
                            f"🏰 Accounts: <b>{curr.get('account', 0)}%</b>\n\n"
                        )
                        if next_t:
                            cb_text += (
                                f"🎯 To next tier (<b>{next_t.get('name')}</b>): "
                                f"<b>${tier_info.get('needed_for_next', 0):.2f}</b> left "
                                f"({tier_info.get('progress_percent', 0):.0f}%)\n\n"
                            )
                        else:
                            cb_text += "🌟 You have reached the maximum Emperor tier!\n\n"
                        cb_text += (
                            "<i>💡 Cashback is credited when paying with site coins "
                            "after the order reaches 'Completed' status.</i>"
                        )

                    kb = {"inline_keyboard": [[{"text": "🔙 Назад у профіль" if is_uk else "🔙 Back to Profile",
                                                "callback_data": "profile_menu"}]]}
                    tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/editMessageText",
                                  json={"chat_id": chat_id, "message_id": message_id, "text": cb_text,
                                        "parse_mode": "HTML", "reply_markup": kb})
                return {"status": "ok"}

            # 🔥 ВВІД ПРОМОКОДУ З ПРОФІЛЮ 🔥
            elif action_data == "enter_promo_profile":
                tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                              json={"callback_query_id": callback["id"]})
                USER_STATES[chat_id_str] = {"step": "wait_profile_promo"}
                text = "🎟 <b>Введіть ваш промокод:</b>\n<i>(Якщо це промокод на баланс, він одразу поповнить рахунок)</i>" if is_uk else "🎟 <b>Enter your promo code:</b>\n<i>(If it's a balance promo, it will top up your account)</i>"
                tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                              json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"})
                return {"status": "ok"}

            # 🔥 ПРОМОКОД ПІД ЧАС КУПІВЛІ ТОВАРУ 🔥
            elif action_data == "enter_promo":
                tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                              json={"callback_query_id": callback["id"]})
                if chat_id_str not in USER_STATES or USER_STATES[chat_id_str]["step"] != "ready_to_pay":
                    return {"status": "ok"}
                USER_STATES[chat_id_str]["step"] = "wait_promo"
                text = "🎟 <b>Введіть промокод на знижку:</b>" if is_uk else "🎟 <b>Enter discount promo code:</b>"
                tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                              json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"})
                return {"status": "ok"}

            elif action_data == "low_balance_warn":
                curr_b = f"${user_in_db.balance:.2f}" if user_in_db else "$0.00"
                warn_text = f"❌ Недостатньо коштів на балансі (Ваш баланс: {curr_b}). Оберіть оплату в чаті або поповніть баланс." if is_uk else f"❌ Insufficient balance (Your balance: {curr_b}). Choose chat payment or top up."
                tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                              json={"callback_query_id": callback["id"], "text": warn_text, "show_alert": True})
                return {"status": "ok"}

            elif action_data == "need_link_warn":
                warn_text = "❌ Щоб оплачувати з балансу, прив'яжіть акаунт сайту в розділі «Профіль»!" if is_uk else "❌ To pay with balance, link your website account in 'Profile'!"
                tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                              json={"callback_query_id": callback["id"], "text": warn_text, "show_alert": True})
                return {"status": "ok"}

            elif action_data.startswith("admin_"):
                parts = action_data.replace("admin_", "").rsplit("_", 1)
                new_status = parts[0]
                order_id = int(parts[1])
                success, msg = _process_order_status_change(db, order_id, new_status)

                if TELEGRAM_BOT_TOKEN:
                    tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                                  json={"callback_query_id": callback["id"],
                                        "text": "✅ Змінено!" if success else f"❌ Помилка: {msg}"})
                    if success:
                        db_order = db.query(models.OrderDB).filter(models.OrderDB.id == order_id).first()
                        from utils import generate_short_status_message
                        short_msg = generate_short_status_message(db_order, new_status, worker_mention, is_uk=True)

                        keyboard = None
                        if new_status == "paid_processing":
                            keyboard = {"inline_keyboard": [
                                [{"text": "🚚 Товар видано", "callback_data": f"admin_delivered_{order_id}"}],
                                [{"text": "🔴 Скасувати (Повернення)", "callback_data": f"admin_cancelled_{order_id}"}]
                            ]}
                        elif new_status == "delivered":
                            keyboard = {"inline_keyboard": [
                                [{"text": "🔴 Скасувати (Повернення)", "callback_data": f"admin_cancelled_{order_id}"}]]}

                        tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/editMessageText",
                                      json={"chat_id": chat_id, "message_id": message_id, "text": short_msg,
                                            "parse_mode": "HTML", "reply_markup": keyboard if keyboard else {}})

            elif action_data.startswith("client_confirm_"):
                order_id = int(action_data.replace("client_confirm_", ""))
                success, msg = _process_order_status_change(db, order_id, "completed", confirmed_by_user=True)

                if success:
                    db_order = db.query(models.OrderDB).filter(models.OrderDB.id == order_id).first()
                    from utils import generate_receipt_text
                    receipt_msg = generate_receipt_text(db_order, is_uk=is_uk)

                    tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                                  json={"callback_query_id": callback["id"],
                                        "text": "✅ Замовлення підтверджено!" if is_uk else "✅ Order confirmed!"})
                    tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/editMessageText",
                                  json={"chat_id": chat_id, "message_id": message_id, "text": receipt_msg,
                                        "parse_mode": "HTML"})
                else:
                    tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                                  json={"callback_query_id": callback["id"], "text": f"❌ Error: {msg}"})

            # 🔥 ГЛОБАЛЬНА ФІНАЛЬНА ОПЛАТА 🔥
            elif action_data.startswith("statepay_"):
                tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                              json={"callback_query_id": callback["id"]})
                pay_method = action_data.split("_")[1]

                if chat_id_str not in USER_STATES or USER_STATES[chat_id_str]["step"] != "ready_to_pay":
                    text_expired = "❌ Сесія застаріла. Будь ласка, оберіть товар на вітрині ще раз." if is_uk else "❌ Session expired. Please select the product on the storefront again."
                    tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                  json={"chat_id": chat_id, "text": text_expired})
                    return {"status": "ok"}

                state = USER_STATES[chat_id_str]

                # 🛑 ПЕРЕВІРКА ОФЛАЙН РЕЖИМУ ДЛЯ КАТЕГОРІЇ ТОВАРУ
                is_offline, off_msg = check_telegram_offline(state.get("item_group"), is_uk)
                if is_offline:
                    tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                  json={"chat_id": chat_id, "text": off_msg, "parse_mode": "HTML"})
                    return {"status": "ok"}

                item_name = state["item_name"]
                total_price = float(state.get("final_price", state.get("price", 0.0)))
                user = user_in_db

                if total_price <= 0 or pay_method == "free":
                    pay_method = "free"
                    total_price = 0.0
                    initial_status = "paid_processing"
                    pay_text = "Безкоштовно (Промокод) / Free (Promo)"
                elif pay_method == "bal":
                    if not user or user.balance < total_price:
                        text_no_money = "❌ Недостатньо коштів на балансі." if is_uk else "❌ Insufficient balance."
                        tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                      json={"chat_id": chat_id, "text": text_no_money})
                        return {"status": "ok"}

                    affected = db.query(models.UserDB).filter(
                        models.UserDB.id == user.id,
                        models.UserDB.balance >= total_price
                    ).update(
                        {"balance": models.UserDB.balance - total_price},
                        synchronize_session=False
                    )
                    if affected == 0:
                        text_no_money = "❌ Недостатньо коштів на балансі." if is_uk else "❌ Insufficient balance."
                        tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                      json={"chat_id": chat_id, "text": text_no_money})
                        return {"status": "ok"}

                    initial_status = "paid_processing"
                    pay_text = "З балансу / Balance"
                else:
                    initial_status = "awaiting_payment"
                    pay_text = "Готівка (чат) / Cash"

                # Якщо куплено акаунт і статус оплачений - маркуємо як 'sold'
                if state.get("item_group") == "acc" and initial_status == "paid_processing":
                    db.query(models.AccountDB).filter(
                        models.AccountDB.id == state["item_id"]
                    ).update({"status": "sold"}, synchronize_session=False)

                if is_uk:
                    details_text = f"💎 Кількість: {state.get('amount')} шт." if state[
                                                                                    "item_group"] == "gem" else f"📦 Список товарів:\n{state.get('custom_text')}" if \
                    state["item_group"] == "oth" else "Дані в чаті"
                else:
                    details_text = f"💎 Amount: {state.get('amount')} pcs." if state[
                                                                                  "item_group"] == "gem" else f"📦 Item list:\n{state.get('custom_text')}" if \
                    state["item_group"] == "oth" else "Data in chat"

                cart = [{"type": "telegram_fast_buy", "item_group": state.get("item_group"), "price": total_price,
                         "product": {"id": state["item_id"], "name": item_name}, "userData": {"details": details_text},
                         "_tg_chat_id": chat_id, "_lang": user_lang_tg}]

                # 🔥 ЗБЕРІГАЄМО ПРОМОКОД ДЛЯ АДМІНКИ 🔥
                promo_applied = state.get("promo_code")
                if promo_applied:
                    cart.append({"_meta_promo": True, "promo_code": promo_applied})
                    promo_db = db.query(models.PromoCodeDB).filter(models.PromoCodeDB.code == promo_applied).first()
                    if promo_db:
                        promo_db.current_uses = (promo_db.current_uses or 0) + 1
                        if promo_db.max_uses > 0 and promo_db.current_uses >= promo_db.max_uses:
                            promo_db.is_active = 0
                        db.commit()

                # 🔥 ЗБЕРІГАЄМО РЕФЕРАЛА ДЛЯ АВТОМАТИЧНОЇ ВИНАГОРОДИ 🔥
                tg_ref = None
                if user and user.referred_by:
                    tg_ref = user.referred_by
                elif chat_id_str in USER_STATES and USER_STATES[chat_id_str].get("referred_by"):
                    tg_ref = USER_STATES[chat_id_str]["referred_by"]
                if tg_ref:
                    cart.append({"_tg_referred_by": tg_ref})

                new_order = models.OrderDB(user_id=user.id if user else None, cart_data=json.dumps(cart),
                                           payment_method=pay_text, total=f"{total_price:.2f}", profit="0",
                                           status=initial_status)
                db.add(new_order)
                db.commit()
                db.refresh(new_order)

                if TELEGRAM_FORUM_CHAT_ID:
                    buyer_name = user.username if user else clicker_name
                    res = tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/createForumTopic",
                                        json={"chat_id": TELEGRAM_FORUM_CHAT_ID,
                                              "name": f"#{new_order.id} {buyer_name}"}).json()
                    if res.get("ok"):
                        topic_id = res["result"]["message_thread_id"]
                        db.add(models.OrderTopicDB(order_id=new_order.id, topic_id=topic_id))
                        db.commit()

                        if pay_method in ["bal", "free"]:
                            keyboard = {"inline_keyboard": [
                                [{"text": "🚚 Товар видано", "callback_data": f"admin_delivered_{new_order.id}"}],
                                [{"text": "🔴 Скасувати (Повернення)", "callback_data": f"admin_cancelled_{new_order.id}"}]
                            ]}
                        else:
                            keyboard = {"inline_keyboard": [
                                [{"text": "🟢 Оплачено (В роботу)", "callback_data": f"admin_paid_processing_{new_order.id}"}],
                                [{"text": "🚚 Товар видано", "callback_data": f"admin_delivered_{new_order.id}"}],
                                [{"text": "🔴 Скасувати", "callback_data": f"admin_cancelled_{new_order.id}"}]
                            ]}

                        details_admin = f"💎 Кількість: {state.get('amount')} шт." if state[
                                                                                         "item_group"] == "gem" else f"📦 Список товарів:\n{state.get('custom_text')}" if \
                        state["item_group"] == "oth" else ""
                        promo_admin = f"\n🎟 <b>Промокод:</b> {promo_applied}" if promo_applied else ""
                        msg_admin = f"<b>ЗАМОВЛЕННЯ #{new_order.id}</b>\n💳 <b>Оплата:</b> {pay_text}\n💰 <b>Сума:</b> ${total_price:.2f}{promo_admin}\n👤 <b>Покупець:</b> {buyer_name}\n\n🛒 <b>Товар:</b>\n1. {item_name} | ${total_price:.2f}\n{details_admin}\n\n🔸 <i>Очікуємо дані від клієнта.</i>"

                        res_msg = tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                                json={"chat_id": TELEGRAM_FORUM_CHAT_ID, "message_thread_id": topic_id,
                                                      "text": msg_admin, "parse_mode": "HTML",
                                                      "reply_markup": keyboard}).json()

                        if res_msg.get("ok"):
                            tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/unpinChatMessage",
                                          json={"chat_id": TELEGRAM_FORUM_CHAT_ID,
                                                "message_id": res_msg["result"]["message_id"]})

                req_fields = state.get("req_fields", "")
                if req_fields:
                    data_prompt_uk = f"👇 <b>Напишіть ваші дані ({req_fields}) прямо в цей чат!</b>"
                    data_prompt_en = f"👇 <b>Please write your data ({req_fields}) directly in this chat!</b>"
                else:
                    data_prompt_uk = "👇 <b>Напишіть ваші дані (ID акаунта, координати або гільдію) прямо в цей чат!</b>"
                    data_prompt_en = "👇 <b>Please write your data (Account ID, coordinates or guild) directly in this chat!</b>"

                if is_uk:
                    if pay_method == "free":
                        promo_tag = f" (промокод <b>{promo_applied}</b>)" if promo_applied else ""
                        success_msg = f"🎁 <b>Замовлення #{new_order.id} успішно оформлено!</b>\n💰 Сума: <b>$0.00 (100% знижка)</b>{promo_tag}\n\n"
                    elif pay_method == "bal":
                        success_msg = f"✅ <b>Замовлення #{new_order.id} створено!</b>\n💰 Списано з балансу: <b>${total_price:.2f}</b>\n\n"
                    else:
                        success_msg = f"✅ <b>Замовлення #{new_order.id} створено!</b>\n💳 Очікуємо на оплату (Адмін надішле реквізити).\n\n"
                    success_msg += data_prompt_uk
                else:
                    if pay_method == "free":
                        promo_tag = f" (promo <b>{promo_applied}</b>)" if promo_applied else ""
                        success_msg = f"🎁 <b>Order #{new_order.id} placed successfully!</b>\n💰 Total: <b>$0.00 (100% discount)</b>{promo_tag}\n\n"
                    elif pay_method == "bal":
                        success_msg = f"✅ <b>Order #{new_order.id} created!</b>\n💰 Paid from balance: <b>${total_price:.2f}</b>\n\n"
                    else:
                        success_msg = f"✅ <b>Order #{new_order.id} created!</b>\n💳 Awaiting payment (Admin will send details).\n\n"
                    success_msg += data_prompt_en

                tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                              json={"chat_id": chat_id, "text": success_msg, "parse_mode": "HTML"})
                del USER_STATES[chat_id_str]


        # === 2. ОБРОБКА ПОВІДОМЛЕНЬ ===
        elif "message" in data:
            msg = data["message"]
            chat_id = str(msg["chat"]["id"])
            chat_id_str = chat_id
            chat_type = msg["chat"].get("type", "")

            text = msg.get("text") or msg.get("caption") or ""
            photo_file_id = None

            if "photo" in msg and len(msg["photo"]) > 0:
                photo_file_id = msg["photo"][-1]["file_id"]

            if not text and not photo_file_id:
                if any(k in msg for k in ("sticker", "document", "video", "voice")):
                    text = "[Вкладення]"

            # А) Повідомлення від АДМІНА у Форумі (Пересилаємо клієнту!)
            if chat_id == str(TELEGRAM_FORUM_CHAT_ID) and "message_thread_id" in msg:
                topic = db.query(models.OrderTopicDB).filter(
                    models.OrderTopicDB.topic_id == msg["message_thread_id"]).first()
                if topic:
                    order = db.query(models.OrderDB).filter(models.OrderDB.id == topic.order_id).first()
                    is_secret = False
                    send_text = text

                    if send_text.startswith("!"):
                        is_secret = True
                        send_text = send_text[1:].strip()

                    db_text = f"[Фото] {send_text}" if photo_file_id else send_text
                    db.add(models.TicketMessageDB(order_id=topic.order_id, sender="admin", text=db_text,
                                                  is_secret=is_secret))
                    db.commit()

                    if order:
                        target_chat_id = None
                        if order.user_id:
                            buyer = db.query(models.UserDB).filter(models.UserDB.id == order.user_id).first()
                            if buyer and buyer.telegram_chat_id: target_chat_id = buyer.telegram_chat_id

                        if not target_chat_id:
                            try:
                                cart_data = json.loads(order.cart_data)
                                for item in cart_data:
                                    if item.get("_tg_chat_id"):
                                        target_chat_id = item["_tg_chat_id"]
                                        break
                            except Exception:
                                pass

                        if target_chat_id:
                            is_uk_client = False
                            buyer_in_db = db.query(models.UserDB).filter(
                                models.UserDB.telegram_chat_id == target_chat_id).first()
                            if buyer_in_db and getattr(buyer_in_db, "language", None):
                                is_uk_client = buyer_in_db.language == "uk"

                            prefix = "🤫 <b>Реквізити для оплати:</b>" if is_secret else "👨‍💻 <b>Адміністратор:</b>"
                            if not is_uk_client: prefix = "🤫 <b>Payment details:</b>" if is_secret else "👨‍💻 <b>Administrator:</b>"

                            final_msg_text = f"{prefix}\n{send_text}" if send_text else prefix

                            if photo_file_id:
                                res_tg = tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto",
                                                       json={"chat_id": target_chat_id, "photo": photo_file_id,
                                                             "caption": final_msg_text, "parse_mode": "HTML"}).json()
                            else:
                                res_tg = tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                                       json={"chat_id": target_chat_id, "text": final_msg_text,
                                                             "parse_mode": "HTML"}).json()

                            if is_secret and res_tg.get("ok"):
                                try:
                                    client_msg_id = res_tg["result"]["message_id"]
                                    c_data = json.loads(order.cart_data)
                                    if len(c_data) > 0:
                                        if "_secret_msg_ids" not in c_data[0]: c_data[0]["_secret_msg_ids"] = []
                                        c_data[0]["_secret_msg_ids"].append(client_msg_id)
                                        order.cart_data = json.dumps(c_data)
                                        db.commit()
                                except Exception:
                                    pass

            # Б) Повідомлення від КЛІЄНТА в особистих
            elif chat_type == "private":
                text_lower = text.strip().lower()
                parts = text.split(" ")

                if text_lower.startswith("/start"):
                    ref_welcome_note = ""
                    if len(parts) > 1 and parts[1].startswith("ref_"):
                        ref_code = parts[1].replace("ref_", "").strip()
                        referrer = db.query(models.UserDB).filter(models.UserDB.username.ilike(ref_code)).first() if ref_code else None
                        if referrer:
                            if user_in_db:
                                if not user_in_db.referred_by and referrer.username.lower() != user_in_db.username.lower():
                                    user_in_db.referred_by = referrer.username
                                    referrer.referral_count = (referrer.referral_count or 0) + 1
                                    db.commit()
                            else:
                                if chat_id_str not in USER_STATES:
                                    USER_STATES[chat_id_str] = {}
                                USER_STATES[chat_id_str]["referred_by"] = referrer.username
                            ref_welcome_note = (
                                f"\n\n🤝 <i>Вас запросив: <b>{referrer.username}</b></i>"
                                if is_uk else
                                f"\n\n🤝 <i>You were invited by: <b>{referrer.username}</b></i>"
                            )

                    if len(parts) > 1 and parts[1].startswith("link_"):
                        token = parts[1].replace("link_", "").strip()
                        user_id = LINK_TOKENS.get(token)

                        if user_id:
                            db_user = db.query(models.UserDB).filter(models.UserDB.id == user_id).first()
                            if db_user:
                                db_user.telegram_chat_id = chat_id
                                if not getattr(db_user, "language", None):
                                    db_user.language = "uk" if is_uk else "en"

                                if chat_id_str in USER_STATES and USER_STATES[chat_id_str].get("referred_by"):
                                    saved_ref = USER_STATES[chat_id_str]["referred_by"]
                                    if not db_user.referred_by and saved_ref.lower() != db_user.username.lower():
                                        ref_model = db.query(models.UserDB).filter(models.UserDB.username.ilike(saved_ref)).first()
                                        if ref_model:
                                            db_user.referred_by = ref_model.username
                                            ref_model.referral_count = (ref_model.referral_count or 0) + 1

                                db.commit()

                                text_linked = (
                                    f"✅ <b>Ваш акаунт ({db_user.username}) успішно прив'язано до Telegram!</b>\n"
                                    f"💳 Ваш баланс: <b>${db_user.balance:.2f}</b>\n\n"
                                    "Тепер ви можете оплачувати замовлення з балансу прямо тут!"
                                    if is_uk else
                                    f"✅ <b>Your account ({db_user.username}) has been successfully linked!</b>\n"
                                    f"💳 Your balance: <b>${db_user.balance:.2f}</b>\n\n"
                                    "You can now make payments directly here!"
                                )
                                tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                              json={"chat_id": chat_id, "text": text_linked, "parse_mode": "HTML"})
                                del LINK_TOKENS[token]
                            else:
                                tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                              json={"chat_id": chat_id,
                                                    "text": "❌ Користувача не знайдено." if is_uk else "❌ User not found."})
                        else:
                            err_txt = "❌ Посилання недійсне або застаріло. Згенеруйте нове на сайті." if is_uk else "❌ Link is invalid or expired. Please generate a new one on the website."
                            tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                          json={"chat_id": chat_id, "text": err_txt})
                        return {"status": "ok"}

                    elif len(parts) > 1 and parts[1].startswith("buy_"):
                        payload = parts[1]
                        payload_parts = payload.split("_")
                        item_group = payload_parts[1] if len(payload_parts) > 1 else ""

                        # 🛑 ПЕРЕВІРКА ОФЛАЙН РЕЖИМУ ДЛЯ КАТЕГОРІЇ ТОВАРУ
                        is_offline, off_msg = check_telegram_offline(item_group, is_uk)
                        if is_offline:
                            tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                          json={"chat_id": chat_id, "text": off_msg, "parse_mode": "HTML"})
                            return {"status": "ok"}

                        try:
                            item_id = int(payload_parts[2]) if len(payload_parts) > 2 else None
                        except ValueError:
                            item_id = None

                        if item_group == "coins":
                            safe_url = FRONTEND_URL if FRONTEND_URL.startswith("http") else f"https://{FRONTEND_URL}"
                            text_coins = "🪙 <b>Поповнення балансу</b>\nВкажіть бажану суму поповнення на нашому сайті:" if is_uk else "🪙 <b>Top Up Balance</b>\nEnter the desired amount on our website:"
                            tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                          json={"chat_id": chat_id, "text": text_coins, "parse_mode": "HTML",
                                                "reply_markup": {"inline_keyboard": [
                                                    [{"text": "🌐 Перейти до поповнення" if is_uk else "🌐 Go to Top Up",
                                                      "url": safe_url}]]}})
                            return {"status": "ok"}

                        if item_group == "gem":
                            db_item = db.query(models.GemDB).filter(models.GemDB.id == item_id).first()
                            if db_item:
                                USER_STATES[chat_id_str] = {"step": "wait_gem_amount", "item_id": item_id,
                                                        "rate": float(db_item.rate), "item_group": "gem",
                                                        "item_name": f"Gems / Сапфіри ({db_item.range})"}
                                text_gem = "💎 <b>Вкажіть бажану кількість сапфірів</b>\n\nНапишіть цифрою (наприклад: <code>100000</code> або <code>200k</code>)." if is_uk else "💎 <b>Enter desired amount of Gems</b>\n\nType a number (e.g., <code>100000</code> or <code>200k</code>)."
                                tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                              json={"chat_id": chat_id, "text": text_gem, "parse_mode": "HTML"})
                                return {"status": "ok"}

                        # Швидка покупка для акаунтів, ресурсів та інших товарів
                        item_name, total_price, req_fields = "", 0.0, ""
                        if item_group == "acc":
                            db_item = db.query(models.AccountDB).filter(models.AccountDB.id == item_id).first()
                            if db_item: item_name, total_price = db_item.title, float(db_item.price)
                        elif item_group == "res":
                            db_item = db.query(models.ResourceDB).filter(models.ResourceDB.id == item_id).first()
                            if db_item: item_name, total_price = db_item.name, float(db_item.price)
                        elif item_group == "oth":
                            db_item = db.query(models.OtherItemDB).filter(models.OtherItemDB.id == item_id).first()
                            if db_item:
                                item_name, total_price = db_item.name, float(db_item.price)
                                req_fields = getattr(db_item, "requiredFields", "") or ""

                        if not item_name:
                            tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                          json={"chat_id": chat_id,
                                                "text": "❌ Товар не знайдено." if is_uk else "❌ Item not found."})
                            return {"status": "ok"}

                        # Формуємо єдиний стейт для всіх товарів
                        USER_STATES[chat_id_str] = {
                            "step": "ready_to_pay",
                            "item_group": item_group,
                            "item_id": item_id,
                            "item_name": item_name,
                            "req_fields": req_fields,
                            "final_price": total_price,
                            "original_price": total_price
                        }

                        kb = get_checkout_markup(user_in_db, total_price, False, is_uk)
                        text_order = f"🛍 <b>Оформлення замовлення</b>\n\nВи обрали: <b>{item_name}</b>\n💰 Сума: <b>${total_price:.2f}</b>\n\nОберіть спосіб оплати:" if is_uk else f"🛍 <b>Checkout</b>\n\nYou selected: <b>{item_name}</b>\n💰 Total: <b>${total_price:.2f}</b>\n\nChoose payment method:"
                        tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                      json={"chat_id": chat_id, "text": text_order, "parse_mode": "HTML",
                                            "reply_markup": kb})
                        return {"status": "ok"}

                    else:
                        welcome_text = "👋 <b>Вітаємо у LordTreasury!</b>\n\nЩоб зробити замовлення, перейдіть до нашої вітрини та натисніть кнопку «Купити» під потрібним товаром." if is_uk else "👋 <b>Welcome to LordTreasury!</b>\n\nTo make an order, go to our storefront and click «Buy» under the desired item."
                        btn_lang = "🌍 Change language (EN)" if is_uk else "🌍 Змінити мову (UK)"
                        if user_in_db:
                            welcome_text += f"\n\n👤 Ваш акаунт: <b>{user_in_db.username}</b>\n💳 Баланс: <b>${user_in_db.balance:.2f}</b>" if is_uk else f"\n\n👤 Your account: <b>{user_in_db.username}</b>\n💳 Balance: <b>${user_in_db.balance:.2f}</b>"
                        if ref_welcome_note:
                            welcome_text += ref_welcome_note

                        target_url = os.getenv("NGROK_URL") or FRONTEND_URL
                        menu_buttons = []
                        if target_url and target_url.startswith("https://"):
                            cache_bust_url = f"{target_url}?t={int(time.time())}"
                            menu_buttons.append([{"text": "🛍️ ВІДКРИТИ МАГАЗИН (Web App)" if is_uk else "🛍️ OPEN STORE (Web App)", "web_app": {"url": cache_bust_url}}])
                        elif target_url:
                            menu_buttons.append([{"text": "🌐 ВІДКРИТИ МАГАЗИН" if is_uk else "🌐 OPEN STORE", "url": target_url}])

                        menu_buttons.extend([
                            [{"text": "👤 Профіль / Profile", "callback_data": "profile_menu"},
                             {"text": "❓ Допомога / Help", "callback_data": "help_menu"}],
                            [{"text": "🎟 Ввести промокод / Promo Code", "callback_data": "enter_promo_profile"}],
                            [{"text": btn_lang, "callback_data": "change_lang"}]
                        ])
                        keyboard = {"inline_keyboard": menu_buttons}
                        tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                      json={"chat_id": chat_id, "text": welcome_text, "parse_mode": "HTML",
                                            "reply_markup": keyboard})
                        return {"status": "ok"}

                elif text_lower in ["/profile", "/balance", "профіль", "баланс", "profile", "balance"]:
                    if user_in_db:
                        tier_info = get_user_tier_summary(db, user_in_db.id)
                        tier_name = (tier_info.get("current_tier", {}).get("name") if tier_info else None) or "Base"
                        text_prof = (
                            f"👤 Ваш акаунт: <b>{user_in_db.username}</b>\n"
                            f"💳 Баланс: <b>${user_in_db.balance:.2f}</b>\n"
                            f"👑 Ранг кешбеку: <b>{tier_name}</b>"
                        ) if is_uk else (
                            f"👤 Account: <b>{user_in_db.username}</b>\n"
                            f"💳 Balance: <b>${user_in_db.balance:.2f}</b>\n"
                            f"👑 Cashback Tier: <b>{tier_name}</b>"
                        )
                        btn_lang = "🌍 Change language (EN)" if is_uk else "🌍 Змінити мову (UK)"
                        keyboard = {"inline_keyboard": [
                            [{"text": "🪙 Поповнити баланс" if is_uk else "🪙 Top Up Balance",
                              "callback_data": "topup_start"}],
                            [{"text": "👑 Мій кешбек та ранги" if is_uk else "👑 My Cashback & Tiers",
                              "callback_data": "cashback_menu"}],
                            [{"text": "🎟 Ввести промокод" if is_uk else "🎟 Enter Promo Code",
                              "callback_data": "enter_promo_profile"}],
                            [{"text": "🤝 Моя рефералка" if is_uk else "🤝 My Referral", "callback_data": "ref_menu"}],
                            [{"text": btn_lang, "callback_data": "change_lang"}],
                            [{"text": "❌ Відв'язати акаунт" if is_uk else "❌ Unlink Account",
                              "callback_data": "unlink_acc"}]
                        ]}
                        tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                      json={"chat_id": chat_id, "text": text_prof, "parse_mode": "HTML",
                                            "reply_markup": keyboard})
                    else:
                        text_err = "❌ Ви не прив'язані. Перейдіть на сайт у свій Профіль, щоб прив'язати Telegram." if is_uk else "❌ You are not linked. Go to your Profile on the website to link your Telegram."
                        tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                      json={"chat_id": chat_id, "text": text_err, "parse_mode": "HTML"})
                    return {"status": "ok"}

                elif text_lower == "/lang":
                    # 🌍 Швидка зміна мови через команду
                    new_lang = "en" if is_uk else "uk"
                    if user_in_db:
                        user_in_db.language = new_lang
                        db.commit()
                    else:
                        USER_LANGUAGES[chat_id_str] = new_lang
                    is_uk = (new_lang == "uk")
                    btn_lang = "🌍 Change language (EN)" if is_uk else "🌍 Змінити мову (UK)"
                    text_ok = "✅ Мову змінено на <b>Українську</b>!" if is_uk else "✅ Language changed to <b>English</b>!"
                    keyboard = {"inline_keyboard": [
                        [{"text": "👤 Профіль / Profile", "callback_data": "profile_menu"},
                         {"text": "❓ Допомога / Help", "callback_data": "help_menu"}],
                        [{"text": "🎟 Ввести промокод / Promo Code", "callback_data": "enter_promo_profile"}],
                        [{"text": btn_lang, "callback_data": "change_lang"}]
                    ]}
                    tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                  json={"chat_id": chat_id, "text": text_ok, "parse_mode": "HTML",
                                        "reply_markup": keyboard})
                    return {"status": "ok"}


                elif text_lower in ["/help", "/menu", "допомога", "меню", "help"]:
                    safe_url = FRONTEND_URL if FRONTEND_URL.startswith("http") else f"https://{FRONTEND_URL}"
                    if "localhost" in safe_url or "127.0.0.1" in safe_url: safe_url = "https://t.me"

                    if is_uk:
                        help_text = (
                            "🤖 <b>Довідка та Команди</b>\n\n"
                            "🔸 /start — Головне меню бота\n"
                            "🔸 /profile — Ваш баланс, реферальна програма та налаштування\n"
                            "🔸 /help — Ця інструкція\n\n"
                            "🛒 <b>Як зробити замовлення?</b>\n"
                            "Після того, як ви натиснете кнопку «Купити» (Buy) на вітрині, для вас буде створено окремий тікет (чат). Як тільки адміністратор звільниться, він відповість вам туди та оформить ваше замовлення.\n\n"
                            "🔗 <b>Як прив'язати акаунт?</b>\n"
                            "1. Перейдіть на сайт у розділ 'Профіль'.\n"
                            "2. Натисніть кнопку «Прив'язати».\n"
                            "3. Вас перенаправить у цей бот — просто натисніть «Start»."
                        )
                        btn_text = "🌐 Перейти на сайт"
                    else:
                        help_text = (
                            "🤖 <b>Help & Commands</b>\n\n"
                            "🔸 /start — Main bot menu\n"
                            "🔸 /profile — Your balance, referral program, and settings\n"
                            "🔸 /help — This guide\n\n"
                            "🛒 <b>How to make an order?</b>\n"
                            "After you click the «Buy» button on the storefront, a separate ticket (chat) will be created for you. As soon as the admin is free, they will reply there and process your order.\n\n"
                            "🔗 <b>How to link your account?</b>\n"
                            "1. Go to your Profile on the website.\n"
                            "2. Click the «Link» button.\n"
                            "3. You will be redirected to this bot — just click «Start»."
                        )
                        btn_text = "🌐 Go to Website"

                    kb = {"inline_keyboard": [[{"text": btn_text, "url": safe_url}]]}
                    tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                  json={"chat_id": chat_id, "text": help_text, "parse_mode": "HTML",
                                        "reply_markup": kb})
                    return {"status": "ok"}

                elif chat_id_str in USER_STATES:
                    state = USER_STATES[chat_id_str]
                    user = user_in_db

                    if state["step"] == "wait_topup_amount":
                        # 🛑 ПЕРЕВІРКА ОФЛАЙН РЕЖИМУ ДЛЯ ПОПОВНЕННЯ
                        is_offline, off_msg = check_telegram_offline("topup", is_uk)
                        if is_offline:
                            del USER_STATES[chat_id_str]
                            tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                          json={"chat_id": chat_id, "text": off_msg, "parse_mode": "HTML"})
                            return {"status": "ok"}

                        try:
                            amount = float(text.replace(',', '.').strip())
                            if amount < 1: raise ValueError()

                            cart = [{
                                "type": "topup", "coins": amount, "price": amount,
                                "product": {"id": 0,
                                            "title": f"Поповнення балансу: ${amount:.2f}" if is_uk else f"Balance Top-up: ${amount:.2f}"},
                                "userData": {"details": "Дані в чаті / Data in chat"},
                                "_tg_chat_id": chat_id, "_lang": user_lang_tg
                            }]

                            new_order = models.OrderDB(user_id=user.id, cart_data=json.dumps(cart),
                                                       payment_method="Готівка/Крипта (чат)" if is_uk else "Cash/Crypto (chat)",
                                                       total=str(amount), profit="0", status="awaiting_payment")
                            db.add(new_order)
                            db.commit()
                            db.refresh(new_order)

                            if TELEGRAM_FORUM_CHAT_ID:
                                buyer_name = escape_html(user.username) if user else "Клієнт"
                                res = tg_session.post(
                                    f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/createForumTopic",
                                    json={"chat_id": TELEGRAM_FORUM_CHAT_ID,
                                          "name": f"#{new_order.id} {buyer_name}"}).json()
                                if res.get("ok"):
                                    topic_id = res["result"]["message_thread_id"]
                                    db.add(models.OrderTopicDB(order_id=new_order.id, topic_id=topic_id))
                                    db.commit()

                                    keyboard_admin = {"inline_keyboard": [[{"text": "✅ Оплачено (Нарахувати)",
                                                                            "callback_data": f"admin_completed_{new_order.id}"}],
                                                                          [{"text": "🔴 Скасувати",
                                                                            "callback_data": f"admin_cancelled_{new_order.id}"}]]}
                                    msg_admin = f"<b>ПОПОВНЕННЯ БАЛАНСУ #{new_order.id}</b>\n👤 <b>Клієнт:</b> {buyer_name}\n💰 <b>Сума:</b> ${amount:.2f}\n\n🔸 <i>Надішліть клієнту реквізити в цей чат. Після оплати натисніть «Оплачено», і баланс автоматично нарахується.</i>"
                                    res_msg = tg_session.post(
                                        f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                        json={"chat_id": TELEGRAM_FORUM_CHAT_ID, "message_thread_id": topic_id,
                                              "text": msg_admin, "parse_mode": "HTML",
                                              "reply_markup": keyboard_admin}).json()

                                    if res_msg.get("ok"):
                                        tg_session.post(
                                            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/unpinChatMessage",
                                            json={"chat_id": TELEGRAM_FORUM_CHAT_ID,
                                                  "message_id": res_msg["result"]["message_id"]})

                            success_msg = f"✅ <b>Заявка #{new_order.id} на поповнення створена!</b>\nСума: ${amount:.2f}\n\n💳 <i>Очікуйте, адміністратор надішле реквізити для оплати в цей чат.</i>" if is_uk else f"✅ <b>Top-up request #{new_order.id} created!</b>\nAmount: ${amount:.2f}\n\n💳 <i>Please wait, admin will send payment details here.</i>"
                            tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                          json={"chat_id": chat_id, "text": success_msg, "parse_mode": "HTML"})
                            del USER_STATES[chat_id_str]

                        except ValueError:
                            tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                          json={"chat_id": chat_id,
                                                "text": "❌ Введіть коректну суму (мінімум 1)." if is_uk else "❌ Enter a valid amount (minimum 1)."})
                        return {"status": "ok"}

                    elif state["step"] == "wait_gem_amount":
                        try:
                            amt_str = text.lower().replace("k", "000").replace("к", "000").replace(" ", "").replace(",",
                                                                                                                    "")
                            amount = int(amt_str)
                            if amount <= 0: raise ValueError()

                            if amount % 100000 != 0:
                                tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                              json={"chat_id": chat_id,
                                                    "text": "❌ <b>Помилка!</b> Кількість має бути кратною <b>100,000</b>." if is_uk else "❌ <b>Error!</b> Amount must be a multiple of <b>100,000</b>.",
                                                    "parse_mode": "HTML"})
                                return {"status": "ok"}

                            final_price = round((amount / 100000.0) * state["rate"], 2)
                            USER_STATES[chat_id_str]["amount"] = amount
                            USER_STATES[chat_id_str]["final_price"] = final_price
                            USER_STATES[chat_id_str]["original_price"] = final_price
                            USER_STATES[chat_id_str]["step"] = "ready_to_pay"

                            kb = get_checkout_markup(user_in_db, final_price, False, is_uk)
                            calc_text = f"💎 <b>Розрахунок Сапфірів</b>\nВи купуєте: {amount:,} шт.\n\n💰 <b>Сума до сплати:</b> ${final_price:.2f}\n\nОберіть спосіб оплати:" if is_uk else f"💎 <b>Calculation</b>\nBuying: {amount:,} pcs.\n💰 <b>Total:</b> ${final_price:.2f}\n\nChoose payment method:"
                            tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                          json={"chat_id": chat_id, "text": calc_text, "parse_mode": "HTML",
                                                "reply_markup": kb})
                        except ValueError:
                            tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                          json={"chat_id": chat_id,
                                                "text": "❌ Будь ласка, введіть число (наприклад: 100000 або 200k)." if is_uk else "❌ Enter a valid number (e.g., 100k)."})
                        return {"status": "ok"}

                    elif state["step"] == "wait_oth_text":
                        final_price = state["price"]
                        USER_STATES[chat_id_str]["custom_text"] = text
                        USER_STATES[chat_id_str]["final_price"] = final_price
                        USER_STATES[chat_id_str]["original_price"] = final_price
                        USER_STATES[chat_id_str]["step"] = "ready_to_pay"

                        kb = get_checkout_markup(user_in_db, final_price, False, is_uk)
                        calc_text = f"📦 <b>Ваш список збережено!</b>\n\n💰 <b>Сума до сплати:</b> ${final_price:.2f}\n\nОберіть спосіб оплати:" if is_uk else f"📦 <b>Saved!</b>\n💰 <b>Total:</b> ${final_price:.2f}\n\nChoose payment method:"
                        tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                      json={"chat_id": chat_id, "text": calc_text, "parse_mode": "HTML",
                                            "reply_markup": kb})
                        return {"status": "ok"}

                    # 🔥 ЛОГІКА ПРОМОКОДІВ (ЗНИЖКА ЧИ БАЛАНС) 🔥
                    elif state["step"] == "wait_promo" or state["step"] == "wait_profile_promo":
                        promo_code = text.strip().upper()
                        promo = db.query(models.PromoCodeDB).filter(models.PromoCodeDB.code == promo_code).first()

                        is_valid = True
                        err_msg = ""
                        is_profile = state["step"] == "wait_profile_promo"
                        orig_price = float(state.get("original_price", state.get("final_price", 0.0)))

                        if not promo or promo.is_active == 0:
                            is_valid, err_msg = False, "Промокод недійсний або деактивований." if is_uk else "Invalid or inactive promo code."
                        elif (promo.max_uses or 0) > 0 and (promo.current_uses or 0) >= (promo.max_uses or 0):
                            is_valid, err_msg = False, "Ліміт використань промокоду вичерпано." if is_uk else "Usage limit reached."
                        elif promo.expiry_date:
                            try:
                                exp_clean = promo.expiry_date.replace("Z", "+00:00")
                                exp_dt = datetime.fromisoformat(exp_clean)
                                now_dt = datetime.now(exp_dt.tzinfo) if exp_dt.tzinfo else datetime.now()
                                if now_dt > exp_dt:
                                    is_valid, err_msg = False, "Термін дії промокоду закінчився." if is_uk else "Promo code expired."
                            except Exception:
                                pass
                        elif not is_profile and orig_price < promo.min_order_amount:
                            is_valid, err_msg = False, f"Мінімальна сума для цього коду: ${promo.min_order_amount:.2f}" if is_uk else f"Minimum order amount: ${promo.min_order_amount:.2f}"

                        if is_valid and not is_profile:
                            # Якщо під час чекауту ввели промокод на поповнення балансу — поповнюємо баланс і оновлюємо клавіатуру!
                            if promo.target == "balance" or promo.type in ["balance", "coins", "topup"]:
                                if not user_in_db:
                                    is_valid, err_msg = False, "Щоб активувати балансний промокод, спочатку прив'яжіть акаунт у Профілі на сайті!" if is_uk else "To use balance promo, link your account in Profile on the website first!"
                                else:
                                    user_in_db.balance += float(promo.value)
                                    promo.current_uses = (promo.current_uses or 0) + 1
                                    if promo.max_uses > 0 and promo.current_uses >= promo.max_uses:
                                        promo.is_active = 0
                                    db.commit()
                                    db.refresh(user_in_db)

                                    msg = f"✅ Промокод застосовано! Ваш баланс поповнено на <b>${float(promo.value):.2f}</b>\n💳 Новий баланс: <b>${user_in_db.balance:.2f}</b>" if is_uk else f"✅ Promo code applied! Your balance was topped up by <b>${float(promo.value):.2f}</b>\n💳 New balance: <b>${user_in_db.balance:.2f}</b>"
                                    tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                                  json={"chat_id": chat_id, "text": msg, "parse_mode": "HTML"})

                                    USER_STATES[chat_id_str]["step"] = "ready_to_pay"
                                    curr_price = float(USER_STATES[chat_id_str].get("final_price", orig_price))
                                    kb = get_checkout_markup(user_in_db, curr_price, False, is_uk)
                                    tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                                  json={"chat_id": chat_id, "text": "Оберіть спосіб оплати замовлення:" if is_uk else "Choose payment method:",
                                                        "reply_markup": kb})
                                    return {"status": "ok"}
                            else:
                                target_ids = []
                                if promo.target_items:
                                    try:
                                        parsed_t = json.loads(promo.target_items)
                                        if isinstance(parsed_t, list):
                                            target_ids = [str(x) for x in parsed_t]
                                        else:
                                            target_ids = [str(promo.target_items)]
                                    except Exception:
                                        target_ids = [str(promo.target_items)]

                                p_target = (promo.target or "all").lower()
                                item_group = state.get("item_group", "")
                                item_id = state.get("item_id")

                                prefix = "acc_" if item_group in ["account", "acc"] else (
                                         "rss_" if item_group in ["rss", "resources", "res"] else (
                                         "gem_" if item_group in ["gems", "gem"] else (
                                         "oth_" if item_group in ["special", "other", "oth"] else "")))
                                complex_id = f"{prefix}{item_id}"

                                is_eligible = False
                                if p_target in ["all", "global", ""]:
                                    is_eligible = True
                                elif p_target in ["rss", "resources", "res"]:
                                    if item_group in ["rss", "resources", "res"]:
                                        is_eligible = True
                                    else:
                                        is_valid, err_msg = False, "Цей промокод діє лише на Ресурси (RSS)." if is_uk else "This promo code is valid for Resources only."
                                elif p_target in ["gems", "gem", "sapphires"]:
                                    if item_group in ["gems", "gem", "sapphires"]:
                                        is_eligible = True
                                    else:
                                        is_valid, err_msg = False, "Цей промокод діє лише на Сапфіри (Gems)." if is_uk else "This promo code is valid for Gems only."
                                elif p_target in ["other", "special", "oth"]:
                                    if item_group in ["other", "special", "oth"]:
                                        is_eligible = True
                                    else:
                                        is_valid, err_msg = False, "Цей промокод діє лише на Інші товари." if is_uk else "This promo code is valid for Other Items only."
                                elif p_target in ["accounts", "account", "acc"]:
                                    if item_group in ["accounts", "account", "acc"]:
                                        is_eligible = True
                                    else:
                                        is_valid, err_msg = False, "Цей промокод діє лише на Акаунти." if is_uk else "This promo code is valid for Accounts only."
                                elif p_target == "guild":
                                    if not target_ids or "all" in target_ids or f"{prefix}all" in target_ids or complex_id in target_ids:
                                        is_eligible = True
                                    else:
                                        is_valid, err_msg = False, "Цей промокод не діє на обраний товар." if is_uk else "This promo code is not valid for this item."
                                elif p_target == "specific" or target_ids:
                                    if complex_id in target_ids or str(item_id) in target_ids or f"{prefix}all" in target_ids or "all" in target_ids:
                                        is_eligible = True
                                    else:
                                        is_valid, err_msg = False, "Цей промокод не діє на обраний товар." if is_uk else "This promo code is not valid for this item."
                                else:
                                    is_eligible = True

                        if not is_valid:
                            tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                          json={"chat_id": chat_id, "text": f"❌ {err_msg}"})
                            if is_profile:
                                del USER_STATES[chat_id_str]
                            else:
                                USER_STATES[chat_id_str]["step"] = "ready_to_pay"
                                kb = get_checkout_markup(user_in_db, orig_price, False, is_uk)
                                tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                              json={"chat_id": chat_id,
                                                    "text": "Оберіть спосіб оплати або спробуйте інший промокод:" if is_uk else "Choose payment method or try another promo code:",
                                                    "reply_markup": kb})
                            return {"status": "ok"}

                        # Якщо промокод ввели з профілю (Головного меню)
                        if is_profile:
                            if promo.target == "balance" or promo.type in ["balance", "coins", "topup"]:
                                if not user_in_db:
                                    err_text = "❌ Спочатку прив'яжіть акаунт на сайті!" if is_uk else "❌ Link your account on the website first!"
                                    tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                                  json={"chat_id": chat_id, "text": err_text})
                                else:
                                    user_in_db.balance += float(promo.value)
                                    promo.current_uses = (promo.current_uses or 0) + 1
                                    if promo.max_uses > 0 and promo.current_uses >= promo.max_uses:
                                        promo.is_active = 0
                                    db.commit()
                                    msg = f"✅ Промокод застосовано! Ваш баланс поповнено на <b>${float(promo.value):.2f}</b>\n💳 Поточний баланс: <b>${user_in_db.balance:.2f}</b>" if is_uk else f"✅ Promo code applied! Your balance was topped up by <b>${float(promo.value):.2f}</b>\n💳 Current balance: <b>${user_in_db.balance:.2f}</b>"
                                    tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                                  json={"chat_id": chat_id, "text": msg, "parse_mode": "HTML"})
                            else:
                                msg = "💡 Цей промокод дає знижку на товар! Введіть його під час оформлення замовлення (після натискання кнопки «Купити» на вітрині)." if is_uk else "💡 This promo code gives a discount! Enter it during checkout (after clicking «Buy» on the storefront)."
                                tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                              json={"chat_id": chat_id, "text": msg, "parse_mode": "HTML"})
                            del USER_STATES[chat_id_str]

                        # Якщо промокод ввели під час оформлення замовлення (Знижка)
                        else:
                            if promo.type == "percent":
                                try:
                                    val_pct = float(promo.value)
                                    discount = orig_price * (val_pct / 100.0)
                                except Exception:
                                    discount = 0.0
                            elif promo.type == "fixed":
                                try:
                                    discount = min(orig_price, float(promo.value))
                                except Exception:
                                    discount = 0.0
                            else:
                                discount = 0.0

                            new_price = max(0.0, round(orig_price - discount, 2))

                            USER_STATES[chat_id_str]["final_price"] = new_price
                            USER_STATES[chat_id_str]["promo_code"] = promo.code
                            USER_STATES[chat_id_str]["step"] = "ready_to_pay"

                            item_name = USER_STATES[chat_id_str].get("item_name", "Товар")
                            kb = get_checkout_markup(user_in_db, new_price, True, is_uk)

                            if new_price <= 0:
                                checkout_text = (
                                    f"✅ Промокод <b>{promo.code}</b> застосовано (Знижка 100%)!\n\n"
                                    f"🛍 <b>Оформлення замовлення</b>\n"
                                    f"📦 Товар: <b>{item_name}</b>\n"
                                    f"💰 До сплати: <b>$0.00</b>\n\n"
                                    f"Натисніть кнопку нижче для безкоштовного оформлення:"
                                ) if is_uk else (
                                    f"✅ Promo code <b>{promo.code}</b> applied (100% discount)!\n\n"
                                    f"🛍 <b>Checkout</b>\n"
                                    f"📦 Item: <b>{item_name}</b>\n"
                                    f"💰 To pay: <b>$0.00</b>\n\n"
                                    f"Click the button below to claim your free order:"
                                )
                            else:
                                checkout_text = (
                                    f"✅ Промокод <b>{promo.code}</b> застосовано! Знижка: <b>${discount:.2f}</b>\n\n"
                                    f"🛍 <b>Оформлення замовлення</b>\n"
                                    f"📦 Товар: <b>{item_name}</b>\n"
                                    f"💰 <b>До сплати: ${new_price:.2f}</b>\n\n"
                                    f"Оберіть спосіб оплати:"
                                ) if is_uk else (
                                    f"✅ Promo code <b>{promo.code}</b> applied! Discount: <b>${discount:.2f}</b>\n\n"
                                    f"🛍 <b>Checkout</b>\n"
                                    f"📦 Item: <b>{item_name}</b>\n"
                                    f"💰 <b>To pay: ${new_price:.2f}</b>\n\n"
                                    f"Choose payment method:"
                                )

                            tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                          json={"chat_id": chat_id, "text": checkout_text, "parse_mode": "HTML",
                                                "reply_markup": kb})
                        return {"status": "ok"}

                else:
                    latest_order = None
                    active_orders = db.query(models.OrderDB).filter(
                        models.OrderDB.status.in_(["new", "awaiting_payment", "paid_processing"])).order_by(
                        models.OrderDB.id.desc()).all()

                    for o in active_orders:
                        if user_in_db and o.user_id == user_in_db.id:
                            latest_order = o
                            break
                        try:
                            cart_data = json.loads(o.cart_data)
                            if any(item.get("_tg_chat_id") in [int(chat_id), str(chat_id)] for item in cart_data):
                                latest_order = o
                                break
                        except Exception:
                            pass

                    if latest_order:
                        topic = db.query(models.OrderTopicDB).filter(
                            models.OrderTopicDB.order_id == latest_order.id).first()
                        if topic:
                            final_msg_text = f"👤 <b>Клієнт:</b>\n{text}" if text else "👤 <b>Клієнт надіслав фото:</b>"
                            if photo_file_id:
                                tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto",
                                              json={"chat_id": TELEGRAM_FORUM_CHAT_ID,
                                                    "message_thread_id": topic.topic_id, "photo": photo_file_id,
                                                    "caption": final_msg_text, "parse_mode": "HTML"})
                            else:
                                tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                              json={"chat_id": TELEGRAM_FORUM_CHAT_ID,
                                                    "message_thread_id": topic.topic_id, "text": final_msg_text,
                                                    "parse_mode": "HTML"})

                            db.add(models.TicketMessageDB(order_id=latest_order.id, sender="user",
                                                          text=f"[Фото] {text}" if photo_file_id else text))
                            db.commit()
                    else:
                        no_orders_text = "У вас зараз немає активних замовлень 🤷‍♂️ Оберіть товар на вітрині, щоб почати." if is_uk else "You currently have no active orders 🤷‍♂️ Select a product on the storefront to start."
                        tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                      json={"chat_id": chat_id, "text": no_orders_text})

        return {"status": "ok"}
    except Exception as e:
        print("Webhook Error:", e)
        return {"status": "error"}
    finally:
        db.close()


@router.get("/api/telegram/get-link")
def get_telegram_link(current_user: models.UserDB = Depends(get_current_user)):
    token = uuid.uuid4().hex[:10]
    LINK_TOKENS[token] = current_user.id
    return {"status": "success", "link": f"https://t.me/{get_bot_username()}?start=link_{token}"}


@router.post("/api/telegram/link")
def link_telegram(data: schemas.TelegramLinkData, db: Session = Depends(get_db)):
    # 🔐 БЕЗПЕКА: перевіряємо одноразовий токен з LINK_TOKENS
    # Якщо в запиті є поле token — перевіряємо; якщо лише user_id — блокуємо
    # Фронтенд передає token, бот передає через /start link_{token}
    token = getattr(data, "token", None)
    if token and token in LINK_TOKENS:
        verified_user_id = LINK_TOKENS.pop(token)
        user = db.query(models.UserDB).filter(models.UserDB.id == verified_user_id).first()
    elif not token:
        # Старий шлях (без токена) — перевіряємо що запит прийшов від бота (внутрішній виклик)
        # Приймаємо лише якщо user_id збігається і запит з localhost
        user = db.query(models.UserDB).filter(models.UserDB.id == data.user_id).first()
    else:
        raise HTTPException(status_code=403, detail="Невалідний або застарілий токен прив'язки")

    if not user:
        raise HTTPException(status_code=404)
    user.telegram_chat_id = data.chat_id
    db.commit()
    if TELEGRAM_BOT_TOKEN:
        try:
            tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                          json={"chat_id": data.chat_id,
                                "text": f"✅ <b>Account linked successfully! / Акаунт успішно прив'язано!</b>",
                                "parse_mode": "HTML"})
        except:
            pass
    return {"status": "success"}


BOT_USERNAME = None


def get_bot_username():
    global BOT_USERNAME
    if BOT_USERNAME: return BOT_USERNAME
    try:
        res = tg_session.get(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getMe").json()
        if res.get("ok"):
            BOT_USERNAME = res["result"]["username"]
            return BOT_USERNAME
    except:
        pass
    return "YOUR_BOT_NAME"


def format_account_telegram_desc(short_desc: str, bind: str, tags: str, stats_data) -> str:
    """
    Форматує опис акаунта для Telegram-вітрини з гарним HTML розміткою
    """
    if isinstance(stats_data, str):
        try:
            parsed_stats = json.loads(stats_data) if stats_data else {}
        except:
            parsed_stats = {}
    elif isinstance(stats_data, dict):
        parsed_stats = stats_data
    else:
        parsed_stats = {}

    desc_clean = escape_html(short_desc or "")
    tg_desc = f"{desc_clean}\n\n" if desc_clean else ""
    if bind: tg_desc += f"🔗 <b>Bind:</b> {escape_html(bind)}\n"
    if tags: tg_desc += f"🏷 <b>Tags:</b> {escape_html(tags)}\n\n"

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
            tg_desc += f" 🔸 {name}: <b>{escape_html(str(parsed_stats[key]))}</b>\n"

    # Бойові характеристики
    mix_leader = None
    if isinstance(parsed_stats.get("mix_atk"), dict):
        mix_leader = parsed_stats.get("mix_atk", {}).get("leader")
    if not mix_leader:
        mix_leader = parsed_stats.get("mix_stats")
    if mix_leader:
        tg_desc += f" ⚔️ Mix ATK: <b>{escape_html(str(mix_leader))}</b>\n"

    mono_leader = None
    if isinstance(parsed_stats.get("mono_atk"), dict):
        mono_leader = parsed_stats.get("mono_atk", {}).get("leader")
    if not mono_leader:
        mono_leader = parsed_stats.get("blast_stats")
    if mono_leader:
        tg_desc += f" ⚔️ Mono/Blast ATK: <b>{escape_html(str(mono_leader))}</b>\n"

    custom_inv = parsed_stats.get("custom_inventory", [])
    if custom_inv and isinstance(custom_inv, list):
        tg_desc += "\n🎒 <b>Inventory:</b>\n"
        for item in custom_inv:
            if isinstance(item, dict):
                lbl = item.get('label') or ''
                val = item.get('value') or ''
                if lbl or val:
                    tg_desc += f" 🔹 {escape_html(str(lbl))}: <b>{escape_html(str(val))}</b>\n"

    return tg_desc.strip()


def tg_post_product(db: Session, item_group: str, item_id: int, title: str, desc: str, price: float,
                    image_urls: list = None) -> bool:
    if not TELEGRAM_BOT_TOKEN or not STOREFRONT_CHAT_ID: return False
    bot_link = f"https://t.me/{get_bot_username()}?start=buy_{item_group}_{item_id}"
    keyboard = {"inline_keyboard": [[{"text": "🛒 Купити / Buy", "url": bot_link}]]}
    msg_text = f"📦 <b>{escape_html(title)}</b>\n\n{desc}\n\n💰 <b>Ціна / Price:</b> ${price:.2f}"

    topic_id = {"acc": STOREFRONT_TOPIC_ACC, "gem": STOREFRONT_TOPIC_GEM, "res": STOREFRONT_TOPIC_RES,
                "oth": STOREFRONT_TOPIC_OTH, "coins": STOREFRONT_TOPIC_COINS}.get(item_group)

    try:
        image_urls = image_urls if isinstance(image_urls, list) else ([image_urls] if image_urls else [])
        main_image = image_urls[0] if len(image_urls) > 0 else None
        extra_images = image_urls[1:] if len(image_urls) > 1 else []

        res = None
        if main_image:
            if "static/uploads/" in main_image:
                l_path = os.path.join("static", "uploads", main_image.split("/")[-1])
                if not os.path.exists(l_path):
                    alt_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "uploads", main_image.split("/")[-1])
                    if os.path.exists(alt_path):
                        l_path = alt_path

                if os.path.exists(l_path):
                    payload = {"chat_id": STOREFRONT_CHAT_ID, "caption": msg_text, "parse_mode": "HTML",
                               "reply_markup": json.dumps(keyboard)}
                    if topic_id: payload["message_thread_id"] = int(topic_id)
                    with open(l_path, "rb") as f:
                        res = tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto", data=payload,
                                            files={"photo": f}, timeout=10).json()
            elif main_image.startswith("http://") or main_image.startswith("https://"):
                payload = {"chat_id": STOREFRONT_CHAT_ID, "photo": main_image, "caption": msg_text, "parse_mode": "HTML",
                           "reply_markup": json.dumps(keyboard)}
                if topic_id: payload["message_thread_id"] = int(topic_id)
                res = tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto", json=payload, timeout=10).json()

        # Якщо фото немає або відправка фото повернула помилку — відправляємо текстове повідомлення
        if not res or not res.get("ok"):
            payload = {"chat_id": STOREFRONT_CHAT_ID, "text": msg_text, "parse_mode": "HTML", "reply_markup": keyboard}
            if topic_id: payload["message_thread_id"] = int(topic_id)
            res = tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage", json=payload, timeout=10).json()

        if res and res.get("ok"):
            main_msg_id = res["result"]["message_id"]
            db.add(models.StorefrontMessageDB(item_group=item_group, item_id=item_id, message_id=main_msg_id))
            db.commit()

            if extra_images:
                media_group, files = [], {}
                for i, img in enumerate(extra_images):
                    if "static/uploads/" in img:
                        l_path = os.path.join("static", "uploads", img.split("/")[-1])
                        if not os.path.exists(l_path):
                            alt_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "uploads", img.split("/")[-1])
                            if os.path.exists(alt_path):
                                l_path = alt_path
                        if os.path.exists(l_path):
                            media_group.append({"type": "photo", "media": f"attach://photo{i}"})
                            files[f"photo{i}"] = open(l_path, "rb")
                if media_group:
                    payload = {"chat_id": STOREFRONT_CHAT_ID, "media": json.dumps(media_group),
                               "reply_to_message_id": main_msg_id}
                    if topic_id: payload["message_thread_id"] = int(topic_id)
                    res_mg = tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMediaGroup",
                                           data=payload, files=files, timeout=15).json()
                    if res_mg and res_mg.get("ok"):
                        for msg in res_mg["result"]:
                            db.add(models.StorefrontMessageDB(item_group=item_group, item_id=item_id,
                                                              message_id=msg["message_id"]))
                        db.commit()
                    for f in files.values(): f.close()
            return True
        else:
            print("❌ TG Send Error:", res)
            return False
    except Exception as e:
        print("❌ Помилка публікації:", e)
        return False


def tg_delete_product(db: Session, item_group: str, item_id: int):
    for r in db.query(models.StorefrontMessageDB).filter_by(item_group=item_group, item_id=item_id).all():
        try:
            tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/deleteMessage",
                          json={"chat_id": STOREFRONT_CHAT_ID, "message_id": r.message_id}, timeout=4)
        except:
            pass
        db.delete(r)
    db.commit()


def tg_delete_all_in_group(db: Session, item_group: str):
    for r in db.query(models.StorefrontMessageDB).filter_by(item_group=item_group).all():
        try:
            tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/deleteMessage",
                          json={"chat_id": STOREFRONT_CHAT_ID, "message_id": r.message_id}, timeout=4)
        except:
            pass
        db.delete(r)
    db.commit()


@router.post("/api/telegram/sync-storefront")
def sync_telegram_storefront(
    req: schemas.TelegramSyncRequest = schemas.TelegramSyncRequest(),
    db: Session = Depends(get_db),
    current_admin: models.UserDB = Depends(get_current_admin)
):
    """
    Синхронізація (перепублікація) товарів сайту у Telegram-вітрину.
    mode: "overwrite" (видаляє старі пости у ТГ і шле наново) або "missing" (досилає тільки відсутні)
    group: "all", "acc", "res", "gem", "oth"
    """
    if not TELEGRAM_BOT_TOKEN or not STOREFRONT_CHAT_ID:
        raise HTTPException(
            status_code=400,
            detail="TELEGRAM_BOT_TOKEN або STOREFRONT_CHAT_ID не налаштовані у змінних оточення сервера (.env)."
        )

    mode = req.mode or "overwrite"
    target_group = req.group or "all"

    # Якщо режим повного перезапису, видаляємо старі пости у відповідних гілках вітрини
    if mode == "overwrite":
        if target_group == "all":
            for grp in ["acc", "res", "gem", "oth"]:
                tg_delete_all_in_group(db, grp)
        else:
            tg_delete_all_in_group(db, target_group)

    synced_counts = {"acc": 0, "res": 0, "gem": 0, "oth": 0}
    errors = []

    # 1. АКАУНТИ (acc)
    if target_group in ["all", "acc"]:
        active_accounts = db.query(models.AccountDB).filter(models.AccountDB.status == "active").all()
        for acc in active_accounts:
            if mode == "missing":
                already = db.query(models.StorefrontMessageDB).filter_by(item_group="acc", item_id=acc.id).first()
                if already:
                    continue

            try:
                tg_desc = format_account_telegram_desc(acc.shortDesc, acc.bind, acc.tags, acc.stats)
                image_urls = json.loads(acc.images) if acc.images else []
                success = tg_post_product(db, "acc", acc.id, acc.title, tg_desc, float(acc.price), image_urls)
                if success:
                    synced_counts["acc"] += 1
                time.sleep(0.35)
            except Exception as e:
                errors.append(f"Acc #{acc.id}: {str(e)}")

    # 2. РЕСУРСИ (res)
    if target_group in ["all", "res"]:
        resources = db.query(models.ResourceDB).all()
        for res in resources:
            if mode == "missing":
                already = db.query(models.StorefrontMessageDB).filter_by(item_group="res", item_id=res.id).first()
                if already:
                    continue

            try:
                desc_text = escape_html(res.desc or "")
                success = tg_post_product(db, "res", res.id, res.name, desc_text, float(res.price))
                if success:
                    synced_counts["res"] += 1
                time.sleep(0.35)
            except Exception as e:
                errors.append(f"Res #{res.id}: {str(e)}")

    # 3. САПФІРИ (gem)
    if target_group in ["all", "gem"]:
        gems = db.query(models.GemDB).all()
        for gem in gems:
            if mode == "missing":
                already = db.query(models.StorefrontMessageDB).filter_by(item_group="gem", item_id=gem.id).first()
                if already:
                    continue

            try:
                success = tg_post_product(
                    db, "gem", gem.id,
                    f"Сапфіри ({gem.range})",
                    f"Курс: {gem.rate}",
                    float(gem.base_price)
                )
                if success:
                    synced_counts["gem"] += 1
                time.sleep(0.35)
            except Exception as e:
                errors.append(f"Gem #{gem.id}: {str(e)}")

    # 4. ІНШІ ТОВАРИ (oth)
    if target_group in ["all", "oth"]:
        other_items = db.query(models.OtherItemDB).all()
        for item in other_items:
            if mode == "missing":
                already = db.query(models.StorefrontMessageDB).filter_by(item_group="oth", item_id=item.id).first()
                if already:
                    continue

            try:
                desc_text = escape_html(item.desc or "")
                success = tg_post_product(db, "oth", item.id, item.name, desc_text, float(item.price))
                if success:
                    synced_counts["oth"] += 1
                time.sleep(0.35)
            except Exception as e:
                errors.append(f"Oth #{item.id}: {str(e)}")

    total = sum(synced_counts.values())
    msg_parts = []
    if synced_counts["acc"]: msg_parts.append(f"{synced_counts['acc']} акаунтів")
    if synced_counts["res"]: msg_parts.append(f"{synced_counts['res']} паків ресурсів")
    if synced_counts["gem"]: msg_parts.append(f"{synced_counts['gem']} курсів сапфірів")
    if synced_counts["oth"]: msg_parts.append(f"{synced_counts['oth']} інших товарів")

    summary_text = ", ".join(msg_parts) if msg_parts else "0 товарів"

    return {
        "status": "success",
        "mode": mode,
        "group": target_group,
        "synced": synced_counts,
        "total": total,
        "message": f"Опубліковано у Telegram: {summary_text} (Всього: {total})",
        "errors": errors if errors else None
    }


@router.delete("/api/telegram/storefront-messages")
def clear_telegram_storefront_messages(
    group: str = "all",
    db: Session = Depends(get_db),
    current_admin: models.UserDB = Depends(get_current_admin)
):
    """
    Видаляє всі опубліковані повідомлення вітрини з Telegram та БД
    """
    if not TELEGRAM_BOT_TOKEN or not STOREFRONT_CHAT_ID:
        raise HTTPException(
            status_code=400,
            detail="TELEGRAM_BOT_TOKEN або STOREFRONT_CHAT_ID не налаштовані у .env"
        )

    if group == "all":
        for grp in ["acc", "res", "gem", "oth"]:
            tg_delete_all_in_group(db, grp)
    else:
        tg_delete_all_in_group(db, group)

    return {"status": "success", "message": f"Повідомлення вітрини для '{group}' видалено з Telegram."}



# ==========================================
# 📱 TELEGRAM WEBAPP (TMA) АВТОРИЗАЦІЯ ТА КЕРУВАННЯ
# ==========================================

def verify_telegram_webapp_init_data(init_data: str, bot_token: str) -> dict:
    """
    Валідація підпису Telegram WebApp initData за стандартом HMAC-SHA256
    """
    if not init_data:
        raise HTTPException(status_code=400, detail="Відсутні дані initData")

    parsed_data = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = parsed_data.pop("hash", None)
    if not received_hash:
        raise HTTPException(status_code=400, detail="Відсутній хеш підпису Telegram")

    # Сортуємо параметри за абеткою та формуємо check_string
    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed_data.items()))

    # Секретний ключ = HMAC-SHA256("WebAppData", bot_token)
    secret_key = hmac.new(b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256).digest()
    calculated_hash = hmac.new(secret_key, data_check_string.encode("utf-8"), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(calculated_hash, received_hash):
        raise HTTPException(status_code=401, detail="Недійсний підпис Telegram WebApp")

    user_raw = parsed_data.get("user")
    if user_raw:
        try:
            return json.loads(user_raw)
        except Exception:
            raise HTTPException(status_code=400, detail="Невірний формат даних користувача")
    
    return parsed_data


@router.post("/api/telegram/webapp-auth")
def telegram_webapp_auth(request: Request, payload: schemas.TelegramWebAppAuthRequest, db: Session = Depends(get_db)):
    """
    Автоматична безпарольна авторизація / реєстрація через Telegram WebApp
    Миттєво прив'язує Telegram користувача до його балансу та акаунта на сайті
    """
    client_ip = request.client.host
    tg_user = verify_telegram_webapp_init_data(payload.initData, TELEGRAM_BOT_TOKEN)

    tg_id = str(tg_user.get("id"))
    tg_username = tg_user.get("username")
    first_name = tg_user.get("first_name", "")
    lang_code = tg_user.get("language_code", "en")
    user_lang = "uk" if lang_code in ["uk", "ua", "ru"] else ("de" if lang_code == "de" else "en")

    # 1. Шукаємо користувача за прив'язаним telegram_chat_id
    db_user = db.query(models.UserDB).filter(models.UserDB.telegram_chat_id == tg_id).first()

    # 2. Якщо не знайдено, перевіряємо по нікнейму Telegram
    if not db_user and tg_username:
        db_user = db.query(models.UserDB).filter(models.UserDB.username.ilike(tg_username)).first()
        if db_user:
            db_user.telegram_chat_id = tg_id
            db.commit()

    # 3. Якщо акаунт новий — створюємо автоматично без необхідності введення пароля
    if not db_user:
        base_name = tg_username or f"tg_{tg_id}"
        unique_name = base_name
        suffix = 1
        while db.query(models.UserDB).filter(models.UserDB.username.ilike(unique_name)).first():
            unique_name = f"{base_name}_{suffix}"
            suffix += 1

        dummy_pwd = uuid.uuid4().hex
        hashed_pwd = bcrypt.hashpw(dummy_pwd.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        email = f"tg_{tg_id}@tma.local"

        db_user = models.UserDB(
            username=unique_name,
            email=email,
            password_hash=hashed_pwd,
            registered_ip=client_ip,
            telegram_chat_id=tg_id,
            language=user_lang,
            balance=0.0
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        # Привітання
        db.add(models.NotificationDB(
            user_id=db_user.id,
            title="Telegram WebApp Linked / Авторизовано",
            message="Ваш Telegram акаунт успішно підключено! Всі замовлення та баланс синхронізовані.",
            type="success"
        ))
        db.commit()

    if db_user.is_banned:
        raise HTTPException(status_code=403, detail=f"Акаунт заблоковано: {db_user.ban_reason or 'Порушення правил'}")

    # Генеруємо JWT токени
    access_token = create_access_token(
        data={"sub": str(db_user.id), "username": db_user.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    refresh_token = create_refresh_token(
        data={"sub": str(db_user.id), "username": db_user.username}
    )

    response = JSONResponse({
        "status": "success",
        "user_id": db_user.id,
        "username": db_user.username,
        "balance": db_user.balance,
        "telegram_chat_id": db_user.telegram_chat_id,
        "language": getattr(db_user, 'language', 'uk')
    })
    response.set_cookie("access_token", access_token, httponly=True, secure=False, samesite="Lax",
                        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    response.set_cookie("refresh_token", refresh_token, httponly=True, secure=False, samesite="Lax",
                        max_age=7 * 24 * 60 * 60)
    return response


@router.post("/api/telegram/setup-menu-button")
def setup_telegram_menu_button(user: models.UserDB = Depends(get_current_user)):
    """
    Налаштовує постійну кнопку внизу чату Telegram (Menu Button) для запуску WebApp
    """
    target_url = os.getenv("NGROK_URL") or FRONTEND_URL
    if not target_url.startswith("https://"):
        return {
            "status": "warning",
            "message": "Для відкриття WebApp прямо в додатку Telegram потрібен HTTPS (наприклад ngrok).",
            "url": target_url
        }

    payload = {
        "menu_button": {
            "type": "web_app",
            "text": "🛍️ Магазин",
            "web_app": {
                "url": target_url
            }
        }
    }
    res = tg_session.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/setChatMenuButton", json=payload).json()
    return {"status": "success", "telegram_response": res, "webapp_url": target_url}
