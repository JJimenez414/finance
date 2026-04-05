import FinanceTracker from "./components/FinanceTracker";
import BudgetManager from "./components/BudgetManager";
import Login from "./components/Login";
import { useEffect, useState } from "react";

export default function App() {
  const [currentPage, setCurrentPage] = useState("tracker");
  const [budgetData, setBudgetData] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  function fetchBudget() {
    const token = localStorage.getItem("jmz_finance_access_token");

    fetch("/api/getBudget", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((response) => response.json())
      .then((data) => setBudgetData(data.budget ?? null))
      .catch((error) => console.error("Error loading budget:", error));
  }

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem("jmz_finance_access_token");
    const savedUser = localStorage.getItem("jmz_finance_user");
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
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
      <nav className="app-nav">
        <div className="nav-left">
          <button
            className={`nav-button ${currentPage === "tracker" ? "active" : ""}`}
            onClick={() => setCurrentPage("tracker")}
          >
            Finance Tracker
          </button>
          <button
            className={`nav-button ${currentPage === "budget" ? "active" : ""}`}
            onClick={() => setCurrentPage("budget")}
          >
            Budget Manager
          </button>
        </div>
        <div className="nav-right">
          <button className="logout-button" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </nav>
      {currentPage === "tracker" ? (
        <FinanceTracker budgetData={budgetData} />
      ) : (
        <BudgetManager budgetData={budgetData} onBudgetSaved={fetchBudget} />
      )}
    </>
  );
}
