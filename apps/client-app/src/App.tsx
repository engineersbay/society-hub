import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import { Shell } from "./components/Shell";
import { LoginPage } from "./pages/LoginPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { SelectSocietyPage } from "./pages/SelectSocietyPage";
import { ComplaintsPage } from "./pages/ComplaintsPage";
import { ComplaintDetailPage } from "./pages/ComplaintDetailPage";
import { NewComplaintPage } from "./pages/NewComplaintPage";
import { AccountPage } from "./pages/AccountPage";
import { DashboardPage } from "./pages/DashboardPage";
import { BillsPage } from "./pages/BillsPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { NoticesPage } from "./pages/NoticesPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { VisitorsPage } from "./pages/VisitorsPage";
import { ParkingPage } from "./pages/ParkingPage";
import { BookingsPage } from "./pages/BookingsPage";

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-8">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/select-society"
        element={
          <Protected>
            <SelectSocietyPage />
          </Protected>
        }
      />
      <Route
        path="/"
        element={
          <Protected>
            <Shell />
          </Protected>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="complaints" element={<ComplaintsPage />} />
        <Route path="complaints/new" element={<NewComplaintPage />} />
        <Route path="complaints/:id" element={<ComplaintDetailPage />} />
        <Route path="bills" element={<BillsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="notices" element={<NoticesPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="visitors" element={<VisitorsPage />} />
        <Route path="parking" element={<ParkingPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="pin" element={<Navigate to="/account" replace />} />
      </Route>
    </Routes>
  );
}
