export const CATEGORIES = [
  "Living",
  "Food",
  "Transportation",
  "Finance",
  "Miscellaneous",
  "Give",
];

export const CATEGORY_COLORS = {
  Living: "#14b8a6",
  Food: "#f59e0b",
  Transportation: "#3b82f6",
  Finance: "#a78bfa",
  Miscellaneous: "#ec4899",
  Give: "#84cc16",
};

export const MONTH_OPTIONS = (() => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("default", { month: "long", year: "numeric" }),
    });
  }
  return options;
})();

export const emptyCategoryBudgets = CATEGORIES.reduce(
  (acc, cat) => ({ ...acc, [cat]: "" }),
  {}
);

export function getAuthHeaders() {
  const token = localStorage.getItem("jmz_finance_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}
