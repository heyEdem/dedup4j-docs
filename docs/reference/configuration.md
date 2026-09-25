# Configuration properties

--8<-- "not-on-central.md"

Every `dedup4j.*` property, its default, and whether it is honoured. Defaults
are read from the property classes, not from documentation.

!!! warning "Some properties bind but do nothing"
    Three properties are accepted by Spring, appear in IDE completion, and are
    **never read by the library**. They are marked **inert** below. Setting
    them has no effect.

## Storage

`dedup4j.storage.*`

| Property | Default | Notes |
|---|---|---|
| `provider` | *none* | **Required.** `local`, `s3`, or `azure` |
| `key-prefix` | `""` | Prefix applied to every object key |

`provider` has no default. Omit it and no storage adapter is configured.

### Local

`dedup4j.storage.local.*`

| Property | Default | Notes |
|---|---|---|
| `root-directory` | `blob-helper-storage` | Directory holding stored blobs |

!!! note "The default still carries the old name"
    `root-directory` defaults to `blob-helper-storage`, a leftover from before
    the library was renamed. Set it explicitly rather than relying on it.

### S3

`dedup4j.storage.s3.*`

| Property | Default | Notes |
|---|---|---|
| `bucket` | *none* | **Required** when `provider=s3` |
| `region` | *none* | AWS region |
| `endpoint` | *none* | Custom endpoint for S3-compatible stores |
| `path-style` | `false` | `true` for MinIO and most S3-compatible stores |

No credentials property exists. The AWS default credential provider chain is
used — see [Storage providers](../guides/providers.md#credentials).

### Azure

`dedup4j.storage.azure.*`

| Property | Default | Notes |
|---|---|---|
| `container` | *none* | **Required** when `provider=azure` |
| `account-name` | *none* | Storage account name |
| `endpoint` | *none* | Custom endpoint, e.g. Azurite |
| `connection-string` | *none* | **Development only** — embeds an account key |

## Persistence

`dedup4j.persistence.*`

| Property | Default | Notes |
|---|---|---|
| `initialize-schema` | `embedded` | `embedded`, `always`, or `never` |

`embedded` initialises the schema **only** when the `DataSource` is an embedded
database. Against Postgres or MySQL it creates nothing. See
[Spring Boot integration](../guides/spring-boot.md#schema-initialisation).

## Deduplication

`dedup4j.deduplication.*`

| Property | Default | Notes |
|---|---|---|
| `max-upload-size` | `25MB` | **Honoured.** Larger uploads are rejected |
| `hash-algorithm` | `SHA-256` | **Inert.** A SHA-256 hasher is constructed unconditionally |
| `strict-content-type-validation` | `false` | **Inert.** No code reads it |

!!! warning "Content is read into memory to be hashed"
    Raising `max-upload-size` raises peak memory per concurrent upload. Size
    it against your heap and your concurrency, not against your largest file.

## Cleanup

`dedup4j.cleanup.*`

| Property | Default | Notes |
|---|---|---|
| `delete-physical-on-zero-references` | `true` | **Inert.** Deletion at zero is unconditional |
| `reconciliation-enabled` | `false` | **Inert.** `ReconciliationService` is not auto-configured |

!!! danger "Do not rely on these to protect content"
    Setting `delete-physical-on-zero-references: false` does **not** stop
    deletion. The final `release` deletes the object regardless. See
    [Retrieval, retain & release](../guides/lifecycle.md#what-happens-at-zero).

## Management

`dedup4j.management.*` — requires `dedup4j-spring-boot-management`.

| Property | Default | Notes |
|---|---|---|
| `enabled` | `false` | Opt in deliberately |
| `base-path` | `/dedup4j/management` | Mount point |
| `instance-name` | `dedup4j` | Label for this instance |
| `instance-id` | random UUID | Regenerated on every restart |

## Embedded dashboard

`dedup4j.dashboard.*` — requires `dedup4j-spring-boot-dashboard`.

| Property | Default | Notes |
|---|---|---|
| `enabled` | `true` | On by default when the module is present |
| `base-path` | `/dedup4j/dashboard` | Mount point |
| `failure-lookback` | `7d` | How far back the failure view reads |

## Dashboard registration

`dedup4j.dashboard-registration.*` — announces this instance to a standalone
dashboard.

| Property | Default | Notes |
|---|---|---|
| `enabled` | `false` | |
| `dashboard-url` | *none* | Where the standalone dashboard is |
| `advertised-url` | *none* | How the dashboard reaches back to this instance |
| `instance-name` | `dedup4j` | |
| `instance-id` | *none* | |

## Standalone dashboard

The standalone application is configured independently, not through
`dedup4j.*` in your application.

| Property | Default | Notes |
|---|---|---|
| `server.address` | `127.0.0.1` | **Its entire security boundary** |
| `dedup4j.dashboard.database-path` | `./blob-helper-dashboard.sqlite` | Its own SQLite file; name predates the rename |

!!! danger "Changing `server.address` removes the only protection"
    The standalone dashboard has no authentication. See
    [Observability & dashboards](../guides/observability.md#it-binds-to-loopback-on-purpose).

## Minimal working configuration

```yaml
spring:
  datasource:
    url: jdbc:h2:mem:app

dedup4j:
  storage:
    provider: local
    local:
      root-directory: ./dedup4j-storage
```

For production, add a real datasource, set `initialize-schema: never`, and
manage the schema with your migration tool.
