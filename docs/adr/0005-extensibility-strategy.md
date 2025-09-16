# ADR 0005: Design for Pluggable Storage, Catalog, and Query Engines

- **Status:** Accepted
- **Date:** 2024-05-24

## Context
Phase 0 prioritizes GCP (GCS, Firebase, DuckDB), but enterprise requirements demand future support for AWS/Azure storage, alternate catalogs (Glue, Snowflake, Unity), and additional query engines (Trino, BigQuery, Snowflake). Refactoring the control or data plane for every integration would be costly and risky.

## Decision
Establish clear abstraction boundaries for storage access, catalog operations, and query execution. Implement internal interfaces (e.g., `ObjectStore`, `CatalogClient`, `QueryEngine`) with DuckDB + GCS as the default adapters. Document extension points and enforce compatibility through contract tests so that new providers can plug in without API changes.

## Consequences
- **Positive:**
  - Simplifies onboarding new cloud providers and enterprise requirements.
  - Enables gradual rollout/testing of alternative engines by swapping adapters behind feature flags.
  - Supports hybrid deployments where control plane remains constant while data plane is region-specific.
- **Negative:**
  - Requires upfront investment in designing interfaces and dependency inversion.
  - Potential performance overhead if abstractions are not carefully tuned.
- **Follow-up:** Create a reference implementation for a second object store (e.g., MinIO/S3) during later phases to validate portability assumptions.
