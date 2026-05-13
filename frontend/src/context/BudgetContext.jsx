import { createContext, useContext, useState } from "react";

const budgetContext = createContext(null);

export function BudgetProvider({ children }) {
  const [selectedBudget, setSelectedBudget] = useState({ month: "", budget_id: "" });

  return (
    <budgetContext.Provider value={{ selectedBudget, setSelectedBudget }}>
      {children}
    </budgetContext.Provider>
  );
}

export function useBudgetContext() {
  return useContext(budgetContext);
}
