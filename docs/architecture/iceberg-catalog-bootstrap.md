# Iceberg Catalog Bootstrap & Data Lifecycle

This phase introduces the per-client Iceberg catalog layout and the lifecycle primitives that keep table schemas in sync across providers.

## Catalog layout

Each tenant receives an isolated Iceberg namespace. The namespace is derived from a configurable prefix and the tenant identifier:

```
namespace = (<namespace_prefix...>, <client_id>)
warehouse = <scheme>://<bucket>/<warehouse_prefix>/<namespace_path>
```

The configuration is expressed via [`IcebergCatalogConfig`](../../src/iceberg/config.py). It accepts the catalog name, the object store provider (GCS, S3, or Azure Blob), the warehouse bucket/prefix, and optional metadata bucket details. The helper normalises URIs and exposes convenience methods for building table locations.

## Object store bootstrap

The [`WarehouseStorageManager`](../../src/iceberg/storage.py) writes a `.catalog-bootstrap` marker beneath the warehouse (and optional metadata) prefixes. GCS does not materialise empty directories, so creating the marker ensures the prefix exists before the catalog service begins writing metadata. The manager delegates to a pluggable `ObjectStore` factory. The default implementation supports Google Cloud Storage, while the interface is generic enough to register S3 or Azure Blob providers.

## Namespace and table provisioning

[`IcebergCatalogBootstrapper`](../../src/iceberg/bootstrap.py) orchestrates the full bootstrap flow:

1. Pre-create object store prefixes through the storage manager.
2. Connect to the configured Iceberg catalog using `pyiceberg`.
3. Create the per-client namespace, setting the `location` property to the warehouse URI.
4. Materialise default tables when they are missing. The initial bundle includes `main`, `events`, and `metrics`, as described in [`tables.py`](../../src/iceberg/tables.py). Each table definition captures schema, partitioning, and write properties.

The class returns a `CatalogBootstrapResult` object that lists the namespace, warehouse URI, created tables, and the bootstrap markers. Bootstrapping is idempotent—rerunning the workflow simply leaves existing namespaces and tables untouched.

## Schema evolution

[`SchemaEvolutionManager`](../../src/iceberg/schema.py) encapsulates our schema change strategy. The helper loads a table, compares the desired columns with the current schema, and adds any missing optional columns using Iceberg's schema update API. Required columns are rejected to avoid backfills that would violate Iceberg's compatibility guarantees. The manager refreshes the table metadata after committing changes so downstream readers observe the new schema immediately.

## Resolving client catalogs

Consumers resolve catalog handles through the same configuration object and bootstrapper:

```python
from iceberg import (
    CatalogProvider,
    IcebergCatalogBootstrapper,
    IcebergCatalogConfig,
)

config = IcebergCatalogConfig(
    name="clients",
    provider=CatalogProvider.GCS,
    warehouse_bucket="my-data-bucket",
    warehouse_prefix="warehouse",
)
bootstrapper = IcebergCatalogBootstrapper()
result = bootstrapper.bootstrap_client("tenant-123", config)

handle = bootstrapper.open_catalog("tenant-123", config)
table = handle.catalog.load_table((*handle.namespace, "events"))
```

The `_load_pyiceberg_catalog` helper reuses `pyiceberg.catalog.load_catalog` and can be swapped out in tests by passing a custom loader to the bootstrapper.

## Extensibility

* **Providers** – new `CatalogProvider` enum values can be added as backends come online. Register a custom storage factory that returns the appropriate `ObjectStore` implementation for S3 or Azure.
* **Tables** – supply custom `IcebergTableSpec` objects to `bootstrap_client` to provision additional tables.
* **Schema management** – extend `SchemaEvolutionManager` with transformations such as rename or reorder while keeping the safety checks centralised.

These building blocks establish a consistent tenant bootstrap process and a clear entry point for managing Iceberg table lifecycles across clouds.
