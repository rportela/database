# ADR 0002: Embed DuckDB as the Initial Query Engine

- **Status:** Accepted
- **Date:** 2024-05-24

## Context
We need a lightweight analytical query engine that can execute SQL against Iceberg tables with excellent performance for medium-scale workloads and low operational overhead. Early customers expect sub-second interactive queries and the ability to run the service in a serverless container without managing clusters.

## Decision
Adopt DuckDB as the embedded query engine powering the Query Engine Service. DuckDB will execute within a container (Cloud Run) and access Iceberg table data via parquet/Arrow readers. The service will expose a stable interface that abstracts the engine, allowing future additions like Trino, BigQuery, or Snowflake without changing the API surface.

## Consequences
- **Positive:**
  - Single-process execution enables fast startup and cost-efficient autoscaling.
  - Strong SQL coverage and vectorized execution deliver good performance for columnar workloads.
  - Extensive extensions ecosystem (HTTPFS, Arrow) aligns with Iceberg integration needs.
- **Negative:**
  - Limited concurrency per process; may require pooling or query queuing for heavy workloads.
  - Lacks distributed execution, so very large queries may need future offloading to Trino/Snowflake.
- **Follow-up:** Define engine interface contracts and benchmarking to guide future pluggable engine implementations.
