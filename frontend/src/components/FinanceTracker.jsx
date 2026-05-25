import { useMemo, useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import CategoryGrid from "./CategoryGrid";
import TransactionList from "./TransactionList";
import LoadingScreen from "./LoadingScreen";
import { useBudgetContext } from "../context/useBudgetContext";

const CATEGORIES = ["Living", "Food", "Transportation", "Finance", "Miscellaneous", "Give"];

const CATEGORY_COLORS = {
  Living:         "#14b8a6",
  Food:           "#f59e0b",
  Transportation: "#60a5fa",
  Finance:        "#a78bfa",
  Miscellaneous:  "#f472b6",
  Give:           "#a3e635",
};

const MONTH_OPTIONS = (() => {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("default", { month: "long", year: "numeric" }),
    });
  }
  return opts;
})();

function getTodayDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split("T")[0];
}

function authHeaders() {
  const t = localStorage.getItem("jmz_finance_access_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function RingProgress({ spent, total }) {
  const pct = total > 0 ? Math.min(spent / total, 1) : 0;
  const r = 88;
  const cx = 110; const cy = 110;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct);
  const over = pct >= 1;
  const close = pct >= 0.85;

  return (
    <svg viewBox="0 0 220 220" className="w-52 h-52">
      <defs>
        <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#67e8f9" />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="12" />
      {pct > 0 && (
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={over ? "#f87171" : close ? "#fbbf24" : "url(#ring-grad)"}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      )}
      <text x={cx} y={cy - 10} textAnchor="middle" fill="white" fontSize="28" fontWeight="700" fontFamily="system-ui">${spent.toFixed(0)}</text>
      <text x={cx} y={cy + 23} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="18" fontFamily="system-ui">of ${total.toFixed(0)}</text>
    </svg>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-[#13131e] border-t border-white/8"
        style={{ borderRadius: "20px 20px 0 0" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-8 h-1 rounded-full bg-white/15 mx-auto mt-3 mb-4" />
        <div className="flex items-center justify-between px-6 pb-4 border-b border-white/8">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="icon-btn"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 pb-8">{children}</div>
      </div>
    </div>
  );
}

function TransactionForm({ defaultValues = {}, onSubmit, submitLabel }) {
  const [amount, setAmount]     = useState(defaultValues.amount ?? "");
  const [description, setDesc]  = useState(defaultValues.description ?? "");
  const [date, setDate]         = useState(defaultValues.date ?? getTodayDate());
  const [category, setCategory] = useState(defaultValues.category ?? CATEGORIES[0]);

  function handle(e) {
    e.preventDefault();
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) return;
    onSubmit({ amount: parsed, description: description.trim(), date, category });
  }

  return (
    <form onSubmit={handle} className="space-y-4">
      <div>
        <label className="field-label">Amount</label>
        <div className="relative">
          {!amount && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm pointer-events-none">$</span>}
          <input type="number" step="0.01" min="0" required className={`field-input ${!amount ? "pl-8" : ""}`}
            value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </div>
      </div>
      <div>
        <label className="field-label">Category</label>
        <select className="field-input" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="field-label">Date</label>
        <input type="date" required className="field-input" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div>
        <label className="field-label">Description</label>
        <input type="text" className="field-input" value={description} onChange={(e) => setDesc(e.target.value)} placeholder="Optional note" />
      </div>
      <button type="submit" className="btn-primary w-full">{submitLabel}</button>
    </form>
  );
}

export default function FinanceTracker({ isAddTransactionOpen, setIsAddTransactionOpen }) {
  const {
    currentMonth,
    setCurrentMonth,
    currentBudgetID,
    selectBudget,
    currentTransactions,
    setCurrentTransactions,
    currentCategories,
    allBudgets,
    isLoading,
    isRefreshing,
  } = useBudgetContext();

  const [activeCategory, setActiveCategory] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [activeTab, setActiveTab] = useState("categories");

  const totalBudget = Number(allBudgets[currentBudgetID]?.budget_amount) || 0;

  const budgetByCategory = useMemo(() =>
    Object.fromEntries((currentCategories ?? []).map((x) => [x.category, Number(x.amount) || 0])),
    [currentCategories]
  );

  const totalSpent = useMemo(() =>
    (currentTransactions ?? []).reduce((s, p) => s + p.amount, 0),
    [currentTransactions]
  );

  const byCategory = useMemo(() => CATEGORIES.map((name) => ({
    name,
    color: CATEGORY_COLORS[name],
    spent: (currentTransactions ?? []).filter((p) => p.category === name).reduce((s, p) => s + p.amount, 0),
    budget: budgetByCategory[name] || 0,
  })), [currentTransactions, budgetByCategory]);

  const activeTxns = useMemo(
    () => (currentTransactions ?? []).filter((p) => p.category === activeCategory),
    [currentTransactions, activeCategory]
  );

  function handleAdd(vals) {
    const tempID = crypto.randomUUID();
    const newTransaction = { id: tempID, budget_id: currentBudgetID, ...vals };
    setCurrentTransactions((prev) => [newTransaction, ...prev]);
    setIsAddTransactionOpen(false);
    fetch("/api/addTransaction", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(newTransaction),
    })
      .then((r) => r.json())
      .then((data) => {
        // swap the temporary UUID for the real database ID
        setCurrentTransactions((prev) =>
          prev.map((t) => t.id === tempID ? { ...t, id: data.id } : t)
        );
      })
      .catch(() => setCurrentTransactions((prev) => prev.filter((t) => t.id !== tempID)));
  }

  function handleUpdate(vals) {
    setCurrentTransactions((prev) =>
      prev.map((t) => t.id === editingTransaction.id ? { ...t, ...vals } : t)
    );
    setEditingTransaction(null);
    fetch("/api/updateTransaction", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ budget_id: currentBudgetID, id: editingTransaction.id, ...vals }),
    }).catch(console.error);
  }

  function handleDelete(id) {
    setCurrentTransactions((prev) => prev.filter((t) => t.id !== id));
    fetch(`/api/deleteTransaction/${id}`, { method: "DELETE", headers: authHeaders() })
      .catch(console.error);
  }

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#0c0c18" }}>
      {isRefreshing && (
        <div className="fixed top-0 left-0 right-0 z-[400] h-0.5" style={{ background: "rgba(255,255,255,0.05)" }}>
          <div className="h-full animate-pulse" style={{ background: "linear-gradient(90deg, #14b8a6, #67e8f9)", width: "60%" }} />
        </div>
      )}

      {/* Hero */}
      <div
        className="px-5 pt-6 pb-10 flex-shrink-0"
        style={{
          background: "linear-gradient(160deg, #0a1628 0%, #0c3a54 55%, #0a2a3a 100%)",
          borderRadius: "0 0 28px 28px",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-white tracking-tight">Finance Tracker</h1>
          <select
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="h-8 px-3 text-xs font-semibold text-white/70 border border-white/12 focus:outline-none appearance-none cursor-pointer"
            style={{ background: "rgba(255,255,255,0.08)", borderRadius: "8px" }}
          >
            {MONTH_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} style={{ background: "#0c1a2e" }}>{o.label}</option>
            ))}
          </select>
        </div>

        {Object.keys(allBudgets).length > 0 && (
          <div className="flex justify-end mb-5">
            <select
              value={currentBudgetID ?? ""}
              onChange={(e) => selectBudget(e.target.value)}
              className="h-8 px-3 text-xs font-semibold text-white/70 border border-white/12 focus:outline-none appearance-none cursor-pointer"
              style={{ background: "rgba(255,255,255,0.08)", borderRadius: "8px" }}
            >
              {Object.entries(allBudgets).map(([id, b]) => (
                <option key={id} value={id} style={{ background: "#0c1a2e" }}>
                  {b.description || `Budget ${id}`}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex justify-center">
          <RingProgress spent={totalSpent} total={totalBudget} />
        </div>
      </div>

      {/* Tab bar */}
      <div className="px-4 pt-5 pb-4 flex-shrink-0 z-10" style={{ background: "#0c0c18" }}>
        <div className="flex gap-1 p-1" style={{ background: "rgba(255,255,255,0.05)", borderRadius: "10px" }}>
          {["categories", "transactions"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 text-xs font-semibold py-2 transition-all"
              style={{
                border: "none",
                borderRadius: "7px",
                cursor: "pointer",
                background: activeTab === tab ? "#1e1e2e" : "transparent",
                color: activeTab === tab ? "white" : "rgba(255,255,255,0.35)",
              }}
            >
              {tab === "categories" ? "Categories" : "All Transactions"}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "categories" && (
        <CategoryGrid byCategory={byCategory} onCategoryClick={setActiveCategory} />
      )}

      {activeTab === "transactions" && (
        <TransactionList
          transactions={currentTransactions}
          onEdit={setEditingTransaction}
          onDelete={handleDelete}
        />
      )}

      {/* Category transactions sheet */}
      <Modal
        open={!!activeCategory}
        onClose={() => setActiveCategory(null)}
        title={activeCategory ?? ""}
      >
        {activeTxns.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-8">No transactions yet.</p>
        ) : (
          <ul className="space-y-1.5 max-h-72 overflow-y-auto">
            {activeTxns.map((t, i) => (
              <li
                key={t.id ?? i}
                className="flex items-center gap-3 px-4 py-3"
                style={{ background: "rgba(255,255,255,0.04)", borderRadius: "10px" }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">${t.amount.toFixed(2)}</p>
                  <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {t.description || "—"} · {t.date}
                  </p>
                </div>
                <button onClick={() => { setEditingTransaction(t); setActiveCategory(null); }} className="icon-btn">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(t.id)} className="icon-btn-danger">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Modal open={!!editingTransaction} onClose={() => setEditingTransaction(null)} title="Edit transaction">
        {editingTransaction && (
          <TransactionForm defaultValues={editingTransaction} onSubmit={handleUpdate} submitLabel="Save changes" />
        )}
      </Modal>

      <Modal open={isAddTransactionOpen} onClose={() => setIsAddTransactionOpen(false)} title="Add transaction">
        <TransactionForm onSubmit={handleAdd} submitLabel="Add transaction" />
      </Modal>
    </div>
  );
}
