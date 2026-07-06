import { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { useBudgetContext } from "../context/useBudgetContext";
import { CATEGORY_COLORS, PERIODS } from "../constants";
import { authHeaders } from "../utils/auth";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 text-xs"
      style={{ background: "#1e1e2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
    >
      <p className="text-white/50 mb-0.5">{label}</p>
      <p className="text-white font-bold">${payload[0].value.toFixed(2)}</p>
    </div>
  );
}

export default function Trend() {
  const [trendTransactions, setTrendTransactions] = useState([])
  const [curTrendTransaction, setCurTrendTransaction] = useState([])
  const [pastTrendTransaction, setPastTrendTransaction] = useState([])
  const [isLoadingTrend, setIsLoadingTrend] = useState(false)  
  const { allTransactions } = useBudgetContext();
  const [filterCategory, setFilterCategory] = useState("");
  const [period, setPeriod] = useState("M");


  const periodDays = PERIODS.find((p) => p.label === period)?.days ?? 30;

  const cutoffDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - periodDays + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, [periodDays]);

  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const todayDate = useMemo(() => fmt(new Date()), []);

  async function dataForRange(start_date, end_date, periodDays) {
    setIsLoadingTrend(true);
    try {
      const response = await fetch(`/api/get_transactions_for_range?start_date=${start_date}&end_date=${end_date}&time_frame=${periodDays}`, {
        method: "GET",
        headers: { "Content-Type": "application/json", ...authHeaders() },
      });

      const data = await response.json();

      setTrendTransactions(data["all_tran"])
      setCurTrendTransaction(data["cur_tran"])
      setPastTrendTransaction(data["trend_tran"])
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingTrend(false);
    }
  }

  useEffect(()=>{

  dataForRange(cutoffDate, todayDate, periodDays)

  }, [period])

  const allTxFlat = useMemo(
    () => Object.values(trendTransactions ?? {}).flat(),
    [trendTransactions]
  );

  const categories = useMemo(
    () => [...new Set(allTxFlat.map((t) => t.category))].sort(),
    [allTxFlat]
  );

  const categoryColor = CATEGORY_COLORS[filterCategory] ?? CATEGORY_COLORS["All"];

  const filtered = useMemo(
    () => allTxFlat
      .filter((t) => !filterCategory || t.category === filterCategory),
    [allTxFlat, cutoffDate, todayDate, filterCategory]
  );

  const chartData = useMemo(() => {

    const byDate = {};
    filtered.forEach((t) => {
      byDate[t.date] = (byDate[t.date] ?? 0) + t.amount;
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({ date: date.slice(5), total }));
  }, [filtered, period]);

  const totalSpent = useMemo(
    () => filtered.reduce((s, t) => s + t.amount, 0),
    [filtered]
  );

  const groupLabel = period === "Y" || period === "3M" ? "month" : "day";

  return (
    <div className="flex flex-col h-full px-4 pt-6 pb-24 overflow-y-auto">
      {isLoadingTrend && (
        <div className="fixed top-0 left-0 right-0 z-[400] h-0.5" style={{ background: "rgba(255,255,255,0.05)" }}>
          <div className="h-full animate-pulse" style={{ background: "linear-gradient(90deg, #14b8a6, #67e8f9)", width: "60%" }} />
        </div>
      )}
      <h1 className="text-lg font-bold text-white tracking-tight mb-4">Spending Trend</h1>

      <div
        className="flex items-center mb-4"
        style={{ background: "rgba(255,255,255,0.05)", borderRadius: "10px", padding: "4px" }}
      >
        {PERIODS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => setPeriod(p.label)}
            className="flex-1 text-xs font-semibold py-1.5 transition-all"
            style={{
              borderRadius: "7px",
              border: "none",
              cursor: "pointer",
              background: period === p.label ? "#14b8a6" : "transparent",
              color: period === p.label ? "#fff" : "rgba(255,255,255,0.4)",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mb-3">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="h-9 px-3 text-xs text-white/70 focus:outline-none appearance-none cursor-pointer"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
          }}
        >
          <option value="" style={{ background: "#0c1a2e" }}>All categories</option>
          {categories.map((c) => (
            <option key={c} value={c} style={{ background: "#0c1a2e" }}>{c}</option>
          ))}
        </select>
      </div>

      <div
        className="p-4 mb-4"
        style={{ background: "#13131e", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px" }}
      >
        <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>Total spent</p>
        <p className="text-2xl font-bold text-white mb-4">${totalSpent.toFixed(2)}</p>

        {chartData.length === 0 ? (
          <p className="text-sm text-center py-10" style={{ color: "rgba(255,255,255,0.2)" }}>
            No transactions in this period.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ left: -10, right: 8, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={categoryColor} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)" }} />
              <Line
                dataKey="total"
                type="monotone"
                stroke="url(#line-grad)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: categoryColor, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {chartData.length > 0 && (
        <div
          className="flex items-center gap-2 px-4 py-3 mb-4"
          style={{ background: "#13131e", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px" }}
        >
          <TrendingUp className="w-4 h-4 text-teal-400 flex-shrink-0" />
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
            {chartData.length} {groupLabel}{chartData.length !== 1 ? "s" : ""} with transactions
          </p>
        </div>
      )}

      <p className="text-xs font-semibold mb-3" style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
        vs previous period
      </p>

      <div className="flex flex-col gap-2">
        {Object.keys(CATEGORY_COLORS).filter((cat) => cat !== "All").map((cat) => {
          const cur  = curTrendTransaction?.[cat]?.total  ?? 0;
          const past = pastTrendTransaction?.[cat]?.total ?? 0;
          const diff = cur - past;
          const isUp = diff > 0;
          const isNeutral = diff === 0;
          const diffColor = isNeutral ? "rgba(255,255,255,0.3)" : isUp ? "#f87171" : "#4ade80";
          const arrow = isNeutral ? "—" : isUp ? "↑" : "↓";

          return (
            <div
              key={cat}
              style={{
                background: "#13131e",
                border: "1px solid rgba(255,255,255,0.07)",
                borderLeft: `3px solid ${CATEGORY_COLORS[cat]}`,
                borderRadius: "12px",
              }}
            >
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">{cat}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                    ${cur.toFixed(2)} <span style={{ color: "rgba(255,255,255,0.15)" }}>vs</span> ${past.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold" style={{ color: diffColor }}>
                    {arrow} ${Math.abs(diff).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}