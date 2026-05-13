import { useState } from "react";
import { CATEGORIES, CATEGORY_COLORS, emptyCategoryBudgets, getAuthHeaders } from "../utils/api";

export default function CreateBudgetModal({ selectedMonth, onClose, onCreated }) {
  const [totalBudget, setTotalBudget] = useState("");
  const [description, setDescription] = useState("");
  const [categoryBudgets, setCategoryBudgets] = useState(emptyCategoryBudgets);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const allocated = Object.values(categoryBudgets).reduce(
    (sum, val) => sum + (Number(val) || 0),
    0
  );
  const totalNum = Number(totalBudget) || 0;
  const unallocated = totalNum - allocated;

  function handleSubmit(e) {
    e.preventDefault();

    if (!totalBudget || Number(totalBudget) <= 0) {
      setError("Enter a budget amount.");
      return;
    }

    setSaving(true);
    setError("");

    const categories = Object.entries(categoryBudgets)
      .filter(([, v]) => v !== "" && Number(v) > 0)
      .map(([category, amount]) => ({ category, amount: Number(amount) }));

    fetch("/api/createBudget", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({
        total_budget: Number(totalBudget),
        month: selectedMonth,
        description: description.trim() || "New Budget",
        categories,
      }),
    })
      .then((res) => res.json())
      .then(() => { onCreated(); onClose(); })
      .catch(() => setError("Failed to create budget."))
      .finally(() => setSaving(false));
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="category-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Create new budget"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>New Budget</h2>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="cb-hero">
            <div className="cb-hero-amount">
              <span className="cb-hero-symbol">$</span>
              <input
                className="cb-hero-input"
                type="number"
                step="0.01"
                min="0"
                value={totalBudget}
                onChange={(e) => { setTotalBudget(e.target.value); setError(""); }}
                placeholder="0.00"
                required
              />
            </div>
            <input
              className="cb-description-input"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
            />
          </div>

          <div className="cb-allocations">
            <p className="cb-section-label">Allocations</p>
            <ul className="cb-list">
              {CATEGORIES.map((category) => {
                const pct =
                  totalNum > 0 && categoryBudgets[category]
                    ? ((Number(categoryBudgets[category]) / totalNum) * 100).toFixed(0)
                    : null;
                return (
                  <li key={category} className="cb-row">
                    <div className="cb-row-left">
                      <span className="allocation-dot" style={{ backgroundColor: CATEGORY_COLORS[category] }} />
                      <span className="allocation-name">{category}</span>
                      {pct && <span className="allocation-pct">{pct}%</span>}
                    </div>
                    <div className="cb-input-wrap">
                      <span className="cb-input-symbol">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={categoryBudgets[category] ?? ""}
                        onChange={(e) =>
                          setCategoryBudgets((prev) => ({ ...prev, [category]: e.target.value }))
                        }
                        placeholder="0.00"
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="cb-stats">
            <div className="cb-stat">
              <span className="cb-stat-label">Total</span>
              <span className="cb-stat-value">${totalNum.toFixed(2)}</span>
            </div>
            <div className="cb-stat">
              <span className="cb-stat-label">Allocated</span>
              <span className="cb-stat-value">${allocated.toFixed(2)}</span>
            </div>
            <div className="cb-stat">
              <span className="cb-stat-label">Remaining</span>
              <span className={`cb-stat-value ${unallocated < 0 ? "negative" : ""}`}>
                ${unallocated.toFixed(2)}
              </span>
            </div>
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" className="cb-submit" disabled={saving}>
            {saving ? "Creating…" : "Create Budget"}
          </button>
        </form>
      </section>
    </div>
  );
}
