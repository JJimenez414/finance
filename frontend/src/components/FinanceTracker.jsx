import { useEffect, useMemo, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";

ChartJS.register(ArcElement, Tooltip);

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


const CHART_OPTIONS = {
  rotation: 270,
  circumference: 180,
  cutout: "80%",
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: false },
  },
  animation: true,
  hover: { mode: null },
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
  const [filteredPurchases, setFilteredPurchases] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isUpdateTransactionOpen, setIsUpdateTransactionOpen] = useState(false);
  const [isCurrentTransaction, setIsCurrentTransaction] = useState({})
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

  function fetchMonthTransactions(month) {
    fetch(`/api/month?month=${month}`, {
      headers: getAuthHeaders(),
    })
      .then((response) => response.json())
      .then((data) => setFilteredPurchases(data.transactions ?? []))
      .catch((error) => console.error("Error:", error));
  }

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    fetchMonthTransactions(selectedMonth);
  }, [selectedMonth]);

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

  const chartData = useMemo(() => {
    const spentCategories = byCategory.filter((item) => item.totalSpent > 0);
    const remaining = Math.max(totalBudget - totalSpent, 0);

    if (spentCategories.length === 0) {
      return {
        datasets: [{ data: [1], backgroundColor: ["#dde3ec"], borderWidth: 0 }],
      };
    }

    return {
      labels: [...spentCategories.map((item) => item.name), "Remaining"],
      datasets: [{
        data: [...spentCategories.map((item) => item.totalSpent), remaining],
        backgroundColor: [
          ...spentCategories.map((item) => CATEGORY_COLOR_MAP[item.name]),
          "#dde3ec",
        ],
        borderWidth: 0,
        hoverOffset: 0,
      }],
    };
  }, [byCategory, totalBudget, totalSpent]);

  const activeCategoryTransactions = useMemo(() => {
    if (!activeCategory) {
      return [];
    }

    return filteredPurchases.filter((purchase) => purchase.category === activeCategory);
  }, [filteredPurchases, activeCategory]);

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
      .then(() => fetchMonthTransactions(selectedMonth))
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
      .then(() => fetchMonthTransactions(selectedMonth))
      .catch((error) => console.error("Error:", error));
  }

  function handleUpdateTransaction(event) {
    event.preventDefault();
    
    const updatedTransaction = {
      id: isCurrentTransaction.id,
      amount: Number(amount) || isCurrentTransaction.amount,
      category: category || isCurrentTransaction.category,
      description: description || isCurrentTransaction.description,
      date: transactionDate || isCurrentTransaction.date,
    };

    fetch("/api/updateTransaction", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(updatedTransaction),
    })
      .then((response) => response.json())
      .then(() => {
        fetchMonthTransactions(selectedMonth);
        closeUpdateTransactionModal();
      })
      .catch((error) => console.error("Error:", error));
  }

  function update_transaction(purchase) {
    setIsUpdateTransactionOpen(true)
    setIsCurrentTransaction(purchase)
    setAmount(purchase.amount)
    setDescription(purchase.description)
    setTransactionDate(purchase.date)
    setCategory(purchase.category)

  }

  function closeCategoryModal() {
    setActiveCategory(null);
  }

  function closeAddTransactionModal() {
    setIsAddTransactionOpen(false);
  }

  function closeUpdateTransactionModal() {
    setAmount("");
    setDescription("");
    setTransactionDate(getTodayInputDate());
    setCategory(CATEGORIES[0]);
    setIsUpdateTransactionOpen(false);
    setIsCurrentTransaction({})
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
          <div className="gauge-container">
            <Doughnut data={chartData} options={CHART_OPTIONS} />
            <div className="gauge-center-text">
              <span className="gauge-label">SPENT</span>
              <span className="gauge-amount">${totalSpent.toFixed(2)}</span>
              <div className="gauge-divider" />
              <span className="gauge-label">LEFT OVER</span>
              <span
                className="gauge-remaining"
                style={{ color: totalRemaining < 0 ? "#dc2626" : "#0f172a" }}
              >
                ${totalRemaining.toFixed(2)}
              </span>
            </div>
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
                      className="edit-button"
                      aria-label="Edit transaction"
                      title="Edit transaction"
                      onClick={() => update_transaction(purchase)}
                    >
                      ✎
                    </button>
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

      {isUpdateTransactionOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={closeUpdateTransactionModal}
        >
          <section
            className="category-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Add transaction"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Update Transaction</h2>
              <button
                type="button"
                className="modal-close"
                aria-label="Close add transaction popup"
                onClick={closeUpdateTransactionModal}
              >
                ×
              </button>
            </div>

            <form className="purchase-form" onSubmit={handleUpdateTransaction}>
              <label>
                Amount of purchase
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount || ""}
                  onChange={(event) => setAmount(event.target.value)}
                  required
                />
              </label>

              <label>
                Category
                <select
                  value={category || ""}
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
                  value={transactionDate || ""}
                  onChange={(event) => setTransactionDate(event.target.value)}
                  required
                />
              </label>

              <button type="submit">
                Update Purchase
              </button>

              <label className="description-field">
                Description
                <input
                  type="text"
                  value={description || ""}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What was this for?"
                />
              </label>
            </form>
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
