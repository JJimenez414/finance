import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { BudgetProvider } from "./context/BudgetContext";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  // <React.StrictMode>
    <BudgetProvider>
      <App />
    </BudgetProvider>
  // </React.StrictMode>
);
