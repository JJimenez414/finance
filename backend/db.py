from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from logger import get_logger

load_dotenv("../.env")

logger = get_logger("DATABASE")

def get_db_connection():
	try:
		conn = psycopg2.connect(
			host=os.getenv("DB_HOST", ""),
			database=os.getenv("DB_NAME", ""),
			user=os.getenv("DB_USER", ""),
			password=os.getenv("DB_PASSWORD", ""),
			port=int(os.getenv("DB_PORT", ""))
		)
		return conn
	except Exception as e:
		logger.error("DB connection failed: %s", e)
		raise

def db_get_finance_data(user_id, month):
	logger.info("db_get_finance_data — user_id=%s month=%s", user_id, month)
	conn = get_db_connection()
	cur = conn.cursor()

	data = {}

	cur.execute(
		"SELECT id, total_budget, description FROM user_budget WHERE user_id = %s AND TO_CHAR(month, 'YYYY-MM') = %s ORDER BY created_at DESC;",
		(user_id, month)
	)
	budget_rows = cur.fetchall()
	if not budget_rows:
		logger.info("db_get_finance_data — no budgets found for user_id=%s month=%s", user_id, month)
		cur.close()
		conn.close()
		return None

	parsed_budgets = {row[0]: {"budget_amount": float(row[1]), "description": row[2]} for row in budget_rows}
	logger.info("db_get_finance_data — fetched %d budget(s): ids=%s", len(parsed_budgets), list(parsed_budgets.keys()))

	cur.execute(
		"SELECT budget_id, json_agg(json_build_object('category', category, 'amount', budget_amount)) AS categories FROM budgets WHERE user_id = %s AND TO_CHAR(month, 'YYYY-MM') = %s  GROUP BY budget_id ORDER BY budget_id;",
		(user_id, month)
	)
	categories_rows = cur.fetchall()
	categories_by_budget = {row[0]: row[1] for row in categories_rows}
	logger.info("db_get_finance_data — fetched categories for %d budget(s)", len(categories_by_budget))

	transactions = db_get_month_data(user_id, month)
	logger.info("db_get_finance_data — fetched %d transaction(s)", len(transactions))

	formatted_transactions = {}
	for row in transactions:
		budget_id = row[5]
		transaction = {
			"id": row[0],
			"description": row[1],
			"date": str(row[2]),
			"category": row[3],
			"amount": float(row[4]),
		}
		if budget_id not in formatted_transactions:
			formatted_transactions[budget_id] = []
		formatted_transactions[budget_id].append(transaction)

	data["all_transaction"] = formatted_transactions
	data["all_budgets"] = parsed_budgets
	data["all_categories"] = categories_by_budget

	logger.info("db_get_finance_data — done, returning data for user_id=%s month=%s", user_id, month)

	cur.close()
	conn.close()

	return data

def get_user_by_username(username: str):
	conn = get_db_connection()
	cur = conn.cursor(cursor_factory=RealDictCursor)
	cur.execute("SELECT id, username FROM users WHERE username = %s", (username,))
	user = cur.fetchone()
	cur.close()
	conn.close()
	return user

def db_login(username: str):
	conn = get_db_connection()
	cur = conn.cursor(cursor_factory=RealDictCursor)
	cur.execute("SELECT * FROM users WHERE username = %s", (username,))
	user = cur.fetchone()
	cur.close()
	conn.close()
	return user

def db_check_existing_user(username: str):
	conn = get_db_connection()
	cur = conn.cursor()
	cur.execute("SELECT id FROM users WHERE username = %s", (username,))
	existing = cur.fetchone()
	cur.close()
	conn.close()
	return existing

def db_create_user(username: str, hashed_password: str) -> int:
	logger.info("db_create_user — username=%s", username)
	conn = get_db_connection()
	cur = conn.cursor()
	cur.execute(
		"INSERT INTO users (username, password) VALUES (%s, %s) RETURNING id;",
		(username, hashed_password)
	)
	user_id = cur.fetchone()[0]
	conn.commit()
	cur.close()
	conn.close()
	logger.info("db_create_user — created user_id=%s", user_id)
	return user_id

