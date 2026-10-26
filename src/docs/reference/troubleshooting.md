---
title: Troubleshooting
description: Exceptions, failure modes and how to diagnose them.
category: Reference
order: 10
---
# Troubleshooting

What each failure means and what to do about it.

## Exception hierarchy

Everything dedup4j throws deliberately extends `Dedup4jException`, itself a
`RuntimeException`. Nothing is checked.

```text
RuntimeException
└── Dedup4jException
    ├── BlobValidationException          input is not acceptable
    ├── BlobStorageException             the object store failed
    ├── BlobHashingException             content could not be hashed
    ├── ContentNotFoundException         no such assetContentId
    └── ReferenceCountUnderflowException released below zero
```

Catch `Dedup4jException` to handle everything from the library at once.

> [!NOTE]
> **One exception sits outside the hierarchy**
>
> `DuplicateContentIdentityException` extends `RuntimeException` directly,
> not `Dedup4jException`. A blanket `catch (Dedup4jException)` will not
> catch it.

## Startup failures

### `dedup4j.storage.s3.bucket is required when provider=s3`

You selected S3 without a bucket. Same shape for Azure:
`dedup4j.storage.azure.container is required when provider=azure`.

```yaml
dedup4j:
  storage:
    provider: s3
    s3:
      bucket: my-bucket    # ← this
      region: eu-west-1
```

Failing at startup is deliberate — the alternative is discovering it on the
first upload in production.

### `connectionString or endpoint must be configured`

