# Frontend Billing Components

The `web/` directory contains React helpers used by the SaaS frontend to trigger
Stripe Checkout and the hosted billing portal.

## Environment

Expose the Stripe publishable key via Vite:

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_12345
```

## Usage

```tsx
import { StripeCheckoutButton } from "./src/components/StripeCheckoutButton";

<StripeCheckoutButton
  planId="pro"
  clientId={clientId}
  customerId={stripeCustomerId}
  successUrl={`${window.location.origin}/billing/success`}
  cancelUrl={`${window.location.origin}/billing`}
/>
```

The button calls the backend route at `/api/billing/checkout-session`, receives
the session ID, and redirects via `stripe.redirectToCheckout`.
