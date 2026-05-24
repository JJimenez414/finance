import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { BudgetProvider } from "./context/FinanceContext";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  // <React.StrictMode>
    <BudgetProvider>
      <App />
    </BudgetProvider>
  // </React.StrictMode>
);
