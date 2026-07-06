import { Home, Wallet, Plus, TrendingUp, LogOut } from "lucide-react";

const NAV_ITEMS = [
  { id: "tracker", label: "Finance",  Icon: Home },
  { id: "budget",  label: "Budget",   Icon: Wallet },
  null,
  { id: "trend",   label: "Trend",    Icon: TrendingUp },
  { id: "logout",  label: "Logout",   Icon: LogOut },
];

export default function NavButton({ onNavigate, currentPage, setIsAddTransactionOpen, onLogout }) {
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map((item, i) => {
        if (!item) {
          return (
            <div key="add" className="bottom-nav-add-wrapper">
              <button
                type="button"
                className="bottom-nav-add"
                onClick={() => setIsAddTransactionOpen(true)}
              >
                <Plus className="w-6 h-6 text-white" />
              </button>
            </div>
          );
        }

        const { id, label, Icon } = item;
        const isActive = currentPage === id;

        return (
          <button
            key={id}
            type="button"
            className="bottom-nav-item"
            onClick={() => id === "logout" ? onLogout() : onNavigate(id)}
          >
            <Icon
              className="w-5 h-5"
              style={{ color: isActive ? "#14b8a6" : "rgba(255,255,255,0.4)" }}
            />
            <span style={{ color: isActive ? "#14b8a6" : "rgba(255,255,255,0.4)" }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
