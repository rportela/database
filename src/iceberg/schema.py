"""Schema management utilities for Iceberg tables."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence, Tuple, TYPE_CHECKING

from .tables import SchemaField

if TYPE_CHECKING:  # pragma: no cover - typing only
    from pyiceberg.catalog import Catalog
    from pyiceberg.table import Table


class SchemaEvolutionError(RuntimeError):
    """Raised when schema evolution cannot be completed safely."""


@dataclass
class SchemaEvolutionManager:
    """Orchestrate safe schema changes for Iceberg tables."""

    catalog: "Catalog"
    table_identifier: Tuple[str, ...]

    def add_columns_if_missing(self, columns: Sequence[SchemaField]) -> Tuple[str, ...]:
        """Add non-breaking columns to the table schema."""

        if not columns:
            return tuple()

        table = self._load_table()
        schema = table.schema()
        update = table.update_schema()

        added: list[str] = []
        for column in columns:
            if column.required:
                raise SchemaEvolutionError(
                    f"Refusing to add required column '{column.dotted_path()}'. Iceberg can only add optional columns safely."
                )
            if schema.find_field(column.dotted_path()) is not None:
                continue
            parent = column.parent if column.parent else ()
            try:
                iceberg_type = column.to_iceberg_type()
            except ModuleNotFoundError as exc:  # pragma: no cover - optional dependency
                raise SchemaEvolutionError(
                    "The 'pyiceberg' package is required to evolve table schemas. Install it via 'pip install pyiceberg'."
                ) from exc
            update.add_column(parent, column.name, iceberg_type, doc=column.doc)
            added.append(column.dotted_path())

        if added:
            update.commit()
            table.refresh()
        return tuple(added)

    def _load_table(self) -> "Table":
        try:
            return self.catalog.load_table(self.table_identifier)
        except Exception as exc:  # pragma: no cover - propagate informative error
            raise SchemaEvolutionError(
                f"Unable to load table '{'.'.join(self.table_identifier)}' for schema evolution."
            ) from exc
