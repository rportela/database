"""Query history persistence helpers."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Iterable, List, Protocol, Sequence

@dataclass(frozen=True)
class QueryHistoryEntry:
    """Represents a single query execution or attempt."""

    query_id: str
    client_id: str
    statement: str
    status: str
    submitted_at: datetime
    completed_at: datetime | None
    elapsed_ms: float | None
    data_scanned_mb: float | None
    row_count: int | None
    cost_usd: float | None
    error_message: str | None = None
    tables: Sequence[str] = ()
    snapshot_id: str | None = None
    as_of_timestamp: datetime | None = None


@dataclass(frozen=True)
class QueryHistoryFilter:
    """Filters applied when retrieving query history."""

    client_id: str
    start: datetime | None = None
    end: datetime | None = None
    table: str | None = None
    limit: int | None = None


@dataclass(frozen=True)
class QueryHistorySummary:
    """Aggregated statistics for a set of history entries."""

    total_queries: int
    failed_queries: int
    total_cost_usd: float
    range_start: datetime | None
    range_end: datetime | None


class QueryHistoryStore(Protocol):
    """Storage backend responsible for persisting history entries."""

    def append(self, entry: QueryHistoryEntry) -> None:
        """Persist ``entry`` into the underlying storage."""

    def search(self, query: QueryHistoryFilter) -> Sequence[QueryHistoryEntry]:
        """Return entries matching ``query`` sorted by submission time descending."""


class InMemoryQueryHistoryStore(QueryHistoryStore):
    """Simple store used for testing that keeps entries in memory."""

    def __init__(self) -> None:
        self._entries: List[QueryHistoryEntry] = []

    def append(self, entry: QueryHistoryEntry) -> None:
        self._entries.append(entry)

    def search(self, query: QueryHistoryFilter) -> Sequence[QueryHistoryEntry]:
        results: List[QueryHistoryEntry] = []
        table = query.table.lower() if query.table else None
        for entry in self._entries:
            if entry.client_id != query.client_id:
                continue
            if query.start and entry.submitted_at < query.start:
                continue
            if query.end and entry.submitted_at > query.end:
                continue
            if table and not any(t.lower() == table or table in t.lower() for t in entry.tables):
                continue
            results.append(entry)
        results.sort(key=lambda entry: entry.submitted_at, reverse=True)
        if query.limit is not None:
            return results[: query.limit]
        return results


def summarise_history(entries: Iterable[QueryHistoryEntry]) -> QueryHistorySummary:
    """Produce aggregated metrics for ``entries``."""

    entries_list = list(entries)
    if entries_list:
        range_start = min(entry.submitted_at for entry in entries_list)
        range_end = max(entry.submitted_at for entry in entries_list)
    else:
        range_start = None
        range_end = None

    total_cost = sum(entry.cost_usd or 0.0 for entry in entries_list)
    failed = sum(1 for entry in entries_list if entry.status.upper() != "SUCCEEDED")
    return QueryHistorySummary(
        total_queries=len(entries_list),
        failed_queries=failed,
        total_cost_usd=total_cost,
        range_start=range_start,
        range_end=range_end,
    )


def serialize_history_entry(entry: QueryHistoryEntry) -> dict[str, object]:
    """Return a JSON-serialisable representation of ``entry``."""

    def _iso(value: datetime | None) -> str | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.isoformat(timespec="milliseconds")
        return value.astimezone().isoformat(timespec="milliseconds")

    return {
        "queryId": entry.query_id,
        "clientId": entry.client_id,
        "statement": entry.statement,
        "status": entry.status,
        "submittedAt": _iso(entry.submitted_at),
        "completedAt": _iso(entry.completed_at),
        "elapsedMs": entry.elapsed_ms,
        "dataScannedMb": entry.data_scanned_mb,
        "rowCount": entry.row_count,
        "costUsd": entry.cost_usd,
        "errorMessage": entry.error_message,
        "tables": list(entry.tables),
        "snapshotId": entry.snapshot_id,
        "asOfTimestamp": _iso(entry.as_of_timestamp),
    }

