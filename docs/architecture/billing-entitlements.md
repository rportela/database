# Phase 3: Billing, Subscriptions, and Entitlements

This document captures how Stripe Billing integrates with Firebase/Firestore to
drive plan enforcement in the API.

## Stripe Catalogue

Three plans are provisioned in Stripe with deterministic identifiers so they
can be reconciled across environments:

| Plan        | Product ID              | Price ID                        | Monthly Price | Key Limits                         |
|-------------|-------------------------|---------------------------------|---------------|------------------------------------|
| Starter     | `prod_saas_starter`     | `price_saas_starter_monthly`    | $99           | 100 queries/day, 5 GB scan/day     |
| Pro         | `prod_saas_pro`         | `price_saas_pro_monthly`        | $299          | 1,000 queries/day, 50 GB scan/day  |
| Enterprise  | `prod_saas_enterprise`  | `price_saas_enterprise_monthly` | Contract      | Unlimited (negotiated per account) |

The helper `billing.stripe_catalog.ensure_stripe_catalog()` idempotently
creates or updates the products/prices on deployment.

## Checkout Flow

1. The React SPA renders `StripeCheckoutButton` which calls the API route
   `/api/billing/checkout-session` and redirects to the returned session ID.
2. The API uses `billing.checkout.create_checkout_session` to create a hosted
   Checkout experience. Metadata embeds the `client_id` and `plan_id`.
3. After payment Stripe redirects the customer to the success URL supplied by
   the frontend.

Customers can manage payment methods through the hosted billing portal via the
`/api/billing/portal-session` endpoint.

## Webhook Processing

Stripe events land on the Cloud Run webhook service (`src/webhooks/stripe.py`).
`StripeWebhookProcessor` performs signature verification and updates Firestore:

- `checkout.session.completed` → links the Stripe customer to our `client_id`
  and seeds the initial plan document.
- `invoice.paid` and `customer.subscription.updated` → refresh the stored plan,
  entitlements, and subscription status under `/clients/{client_id}`.

Processed event IDs are persisted under `/stripe_webhook_events` to guarantee
idempotency during retries.

## Firestore Shape

```
/clients/{client_id}
  plan_id                string
  plan_name              string
  entitlements           map
  subscription_status    string
  subscription_id        string
  price_id               string
  stripe_customer_id     string
  current_period_end     number (epoch seconds)
  updated_at             timestamp

/clients/{client_id}/usage/{YYYY-MM-DD}
  queries            number
  data_scanned_mb    number
  rows_returned      number
  updated_at         timestamp

/clients/{client_id}/runtime/concurrency
  active             number
  updated_at         timestamp

/stripe_customers/{customer_id}
  client_id          string
  subscription_id    string
  price_id           string
  updated_at         timestamp
```

## API Enforcement

`api.entitlements.EntitlementService` enforces the limits stored in Firestore:

- `query_context` guards concurrent query slots per plan.
- `record_query_usage` updates the `/usage/{date}` document atomically and throws
  `EntitlementError` if limits are exceeded.
- `precheck` ensures callers receive a rejection before executing an expensive
  query when the daily quota is already exhausted.

The API layer calls:

```python
from api.entitlements import EntitlementService, QueryExecutionStats

service = EntitlementService()

with service.query_context(client_id, estimated_scan_mb=50.0) as entitlements:
    results = execute_query(...)
    service.record_query_usage(
        client_id,
        QueryExecutionStats(data_scanned_mb=results.data_scanned_mb, result_rows=results.row_count),
        entitlements=entitlements,
    )
```

When quotas are exceeded an `EntitlementError` surfaces to the caller and
results should not be returned to the client.