You selected Azure with `container` and `account-name` only. `account-name` is
not used in 0.1.0; set `endpoint` (with a SAS) or `connection-string`, or
declare your own `BlobContainerClient` bean. See
[Storage providers](../guides/providers.md#authentication).

### `dedup4j schema table 'dedup4j_asset_content' is missing`

The schema was never created. Almost always this:

```yaml
dedup4j:
  persistence:
    initialize-schema: embedded    # the default
```

`embedded` creates the schema **only** for embedded databases. Against an
external database it creates nothing.

Pick one:

| | |
|---|---|
| Development | `initialize-schema: always` |
| Production | `initialize-schema: never` and apply the schema with your own migration tool |

Production schema changes belong to your migration pipeline, not to a library.

### `dedup4j history requires PostgreSQL or H2, but the database is '<product>'`

The full message ends `Set dedup4j.history.enabled=false to run without
persistent history.` Upload history is on by default and is enforced
append-only by database triggers that exist only for PostgreSQL and H2. On any
other database, disable it:

```yaml
dedup4j:
  history:
    enabled: false
```

Totals then count since application start instead of all time.

### `dedup4j history tables are missing or incomplete`

The full message reads `... for initialize-schema mode '<mode>'. Apply
classpath:db/dedup4j/history/db.changelog-history.yaml, or set
dedup4j.history.enabled=false to run without persistent history.`

The history changelog runs automatically only with `initialize-schema:
always`, or `embedded` on an in-memory H2 database. On PostgreSQL, or an H2
file or server database, under `embedded` or `never`, apply the changelog
yourself. It tracks itself in `DEDUP4J_HISTORY_DATABASE_CHANGELOG` and
`DEDUP4J_HISTORY_DATABASE_CHANGELOG_LOCK`, separate from the asset changelog.

### `Invalid dedup4j.deduplication.allowed-content-types entry '<entry>'`

Each entry must be `type/subtype` or `type/*`. `*/*`, a bare type, an entry
with parameters, and a blank entry from a trailing comma are all rejected. To
allow every type, leave the property unset.

### `dedup4j.reconciliation.enabled=true requires one LogicalReferenceCountSource bean, or one marked @Primary, found N`

Scheduled reconciliation needs your counts. With `found 0`, register a
`LogicalReferenceCountSource` bean. With `found 2` or more, mark one
`@Primary` or remove the extras. See
[Scheduled reports](../guides/lifecycle.md#scheduled-reports).

### `dedup4j.reconciliation.enabled=true requires an EntityManagerFactory`

Scheduled runs read through their own shared `EntityManager`, built from your
`EntityManagerFactory`, so they never see stale rows. Expose the factory as a
bean, or make sure your `EntityManager` returns it. With several factories, mark
the one holding dedup4j's tables `@Primary`.

### `Invalid dedup4j.reconciliation.cron` / `zone`

`cron` is Spring's six-field format with seconds first: `0 0 3 * * *` is 03:00
every day. `zone` takes an ID such as `UTC` or `Africa/Accra`.
`mode=repair` also fails startup: scheduled runs only report.

### No `BlobStorage` bean

`dedup4j.storage.provider` is unset. It has no default — set it to `local`,
`s3`, or `azure`.

### Multiple `DataSource` beans

dedup4j binds to a single `DataSource` and cannot guess which. Mark one
`@Primary`.

## Upload failures

### `BlobValidationException: Declared size N does not match actual size M`

The `sizeBytes` you passed to the stream overload disagrees with the bytes
read. Content length is part of content identity, so dedup4j refuses rather
than storing content under a wrong identity.

### Upload rejected on size

`dedup4j.deduplication.max-upload-size` defaults to **25MB**.

```yaml
dedup4j:
  deduplication:
    max-upload-size: 100MB
```

Content is read into memory to be hashed, so raising this raises peak memory
per concurrent upload.

### `BlobValidationException: Content type '<type>' is not allowed`

`dedup4j.deduplication.allowed-content-types` is set, and the declared type is
not on it, is missing, or is not a valid `type/subtype`. Nothing was read or
stored. Check what your client sends. Browsers and `store(Path)` may send
`application/octet-stream` for unknown files.

### `BlobValidationException: Could not open upload source`

The `MultipartFile` or `Path` could not be read — a consumed stream, a
deleted temp file, a permissions problem. Not a dedup4j fault.

### `BlobStorageException`

The object store rejected the operation: credentials, permissions,
connectivity, a missing bucket or container. The cause carries the provider
SDK's own exception — read it.

For S3 there is no credentials property; the AWS default chain is used, so an
auth failure here means the chain found nothing usable. See
[Storage providers](../guides/providers.md#credentials).

### `BlobHashingException: Content hashing failed`

Reading the content for hashing failed mid-stream. Usually an underlying I/O
failure rather than a hashing problem.

## Lifecycle failures

### `ContentNotFoundException: Asset content not found: <uuid>`

No content for that `assetContentId`. Either the ID is wrong, or the content
was already released to zero and deleted.

### `ReferenceCountUnderflowException`

`release` was called on content already at zero. The count has lost track of
your records.

Common causes:

- releasing twice for the same record
- calling `retain` after a **duplicate** `store` — the store already counted,
  so the release pairing is off by one

Remember the rule: **one `store` = one reference**. `retain` is only for a
record created without a store call. See
[Retrieval, retain & release](../guides/lifecycle.md#the-rule).

> [!TIP]
> **Surfaced, not swallowed**
>
> This throws rather than silently clamping at zero, because a count that
> disagrees with your records is a bug you want to find.

## Operational signals

### `dedup4j.storage.delete.failures` is non-zero

A reference count reached zero but the object was not deleted. Those bytes are
now unreferenced and still billed.

**Nothing retries this automatically.** The metric only grows. Investigate
storage permissions and reconcile.

### Reference counts disagree with your records

To find drift on a schedule, set `dedup4j.reconciliation.enabled=true` and
register a `LogicalReferenceCountSource`; runs only report. To repair, use
`ReconciliationService` — it is **not auto-configured**, so you construct it
yourself, and repair is off unless explicitly enabled. See
[Reconciliation](../guides/lifecycle.md#reconciliation).

Read a report before enabling repair. Automatic repair against a faulty
`LogicalReferenceCountSource` corrupts correct counts at speed.

## A property you set had no effect

Check the spelling against [Configuration properties](configuration.md) —
Spring binds relaxed names, but an unrecognised key under `dedup4j.*` is
silently ignored rather than rejected.

Every property listed there is read by the library. If one appears to do
nothing, that is a bug worth reporting.

## Still stuck

- [Configuration properties](configuration.md) — defaults and what is honoured
- [Architecture & limitations](../architecture.md) — what is out of scope by design
- [Issues](https://github.com/heyEdem/dedup4j/issues)
