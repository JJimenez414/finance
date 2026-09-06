from fastapi import FastAPI, APIRouter, Request, HTTPException, status, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from typing import Optional
from auth import create_access_token, verify_token, hash_password, verify_password
from db import (
	get_user_by_username,
	db_login,
	db_check_existing_user,
	db_create_user,
	db_add_transaction,
	db_get_transactions,
	db_delete_transaction,
	db_update_transaction,
	db_create_budget,
	db_save_budget,
	db_get_budget,
	db_get_all_budgets,
	db_get_budget_categories,
	db_get_finance_data,
	db_get_user_categories,
	db_create_user_category,
	db_update_user_category,
	db_delete_user_category,
	db_get_transactions_for_range,
	db_get_config,
	db_update_config
	db_clone_budget
)
import uvicorn
from logger import get_logger

logger = get_logger("MAIN")

app = FastAPI(title="Basic FastAPI App")
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
	token = credentials.credentials
	payload = verify_token(token)
	if payload is None:
		raise HTTPException(status_code=401, detail="Invalid or expired credentials")
	return payload["sub"]

public_router = APIRouter()
protected_router = APIRouter(dependencies=[Depends(get_current_user)])

app.add_middleware(
	CORSMiddleware,
	allow_origins=["http://localhost:3000", "http://raspi.jmzfinance.com:3000", "https://raspi.jmzfinance.com"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

@public_router.post("/login")
async def login(request: Request):
	data = await request.json()
	username = data.get("username", "")
	password = data.get("password", "")

	if not username or not password:
		logger.warning("POST /login — missing username or password")
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username and password are required")

	user = db_login(username)
	if user is None:
		logger.warning("POST /login — user not found: %s", username)
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
	if not verify_password(password, user["password"]):
		logger.warning("POST /login — wrong password for: %s", username)
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

	logger.info("POST /login — success: %s", username)
	token = create_access_token({"sub": user["username"]})
	return {
		"access_token": token,
		"token_type": "bearer",
		"user": {"id": user["id"], "username": user["username"], "email": user["username"]},
	}

@public_router.post("/register")
async def register(request: Request):
	data = await request.json()
	username = data.get("username", "")

	if db_check_existing_user(username):
		logger.warning("POST /register — username taken: %s", username)
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")

	hashed_password = hash_password(data.get("password", ""))
	user_id = db_create_user(username, hashed_password)
	logger.info("POST /register — new user: %s (id=%s)", username, user_id)
	token = create_access_token({"sub": username})
	return {
		"message": "User registered successfully",
		"access_token": token,
		"token_type": "bearer",
		"user": {"id": user_id, "username": username},
	}

@protected_router.get("/getUser")
def get_user(current_username: str = Depends(get_current_user)):
	logger.info("GET /getUser — %s", current_username)
	user = get_user_by_username(current_username)
	if user is None:
		logger.warning("GET /getUser — not found: %s", current_username)
		raise HTTPException(status_code=404, detail="User not found")
	return {"user": {"id": user["id"], "username": user["username"]}}

@protected_router.post("/addTransaction")
async def add_transaction(request: Request, current_username: str = Depends(get_current_user)):
	data = await request.json()
	user = get_user_by_username(current_username)
	if user is None:
		logger.warning("POST /addTransaction — user not found: %s", current_username)
		raise HTTPException(status_code=404, detail="User not found")

	category = (data.get("category") or "").strip()
	if not category:
		logger.warning("POST /addTransaction — missing category for user=%s", current_username)
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="category is required")

	new_id = db_add_transaction(
		user["id"],
		data.get("date"),
		category,
		data.get("amount"),
		data.get("description", ""),
		data.get("budget_id"),
	)
	logger.info("POST /addTransaction — user=%s category=%s amount=%s budget=%s", current_username, data.get("category"), data.get("amount"), data.get("budget_id"))
	return {"message": "Transaction added successfully", "id": new_id}

@protected_router.delete("/deleteTransaction/{transaction_id}")
def delete_transaction(transaction_id: str, current_username: str = Depends(get_current_user)):
	user = get_user_by_username(current_username)
	if user is None:
		logger.warning("DELETE /deleteTransaction — user not found: %s", current_username)
		raise HTTPException(status_code=404, detail="User not found")

	db_delete_transaction(transaction_id, user["id"])
	logger.info("DELETE /deleteTransaction — transaction_id=%s user=%s user_id=%s", transaction_id, current_username, user["id"])
	return {"message": "Transaction deleted successfully"}

@protected_router.put("/updateTransaction")
async def update_transaction(request: Request, current_username: str = Depends(get_current_user)):
	user = get_user_by_username(current_username)
	if user is None:
		logger.warning("PUT /updateTransaction — user not found: %s", current_username)
		raise HTTPException(status_code=404, detail="User not found")

	data = await request.json()
	db_update_transaction(
		data.get("id"),
		data.get("amount"),
		data.get("category"),
		data.get("description"),
		data.get("date"),
		user["id"]
	)
	logger.info("PUT /updateTransaction — transaction_id=%s user=%s user_id=%s category=%s amount=%s date=%s description=%s budget_id=%s",
		data.get("id"), current_username, user["id"], data.get("category"), data.get("amount"), data.get("date"), data.get("description"), data.get("budget_id"))
	return {"message": "Transaction updated successfully"}

@protected_router.post("/createBudget")
async def create_budget(request: Request, current_username: str = Depends(get_current_user)):
	data = await request.json()
	user = get_user_by_username(current_username)
	if user is None:
		logger.warning("POST /createBudget — user not found: %s", current_username)
		raise HTTPException(status_code=404, detail="User not found")

	new_id = db_create_budget(
		user["id"],
		data.get("total_budget"),
		data.get("description", "New Budget"),
		data.get("categories", []),
	)
	logger.info("POST /createBudget — user=%s total=%s id=%s", current_username, data.get("total_budget"), new_id)
	return {"message": "Budget created successfully", "id": new_id}

@protected_router.put("/updateBudget")
async def save_budget(request: Request, current_username: str = Depends(get_current_user)):
	data = await request.json()
	user = get_user_by_username(current_username)
	if user is None:
		logger.warning("POST /updateBudget — user not found: %s", current_username)
		raise HTTPException(status_code=404, detail="User not found")

	budget_id = data.get("budget_id")
	if not budget_id:
		logger.warning("POST /updateBudget — missing budget_id for user=%s", current_username)
		raise HTTPException(status_code=400, detail="budget_id is required")

	ok = db_save_budget(budget_id, user["id"], data.get("total_budget"), data.get("categories", []))
	if not ok:
		logger.warning("POST /updateBudget — budget_id=%s not found for user=%s", budget_id, current_username)
		raise HTTPException(status_code=403, detail="Budget not found")

	logger.info("POST /updateBudget — budget_id=%s user=%s user_id=%s month=%s new_budget=%s categories=%d",
		budget_id, current_username, user["id"], data.get("month"), data.get("total_budget"), len(data.get("categories", [])))
	return {"message": "Budget saved successfully"}

@protected_router.get("/getBudget")
def get_budget(current_username: str = Depends(get_current_user)):
	logger.info("GET /getBudget — user=%s", current_username)
	user = get_user_by_username(current_username)
	if user is None:
		logger.warning("GET /getBudget — user not found: %s", current_username)
		raise HTTPException(status_code=404, detail="User not found")

	result = db_get_budget(user["id"])
	return JSONResponse(content={"budget": result})

@protected_router.get("/getAllBudgets")
def get_all_budgets(current_username: str = Depends(get_current_user)):
	logger.info("GET /getAllBudgets — user=%s", current_username)
	user = get_user_by_username(current_username)
	if user is None:
		logger.warning("GET /getAllBudgets — user not found: %s", current_username)
		raise HTTPException(status_code=404, detail="User not found")

	budgets = db_get_all_budgets(user["id"])
	logger.info("GET /getAllBudgets — returned %d budgets for %s", len(budgets), current_username)
	return JSONResponse(content={"budgets": budgets})

@protected_router.get("/getBudgetCategories")
def get_budget_categories(budget_id: int, current_username: str = Depends(get_current_user)):
	logger.info("GET /getBudgetCategories — budget_id=%s user=%s", budget_id, current_username)
	user = get_user_by_username(current_username)
	if user is None:
		logger.warning("GET /getBudgetCategories — user not found: %s", current_username)
		raise HTTPException(status_code=404, detail="User not found")

	categories = db_get_budget_categories(budget_id, user["id"])
	logger.info("GET /getBudgetCategories — returned %d categories", len(categories))
	return JSONResponse(content={"categories": categories})

@protected_router.get("/getTransactions")
def get_transactions(budget_id: Optional[int] = Query(default=None), current_username: str = Depends(get_current_user)):
	logger.info("GET /getTransactions — user=%s budget_id=%s", current_username, budget_id)
	user = get_user_by_username(current_username)
	if user is None:
		logger.warning("GET /getTransactions — user not found: %s", current_username)
		raise HTTPException(status_code=404, detail="User not found")

	rows = db_get_transactions(user["id"], budget_id)
	logger.info("GET /getTransactions — returned %d transactions", len(rows))
	formatted = [
		{"id": str(r[0]), "description": r[1], "date": str(r[2]), "category": r[3], "amount": float(r[4])}
		for r in rows
	]
	return JSONResponse(content={"transactions": formatted})

@protected_router.get("/get_finance_data")
def get_finance_data(current_username: str = Depends(get_current_user)):
	logger.info("GET /get_finance_data — user=%s", current_username)
	user = get_user_by_username(current_username)
	if user is None:
		logger.warning("GET /get_finance_data — user not found: %s", current_username)
		raise HTTPException(status_code=404, detail="User not found")

	data = db_get_finance_data(user["id"])
	logger.info("GET /get_finance_data — done")

	return data


@protected_router.get("/get_config")
def get_config(current_username: str = Depends(get_current_user)):
	logger.info("GET /get_config — user=%s", current_username)
	user = get_user_by_username(current_username)
	configs = db_get_config(user["id"])
	logger.info("GET /get_config — done")
	return configs

@protected_router.put("/update_config")
async def update_config(request: Request, current_username: str = Depends(get_current_user)):
	logger.info("GET /update_config — user=%s", current_username)
	data = await request.json()
	key = data.get("key")
	val = data.get("val")

	if not key:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="key is required")

	user = get_user_by_username(current_username)
	if user is None:
		raise HTTPException(status_code=404, detail="User not found")

	try:
		updated = db_update_config(user["id"], key, val)
	except ValueError as exc:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

	logger.info("PUT /update_config — user=%s key=%s val=%s", current_username, key, val)
	return updated


