# Spring Boot integration

--8<-- "not-on-central.md"

The starter is designed to disappear: add the dependency, select a provider,
and the beans exist. This page explains what it wires so that when you need to
override something, you know what you are replacing.

## What gets auto-configured

`dedup4j-spring-boot-starter` contributes six auto-configuration classes:

| Auto-configuration | Activates when |
|---|---|
| `LocalBlobStorageAutoConfiguration` | `dedup4j.storage.provider=local` |
| `S3BlobStorageAutoConfiguration` | `dedup4j.storage.provider=s3` |
| `AzureBlobStorageAutoConfiguration` | `dedup4j.storage.provider=azure` |
| `Dedup4jPersistenceAutoConfiguration` | always — entities, repositories, schema |
| `Dedup4jServiceAutoConfiguration` | always — dedup logic and the facade |
| `Dedup4jAutoConfiguration` | always — shared configuration |

The three storage classes are mutually exclusive by `@ConditionalOnProperty`.
Exactly one activates, and the other two contribute nothing.

### The beans you can inject

```text
BlobStore                     ← the upload facade: store, storeAll
BlobDeduplicationService      ← retain, release, get, location
BlobStorage                   ← the selected provider adapter
```

And the collaborators behind them, each replaceable:

```text
AssetContentRepository        ← metadata persistence
AssetContentMutationService   ← row-level mutations
ReferenceCountService         ← retain/release counting
ContentHasher                 ← content identity
ObjectKeyStrategy             ← how object keys are derived
Dedup4jMetrics                ← instrumentation
```

## It reuses your DataSource

dedup4j does **not** open its own connection pool and does not want its own
database. It binds to the `DataSource` your application already defines.

Two consequences worth stating plainly:

- Its tables live in your schema, alongside your own.
- Its writes participate in Spring's transaction management, so a dedup4j
  write and your own write can share a transaction.

That second point is what makes the metadata side consistent. It is also
exactly the boundary that **cannot** extend to the object store — see
[Architecture & limitations](../architecture.md).

## Schema initialisation

```yaml
dedup4j:
  persistence:
    initialize-schema: embedded   # embedded | always | never
```

| Mode | Behaviour |
|---|---|
| `embedded` | **Default.** Creates the schema only when the `DataSource` is an embedded database |
| `always` | Creates the schema regardless of database |
| `never` | Creates nothing. You own the DDL |

!!! warning "`embedded` does not mean 'on'"
    The name describes *when* it acts, not that it is enabled. Pointing a
    default configuration at Postgres or MySQL creates **no tables**, and the
    first store fails on a missing table. That is intentional — silently
    running DDL against a production database is worse — but it surprises
    people.

For anything beyond development, prefer `never` and manage the schema with
your existing migration tool. A library should not be the thing that alters
your production schema.

## Overriding a bean

Every auto-configured bean is declared `@ConditionalOnMissingBean`. Define
your own of the same type and the starter steps aside.

```java
@Configuration
public class CustomObjectKeyConfiguration {

    @Bean
    ObjectKeyStrategy objectKeyStrategy() {
        return contentHash -> "tenant-a/" + contentHash.value();
    }
}
```

No property, no flag, no `exclude=`. Declare the bean and it wins.

To disable an auto-configuration entirely:

```java
@SpringBootApplication(exclude = S3BlobStorageAutoConfiguration.class)
```

Though selecting a different `provider` is almost always what you actually
want.

## Configuration shape

```yaml
dedup4j:
  storage:
    provider: local        # required — no default
    key-prefix: ""         # optional prefix on every object key
    local: { ... }
    s3: { ... }
    azure: { ... }
  persistence:
    initialize-schema: embedded
  deduplication: { ... }
  cleanup: { ... }
```

`provider` has no default. Omitting it means no storage adapter is
configured — see [Troubleshooting](../reference/troubleshooting.md).

Full key list: [Configuration properties](../reference/configuration.md).

## Next

- [Storage providers](providers.md) — configuring local, S3, Azure, or your own
- [Uploading & deduplication](uploading.md) — what the facade actually does
- [Observability & dashboards](observability.md) — metrics and endpoints
