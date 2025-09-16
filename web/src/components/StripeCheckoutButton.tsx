import { useCallback, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";

import { createCheckoutSession } from "../lib/billingClient";

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
const stripePromise = publishableKey ? loadStripe(publishableKey) : Promise.resolve(null);

type PlanId = "starter" | "pro" | "enterprise";

type StripeCheckoutButtonProps = {
  planId: PlanId;
  clientId: string;
  customerId?: string;
  successUrl: string;
  cancelUrl: string;
  className?: string;
};

export function StripeCheckoutButton({
  planId,
  clientId,
  customerId,
  successUrl,
  cancelUrl,
  className,
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

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        {loading ? "Redirecting…" : "Upgrade with Stripe"}
      </button>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
