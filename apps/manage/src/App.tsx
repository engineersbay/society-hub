import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import { Shell } from "./components/Shell";
import { LoginPage } from "./pages/LoginPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { ComplaintsPage } from "./pages/ComplaintsPage";
import { ComplaintDetailPage } from "./pages/ComplaintDetailPage";
import { OnboardPage } from "./pages/OnboardPage";
import { ComingSoonPage } from "./pages/ComingSoonPage";
import { AccountPage } from "./pages/AccountPage";

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
        <Route index element={<Navigate to="/complaints" replace />} />
        <Route path="complaints" element={<ComplaintsPage />} />
        <Route path="complaints/:id" element={<ComplaintDetailPage />} />
        <Route path="onboard" element={<OnboardPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="pin" element={<Navigate to="/account" replace />} />
        <Route path="bills" element={<ComingSoonPage title="Bills" />} />
        <Route path="payments" element={<ComingSoonPage title="Payments" />} />
        <Route path="notices" element={<ComingSoonPage title="Notices" />} />
        <Route path="dashboard" element={<ComingSoonPage title="Dashboard" />} />
      </Route>
    </Routes>
  );
}
