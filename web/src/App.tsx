import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

import { LoadingScreen } from "./components/LoadingScreen";
import { HomePage } from "./pages/HomePage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ClientProvider } from "./context/ClientContext";
import { AppLayout } from "./layouts/AppLayout";
import { BillingReturnPage } from "./pages/BillingReturnPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { QueryHistoryPage } from "./pages/QueryHistoryPage";

const AuthenticatedApp = lazy(() => import("./AuthenticatedApp"));

export function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/*"
        element={
          <Suspense fallback={<LoadingScreen message="Loading application…" />}>
            <AuthenticatedApp />
          </Suspense>
        }
      />
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
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <DashboardPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <QueryHistoryPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ClientProvider>
    </AuthProvider>
    </Routes>
  );
}

export default App;
