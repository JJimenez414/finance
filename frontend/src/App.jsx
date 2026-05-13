import FinanceTracker from "./components/FinanceTracker";
import BudgetManager from "./components/BudgetManager";
import Login from "./components/Login";
import NavButton from "./components/NavButton"
import { useBudgetContext } from "./context/BudgetContext";
import { useEffect, useState } from "react";

export default function App() {
  const [currentPage, setCurrentPage] = useState("tracker");
  const [budgetData, setBudgetData] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const { selectedBudget, setSelectedBudget } = useBudgetContext();

  function fetchBudget() {
    const token = localStorage.getItem("jmz_finance_access_token");

    fetch("/api/getBudget?month=2026-05", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((response) => response.json())
      .then((data) => {console.log("data" + data.budget.total_budgets[0][1]); setBudgetData(data.budget ?? null)})
      .catch((error) => console.error("Error loading budget:", error));
  }

  useEffect(() => {
    const token = localStorage.getItem("jmz_finance_access_token");
    if (token) {
      fetch("/api/getUser", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Session expired");
          }
          return response.json();
        })
        .then((data) => {
          const currentUser = data.user ?? null;
          if (currentUser) {
            setUser(currentUser);
            localStorage.setItem("jmz_finance_user", JSON.stringify(currentUser));
          }
        })
        .catch(() => {
          localStorage.removeItem("jmz_finance_access_token");
          localStorage.removeItem("jmz_finance_user");
          setUser(null);
        })
        .finally(() => setIsLoading(false));

      return;
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      fetchBudget();
    }
  }, [user]);

  function handleLogout() {
    localStorage.removeItem("jmz_finance_access_token");
    localStorage.removeItem("jmz_finance_user");
    setUser(null);
    setBudgetData(null);
  }

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Login onLoginSuccess={setUser} />;
  }

  return (
    <>
      <NavButton onNavigate={setCurrentPage} setIsAddTransactionOpen={setIsAddTransactionOpen} onLogout={handleLogout} />
      {currentPage === "tracker" ? (
        <FinanceTracker budgetData={budgetData} onNavigate={setCurrentPage} isAddTransactionOpen={isAddTransactionOpen} setIsAddTransactionOpen={setIsAddTransactionOpen}/>
      ) : (
        <BudgetManager budgetData={budgetData} onBudgetSaved={fetchBudget} />
      )}
    </>
  );
}
