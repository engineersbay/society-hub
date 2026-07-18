import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import { Shell } from "./components/Shell";
import { LoginPage } from "./pages/LoginPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { ComplaintsPage } from "./pages/ComplaintsPage";
import { ComplaintDetailPage } from "./pages/ComplaintDetailPage";
import { OnboardPage } from "./pages/OnboardPage";
import { AccountPage } from "./pages/AccountPage";
import { DashboardPage } from "./pages/DashboardPage";
import { SocietiesPage } from "./pages/SocietiesPage";
import { SocietyDetailPage } from "./pages/SocietyDetailPage";
import { InvitesPage } from "./pages/InvitesPage";
import { BillsPage } from "./pages/BillsPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { NoticesPage } from "./pages/NoticesPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { AuditPage } from "./pages/AuditPage";
import { TeamPage } from "./pages/TeamPage";
import { VisitorsPage } from "./pages/VisitorsPage";
import { ParkingPage } from "./pages/ParkingPage";
import { BookingsPage } from "./pages/BookingsPage";
import { AssetsPage } from "./pages/AssetsPage";
import { VendorsPage } from "./pages/VendorsPage";
import { EventsPage } from "./pages/EventsPage";

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
        <Route path="complaints/:id" element={<ComplaintDetailPage />} />
        <Route path="onboard" element={<OnboardPage />} />
        <Route path="invites" element={<InvitesPage />} />
        <Route path="societies" element={<SocietiesPage />} />
        <Route path="societies/:id" element={<SocietyDetailPage />} />
        <Route path="bills" element={<BillsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="notices" element={<NoticesPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="visitors" element={<VisitorsPage />} />
        <Route path="parking" element={<ParkingPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="assets" element={<AssetsPage />} />
        <Route path="vendors" element={<VendorsPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="pin" element={<Navigate to="/account" replace />} />
      </Route>
    </Routes>
  );
}
