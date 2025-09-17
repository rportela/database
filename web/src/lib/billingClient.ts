import { apiRequest } from "./apiClient";

export interface CheckoutSessionRequest {
  clientId: string;
  planId: string;
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
}

export interface CheckoutSessionResponse {
  id: string;
}

export async function createCheckoutSession(
  request: CheckoutSessionRequest,
): Promise<CheckoutSessionResponse> {
  return apiRequest<CheckoutSessionResponse>("/api/billing/checkout-session", {
    method: "POST",
    body: JSON.stringify({
      clientId: request.clientId,
      planId: request.planId,
      successUrl: request.successUrl,
      cancelUrl: request.cancelUrl,
      customerId: request.customerId,
    }),
  });
}

export interface BillingPortalRequest {
  customerId: string;
  returnUrl: string;
}

export interface BillingPortalResponse {
  url: string;
}

export async function createBillingPortalSession(
  request: BillingPortalRequest,
): Promise<BillingPortalResponse> {
  return apiRequest<BillingPortalResponse>("/api/billing/portal-session", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export type PlanCatalogResponse = Record<string, string>;

export async function fetchPlanCatalog(): Promise<PlanCatalogResponse> {
  return apiRequest<PlanCatalogResponse>("/api/billing/plans", {
    method: "GET",
  });
}
