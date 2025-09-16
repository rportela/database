"""Common abstraction for object storage backends.

The application relies on an object store for Apache Iceberg table data as well as
auxiliary metadata such as Stripe webhook payloads. To support multiple
clouds, we rely on a thin interface that captures the operations we need.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Protocol, runtime_checkable


@dataclass
class ObjectMetadata:
    """Metadata returned when listing objects."""

    name: str
    size: int


@runtime_checkable
class ObjectStore(Protocol):
    """Interface implemented by cloud-specific object storage clients."""

    def read(self, path: str) -> bytes:
        """Return the raw contents stored at ``path``."""

    def write(self, path: str, data: bytes, *, content_type: str | None = None) -> None:
        """Persist ``data`` to ``path`` using an optional ``content_type``."""

    def list(self, prefix: str = "") -> Iterable[ObjectMetadata]:
        """Yield objects that start with ``prefix`` in lexicographic order."""


class ObjectStoreError(RuntimeError):
    """Raised when an object storage backend encounters an unrecoverable error."""

    def __init__(self, message: str, *, cause: Exception | None = None) -> None:
        super().__init__(message)
        self.__cause__ = cause
