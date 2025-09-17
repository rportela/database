export interface ClientEntitlements {
  max_queries_per_day?: number | null;
  max_scan_mb_per_day?: number | null;
  max_concurrent_queries?: number | null;
  max_result_rows?: number | null;
  [key: string]: number | null | undefined;
}

export interface ClientProfile {
  id: string;
  displayName?: string;
  planId?: string;
  planName?: string;
  priceId?: string;
  subscriptionStatus?: string;
  subscriptionId?: string;
  stripeCustomerId?: string;
  currentPeriodEnd?: Date | null;
  updatedAt?: Date | null;
  entitlements?: ClientEntitlements;
}