def db_add_transaction(user_id, date, category, amount, description, budget_id):
	logger.info("db_add_transaction — user_id=%s date=%s category=%s amount=%s description=%s budget_id=%s",
		user_id, date, category, amount, description, budget_id)
	conn = get_db_connection()
	cur = conn.cursor()
	cur.execute(
		"INSERT INTO transactions (user_id, transaction_date, category, amount, description, budget_id) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id;",
		(user_id, date, category, amount, description, budget_id)
	)
	new_id = cur.fetchone()[0]
	conn.commit()
	cur.close()
	conn.close()
	logger.info("db_add_transaction — inserted transaction_id=%s", new_id)
	return new_id

def db_delete_transaction(transaction_id, user_id):
	logger.info("db_delete_transaction — transaction_id=%s user_id=%s", transaction_id, user_id)
	conn = get_db_connection()
	cur = conn.cursor()
	cur.execute(
		"DELETE FROM transactions WHERE id = %s AND user_id = %s;",
		(transaction_id, user_id)
	)
	conn.commit()
	cur.close()
	conn.close()
	logger.info("db_delete_transaction — deleted transaction_id=%s", transaction_id)

def db_update_transaction(tran_id, amount, category, description, date, user_id, budget_id):
	logger.info("db_update_transaction — transaction_id=%s user_id=%s budget_id=%s category=%s amount=%s date=%s description=%s",
		tran_id, user_id, budget_id, category, amount, date, description)
	conn = get_db_connection()
	cur = conn.cursor()
	cur.execute(
		"UPDATE transactions SET amount = %s, category = %s, description = %s, transaction_date = %s WHERE id = %s AND budget_id = %s AND user_id = %s;",
		(amount, category, description, date, tran_id, budget_id, user_id)
	)
	conn.commit()
	cur.close()
	conn.close()
	logger.info("db_update_transaction — updated transaction_id=%s", tran_id)

def db_create_budget(user_id, total_budget, month_date, full_month, description, categories) -> int:
	logger.info("db_create_budget — user_id=%s total_budget=%s month=%s description=%s categories=%d",
		user_id, total_budget, month_date, description, len(categories))
	conn = get_db_connection()
	cur = conn.cursor()
	cur.execute(
		"INSERT INTO user_budget (user_id, total_budget, month, description, period) VALUES (%s, %s, %s, %s, %s) RETURNING id;",
		(user_id, total_budget, month_date, description, "monthly")
	)
	new_budget_id = cur.fetchone()[0]
	logger.info("db_create_budget — inserted budget_id=%s", new_budget_id)
	for category in categories:
		name = category.get("category")
		amount = category.get("amount")
		if not name:
			continue
		cur.execute(
			"INSERT INTO budgets (user_id, category, budget_amount, month, budget_id) VALUES (%s, %s, %s, %s, %s);",
			(user_id, name, amount, full_month, new_budget_id)
		)
		logger.info("db_create_budget — inserted category=%s amount=%s for budget_id=%s", name, amount, new_budget_id)
	conn.commit()
	cur.close()
	conn.close()
	logger.info("db_create_budget — committed all changes for budget_id=%s", new_budget_id)
	return new_budget_id

