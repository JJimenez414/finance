import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { useBudgetContext } from "../context/useBudgetContext";
import { authHeaders } from "../utils/auth";

export default function CreateBudgetModal({ open, onClose, currentMonth, onCreated }) {
  const { userCategories } = useBudgetContext();
  const empty = () => (userCategories ?? []).reduce((a, { name }) => ({ ...a, [name]: "" }), {});

  const [description, setDescription] = useState("");
  const [totalBudget, setTotalBudget]  = useState("");
  const [cats, setCats]                = useState({});
  const [error, setError]              = useState("");
  const [saving, setSaving]            = useState(false);

  const allocated  = Object.values(cats).reduce((s, v) => s + (Number(v) || 0), 0);
  const totalNum   = Number(totalBudget) || 0;
  const remaining  = totalNum - allocated;
  const isBalanced = totalNum > 0 && Math.round(allocated * 100) === Math.round(totalNum * 100);

  function handleClose() {
    setDescription("");
    setTotalBudget("");
    setCats(empty());
    setError("");
    onClose();
  }

  function handleCreate() {
    if (!description.trim())        { setError("Enter a budget description."); return; }
    if (!totalNum || totalNum <= 0) { setError("Enter a valid total budget."); return; }
    if (!isBalanced) {
      setError(`Allocations must equal $${totalNum.toFixed(2)}. Currently $${allocated.toFixed(2)}.`);
      return;
    }
    setError("");
    setSaving(true);

    const categories = Object.entries(cats)
      .filter(([, v]) => v !== "")
      .map(([category, amount]) => ({ category, amount: Number(amount) }));

    fetch("/api/createBudget", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ description: description.trim(), total_budget: totalNum, month: currentMonth, categories }),
    })
      .then((r) => r.json())
      .then((data) => {
        onCreated({ id: data.id, description: description.trim(), total_budget: totalNum, categories });
        handleClose();
      })
      .catch(() => setError("Failed to create budget. Try again."))
      .finally(() => setSaving(false));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-[#13131e] border-t border-white/8"
        style={{ borderRadius: "20px 20px 0 0", maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-8 h-1 rounded-full bg-white/15 mx-auto mt-3 mb-4" />
        <div className="flex items-center justify-between px-6 pb-4 border-b border-white/8">
          <h2 className="text-sm font-semibold text-white">New Budget</h2>
          <button onClick={handleClose} className="icon-btn"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-6 py-5 pb-8 space-y-5">
          {/* Description */}
          <div>
            <label className="field-label">Description</label>
            <input
              type="text"
              className="field-input"
              value={description}
              onChange={(e) => { setDescription(e.target.value); setError(""); }}
              placeholder="e.g. May Budget"
            />
          </div>

          {/* Total budget */}
          <div>
            <label className="field-label">Total Budget</label>
            <div className="relative">
              {!totalBudget && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm pointer-events-none">$</span>}
              <input
                type="number" step="0.01" min="0"
                className={`field-input ${!totalBudget ? "pl-8" : ""}`}
                value={totalBudget}
                onChange={(e) => { setTotalBudget(e.target.value); setError(""); }}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Remaining indicator */}
          {totalNum > 0 && (
            <div className="flex justify-between px-1">
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Remaining</span>
              <span className="text-xs font-semibold" style={{ color: remaining < 0 ? "#f87171" : remaining === 0 ? "#34d399" : "#fbbf24" }}>
                ${remaining.toFixed(2)}
              </span>
            </div>
          )}

          {/* Category allocations */}
          <div>
            <label className="field-label mb-3 block">Allocations</label>
            <div className="grid grid-cols-2 gap-2">
              {(userCategories ?? []).map(({ name: cat, color }) => (
                <div key={cat} className="space-y-1">
                  <p className="text-xs text-white/40" style={{ borderLeft: `3px solid ${color}`, paddingLeft: "6px" }}>{cat}</p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: "rgba(255,255,255,0.3)" }}>$</span>
                    <input
                      type="number" step="0.01" min="0"
                      value={cats[cat]}
                      onChange={(e) => { setCats((p) => ({ ...p, [cat]: e.target.value })); setError(""); }}
                      placeholder="0.00"
                      className="w-full h-9 text-sm text-white placeholder:text-white/20 focus:outline-none"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.09)",
                        borderRadius: "8px",
                        paddingLeft: "22px", paddingRight: "10px",
                        WebkitAppearance: "none", appearance: "none",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex gap-2.5 items-start px-4 py-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px" }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#f87171" }} />
              <p className="text-sm" style={{ color: "#fca5a5" }}>{error}</p>
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={saving}
            className="w-full text-white text-sm font-semibold transition-opacity hover:opacity-90 active:opacity-75"
            style={{
              height: "48px",
              background: "linear-gradient(135deg, #14b8a6, #0ea5e9)",
              border: "none", borderRadius: "12px", cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
              boxShadow: "0 4px 20px rgba(20,184,166,0.25)",
            }}
          >
            {saving ? "Creating..." : "Create Budget"}
          </button>
        </div>
      </div>
    </div>
  );
}
