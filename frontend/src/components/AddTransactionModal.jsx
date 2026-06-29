import { useState } from "react";
import { X } from "lucide-react";
import { useBudgetContext } from "../context/useBudgetContext";
import { authHeaders } from "../utils/auth";

function getTodayDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split("T")[0];
}

export default function AddTransactionModal({ open, onClose }) {
  const {
    currentBudgetID,
    setCurrentTransactions,
    userCategories,
  } = useBudgetContext();

  const [amount, setAmount]       = useState("");
  const [description, setDesc]    = useState("");
  const [date, setDate]           = useState(getTodayDate());
  const [category, setCategory]   = useState(userCategories?.[0]?.name ?? "");

  function reset() {
    setAmount("");
    setDesc("");
    setDate(getTodayDate());
    setCategory(userCategories?.[0]?.name ?? "");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit(e) {
    e.preventDefault();
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) return;

    const tempID = crypto.randomUUID();
    const newTransaction = {
      id: tempID,
      budget_id: currentBudgetID,
      amount: parsed,
      description: description.trim(),
      date,
      category,
    };

    setCurrentTransactions((prev) => [newTransaction, ...prev]);
    handleClose();

    fetch("/api/addTransaction", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(newTransaction),
    })
      .then((r) => r.json())
      .then((data) => {
        setCurrentTransactions((prev) =>
          prev.map((t) => (t.id === tempID ? { ...t, id: data.id } : t))
        );
      })
      .catch(() => {
        setCurrentTransactions((prev) => prev.filter((t) => t.id !== tempID));
      });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-end justify-center" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-[#13131e] border-t border-white/8"
        style={{ borderRadius: "20px 20px 0 0" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-8 h-1 rounded-full bg-white/15 mx-auto mt-3 mb-4" />
        <div className="flex items-center justify-between px-6 pb-4 border-b border-white/8">
          <h2 className="text-sm font-semibold text-white">Add transaction</h2>
          <button onClick={handleClose} className="icon-btn"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 pb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label">Amount</label>
              <div className="relative">
                {!amount && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm pointer-events-none">$</span>}
                <input
                  type="number" step="0.01" min="0" required
                  className={`field-input ${!amount ? "pl-8" : ""}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="field-label">Category</label>
              <select className="field-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {(userCategories ?? []).map(({ name }) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Date</label>
              <input type="date" required className="field-input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Description</label>
              <input
                type="text" className="field-input"
                value={description}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Optional note"
              />
            </div>
            <button type="submit" className="btn-primary w-full">Add transaction</button>
          </form>
        </div>
      </div>
    </div>
  );
}
