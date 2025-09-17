import type { ReactElement } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { LoadingScreen } from "./components/LoadingScreen";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ClientProvider } from "./context/ClientContext";
import { AppLayout } from "./layouts/AppLayout";
import { BillingReturnPage } from "./pages/BillingReturnPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";

function ProtectedRoute({ children }: { children: ReactElement }): JSX.Element {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen message="Checking authentication…" />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export default function AuthenticatedApp(): JSX.Element {
  return (
    <AuthProvider>
      <ClientProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
            <Route
              path="/billing/success"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <BillingReturnPage status="success" />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/billing/cancel"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <BillingReturnPage status="cancel" />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <DashboardPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
      </ClientProvider>
    </AuthProvider>
  );
}
