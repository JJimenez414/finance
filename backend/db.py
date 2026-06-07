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

def db_get_finance_data(user_id):
	conn = get_db_connection()
	cur = conn.cursor()

	cur.execute(
		"SELECT id, total_budget, description FROM user_budget WHERE user_id = %s ORDER BY created_at DESC;",
		(user_id,)
	)
	budget_rows = cur.fetchall()
	if not budget_rows:
		cur.close()
		conn.close()
		return None


	parsed_budgets = {row[0]: {"budget_amount": float(row[1]), "description": row[2]} for row in budget_rows}
	logger.info("Received %d budgets", len(parsed_budgets))

	cur.execute(
		"SELECT budget_id, json_agg(json_build_object('category', category, 'amount', budget_amount)) AS categories FROM budgets WHERE user_id = %s GROUP BY budget_id ORDER BY budget_id;",
		(user_id,)
	)
	categories_by_budget = {row[0]: row[1] for row in cur.fetchall()}
	logger.info("Received %d category budgets", len(categories_by_budget))

	transactions = db_get_transactions(user_id)
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
		if budget_id not in formatted_transactions:
			formatted_transactions[budget_id] = []
		formatted_transactions[budget_id].append(transaction)
		formatted_transactions[budget_id].append(transaction)

	logger.info("Received %d transactions", len(transactions))

	cur.close()
	conn.close()

	return {
		"all_transaction": formatted_transactions,
		"all_budgets": parsed_budgets,
		"all_categories": categories_by_budget,
	}

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
	return user_id

def db_add_transaction(user_id, date, category, amount, description, budget_id):
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
	return new_id

def db_get_transactions(user_id, budget_id=None) -> list:
	conn = get_db_connection()
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
	rows = cur.fetchall()
	cur.close()
	conn.close()
	return rows

def db_delete_transaction(transaction_id, user_id):
	conn = get_db_connection()
	cur = conn.cursor()
	cur.execute(
		"DELETE FROM transactions WHERE id = %s AND user_id = %s;",
		(transaction_id, user_id)
	)
	conn.commit()
	cur.close()
	conn.close()

def db_update_transaction(tran_id, amount, category, description, date, user_id):
	conn = get_db_connection()
	cur = conn.cursor()
	cur.execute(
		"UPDATE transactions SET amount = %s, category = %s, description = %s, transaction_date = %s WHERE id = %s AND user_id = %s;",
		(amount, category, description, date, tran_id, user_id)
	)
	conn.commit()
	cur.close()
	conn.close()

def db_create_budget(user_id, total_budget, description, categories) -> int:
	conn = get_db_connection()
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
	cur.close()
	conn.close()
	return new_budget_id

def db_save_budget(budget_id, user_id, categories):
	conn = get_db_connection()
	cur = conn.cursor()
	cur.execute(
		"SELECT id FROM user_budget WHERE id = %s AND user_id = %s;",
		(budget_id, user_id)
	)
	if cur.fetchone() is None:
		cur.close()
		conn.close()
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
	cur.close()
	conn.close()
	return True

def db_get_budget(user_id):
	conn = get_db_connection()
	cur = conn.cursor()
	cur.execute(
		"SELECT id, total_budget, description FROM user_budget WHERE user_id = %s ORDER BY created_at DESC;",
		(user_id,)
	)
	budget_rows = cur.fetchall()
	if not budget_rows:
		cur.close()
		conn.close()
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
	cur.close()
	conn.close()
	return {"total_budgets": parsed_budgets, "categories_by_budget": categories_by_budget}

def db_get_all_budgets(user_id) -> list:
	conn = get_db_connection()
	cur = conn.cursor()
	cur.execute(
		"SELECT id, total_budget, description FROM user_budget WHERE user_id = %s ORDER BY created_at DESC;",
		(user_id,)
	)
	rows = cur.fetchall()
	cur.close()
	conn.close()
	return [{"id": row[0], "total_budget": float(row[1]), "description": row[2] or ""} for row in rows]

def db_get_budget_categories(budget_id, user_id) -> list:
	conn = get_db_connection()
	cur = conn.cursor()
	cur.execute(
		"SELECT category, budget_amount FROM budgets WHERE budget_id = %s AND user_id = %s;",
		(budget_id, user_id)
	)
	rows = cur.fetchall()
	cur.close()
	conn.close()
	return [{"category": row[0], "amount": float(row[1])} for row in rows]
