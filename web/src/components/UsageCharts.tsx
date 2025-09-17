import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { fetchUsageHistory } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import { formatDateLabel, formatDecimal, formatInteger, formatScanVolume } from "../utils/format";

interface UsageChartsProps {
  clientId: string;
}

interface NormalizedUsagePoint {
  date: string;
  queries: number;
  scanMb: number;
}

const normaliseNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
};

export function UsageCharts({ clientId }: UsageChartsProps): JSX.Element {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.usageHistory(clientId),
    queryFn: () => fetchUsageHistory(clientId),
    enabled: Boolean(clientId),
  });

  const history = useMemo<NormalizedUsagePoint[]>(() => {
    if (!data?.history) {
      return [];
    }
    return data.history
      .map((entry) => ({
        date: entry.date,
        queries: normaliseNumber((entry as { queries?: unknown; query_count?: unknown }).queries ?? (entry as any).query_count),
        scanMb: normaliseNumber(
          (entry as { scan_mb?: unknown; scanMb?: unknown; data_scanned_mb?: unknown }).scan_mb ??
            (entry as any).scanMb ??
            (entry as any).data_scanned_mb,
        ),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  const totals = useMemo(() => {
    const totalQueries = history.reduce((sum, point) => sum + point.queries, 0);
    const totalScanMb = history.reduce((sum, point) => sum + point.scanMb, 0);
    const averageQueries = history.length ? totalQueries / history.length : 0;
    const averageScanMb = history.length ? totalScanMb / history.length : 0;
    const latest = history.at(-1);
    return { totalQueries, totalScanMb, averageQueries, averageScanMb, latest };
  }, [history]);

  return (
    <section className="card">
      <h2>Usage analytics</h2>
      <p className="muted">Historic query volume and scan metrics sourced from Iceberg snapshot history.</p>
      {isLoading ? (
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "1.5rem" }}>
          <div className="spinner" style={{ width: 36, height: 36 }} />
          <span className="muted">Loading usage trends…</span>
        </div>
      ) : isError ? (
        <p className="error-text">{error instanceof Error ? error.message : "Unable to load usage data."}</p>
      ) : history.length === 0 ? (
        <div className="empty-message">No usage data is available yet. Run a few queries to populate the charts.</div>
      ) : (
        <>
          <div className="stat-grid" style={{ marginBottom: "1.5rem" }}>
            <div className="stat-card">
              <h4>Total queries</h4>
              <strong>{formatInteger(totals.totalQueries)}</strong>
              <span>{history.length} day span</span>
            </div>
            <div className="stat-card">
              <h4>Data scanned</h4>
              <strong>{formatScanVolume(totals.totalScanMb)}</strong>
              <span>Across the same period</span>
            </div>
            <div className="stat-card">
              <h4>Daily averages</h4>
              <strong>{formatInteger(Math.round(totals.averageQueries))} q / day</strong>
              <span>{formatScanVolume(totals.averageScanMb)} scanned per day</span>
            </div>
            {totals.latest ? (
              <div className="stat-card">
                <h4>Most recent day</h4>
                <strong>{formatInteger(totals.latest.queries)} queries</strong>
                <span>{formatScanVolume(totals.latest.scanMb)} processed</span>
              </div>
            ) : null}
          </div>
          <div className="section-grid">
            <div className="chart-card">
              <h3>Daily queries</h3>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="queriesGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.7} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => formatDateLabel(value as string, "MMM d")}
                      stroke="rgba(148, 163, 184, 0.6)"
                    />
                    <YAxis
                      allowDecimals={false}
                      tickFormatter={(value) => formatInteger(typeof value === "number" ? value : Number(value))}
                      stroke="rgba(148, 163, 184, 0.6)"
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(15, 23, 42, 0.92)",
                        borderRadius: 12,
                        border: "1px solid rgba(148, 163, 184, 0.25)",
                        color: "#f8fafc",
                      }}
                      labelFormatter={(value) => formatDateLabel(value as string)}
                      formatter={(value) => [formatInteger(typeof value === "number" ? value : Number(value)), "Queries"]}
                    />
                    <Area type="monotone" dataKey="queries" stroke="#38bdf8" fill="url(#queriesGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="chart-card">
              <h3>Data scanned (MB)</h3>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scanGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.7} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => formatDateLabel(value as string, "MMM d")}
                      stroke="rgba(148, 163, 184, 0.6)"
                    />
                    <YAxis
                      tickFormatter={(value) => formatDecimal(typeof value === "number" ? value : Number(value), 0)}
                      stroke="rgba(148, 163, 184, 0.6)"
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(15, 23, 42, 0.92)",
                        borderRadius: 12,
                        border: "1px solid rgba(148, 163, 184, 0.25)",
                        color: "#f8fafc",
                      }}
                      labelFormatter={(value) => formatDateLabel(value as string)}
                      formatter={(value) => [`${formatDecimal(typeof value === "number" ? value : Number(value), 2)} MB`, "Data scanned"]}
                    />
                    <Area type="monotone" dataKey="scanMb" stroke="#6366f1" fill="url(#scanGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
