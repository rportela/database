import { useMemo } from "react";

import type { QueryResponse } from "../lib/api";
import { formatDecimal, formatInteger } from "../utils/format";

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return formatInteger(value);
    }
    return formatDecimal(value, Math.abs(value) < 1 ? 3 : 2);
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch (err) {
      return String(value);
    }
  }
  return String(value);
};

export function QueryResultTable({ result }: { result: QueryResponse }): JSX.Element {
  const columns = useMemo(() => {
    if (result.columns && result.columns.length > 0) {
      return result.columns.map((column, index) => column?.name ?? `column_${index + 1}`);
    }
    const rows = result.rows;
    if (Array.isArray(rows) && rows.length > 0) {
      const firstRow = rows[0];
      if (Array.isArray(firstRow)) {
        return firstRow.map((_, index) => `column_${index + 1}`);
      }
      if (typeof firstRow === "object" && firstRow !== null) {
        return Object.keys(firstRow as Record<string, unknown>);
      }
      return ["value"];
    }
    return [];
  }, [result.columns, result.rows]);

  const normalizedRows = useMemo(() => {
    if (!Array.isArray(result.rows)) {
      return [] as string[][];
    }
    return result.rows.map((row) => {
      if (Array.isArray(row)) {
        return row.map((value) => formatValue(value));
      }
      if (typeof row === "object" && row !== null) {
        const record = row as Record<string, unknown>;
        return columns.map((column) => formatValue(record[column]));
      }
      return [formatValue(row)];
    });
  }, [result.rows, columns]);

  if (!columns.length) {
    return <div className="empty-message">No columns returned.</div>;
  }

  if (normalizedRows.length === 0) {
    return <div className="empty-message">Query executed successfully but no rows were returned.</div>;
  }

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {normalizedRows.map((row, rowIndex) => (
            <tr key={`row_${rowIndex}`}>
              {row.map((value, columnIndex) => (
                <td key={`cell_${rowIndex}_${columnIndex}`}>{value}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
