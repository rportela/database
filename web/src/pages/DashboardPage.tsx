import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Timestamp, doc, getDoc } from "firebase/firestore";

import { LoadingScreen } from "../components/LoadingScreen";
import { PlanSummaryCard } from "../components/PlanSummaryCard";
import { QueryEditor } from "../components/QueryEditor";
import { UsageCharts } from "../components/UsageCharts";
import { useClientContext } from "../context/ClientContext";
import { fetchPlanCatalog } from "../lib/billingClient";
import { db } from "../lib/firebase";
import { queryKeys } from "../lib/queryKeys";
import type { ClientEntitlements, ClientProfile } from "../types/client";

const toDate = (value: unknown): Date | null => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (typeof value === "number") {
    const normalised = value > 1e12 ? value : value * 1000;
    return new Date(normalised);
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

const normaliseEntitlements = (raw: Record<string, unknown> | undefined): ClientEntitlements => {
  if (!raw) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(raw).map(([key, value]) => {
      if (value === null || value === undefined) {
        return [key, null];
      }
      if (typeof value === "number") {
        return [key, value];
      }
      const parsed = Number(value);
      return [key, Number.isFinite(parsed) ? parsed : undefined];
    }),
  );
};

const loadClientProfile = async (clientId: string): Promise<ClientProfile> => {
  const snapshot = await getDoc(doc(db, "clients", clientId));
  if (!snapshot.exists()) {
    throw new Error("Client not found");
  }
  const data = snapshot.data() as Record<string, unknown>;
  return {
    id: snapshot.id,
    displayName:
      (typeof data.display_name === "string" && data.display_name) ||
      (typeof data.name === "string" && data.name) ||
      undefined,
    planId: typeof data.plan_id === "string" ? data.plan_id : typeof data.plan === "string" ? data.plan : undefined,
    planName: typeof data.plan_name === "string" ? data.plan_name : undefined,
    priceId: typeof data.price_id === "string" ? data.price_id : undefined,
    subscriptionStatus:
      typeof data.subscription_status === "string" ? data.subscription_status : undefined,
    subscriptionId: typeof data.subscription_id === "string" ? data.subscription_id : undefined,
    stripeCustomerId: typeof data.stripe_customer_id === "string" ? data.stripe_customer_id : undefined,
    currentPeriodEnd: toDate(data.current_period_end),
    updatedAt: toDate(data.updated_at),
    entitlements: normaliseEntitlements(data.entitlements as Record<string, unknown> | undefined),
  };
};

export function DashboardPage(): JSX.Element {
  const { activeClientId, loading: clientLoading } = useClientContext();
  const clientId = activeClientId ?? "";

  const clientQuery = useQuery({
    queryKey: queryKeys.clientProfile(clientId),
    queryFn: () => loadClientProfile(clientId),
    enabled: Boolean(activeClientId),
    staleTime: 60_000,
  });

  const planCatalogQuery = useQuery({
    queryKey: queryKeys.planCatalog,
    queryFn: fetchPlanCatalog,
    enabled: Boolean(activeClientId),
    staleTime: 5 * 60_000,
  });

  const planCatalog = planCatalogQuery.data;

  const clientProfile = clientQuery.data;

  const headerTitle = useMemo(() => {
    if (!clientProfile) {
      return "Workspace";
    }
    return clientProfile.displayName ?? clientProfile.id;
  }, [clientProfile]);

  if (clientLoading) {
    return <LoadingScreen message="Loading workspace access…" />;
  }

  if (!activeClientId) {
    return (
      <div>
        <section className="card">
          <h2>Welcome to the Lakeview Console</h2>
          <p className="muted">
            You are not yet assigned to a workspace. Ask an administrator to add you to a client, or create a new tenant from the
            provisioning tools.
          </p>
        </section>
      </div>
    );
  }

  if (clientQuery.isLoading || !clientProfile) {
    return <LoadingScreen message="Fetching client profile…" />;
  }

  if (clientQuery.isError) {
    const message = clientQuery.error instanceof Error ? clientQuery.error.message : "Unknown error";
    return (
      <div>
        <section className="card">
          <h2>Unable to load client</h2>
          <p className="error-text">{message}</p>
        </section>
      </div>
    );
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>{headerTitle}</h1>
          <p>Client ID: {clientProfile.id}</p>
        </div>
      </div>
      <PlanSummaryCard client={clientProfile} planCatalog={planCatalog} />
      <UsageCharts clientId={clientProfile.id} />
      <QueryEditor clientId={clientProfile.id} />
    </div>
  );
}
