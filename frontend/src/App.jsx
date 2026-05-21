import FinanceTracker from "./components/FinanceTracker";
import BudgetManager from "./components/BudgetManager";
import Login from "./components/Login";
import NavButton from "./components/NavButton";
import { useEffect, useState } from "react";
import { getAuthHeaders } from "./utils/api";

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
        .then((res) => {
          if (!res.ok) throw new Error("Session expired");
          return res.json();
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
    setUser(null);
  }

  if (isLoading) return <div className="loading">Loading...</div>;
  if (!user) return <Login onLoginSuccess={setUser} />;

  return (
    <>
      <NavButton
        onNavigate={setCurrentPage}
        setIsAddTransactionOpen={setIsAddTransactionOpen}
        onLogout={handleLogout}
      />
      {currentPage === "tracker" ? (
        <FinanceTracker
          onNavigate={setCurrentPage}
          isAddTransactionOpen={isAddTransactionOpen}
          setIsAddTransactionOpen={setIsAddTransactionOpen}
        />
      ) : (
        <BudgetManager />
      )}
    </>
  );
}
