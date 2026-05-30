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

export default function BudgetHero({
  currentMonth, setCurrentMonth,
  currentBudgetID, selectBudget,
  allBudgets,
  totalBudget, setTotalBudget,
  allocated, remaining,
  isEditing,
  setError,
}) {
  const totalNum = Number(totalBudget) || 0;

  return (
    <div
      className="px-5 pt-6 pb-10"
      style={{
        background: "linear-gradient(160deg, #0a1628 0%, #0c3a54 55%, #0a2a3a 100%)",
        borderRadius: "0 0 28px 28px",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-bold text-white tracking-tight">Budget Manager</h1>
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

      <div className="flex items-center gap-6">
        <AllocationRing allocated={allocated} total={totalNum} />

        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/35 uppercase tracking-widest mb-2">Monthly budget</p>
          <div className="flex items-baseline gap-1 mb-5">
            <span className="text-xl font-semibold text-white/30">$</span>
            <input
              type="number" step="0.01" min="0"
              value={totalBudget}
              onChange={(e) => { setTotalBudget(e.target.value); setError(""); }}
              placeholder="0"
              readOnly={!isEditing}
              className="bg-transparent text-3xl font-bold text-white focus:outline-none placeholder:text-white/15 w-full"
              style={{
                border: "none", padding: 0, height: "auto", borderRadius: 0,
                WebkitAppearance: "none",
                opacity: isEditing ? 1 : 0.6,
                cursor: isEditing ? "text" : "default",
              }}
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
  );
}
