import { FormEvent, useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { executeSqlQuery } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import { formatDecimal, formatInteger } from "../utils/format";
import { QueryResultTable } from "./QueryResultTable";

const DEFAULT_QUERY = `-- Explore recent queries executed through the SaaS API
SELECT *
FROM iceberg.system.query_history
ORDER BY query_start DESC
LIMIT 50;`;

interface QueryEditorProps {
  clientId: string;
}

export function QueryEditor({ clientId }: QueryEditorProps): JSX.Element {
  const [sql, setSql] = useState<string>(DEFAULT_QUERY);
  const [snapshotId, setSnapshotId] = useState<string>("");
  const [asOfTimestamp, setAsOfTimestamp] = useState<string>("");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof executeSqlQuery>> | null>(null);
  const queryClient = useQueryClient();

  const runQuery = useCallback(
    async (event?: FormEvent) => {
      event?.preventDefault();
      if (!sql.trim()) {
        setError("Enter a SQL statement to run.");
        return;
      }
      setIsRunning(true);
      setError(null);
      try {
        const response = await executeSqlQuery({
          clientId,
          sql,
          snapshotId: snapshotId.trim() || undefined,
          asOfTimestamp: asOfTimestamp ? new Date(asOfTimestamp).toISOString() : undefined,
        });
        if (response.error) {
          setError(response.error);
          setResult(null);
        } else {
          setResult(response);
          queryClient.invalidateQueries({ queryKey: queryKeys.usageHistory(clientId) }).catch(() => {
            /* ignore */
          });
          queryClient.invalidateQueries({ queryKey: queryKeys.queryHistory(clientId) }).catch(() => {
            /* ignore */
          });
        }
      } catch (err) {
        setResult(null);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Query failed to execute");
        }
      } finally {
        setIsRunning(false);
      }
    },
    [asOfTimestamp, clientId, queryClient, snapshotId, sql],
  );

  const stats = useMemo(() => {
    if (!result) {
      return null;
    }
    const dataScannedMb = result.stats?.data_scanned_mb ?? result.stats?.dataScannedMb;
    const elapsedMs = result.stats?.elapsed_ms ?? result.stats?.elapsedMs;
    const rowCount =
      result.stats?.row_count ?? result.stats?.rowCount ?? (Array.isArray(result.rows) ? result.rows.length : undefined);
    const snapshot = result.stats?.snapshot_id ?? result.stats?.snapshotId;
    const snapshotTime = result.stats?.snapshot_timestamp ?? result.stats?.snapshotTimestamp;
    return {
      dataScannedMb,
      elapsedMs,
      rowCount,
      snapshot,
      snapshotTime,
    };
  }, [result]);

  return (
    <section className="card">
      <h2>Interactive query editor</h2>
      <p className="muted">
        Run ad-hoc SQL against your Iceberg catalog. Queries execute through the DuckDB engine and honour the plan-level
        entitlements enforced by the API.
      </p>
      <form onSubmit={runQuery}>
        <textarea
          className="textarea"
          spellCheck={false}
          value={sql}
          onChange={(event) => setSql(event.target.value)}
          placeholder="SELECT * FROM analytics.daily_usage ORDER BY event_date DESC LIMIT 50;"
        />
        <div className="time-travel-grid">
          <label className="field">
            <span>Snapshot ID</span>
            <input
              className="text-input"
              value={snapshotId}
              onChange={(event) => setSnapshotId(event.target.value)}
              placeholder="e.g. 1765432198765"
            />
          </label>
          <label className="field">
            <span>As of timestamp</span>
            <input
              className="text-input"
              type="datetime-local"
              value={asOfTimestamp}
              onChange={(event) => setAsOfTimestamp(event.target.value)}
            />
          </label>
        </div>
        <small className="helper">Specify a snapshot or timestamp to time-travel queries against historical snapshots.</small>
        <div className="query-actions">
          <button type="submit" className="btn btn-primary" disabled={isRunning}>
            {isRunning ? "Running query…" : "Run query"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setSql(DEFAULT_QUERY)}
            disabled={isRunning}
          >
            Reset sample query
          </button>
          <small className="helper">Results refresh the usage charts automatically after execution.</small>
        </div>
      </form>
      {error ? <p className="error-text">{error}</p> : null}
      {result ? (
        <>
          <div className="card-divider" />
          {stats ? (
            <div className="query-metadata">
              {stats.elapsedMs !== undefined ? <span>Elapsed: {formatDecimal(stats.elapsedMs / 1000, 2)}s</span> : null}
              {stats.dataScannedMb !== undefined ? <span>Data scanned: {formatDecimal(stats.dataScannedMb, 2)} MB</span> : null}
              {stats.rowCount !== undefined ? <span>Rows: {formatInteger(stats.rowCount)}</span> : null}
              {stats.snapshot ? <span>Snapshot: {stats.snapshot}</span> : null}
              {stats.snapshotTime ? <span>Snapshot time: {new Date(stats.snapshotTime).toLocaleString()}</span> : null}
            </div>
          ) : null}
          <QueryResultTable result={result} />
        </>
      ) : null}
    </section>
  );
}
