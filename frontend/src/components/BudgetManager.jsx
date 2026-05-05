import { useEffect, useState } from "react";

const CATEGORIES = [
  "Living",
  "Food",
  "Transportation",
  "Finance",
  "Miscellaneous",
  "Give",
];

const CATEGORY_COLORS = {
  Living: "#2563eb",
  Food: "#16a34a",
  Transportation: "#f59e0b",
  Finance: "#8b5cf6",
  Miscellaneous: "#ef4444",
  Give: "#06b6d4",
};

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

  function fetchMonthBudget(month) {
    fetch(`/api/getMonthlyBudget?month=${month}`, {
      headers: getAuthHeaders(),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log(data)
        if(!data.budget) return;
        setTotalBudget(String(data.budget.total_budget ?? ""))
        const budgets = { ...emptyCategoryBudgets };
        if (data.budget.categories) {
            data.budget.categories.forEach((cat) => {
            budgets[cat.category] = String(cat.amount ?? "");
          });
        }
        setCategoryBudgets(budgets);

      })
      .catch((error) => console.error("Error:", error))
      .finally()
  }

  useEffect(() => {
    fetchMonthBudget(selectedMonth);
  }, [selectedMonth]);

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

  const allocated = Object.values(categoryBudgets).reduce((sum, val) => sum + (Number(val) || 0), 0);
  const unallocated = (Number(totalBudget) || 0) - allocated;
  const totalNum = Number(totalBudget) || 0;

  return (
    <main className="dashboard">
      <section className="budget-hero">
        <select
          className="budget-hero-month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        >
          {MONTH_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <p className="budget-hero-label">Total Budget</p>
        <div className="budget-hero-input">
          <span className="budget-hero-symbol">$</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={totalBudget}
            onChange={(event) => handleTotalBudgetChange(event.target.value)}
            placeholder="0.00"
          />
        </div>
        <p className="budget-hero-sub">Monthly paycheck</p>
      </section>

      <section className="category-allocations">
        <h2>Allocations</h2>
        <ul className="allocation-list">
          {CATEGORIES.map((category) => {
            const pct = totalNum > 0 && categoryBudgets[category]
              ? ((Number(categoryBudgets[category]) / totalNum) * 100).toFixed(0)
              : null;
            return (
              <li key={category} className="allocation-row">
                <div className="allocation-row-left">
                  <span className="allocation-dot" style={{ backgroundColor: CATEGORY_COLORS[category] }} />
                  <span className="allocation-name">{category}</span>
                  {pct && <span className="allocation-pct">{pct}%</span>}
                </div>
                <div className="allocation-input-wrap">
                  <span className="unit">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={categoryBudgets[category] ?? ""}
                    onChange={(event) => handleCategoryChange(category, event.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="budget-summary">
        <div className="budget-stat-row">
          <div className="budget-stat">
            <p className="budget-stat-label">Total</p>
            <p className="budget-stat-value">${totalNum.toFixed(2)}</p>
          </div>
          <div className="budget-stat">
            <p className="budget-stat-label">Allocated</p>
            <p className="budget-stat-value">${allocated.toFixed(2)}</p>
          </div>
          <div className="budget-stat">
            <p className="budget-stat-label">Unallocated</p>
            <p className={`budget-stat-value ${unallocated < 0 ? "negative" : ""}`}>
              ${unallocated.toFixed(2)}
            </p>
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
