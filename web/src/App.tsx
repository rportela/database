import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

import { LoadingScreen } from "./components/LoadingScreen";
import { HomePage } from "./pages/HomePage";

const AuthenticatedApp = lazy(() => import("./AuthenticatedApp"));

export function App(): JSX.Element {
  return (
    <Suspense fallback={<LoadingScreen message="Loading application..." />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/*" element={<AuthenticatedApp />} />
      </Routes>
    </Suspense>
  );
}

export default App;
