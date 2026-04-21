import { useEffect, useMemo, useState } from "react";

const CATEGORIES = [
  "Living",
  "Food",
  "Transportation",
  "Finance",
  "Miscellaneous",
  "Give",
];

const CATEGORY_COLORS = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
];

const CATEGORY_COLOR_MAP = Object.fromEntries(
  CATEGORIES.map((name, index) => [
    name,
    CATEGORY_COLORS[index % CATEGORY_COLORS.length],
  ])
);

const HALF_GAUGE = {
  cx: 120,
  cy: 120,
  radius: 90,
};

function getArcPoint(cx, cy, radius, angle) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy - radius * Math.sin(radians),
  };
}

function getArcPath(cx, cy, radius, startAngle, endAngle) {
  const start = getArcPoint(cx, cy, radius, startAngle);
  const end = getArcPoint(cx, cy, radius, endAngle);
  const largeArcFlag = Math.abs(startAngle - endAngle) > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

function getTodayInputDate() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - timezoneOffset).toISOString().split("T")[0];
}

function getCategoryStatus(totalSpent, budgetAmount) {
  if (budgetAmount <= 0) {
    return totalSpent > 0
      ? { label: "Over Budget", className: "status-over" }
      : { label: "In Budget", className: "status-in" };
  }

  const usage = totalSpent / budgetAmount;
  if (usage > 1) {
    return { label: "Over Budget", className: "status-over" };
  }
  if (usage >= 0.85) {
    return { label: "Close", className: "status-close" };
  }
  return { label: "In Budget", className: "status-in" };
}

