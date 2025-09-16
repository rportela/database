"""Configuration helpers for Iceberg catalog bootstrapping."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Iterable, Mapping, Tuple


class CatalogProvider(str, Enum):
    """Supported object storage providers for Iceberg warehouses."""

    GCS = "gcs"
    S3 = "s3"
    AZURE_BLOB = "azure"

    @property
    def scheme(self) -> str:
        """Return the URI scheme associated with the provider."""

        match self:
            case CatalogProvider.GCS:
                return "gs"
            case CatalogProvider.S3:
                return "s3"
            case CatalogProvider.AZURE_BLOB:
                # Azure Data Lake Storage Gen2 (`abfs`) is the most common URI format.
                return "abfs"
        raise ValueError(f"Unsupported catalog provider: {self!s}")


@dataclass(frozen=True)
class IcebergCatalogConfig:
    """Describe how to resolve catalog, namespace, and warehouse locations."""

    name: str
    provider: CatalogProvider
    warehouse_bucket: str
    warehouse_prefix: str = ""
    namespace_prefix: Tuple[str, ...] = ("clients",)
    catalog_options: Mapping[str, Any] = field(default_factory=dict)
    namespace_properties: Mapping[str, str] = field(default_factory=dict)
    provider_options: Mapping[str, Any] = field(default_factory=dict)
    metadata_bucket: str | None = None
    metadata_prefix: str | None = None

    def namespace(self, client_id: str) -> Tuple[str, ...]:
        """Return the Iceberg namespace tuple for ``client_id``."""

        client_segment = client_id.strip()
        if not client_segment:
            raise ValueError("client_id must be a non-empty string")
        return (*self.namespace_prefix, client_segment)

    def namespace_path(self, client_id: str) -> str:
        """Return the namespace path used within the warehouse location."""

        return "/".join(self.namespace(client_id))

    def _join_path(self, *segments: Iterable[str | None]) -> str:
        parts: list[str] = []
        for segment in segments:
            if segment is None:
                continue
            if isinstance(segment, str):
                normalized = segment.strip("/")
                if normalized:
                    parts.append(normalized)
                continue
            for value in segment:
                if value is None:
                    continue
                normalized = value.strip("/")
                if normalized:
                    parts.append(normalized)
        return "/".join(parts)

    def warehouse_path(self, client_id: str) -> str:
        """Return the object store prefix for the client's warehouse."""

        return self._join_path([self.warehouse_prefix], [self.namespace_path(client_id)])

    def warehouse_uri(self, client_id: str) -> str:
        """Return the fully qualified URI for the client's warehouse."""

        path = self.warehouse_path(client_id)
        scheme = self.provider.scheme
        bucket = self.warehouse_bucket.strip()
        if path:
            return f"{scheme}://{bucket}/{path}"
        return f"{scheme}://{bucket}"

    def metadata_path(self, client_id: str) -> str | None:
        """Return the metadata prefix if a dedicated metadata bucket is configured."""

        if not self.metadata_bucket:
            return None
        prefix = self.metadata_prefix if self.metadata_prefix is not None else self.warehouse_prefix
        return self._join_path([prefix], [self.namespace_path(client_id)])

    def metadata_uri(self, client_id: str) -> str | None:
        """Return the URI for metadata objects when configured."""

        if not self.metadata_bucket:
            return None
        path = self.metadata_path(client_id)
        scheme = self.provider.scheme
        bucket = self.metadata_bucket.strip()
        if path:
            return f"{scheme}://{bucket}/{path}"
        return f"{scheme}://{bucket}"

    def table_location(self, client_id: str, table_name: str) -> str:
        """Compute the default table location within the client's warehouse."""

        base = self.warehouse_uri(client_id).rstrip("/")
        return f"{base}/{table_name.strip()}"

    @property
    def catalog_name(self) -> str:
        """Expose the catalog name used by :func:`pyiceberg.catalog.load_catalog`."""

        return self.name

