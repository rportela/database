import { useEffect, useMemo, useState } from "react";

import { formatDateLabel, formatRelativeTime, formatScanVolume, formatInteger } from "../utils/format";
import type { ClientProfile } from "../types/client";
import { BillingPortalButton } from "./BillingPortalButton";
import { StripeCheckoutButton } from "./StripeCheckoutButton";

const ENTITLEMENT_LABELS: Record<string, string> = {
  max_queries_per_day: "Queries per day",
  max_scan_mb_per_day: "Data scanned per day",
  max_concurrent_queries: "Concurrent queries",
  max_result_rows: "Result row limit",
};

const statusClass = (status?: string): string => {
  if (!status) {
    return "badge badge-muted";
  }
  const normalized = status.toLowerCase();
  if (["active", "trialing"].includes(normalized)) {
    return "badge badge-success";
  }
  if (["past_due", "incomplete"].includes(normalized)) {
    return "badge badge-warning";
  }
  if (["canceled", "unpaid"].includes(normalized)) {
    return "badge badge-danger";
  }
  return "badge badge-muted";
};

const statusLabel = (status?: string): string => {
  if (!status) {
    return "Unknown";
  }
  return status.replace(/_/g, " ");
};

interface PlanSummaryCardProps {
  client: ClientProfile;
  planCatalog?: Record<string, string>;
}

export function PlanSummaryCard({ client, planCatalog }: PlanSummaryCardProps): JSX.Element {
  const catalog = planCatalog ?? {};
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const currentPlanId = client.planId ?? "";

  const planOptions = useMemo(() => {
    const entries = Object.entries(catalog);
    if (!entries.length) {
      return [] as Array<{ id: string; name: string }>;
    }
    return entries
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [catalog]);

  useEffect(() => {
    if (!planOptions.length) {
      setSelectedPlan(null);
      return;
    }
    setSelectedPlan((current) => {
      if (current && planOptions.some((option) => option.id === current)) {
        return current;
      }
      if (currentPlanId && planOptions.some((option) => option.id === currentPlanId)) {
        return currentPlanId;
      }
      return planOptions[0].id;
    });
  }, [planOptions, currentPlanId]);

  const planName = useMemo(() => {
    if (currentPlanId && catalog[currentPlanId]) {
      return catalog[currentPlanId];
    }
    return client.planName ?? (currentPlanId || "Unknown");
  }, [catalog, currentPlanId, client.planName]);

  const nextRefresh = useMemo(() => formatRelativeTime(client.currentPeriodEnd), [client.currentPeriodEnd]);

  const entitlements = client.entitlements ?? {};

  const checkoutPlanId = selectedPlan ?? currentPlanId;
  const showCheckoutButton = checkoutPlanId && checkoutPlanId !== currentPlanId;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const currentUrl = typeof window !== "undefined" ? window.location.href : "/";
  const successUrl = origin ? `${origin}/billing/success` : "/billing/success";
  const cancelUrl = origin ? `${origin}/billing/cancel` : "/billing/cancel";

  return (
    <section className="card">
      <h2>Plan & subscription</h2>
      <p className="muted">Review your current plan, usage allowances, and manage billing through Stripe.</p>
      <div className="plan-details">
        <div>
          <span className="badge badge-muted">Current plan</span>
          <h3 style={{ marginTop: "0.75rem", marginBottom: "0.35rem" }}>{planName}</h3>
          <p className="muted" style={{ marginTop: 0 }}>Plan ID: {currentPlanId || "—"}</p>
          <div style={{ marginTop: "0.75rem" }}>
            <span className={statusClass(client.subscriptionStatus)}>{statusLabel(client.subscriptionStatus)}</span>
          </div>
          {client.currentPeriodEnd ? (
            <p className="muted" style={{ marginTop: "0.85rem" }}>
              Renews on {formatDateLabel(client.currentPeriodEnd)}
              {nextRefresh ? ` (${nextRefresh})` : ""}
            </p>
          ) : null}
        </div>
        <div>
          <span className="badge badge-muted">Entitlements</span>
          {Object.keys(entitlements).length === 0 ? (
            <p className="muted" style={{ marginTop: "0.75rem" }}>
              No entitlements recorded for this client yet.
            </p>
          ) : (
            <ul style={{ marginTop: "0.75rem" }}>
              {Object.entries(entitlements).map(([key, value]) => {
                const label = ENTITLEMENT_LABELS[key] ?? key.replace(/_/g, " ");
                let displayValue: string;
                if (value === null || value === undefined) {
                  displayValue = "Unlimited";
                } else if (key === "max_scan_mb_per_day") {
                  displayValue = formatScanVolume(Number(value));
                } else {
                  displayValue = formatInteger(Number(value));
                }
                return (
                  <li key={key}>
                    <span className="label">{label}</span>
                    <span>{displayValue}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="plan-actions">
          <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <span className="label">Change plan</span>
            <select
              className="select-input"
              value={checkoutPlanId}
              onChange={(event) => setSelectedPlan(event.target.value)}
              disabled={!planOptions.length}
            >
              {planOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
          <div className="button-row">
            {showCheckoutButton ? (
              <StripeCheckoutButton
                planId={checkoutPlanId}
                clientId={client.id}
                customerId={client.stripeCustomerId}
                successUrl={successUrl}
                cancelUrl={cancelUrl}
                label={`Switch to ${catalog[checkoutPlanId] ?? checkoutPlanId}`}
              />
            ) : (
              <button type="button" className="btn btn-secondary" disabled>
                You are on this plan
              </button>
            )}
            {client.stripeCustomerId ? (
              <BillingPortalButton customerId={client.stripeCustomerId} returnUrl={currentUrl} label="Manage billing" />
            ) : null}
          </div>
          <small className="helper">Checkout opens in Stripe with entitlements applied automatically after payment.</small>
        </div>
      </div>
    </section>
  );
}
