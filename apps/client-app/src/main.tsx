import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./auth";
import { AppModeProvider } from "./app-mode";
import { App } from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppModeProvider>
          <App />
        </AppModeProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
