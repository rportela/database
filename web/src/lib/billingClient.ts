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
  const response = await fetch("/api/billing/checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      clientId: request.clientId,
      planId: request.planId,
      successUrl: request.successUrl,
      cancelUrl: request.cancelUrl,
      customerId: request.customerId,
    }),
    credentials: "include",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Failed to create checkout session: ${message}`);
  }

  return (await response.json()) as CheckoutSessionResponse;
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
  const response = await fetch("/api/billing/portal-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
    credentials: "include",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Failed to create billing portal session: ${message}`);
  }

  return (await response.json()) as BillingPortalResponse;
}
