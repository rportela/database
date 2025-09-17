import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

import { ClientSelector } from "../components/ClientSelector";
import { useAuth } from "../context/AuthContext";

export function AppLayout({ children }: { children: ReactNode }): JSX.Element {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Failed to sign out", error);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-actions">
          <span className="logo">Lakeview</span>
          <ClientSelector />
        </div>
        <div className="header-actions">
          {user ? <span className="user-pill">{user.email ?? user.displayName ?? user.uid}</span> : null}
          <button type="button" className="signout-button" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>
      <nav className="app-nav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : undefined)}>
          Overview
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => (isActive ? "active" : undefined)}>
          History
        </NavLink>
      </nav>
      <main className="app-main">{children}</main>
    </div>
  );
}
