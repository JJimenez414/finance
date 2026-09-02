from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2 import pool
import os
from logger import get_logger
from datetime import date, timedelta

load_dotenv("../.env")

logger = get_logger("DATABASE")

connection_pool = pool.SimpleConnectionPool(
	minconn=1,
	maxconn=10,
	host=os.getenv("DB_HOST", ""),
	database=os.getenv("DB_NAME", ""),
	user=os.getenv("DB_USER", ""),
	password=os.getenv("DB_PASSWORD", ""),
	port=int(os.getenv("DB_PORT", "")),
)

def get_db_connection():
	return connection_pool.getconn()

def return_db_connection(conn):
	connection_pool.putconn(conn)

def db_get_finance_data(user_id):
	conn = get_db_connection()
	try:
		cur = conn.cursor()

		cur.execute(
			"SELECT id, total_budget, description FROM user_budget WHERE user_id = %s ORDER BY created_at DESC;",
			(user_id,)
		)
		budget_rows = cur.fetchall()
		if not budget_rows:
			return None

		parsed_budgets = {row[0]: {"budget_amount": float(row[1]), "description": row[2]} for row in budget_rows}
		logger.info("Received %d budgets", len(parsed_budgets))

		cur.execute(
			"SELECT budget_id, json_agg(json_build_object('category', category, 'amount', budget_amount)) AS categories FROM budgets WHERE user_id = %s GROUP BY budget_id ORDER BY budget_id;",
			(user_id,)
		)
		categories_by_budget = {row[0]: row[1] for row in cur.fetchall()}
		logger.info("Received %d category budgets", len(categories_by_budget))

		cur.execute(
			"SELECT id, description, transaction_date, category, amount, budget_id FROM transactions WHERE user_id = %s ORDER BY transaction_date DESC;",
			(user_id,)
		)
		formatted_transactions = {}
		for row in cur.fetchall():
			budget_id = row[5]
			if budget_id not in formatted_transactions:
				formatted_transactions[budget_id] = []
			formatted_transactions[budget_id].append({
				"id": row[0],
				"description": row[1],
				"date": str(row[2]),
				"category": row[3],
				"amount": float(row[4]),
			})

		logger.info("Received transactions for %d budgets", len(formatted_transactions))

		return {
			"all_transaction": formatted_transactions,
			"all_budgets": parsed_budgets,
			"all_categories": categories_by_budget,
		}
	finally:
		return_db_connection(conn)

def get_user_by_username(username: str):
	conn = get_db_connection()
	try:
		cur = conn.cursor(cursor_factory=RealDictCursor)
		cur.execute("SELECT id, username FROM users WHERE username = %s", (username,))
		return cur.fetchone()
	finally:
		return_db_connection(conn)

def db_login(username: str):
	conn = get_db_connection()
	try:
		cur = conn.cursor(cursor_factory=RealDictCursor)
		cur.execute("SELECT * FROM users WHERE username = %s", (username,))
		return cur.fetchone()
	finally:
		return_db_connection(conn)

def db_check_existing_user(username: str):
	conn = get_db_connection()
	try:
		cur = conn.cursor()
		cur.execute("SELECT id FROM users WHERE username = %s", (username,))
		return cur.fetchone()
	finally:
		return_db_connection(conn)

def db_create_user(username: str, hashed_password: str) -> int:
	conn = get_db_connection()
	try:
		cur = conn.cursor()
		cur.execute(
			"INSERT INTO users (username, password) VALUES (%s, %s) RETURNING id;",
			(username, hashed_password)
		)
		user_id = cur.fetchone()[0]
		conn.commit()
		return user_id
	finally:
		return_db_connection(conn)

def db_add_transaction(user_id, date, category, amount, description, budget_id):
	conn = get_db_connection()
	try:
		cur = conn.cursor()
		cur.execute(
			"INSERT INTO transactions (user_id, transaction_date, category, amount, description, budget_id) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id;",
			(user_id, date, category, amount, description, budget_id)
		)
		new_id = cur.fetchone()[0]
		cur.execute(
			"SELECT id FROM budgets WHERE user_id = %s AND category = %s AND budget_id = %s;",
			(user_id, category, budget_id)
		)
		if cur.fetchone() is None:
			cur.execute(
				"INSERT INTO budgets (user_id, category, budget_amount, budget_id) VALUES (%s, %s, 0, %s);",
				(user_id, category, budget_id)
			)
		conn.commit()
		return new_id
	finally:
		return_db_connection(conn)

