import { useEffect, useMemo, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

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
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);

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

  const pieData = useMemo(
    () =>
      byCategory
        .filter((item) => item.totalSpent > 0)
        .map((item) => ({
          name: item.name,
          value: item.totalSpent,
        })),
    [byCategory]
  );

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

  return (
    <main className="dashboard">
      <h1>Finance Tracker</h1>

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

      <section className="summary">
        <div className="overview-header">
          <h2>Budget Overview</h2>
          <button
            type="button"
            className="overview-toggle"
            aria-expanded={isOverviewOpen}
            onClick={() => setIsOverviewOpen((prev) => !prev)}
          >
            {isOverviewOpen ? "Hide Pie" : "Show Pie"}
          </button>
        </div>

        <div className="summary-row">
          <div>
            <p className="summary-label">Total Spent</p>
            <p className="total">${totalSpent.toFixed(2)}</p>
          </div>
          <div>
            <p className="summary-label">Remaining Budget</p>
            <p className={`total ${totalRemaining < 0 ? "negative" : ""}`}>
              ${totalRemaining.toFixed(2)}
            </p>
          </div>
        </div>

        <div className={`overview-content ${isOverviewOpen ? "open" : ""}`}>
          <h3 className="chart-title">Spending Distribution</h3>
          {pieData.length === 0 ? (
            <p className="empty">No spending data yet.</p>
          ) : (
            <>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={105}
                      label={({ name, value }) => `${name}: $${value.toFixed(2)}`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${entry.name}`}
                          fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <ul className="chart-legend">
                {byCategory.map((item, index) => (
                  <li key={item.name}>
                    <span
                      className="legend-dot"
                      style={{
                        backgroundColor:
                          CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                      }}
                    />
                    <span>{item.name}</span>
                    <strong>${item.totalSpent.toFixed(2)}</strong>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      <section className="categories">
        <h2>By Category</h2>
        <ul>
          {byCategory.map((item) => {
            const status = getCategoryStatus(item.totalSpent, item.budgetAmount);

            return (
            <li key={item.name}>
              <div className="category-heading">
                <span>{item.name}</span>
                <span className={`status-pill ${status.className}`}>{status.label}</span>
              </div>
              <div className="category-metrics">
                <span className="category-spent">Spent: ${item.totalSpent.toFixed(2)}</span>
                <strong
                  className={`category-remaining ${
                    item.budgetAmount - item.totalSpent < 0 ? "negative" : ""
                  }`}
                >
                  Remaining: ${(item.budgetAmount - item.totalSpent).toFixed(2)}
                </strong>
              </div>
            </li>
          );})}
        </ul>
      </section>

      <section className="history">
        <h2>Purchase History</h2>
        {purchases.length === 0 ? (
          <p className="empty">No purchases yet.</p>
        ) : (
          <ul>
            {purchases.map((purchase, index) => (
              <li
                key={
                  purchase.id ??
                  `${purchase.date}-${purchase.category}-${purchase.amount}-${index}`
                }
              >
                <span>${purchase.amount.toFixed(2)}</span>
                <span>{purchase.description || "-"}</span>
                <span>{purchase.category}</span>
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
    </main>
  );
}
