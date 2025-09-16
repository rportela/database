"""Helpers for preparing object storage prefixes used by Iceberg catalogs."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Callable, Mapping

from .config import CatalogProvider
from storage.object_store import ObjectStore, ObjectStoreError


class CatalogStorageError(RuntimeError):
    """Raised when bootstrapping object store prefixes fails."""


@dataclass(frozen=True)
class CatalogPrefixMarker:
    """Record of an object created to assert a catalog prefix exists."""

    provider: CatalogProvider
    bucket: str
    path: str


StorageFactory = Callable[[CatalogProvider, str, Mapping[str, Any]], ObjectStore]


class DefaultCatalogStorageFactory:
    """Instantiate :class:`ObjectStore` implementations for supported providers."""

    def __call__(self, provider: CatalogProvider, bucket: str, options: Mapping[str, Any]) -> ObjectStore:
        if provider is CatalogProvider.GCS:
            from storage.gcs import GCSObjectStore

            project = options.get("project") if options else None
            client = options.get("client") if options else None
            return GCSObjectStore(bucket, project=project, client=client)
        raise CatalogStorageError(
            f"Provider '{provider.value}' is not supported by the default catalog storage factory."
        )


class WarehouseStorageManager:
    """Ensure warehouse prefixes exist prior to catalog bootstrap."""

    def __init__(
        self,
        storage_factory: StorageFactory | None = None,
        marker_filename: str = ".catalog-bootstrap",
    ) -> None:
        self._storage_factory = storage_factory or DefaultCatalogStorageFactory()
        self._marker_filename = marker_filename

    def ensure_prefix(
        self,
        provider: CatalogProvider,
        *,
        bucket: str,
        prefix: str,
        provider_options: Mapping[str, Any] | None = None,
    ) -> CatalogPrefixMarker | None:
        """Create a placeholder object so the prefix is visible in the provider console."""

        normalized_prefix = prefix.strip("/")
        if not normalized_prefix:
            return None

        store = self._storage_factory(provider, bucket, provider_options or {})
        marker_path = f"{normalized_prefix}/{self._marker_filename}" if normalized_prefix else self._marker_filename
        timestamp = datetime.now(timezone.utc).isoformat()
        payload = f"Bootstrap marker written at {timestamp} UTC".encode("utf-8")
        try:
            store.write(marker_path, payload, content_type="text/plain")
        except Exception as exc:
            raise CatalogStorageError(
                f"Unable to write bootstrap marker to {provider.value} bucket '{bucket}' under '{marker_path}'."
            ) from exc
        return CatalogPrefixMarker(provider=provider, bucket=bucket, path=marker_path)
