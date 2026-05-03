from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, APIRouter, File, UploadFile, Request, Response, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from auth import create_access_token, verify_token, hash_password, verify_password
from dotenv import load_dotenv 
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import uvicorn

app = FastAPI(title="Basic FastAPI App")
security = HTTPBearer()
load_dotenv("../.env")

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
	token = credentials.credentials
	payload = verify_token(token)

	if payload is None:
		raise HTTPException(status_code=401, detail="Invalid or expired credentials")
	return payload["sub"]


def get_user_by_username(username: str):
	conn = get_db_connection()
	cur = conn.cursor(cursor_factory=RealDictCursor)
	cur.execute("SELECT id, username FROM users WHERE username = %s", (username,))
	user = cur.fetchone()
	cur.close()
	conn.close()
	return user

public_router = APIRouter()
protected_router = APIRouter(dependencies=[Depends(get_current_user)])

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
		host=os.getenv("DB_HOST", ""),
		database=os.getenv("DB_NAME", ""),
		user=os.getenv("DB_USER", ""),
		password=os.getenv("DB_PASSWORD", ""),
		port=int(os.getenv("DB_PORT", ""))
	)
	return conn

@public_router.post("/login")
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

@public_router.post("/register")
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
			"username": username
		}
	}


@protected_router.get("/getUser")
def get_user(current_username: str = Depends(get_current_user)):
	user = get_user_by_username(current_username)
	if user is None:
		raise HTTPException(status_code=404, detail="User not found")

	return {
		"user": {
			"id": user["id"],
			"username": user["username"]
		}
	}

@protected_router.post("/addTransaction")
async def add_transactions(request: Request, current_username: str = Depends(get_current_user)):
	response = await request.json()


	date = response.get("date")
	category = response.get("category")
	amount = response.get("amount")
	description = response.get("description", "")
	user = get_user_by_username(current_username)

	if user is None:
		raise HTTPException(status_code=404, detail="User not found")

	conn = get_db_connection()
	cur = conn.cursor()
	cur.execute(
		"INSERT INTO transactions (user_id, transaction_date, category, amount, description) VALUES (%s, %s, %s, %s, %s);",
		(user["id"], date, category, amount, description)
	)
	cur.close()
	conn.commit()
	conn.close()
	return {"message": "Transaction added successfully"}

@protected_router.get("/getTransactions")
def get_transactions(current_username: str = Depends(get_current_user)):
	user = get_user_by_username(current_username)

	if user is None:
		raise HTTPException(status_code=404, detail="User not found")

	conn = get_db_connection()
	cur = conn.cursor()
	cur.execute(
		"SELECT id, description, transaction_date, category, amount FROM transactions WHERE user_id = %s ORDER BY transaction_date DESC;",
		(user["id"],)
	)
	transactions = cur.fetchall()
	cur.close()
	conn.close()
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

@protected_router.delete("/deleteTransaction/{transaction_id}")
def delete_transaction(transaction_id: str, current_username: str = Depends(get_current_user)):
	user = get_user_by_username(current_username)

	if user is None:
		raise HTTPException(status_code=404, detail="User not found")

	conn = get_db_connection()
	cur = conn.cursor()
	cur.execute("DELETE FROM transactions WHERE id = %s AND user_id = %s;", (transaction_id, user["id"]))
	cur.close()
	conn.commit()
	conn.close()
	return {"message": "Transaction deleted successfully"}

@protected_router.post("/saveBudget")
async def save_budget(request: Request, current_username: str = Depends(get_current_user)):
	data = await request.json()
	
	total_budget = data.get("total_budget")
	categories = data.get("categories", [])
	user = get_user_by_username(current_username)

	if user is None:
		raise HTTPException(status_code=404, detail="User not found")

	user_id = user["id"]
	
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
	conn.close()
	return {"message": "Budget saved successfully"}

@protected_router.get("/getBudget")
def get_budget(current_username: str = Depends(get_current_user)):
	user = get_user_by_username(current_username)

	if user is None:
		raise HTTPException(status_code=404, detail="User not found")

	conn = get_db_connection()
	cur = conn.cursor()
	
	# Get main budget
	cur.execute("SELECT total_budget FROM user_budget WHERE user_id = %s;", (user["id"],))
	budget_row = cur.fetchone()
	
	if not budget_row:
		cur.close()
		conn.close()
		return JSONResponse(content={"budget": None})
	
	# Get category allocations
	cur.execute("SELECT category,  budget_amount FROM budgets WHERE user_id = %s;", (user["id"],))
	categories = [{"category": str(row[0]), "amount": float(row[1])} for row in cur.fetchall()]
	
	cur.close()
	conn.close()
	
	return JSONResponse(content={
		"budget": {
			"total_budget": float(budget_row[0]),
			"categories": categories
		}
	})

@protected_router.get("/month")
def get_month_data(month: str, current_username: str = Depends(get_current_user)):
	user = get_user_by_username(current_username)

	if user is None:
		raise HTTPException(status_code=404, detail="User not found")

	conn = get_db_connection()
	cur = conn.cursor()

	cur.execute(
		"SELECT id, description, transaction_date, category, amount "
		"FROM transactions "
		"WHERE user_id = %s AND TO_CHAR(transaction_date, 'YYYY-MM') = %s "
		"ORDER BY transaction_date DESC;",
		(user["id"], month)
	)
	transactions = cur.fetchall()
	cur.close()
	conn.close()

	formatted = [
		{
			"id": str(row[0]),
			"description": row[1],
			"date": str(row[2]),
			"category": row[3],
			"amount": float(row[4]),
		}
		for row in transactions
	]
	return JSONResponse(content={"transactions": formatted})

@protected_router.put("/updateTransaction")
async def update_transaction(request: Request, current_username: str = Depends(get_current_user)):
	user = get_user_by_username(current_username)
	if user is None:
		raise HTTPException(status_code=404, detail="User not found")

	response = await request.json()

	tran_id = response.get("id")
	amount = response.get("amount")
	category = response.get("category")
	description = response.get("description")
	date = response.get("date")

	conn = get_db_connection()
	cur = conn.cursor()

	query = """
	 	UPDATE transactions
		SET amount = %s, category = %s, description = %s, transaction_date = %s
		WHERE id = %s AND user_id = %s;
	 """

	cur.execute(query, (amount, category, description, date, tran_id, user["id"])) 

	conn.commit()
	cur.close()
	conn.close()
	return {"message": "Transaction updated successfully"}


app.include_router(public_router)
app.include_router(protected_router)

if __name__ == "__main__":
	uvicorn.run(app, host="0.0.0.0", port=8080)
