"""High level orchestration for query execution and history logging."""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Callable, Sequence

from api.entitlements import EntitlementError, EntitlementService, QueryExecutionStats

from .engine import QueryEngine, QueryError
from .history import QueryHistoryEntry, QueryHistoryStore
from .models import QueryRequest, QueryResult, QueryStatistics

LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True)
class _TablesExtractor:
    """Utility that extracts candidate table identifiers from SQL statements."""

    keywords: Sequence[str] = ("from", "join", "into")

    def __call__(self, statement: str) -> Sequence[str]:
        tokens = statement.split()
        found: set[str] = set()
        lowered = [token.strip("`,") for token in tokens]
        for index, token in enumerate(lowered[:-1]):
            if token.lower() in self.keywords:
                candidate = lowered[index + 1]
                if candidate:
                    found.add(candidate)
        return tuple(sorted(found))


class QueryService:
    """Execute SQL statements while enforcing entitlements and logging history."""

    def __init__(
        self,
        engine: QueryEngine,
        entitlement_service: EntitlementService,
        history_store: QueryHistoryStore,
        *,
        cost_per_mb: float = 0.00045,
        clock: Callable[[], datetime] | None = None,
        table_extractor: Callable[[str], Sequence[str]] | None = None,
    ) -> None:
        self._engine = engine
        self._entitlements = entitlement_service
        self._history_store = history_store
        self._cost_per_mb = cost_per_mb
        self._clock = clock or (lambda: datetime.now(timezone.utc))
        self._extract_tables = table_extractor or _TablesExtractor()

    @property
    def history_store(self) -> QueryHistoryStore:
        """Expose the underlying history store for read operations."""

        return self._history_store

    def execute(self, request: QueryRequest) -> QueryResult:
        """Execute ``request`` and record the outcome."""

        if not request.sql.strip():
            raise QueryError("empty_statement", "A SQL statement must be provided")

        started_at = self._clock()
        query_id = uuid.uuid4().hex
        status = "FAILED"
        error_message: str | None = None
        result: QueryResult | None = None
        stats: QueryStatistics | None = None
        tables = self._extract_tables(request.sql)
        entitlements = None

        try:
            with self._entitlements.query_context(
                request.client_id,
                estimated_scan_mb=request.estimated_scan_mb or 0.0,
            ) as entitlements:
                result = self._engine.execute(request)
                stats = result.stats
                self._record_usage(request.client_id, stats, result, entitlements)
            status = "SUCCEEDED"
            return result
        except EntitlementError as exc:
            error_message = str(exc)
            LOGGER.warning("Entitlement enforcement failed for client %s", request.client_id, exc_info=exc)
            raise
        except QueryError as exc:
            error_message = exc.message
            LOGGER.error("Query engine reported failure for client %s", request.client_id, exc_info=exc)
            raise
        except Exception as exc:  # pragma: no cover - defensive catch
            error_message = str(exc)
            LOGGER.exception("Unexpected failure while executing query for client %s", request.client_id)
            raise QueryError("internal_error", "Query execution failed") from exc
        finally:
            finished_at = self._clock()
            elapsed_ms = self._resolve_elapsed(stats, started_at, finished_at)
            data_scanned = self._resolve_scan(stats)
            row_count = self._resolve_rows(stats, result)
            cost = self._estimate_cost(data_scanned)

            entry = QueryHistoryEntry(
                query_id=query_id,
                client_id=request.client_id,
                statement=request.sql,
                status=status,
                submitted_at=started_at,
                completed_at=finished_at if status == "SUCCEEDED" or error_message else None,
                elapsed_ms=elapsed_ms,
                data_scanned_mb=data_scanned,
                row_count=row_count,
                cost_usd=cost,
                error_message=error_message,
                tables=tables,
                snapshot_id=request.snapshot_id,
                as_of_timestamp=request.as_of_timestamp,
            )

            try:
                self._history_store.append(entry)
            except Exception as exc:  # pragma: no cover - defensive logging
                LOGGER.error("Failed to persist query history entry", exc_info=exc)

    # Internal helpers -------------------------------------------------

    def _record_usage(
        self,
        client_id: str,
        stats: QueryStatistics | None,
        result: QueryResult,
        entitlements,
    ) -> None:
        row_count = self._resolve_rows(stats, result)
        data_scanned = self._resolve_scan(stats)
        self._entitlements.record_query_usage(
            client_id,
            QueryExecutionStats(
                data_scanned_mb=float(data_scanned or 0.0),
                result_rows=int(row_count or 0),
            ),
            entitlements=entitlements,
        )

    def _resolve_rows(self, stats: QueryStatistics | None, result: QueryResult | None) -> int | None:
        if stats and stats.row_count is not None:
            return stats.row_count
        if result and result.rows is not None:
            try:
                return len(result.rows)
            except TypeError:  # pragma: no cover - best effort for iterables
                return None
        return None

    def _resolve_scan(self, stats: QueryStatistics | None) -> float | None:
        if stats and stats.data_scanned_mb is not None:
            return stats.data_scanned_mb
        return None

    def _resolve_elapsed(self, stats: QueryStatistics | None, start: datetime, end: datetime) -> float | None:
        if stats and stats.elapsed_ms is not None:
            return stats.elapsed_ms
        delta = end - start
        return delta.total_seconds() * 1000.0

    def _estimate_cost(self, data_scanned_mb: float | None) -> float:
        scanned = data_scanned_mb or 0.0
        return round(scanned * self._cost_per_mb, 6)

