import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useClientContext } from "../context/ClientContext";

interface BillingReturnPageProps {
  status: "success" | "cancel";
}

export function BillingReturnPage({ status }: BillingReturnPageProps): JSX.Element {
  const navigate = useNavigate();
  const { activeClientId } = useClientContext();

  const content = useMemo(() => {
    if (status === "success") {
      return {
        title: "Checkout complete",
        description:
          "Thanks! Stripe has scheduled the plan change. It can take a minute or two for the new entitlements to replicate to the API.",
        action: "Back to dashboard",
      };
    }
    return {
      title: "Checkout cancelled",
      description:
        "The Stripe session was cancelled before completion. Your existing plan remains unchanged and you can try again at any time.",
      action: "Return to dashboard",
    };
  }, [status]);

  return (
    <section className="card billing-return">
      <h2>{content.title}</h2>
      <p>{content.description}</p>
      <button type="button" className="btn btn-primary" onClick={() => navigate("/", { replace: true })}>
        {content.action}
      </button>
      {activeClientId ? <p className="muted">Active workspace: {activeClientId}</p> : null}
    </section>
  );
}
