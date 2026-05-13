import { createRoot } from "react-dom/client";
import App from "./App";
import { BudgetProvider } from "./context/BudgetContext";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <BudgetProvider>
    <App />
  </BudgetProvider>
);
