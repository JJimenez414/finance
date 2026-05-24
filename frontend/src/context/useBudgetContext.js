import { useContext } from "react";
import { budgetContext } from "./FinanceContext";

export function useBudgetContext() {
  return useContext(budgetContext);
}
