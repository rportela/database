"""Utilities for working with Apache Iceberg catalogs."""

from .bootstrap import CatalogBootstrapResult, ClientCatalogHandle, IcebergCatalogBootstrapper
from .config import CatalogProvider, IcebergCatalogConfig
from .schema import SchemaEvolutionManager, SchemaEvolutionError
from .storage import CatalogPrefixMarker, CatalogStorageError, DefaultCatalogStorageFactory, WarehouseStorageManager
from .tables import DEFAULT_TABLES, IcebergTableSpec, SchemaField

__all__ = [
    "CatalogBootstrapResult",
    "ClientCatalogHandle",
    "CatalogPrefixMarker",
    "CatalogProvider",
    "CatalogStorageError",
    "DEFAULT_TABLES",
    "IcebergCatalogBootstrapper",
    "IcebergCatalogConfig",
    "IcebergTableSpec",
    "SchemaEvolutionError",
    "SchemaEvolutionManager",
    "SchemaField",
    "WarehouseStorageManager",
    "DefaultCatalogStorageFactory",
]