def db_get_transactions(user_id, budget_id=None) -> list:
	conn = get_db_connection()
	try:
		cur = conn.cursor()
		if budget_id is not None:
			cur.execute(
				"SELECT id, description, transaction_date, category, amount, budget_id FROM transactions WHERE user_id = %s AND budget_id = %s ORDER BY transaction_date DESC;",
				(user_id, budget_id)
			)
		else:
			cur.execute(
				"SELECT id, description, transaction_date, category, amount, budget_id FROM transactions WHERE user_id = %s ORDER BY transaction_date DESC;",
				(user_id,)
			)
		return cur.fetchall()
	finally:
		return_db_connection(conn)

def db_delete_transaction(transaction_id, user_id):
	conn = get_db_connection()
	try:
		cur = conn.cursor()
		cur.execute(
			"DELETE FROM transactions WHERE id = %s AND user_id = %s;",
			(transaction_id, user_id)
		)
		conn.commit()
	finally:
		return_db_connection(conn)

def db_update_transaction(tran_id, amount, category, description, date, user_id):
	conn = get_db_connection()
	try:
		cur = conn.cursor()
		cur.execute(
			"UPDATE transactions SET amount = %s, category = %s, description = %s, transaction_date = %s WHERE id = %s AND user_id = %s;",
			(amount, category, description, date, tran_id, user_id)
		)
		conn.commit()
	finally:
		return_db_connection(conn)

def db_create_budget(user_id, total_budget, description, categories) -> int:
	conn = get_db_connection()
	try:
		cur = conn.cursor()
		cur.execute(
			"INSERT INTO user_budget (user_id, total_budget, description, period) VALUES (%s, %s, %s, %s) RETURNING id;",
			(user_id, total_budget, description, "monthly")
		)
		new_budget_id = cur.fetchone()[0]
		for category in categories:
			name = category.get("category")
			amount = category.get("amount")
			if not name:
				continue
			cur.execute(
				"INSERT INTO budgets (user_id, category, budget_amount, budget_id) VALUES (%s, %s, %s, %s);",
				(user_id, name, amount, new_budget_id)
			)
		conn.commit()
		return new_budget_id
	finally:
		return_db_connection(conn)

def db_save_budget(budget_id, user_id, total_budget, categories):
	conn = get_db_connection()
	try:
		cur = conn.cursor()
		cur.execute(
			"SELECT id FROM user_budget WHERE id = %s AND user_id = %s;",
			(budget_id, user_id)
		)
		if cur.fetchone() is None:
			return False
		cur.execute(
			"UPDATE user_budget SET total_budget = %s WHERE id = %s AND user_id = %s;",
			(total_budget, budget_id, user_id)
		)
		cur.execute(
			"DELETE FROM budgets WHERE budget_id = %s AND user_id = %s;",
			(budget_id, user_id)
		)
		for category in categories:
			name = category.get("category")
			amount = category.get("amount", 0)
			if not name:
				continue
			cur.execute(
				"INSERT INTO budgets (user_id, category, budget_amount, budget_id) VALUES (%s, %s, %s, %s);",
				(user_id, name, amount, budget_id)
			)
		conn.commit()
		return True
	finally:
		return_db_connection(conn)

def db_get_budget(user_id):
	conn = get_db_connection()
	try:
		cur = conn.cursor()
		cur.execute(
			"SELECT id, total_budget, description FROM user_budget WHERE user_id = %s ORDER BY created_at DESC;",
			(user_id,)
		)
		budget_rows = cur.fetchall()
		if not budget_rows:
			return None
		parsed_budgets = [(row[0], float(row[1]), row[2]) for row in budget_rows]
		budget_ids = [row[0] for row in budget_rows]
		cur.execute(
			"SELECT budget_id, category, budget_amount FROM budgets WHERE user_id = %s AND budget_id = ANY(%s);",
			(user_id, budget_ids)
		)
		categories_by_budget = {}
		for row in cur.fetchall():
			bid = row[0]
			if bid not in categories_by_budget:
				categories_by_budget[bid] = []
			categories_by_budget[bid].append({"category": str(row[1]), "amount": float(row[2])})
		return {"total_budgets": parsed_budgets, "categories_by_budget": categories_by_budget}
	finally:
		return_db_connection(conn)

