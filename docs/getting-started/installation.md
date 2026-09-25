# Installation

--8<-- "not-on-central.md"

## Requirements

--8<-- "coordinates.md"

dedup4j is built and tested against Spring Boot 4.1.1. That is a narrower
promise than "compatible with every 4.1.x patch", and only the tested claim is
published.

You also need, in your own application:

- a configured `DataSource` — dedup4j reuses it rather than opening its own
- a storage location: a filesystem directory, an S3 bucket, or an Azure
  container

## Add the starter

Most applications need exactly one dependency.

=== "Maven"

    --8<-- "dep-maven.md"

=== "Gradle"

    --8<-- "dep-gradle.md"

The starter transitively brings in the core contracts, the JPA metadata layer,
and all three storage adapters. Which adapter activates is decided by
configuration, not by which dependency you selected — see
[Storage providers](../guides/providers.md).

!!! tip "One starter, every provider"
    An unselected provider must never construct a client or resolve
    credentials. Adding the starter does not mean your application tries to
    reach AWS.

## Which artifact do I need?

| If you want | Add |
|---|---|
| Deduplicated storage in a Spring Boot app | `dedup4j-spring-boot-starter` |
| The above, plus metrics and an embedded dashboard | `dedup4j-spring-boot-observability` |
| To build a storage adapter without Spring | `dedup4j-core` |

`dedup4j-spring-boot-observability` is an aggregate starter: it pulls in the
management endpoints and the embedded dashboard together. It does not replace
the main starter's role — see [Observability & dashboards](../guides/observability.md).

## Published artifacts

Ten components publish to Maven Central as one release train at one version.

| Artifact | Type | Contains |
|---|---|---|
| `dedup4j` | parent POM | properties, dependency management, build config |
| `dedup4j-core` | library | content identity, dedup contracts, storage SPI |
| `dedup4j-jpa` | library | metadata entities and repositories |
| `dedup4j-storage-local` | library | local filesystem adapter |
| `dedup4j-storage-s3` | library | AWS S3 / S3-compatible adapter |
| `dedup4j-storage-azure` | library | Azure Blob Storage adapter |
| `dedup4j-spring-boot-starter` | starter | auto-configuration, the facade, all providers |
| `dedup4j-spring-boot-management` | library | management API and metrics endpoints |
| `dedup4j-spring-boot-dashboard` | library | embedded read-only dashboard resources |
| `dedup4j-spring-boot-observability` | aggregate starter | management + embedded dashboard |

You normally depend on the starter and let it resolve the rest. The table is
here so that a coordinate you see in a dependency tree is identifiable.

### Not on Maven Central

`dedup4j-dashboard` is a **standalone executable application**, not a library.
It ships as an executable JAR on
[GitHub Releases](https://github.com/heyEdem/dedup4j/releases) and is
deliberately excluded from Maven Central — publishing a fat executable as a
library artifact would be a mistake that could not be undone.

Do not add it as a dependency. See
[Observability & dashboards](../guides/observability.md) for the difference
between the embedded and standalone dashboards.

## Verify the wiring

With the starter on the classpath and a provider configured, the application
context should start and expose the facade as a bean. If it does not, the cause
is almost always a missing provider selection or an unreachable `DataSource` —
[Troubleshooting](../reference/troubleshooting.md) lists the specific failures
and what each one means.

Next: [Quick start](quick-start.md) walks through a first deduplicated upload
against the local provider.