@protected_router.get("/getCategories")
def get_categories(current_username: str = Depends(get_current_user)):
	logger.info("GET /getCategories — user=%s", current_username)
	user = get_user_by_username(current_username)
	if user is None:
		raise HTTPException(status_code=404, detail="User not found")
	categories = db_get_user_categories(user["id"])
	return {"categories": categories}

@protected_router.post("/createCategory")
async def create_category(request: Request, current_username: str = Depends(get_current_user)):
	data = await request.json()
	user = get_user_by_username(current_username)
	if user is None:
		raise HTTPException(status_code=404, detail="User not found")
	name = data.get("name", "").strip()
	color = data.get("color", "#888888")
	amount = data.get("amount", 0)
	budget_id = data.get("currentBudgetID", "")
	if not name:
		raise HTTPException(status_code=400, detail="name is required")
	new_id = db_create_user_category(user["id"], name, color, amount, budget_id)
	logger.info("POST /createCategory — user=%s name=%s amount=%s", current_username, name, amount)
	return {"id": new_id, "name": name, "color": color}

@protected_router.put("/updateCategory/{category_id}")
async def update_category(category_id: int, request: Request, current_username: str = Depends(get_current_user)):
	data = await request.json()
	user = get_user_by_username(current_username)
	if user is None:
		raise HTTPException(status_code=404, detail="User not found")
	name = data.get("name", "").strip()
	color = data.get("color", "#888888")
	if not name:
		raise HTTPException(status_code=400, detail="name is required")
	ok = db_update_user_category(category_id, user["id"], name, color)
	if not ok:
		raise HTTPException(status_code=404, detail="Category not found")
	logger.info("PUT /updateCategory/%s — user=%s name=%s", category_id, current_username, name)
	return {"message": "Category updated"}

