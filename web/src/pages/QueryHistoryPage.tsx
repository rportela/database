import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { LoadingScreen } from "../components/LoadingScreen";
import { useClientContext } from "../context/ClientContext";
import { fetchQueryHistory } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import { formatCurrency, formatDateLabel, formatInteger, formatScanVolume } from "../utils/format";

const toDateInput = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const startOfDayIso = (value: string): string => `${value}T00:00:00.000Z`;
const endOfDayIso = (value: string): string => `${value}T23:59:59.999Z`;

export function QueryHistoryPage(): JSX.Element {
  const { memberships, activeClientId, selectClient, loading: clientLoading } = useClientContext();
  const today = useMemo(() => new Date(), []);
  const defaultStart = useMemo(() => {
    const copy = new Date(today.getTime());
    copy.setUTCDate(copy.getUTCDate() - 6);
    return copy;
  }, [today]);

  const [startDate, setStartDate] = useState<string>(() => toDateInput(defaultStart));
  const [endDate, setEndDate] = useState<string>(() => toDateInput(today));
  const [tableFilter, setTableFilter] = useState<string>("");

  useEffect(() => {
    if (!activeClientId && memberships[0]) {
      selectClient(memberships[0].clientId);
    }
  }, [activeClientId, memberships, selectClient]);

  const clientId = activeClientId ?? memberships[0]?.clientId ?? null;

  const startIso = startDate ? startOfDayIso(startDate) : undefined;
  const endIso = endDate ? endOfDayIso(endDate) : undefined;

  const historyQuery = useQuery({
    queryKey: [...queryKeys.queryHistory(clientId ?? ""), startIso, endIso, tableFilter],
    queryFn: () =>
      fetchQueryHistory(clientId!, {
        start: startIso,
        end: endIso,
        table: tableFilter.trim() || undefined,
      }),
    enabled: Boolean(clientId),
    keepPreviousData: true,
  });

  if (clientLoading || historyQuery.isLoading) {
    return <LoadingScreen message="Loading query history…" />;
  }

  if (!clientId) {
    return (
      <section className="card">
        <h2>No client selected</h2>
        <p className="muted">Choose a workspace to review query activity.</p>
      </section>
    );
  }

  if (historyQuery.isError) {
    const message = historyQuery.error instanceof Error ? historyQuery.error.message : "Failed to load history";
    return (
      <section className="card">
        <h2>Error loading query history</h2>
        <p className="error-text">{message}</p>
      </section>
    );
  }

  const history = historyQuery.data;
  const entries = history?.entries ?? [];
  const summary = history?.summary;

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Query history</h1>
          <p>Audit executed SQL, scan volume, and cost across your Iceberg catalog.</p>
        </div>
      </div>

      <section className="card">
        <h2>Filters</h2>
        <div className="history-filters">
          <label className="field">
            <span>Client</span>
            <select
              className="select-input"
              value={clientId}
              onChange={(event) => selectClient(event.target.value)}
            >
              {memberships.map((membership) => (
                <option key={membership.clientId} value={membership.clientId}>
                  {membership.clientId}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Start date</span>
            <input
              type="date"
              className="text-input"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>
          <label className="field">
            <span>End date</span>
            <input
              type="date"
              className="text-input"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Table</span>
            <input
              type="text"
              className="text-input"
              placeholder="events, metrics, …"
              value={tableFilter}
              onChange={(event) => setTableFilter(event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="card">
        <h2>Summary</h2>
        <div className="history-summary">
          <div className="summary-card">
            <span>Total queries</span>
            <strong>{formatInteger(summary?.totalQueries ?? 0)}</strong>
          </div>
          <div className="summary-card">
            <span>Failed queries</span>
            <strong>{formatInteger(summary?.failedQueries ?? 0)}</strong>
          </div>
          <div className="summary-card">
            <span>Total cost</span>
            <strong>{formatCurrency(summary?.totalCostUsd ?? 0)}</strong>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Execution log</h2>
        {entries.length === 0 ? (
          <div className="empty-state">No queries recorded for the selected filters.</div>
        ) : (
          <div className="table-container history-table">
            <table>
              <thead>
                <tr>
                  <th>Submitted</th>
                  <th>Statement</th>
                  <th>Status</th>
                  <th>Tables</th>
                  <th>Rows</th>
                  <th>Data scanned</th>
                  <th>Cost</th>
                  <th>Snapshot</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.queryId}>
                    <td>
                      <div className="history-timestamp">
                        <strong>{formatDateLabel(entry.submittedAt, "MMM d, yyyy HH:mm")}</strong>
                        <small className="muted">{new Date(entry.submittedAt).toLocaleTimeString()}</small>
                      </div>
                    </td>
                    <td>
                      <code className="sql-snippet">{entry.statement}</code>
                    </td>
                    <td>
                      <span className={`status-pill status-${entry.status.toLowerCase()}`}>{entry.status}</span>
                    </td>
                    <td>{entry.tables && entry.tables.length ? entry.tables.join(", ") : "—"}</td>
                    <td>{formatInteger(entry.rowCount ?? null)}</td>
                    <td>{formatScanVolume(entry.dataScannedMb ?? null)}</td>
                    <td>{formatCurrency(entry.costUsd ?? null)}</td>
                    <td>
                      {entry.snapshotId || entry.asOfTimestamp ? (
                        <div className="history-snapshot">
                          {entry.snapshotId ? <span>{entry.snapshotId}</span> : null}
                          {entry.asOfTimestamp ? (
                            <small className="muted">{formatDateLabel(entry.asOfTimestamp, "MMM d, yyyy HH:mm")}</small>
                          ) : null}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{entry.errorMessage ? <span className="error-text">{entry.errorMessage}</span> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
