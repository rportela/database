from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from typing import Iterator

from api.app import create_app
from api.entitlements import QueryExecutionStats
from query import (
    InMemoryQueryHistoryStore,
    QueryHistoryEntry,
    QueryHistoryFilter,
    QueryRequest,
    QueryResult,
    QueryResultColumn,
    QueryService,
    QueryStatistics,
)


class DummyBillingRepository:
    def record_checkout_session(self, *, session_id: str, client_id: str, plan_id: str) -> None:  # noqa: D401, ANN001
        return None

    def link_customer_to_client(self, **kwargs):  # noqa: ANN001, D401
        return None


class StubEntitlements:
    def __init__(self) -> None:
        self.usage_recorded: list[QueryExecutionStats] = []

    @contextmanager
    def query_context(self, client_id: str, *, estimated_scan_mb: float = 0.0):
        yield {"client_id": client_id, "estimate": estimated_scan_mb}

    def record_query_usage(self, client_id: str, stats, *, entitlements=None) -> None:  # noqa: ANN001
        self.usage_recorded.append(stats)


class StubEngine:
    def __init__(self, result: QueryResult) -> None:
        self.result = result
        self.requests: list[QueryRequest] = []

    def execute(self, request: QueryRequest) -> QueryResult:
        self.requests.append(request)
        return self.result


def iter_times(start: datetime, *, count: int) -> Iterator[datetime]:
    for index in range(count):
        yield start + timedelta(milliseconds=5 * index)


def test_query_endpoint_executes_and_logs_history() -> None:
    store = InMemoryQueryHistoryStore()
    entitlements = StubEntitlements()
    result = QueryResult(
        statement="SELECT 1",
        columns=(QueryResultColumn(name="col"),),
        rows=((1,),),
        stats=QueryStatistics(elapsed_ms=1.2, data_scanned_mb=3.0, row_count=1),
    )
    engine = StubEngine(result)
    clock = iter(iter_times(datetime(2024, 2, 1, tzinfo=timezone.utc), count=2))
    service = QueryService(engine, entitlements, store, clock=lambda: next(clock))

    app = create_app(
        billing_repository=DummyBillingRepository(),
        query_service=service,
        query_history_store=store,
    )
    client = app.test_client()

    response = client.post(
        "/query",
        json={"client_id": "client-x", "sql": "SELECT * FROM demo.main"},
    )
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["rows"] == [[1]]
    history = store.search(QueryHistoryFilter(client_id="client-x"))
    assert len(history) == 1


def test_query_history_endpoint_filters_results() -> None:
    store = InMemoryQueryHistoryStore()
    base = datetime(2024, 3, 1, tzinfo=timezone.utc)
    for day in range(3):
        store.append(
            QueryHistoryEntry(
                query_id=f"q{day}",
                client_id="client-x",
                statement="SELECT 1",
                status="SUCCEEDED",
                submitted_at=base + timedelta(days=day),
                completed_at=base + timedelta(days=day, seconds=1),
                elapsed_ms=2.0,
                data_scanned_mb=1.0,
                row_count=1,
                cost_usd=0.01,
                tables=("demo.main",),
            )
        )

    app = create_app(billing_repository=DummyBillingRepository(), query_history_store=store)
    client = app.test_client()

    response = client.get(
        "/api/clients/client-x/query-history",
        query_string={"start": (base + timedelta(days=1)).isoformat(), "table": "main"},
    )
    assert response.status_code == 200
    body = response.get_json()
    assert len(body["entries"]) == 2
    assert body["summary"]["totalQueries"] == 2
