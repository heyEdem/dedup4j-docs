# Troubleshooting

--8<-- "not-on-central.md"

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

!!! note "One exception sits outside the hierarchy"
    `DuplicateContentIdentityException` extends `RuntimeException` directly,
    not `Dedup4jException`. A blanket `catch (Dedup4jException)` will not
    catch it.

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

### `dedup4j schema table 'dedup4j_asset_content' is missing`

The schema was never created. Almost always this:

```yaml
dedup4j:
  persistence:
    initialize-schema: embedded    # the default
```

`embedded` creates the schema **only** for embedded databases. Against
Postgres or MySQL it creates nothing.

Pick one:

| | |
|---|---|
| Development | `initialize-schema: always` |
| Production | `initialize-schema: never` and apply the schema with your own migration tool |

Production schema changes belong to your migration pipeline, not to a library.

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

!!! tip "Surfaced, not swallowed"
    This throws rather than silently clamping at zero, because a count that
    disagrees with your records is a bug you want to find.

## Operational signals

### `dedup4j.storage.delete.failures` is non-zero

A reference count reached zero but the object was not deleted. Those bytes are
now unreferenced and still billed.

**Nothing retries this automatically.** The metric only grows. Investigate
storage permissions and reconcile.

### Reference counts disagree with your records

Use `ReconciliationService` — but note it is **not auto-configured**, so you
construct it yourself, and repair is off unless explicitly enabled. See
[Reconciliation](../guides/lifecycle.md#reconciliation).

Read a report before enabling repair. Automatic repair against a faulty
`LogicalReferenceCountSource` corrupts correct counts at speed.

## Configuration that appears to do nothing

Some properties bind and are never read. Setting them has no effect:

- `dedup4j.deduplication.hash-algorithm`
- `dedup4j.deduplication.strict-content-type-validation`
- `dedup4j.cleanup.delete-physical-on-zero-references`
- `dedup4j.cleanup.reconciliation-enabled`

See [Configuration properties](configuration.md). If you set one of these and
nothing changed, the property is the problem, not your configuration.

## Still stuck

- [Configuration properties](configuration.md) — defaults and what is honoured
- [Architecture & limitations](../architecture.md) — what is out of scope by design
- [Issues](https://github.com/heyEdem/dedup4j/issues)
