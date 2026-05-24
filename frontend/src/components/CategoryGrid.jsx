const STATUS = {
  ok:    { label: "On track",    color: "#34d399" },
  close: { label: "Close",       color: "#fbbf24" },
  over:  { label: "Over budget", color: "#f87171" },
};

function statusFor(spent, budget) {
  if (budget <= 0) return spent > 0 ? "over" : "ok";
  const r = spent / budget;
  if (r > 1) return "over";
  if (r >= 0.85) return "close";
  return "ok";
}

export default function CategoryGrid({ byCategory, onCategoryClick }) {
  return (
    <div className="px-4 pt-2 pb-24 flex-1 overflow-y-auto">
      <div className="grid grid-cols-2 gap-2.5">
        {byCategory.map((cat) => {
          const st        = statusFor(cat.spent, cat.budget);
          const s         = STATUS[st];
          const hasBudget = cat.budget > 0;
          const leftover  = cat.budget - cat.spent;
          const pct       = hasBudget ? Math.min((cat.spent / cat.budget) * 100, 100) : 0;

          return (
            <button
              key={cat.name}
              type="button"
              onClick={() => onCategoryClick(cat.name)}
              style={{
                background: "#13131e",
                border: "1px solid rgba(255,255,255,0.07)",
                borderLeft: `3px solid ${cat.color}`,
                borderRadius: "12px",
                padding: 0,
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#1a1a28"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#13131e"; }}
            >
              <div className="p-3.5">
                <p className="text-sm font-semibold text-white mb-0.5">{cat.name}</p>
                <p className="text-[11px] mb-3" style={{ color: s.color }}>{s.label}</p>
                <p
                  className="text-xl font-bold mb-0.5"
                  style={{ color: hasBudget && leftover < 0 ? "#f87171" : "white" }}
                >
                  {hasBudget ? `$${leftover.toFixed(2)}` : `$${cat.spent.toFixed(2)}`}
                </p>
                <p className="text-xs mb-2.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {hasBudget ? `of $${cat.budget.toFixed(2)}` : "no budget set"}
                </p>
                <div className="h-1 overflow-hidden" style={{ background: "rgba(255,255,255,0.08)", borderRadius: "2px" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: st === "over" ? "#f87171" : st === "close" ? "#fbbf24" : cat.color,
                      borderRadius: "2px",
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
