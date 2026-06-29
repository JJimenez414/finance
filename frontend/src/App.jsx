import FinanceTracker from "./components/FinanceTracker";
import BudgetManager from "./components/BudgetManager";
import Trend from "./components/Trend";
import AddTransactionModal from "./components/AddTransactionModal";
import Login from "./components/Login";
import NavButton from "./components/NavButton";
import LoadingScreen from "./components/LoadingScreen";
import { BudgetProvider } from "./context/FinanceContext";
import { useEffect, useState } from "react";

export default function App() {
  const [currentPage, setCurrentPage] = useState("tracker");
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("jmz_finance_access_token");
    if (token) {
      fetch("/api/getUser", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((response) => {
          if (!response.ok) throw new Error("Session expired");
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

  function handleLogout() {
    localStorage.removeItem("jmz_finance_access_token");
    localStorage.removeItem("jmz_finance_user");
    localStorage.removeItem("finance_month");
    localStorage.removeItem("finance_budget_id");
    localStorage.removeItem("finance_cache");
    setUser(null);
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Login onLoginSuccess={setUser} />;
  }

  return (
    <BudgetProvider>
      <NavButton onNavigate={setCurrentPage} currentPage={currentPage} setIsAddTransactionOpen={setIsAddTransactionOpen} onLogout={handleLogout} />
      <AddTransactionModal open={isAddTransactionOpen} onClose={() => setIsAddTransactionOpen(false)} />
      {currentPage === "tracker" && <FinanceTracker />}
      {currentPage === "budget"  && <BudgetManager />}
      {currentPage === "trend"   && <Trend />}
    </BudgetProvider>
  );
}