@protected_router.delete("/deleteCategory/{category_id}")
async def delete_category(category_id: int, request: Request, current_username: str = Depends(get_current_user)):
	data = await request.json()
	user = get_user_by_username(current_username)
	if user is None:
		raise HTTPException(status_code=404, detail="User not found")
	ok = db_delete_user_category(category_id, user["id"], data.get("currentBudgetID", ""))
	if not ok:
		raise HTTPException(status_code=404, detail="Category not found")
	logger.info("DELETE /deleteCategory/%s — user=%s", category_id, current_username)
	return {"message": "Category deleted"}

@protected_router.post("/clone_balance")
async def clone_balance(request: Request, current_username: str = Depends(get_current_user)):
	data = await request.json()
	budget_id = data.get("budget_id")
	description = data.get("description")

	if not budget_id:
		logger.warning("POST /clone_balance — missing budget_id for user=%s", current_username)
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="budget_id is required")

	user = get_user_by_username(current_username)
	if user is None:
		logger.warning("POST /clone_balance — user not found: %s", current_username)
		raise HTTPException(status_code=404, detail="User not found")

	new_id = db_clone_budget(user["id"], budget_id, description)
	if new_id is None:
		logger.warning("POST /clone_balance — budget_id=%s not found for user=%s", budget_id, current_username)
		raise HTTPException(status_code=404, detail="Budget not found")

	logger.info("POST /clone_balance — user=%s source=%s new_id=%s", current_username, budget_id, new_id)
	return {"message": "Balance cloned successfully", "id": new_id}

@protected_router.get("/get_transactions_for_range")
def get_transactions_for_range(start_date: str, end_date:str, time_frame:int, current_username: str = Depends(get_current_user)):
	logger.info("GET /get_transactions_for_range - user=%s", current_username)
	user = get_user_by_username(current_username)

	if user is None:
		logger.warning("GET /get_transactions_for_range — user not found: %s", current_username)
		raise HTTPException(status_code=404, detail="User not found")
	
	

	data = db_get_transactions_for_range(user["id"], start_date, end_date, time_frame)
	logger.info("GET /get_transactions_for_range — done")
	return data

app.include_router(public_router)
app.include_router(protected_router)

if __name__ == "__main__":
	uvicorn.run(app, host="0.0.0.0", port=8080, access_log=False)