def db_get_all_budgets(user_id) -> list:
	conn = get_db_connection()
	try:
		cur = conn.cursor()
		cur.execute(
			"SELECT id, total_budget, description FROM user_budget WHERE user_id = %s ORDER BY created_at DESC;",
			(user_id,)
		)
		return [{"id": row[0], "total_budget": float(row[1]), "description": row[2] or ""} for row in cur.fetchall()]
	finally:
		return_db_connection(conn)

def db_get_budget_categories(budget_id, user_id) -> list:
	conn = get_db_connection()
	try:
		cur = conn.cursor()
		cur.execute(
			"SELECT category, budget_amount FROM budgets WHERE budget_id = %s AND user_id = %s;",
			(budget_id, user_id)
		)
		return [{"category": row[0], "amount": float(row[1])} for row in cur.fetchall()]
	finally:
		return_db_connection(conn)

_DEFAULT_CATEGORIES = [
	{"name": "Living",         "color": "#14b8a6"},
	{"name": "Food",           "color": "#f59e0b"},
	{"name": "Transportation", "color": "#60a5fa"},
	{"name": "Finance",        "color": "#a78bfa"},
	{"name": "Miscellaneous",  "color": "#f472b6"},
	{"name": "Give",           "color": "#a3e635"},
]

def _ensure_user_categories_table(cur):
	cur.execute("""
		CREATE TABLE IF NOT EXISTS user_categories (
			id SERIAL PRIMARY KEY,
			user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			color TEXT NOT NULL,
			UNIQUE(user_id, name)
		);
	""")

def db_get_user_categories(user_id) -> list:
	conn = get_db_connection()
	try:
		cur = conn.cursor(cursor_factory=RealDictCursor)
		_ensure_user_categories_table(cur)
		conn.commit()
		cur.execute("SELECT id, name, color FROM user_categories WHERE user_id = %s ORDER BY id;", (user_id,))
		rows = cur.fetchall()
		if not rows:
			for cat in _DEFAULT_CATEGORIES:
				cur.execute(
					"INSERT INTO user_categories (user_id, name, color) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING;",
					(user_id, cat["name"], cat["color"])
				)
			conn.commit()
			cur.execute("SELECT id, name, color FROM user_categories WHERE user_id = %s ORDER BY id;", (user_id,))
			rows = cur.fetchall()
		return [dict(r) for r in rows]
	finally:
		return_db_connection(conn)

def db_create_user_category(user_id, name, color, budget_amount, budget_id) -> int:
	conn = get_db_connection()
	try:
		cur = conn.cursor()

		# user_categories is unique per (user_id, name), not per budget — reusing a
		# name across budgets (e.g. "Living" in every budget) must not fail here.
		cur.execute(
			"SELECT id FROM user_categories WHERE user_id = %s AND name = %s;",
			(user_id, name)
		)
		row = cur.fetchone()
		if row is not None:
			new_id = row[0]
			logger.info("db_create_user_category — existing user_categories row found: user_id=%s name=%s id=%s", user_id, name, new_id)
		else:
			cur.execute(
				"INSERT INTO user_categories (user_id, name, color) VALUES (%s, %s, %s) RETURNING id;",
				(user_id, name, color)
			)
			new_id = cur.fetchone()[0]

		cur.execute(
			"SELECT id FROM budgets WHERE user_id = %s AND category = %s AND budget_id = %s;",
			(user_id, name, budget_id)
		)
		existing_budget_row = cur.fetchone()
		if existing_budget_row is not None:
			logger.info("db_create_user_category — existing budgets row found: user_id=%s name=%s budget_id=%s id=%s. Not creating bucket.", user_id, name, budget_id, existing_budget_row[0])
		else:
			cur.execute(
				"INSERT INTO budgets (user_id, category, budget_amount, budget_id) VALUES (%s, %s, %s, %s);",
				(user_id, name, budget_amount, budget_id)
			)

		conn.commit()
		return new_id
	finally:
		return_db_connection(conn)

