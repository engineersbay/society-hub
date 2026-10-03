import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./auth";
import { SelectedSocietyProvider } from "./selected-society";
import { ViewAsProvider } from "./view-as";
import { App } from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ViewAsProvider>
          <SelectedSocietyProvider>
            <App />
          </SelectedSocietyProvider>
        </ViewAsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
