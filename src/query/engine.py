"""Interfaces for SQL query execution backends."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from .models import QueryRequest, QueryResult


class QueryError(RuntimeError):
    """Raised when a query fails to execute successfully."""

    def __init__(self, code: str, message: str, *, details: str | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details


class QueryEngine(Protocol):
    """Protocol implemented by compute backends such as DuckDB."""

    def execute(self, request: QueryRequest) -> QueryResult:
        """Execute ``request`` and return the materialised result set."""

