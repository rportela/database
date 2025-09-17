from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from typing import Iterator

import pytest

from query import (
    InMemoryQueryHistoryStore,
    QueryError,
    QueryHistoryFilter,
    QueryHistoryEntry,
    QueryHistorySummary,
    QueryRequest,
    QueryResult,
    QueryResultColumn,
    QueryService,
    QueryStatistics,
    summarise_history,
)


class StubEntitlements:
    def __init__(self) -> None:
        self.recorded_usage: list[tuple[str, float, int]] = []

    @contextmanager
    def query_context(self, client_id: str, *, estimated_scan_mb: float = 0.0):
        yield {"client_id": client_id, "estimate": estimated_scan_mb}

    def record_query_usage(self, client_id: str, stats, *, entitlements=None) -> None:  # noqa: ANN001
        self.recorded_usage.append((client_id, stats.data_scanned_mb, stats.result_rows))


class StubEngine:
    def __init__(self, result: QueryResult | QueryError) -> None:
        self._result = result
        self.requests: list[QueryRequest] = []

    def execute(self, request: QueryRequest) -> QueryResult:
        self.requests.append(request)
        if isinstance(self._result, QueryError):
            raise self._result
        return self._result


def iter_times(start: datetime, *, count: int, step_ms: int = 10) -> Iterator[datetime]:
    for index in range(count):
        yield start + timedelta(milliseconds=step_ms * index)


def test_execute_success_records_history_and_usage() -> None:
    store = InMemoryQueryHistoryStore()
    entitlements = StubEntitlements()
    result = QueryResult(
        statement="SELECT * FROM demo.events",
        columns=(QueryResultColumn(name="id"),),
        rows=((1,), (2,)),
        stats=QueryStatistics(elapsed_ms=12.5, data_scanned_mb=24.0, row_count=2),
    )
    engine = StubEngine(result)
    clock = iter(iter_times(datetime(2024, 1, 1, tzinfo=timezone.utc), count=2))
    service = QueryService(engine, entitlements, store, clock=lambda: next(clock))

    request = QueryRequest(client_id="client-123", sql="SELECT * FROM analytics.main LIMIT 2")
    response = service.execute(request)

    assert response.rows == result.rows
    assert entitlements.recorded_usage == [("client-123", 24.0, 2)]

    history = store.search(QueryHistoryFilter(client_id="client-123"))
    assert len(history) == 1
    entry = history[0]
    assert entry.status == "SUCCEEDED"
    assert entry.data_scanned_mb == 24.0
    assert entry.row_count == 2
    assert entry.cost_usd == pytest.approx(24.0 * 0.00045)
    assert "analytics.main" in entry.tables or "analytics.main" == entry.tables[0]


def test_execute_failure_logs_history() -> None:
    store = InMemoryQueryHistoryStore()
    entitlements = StubEntitlements()
    engine = StubEngine(QueryError("invalid_sql", "syntax error"))
    clock = iter(iter_times(datetime(2024, 1, 2, tzinfo=timezone.utc), count=2))
    service = QueryService(engine, entitlements, store, clock=lambda: next(clock))

    request = QueryRequest(client_id="client-456", sql="SELECT FROM broken")
    with pytest.raises(QueryError):
        service.execute(request)

    history = store.search(QueryHistoryFilter(client_id="client-456"))
    assert len(history) == 1
    entry = history[0]
    assert entry.status == "FAILED"
    assert entry.error_message == "syntax error"
    assert entry.data_scanned_mb is None or entry.data_scanned_mb == 0.0


def test_history_store_filters_by_date_and_table() -> None:
    store = InMemoryQueryHistoryStore()
    base_time = datetime(2024, 1, 1, tzinfo=timezone.utc)
    entries = [
        QueryHistoryEntry(
            query_id=f"q{i}",
            client_id="client-abc",
            statement="SELECT 1",
            status="SUCCEEDED",
            submitted_at=base_time + timedelta(days=i),
            completed_at=base_time + timedelta(days=i, seconds=1),
            elapsed_ms=5.0,
            data_scanned_mb=10.0 + i,
            row_count=100 + i,
            cost_usd=0.1 + i * 0.01,
            tables=("analytics.main",),
        )
        for i in range(5)
    ]
    for entry in entries:
        store.append(entry)

    filtered = store.search(
        QueryHistoryFilter(
            client_id="client-abc",
            start=base_time + timedelta(days=1),
            end=base_time + timedelta(days=3, hours=23),
            table="main",
        )
    )
    assert len(filtered) == 3
    summary = summarise_history(filtered)
    assert isinstance(summary, QueryHistorySummary)
    assert summary.total_queries == 3
    assert summary.failed_queries == 0
    assert summary.total_cost_usd == pytest.approx(sum(e.cost_usd for e in filtered))
