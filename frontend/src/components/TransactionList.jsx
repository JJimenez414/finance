import { Pencil, Trash2 } from "lucide-react";

const CATEGORY_COLORS = {
  Living:         "#14b8a6",
  Food:           "#f59e0b",
  Transportation: "#60a5fa",
  Finance:        "#a78bfa",
  Miscellaneous:  "#f472b6",
  Give:           "#a3e635",
};

export default function TransactionList({ transactions, onEdit, onDelete }) {
  if (transactions.length === 0) {
    return (
      <div className="px-4 pt-2 flex-1 overflow-y-auto">
        <p className="text-sm text-center py-12" style={{ color: "rgba(255,255,255,0.25)" }}>
          No transactions this month.
        </p>
      </div>
    );
  }

  const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="px-4 pt-2 flex-1 overflow-y-auto">
      <ul className="space-y-2 pb-24">
        {sorted.map((t, i) => (
          <li
            key={t.id ?? i}
            className="flex items-center gap-3 px-4 py-3"
            style={{
              background: "#13131e",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.07)",
              borderLeft: `3px solid ${CATEGORY_COLORS[t.category] ?? "#fff"}`,
            }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-sm font-bold text-white">${t.amount.toFixed(2)}</p>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    borderRadius: "6px",
                    color: CATEGORY_COLORS[t.category] ?? "white",
                  }}
                >
                  {t.category}
                </span>
              </div>
              <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                {t.description || "—"} · {t.date}
              </p>
            </div>
            <button onClick={() => onEdit(t)} className="icon-btn">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(t.id)} className="icon-btn-danger">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
