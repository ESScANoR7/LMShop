import os
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
import sqlite3
import pymysql
from sqlalchemy import create_engine
import models
from database import Base

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SQLITE_PATH = os.path.join(BASE_DIR, "lords_shop.db")

MYSQL_USER = "root"
MYSQL_PASSWORD = "zxc1"
MYSQL_HOST = "localhost"
MYSQL_PORT = 3306
MYSQL_DB = "ALTLM"

def run_migration():
    print("🚀 Початок міграції з SQLite в MySQL ALTLM...")
    
    # 1. Створюємо БД ALTLM якщо немає
    conn_raw = pymysql.connect(host=MYSQL_HOST, user=MYSQL_USER, password=MYSQL_PASSWORD, port=MYSQL_PORT)
    with conn_raw.cursor() as cur:
        cur.execute(f"CREATE DATABASE IF NOT EXISTS {MYSQL_DB} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
    conn_raw.close()
    print(f"✅ База даних {MYSQL_DB} перевірена/створена.")

    # 2. Створюємо таблиці в MySQL через SQLAlchemy
    mysql_url = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}?charset=utf8mb4"
    mysql_engine = create_engine(mysql_url)
    Base.metadata.create_all(bind=mysql_engine)
    print("✅ Всі таблиці створено в MySQL.")

    # 3. Читаємо дані з SQLite
    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()

    # Отримуємо всі таблиці з SQLite
    sqlite_cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = [row['name'] for row in sqlite_cur.fetchall()]
    print(f"📦 Знайдено таблиць в SQLite: {tables}")

    mysql_conn = pymysql.connect(
        host=MYSQL_HOST, user=MYSQL_USER, password=MYSQL_PASSWORD, port=MYSQL_PORT, database=MYSQL_DB,
        charset='utf8mb4', autocommit=False
    )
    mysql_cur = mysql_conn.cursor()

    # Вимикаємо перевірку Foreign Keys для імпорту
    mysql_cur.execute("SET FOREIGN_KEY_CHECKS = 0;")

    for table in tables:
        sqlite_cur.execute(f"SELECT * FROM `{table}`")
        rows = sqlite_cur.fetchall()
        if not rows:
            print(f"  ℹ️ {table}: порожня таблиця, пропуск.")
            continue

        columns = [col[0] for col in sqlite_cur.description]
        col_names = ", ".join([f"`{c}`" for c in columns])
        placeholders = ", ".join(["%s"] * len(columns))

        # Очищуємо таблицю перед імпортом
        mysql_cur.execute(f"TRUNCATE TABLE `{table}`")

        insert_sql = f"INSERT INTO `{table}` ({col_names}) VALUES ({placeholders})"
        data_to_insert = []
        for r in rows:
            data_to_insert.append(tuple(r))

        mysql_cur.executemany(insert_sql, data_to_insert)
        print(f"  ✅ {table}: імпортовано {len(data_to_insert)} записів.")

    mysql_cur.execute("SET FOREIGN_KEY_CHECKS = 1;")
    mysql_conn.commit()

    mysql_conn.close()
    sqlite_conn.close()
    print("🎉 Міграція успішно завершена!")

if __name__ == "__main__":
    run_migration()
