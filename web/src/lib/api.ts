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
  snapshotId?: string;
  asOfTimestamp?: string;
  estimatedScanMb?: number;
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
  snapshot_id?: string;
  snapshotId?: string;
  snapshot_timestamp?: string;
  snapshotTimestamp?: string;
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
      snapshot_id: request.snapshotId,
      snapshotId: request.snapshotId,
      as_of_timestamp: request.asOfTimestamp,
      asOfTimestamp: request.asOfTimestamp,
      estimated_scan_mb: request.estimatedScanMb,
      estimatedScanMb: request.estimatedScanMb,
    }),
  });
}

export interface QueryHistoryEntryResponse {
  queryId: string;
  clientId: string;
  statement: string;
  status: string;
  submittedAt: string;
  completedAt?: string | null;
  elapsedMs?: number | null;
  dataScannedMb?: number | null;
  rowCount?: number | null;
  costUsd?: number | null;
  errorMessage?: string | null;
  tables?: string[];
  snapshotId?: string | null;
  asOfTimestamp?: string | null;
}

export interface QueryHistorySummaryResponse {
  totalQueries: number;
  failedQueries: number;
  totalCostUsd: number;
  range?: {
    start?: string | null;
    end?: string | null;
  };
}

export interface QueryHistoryResponsePayload {
  entries: QueryHistoryEntryResponse[];
  summary: QueryHistorySummaryResponse;
}

export interface QueryHistoryRequestParams {
  start?: string;
  end?: string;
  table?: string;
  limit?: number;
}

export async function fetchQueryHistory(
  clientId: string,
  params: QueryHistoryRequestParams,
): Promise<QueryHistoryResponsePayload> {
  const search = new URLSearchParams();
  if (params.start) {
    search.set("start", params.start);
  }
  if (params.end) {
    search.set("end", params.end);
  }
  if (params.table) {
    search.set("table", params.table);
  }
  if (params.limit) {
    search.set("limit", String(params.limit));
  }
  const queryString = search.toString();
  const path = `/api/clients/${encodeURIComponent(clientId)}/query-history${queryString ? `?${queryString}` : ""}`;
  return apiRequest<QueryHistoryResponsePayload>(path, { method: "GET" });
}