def db_update_budget(budget_id, user_id, month_str, categories, new_budget):
	logger.info("db_update_budget — budget_id=%s user_id=%s month=%s new_budget=%s categories=%d",
		budget_id, user_id, month_str, new_budget, len(categories))
	full_month = f"{month_str}-01 00:00:00" if month_str else None
	conn = get_db_connection()
	cur = conn.cursor()

	cur.execute(
		"SELECT id FROM user_budget WHERE id = %s AND user_id = %s;",
		(budget_id, user_id)
	)
	if cur.fetchone() is None:
		logger.warning("db_update_budget — budget_id=%s not found for user_id=%s", budget_id, user_id)
		cur.close()
		conn.close()
		return False

	cur.execute("UPDATE user_budget SET total_budget=%s WHERE id = %s AND user_id = %s;", (new_budget, budget_id, user_id))
	logger.info("db_update_budget — updated total_budget=%s for budget_id=%s", new_budget, budget_id)

	cur.execute(
		"DELETE FROM budgets WHERE budget_id = %s AND user_id = %s;",
		(budget_id, user_id)
	)
	logger.info("db_update_budget — deleted old categories for budget_id=%s", budget_id)

	for category in categories:
		name = category.get("category")
		amount = category.get("amount", 0)
		if not name:
			continue
		cur.execute(
			"INSERT INTO budgets (user_id, category, budget_amount, month, budget_id) VALUES (%s, %s, %s, %s, %s);",
			(user_id, name, amount, full_month, budget_id)
		)
		logger.info("db_update_budget — inserted category=%s amount=%s for budget_id=%s", name, amount, budget_id)

	conn.commit()
	cur.close()
	conn.close()
	logger.info("db_update_budget — committed all changes for budget_id=%s", budget_id)
	return True

def db_get_budget(user_id, month: str):
	conn = get_db_connection()
	cur = conn.cursor()
	cur.execute(
		"SELECT id, total_budget, description FROM user_budget WHERE user_id = %s AND TO_CHAR(month, 'YYYY-MM') = %s ORDER BY created_at DESC;",
		(user_id, month)
	)
	budget_rows = cur.fetchall()
	if not budget_rows:
		cur.close()
		conn.close()
		return None
	parsed_budgets = [(row[0], float(row[1]), row[2]) for row in budget_rows]
	cur.execute(
		"SELECT category, budget_amount FROM budgets WHERE user_id = %s;",
		(user_id,)
	)
	categories = [{"category": str(row[0]), "amount": float(row[1])} for row in cur.fetchall()]
	cur.close()
	conn.close()
	return {"total_budgets": parsed_budgets, "categories": categories}

def db_get_monthly_budget(user_id, month: str) -> list:
	conn = get_db_connection()
	cur = conn.cursor()
	cur.execute(
		"SELECT id, total_budget, description FROM user_budget WHERE user_id = %s AND TO_CHAR(month, 'YYYY-MM') = %s ORDER BY created_at DESC;",
		(user_id, month)
	)
	rows = cur.fetchall()
	cur.close()
	conn.close()

	logger.info("db_get_monthly_budget — user_id=%s month=%s returned %d budget(s)", user_id, month, len(rows))

	return [{"id": row[0], "total_budget": float(row[1]), "description": row[2] or ""} for row in rows]

def db_get_budget_categories(budget_id, user_id) -> list:
	logger.info("db_get_budget_categories — budget_id=%s user_id=%s", budget_id, user_id)
	conn = get_db_connection()
	cur = conn.cursor()
	cur.execute(
		"SELECT category, budget_amount FROM budgets WHERE budget_id = %s AND user_id = %s;",
		(budget_id, user_id)
	)
	rows = cur.fetchall()
	cur.close()
	conn.close()
	logger.info("db_get_budget_categories — returned %d categories for budget_id=%s", len(rows), budget_id)
	return [{"category": row[0], "amount": float(row[1])} for row in rows]

def db_get_month_data(user_id, month: str, budget_id=None) -> list:
	logger.info("db_get_month_data — user_id=%s month=%s budget_id=%s", user_id, month, budget_id)
	conn = get_db_connection()
	cur = conn.cursor()
	if budget_id is not None:
		cur.execute(
			"SELECT id, description, transaction_date, category, amount, budget_id FROM transactions WHERE user_id = %s AND TO_CHAR(transaction_date, 'YYYY-MM') = %s AND budget_id = %s ORDER BY created_at DESC;",
			(user_id, month, budget_id)
		)
	else:
		cur.execute(
			"SELECT id, description, transaction_date, category, amount, budget_id FROM transactions WHERE user_id = %s AND TO_CHAR(transaction_date, 'YYYY-MM') = %s ORDER BY created_at DESC;",
			(user_id, month)
		)
	rows = cur.fetchall()
	cur.close()
	conn.close()
	logger.info("db_get_month_data — returned %d transaction(s) for user_id=%s month=%s", len(rows), user_id, month)
	return rows
