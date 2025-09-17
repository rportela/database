const clean = (value: string | undefined | null): string | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

const firebaseConfig = {
  apiKey: clean(import.meta.env.VITE_FIREBASE_API_KEY) ?? "demo",
  authDomain: clean(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) ?? "demo.firebaseapp.com",
  projectId: clean(import.meta.env.VITE_FIREBASE_PROJECT_ID) ?? "demo-project",
  appId: clean(import.meta.env.VITE_FIREBASE_APP_ID) ?? "1:demo:web:demo",
  storageBucket: clean(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: clean(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
} as const;

const API_BASE_URL = clean(import.meta.env.VITE_API_BASE_URL) ?? "";

const features = {
  enableGoogleSignIn: clean(import.meta.env.VITE_FIREBASE_ENABLE_GOOGLE_SIGNIN)?.toLowerCase() === "true",
  usageHistoryDays: Number.parseInt(clean(import.meta.env.VITE_USAGE_HISTORY_DAYS) ?? "30", 10),
} as const;

export { API_BASE_URL, features, firebaseConfig };
