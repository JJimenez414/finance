import { createContext, useContext, useState } from "react";

const budgetContext = createContext(null);

export function BudgetProvider({ children }) {
    const [selectedBudget, setSelectedBudget] = useState({
        month: "",
        budget_id: ""
    });

    const [budgets, setBudgets] = useState(null)

    console.log(selectedBudget)
    return (
        <budgetContext.Provider value={{ selectedBudget, setSelectedBudget, budgets, setBudgets }}>
            {children}
        </budgetContext.Provider>
    );
}

export function useBudgetContext() {
    return useContext(budgetContext);
}