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
  const [userCategories, setUserCategories] = useState([]);

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
    if (cache.userCategories) setUserCategories(cache.userCategories);
    setIsLoading(false);
  }, []);

  // Fetch user-defined categories on mount
  useEffect(() => {
    fetch("/api/getCategories", { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => { if (data?.categories) setUserCategories(data.categories); })
      .catch(console.error);
  }, []);

  function addUserCategory(name, color, amount) {
    return fetch("/api/createCategory", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ name, color, amount, currentBudgetID}),
    })
      .then((r) => r.json())
      .then((cat) => {
        setUserCategories((prev) => {
          const updated = [...prev, cat];
          saveCache({ allBudgets, allCategories, allTransactions, userCategories: updated });
          return updated;
        });
        return cat;
      });
  }

  function updateUserCategory(id, name, color) {
    return fetch(`/api/updateCategory/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ name, color }),
    })
      .then((r) => r.json())
      .then(() => {
        setUserCategories((prev) => {
          const updated = prev.map((c) => (c.id === id ? { ...c, name, color } : c));
          saveCache({ allBudgets, allCategories, allTransactions, userCategories: updated });
          return updated;
        });
      });
  }

  function deleteUserCategory(id) {
    currentBudgetID
    return fetch(`/api/deleteCategory/${id}`, { 
      method: "DELETE", 
      headers: { "Content-Type": "application/json", ...authHeaders() }, 
      body: JSON.stringify({ currentBudgetID })
    })
      .then((r) => r.json())
      .then(() => {
        setUserCategories((prev) => {
          const updated = prev.filter((c) => c.id !== id);
          saveCache({ allBudgets, allCategories, allTransactions, userCategories: updated });
          return updated;
        });
      });
  }

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

        saveCache({ allBudgets: budgets, allCategories: categories, allTransactions: transactions, userCategories });
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
    saveCache({ allBudgets: updatedBudgets, allCategories: updatedCategories, allTransactions, userCategories });
  }

  function addBudgetToCache({ id, description, total_budget, categories }) {
    const updatedBudgets      = { ...allBudgets,      [id]: { budget_amount: total_budget, description } };
    const updatedCategories   = { ...allCategories,   [id]: categories };
    const updatedTransactions = { ...allTransactions, [id]: [] };
    setAllBudgets(updatedBudgets);
    setAllCategories(updatedCategories);
    setAllTransactions(updatedTransactions);
    setCurrentBudgetID(id);
    setCurrentCategories(categories);
    setCurrentTransactions([]);
    localStorage.setItem("finance_budget_id", id);
    saveCache({ allBudgets: updatedBudgets, allCategories: updatedCategories, allTransactions: updatedTransactions, userCategories });
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
      userCategories,
      addUserCategory,
      updateUserCategory,
      deleteUserCategory,
    }}>
      {children}
    </budgetContext.Provider>
  );
}