def db_update_user_category(category_id, user_id, name, color) -> bool:
	conn = get_db_connection()
	try:
		cur = conn.cursor()
		cur.execute("SELECT name FROM user_categories WHERE id = %s AND user_id = %s;", (category_id, user_id))
		row = cur.fetchone()
		if row is None:
			return False
		old_name = row[0]
		cur.execute(
			"UPDATE user_categories SET name = %s, color = %s WHERE id = %s AND user_id = %s;",
			(name, color, category_id, user_id)
		)
		if old_name != name:
			cur.execute("UPDATE transactions SET category = %s WHERE user_id = %s AND category = %s;", (name, user_id, old_name))
			cur.execute("UPDATE budgets SET category = %s WHERE user_id = %s AND category = %s;", (name, user_id, old_name))
		conn.commit()
		return True
	finally:
		return_db_connection(conn)

def db_delete_user_category(category_id, user_id, budget_id) -> bool:
	conn = get_db_connection()
	try:
		cur = conn.cursor()
		cur.execute("SELECT name FROM user_categories WHERE id = %s AND user_id=%s", (category_id, user_id))
		category_info = cur.fetchone()
		if category_info is None:
			return False
		category_name = category_info[0]
		cur.execute("DELETE FROM transactions WHERE user_id = %s AND category = %s AND budget_id = %s;", (user_id, category_name, budget_id))
		cur.execute("DELETE FROM budgets WHERE user_id = %s AND category = %s AND budget_id = %s;", (user_id, category_name, budget_id))
		cur.execute("DELETE FROM user_categories WHERE id = %s AND user_id = %s;", (category_id, user_id))
		deleted = cur.rowcount
		conn.commit()
		return deleted > 0
	finally:
		return_db_connection(conn)

def db_get_transactions_for_range(user_id, start_date, end_date, time_frame):
	logger.info("db_get_budget_categories — Getting transactions between %s - %s for user: %s.", start_date, end_date, user_id)

	conn = get_db_connection()
	try:
		cur = conn.cursor()
		response = {}

		cur.execute(
			"SELECT amount, category, description, transaction_date FROM transactions WHERE user_id = %s AND transaction_date between %s and %s;",
			(user_id, start_date, end_date)
		)
		response["all_tran"] = [
			{"amount": float(r[0]), "category": str(r[1]), "description": str(r[2]), "date": str(r[3])}
			for r in cur.fetchall()
		]

		one_day_before_start = date.fromisoformat(start_date) - timedelta(days=1)
		time_frame_before_start = one_day_before_start - timedelta(days=time_frame-1)

		response["cur_tran"] = {}
		response["trend_tran"] = {}

		for tran_type in ["Miscellaneous", "Give", "Living", "Food", "Transportation", "Finance"]:
			cur.execute(
				"SELECT SUM(amount) AS total FROM transactions WHERE user_id = %s AND category = %s AND transaction_date between %s and %s;",
				(user_id, tran_type, start_date, end_date)
			)
			rows = cur.fetchall()
			response["cur_tran"][tran_type] = {"total": float(rows[0][0]) if rows[0][0] is not None else 0.0}

			cur.execute(
				"SELECT SUM(amount) AS total FROM transactions WHERE user_id = %s AND category = %s AND transaction_date between %s and %s;",
				(user_id, tran_type, time_frame_before_start, one_day_before_start)
			)
			rows = cur.fetchall()
			response["trend_tran"][tran_type] = {"total": float(rows[0][0]) if rows[0][0] is not None else 0.0}

		return response
	finally:
		return_db_connection(conn)

def db_get_config(user_id):
		logger.info("db_get_config — Getting configs for user: %s.", user_id)

		conn = get_db_connection()

		try:
			cur = conn.cursor(cursor_factory=RealDictCursor)

			cur.execute (
				"SELECT * FROM config WHERE user_id = %s",
				(user_id,)
			)

			configs = cur.fetchone()

			if configs:
				configs.pop('id', None)
				configs.pop('user_id', None)

			return configs
		finally:
			return_db_connection(conn)


