import { useCallback, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";

import { createCheckoutSession } from "../lib/billingClient";

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
const stripePromise = publishableKey ? loadStripe(publishableKey) : Promise.resolve(null);

type PlanId = string;

type StripeCheckoutButtonProps = {
  planId: PlanId;
  clientId: string;
  customerId?: string;
  successUrl: string;
  cancelUrl: string;
  className?: string;
  label?: string;
};

export function StripeCheckoutButton({
  planId,
  clientId,
  customerId,
  successUrl,
  cancelUrl,
  className,
  label,
}: StripeCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      if (!publishableKey) {
        throw new Error("Stripe publishable key is not configured");
      }
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error("Stripe.js failed to initialise");
      }

      const session = await createCheckoutSession({
        planId,
        clientId,
        customerId,
        successUrl,
        cancelUrl,
      });

      const { error: redirectError } = await stripe.redirectToCheckout({
        sessionId: session.id,
      });

      if (redirectError) {
        throw redirectError;
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unexpected error starting checkout");
      }
    } finally {
      setLoading(false);
    }
  }, [planId, clientId, customerId, successUrl, cancelUrl]);

  const buttonLabel = label ?? "Upgrade with Stripe";

  return (
    <div className={className}>
      <button type="button" onClick={handleClick} disabled={loading} className="btn btn-primary">
        {loading ? "Redirecting…" : buttonLabel}
      </button>
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
