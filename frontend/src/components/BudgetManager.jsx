import { useEffect, useState } from "react";
import { Check, AlertTriangle, Pencil, X, Plus, Settings } from "lucide-react";
import LoadingScreen from "./LoadingScreen";
import CategoryCard from "./CategoryCard";
import CreateBudgetModal from "./CreateBudgetModal";
import ManageCategoriesModal from "./ManageCategoriesModal";
import { useBudgetContext } from "../context/useBudgetContext";
import { authHeaders } from "../utils/auth";


function AllocationRing({ allocated, total }) {
  const pct = total > 0 ? Math.min(allocated / total, 1) : 0;
  const r = 72; const cx = 90; const cy = 90;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct);
  const isOver = allocated > total && total > 0;
  const isDone = total > 0 && Math.round(allocated * 100) === Math.round(total * 100);

  return (
    <svg viewBox="0 0 180 180" className="w-44 h-44">
      <defs>
        <linearGradient id="alloc-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#67e8f9" />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="12" />
      {pct > 0 && (
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={isOver ? "#f87171" : isDone ? "#34d399" : "url(#alloc-grad)"}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      )}
      <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="22" fontWeight="700" fontFamily="system-ui">
        {(pct * 100).toFixed(0)}%
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="11" fontFamily="system-ui">
        allocated
      </text>
    </svg>
  );
}

