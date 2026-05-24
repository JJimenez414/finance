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

export function BudgetProvider({ children }) {
  const [currentMonth, setCurrentMonth]           = useState(getCurrentMonth);
  const [currentBudgetID, setCurrentBudgetID]     = useState(null);
  const [currentTransactions, setCurrentTransactions] = useState([]);
  const [currentCategories, setCurrentCategories] = useState([]);
  const [allBudgets, setAllBudgets]               = useState({});
  const [allCategories, setAllCategories]         = useState({});
  const [allTransactions, setAllTransactions]     = useState({});
  const [isLoading, setIsLoading]                 = useState(true);

  // Fetch all data for the selected month
  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/get_finance_data?month=${currentMonth}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (!data) return;

        const budgets      = data.all_budgets ?? {};
        const categories   = data.all_categories ?? {};
        const transactions = data.all_transaction ?? {};

        const firstBudgetID = Number(next_key(budgets));

        setAllBudgets(budgets);
        setAllCategories(categories);
        setAllTransactions(transactions);
        setCurrentBudgetID(firstBudgetID);
        setCurrentCategories(categories[firstBudgetID] ?? []);
        setCurrentTransactions(transactions[firstBudgetID] ?? []);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [currentMonth]);

  // When budget ID changes, slice the correct data from the full dicts
  function selectBudget(budgetID) {
    const id = Number(budgetID);
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
    }}>
      {children}
    </budgetContext.Provider>
  );
}

function next_key(obj) {
  return Object.keys(obj)[0] ?? null;
}
