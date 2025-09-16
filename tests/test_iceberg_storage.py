from iceberg.config import CatalogProvider
from iceberg.storage import (
    CatalogPrefixMarker,
    CatalogStorageError,
    WarehouseStorageManager,
)
from storage.object_store import ObjectStore


class RecordingStore(ObjectStore):
    def __init__(self) -> None:
        self.writes: dict[str, tuple[bytes, str | None]] = {}

    def read(self, path: str) -> bytes:  # pragma: no cover - not used in tests
        raise NotImplementedError

    def write(self, path: str, data: bytes, *, content_type: str | None = None) -> None:
        self.writes[path] = (data, content_type)

    def list(self, prefix: str = ""):
        return []


class BrokenStore(RecordingStore):
    def write(self, path: str, data: bytes, *, content_type: str | None = None) -> None:
        raise RuntimeError("boom")


class RecordingFactory:
    def __init__(self, store: ObjectStore) -> None:
        self.store = store
        self.calls: list[tuple[CatalogProvider, str, dict[str, object]]] = []

    def __call__(self, provider: CatalogProvider, bucket: str, options: dict[str, object]):
        self.calls.append((provider, bucket, options))
        return self.store


def test_storage_manager_writes_marker():
    store = RecordingStore()
    factory = RecordingFactory(store)
    manager = WarehouseStorageManager(storage_factory=factory)

    marker = manager.ensure_prefix(
        CatalogProvider.GCS,
        bucket="analytics-bucket",
        prefix="warehouse/tenant-1",
        provider_options={"project": "demo"},
    )

    assert isinstance(marker, CatalogPrefixMarker)
    assert marker.path.startswith("warehouse/tenant-1/")
    assert marker.bucket == "analytics-bucket"
    assert CatalogProvider.GCS in {call[0] for call in factory.calls}
    assert any(call[1] == "analytics-bucket" for call in factory.calls)
    assert "warehouse/tenant-1/.catalog-bootstrap" in store.writes


def test_storage_manager_returns_none_for_root_prefix():
    store = RecordingStore()
    factory = RecordingFactory(store)
    manager = WarehouseStorageManager(storage_factory=factory)

    marker = manager.ensure_prefix(
        CatalogProvider.GCS,
        bucket="analytics-bucket",
        prefix="",
        provider_options={},
    )

    assert marker is None
    assert not store.writes


def test_storage_manager_wraps_errors():
    store = BrokenStore()
    factory = RecordingFactory(store)
    manager = WarehouseStorageManager(storage_factory=factory)

    try:
        manager.ensure_prefix(
            CatalogProvider.GCS,
            bucket="analytics-bucket",
            prefix="warehouse/tenant-1",
            provider_options={},
        )
    except CatalogStorageError as exc:
        assert "analytics-bucket" in str(exc)
    else:  # pragma: no cover - defensive guard
        raise AssertionError("Expected CatalogStorageError")
