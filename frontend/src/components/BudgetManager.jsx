import { useEffect, useState } from "react";
import { useBudgetContext } from "../context/BudgetContext";
import CreateBudgetModal from "./CreateBudgetModal";
import { CATEGORIES, CATEGORY_COLORS, MONTH_OPTIONS, emptyCategoryBudgets, getAuthHeaders } from "../utils/api";

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
  const [loading, setLoading] = useState(true);
  const { selectedBudget, setSelectedBudget } = useBudgetContext();

  function fetchBudgetCategories(budgetId) {
    return fetch(`/api/getBudgetCategories?budget_id=${budgetId}`, {
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
      });
  }

  function fetchMonthBudget(month, preferBudgetId = null) {
    setLoading(true);
    fetch(`/api/getMonthlyBudget?month=${month}`, {
      headers: getAuthHeaders(),
    })
      .then((res) => res.json())
      .then((data) => {
        const buds = data.budgets ?? [];
        setListOfBudgets(buds);
        if (buds.length === 0) {
          setSelectedBudgetId(null);
          setTotalBudget("");
          setCategoryBudgets(emptyCategoryBudgets);
          setSavedCategoryBudgets(emptyCategoryBudgets);
          return;
        }
        const match = preferBudgetId && buds.find((b) => b.id === preferBudgetId);
        const target = match || buds[0];
        setSelectedBudgetId(target.id);
        setTotalBudget(String(target.total_budget ?? ""));
        setSelectedBudget({ month, budget_id: target.id });
        return fetchBudgetCategories(target.id);
      })
      .catch((err) => console.error("Error:", err))
      .finally(() => setLoading(false));
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

    const categories = CATEGORIES.map((category) => ({
      category,
      amount: Number(categoryBudgets[category]) || 0,
    }));

    fetch("/api/saveBudget", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({
        budget_id: selectedBudgetId,
        month: selectedMonth,
        categories,
      }),
    })
      .then((res) => res.json())
      .then(() => fetchBudgetCategories(selectedBudgetId))
      .then(() => setEditing(false))
      .catch((err) => console.error("Error saving:", err))
      .finally(() => setSaving(false));
  }

  useEffect(() => {
    // If context has a budget for this month, prefer it on initial load
    const contextBudgetId = selectedBudget?.month === selectedMonth ? selectedBudget?.budget_id : null;
    fetchMonthBudget(selectedMonth, contextBudgetId);
  }, [selectedMonth]);

  const allocated = Object.values(categoryBudgets).reduce(
    (sum, val) => sum + (Number(val) || 0),
    0
  );
  const totalNum = Number(totalBudget) || 0;
  const unallocated = totalNum - allocated;

  if (loading) {
    return (
      <main className="dashboard loading-dashboard">
        <div className="loading-spinner" />
      </main>
    );
  }

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
