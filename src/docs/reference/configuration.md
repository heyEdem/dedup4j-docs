---
title: Configuration properties
description: Every dedup4j configuration property and its default.
category: Reference
order: 8
---
# Configuration properties

--8<-- "not-on-central.md"

Every `dedup4j.*` property, its default, and whether it is honoured. Defaults
are read from the property classes, not from documentation.

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
| `root-directory` | `dedup4j-storage` | Directory holding stored blobs |

> [!TIP]
> **Set it explicitly anyway**
>
> Naming the directory in configuration makes the location obvious to the
> next person reading your config, and to anyone debugging where bytes went.

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
| `account-name` | *none* | Accepted but not used in 0.1.0 |
| `endpoint` | *none* | Service URL carrying a SAS, or Azurite. One of `endpoint` or `connection-string` is required |
| `connection-string` | *none* | Embeds an account key or SAS; keep it out of committed config |

## Persistence

`dedup4j.persistence.*`

| Property | Default | Notes |
|---|---|---|
| `initialize-schema` | `embedded` | `embedded`, `always`, or `never` |

`embedded` initialises the schema **only** when the `DataSource` is an embedded
database. Against any other database it creates nothing. See
[Spring Boot integration](../guides/spring-boot.md#schema-initialisation).

The upload-history changelog follows the same mode. Under `embedded`, both
changelogs run only on an in-memory H2 database (`jdbc:h2:mem:`), not on an H2
file or server database. See [Upload history](#upload-history).

## Upload history

`dedup4j.history.*`

| Property | Default | Notes |
|---|---|---|
| `enabled` | `true` | Durable append-only upload history. **PostgreSQL and H2 only** |
| `instance-id` | `dedup4j.management.instance-id`, then a random UUID per start | Attribution label on history rows; totals never group by it |

Any database other than PostgreSQL or H2 fails startup unless
`enabled: false`. With history disabled, totals are counted since application
start. The history changelog,
`classpath:db/dedup4j/history/db.changelog-history.yaml`, has its own tracking
tables (`DEDUP4J_HISTORY_DATABASE_CHANGELOG` and `_LOCK`). See
[Observability & dashboards](../guides/observability.md#upload-history).

## Deduplication

`dedup4j.deduplication.*`

| Property | Default | Notes |
|---|---|---|
| `max-upload-size` | `25MB` | Larger uploads are rejected |

> [!WARNING]
> **Content is read into memory to be hashed**
>
> Raising `max-upload-size` raises peak memory per concurrent upload. Size
> it against your heap and your concurrency, not against your largest file.

> [!NOTE]
> **Content identity is not configurable**
>
> The hash algorithm is fixed at SHA-256, and deletion at zero references is
> unconditional. Neither has a property, because neither is a choice the
> library offers.

## Management

`dedup4j.management.*` — requires `dedup4j-spring-boot-management`.

| Property | Default | Notes |
|---|---|---|
| `enabled` | `false` | Opt in deliberately |
| `base-path` | `/dedup4j/management` | Mount point |
| `instance-name` | `dedup4j` | Label for this instance |
| `instance-id` | random UUID | Regenerated on every restart; shared with history rows unless `dedup4j.history.instance-id` is set |

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
| `dedup4j.dashboard.database-path` | `./dedup4j-dashboard.sqlite` | Its own SQLite file, separate from your application database |

> [!CAUTION]
> **Changing `server.address` removes the only protection**
>
> The standalone dashboard has no authentication. See
> [Observability & dashboards](../guides/observability.md#it-binds-to-loopback-on-purpose).

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
