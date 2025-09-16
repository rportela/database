"""Google Cloud Storage implementation of the :mod:`storage.object_store` interface."""

from __future__ import annotations

from typing import Iterable

from google.api_core.exceptions import GoogleAPIError
from google.cloud import storage

from .object_store import ObjectMetadata, ObjectStore, ObjectStoreError


class GCSObjectStore(ObjectStore):
    """Interact with Google Cloud Storage using the common :class:`ObjectStore` API."""

    def __init__(
        self,
        bucket_name: str,
        *,
        project: str | None = None,
        client: storage.Client | None = None,
    ) -> None:
        self._bucket_name = bucket_name
        self._project = project
        self._client = client

    @property
    def _client_instance(self) -> storage.Client:
        if self._client is None:
            self._client = storage.Client(project=self._project)
        return self._client

    def _blob(self, path: str) -> storage.Blob:
        return self._client_instance.bucket(self._bucket_name).blob(path)

    def read(self, path: str) -> bytes:
        try:
            return self._blob(path).download_as_bytes()
        except GoogleAPIError as exc:  # pragma: no cover - network failure path
            raise ObjectStoreError(f"Failed to read object '{path}' from bucket '{self._bucket_name}'.", cause=exc) from exc

    def write(self, path: str, data: bytes, *, content_type: str | None = None) -> None:
        blob = self._blob(path)
        try:
            blob.upload_from_string(data, content_type=content_type)
        except GoogleAPIError as exc:  # pragma: no cover - network failure path
            raise ObjectStoreError(
                f"Failed to write object '{path}' to bucket '{self._bucket_name}'.", cause=exc
            ) from exc

    def list(self, prefix: str = "") -> Iterable[ObjectMetadata]:
        try:
            for blob in self._client_instance.list_blobs(self._bucket_name, prefix=prefix):
                yield ObjectMetadata(name=blob.name, size=blob.size or 0)
        except GoogleAPIError as exc:  # pragma: no cover - network failure path
            raise ObjectStoreError(
                f"Failed to list objects under '{prefix}' in bucket '{self._bucket_name}'.", cause=exc
            ) from exc
