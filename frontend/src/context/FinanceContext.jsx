import { createContext, useContext, useState, useEffect } from "react";

const budgetContext = createContext(null);

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function authHeaders() {
  const t = localStorage.getItem("jmz_finance_access_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export function BudgetProvider({ children }) {
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth);
  const [currentBudgetID, setCurrentBudgetID] = useState(null);
  const [currentTransactions, setCurrentTransactions] = useState([]);
  const [currentCategories, setCurrentCategories] = useState([]);
  const [allBudgets, setAllBudgets] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/get_finance_data?month=${currentMonth}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (!data) return;

        const budgets = data.all_budgets ?? {};
        const categories = data.all_categories ?? {};
        const transactions = data.all_transaction ?? {};

        // most recent budget is the first key (backend orders by created_at DESC)
        const firstBudgetID = Number(next_key(budgets));

        setAllBudgets(budgets);
        setCurrentBudgetID(firstBudgetID);
        setCurrentCategories(categories[firstBudgetID] ?? []);
        setCurrentTransactions(transactions[firstBudgetID] ?? []);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [currentMonth]);

  return (
    <budgetContext.Provider value={{
      currentMonth, setCurrentMonth,
      currentBudgetID, setCurrentBudgetID,
      currentTransactions, setCurrentTransactions,
      currentCategories, setCurrentCategories,
      allBudgets, setAllBudgets,
      isLoading,
    }}>
      {children}
    </budgetContext.Provider>
  );
}

export function useBudgetContext() {
  return useContext(budgetContext);
}

function next_key(obj) {
  return Object.keys(obj)[0] ?? null;
}
