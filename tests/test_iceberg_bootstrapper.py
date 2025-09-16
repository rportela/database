from iceberg.bootstrap import IcebergCatalogBootstrapper, ClientCatalogHandle
from iceberg.config import CatalogProvider, IcebergCatalogConfig
from iceberg.storage import CatalogPrefixMarker


class FakeCatalog:
    def __init__(self) -> None:
        self.namespaces: set[tuple[str, ...]] = set()

    def namespace_exists(self, namespace: tuple[str, ...]) -> bool:
        return namespace in self.namespaces

    def create_namespace(self, namespace: tuple[str, ...], properties: dict[str, str]):
        self.namespaces.add(namespace)

    def table_exists(self, identifier: tuple[str, ...]) -> bool:  # pragma: no cover - unused stub
        return False

    def create_table(self, identifier: tuple[str, ...], **kwargs):  # pragma: no cover - unused stub
        raise AssertionError("create_table should not be called in this test")

    def load_table(self, identifier: tuple[str, ...]):  # pragma: no cover - unused stub
        raise NotImplementedError


class RecordingStorageManager:
    def __init__(self) -> None:
        self.calls: list[tuple[str, str]] = []
        self.markers: list[CatalogPrefixMarker] = []

    def ensure_prefix(self, provider, *, bucket: str, prefix: str, provider_options):
        self.calls.append((bucket, prefix))
        marker = CatalogPrefixMarker(provider=provider, bucket=bucket, path=f"{prefix}/.catalog-bootstrap")
        self.markers.append(marker)
        return marker


def test_open_catalog_uses_injected_loader():
    catalog = FakeCatalog()

    def loader(name: str, **options):
        assert name == "clients"
        assert options == {"uri": "https://catalog"}
        return catalog

    config = IcebergCatalogConfig(
        name="clients",
        provider=CatalogProvider.GCS,
        warehouse_bucket="analytics",
        catalog_options={"uri": "https://catalog"},
    )

    bootstrapper = IcebergCatalogBootstrapper(load_catalog=loader)
    handle = bootstrapper.open_catalog("tenant-42", config)

    assert isinstance(handle, ClientCatalogHandle)
    assert handle.catalog is catalog
    assert handle.namespace == ("clients", "tenant-42")
    assert handle.warehouse_uri.endswith("tenant-42")


def test_prepare_storage_creates_markers():
    storage_manager = RecordingStorageManager()
    bootstrapper = IcebergCatalogBootstrapper(storage_manager=storage_manager, load_catalog=lambda *a, **k: FakeCatalog())

    config = IcebergCatalogConfig(
        name="clients",
        provider=CatalogProvider.GCS,
        warehouse_bucket="analytics",
        warehouse_prefix="warehouse",
        metadata_bucket="metadata",
        metadata_prefix="meta",
    )

    markers = bootstrapper._prepare_storage(config, "tenant-1")
    assert len(markers) == 2
    assert {marker.bucket for marker in markers} == {"analytics", "metadata"}
    assert storage_manager.calls == [
        ("analytics", "warehouse/clients/tenant-1"),
        ("metadata", "meta/clients/tenant-1"),
    ]
