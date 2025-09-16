"""Declarative table specifications for Iceberg catalog bootstrapping."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Mapping, Sequence, Tuple, TYPE_CHECKING

from .config import IcebergCatalogConfig

if TYPE_CHECKING:  # pragma: no cover - imported for type checking only
    from pyiceberg.partitioning import PartitionSpec
    from pyiceberg.schema import Schema


@dataclass(frozen=True)
class SchemaField:
    """Describe a column in an Iceberg table schema."""

    name: str
    type: str
    required: bool = False
    doc: str | None = None
    parent: Tuple[str, ...] = ()

    @property
    def path(self) -> Tuple[str, ...]:
        return (*self.parent, self.name)

    def to_iceberg_type(self):
        """Return the :mod:`pyiceberg` type object for this field."""

        try:
            from pyiceberg.types import (  # type: ignore
                BinaryType,
                BooleanType,
                DateType,
                DecimalType,
                DoubleType,
                FloatType,
                IntegerType,
                LongType,
                StringType,
                TimestampType,
                UUIDType,
            )
        except ModuleNotFoundError as exc:  # pragma: no cover - optional dependency
            raise ModuleNotFoundError(
                "The 'pyiceberg' package is required to materialize Iceberg schemas. Install it via 'pip install pyiceberg'."
            ) from exc

        normalized = self.type.strip().lower()
        if normalized.startswith("decimal"):
            precision, scale = _parse_decimal(normalized)
            return DecimalType(precision, scale)
        match normalized:
            case "string":
                return StringType()
            case "boolean":
                return BooleanType()
            case "binary":
                return BinaryType()
            case "int" | "integer":
                return IntegerType()
            case "long":
                return LongType()
            case "float":
                return FloatType()
            case "double":
                return DoubleType()
            case "date":
                return DateType()
            case "timestamp":
                return TimestampType(False)
            case "timestamptz" | "timestamp_tz" | "timestamp with time zone":
                return TimestampType(True)
            case "uuid":
                return UUIDType()
        raise ValueError(f"Unsupported Iceberg field type: {self.type!s}")

    def to_nested_field(self, field_id: int):
        """Convert the column definition to a :class:`pyiceberg.schema.NestedField`."""

        try:
            from pyiceberg.schema import NestedField  # type: ignore
        except ModuleNotFoundError as exc:  # pragma: no cover - optional dependency
            raise ModuleNotFoundError(
                "The 'pyiceberg' package is required to materialize Iceberg schemas. Install it via 'pip install pyiceberg'."
            ) from exc

        return NestedField(field_id, self.name, self.to_iceberg_type(), required=self.required, doc=self.doc)

    def dotted_path(self) -> str:
        return ".".join(self.path)


@dataclass(frozen=True)
class IcebergTableSpec:
    """Represent the desired layout of an Iceberg table."""

    name: str
    fields: Sequence[SchemaField]
    partition_by: Sequence[str] = field(default_factory=tuple)
    properties: Mapping[str, str] = field(default_factory=dict)

    def identifier(self, namespace: Tuple[str, ...]) -> Tuple[str, ...]:
        return (*namespace, self.name)

    def to_pyiceberg_schema(self) -> "Schema":
        try:
            from pyiceberg.schema import Schema  # type: ignore
        except ModuleNotFoundError as exc:  # pragma: no cover - optional dependency
            raise ModuleNotFoundError(
                "The 'pyiceberg' package is required to materialize Iceberg schemas. Install it via 'pip install pyiceberg'."
            ) from exc

        fields = [field.to_nested_field(idx) for idx, field in enumerate(self.fields, start=1)]
        return Schema(*fields)

    def to_pyiceberg_partition_spec(self, schema: "Schema") -> "PartitionSpec | None":
        if not self.partition_by:
            return None
        try:
            from pyiceberg.partitioning import PartitionField, PartitionSpec  # type: ignore
            from pyiceberg.transforms import IdentityTransform  # type: ignore
        except ModuleNotFoundError as exc:  # pragma: no cover - optional dependency
            raise ModuleNotFoundError(
                "The 'pyiceberg' package is required to materialize Iceberg schemas. Install it via 'pip install pyiceberg'."
            ) from exc

        fields: list[PartitionField] = []
        next_field_id = schema.highest_field_id + 1
        for offset, column in enumerate(self.partition_by):
            target = schema.find_field(column)
            if target is None:
                raise ValueError(f"Partition column '{column}' is not present in the schema for table '{self.name}'.")
            fields.append(
                PartitionField(
                    source_id=target.field_id,
                    field_id=next_field_id + offset,
                    transform=IdentityTransform(),
                    name=column,
                )
            )
        return PartitionSpec(*fields)

    def location(self, config: IcebergCatalogConfig, client_id: str) -> str:
        return config.table_location(client_id, self.name)


DEFAULT_TABLES: Tuple[IcebergTableSpec, ...] = (
    IcebergTableSpec(
        name="main",
        fields=(
            SchemaField("record_id", "string", required=True, doc="Stable identifier for the record."),
            SchemaField("source", "string", doc="System that produced the record."),
            SchemaField("payload", "string", doc="Raw JSON payload ingested from the source system."),
            SchemaField("ingested_at", "timestamptz", doc="Timestamp when the record reached the warehouse."),
            SchemaField("ingested_date", "date", doc="Calendar date derived from ingested_at for filtering."),
        ),
        partition_by=("ingested_date",),
        properties={
            "write.format.default": "parquet",
            "write.target-file-size-bytes": str(512 * 1024 * 1024),
        },
    ),
    IcebergTableSpec(
        name="events",
        fields=(
            SchemaField("event_id", "string", required=True, doc="Unique identifier for the event."),
            SchemaField("event_type", "string", doc="Logical type or category for the event."),
            SchemaField("occurred_at", "timestamptz", doc="When the event took place according to the producer."),
            SchemaField("ingested_at", "timestamptz", doc="Ingestion timestamp assigned by the pipeline."),
            SchemaField("properties", "string", doc="Semi-structured JSON payload for event attributes."),
        ),
        partition_by=("occurred_at",),
        properties={
            "write.format.default": "parquet",
        },
    ),
    IcebergTableSpec(
        name="metrics",
        fields=(
            SchemaField("metric_id", "string", required=True, doc="Identifier for the metric sample."),
            SchemaField("metric_name", "string", doc="Human-friendly metric name."),
            SchemaField("metric_value", "double", doc="Numeric value captured for the metric."),
            SchemaField("captured_at", "timestamptz", doc="Time when the metric was captured."),
            SchemaField("dimensions", "string", doc="JSON object describing metric dimensions or tags."),
        ),
        partition_by=("captured_at",),
        properties={
            "write.format.default": "parquet",
        },
    ),
)


def _parse_decimal(spec: str) -> Tuple[int, int]:
    start = spec.find("(")
    end = spec.find(")")
    if start == -1 or end == -1 or end < start:
        raise ValueError(f"Decimal specification '{spec}' must look like decimal(precision,scale)")
    precision_scale = spec[start + 1 : end]
    precision_str, _, scale_str = precision_scale.partition(",")
    try:
        precision = int(precision_str.strip())
        scale = int(scale_str.strip())
    except ValueError as exc:  # pragma: no cover - defensive programming
        raise ValueError(f"Invalid decimal precision/scale in '{spec}'.") from exc
    return precision, scale

