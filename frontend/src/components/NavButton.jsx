import { useEffect, useState } from "react";

export default function NavButton({onNavigate, setIsAddTransactionOpen}) {
    const [isFabOpen, setIsFabOpen] = useState(false);

    return (
    <div className="fab-container">
        {isFabOpen && (
          <div className="fab-backdrop" onClick={() => setIsFabOpen(false)} />
        )}
        {isFabOpen && (
          <div className="fab-menu">
            <button
              type="button"
              className="fab-item"
              onClick={() => { setIsAddTransactionOpen(true); setIsFabOpen(false); }}
            >
              <span className="fab-item-label">Add Transaction</span>
              <span className="fab-item-icon">+</span>
            </button>
            <button
              type="button"
              className="fab-item"
              onClick={() => { onNavigate("budget"); setIsFabOpen(false); }}
            >
              <span className="fab-item-label">Budget Manager</span>
              <span className="fab-item-icon">$</span>
            </button>
            <button
              type="button"
              className="fab-item"
              onClick={() => { onNavigate("tracker"); setIsFabOpen(false); }}
            >
              <span className="fab-item-label">Finance Tracker</span>
              <span className="fab-item-icon">≡</span>
            </button>
          </div>
        )}
        <button
          type="button"
          className={`add-transaction-fab ${isFabOpen ? "open" : ""}`}
          onClick={() => setIsFabOpen((prev) => !prev)}
        >
          {isFabOpen ? "×" : "+"}
        </button>
      </div>
    )
}