export default function FinanceTracker({ budgetData }) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(getTodayInputDate());
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [purchases, setPurchases] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);

  function getAuthHeaders() {
    const token = localStorage.getItem("jmz_finance_access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function fetchTransactions() {
    fetch("/api/getTransactions", {
      headers: getAuthHeaders(),
    })
      .then((response) => response.json())
      .then((data) => setPurchases(data.transactions))
      .catch((error) => console.error("Error:", error));
  }

  useEffect(() => {
    fetchTransactions();
  }, []);

  const totalSpent = useMemo(
    () => purchases.reduce((sum, purchase) => sum + purchase.amount, 0),
    [purchases]
  );

  const budgetByCategory = useMemo(() => {
    const entries = (budgetData?.categories ?? []).map((item) => [
      item.category,
      Number(item.amount) || 0,
    ]);
    return Object.fromEntries(entries);
  }, [budgetData]);

  const totalBudget = Number(budgetData?.total_budget) || 0;
  const totalRemaining = totalBudget - totalSpent;

  const byCategory = useMemo(() => {
    return CATEGORIES.map((name) => ({
      name,
      totalSpent: purchases
        .filter((purchase) => purchase.category === name)
        .reduce((sum, purchase) => sum + purchase.amount, 0),
      budgetAmount: budgetByCategory[name] || 0,
    }));
  }, [purchases, budgetByCategory]);

  const gaugeSegments = useMemo(() => {
    if (totalBudget <= 0 || totalSpent <= 0) {
      return [];
    }

    const spentSweep = Math.min((totalSpent / totalBudget) * 180, 180);
    const gapAngle = 2.2;
    let currentAngle = 180;

    return byCategory
      .filter((item) => item.totalSpent > 0)
      .map((item) => {
        const segmentSweep = (item.totalSpent / totalSpent) * spentSweep;
        const safeGap = Math.min(gapAngle, Math.max(segmentSweep - 0.1, 0));
        const startAngle = currentAngle - safeGap / 2;
        const nextAngle = Math.max(currentAngle - segmentSweep, 0);
        const endAngle = Math.max(nextAngle + safeGap / 2, 0);

        const segment = {
          name: item.name,
          path: getArcPath(
            HALF_GAUGE.cx,
            HALF_GAUGE.cy,
            HALF_GAUGE.radius,
            startAngle,
            endAngle
          ),
          startPoint: getArcPoint(
            HALF_GAUGE.cx,
            HALF_GAUGE.cy,
            HALF_GAUGE.radius,
            startAngle
          ),
          endPoint: getArcPoint(
            HALF_GAUGE.cx,
            HALF_GAUGE.cy,
            HALF_GAUGE.radius,
            endAngle
          ),
          color: CATEGORY_COLOR_MAP[item.name],
        };

        currentAngle = nextAngle;
        return segment;
      });
  }, [byCategory, totalBudget, totalSpent]);

  const fullGaugePath = useMemo(
    () =>
      getArcPath(
        HALF_GAUGE.cx,
        HALF_GAUGE.cy,
        HALF_GAUGE.radius,
        180,
        0
      ),
    []
  );

  const activeCategoryTransactions = useMemo(() => {
    if (!activeCategory) {
      return [];
    }

    return purchases.filter((purchase) => purchase.category === activeCategory);
  }, [purchases, activeCategory]);

  function handleSubmit(event) {
    event.preventDefault();

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return;
    }

    const newPurchase = {
      id: crypto.randomUUID(),
      amount: parsedAmount,
      description: description.trim(),
      category,
      date: transactionDate,
    };

    fetch("/api/addTransaction", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(newPurchase),
    })
      .then((response) => response.json())
      .then(() => fetchTransactions())
      .catch((error) => console.error("Error:", error));

    setAmount("");
    setDescription("");
    setTransactionDate(getTodayInputDate());
    setCategory(CATEGORIES[0]);
    setIsAddTransactionOpen(false);
  }

  function handleDeleteTransaction(transactionId) {
    fetch(`/api/deleteTransaction/${transactionId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    })
      .then((response) => response.json())
      .then(() => {
        setPurchases((prev) =>
          prev.filter((purchase) => purchase.id !== transactionId)
        );
      })
      .catch((error) => console.error("Error:", error));
  }

  function closeCategoryModal() {
    setActiveCategory(null);
  }

  function closeAddTransactionModal() {
    setIsAddTransactionOpen(false);
  }

  return (
    <main className="dashboard">
      <section className="summary">
        <h2>Budget Overview</h2>

        <div className="half-gauge-wrap" aria-label="Category spending progress">
          <svg
            className="half-gauge"
            viewBox="0 0 240 140"
            role="img"
            aria-label="Half circle spending progress by category"
          >
            <path className="gauge-track" d={fullGaugePath} />
            {gaugeSegments.map((segment) => (
              <g key={segment.name}>
                <path
                  d={segment.path}
                  stroke={segment.color}
                  className="gauge-segment"
                />
                <circle
                  className="gauge-cap"
                  cx={segment.startPoint.x}
                  cy={segment.startPoint.y}
                  r="4"
                  fill={segment.color}
                />
                <circle
                  className="gauge-cap"
                  cx={segment.endPoint.x}
                  cy={segment.endPoint.y}
                  r="4"
                  fill={segment.color}
                />
              </g>
            ))}
          </svg>

          <div className="gauge-center">
            <p className="gauge-caption">Spent</p>
            <p className="gauge-spent">${totalSpent.toFixed(2)}</p>
            <p className="summary-label">Left Over</p>
            <p className={`gauge-leftover ${totalRemaining < 0 ? "negative" : ""}`}>
              ${totalRemaining.toFixed(2)}
            </p>
          </div>
        </div>
      </section>

      <section className="categories">
        <div className="categories-header" aria-hidden="true">
          <span>Category</span>
          <span>Spent</span>
          <span>Remain</span>
        </div>
        <ul>
          {byCategory.map((item) => {
            const status = getCategoryStatus(item.totalSpent, item.budgetAmount);

            return (
            <li key={item.name}>
              <button
                type="button"
                className="category-button"
                onClick={() => setActiveCategory(item.name)}
              >
                <div className="category-main">
                  <span
                    className="category-bullet"
                    aria-hidden="true"
                    style={{ backgroundColor: CATEGORY_COLOR_MAP[item.name] }}
                  />
                  <span className="category-name">{item.name}</span>
                  <span className={`status-pill ${status.className}`}>{status.label}</span>
                </div>
                <span className="category-spent">${item.totalSpent.toFixed(2)}</span>
                <strong
                  className={`category-remaining ${
                    item.budgetAmount - item.totalSpent < 0 ? "negative" : ""
                  }`}
                >
                  ${(item.budgetAmount - item.totalSpent).toFixed(2)}
                </strong>
              </button>
            </li>
          );})}
        </ul>
      </section>

      {activeCategory && (
        <div className="modal-backdrop" role="presentation" onClick={closeCategoryModal}>
          <section
            className="category-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${activeCategory} transactions`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{activeCategory} Transactions</h2>
              <button
                type="button"
                className="modal-close"
                aria-label="Close transactions popup"
                onClick={closeCategoryModal}
              >
                ×
              </button>
            </div>

            {activeCategoryTransactions.length === 0 ? (
              <p className="empty">No purchases in this category yet.</p>
            ) : (
              <ul className="modal-transaction-list">
                {activeCategoryTransactions.map((purchase, index) => (
                  <li
                    key={
                      purchase.id ??
                      `${purchase.date}-${purchase.category}-${purchase.amount}-${index}`
                    }
                  >
                    <span>${purchase.amount.toFixed(2)}</span>
                    <span>{purchase.description || "-"}</span>
                    <span>{purchase.date}</span>
                    <button
                      type="button"
                      className="delete-button"
                      aria-label="Delete transaction"
                      title="Delete transaction"
                      onClick={() => handleDeleteTransaction(purchase.id)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {isAddTransactionOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={closeAddTransactionModal}
        >
          <section
            className="category-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Add transaction"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Add Transaction</h2>
              <button
                type="button"
                className="modal-close"
                aria-label="Close add transaction popup"
                onClick={closeAddTransactionModal}
              >
                ×
              </button>
            </div>

            <form className="purchase-form" onSubmit={handleSubmit}>
              <label>
                Amount of purchase
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  required
                />
              </label>

              <label>
                Category
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  {CATEGORIES.map((categoryOption) => (
                    <option key={categoryOption} value={categoryOption}>
                      {categoryOption}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Date
                <input
                  type="date"
                  value={transactionDate}
                  onChange={(event) => setTransactionDate(event.target.value)}
                  required
                />
              </label>

              <button type="submit">
                Add Purchase
              </button>

              <label className="description-field">
                Description
                <input
                  type="text"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What was this for?"
                />
              </label>
            </form>
          </section>
        </div>
      )}

      <button
        type="button"
        className="add-transaction-fab"
        onClick={() => setIsAddTransactionOpen(true)}
      >
        +
      </button>
    </main>
  );
}
