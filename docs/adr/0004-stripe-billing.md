# ADR 0004: Integrate Stripe for Billing and Subscription Management

- **Status:** Accepted
- **Date:** 2024-05-24

## Context
We require a billing system that supports SaaS subscriptions, per-seat pricing, and self-service customer portals with minimal engineering lift. The solution must offer PCI-compliant checkout, webhook support for entitlement updates, and the ability to manage taxes and invoices internationally.

## Decision
Use Stripe Checkout and the Stripe Billing Portal for all customer-facing payment flows. Store derived subscription state in Firestore and process Stripe webhooks to update entitlements in near real time. Webhook handlers run in Cloud Run (or Cloud Functions) and write to the control-plane metadata so that API gateways enforce plan limits.

## Consequences
- **Positive:**
  - Accelerated go-to-market with hosted checkout and portal experiences.
  - Robust webhook ecosystem and client libraries for extending billing logic.
  - Built-in tax calculation, invoicing, and dunning reduces operational burden.
- **Negative:**
  - Dependence on Stripe's availability and pricing; some regions may require alternative payment processors.
  - Webhook handling introduces operational complexity (retries, signature validation).
- **Follow-up:** Implement idempotent webhook processing and monitor for API rate limits. Plan for fallback providers if Stripe coverage is insufficient.
