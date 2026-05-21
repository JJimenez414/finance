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
	db_get_monthly_budget,
	db_get_budget_categories,
	db_get_month_data,
)
import uvicorn

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
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username and password are required")

	user = db_login(username)
	if user is None:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
	if not verify_password(password, user["password"]):
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

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
	password = data.get("password", "")

	if db_check_existing_user(username):
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")

	hashed_password = hash_password(password)
	user_id = db_create_user(username, hashed_password)
	token = create_access_token({"sub": username})
	return {
		"message": "User registered successfully",
		"access_token": token,
		"token_type": "bearer",
		"user": {"id": user_id, "username": username},
	}

@protected_router.get("/getUser")
def get_user(current_username: str = Depends(get_current_user)):
	user = get_user_by_username(current_username)
	if user is None:
		raise HTTPException(status_code=404, detail="User not found")
	return {"user": {"id": user["id"], "username": user["username"]}}

@protected_router.post("/addTransaction")
async def add_transaction(request: Request, current_username: str = Depends(get_current_user)):
	data = await request.json()
	user = get_user_by_username(current_username)
	if user is None:
		raise HTTPException(status_code=404, detail="User not found")

	db_add_transaction(
		user["id"],
		data.get("date"),
		data.get("category"),
		data.get("amount"),
		data.get("description", ""),
		data.get("budget_id"),
	)
	return {"message": "Transaction added successfully"}

@protected_router.get("/getTransactions")
def get_transactions(current_username: str = Depends(get_current_user)):
	user = get_user_by_username(current_username)
	if user is None:
		raise HTTPException(status_code=404, detail="User not found")

	rows = db_get_transactions(user["id"])
	formatted = [
		{"id": int(r[0]), "description": r[1], "date": str(r[2]), "category": r[3], "amount": float(r[4])}
		for r in rows
	]
	return JSONResponse(content={"transactions": formatted})

@protected_router.delete("/deleteTransaction/{transaction_id}")
def delete_transaction(transaction_id: str, current_username: str = Depends(get_current_user)):
	user = get_user_by_username(current_username)
	if user is None:
		raise HTTPException(status_code=404, detail="User not found")

	db_delete_transaction(transaction_id, user["id"])
	return {"message": "Transaction deleted successfully"}

@protected_router.put("/updateTransaction")
async def update_transaction(request: Request, current_username: str = Depends(get_current_user)):
	user = get_user_by_username(current_username)
	if user is None:
		raise HTTPException(status_code=404, detail="User not found")

	data = await request.json()
	db_update_transaction(
		data.get("id"),
		data.get("amount"),
		data.get("category"),
		data.get("description"),
		data.get("date"),
		user["id"],
	)
	return {"message": "Transaction updated successfully"}

@protected_router.post("/createBudget")
async def create_budget(request: Request, current_username: str = Depends(get_current_user)):
	data = await request.json()
	user = get_user_by_username(current_username)
	if user is None:
		raise HTTPException(status_code=404, detail="User not found")

	month_str = data.get("month")
	db_create_budget(
		user["id"],
		data.get("total_budget"),
		f"{month_str}-01" if month_str else None,
		f"{month_str}-01 00:00:00" if month_str else None,
		data.get("description", "New Budget"),
		data.get("categories", []),
	)
	return {"message": "Budget created successfully"}

@protected_router.post("/saveBudget")
async def save_budget(request: Request, current_username: str = Depends(get_current_user)):
	data = await request.json()
	user = get_user_by_username(current_username)
	if user is None:
		raise HTTPException(status_code=404, detail="User not found")

	budget_id = data.get("budget_id")
	if not budget_id:
		raise HTTPException(status_code=400, detail="budget_id is required")

	ok = db_save_budget(budget_id, user["id"], data.get("month"), data.get("categories", []))
	if not ok:
		raise HTTPException(status_code=403, detail="Budget not found")
	return {"message": "Budget saved successfully"}

@protected_router.get("/getBudget")
def get_budget(month: str, current_username: str = Depends(get_current_user)):
	user = get_user_by_username(current_username)
	if user is None:
		raise HTTPException(status_code=404, detail="User not found")

	result = db_get_budget(user["id"], month)
	if result is None:
		return JSONResponse(content={"budget": None})
	return JSONResponse(content={"budget": result})

@protected_router.get("/getMonthlyBudget")
def get_monthly_budget(month: str, current_username: str = Depends(get_current_user)):
	user = get_user_by_username(current_username)
	if user is None:
		raise HTTPException(status_code=404, detail="User not found")

	budgets = db_get_monthly_budget(user["id"], month)
	return JSONResponse(content={"budgets": budgets})

@protected_router.get("/getBudgetCategories")
def get_budget_categories(budget_id: int, current_username: str = Depends(get_current_user)):
	user = get_user_by_username(current_username)
	if user is None:
		raise HTTPException(status_code=404, detail="User not found")

	categories = db_get_budget_categories(budget_id, user["id"])
	return JSONResponse(content={"categories": categories})

@protected_router.get("/month")
def get_month_data(month: str, budget_id: Optional[int] = Query(default=None), current_username: str = Depends(get_current_user)):
	user = get_user_by_username(current_username)
	if user is None:
		raise HTTPException(status_code=404, detail="User not found")

	rows = db_get_month_data(user["id"], month, budget_id)
	formatted = [
		{"id": str(r[0]), "description": r[1], "date": str(r[2]), "category": r[3], "amount": float(r[4])}
		for r in rows
	]
	return JSONResponse(content={"transactions": formatted})


app.include_router(public_router)
app.include_router(protected_router)

if __name__ == "__main__":
	uvicorn.run(app, host="0.0.0.0", port=8080)
