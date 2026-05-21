import { useEffect, useState } from "react";

const CATEGORIES = [
  "Living",
  "Food",
  "Transportation",
  "Finance",
  "Miscellaneous",
  "Give",
];

const MONTH_OPTIONS = (() => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("default", { month: "long", year: "numeric" }),
    });
  }
  return options;
})();

export default function BudgetManager({ budgetData, onBudgetSaved }) {
  const emptyCategoryBudgets = CATEGORIES.reduce(
    (acc, cat) => ({ ...acc, [cat]: "" }),
    {}
  );

  const [totalBudget, setTotalBudget] = useState("");
  const [categoryBudgets, setCategoryBudgets] = useState(emptyCategoryBudgets);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(MONTH_OPTIONS[0].value);

  function getAuthHeaders() {
    const token = localStorage.getItem("jmz_finance_access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  useEffect(() => {
    if (!budgetData) {
      setTotalBudget("");
      setCategoryBudgets(emptyCategoryBudgets);
      return;
    }

    setTotalBudget(String(budgetData.total_budget ?? ""));
    const budgets = { ...emptyCategoryBudgets };
    if (budgetData.categories) {
      budgetData.categories.forEach((cat) => {
        budgets[cat.category] = String(cat.amount ?? "");
      });
    }
    setCategoryBudgets(budgets);
  }, [budgetData]);

  function handleTotalBudgetChange(value) {
    setTotalBudget(value);
    setSaved(false);
    setErrorMessage("");
  }

  function handleCategoryChange(category, value) {
    setCategoryBudgets((prev) => ({ ...prev, [category]: value }));
    setSaved(false);
    setErrorMessage("");
  }

  function validateAndGetTotal() {
    const total = Object.values(categoryBudgets).reduce((sum, val) => {
      const num = Number(val) || 0;
      return sum + num;
    }, 0);

    const totalCents = Math.round(total * 100);
    const budgetCents = Math.round((Number(totalBudget) || 0) * 100);

    if (totalCents !== budgetCents) {
      setErrorMessage(
        `Amounts must add up to total budget ($${Number(totalBudget || 0).toFixed(2)}). Current total: $${total.toFixed(2)}`
      );
      return null;
    }
    return true;
  }

  function fetchMonthBudget() {
    fetch("/api/getMonthlyBudget", {
      headers: getAuthHeaders(),
    })
      .then((response) => response.json)
      .then((data) => {

      })
      .catch((error) => console.error("Error:", error))
      .finally()
  }

  function handleSave() {
    if (!totalBudget || Number(totalBudget) <= 0) {
      setErrorMessage("Please enter a valid total budget");
      return;
    }

    setErrorMessage("");

    if (!validateAndGetTotal()) {
      return;
    }

    const categoryData = Object.entries(categoryBudgets)
      .filter(([_, amount]) => amount)
      .map(([category, amount]) => ({
        category,
        amount: Number(amount),
      }));

    fetch("/api/saveBudget", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        total_budget: Number(totalBudget),
        categories: categoryData,
      }),
    })
      .then((response) => response.json())
      .then(() => {
        setErrorMessage("");
        setSaved(true);
        if (onBudgetSaved) {
          onBudgetSaved();
        }
        setTimeout(() => setSaved(false), 3000);
      })
      .catch((error) => {
        setErrorMessage("Failed to save budget. Please try again.");
        console.error("Error saving budget:", error);
      });
  }

  return (
    <main className="dashboard">
      <div className="overview-header">
        <h1 style={{ margin: 0 }}>Budget Manager</h1>
        <select
          className="month-select"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        >
          {MONTH_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <section className="budget-total">
        <label>
          Total Budget (Paycheck)
          <input
            type="number"
            step="0.01"
            min="0"
            value={totalBudget}
            onChange={(event) => handleTotalBudgetChange(event.target.value)}
            placeholder="0.00"
          />
        </label>
        {totalBudget && <p className="budget-display">${Number(totalBudget).toFixed(2)}</p>}
      </section>

      <section className="category-allocations">
        <h2>Category Allocations</h2>
        <div className="allocation-grid">
          {CATEGORIES.map((category) => (
            <div key={category} className="allocation-item">
              <label>
                {category}
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={categoryBudgets[category] ?? ""}
                  onChange={(event) =>
                    handleCategoryChange(category, event.target.value)
                  }
                  placeholder="$0.00"
                />
              </label>
              <span className="unit">$</span>
            </div>
          ))}
        </div>
      </section>

      <section className="budget-summary">
        <h2>Summary</h2>
        <div className="summary-items">
          <div className="summary-item">
            <span>Total Budget:</span>
            <strong>${Number(totalBudget || 0).toFixed(2)}</strong>
          </div>
          <div className="summary-item">
            <span>Allocated:</span>
            <strong>
              ${Object.values(categoryBudgets)
                .reduce((sum, val) => sum + (Number(val) || 0), 0)
                .toFixed(2)}
            </strong>
          </div>
          <div className="summary-item">
            <span>Remaining:</span>
            <strong>
              $
              {(
                Number(totalBudget || 0) -
                Object.values(categoryBudgets).reduce(
                  (sum, val) => sum + (Number(val) || 0),
                  0
                )
              ).toFixed(2)}
            </strong>
          </div>
        </div>
      </section>

      <div className="budget-actions">
        <button onClick={handleSave} className="save-button">
          Save Budget
        </button>
        {errorMessage && <p className="error-message">{errorMessage}</p>}
        {saved && <p className="success-message">Budget saved successfully!</p>}
      </div>
    </main>
  );
}
