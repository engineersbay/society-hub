import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import { Shell } from "./components/Shell";
import { LoginPage } from "./pages/LoginPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { AccountPage } from "./pages/AccountPage";
import { SocietiesPage } from "./pages/SocietiesPage";
import { SocietyDetailPage } from "./pages/SocietyDetailPage";

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
        <Route index element={<Navigate to="/societies" replace />} />
        <Route path="societies" element={<SocietiesPage />} />
        <Route path="societies/:id" element={<SocietyDetailPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="*" element={<Navigate to="/societies" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/societies" replace />} />
    </Routes>
  );
}
