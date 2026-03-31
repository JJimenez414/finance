import FinanceTracker from "./components/FinanceTracker";
import BudgetManager from "./components/BudgetManager";
import { useEffect, useState } from "react";

export default function App() {
  const [currentPage, setCurrentPage] = useState("tracker");
  const [budgetData, setBudgetData] = useState(null);

  function fetchBudget() {
    fetch("/api/getBudget")
      .then((response) => response.json())
      .then((data) => setBudgetData(data.budget ?? null))
      .catch((error) => console.error("Error loading budget:", error));
  }

  useEffect(() => {
    fetchBudget();
  }, []);

  return (
    <>
      <nav className="app-nav">
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
      </nav>
      {currentPage === "tracker" ? (
        <FinanceTracker budgetData={budgetData} />
      ) : (
        <BudgetManager budgetData={budgetData} onBudgetSaved={fetchBudget} />
      )}
    </>
  );
}
