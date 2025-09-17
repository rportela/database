import { features } from "./config";
import { apiRequest } from "./apiClient";

export interface UsageHistoryEntry {
  date: string;
  queries?: number;
  scan_mb?: number;
  scanMb?: number;
}

export interface UsageHistoryResponse {
  history: UsageHistoryEntry[];
  totals?: {
    queries?: number;
    scan_mb?: number;
    scanMb?: number;
  };
  period?: {
    start: string;
    end: string;
  };
}

export async function fetchUsageHistory(
  clientId: string,
  days: number = features.usageHistoryDays,
): Promise<UsageHistoryResponse> {
  const params = new URLSearchParams();
  if (days) {
    params.set("days", String(days));
  }
  const query = params.toString();
  const path = `/api/clients/${encodeURIComponent(clientId)}/usage/history${query ? `?${query}` : ""}`;
  return apiRequest<UsageHistoryResponse>(path, { method: "GET" });
}

export interface QueryRequest {
  clientId: string;
  sql: string;
  limit?: number;
}

export interface QueryColumn {
  name: string;
  type?: string;
}

export interface QueryStats {
  elapsed_ms?: number;
  elapsedMs?: number;
  data_scanned_mb?: number;
  dataScannedMb?: number;
  row_count?: number;
  rowCount?: number;
  [key: string]: unknown;
}

export interface QueryResponse {
  columns?: QueryColumn[];
  rows?: unknown[];
  stats?: QueryStats;
  statement?: string;
  error?: string;
}

export async function executeSqlQuery(request: QueryRequest): Promise<QueryResponse> {
  return apiRequest<QueryResponse>("/query", {
    method: "POST",
    body: JSON.stringify({
      client_id: request.clientId,
      clientId: request.clientId,
      query: request.sql,
      sql: request.sql,
      limit: request.limit,
    }),
  });
}
