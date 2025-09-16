# Phase 2: Authentication and Client Model

This document describes how Firebase Authentication and Firestore are configured to deliver secure, multi-tenant access in Phase
2. It covers identity provider setup, the client/user data model, and the security rules that enforce access control from the f
rontend.

## Firebase Authentication Providers

Firebase Authentication (Identity Platform) is provisioned through Terraform. Email/password sign-in is enabled by default and
Google OAuth is optional to keep non-Google environments simple.

1. **Enable APIs** – Terraform enables the Identity Toolkit API (`identitytoolkit.googleapis.com`) alongside Firestore.
2. **Deploy configuration** – `google_identity_platform_config` turns on email/password sign-in with mandatory passwords. The
   configuration lives in `infra/terraform/main.tf` so it is applied consistently across environments.
3. **Google OAuth** – Provide the OAuth client ID/secret that backs the frontend through the Terraform variables
   `google_oauth_client_id` and `google_oauth_client_secret`. Leave them blank to disable the provider. When set, Terraform creat
   es a `google_identity_platform_default_supported_idp_config` resource that enables `google.com` as a provider.
4. **Client SDK initialization** – The frontend uses the Firebase config object (project ID, app ID, API key) to initialize the
   client SDK. After sign-in the SDK exposes an ID token that contains the Firebase UID and custom claims (e.g., `client_id`) the
   backend can enforce.

## Firestore Data Model

Firestore stores tenant metadata in top-level `clients` and `users` collections with supporting subcollections to make access co
ntrol explicit.

```text
/clients/{client_id}
  owner_user_id        string   # Firebase UID of the organization owner
  display_name         string
  plan                 string   # e.g., starter, growth, enterprise
  iceberg_catalog_path string   # gcs://... pointing to the Iceberg catalog root
  created_at           timestamp
  updated_at           timestamp
  entitlements         map      # feature flags, row limits, etc.

/clients/{client_id}/members/{user_id}
  role                 string   # owner | admin | analyst | viewer
  added_by             string   # UID of the actor that added the member
  added_at             timestamp

/clients/{client_id}/billing/{document}
  stripe_customer_id   string
  payment_method_last4 string
  invoices_enabled     bool
  updated_at           timestamp

/users/{user_id}
  email                string
  display_name         string
  orgs                 map      # { client_id: { role: "owner" | "admin" | ... , joined_at: timestamp } }
  roles                map      # global roles (e.g., { support: true })
  last_seen_at         timestamp
```

The `orgs` map inside `/users/{user_id}` provides a quick lookup for the Firestore security rules. The `/members` subcollection u
nder each client enables efficient queries for administrative UIs. Billing artifacts live in the dedicated `/billing` subcollect
ion so access can be restricted separately from general metadata.

## Security Rules

The Firestore security rules in `firestore.rules` implement the tenant isolation requirements:

- **Membership-gated access** – users must be authenticated and listed in the `orgs` map for a given `client_id` before they can
  read or update `/clients/{client_id}` documents.
- **Owner-bound mutations** – only the organization owner can delete a client document or manage the `/members` subcollection.
  This prevents analysts from adjusting membership or wiping out tenants.
- **Billing isolation** – the `/clients/{client_id}/billing/**` match only allows reads and writes from org owners, satisfying th
  e requirement that billing info is available to owners alone.
- **User profiles** – the `/users/{user_id}` match allows a user to create and update their own profile document. Listing all use
  rs is blocked to avoid cross-tenant data leaks.

Deploy the rules with the Firebase CLI once changes are merged:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules --project <gcp-project-id>
```

Backend services (Cloud Run or webhook handlers) use the Firebase Admin SDK with a service account to bypass these client-side r
estrictions when necessary (e.g., provisioning new tenants or syncing Stripe webhooks). The Admin SDK operates with privileged c
redentials and is therefore not subject to the Firestore security rules defined for untrusted clients.
