import { useEffect, useState } from "react";
import { useBudgetContext } from "../context/BudgetContext";
import CreateBudgetModal from "./CreateBudgetModal";

const CATEGORIES = [
  "Living",
  "Food",
  "Transportation",
  "Finance",
  "Miscellaneous",
  "Give",
];

const CATEGORY_COLORS = {
  Living: "#14b8a6",
  Food: "#f59e0b",
  Transportation: "#3b82f6",
  Finance: "#a78bfa",
  Miscellaneous: "#ec4899",
  Give: "#84cc16",
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

const emptyCategoryBudgets = CATEGORIES.reduce(
  (acc, cat) => ({ ...acc, [cat]: "" }),
  {}
);

export default function BudgetManager() {
  const [totalBudget, setTotalBudget] = useState("");
  const [categoryBudgets, setCategoryBudgets] = useState(emptyCategoryBudgets);
  const [savedCategoryBudgets, setSavedCategoryBudgets] = useState(emptyCategoryBudgets);
  const [selectedMonth, setSelectedMonth] = useState(MONTH_OPTIONS[0].value);
  const [listOfBudgets, setListOfBudgets] = useState([]);
  const [selectedBudgetId, setSelectedBudgetId] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { setSelectedBudget } = useBudgetContext();

  function getAuthHeaders() {
    const token = localStorage.getItem("jmz_finance_access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function fetchBudgetCategories(budgetId) {
    fetch(`/api/getBudgetCategories?budget_id=${budgetId}`, {
      headers: getAuthHeaders(),
    })
      .then((res) => res.json())
      .then((data) => {
        const filled = { ...emptyCategoryBudgets };
        (data.categories ?? []).forEach((cat) => {
          filled[cat.category] = String(cat.amount ?? "");
        });
        setCategoryBudgets(filled);
        setSavedCategoryBudgets(filled);
      })
      .catch((err) => console.error("Error fetching categories:", err));
  }

  function fetchMonthBudget(month) {
    fetch(`/api/getMonthlyBudget?month=${month}`, {
      headers: getAuthHeaders(),
    })
      .then((res) => res.json())
      .then((data) => {
        const buds = data.budgets ?? [];
        setListOfBudgets(buds);
        const first = buds[0];
        if (first) {
          setSelectedBudgetId(first.id);
          setTotalBudget(String(first.total_budget ?? ""));
          setSelectedBudget({ month, budget_id: first.id });
          fetchBudgetCategories(first.id);
        } else {
          setSelectedBudgetId(null);
          setTotalBudget("");
          setCategoryBudgets(emptyCategoryBudgets);
          setSavedCategoryBudgets(emptyCategoryBudgets);
        }
      })
      .catch((err) => console.error("Error:", err));
  }

  function handleBudgetSelect(e) {
    const id = Number(e.target.value);
    const bud = listOfBudgets.find((b) => b.id === id);
    setSelectedBudgetId(id);
    setTotalBudget(String(bud?.total_budget ?? ""));
    setSelectedBudget({ month: selectedMonth, budget_id: id });
    setEditing(false);
    fetchBudgetCategories(id);
  }

  function handleCancelEdit() {
    setCategoryBudgets(savedCategoryBudgets);
    setEditing(false);
  }

  function handleSave() {
    if (!selectedBudgetId) return;
    setSaving(true);

    const categories = Object.entries(categoryBudgets)
      .filter(([, v]) => v !== "" && Number(v) >= 0)
      .map(([category, amount]) => ({ category, amount: Number(amount) }));

    fetch("/api/saveBudget", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({
        budget_id: selectedBudgetId,
        month: selectedMonth,
        total_budget: Number(totalBudget),
        categories,
      }),
    })
      .then((res) => res.json())
      .then(() => {
        setSavedCategoryBudgets(categoryBudgets);
        setEditing(false);
      })
      .catch((err) => console.error("Error saving:", err))
      .finally(() => setSaving(false));
  }

  useEffect(() => {
    fetchMonthBudget(selectedMonth);
  }, [selectedMonth]);

  const allocated = Object.values(categoryBudgets).reduce(
    (sum, val) => sum + (Number(val) || 0),
    0
  );
  const totalNum = Number(totalBudget) || 0;
  const unallocated = totalNum - allocated;

  return (
    <main className="dashboard">
      <section className="budget-hero">
        <select
          className="budget-hero-month"
          value={selectedMonth}
          onChange={(e) => { setSelectedMonth(e.target.value); setEditing(false); }}
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
            onChange={() => {}}
            readOnly
            placeholder="0.00"
          />
        </div>
        <div className="budget-hero-select-row">
          <select
            className="budget-hero-sub-select"
            value={selectedBudgetId ?? ""}
            onChange={handleBudgetSelect}
          >
            {listOfBudgets.length === 0 && (
              <option value="">No budgets for this month</option>
            )}
            {listOfBudgets.map((bud) => (
              <option key={bud.id} value={bud.id}>
                {bud.description || `Budget #${bud.id}`}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="budget-hero-new-btn"
            onClick={() => setIsCreateModalOpen(true)}
          >
            +
          </button>
        </div>
      </section>

      {isCreateModalOpen && (
        <CreateBudgetModal
          selectedMonth={selectedMonth}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={() => fetchMonthBudget(selectedMonth)}
        />
      )}

      <section className="category-allocations">
        <div className="allocation-card-header">
          <h2>Allocations</h2>
          {selectedBudgetId && !editing && (
            <button type="button" className="bm-edit-btn" onClick={() => setEditing(true)}>
              Edit
            </button>
          )}
        </div>
        <ul className="allocation-list">
          {CATEGORIES.map((category) => {
            const pct =
              totalNum > 0 && categoryBudgets[category]
                ? ((Number(categoryBudgets[category]) / totalNum) * 100).toFixed(0)
                : null;
            return (
              <li key={category} className="allocation-row">
                <div className="allocation-row-left">
                  <span
                    className="allocation-dot"
                    style={{ backgroundColor: CATEGORY_COLORS[category] }}
                  />
                  <span className="allocation-name">{category}</span>
                  {pct && <span className="allocation-pct">{pct}%</span>}
                </div>
                {editing ? (
                  <div className="allocation-input-wrap">
                    <span className="unit">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={categoryBudgets[category] ?? ""}
                      onChange={(e) =>
                        setCategoryBudgets((prev) => ({
                          ...prev,
                          [category]: e.target.value,
                        }))
                      }
                      placeholder="0.00"
                    />
                  </div>
                ) : (
                  <span className="allocation-amount">
                    ${categoryBudgets[category]
                      ? Number(categoryBudgets[category]).toFixed(2)
                      : "0.00"}
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        {editing && (
          <div className="bm-edit-actions">
            <button type="button" className="bm-cancel-btn" onClick={handleCancelEdit}>
              Cancel
            </button>
            <button type="button" className="bm-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
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
    </main>
  );
}
