from dotenv import load_dotenv
import psycopg2
import os
from datetime import date, timedelta
import random

load_dotenv("../.env")

USER_ID   = 18
BUDGET_ID = 35
CATEGORIES = ["cat1", "cat2"]

TRANSACTIONS = [
    # (description, amount, category, days_ago)
    ("Groceries",        45.00,  "cat1", 1),
    ("Electric bill",   120.00,  "cat1", 3),
    ("Gas",              38.50,  "cat2", 3),
    ("Restaurant",       22.75,  "cat2", 5),
    ("Streaming sub",    15.99,  "cat1", 7),
    ("Pharmacy",         12.40,  "cat2", 8),
    ("Coffee",            6.50,  "cat2", 10),
    ("Internet bill",    60.00,  "cat1", 12),
    ("Clothing",         85.00,  "cat2", 14),
    ("Gym membership",   35.00,  "cat1", 15),
]

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", ""),
        database=os.getenv("DB_NAME", ""),
        user=os.getenv("DB_USER", ""),
        password=os.getenv("DB_PASSWORD", ""),
        port=int(os.getenv("DB_PORT", ""))
    )

def seed():
    conn = get_db_connection()
    cur = conn.cursor()

    today = date.today()
    inserted = 0

    for description, amount, category, days_ago in TRANSACTIONS:
        txn_date = today - timedelta(days=days_ago)

        cur.execute(
            "INSERT INTO transactions (user_id, transaction_date, category, amount, description, budget_id) "
            "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id;",
            (USER_ID, txn_date, category, amount, description, BUDGET_ID)
        )
        txn_id = cur.fetchone()[0]

        # Auto-create budget allocation if missing
        cur.execute(
            "SELECT id FROM budgets WHERE user_id = %s AND category = %s AND budget_id = %s;",
            (USER_ID, category, BUDGET_ID)
        )
        if cur.fetchone() is None:
            cur.execute(
                "INSERT INTO budgets (user_id, category, budget_amount, budget_id) VALUES (%s, %s, 0, %s);",
                (USER_ID, category, BUDGET_ID)
            )

        print(f"  [{txn_id}] {txn_date}  {category:<6}  ${amount:>7.2f}  {description}")
        inserted += 1

    conn.commit()
    cur.close()
    conn.close()
    print(f"\nDone — inserted {inserted} transactions for user_id={USER_ID}, budget_id={BUDGET_ID}.")

if __name__ == "__main__":
    seed()
