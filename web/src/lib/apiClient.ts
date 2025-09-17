import { auth } from "./firebase";
import { API_BASE_URL } from "./config";

export interface ApiRequestOptions extends RequestInit {
  requiresAuth?: boolean;
  parseJson?: boolean;
}

const buildUrl = (path: string): string => {
  const normalizedBase = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

export async function apiRequest<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { requiresAuth = true, parseJson = true, headers, ...rest } = options;

  const finalHeaders = new Headers(headers ?? {});

  if (requiresAuth) {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("User is not authenticated");
    }
    const token = await user.getIdToken();
    finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  if (rest.body && !finalHeaders.has("Content-Type") && !(rest.body instanceof FormData)) {
    finalHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path), {
    credentials: "include",
    ...rest,
    headers: finalHeaders,
  });

  if (!response.ok) {
    const message = await response.text();
    const errorMessage = message || `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  if (!parseJson || response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
