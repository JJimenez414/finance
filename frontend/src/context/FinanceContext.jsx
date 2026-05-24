import { createContext, useState, useEffect } from "react";

export const budgetContext = createContext(null);

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function authHeaders() {
  const t = localStorage.getItem("jmz_finance_access_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function loadCache() {
  try {
    const raw = localStorage.getItem("finance_cache");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCache(payload) {
  try {
    localStorage.setItem("finance_cache", JSON.stringify(payload));
  } catch {}
}

export function BudgetProvider({ children }) {
  const [currentMonth, setCurrentMonthState] = useState(
    () => localStorage.getItem("finance_month") ?? getCurrentMonth()
  );
  const [currentBudgetID, setCurrentBudgetID]         = useState(null);
  const [currentTransactions, setCurrentTransactions] = useState([]);
  const [currentCategories, setCurrentCategories]     = useState([]);
  const [allBudgets, setAllBudgets]                   = useState({});
  const [allCategories, setAllCategories]             = useState({});
  const [allTransactions, setAllTransactions]         = useState({});
  const [isLoading, setIsLoading]       = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // On first mount, hydrate from cache immediately so there is no blank screen
  useEffect(() => {
    const cache = loadCache();
    if (!cache) return;

    const savedMonth = localStorage.getItem("finance_month") ?? getCurrentMonth();
    if (cache.month !== savedMonth) return;

    const savedID = Number(localStorage.getItem("finance_budget_id")) || null;
    const resolvedID = savedID && cache.allBudgets[savedID] ? savedID : Number(Object.keys(cache.allBudgets)[0]);

    setAllBudgets(cache.allBudgets);
    setAllCategories(cache.allCategories);
    setAllTransactions(cache.allTransactions);
    setCurrentBudgetID(resolvedID);
    setCurrentCategories(cache.allCategories[resolvedID] ?? []);
    setCurrentTransactions(cache.allTransactions[resolvedID] ?? []);
    setIsLoading(false);
  }, []);

  // Fetch fresh data from backend whenever month changes
  useEffect(() => {
    const hasCache = !!loadCache();
    if (hasCache) setIsRefreshing(true);

    fetch(`/api/get_finance_data?month=${currentMonth}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (!data) return;

        const budgets      = data.all_budgets ?? {};
        const categories   = data.all_categories ?? {};
        const transactions = data.all_transaction ?? {};

        const savedID    = Number(localStorage.getItem("finance_budget_id")) || null;
        const resolvedID = savedID && budgets[savedID] ? savedID : Number(Object.keys(budgets)[0]);

        setAllBudgets(budgets);
        setAllCategories(categories);
        setAllTransactions(transactions);
        setCurrentBudgetID(resolvedID);
        setCurrentCategories(categories[resolvedID] ?? []);
        setCurrentTransactions(transactions[resolvedID] ?? []);

        saveCache({ month: currentMonth, allBudgets: budgets, allCategories: categories, allTransactions: transactions });
      })
      .catch(console.error)
      .finally(() => { setIsLoading(false); setIsRefreshing(false); });
  }, [currentMonth]);

  function setCurrentMonth(month) {
    localStorage.setItem("finance_month", month);
    setCurrentMonthState(month);
  }

  function selectBudget(budgetID) {
    const id = Number(budgetID);
    localStorage.setItem("finance_budget_id", id);
    setCurrentBudgetID(id);
    setCurrentCategories(allCategories[id] ?? []);
    setCurrentTransactions(allTransactions[id] ?? []);
  }

  return (
    <budgetContext.Provider value={{
      currentMonth, setCurrentMonth,
      currentBudgetID, selectBudget,
      currentTransactions, setCurrentTransactions,
      currentCategories, setCurrentCategories,
      allBudgets, setAllBudgets,
      allCategories, setAllCategories,
      allTransactions, setAllTransactions,
      isLoading,
      isRefreshing,
    }}>
      {children}
    </budgetContext.Provider>
  );
}
