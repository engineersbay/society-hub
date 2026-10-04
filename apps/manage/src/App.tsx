import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import { Shell } from "./components/Shell";
import { LoginPage } from "./pages/LoginPage";
import { SocietyOnboardPage } from "./pages/SocietyOnboardPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { AccountPage } from "./pages/AccountPage";
import { DashboardPage } from "./pages/DashboardPage";
import { SocietiesPage } from "./pages/SocietiesPage";
import { SocietyDetailPage } from "./pages/SocietyDetailPage";
import { UsersPage } from "./pages/UsersPage";
import { UserDetailPage } from "./pages/UserDetailPage";
import { AuditPage } from "./pages/AuditPage";
import { CommunicationsPage } from "./pages/CommunicationsPage";
import { BrandingPage } from "./pages/BrandingPage";
import { SocietyBillingPage } from "./pages/SocietyBillingPage";
import {
  StructureRedirect,
  TenantSocietyDashboard,
} from "./pages/TenantSocietyDashboard";
import {
  AnnouncementsPage,
  DiscountsPage,
  FeatureFlagsPage,
  IntegrationsPage,
  PlatformBillsPage,
  PlatformPaymentsPage,
  SocietySettingsManagePage,
  SubscriptionsPage,
  SupportInboxPage,
} from "./pages/CommercialPages";

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
      <Route path="/onboard" element={<SocietyOnboardPage />} />
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
        <Route path="society" element={<TenantSocietyDashboard />} />
        <Route path="structure" element={<StructureRedirect />} />
        <Route path="societies" element={<SocietiesPage />} />
        <Route path="societies/:id" element={<SocietyDetailPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/:id" element={<UserDetailPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="communications" element={<CommunicationsPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="feature-flags" element={<FeatureFlagsPage />} />
        <Route path="branding" element={<BrandingPage />} />
        <Route path="society-settings" element={<SocietySettingsManagePage />} />
        <Route path="society-billing" element={<SocietyBillingPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="discounts" element={<DiscountsPage />} />
        <Route path="bills" element={<PlatformBillsPage />} />
        <Route path="payments" element={<PlatformPaymentsPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="support" element={<SupportInboxPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
