# 🌐 Revised SaaS Plan (Cloud-Agnostic)

## Phase 0 — Architecture & Design Decisions

### Objective:
Freeze the high-level architecture and document the design principles.

### Key Choices:

**Data plane:**

- Primary store: Apache Iceberg tables on object storage (start with GCS, but abstract for S3/Azure later).
- Query engine: DuckDB (embedded), with a pluggable interface to add Trino/BigQuery/Snowflake in future.

**Control plane / metadata:**

- Firebase Authentication (JWT, OAuth providers)
- Firestore (client metadata, per-client entitlements, API keys)
- Security rules enforced per client_id.

**Frontend:**

- React + Vite single-page app.
- Use Firebase client SDK for login and Firestore access.

**Billing:**

- Stripe Checkout + Billing Portal.
- Firestore stores subscription state.
- Webhooks update entitlements in near real-time.

### Deliverables:

- `/docs/architecture/overview.md` — diagrams + flows (auth, query, billing).
- `/docs/adr/` — decisions on Iceberg, DuckDB, Firebase, Stripe, extensibility.

**Component diagram with clean separation:**

- Frontend (React)
- API Gateway (Cloud Run or similar)
- Query Engine Service (DuckDB)
- Catalog Service (Iceberg REST or custom)

## Phase 1 — Infrastructure & CI/CD

### Objective:
Set up reproducible infrastructure for GCP, with portability in mind.

### Deliverables:

- Terraform (or Pulumi) for:
  - GCS buckets: iceberg-data, iceberg-metadata, stripe-webhook-logs.
  - Service accounts + roles for Cloud Run, Firestore, Stripe webhooks.
  - Artifact Registry for container images.

- GitHub Actions workflows:
  - Build & push container images.
  - Deploy to staging automatically; production with manual approval.

### Notes:

- Abstract storage layer: define a small interface in code for "object store" operations (read/write/list) so you can swap GCS for S3/Azure later.

## Phase 2 — Authentication & Client Model

### Objective:
Enable secure login, per-client data isolation, and client metadata management.

### Deliverables:

- Firebase Auth setup (email/password, Google OAuth).
- Firestore structure and access patterns documented in `/docs/architecture/authentication-client-model.md`.
- Firestore security rules (`firestore.rules`) enforcing per-client isolation and owner-only access to billing.

## Phase 3 — Stripe Billing & Entitlements

### Objective:
Charge customers through Stripe, persist subscription state, and enforce plan
limits within the API.

### Deliverables:

- Deterministic Stripe products/prices for Starter, Pro, Enterprise (`billing/stripe_catalog.py`).
- React Checkout integration (`web/src/components/StripeCheckoutButton.tsx`).
- Cloud Run webhook handler syncing Firestore entitlements (`src/webhooks/stripe.py`).
- API helpers enforcing daily query/data caps (`src/api/entitlements.py`).
- Architecture overview in `/docs/architecture/billing-entitlements.md`.

## Phase 4 — Iceberg Catalog & Data Lifecycle

### Objective:
Bootstrap per-client Iceberg catalogs and manage table schemas across clouds.

### Deliverables:

- Configurable catalog configuration abstraction (`src/iceberg/config.py`).
- Storage bootstrapper that materialises warehouse prefixes (`src/iceberg/storage.py`).
- Catalog bootstrap orchestrator and default table bundle (`src/iceberg/bootstrap.py`, `src/iceberg/tables.py`).
- Schema evolution helper for safe column additions (`src/iceberg/schema.py`).
- Architecture notes in `/docs/architecture/iceberg-catalog-bootstrap.md`.
