# ADR 0001: Adopt Apache Iceberg on Object Storage

- **Status:** Accepted
- **Date:** 2024-05-24

## Context
We require an open table format that supports transactional guarantees, schema evolution, and time travel over large analytic datasets while remaining cloud-agnostic. The data must live in commodity object storage (starting with Google Cloud Storage) and support future portability to S3 or Azure Blob without rewriting metadata.

## Decision
Use Apache Iceberg as the table format for the data plane. Iceberg will manage snapshot metadata, partition evolution, and ACID semantics over Parquet/ORC files stored in object storage. We will operate an Iceberg catalog (initially REST-based) backed by Firestore/GCS metadata and expose it to the query engine service.

## Consequences
- **Positive:**
  - Enables reliable multi-table transactions, rollback, and time-travel queries.
  - Supports schema evolution and hidden partitioning, easing client data onboarding.
  - Broad ecosystem support (Trino, Spark, Flink, Snowflake) simplifies future engine integrations.
- **Negative:**
  - Requires managing catalog services and metadata cleanup tasks.
  - Demands familiarity with Iceberg commit semantics to avoid write conflicts in concurrent workloads.
- **Follow-up:** Define lifecycle jobs to compact small files and expire snapshots to control storage costs.
