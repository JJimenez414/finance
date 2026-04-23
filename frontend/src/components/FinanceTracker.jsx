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
  cx: 150,
  cy: 148,
  radius: 115,
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

const CURRENT_MONTH = MONTH_OPTIONS[0].value;

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
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH);

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

  const filteredPurchases = useMemo(
    () => purchases.filter((p) => p.date.startsWith(selectedMonth)),
    [purchases, selectedMonth]
  );

  const totalSpent = useMemo(
    () => filteredPurchases.reduce((sum, p) => sum + p.amount, 0),
    [filteredPurchases]
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
      totalSpent: filteredPurchases
        .filter((p) => p.category === name)
        .reduce((sum, p) => sum + p.amount, 0),
      budgetAmount: budgetByCategory[name] || 0,
    }));
  }, [filteredPurchases, budgetByCategory]);

  const gaugeSegments = useMemo(() => {
    if (totalBudget <= 0 || totalSpent <= 0) {
      return [];
    }

    const spentSweep = Math.min((totalSpent / totalBudget) * 180, 180);
    let currentAngle = 180;

    return byCategory
      .filter((item) => item.totalSpent > 0)
      .map((item) => {
        const segmentSweep = (item.totalSpent / totalSpent) * spentSweep;
        const startAngle = currentAngle;
        const endAngle = Math.max(currentAngle - segmentSweep, 0);

        currentAngle = endAngle;

        return {
          name: item.name,
          // Each path goes from 180° all the way to its own endAngle.
          // Drawn in reverse order so later (larger) segments paint over earlier ones,
          // producing clean color boundaries without junction artifacts.
          path: getArcPath(HALF_GAUGE.cx, HALF_GAUGE.cy, HALF_GAUGE.radius, 180, endAngle),
          color: CATEGORY_COLOR_MAP[item.name],
          startAngle,
          endAngle,
        };
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

  const spentArcPath = useMemo(() => {
    if (totalBudget <= 0 || totalSpent <= 0) return null;
    const sweep = Math.min((totalSpent / totalBudget) * 180, 180);
    return getArcPath(HALF_GAUGE.cx, HALF_GAUGE.cy, HALF_GAUGE.radius, 180, 180 - sweep);
  }, [totalBudget, totalSpent]);

  const activeCategoryTransactions = useMemo(() => {
    if (!activeCategory) {
      return [];
    }

    return filteredPurchases.filter((purchase) => purchase.category === activeCategory);
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
        <div className="overview-header">
          <h2>Budget Overview</h2>
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

        <div className="half-gauge-wrap" aria-label="Category spending progress">
          <svg
            className="half-gauge"
            viewBox="0 0 300 172"
            role="img"
            aria-label="Half circle spending progress by category"
          >
            <path
              d={fullGaugePath}
              fill="none"
              stroke="#dde3ec"
              strokeWidth={10}
              strokeLinecap="butt"
            />
            {spentArcPath && (
              <defs>
                <mask id="gauge-reveal">
                  <rect x="0" y="0" width="300" height="172" fill="black" />
                  <path
                    key={totalSpent}
                    d={spentArcPath}
                    fill="none"
                    stroke="white"
                    strokeWidth={12}
                    pathLength="1"
                    style={{ strokeDasharray: 1, animation: "gauge-draw 0.8s ease-out both" }}
                  />
                </mask>
              </defs>
            )}
            <g mask={spentArcPath ? "url(#gauge-reveal)" : undefined}>
              {[...gaugeSegments].reverse().map((segment) => (
                <path
                  key={segment.name}
                  d={segment.path}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={10}
                  strokeLinecap="butt"
                />
              ))}
            </g>
            <text x="150" y="104" textAnchor="middle" fontSize="8.5" fontWeight="600" fill="#94a3b8" fontFamily="Arial, sans-serif" letterSpacing="1.2">SPENT</text>
            <text x="150" y="120" textAnchor="middle" fontSize="15" fontWeight="700" fill="#0f172a" fontFamily="Arial, sans-serif">${totalSpent.toFixed(2)}</text>
            <line x1="124" y1="128" x2="176" y2="128" stroke="#e2e8f0" strokeWidth="1" />
            <text x="150" y="138" textAnchor="middle" fontSize="8.5" fontWeight="600" fill="#94a3b8" fontFamily="Arial, sans-serif" letterSpacing="1.2">LEFT OVER</text>
            <text x="150" y="153" textAnchor="middle" fontSize="13" fontWeight="700" fill={totalRemaining < 0 ? "#dc2626" : "#0f172a"} fontFamily="Arial, sans-serif">${totalRemaining.toFixed(2)}</text>
          </svg>
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
