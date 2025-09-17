"""Typed models shared across the query service."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Mapping, Sequence


@dataclass(frozen=True)
class QueryRequest:
    """Represents a SQL statement to be executed for a client."""

    client_id: str
    sql: str
    limit: int | None = None
    snapshot_id: str | None = None
    as_of_timestamp: datetime | None = None
    estimated_scan_mb: float | None = None


@dataclass(frozen=True)
class QueryResultColumn:
    """Schema information for a column returned by the query."""

    name: str
    type: str | None = None


@dataclass(frozen=True)
class QueryStatistics:
    """Metrics describing the execution of a query."""

    elapsed_ms: float | None = None
    data_scanned_mb: float | None = None
    row_count: int | None = None
    snapshot_id: str | None = None
    snapshot_timestamp: datetime | None = None
    engine_details: Mapping[str, Any] | None = None


@dataclass(frozen=True)
class QueryResult:
    """Materialised result returned by a query execution."""

    statement: str
    columns: Sequence[QueryResultColumn] = field(default_factory=tuple)
    rows: Sequence[Any] = field(default_factory=tuple)
    stats: QueryStatistics | None = None

