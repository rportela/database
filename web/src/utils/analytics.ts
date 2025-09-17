export type CtaPayload = {
  trackingId: string;
  href: string;
  label: string;
  location: string;
  variant: "primary" | "secondary";
};

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function trackCtaClick(payload: CtaPayload): void {
  if (typeof window === "undefined") {
    return;
  }

  const eventPayload = {
    event: "cta_click",
    ...payload,
    timestamp: Date.now(),
  } as const;

  window.dataLayer?.push(eventPayload);
  if (typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new CustomEvent("cta_click", { detail: eventPayload }));
  }

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console -- surface analytics payload during development for verification
    console.debug("CTA click", eventPayload);
  }
}
