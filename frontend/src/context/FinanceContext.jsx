import { createContext, useState, useEffect } from "react";

export const budgetContext = createContext(null);

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
  const [currentBudgetID, setCurrentBudgetID]         = useState(null);
  const [currentTransactions, setCurrentTransactions] = useState([]);
  const [currentCategories, setCurrentCategories]     = useState([]);
  const [allBudgets, setAllBudgets]                   = useState({});
  const [allCategories, setAllCategories]             = useState({});
  const [allTransactions, setAllTransactions]         = useState({});
  const [isLoading, setIsLoading]       = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Hydrate from cache on first mount so there's no blank screen
  useEffect(() => {
    const cache = loadCache();
    if (!cache) return;

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

  // Fetch fresh data from backend on mount
  useEffect(() => {
    const hasCache = !!loadCache();
    if (hasCache) setIsRefreshing(true);

    fetch("/api/get_finance_data", { headers: authHeaders() })
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

        saveCache({ allBudgets: budgets, allCategories: categories, allTransactions: transactions });
      })
      .catch(console.error)
      .finally(() => { setIsLoading(false); setIsRefreshing(false); });
  }, []);

  function selectBudget(budgetID) {
    const id = Number(budgetID);
    localStorage.setItem("finance_budget_id", id);
    setCurrentBudgetID(id);
    setCurrentCategories(allCategories[id] ?? []);
    setCurrentTransactions(allTransactions[id] ?? []);
  }

  function updateBudgetCache(budgetID, newBudgetAmount, newCategories) {
    const updatedBudgets    = { ...allBudgets,    [budgetID]: { ...allBudgets[budgetID], budget_amount: newBudgetAmount } };
    const updatedCategories = { ...allCategories, [budgetID]: newCategories };
    setAllBudgets(updatedBudgets);
    setAllCategories(updatedCategories);
    saveCache({ month: currentMonth, allBudgets: updatedBudgets, allCategories: updatedCategories, allTransactions });
  }

  function addBudgetToCache({ id, description, total_budget, categories }) {
    const updatedBudgets    = { ...allBudgets,    [id]: { budget_amount: total_budget, description } };
    const updatedCategories = { ...allCategories, [id]: categories };
    const updatedTransactions = { ...allTransactions, [id]: [] };
    setAllBudgets(updatedBudgets);
    setAllCategories(updatedCategories);
    setAllTransactions(updatedTransactions);
    setCurrentBudgetID(id);
    setCurrentCategories(categories);
    setCurrentTransactions([]);
    localStorage.setItem("finance_budget_id", id);
    saveCache({ month: currentMonth, allBudgets: updatedBudgets, allCategories: updatedCategories, allTransactions: updatedTransactions });
  }

  return (
    <budgetContext.Provider value={{
      currentBudgetID, selectBudget,
      currentTransactions, setCurrentTransactions,
      currentCategories, setCurrentCategories,
      allBudgets, setAllBudgets,
      allCategories, setAllCategories,
      allTransactions, setAllTransactions,
      updateBudgetCache,
      addBudgetToCache,
      isLoading,
      isRefreshing,
    }}>
      {children}
    </budgetContext.Provider>
  );
}
