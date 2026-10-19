---
title: Observability & dashboards
description: Metrics, actuator endpoints and dashboards for dedup4j.
category: Guides
order: 7
---
# Observability & dashboards

--8<-- "not-on-central.md"

Deduplication makes a claim — *you are storing less* — and a claim worth making
is worth measuring. dedup4j exposes metrics, optional management endpoints, and
two different dashboards for two different jobs.

## Metrics

Registered against Micrometer, so they reach whatever backend your application
already uses.

| Metric | Meaning |
|---|---|
| `dedup4j.uploads` | completed uploads; incremented only after the transaction commits, so failed uploads are not counted |
| `dedup4j.duplicates` | stores that matched existing content |
| `dedup4j.storage.writes` | writes that actually reached the object store |
| `dedup4j.skipped.physical.writes` | completed uploads where this request performed no storage write |
| `dedup4j.bytes.accepted` | bytes submitted |
| `dedup4j.bytes.avoided` | **bytes not stored because of deduplication** |
| `dedup4j.hashing` | content hashing timing |
| `dedup4j.storage.delete.failures` | deletions that failed |
| `dedup4j.repairs` | reconciliation repairs applied |

> [!TIP]
> **The two that justify the library**
>
> `dedup4j.bytes.avoided` against `dedup4j.bytes.accepted` is the dedup
> ratio — the number to put on a dashboard.

> [!WARNING]
> **Watch `dedup4j.storage.delete.failures`**
>
> A failed delete means the reference count reached zero but the object
> survived: bytes you are paying for that nothing points at. Nothing retries
> it automatically. Non-zero here is a cleanup backlog, and it only grows.

## Upload history

Micrometer counters live in one process and reset when it restarts. For
numbers that survive restarts, dedup4j keeps an append-only upload history in
your application's database. It is on by default.

- **All-time totals per application dataset.** Uploads, duplicates, physical
  writes, logical bytes and storage avoided belong to the dataset (`datasetId`),
  not to a process. Restarts do not reset them, and replicas sharing a
  database report the same totals.
- **Totals start at zero on upgrade.** There is no backfill from existing
  content.
- **Failures are persisted.** Failed uploads and failed physical deletes are
  recorded and shown under "Recent failures" in the management endpoint and
  both dashboards. Failed uploads are never counted in the totals.

**Storage avoided** is the number to quote. It is the bytes that did not become
an additional stored copy: the sum of the sizes of duplicate outcomes. A
duplicate that lost an insert race still counts, even though its bytes were
sent to storage once, because the same key was overwritten rather than
duplicated. It measures capacity saved, not upload traffic saved.