export default function BudgetManager() {
  const {
    currentBudgetID,
    selectBudget,
    currentCategories,
    setCurrentCategories,
    allBudgets,
    updateBudgetCache,
    addBudgetToCache,
    isLoading,
    userCategories,
  } = useBudgetContext();

  const empty = () => (userCategories ?? []).reduce((a, { name }) => ({ ...a, [name]: "" }), {});

  const [totalBudget, setTotalBudget]     = useState("");
  const [cats, setCats]                   = useState({});
  const [saved, setSaved]                 = useState(false);
  const [error, setError]                 = useState("");
  const [isEditing, setIsEditing]         = useState(false);
  const [snapshot, setSnapshot]           = useState({ totalBudget: "", cats: {} });
  const [isCreateOpen, setIsCreateOpen]   = useState(false);
  const [isManageOpen, setIsManageOpen]   = useState(false);

  useEffect(() => {
    const budget = allBudgets[currentBudgetID];
    setTotalBudget(budget ? String(budget.budget_amount) : "");
    setIsEditing(false);
  }, [currentBudgetID, allBudgets]);

  useEffect(() => {
    const b = empty();
    (currentCategories ?? []).forEach((c) => { b[c.category] = String(c.amount ?? ""); });
    setCats(b);
    setIsEditing(false);
  }, [currentCategories, userCategories]);

  const allocated  = Object.values(cats).reduce((s, v) => s + (Number(v) || 0), 0);
  const totalNum   = Number(totalBudget) || 0;
  const remaining  = totalNum - allocated;
  const isBalanced = totalNum > 0 && Math.round(allocated * 100) === Math.round(totalNum * 100);

  function handleEdit() {
    setSnapshot({ totalBudget, cats: { ...cats } });
    setIsEditing(true);
    setError("");
  }

  function handleCancel() {
    setTotalBudget(snapshot.totalBudget);
    setCats(snapshot.cats);
    setIsEditing(false);
    setError("");
  }

  function handleCatChange(cat, value) {
    setCats((prev) => ({ ...prev, [cat]: value }));
    setError("");
  }

  function handleUpdate() {
    if (!totalNum || totalNum <= 0) { setError("Enter a valid total budget."); return; }
    if (!isBalanced) {
      setError(`Allocations must equal $${totalNum.toFixed(2)}. Currently $${allocated.toFixed(2)}.`);
      return;
    }
    setError("");

    const newCategories = Object.entries(cats)
      .filter(([, v]) => v)
      .map(([category, amount]) => ({ category, amount: Number(amount) }));

    fetch("/api/updateBudget", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ budget_id: currentBudgetID, total_budget: totalNum, categories: newCategories }),
    })
      .then((r) => r.json())
      .then(() => {
        updateBudgetCache(currentBudgetID, totalNum, newCategories);
        setCurrentCategories(newCategories);
        setIsEditing(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      })
      .catch(() => setError("Failed to save. Try again."));
  }

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen" style={{ background: "#0c0c18" }}>

      {/* Hero */}
      <div
        className="px-5 pt-6 pb-10"
        style={{
          background: "linear-gradient(160deg, #0a1628 0%, #0c3a54 55%, #0a2a3a 100%)",
          borderRadius: "0 0 28px 28px",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-lg font-bold text-white tracking-tight">Budget Manager</h1>
          {Object.keys(allBudgets).length > 0 && (
            <select
              value={currentBudgetID ?? ""}
              onChange={(e) => selectBudget(e.target.value)}
              className="h-8 px-3 text-xs font-semibold text-white/70 border border-white/12 focus:outline-none appearance-none cursor-pointer max-w-[160px] truncate"
              style={{ background: "rgba(255,255,255,0.08)", borderRadius: "8px" }}
            >
              {Object.entries(allBudgets).map(([id, b]) => (
                <option key={id} value={id} style={{ background: "#0c1a2e" }}>
                  {b.description || `Budget ${id}`}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-6">
          <AllocationRing allocated={allocated} total={totalNum} />

          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/35 uppercase tracking-widest mb-2">Monthly budget</p>
            <div className="flex items-baseline gap-1 mb-5">
              <span className="text-xl font-semibold text-white/30">$</span>
              <input
                type="number" step="0.01" min="0"
                value={totalBudget}
                onChange={(e) => { setTotalBudget(e.target.value); setSaved(false); setError(""); }}
                placeholder="0"
                className="bg-transparent text-3xl font-bold text-white focus:outline-none placeholder:text-white/15 w-full"
                style={{ border: "none", padding: 0, height: "auto", borderRadius: 0, WebkitAppearance: "none" }}
              />
            </div>

            <div className="space-y-2">
              {[
                { label: "Allocated", val: allocated, color: "#5eead4" },
                { label: "Remaining", val: remaining, color: remaining < 0 ? "#f87171" : remaining === 0 ? "#34d399" : "#fbbf24" },
              ].map((s) => (
                <div key={s.label} className="flex justify-between">
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</span>
                  <span className="text-xs font-semibold" style={{ color: s.color }}>${s.val.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-6 pb-28">
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-xs font-medium text-white/30 uppercase tracking-widest">Allocations</p>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsManageOpen(true)}
                className="flex items-center gap-1.5 px-3 h-7 text-xs font-semibold text-white/60 transition-opacity hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.07)", borderRadius: "8px", border: "none", cursor: "pointer" }}
              >
                <Settings className="w-3 h-3" /> Manage
              </button>
            )}
            {!isEditing && (
              <button
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center gap-1.5 px-3 h-7 text-xs font-semibold text-white/60 transition-opacity hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.07)", borderRadius: "8px", border: "none", cursor: "pointer" }}
              >
                <Plus className="w-3 h-3" /> New
              </button>
            )}
            {!isEditing && (
              <button
                onClick={handleEdit}
                className="flex items-center gap-1.5 px-3 h-7 text-xs font-semibold text-white/60 transition-opacity hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.07)", borderRadius: "8px", border: "none", cursor: "pointer" }}
              >
                <Pencil className="w-3 h-3" /> Edit
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {(userCategories ?? []).map(({ name, color }) => (
            <CategoryCard
              key={name}
              cat={name}
              color={color}
              value={cats[name]}
              totalNum={totalNum}
              isEditing={isEditing}
              onChange={handleCatChange}
            />
          ))}
        </div>

        {error && (
          <div className="mt-4 flex gap-2.5 items-start px-4 py-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px" }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#f87171" }} />
            <p className="text-sm" style={{ color: "#fca5a5" }}>{error}</p>
          </div>
        )}
        {saved && (
          <div className="mt-4 flex gap-2.5 items-center px-4 py-3" style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: "10px" }}>
            <Check className="w-4 h-4 flex-shrink-0" style={{ color: "#34d399" }} />
            <p className="text-sm" style={{ color: "#6ee7b7" }}>Budget saved</p>
          </div>
        )}

        {isEditing && (
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 flex items-center justify-center gap-2 text-white/60 text-sm font-semibold transition-opacity hover:opacity-80"
              style={{
                height: "48px", background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", cursor: "pointer",
              }}
            >
              <X className="w-4 h-4" /> Cancel
            </button>
            <button
              onClick={handleUpdate}
              className="flex-1 text-white text-sm font-semibold transition-opacity hover:opacity-90 active:opacity-75"
              style={{
                height: "48px", background: "linear-gradient(135deg, #14b8a6, #0ea5e9)",
                border: "none", borderRadius: "12px", cursor: "pointer",
                boxShadow: "0 4px 20px rgba(20,184,166,0.25)",
              }}
            >
              Update
            </button>
          </div>
        )}
      </div>

      <CreateBudgetModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={addBudgetToCache}
      />
      <ManageCategoriesModal
        open={isManageOpen}
        onClose={() => setIsManageOpen(false)}
      />
    </div>
  );
}
