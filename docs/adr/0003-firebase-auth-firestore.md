# ADR 0003: Use Firebase Authentication and Firestore for the Control Plane

- **Status:** Accepted
- **Date:** 2024-05-24

## Context
The platform must deliver secure multi-tenant access control, real-time metadata management, and rapid development velocity. We need identity federation (OAuth providers), email/password support, and a globally available document database with fine-grained security rules to enforce per-client isolation without building custom auth infrastructure from scratch.

## Decision
Adopt Firebase Authentication for identity and session management, leveraging JWT issuance and support for social providers. Use Firestore as the control-plane database to store client metadata, API keys, entitlements, and operational settings. Enforce Firestore security rules keyed by `client_id` to restrict access from the frontend and expose a service-account-mediated access path for backend services.

## Consequences
- **Positive:**
  - Offloads authentication hardness (MFA, password resets, OAuth) to a managed service.
  - Firestore's real-time listeners support dynamic UI updates (entitlements, query history).
  - Tight integration between Firebase Auth and Firestore security rules simplifies policy enforcement.
- **Negative:**
  - Vendor tie-in to Google Cloud; migrating away requires re-implementing auth flows and security rules.
  - Firestore pricing (per document read/write) must be monitored for high-volume metadata access patterns.
- **Follow-up:** Evaluate the Firebase Admin SDK patterns for server-side verification and plan abstractions to support alternate auth providers if required by enterprise customers.
