import sqlite3

conn = sqlite3.connect('lords_shop.db')
cur = conn.cursor()

cur.execute('PRAGMA table_info(users)')
cols = [row[1] for row in cur.fetchall()]
print('Columns:', cols)

if 'language' not in cols:
    cur.execute("ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'en'")
    conn.commit()
    print('Added language column successfully')
else:
    print('language column already exists')

conn.close()
