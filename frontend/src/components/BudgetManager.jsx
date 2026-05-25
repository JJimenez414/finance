import { useEffect, useState } from "react";
import { Check, AlertTriangle, Pencil, X } from "lucide-react";
import LoadingScreen from "./LoadingScreen";
import BudgetHero from "./BudgetHero";
import CategoryCard from "./CategoryCard";
import { useBudgetContext } from "../context/useBudgetContext";

const CATEGORIES = ["Living", "Food", "Transportation", "Finance", "Miscellaneous", "Give"];

const empty = () => CATEGORIES.reduce((a, c) => ({ ...a, [c]: "" }), {});

function authHeaders() {
  const t = localStorage.getItem("jmz_finance_access_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export default function BudgetManager() {
  const {
    currentMonth, setCurrentMonth,
    currentBudgetID, selectBudget,
    currentCategories, setCurrentCategories,
    allBudgets,
    updateBudgetCache,
    isLoading,
  } = useBudgetContext();

  const [totalBudget, setTotalBudget] = useState("");
  const [cats, setCats]               = useState(empty());
  const [saved, setSaved]             = useState(false);
  const [error, setError]             = useState("");
  const [isEditing, setIsEditing]     = useState(false);
  const [snapshot, setSnapshot]       = useState({ totalBudget: "", cats: empty() });

  useEffect(() => {
    const budget = allBudgets[currentBudgetID];
    setTotalBudget(budget ? String(budget.budget_amount) : "");
    setIsEditing(false);
  }, [currentBudgetID, allBudgets]);

  useEffect(() => {
    if (!currentCategories?.length) { setCats(empty()); return; }
    const b = empty();
    currentCategories.forEach((c) => { b[c.category] = String(c.amount ?? ""); });
    setCats(b);
    setIsEditing(false);
  }, [currentCategories]);

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
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ budget_id: currentBudgetID, total_budget: totalNum, categories: newCategories, month: currentMonth }),
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

      <BudgetHero
        currentMonth={currentMonth}        setCurrentMonth={setCurrentMonth}
        currentBudgetID={currentBudgetID}  selectBudget={selectBudget}
        allBudgets={allBudgets}
        totalBudget={totalBudget}          setTotalBudget={setTotalBudget}
        allocated={allocated}              remaining={remaining}
        isEditing={isEditing}
        setError={setError}
      />

      <div className="px-4 pt-6 pb-28">
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-xs font-medium text-white/30 uppercase tracking-widest">Allocations</p>
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

        <div className="grid grid-cols-2 gap-2.5">
          {CATEGORIES.map((cat) => (
            <CategoryCard
              key={cat}
              cat={cat}
              value={cats[cat]}
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
    </div>
  );
}
