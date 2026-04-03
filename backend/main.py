from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, File, UploadFile, Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from auth import create_access_token, verify_token, hash_password, verify_password
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import uvicorn

app = FastAPI(title="Basic FastAPI App")

app.add_middleware(
	CORSMiddleware,
	allow_origins=["http://localhost:3000", "http://127.0.0.1:5432", "http://raspi.jmzfinance.com:3000", "https://raspi.jmzfinance.com"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

# Database connection function
def get_db_connection():
	conn = psycopg2.connect(
		host=os.getenv("DB_HOST", "localhost"),
		database=os.getenv("DB_NAME", "finance_tracker"),
		user=os.getenv("DB_USER", "josea"),
		password=os.getenv("DB_PASSWORD", "yourpassword"),
		port=int(os.getenv("DB_PORT", "5432"))
	)
	return conn


@app.get("/")
def read_root() -> dict[str, str]:
	return {"message": "Hello from FastAPI"}

@app.post("/login")
async def login(request: Request):
	data = await request.json()
	username = data.get("username", "")
	password = data.get("password", "")

	if not username or not password:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Username and password are required"
		)

	conn = get_db_connection()
	cur = conn.cursor(cursor_factory=RealDictCursor)

	cur.execute(
		"SELECT * FROM users WHERE username = %s",
		(username,)
	)
	user = cur.fetchone()

	cur.close()
	conn.close()


	if user is None:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Invalid username or password"
		)

	if not verify_password(password, user["password"]):
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Invalid username or password"
		)

	token = create_access_token({"sub": user["username"]})

	return {
		"access_token": token,
		"token_type": "bearer",
		"user": {
			"id": user["id"],
			"username": user["username"],
			"email": user["username"]
		}
	}

@app.post("/register")
async def register(request: Request):
	data = await request.json()
	username = data.get("username", "")
	password = data.get("password", "")

	conn = get_db_connection()
	cur = conn.cursor()

	cur.execute(
		"SELECT * FROM users WHERE username = %s",
		(username,)
	)
	existing_user = cur.fetchone()

	if existing_user:
		cur.close()
		conn.close()
		raise HTTPException(
			status_code=status.HTTP_409_CONFLICT,
			detail="Username already exists"
		)

	hashed_password = hash_password(password)

	cur.execute(
		"INSERT INTO users (username, password) VALUES (%s, %s) RETURNING id;",
		(username, hashed_password)
	)
	user_id = cur.fetchone()[0]
	token = create_access_token({"sub": username})

	conn.commit()
	cur.close()
	conn.close()

	return {
		"message": "User registered successfully",
		"access_token": token,
		"token_type": "bearer",
		"user": {
			"id": user_id,
			"username": username,
			"email": username
		}
	}

@app.post("/addTransaction")
async def add_transactions(request: Request):
	response = await request.json()

	date = response.get("date")
	category = response.get("category")
	amount = response.get("amount")
	description = response.get("description", "")

	conn = get_db_connection()
	cur = conn.cursor()
	cur.execute("INSERT INTO transactions (user_id, transaction_date, category, amount, description) VALUES (%s, %s, %s, %s, %s);", (1, date, category, amount, description))
	cur.close()
	conn.commit()
	return {"message": "Transaction added successfully"}

@app.get("/getTransactions")
def get_transactions():
	conn = get_db_connection()
	cur = conn.cursor()
	cur.execute("SELECT id, description, transaction_date, category, amount FROM transactions ORDER BY transaction_date DESC;")
	transactions = cur.fetchall()
	cur.close()
	# Convert date objects to strings and Decimal to float for JSON serialization
	formatted_transactions = [
		{
			"id": int(row[0]),
			"description": row[1],
			"date": str(row[2]),
			"category": row[3],
			"amount": float(row[4])
		}
		for row in transactions
	]
	return JSONResponse(content={"transactions": formatted_transactions})

@app.delete("/deleteTransaction/{transaction_id}")
def delete_transaction(transaction_id: str):
	conn = get_db_connection()
	cur = conn.cursor()
	cur.execute("DELETE FROM transactions WHERE id = %s;", (transaction_id,))
	cur.close()
	conn.commit()
	return {"message": "Transaction deleted successfully"}

@app.post("/saveBudget")
async def save_budget(request: Request):
	data = await request.json()
	
	total_budget = data.get("total_budget")
	categories = data.get("categories", [])
	user_id = 1
	
	conn = get_db_connection()
	cur = conn.cursor()
	
	# Update budget first; insert only if it doesn't exist yet
	cur.execute(
		"UPDATE user_budget SET total_budget = %s, period = %s WHERE user_id = %s;",
		(total_budget, "monthly", user_id)
	)
	if cur.rowcount == 0:
		cur.execute(
			"INSERT INTO user_budget (user_id, total_budget, period) VALUES (%s, %s, %s);",
			(user_id, total_budget, "monthly")
		)

	# Update category allocations; insert only if missing
	incoming_categories = []
	for category in categories:
		name = category.get("category")
		amount = category.get("amount")
		if not name:
			continue

		incoming_categories.append(name)
		cur.execute(
			"UPDATE budgets SET budget_amount = %s WHERE user_id = %s AND category = %s;",
			(amount, user_id, name)
		)
		if cur.rowcount == 0:
			cur.execute(
				"INSERT INTO budgets (user_id, category, budget_amount) VALUES (%s, %s, %s);",
				(user_id, name, amount)
			)

	# Remove categories no longer present in payload
	if incoming_categories:
		cur.execute(
			"DELETE FROM budgets WHERE user_id = %s AND NOT (category = ANY(%s));",
			(user_id, incoming_categories)
		)
	else:
		cur.execute("DELETE FROM budgets WHERE user_id = %s;", (user_id,))
	
	conn.commit()
	cur.close()
	return {"message": "Budget saved successfully"}

@app.get("/getBudget")
def get_budget():
	conn = get_db_connection()
	cur = conn.cursor()
	
	# Get main budget
	cur.execute("SELECT total_budget FROM user_budget WHERE user_id = %s;", (1,))
	budget_row = cur.fetchone()
	
	if not budget_row:
		cur.close()
		return JSONResponse(content={"budget": None})
	
	# Get category allocations
	cur.execute("SELECT category,  budget_amount FROM budgets WHERE user_id = %s;", (1,))
	categories = [{"category": str(row[0]), "amount": float(row[1])} for row in cur.fetchall()]
	
	cur.close()
	
	return JSONResponse(content={
		"budget": {
			"total_budget": float(budget_row[0]),
			"categories": categories
		}
	})

if __name__ == "__main__":
	uvicorn.run(app, host="0.0.0.0", port=8080)
