# Lakeview Console (React + Vite)

The `web/` directory contains the SaaS control plane SPA. It provides:

- Firebase Authentication powered sign-in and account creation (email + optional Google OAuth).
- A multi-tenant dashboard that shows the active plan, Stripe subscription status, and entitlements stored in Firestore.
- Stripe Checkout / Billing Portal entrypoints for upgrading, downgrading, or managing billing.
- Interactive usage analytics sourced from the API (`/api/clients/{id}/usage/history`).
- An inline SQL query editor that posts to the `/query` endpoint and refreshes usage metrics after execution.

## Getting started

Install dependencies and run the development server with Vite:

```bash
cd web
npm install
npm run dev
```

The app expects the following environment variables (set them in an `.env.local` file or export them before running `npm run dev`):

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain (e.g. `example.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_APP_ID` | Firebase application ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | (Optional) Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | (Optional) Firebase messaging sender ID |
| `VITE_FIREBASE_ENABLE_GOOGLE_SIGNIN` | Set to `true` to enable Google sign-in alongside email/password |
| `VITE_FIREBASE_AUTH_EMULATOR_HOST` | (Optional) Connects the app to the Firebase Auth emulator when developing locally |
| `VITE_FIRESTORE_EMULATOR_HOST` | (Optional) Connects to the Firestore emulator |
| `VITE_API_BASE_URL` | Base URL for backend requests (defaults to the same origin) |
| `VITE_USAGE_HISTORY_DAYS` | Window (in days) for usage analytics (defaults to `30`) |

Stripe integration requires `VITE_STRIPE_PUBLISHABLE_KEY` to be available so the checkout button can initialise `stripe.js`:

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_12345 npm run dev
```

Build for production with:

```bash
npm run build
```

The build output will be written to `web/dist/`.

## Architecture overview

- **Authentication** – `AuthProvider` wraps the app and exposes Firebase user state via context. `LoginPage` renders FirebaseUI for both login and sign-up flows.
- **Client selection** – `ClientProvider` subscribes to `/users/{uid}` in Firestore and exposes memberships + active client context to the rest of the app.
- **Dashboard** – `DashboardPage` reads the active client document from Firestore and renders:
  - `PlanSummaryCard` for plan, entitlements, subscription status, and Stripe upgrade/downgrade actions.
  - `UsageCharts` which visualises `/api/clients/{id}/usage/history` (query volume + data scanned).
  - `QueryEditor` which posts SQL to `/query` and renders tabular results.
- **API access** – `apiRequest` automatically attaches Firebase ID tokens to requests and honours the optional `VITE_API_BASE_URL`.
- **Styling** – Tailored CSS lives in `src/index.css` to provide the dark, data-focused look and feel.

The SPA assumes Firestore security rules allow the authenticated user to read their `users/{uid}` membership document and the active `clients/{client_id}` document. All API calls include the Firebase ID token so the backend can enforce per-client limits.
