from iceberg.config import CatalogProvider, IcebergCatalogConfig


def test_namespace_and_paths():
    config = IcebergCatalogConfig(
        name="clients",
        provider=CatalogProvider.GCS,
        warehouse_bucket="analytics-bucket",
        warehouse_prefix="warehouse",
        namespace_prefix=("tenants",),
        metadata_bucket="metadata-bucket",
        metadata_prefix="metadata",
    )

    namespace = config.namespace("client-123")
    assert namespace == ("tenants", "client-123")

    warehouse_path = config.warehouse_path("client-123")
    assert warehouse_path == "warehouse/tenants/client-123"
    assert (
        config.warehouse_uri("client-123")
        == "gs://analytics-bucket/warehouse/tenants/client-123"
    )

    metadata_path = config.metadata_path("client-123")
    assert metadata_path == "metadata/tenants/client-123"
    assert (
        config.metadata_uri("client-123")
        == "gs://metadata-bucket/metadata/tenants/client-123"
    )

    assert (
        config.table_location("client-123", "events")
        == "gs://analytics-bucket/warehouse/tenants/client-123/events"
    )


def test_namespace_rejects_blank_client_id():
    config = IcebergCatalogConfig(
        name="clients",
        provider=CatalogProvider.S3,
        warehouse_bucket="lakehouse",
    )

    try:
        config.namespace(" ")
    except ValueError as exc:
        assert "client_id" in str(exc)
    else:  # pragma: no cover - defensive guard
        raise AssertionError("Blank client identifier should raise ValueError")
