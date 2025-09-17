"""Query execution service and history tracking utilities."""

from .engine import QueryEngine, QueryError
from .history import (
    QueryHistoryEntry,
    QueryHistoryFilter,
    QueryHistoryStore,
    QueryHistorySummary,
    InMemoryQueryHistoryStore,
    serialize_history_entry,
    summarise_history,
)
from .models import QueryRequest, QueryResult, QueryResultColumn, QueryStatistics
from .service import QueryService

__all__ = [
    "QueryEngine",
    "QueryError",
    "QueryHistoryEntry",
    "QueryHistoryFilter",
    "QueryHistoryStore",
    "QueryHistorySummary",
    "InMemoryQueryHistoryStore",
    "QueryRequest",
    "QueryResult",
    "QueryResultColumn",
    "QueryStatistics",
    "QueryService",
    "serialize_history_entry",
    "summarise_history",
]
