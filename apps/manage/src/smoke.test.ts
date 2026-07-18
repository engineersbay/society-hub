import { describe, expect, it } from "vitest";
import { App } from "./App";
import { Shell } from "./components/Shell";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ComplaintsPage } from "./pages/ComplaintsPage";
import { SocietiesPage } from "./pages/SocietiesPage";
import { BillsPage } from "./pages/BillsPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { NoticesPage } from "./pages/NoticesPage";

describe("web smoke unit", () => {
  it("placeholder passes", () => {
    expect(true).toBe(true);
  });

  it("App and its routed pages import without throwing", () => {
    for (const component of [
      App,
      Shell,
      LoginPage,
      DashboardPage,
      ComplaintsPage,
      SocietiesPage,
      BillsPage,
      PaymentsPage,
      NoticesPage,
    ]) {
      expect(typeof component).toBe("function");
    }
  });
});
