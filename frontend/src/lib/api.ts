const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'
const TOKEN_STORAGE_KEY = 'salung.auth.token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token)
  else localStorage.removeItem(TOKEN_STORAGE_KEY)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${res.status} ${res.statusText}${text ? `: ${text}` : ''}`)
  }
  return res.json() as Promise<T>
}

export type User = {
  id: number
  username: string
  email?: string
}

export type LoginResponse = {
  access_token: string
  token_type: string
  user: User
}

export function login(username: string, password: string) {
  return request<LoginResponse>('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export type FinanceTransaction = {
  id: number | string
  description: string
  date: string
  category: string
  amount: number
}

export type FinanceBudget = {
  budget_amount: number
  description: string
}

export type FinanceCategory = {
  category: string
  amount: number
}

export type FinanceData = {
  all_transaction: Record<string, FinanceTransaction[]>
  all_budgets: Record<string, FinanceBudget>
  all_categories: Record<string, FinanceCategory[]>
} | null

export function getFinanceData() {
  return request<FinanceData>('/get_finance_data')
}

export type AddTransactionInput = {
  date: string
  category: string
  amount: number
  description: string
  budgetId: string
}

export type AddTransactionResponse = {
  message: string
  id: number | string
}

export function addTransaction(input: AddTransactionInput) {
  return request<AddTransactionResponse>('/addTransaction', {
    method: 'POST',
    body: JSON.stringify({
      date: input.date,
      category: input.category,
      amount: input.amount,
      description: input.description,
      budget_id: input.budgetId,
    }),
  })
}
