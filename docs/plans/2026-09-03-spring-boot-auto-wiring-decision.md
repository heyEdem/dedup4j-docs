# Spring Boot Auto-wiring and Metadata Persistence Decision

**Status:** Accepted  
**Date:** 2026-09-03  
**Project:** Blob Helper

## Decision

The Blob Helper Spring Boot starter will reuse the consuming application's existing `DataSource`, JPA `EntityManager`, and transaction manager by default.

The starter will conditionally auto-configure the standard storage adapter, content hasher, object-key strategy, JPA collaborators, metrics facade, transactional boundary, and deduplication service. A normal consumer should not need a custom `GeneralConfig` class. Each default remains replaceable through an application-provided bean.

## Metadata database

Blob Helper metadata will be stored in the consuming application's database. This gives all application instances one authoritative content identity and reference count, and reuses the application's database availability, security, backup, and operational model.

Blob Helper will automatically register its JPA entity mappings. Its tables will use a clear prefix, such as `blob_helper_asset_content`, to avoid collisions with application-owned tables.

## Schema initialization

Blob Helper owns and ships versioned schema definitions, validates the expected schema during startup, and reports actionable errors when required tables are missing.

The `blob-helper.persistence.initialize-schema` property supports:

- `embedded` — default; automatically initialize supported embedded development databases.
- `always` — explicitly authorize Blob Helper to install or update its tables in the configured application database.
- `never` — do not mutate the schema; the application applies Blob Helper's packaged migrations using Flyway, Liquibase, or its normal deployment process.

An external production database must not be modified implicitly unless the application selects `always`.

## SQLite

A private SQLite database is not the default upload-metadata store. Per-instance database files would fragment content identities and reference counts across horizontally scaled application instances and introduce separate transaction, persistence, backup, and container-volume concerns.

SQLite is deferred as an optional future metadata adapter for local tools, applications without an existing database, and deployments explicitly constrained to a single instance. This does not affect the standalone dashboard's existing SQLite use because the dashboard is designed as one local monitoring process with its own history.

## Consequences

- Standard consumers reuse their existing Spring/JPA infrastructure.
- Internal Blob Helper beans and transaction boundaries remain hidden behind auto-configuration.
- Advanced consumers can override individual defaults without replacing the full configuration graph.
- Production teams retain explicit control over schema mutation.
- Versioned schema artifacts become part of Blob Helper's release compatibility contract.
