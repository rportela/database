import { useEffect, useMemo, useRef } from "react";
import * as firebaseui from "firebaseui";
import { EmailAuthProvider, GoogleAuthProvider } from "firebase/auth";
import { useNavigate } from "react-router-dom";

import { LoadingScreen } from "../components/LoadingScreen";
import { useAuth } from "../context/AuthContext";
import { auth } from "../lib/firebase";
import { features } from "../lib/config";

export function LoginPage(): JSX.Element {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const uiRef = useRef<firebaseui.auth.AuthUI | null>(null);

  const signInOptions = useMemo(() => {
    const options = [EmailAuthProvider.PROVIDER_ID];
    if (features.enableGoogleSignIn) {
      options.push(GoogleAuthProvider.PROVIDER_ID);
    }
    return options;
  }, []);

  useEffect(() => {
    if (!loading && user) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <LoadingScreen message="Checking your session…" />;
  }

  if (user) {
    return <LoadingScreen message="Redirecting…" />;
  }

  useEffect(() => {
    if (!uiRef.current) {
      uiRef.current = firebaseui.auth.AuthUI.getInstance() ?? new firebaseui.auth.AuthUI(auth);
    }
    const uiConfig: firebaseui.auth.Config = {
      signInFlow: "popup",
      signInOptions,
      callbacks: {
        signInSuccessWithAuthResult: () => false,
      },
    };
    uiRef.current.start("#firebaseui-auth-container", uiConfig);
    return () => {
      uiRef.current?.reset();
    };
  }, [signInOptions]);

  return (
    <div className="app-shell" style={{ justifyContent: "center" }}>
      <main className="app-main" style={{ maxWidth: "520px", width: "100%" }}>
        <div className="firebase-card">
          <h1>Lakeview Console</h1>
          <p>Sign in to access your Iceberg datasets, run SQL, and manage billing.</p>
          <div id="firebaseui-auth-container" />
        </div>
      </main>
    </div>
  );
}