> [!WARNING]
> **PostgreSQL and H2 only**
>
> The history is enforced append-only by the database, which dedup4j
> implements for PostgreSQL and H2. On any other database startup fails unless
> you set `dedup4j.history.enabled=false`. With history disabled the totals
> fall back to counters **since application start**, and the dashboards say so.
> See [Configuration properties](../reference/configuration.md#upload-history).

## Management endpoints

Add `dedup4j-spring-boot-management` and opt in:

```yaml
dedup4j:
  management:
    enabled: true              # default: false
    base-path: /dedup4j/management
    instance-name: orders-api
```

| Property | Default |
|---|---|
| `enabled` | `false` — opt in deliberately |
| `base-path` | `/dedup4j/management` |
| `instance-name` | `dedup4j` |
| `instance-id` | a random UUID per application start, the same id history rows use unless `dedup4j.history.instance-id` is set |

`/metrics` now reports `datasetId`, `totalsScope` (`all-time` or
`since-start`) and `physicalWrites` alongside the existing totals, and `/info`
reports `datasetId`.

`/failures` has two modes:

| Request | Returns |
|---|---|
| `?since=` | Newest first, for display |
| `?afterSequence=&limit=` | Ascending by sequence number, for ingestion. `limit` defaults to 100, maximum 500 |

> [!CAUTION]
> **These endpoints are not secured by dedup4j**
>
> Enabling them mounts routes in your application. dedup4j does not
> authenticate them — that is your `SecurityFilterChain`'s job, and it does
> not know they exist unless you say so.
>
> Defaulting to `false` exists so nobody publishes them by accident.

## Embedded dashboard

`dedup4j-spring-boot-dashboard` serves a read-only view inside your
application.

```yaml
dedup4j:
  dashboard:
    enabled: true                  # default: true when the module is present
    base-path: /dedup4j/dashboard
    failure-lookback: 7d
```

Note the default: **`enabled` is `true`**. Adding the dependency is the
decision; the property is how you turn it back off. Same security caveat as
above — read-only means it will not change your data, not that it is safe to
expose.

The embedded dashboard shows the history totals and the persisted failures
even when the management endpoints are disabled. A caption under the headline
number says whether the totals are *all time* or *since application start*.

`failure-lookback` bounds how far back the failure view reads. Longer windows
mean heavier queries.

### The aggregate starter

`dedup4j-spring-boot-observability` pulls in management and the embedded
dashboard together, for when you want both and would rather not list both.
It is an aggregate starter: it carries no code of its own, only dependencies.

See [Installation](../getting-started/installation.md) for its coordinates.

## Standalone dashboard

`dedup4j-dashboard` is a **separate executable application**, not a library.
It polls the management endpoints of one or more running applications and
shows them in one place.

Use the embedded dashboard to look at *one* application. Use the standalone
one to watch a fleet.

It is distributed as an executable JAR on
[GitHub Releases](https://github.com/heyEdem/dedup4j/releases) and is
deliberately **not** published to Maven Central. Do not add it as a
dependency.

```bash
java -jar dedup4j-dashboard.jar
```

### It binds to loopback on purpose

> [!CAUTION]
> **The security boundary is `127.0.0.1`, and that is all of it**
>
> The standalone dashboard binds to `127.0.0.1` by default. It has **no
> authentication and no authorization**. Its entire security model is that
> nothing outside the machine can reach it.
>
> Changing `server.address` to `0.0.0.0` removes that boundary and replaces
> it with nothing. If you need remote access, tunnel to it (`ssh -L`) or put
> an authenticating reverse proxy in front. Do not simply rebind it.

It keeps its own SQLite database for polled history and does not write to your
application's database.

With upload history in place the dashboard:

- **counts each dataset once**, so replicas sharing a database are not added
  together. They show a "shared dataset" badge;
- **starts from a zero baseline** after a dashboard restart, rather than
  re-adding all-time totals as new activity;
- **ingests failures per dataset** through a cursor over `afterSequence`,
  attributed to the instance where each happened;
- captions the headline as *all time*, *since application start*, or *some
  datasets since application start* when the two are mixed;
- treats an older instance that reports no `datasetId` as its own dataset.

> [!WARNING]
> **Upgrade the standalone dashboard before, or together with, the applications**
>
> An older dashboard polling upgraded applications multiplies trends by the
> replica count and, after each dashboard restart, re-adds the all-time totals
> as a single delta.

### Registration

An application can announce itself to a standalone dashboard:

```yaml
dedup4j:
  dashboard-registration:
    enabled: true
    dashboard-url: http://localhost:8080
    advertised-url: http://orders-api.internal:8080
    instance-name: orders-api
```

`advertised-url` is how the dashboard reaches *back*, which is not always the
address the application sees for itself behind a proxy or in a container.

## Choosing

| You want | Use |
|---|---|
| Metrics in your existing monitoring | Micrometer metrics — nothing extra |
| A quick look at one application | embedded dashboard |
| One view across several applications | standalone dashboard |
| Both endpoints and embedded UI | `dedup4j-spring-boot-observability` |

## Next

- [Configuration properties](../reference/configuration.md) — every key
- [Retrieval, retain & release](lifecycle.md) — what drift means
- [Troubleshooting](../reference/troubleshooting.md) — reading the failure signals
