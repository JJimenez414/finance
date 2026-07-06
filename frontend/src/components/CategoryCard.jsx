export default function CategoryCard({ cat, color = "#888888", value, totalNum, isEditing, onChange }) {
  const num   = Number(value) || 0;
  const pct   = totalNum > 0 && num > 0 ? ((num / totalNum) * 100).toFixed(0) : null;

  return (
    <div
      style={{
        background: "#13131e",
        border: "1px solid rgba(255,255,255,0.07)",
        borderLeft: `3px solid ${color}`,
        borderRadius: "12px",
        opacity: isEditing ? 1 : 0.85,
      }}
    >
      <div className="p-3.5">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-sm font-semibold text-white">{cat}</p>
          {pct && <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>{pct}%</span>}
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: "rgba(255,255,255,0.3)" }}>$</span>
          <input
            type="number" step="0.01" min="0"
            value={value}
            onChange={(e) => onChange(cat, e.target.value)}
            placeholder="0.00"
            readOnly={!isEditing}
            className="w-full h-9 text-sm text-white placeholder:text-white/20 focus:outline-none transition-colors"
            style={{
              background: isEditing ? "rgba(255,255,255,0.05)" : "transparent",
              border: isEditing ? "1px solid rgba(255,255,255,0.09)" : "1px solid transparent",
              borderRadius: "8px",
              paddingLeft: "22px",
              paddingRight: "10px",
              WebkitAppearance: "none",
              appearance: "none",
              cursor: isEditing ? "text" : "default",
            }}
            onFocus={(e) => { if (isEditing) e.target.style.borderColor = color + "66"; }}
            onBlur={(e)  => { if (isEditing) e.target.style.borderColor = "rgba(255,255,255,0.09)"; }}
          />
        </div>
      </div>
    </div>
  );
}
