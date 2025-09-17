import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Timestamp, doc, onSnapshot } from "firebase/firestore";

import { db } from "../lib/firebase";
import { useAuth } from "./AuthContext";

export interface ClientMembership {
  clientId: string;
  role: string;
  joinedAt?: Date | null;
}

interface ClientContextValue {
  memberships: ClientMembership[];
  activeClientId: string | null;
  activeMembership: ClientMembership | null;
  selectClient: (clientId: string) => void;
  loading: boolean;
}

const ClientContext = createContext<ClientContextValue | undefined>(undefined);

const toDate = (value: unknown): Date | null => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (typeof value === "number") {
    return new Date(value * 1000);
  }
  return null;
};

export function ClientProvider({ children }: { children: ReactNode }): JSX.Element {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<ClientMembership[]>([]);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user) {
      setMemberships([]);
      setActiveClientId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const userRef = doc(db, "users", user.uid);

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        const data = snapshot.data() as { orgs?: Record<string, { role?: string; joined_at?: unknown }> } | undefined;
        const entries = Object.entries(data?.orgs ?? {});
        const nextMemberships = entries.map(([clientId, meta]) => ({
          clientId,
          role: meta?.role ?? "member",
          joinedAt: toDate(meta?.joined_at ?? null),
        }));
        nextMemberships.sort((a, b) => {
          if (!a.joinedAt || !b.joinedAt) {
            return a.clientId.localeCompare(b.clientId);
          }
          return a.joinedAt.getTime() - b.joinedAt.getTime();
        });
        setMemberships(nextMemberships);
        setActiveClientId((current) => {
          if (current && nextMemberships.some((membership) => membership.clientId === current)) {
            return current;
          }
          return nextMemberships[0]?.clientId ?? null;
        });
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load client memberships", error);
        setMemberships([]);
        setActiveClientId(null);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  const selectClient = useCallback(
    (clientId: string) => {
      setActiveClientId((current) => {
        if (current === clientId) {
          return current;
        }
        return memberships.some((membership) => membership.clientId === clientId) ? clientId : current;
      });
    },
    [memberships],
  );

  const activeMembership = useMemo(
    () => memberships.find((membership) => membership.clientId === activeClientId) ?? null,
    [memberships, activeClientId],
  );

  const value = useMemo<ClientContextValue>(
    () => ({ memberships, activeClientId, activeMembership, selectClient, loading }),
    [memberships, activeClientId, activeMembership, selectClient, loading],
  );

  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>;
}

export const useClientContext = (): ClientContextValue => {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error("useClientContext must be used within a ClientProvider");
  }
  return context;
};
