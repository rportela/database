"""Bootstrap helpers for per-client Iceberg catalogs."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Mapping, Sequence, Tuple, TYPE_CHECKING

from .config import IcebergCatalogConfig
from .storage import CatalogPrefixMarker, WarehouseStorageManager
from .tables import DEFAULT_TABLES, IcebergTableSpec

if TYPE_CHECKING:  # pragma: no cover - import only for typing
    from pyiceberg.catalog import Catalog


class CatalogBootstrapError(RuntimeError):
    """Raised when a catalog bootstrap operation fails."""


@dataclass(frozen=True)
class CatalogBootstrapResult:
    """Summary of the actions performed while bootstrapping a catalog."""

    client_id: str
    namespace: Tuple[str, ...]
    warehouse_uri: str
    created_namespace: bool
    created_tables: Tuple[Tuple[str, ...], ...]
    prefix_markers: Tuple[CatalogPrefixMarker, ...]


@dataclass(frozen=True)
class ClientCatalogHandle:
    """Return value for :meth:`IcebergCatalogBootstrapper.open_catalog`."""

    client_id: str
    catalog: "Catalog"
    namespace: Tuple[str, ...]
    warehouse_uri: str


class IcebergCatalogBootstrapper:
    """Create namespaces and tables for a client's Iceberg catalog."""

    def __init__(
        self,
        storage_manager: WarehouseStorageManager | None = None,
        *,
        load_catalog: Callable[..., "Catalog"] | None = None,
    ) -> None:
        self._storage_manager = storage_manager or WarehouseStorageManager()
        self._load_catalog = load_catalog

    def _load_pyiceberg_catalog(self, config: IcebergCatalogConfig) -> "Catalog":
        if self._load_catalog is not None:
            return self._load_catalog(config.catalog_name, **config.catalog_options)

        try:
            from pyiceberg.catalog import load_catalog  # type: ignore
        except ModuleNotFoundError as exc:  # pragma: no cover - optional dependency
            raise CatalogBootstrapError(
                "The 'pyiceberg' package is required to bootstrap Iceberg catalogs. Install it via 'pip install pyiceberg'."
            ) from exc

        return load_catalog(config.catalog_name, **config.catalog_options)

    def open_catalog(self, client_id: str, config: IcebergCatalogConfig) -> ClientCatalogHandle:
        """Resolve the catalog handle, namespace, and warehouse for ``client_id``."""

        if not client_id.strip():
            raise ValueError("client_id must be a non-empty string")
        catalog = self._load_pyiceberg_catalog(config)
        namespace = config.namespace(client_id)
        return ClientCatalogHandle(
            client_id=client_id,
            catalog=catalog,
            namespace=namespace,
            warehouse_uri=config.warehouse_uri(client_id),
        )

    def bootstrap_client(
        self,
        client_id: str,
        config: IcebergCatalogConfig,
        *,
        tables: Sequence[IcebergTableSpec] | None = None,
        extra_namespace_properties: Mapping[str, str] | None = None,
    ) -> CatalogBootstrapResult:
        """Ensure the namespace and default tables exist for ``client_id``."""

        if not client_id.strip():
            raise ValueError("client_id must be a non-empty string")

        # Ensure object store prefixes exist ahead of namespace/table creation.
        prefix_markers = self._prepare_storage(config, client_id)

        catalog = self._load_pyiceberg_catalog(config)
        namespace = config.namespace(client_id)

        namespace_properties = {"location": config.warehouse_uri(client_id)}
        namespace_properties.update(config.namespace_properties)
        if extra_namespace_properties:
            namespace_properties.update(extra_namespace_properties)

        created_namespace = False
        if not catalog.namespace_exists(namespace):
            catalog.create_namespace(namespace, namespace_properties)
            created_namespace = True

        tables_to_create: Sequence[IcebergTableSpec] = tables or DEFAULT_TABLES
        created_tables: list[Tuple[str, ...]] = []
        for table in tables_to_create:
            identifier = table.identifier(namespace)
            if catalog.table_exists(identifier):
                continue
            schema = table.to_pyiceberg_schema()
            partition_spec = table.to_pyiceberg_partition_spec(schema)
            location = table.location(config, client_id)
            create_kwargs: dict[str, object] = {
                "schema": schema,
                "location": location,
            }
            if partition_spec is not None and getattr(partition_spec, "fields", None):
                create_kwargs["partition_spec"] = partition_spec
            if table.properties:
                create_kwargs["properties"] = dict(table.properties)
            catalog.create_table(identifier, **create_kwargs)
            created_tables.append(identifier)

        return CatalogBootstrapResult(
            client_id=client_id,
            namespace=namespace,
            warehouse_uri=config.warehouse_uri(client_id),
            created_namespace=created_namespace,
            created_tables=tuple(created_tables),
            prefix_markers=tuple(prefix_markers),
        )

    def _prepare_storage(
        self,
        config: IcebergCatalogConfig,
        client_id: str,
    ) -> Tuple[CatalogPrefixMarker, ...]:
        markers: list[CatalogPrefixMarker] = []
        warehouse_prefix = config.warehouse_path(client_id)
        marker = self._storage_manager.ensure_prefix(
            config.provider,
            bucket=config.warehouse_bucket,
            prefix=warehouse_prefix,
            provider_options=config.provider_options,
        )
        if marker is not None:
            markers.append(marker)

        metadata_prefix = config.metadata_path(client_id)
        if config.metadata_bucket and metadata_prefix:
            metadata_marker = self._storage_manager.ensure_prefix(
                config.provider,
                bucket=config.metadata_bucket,
                prefix=metadata_prefix,
                provider_options=config.provider_options,
            )
            if metadata_marker is not None:
                markers.append(metadata_marker)
        return tuple(markers)
