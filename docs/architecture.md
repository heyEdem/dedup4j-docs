# Architecture & limitations

--8<-- "not-on-central.md"

What dedup4j is, how it is put together, and — more usefully — what it does
not promise.

## The idea

Content is identified by its bytes, not by its name. Two uploads with the same
bytes are the same content, stored once.

```text
your application                    dedup4j
────────────────────────────────────────────────────────────
Attachment #1 ──┐
Attachment #2 ──┼──► assetContentId ──► one row  ──► one object
Document   #7 ──┘      refCount: 3      (your DB)   (your store)
```

dedup4j owns the row and the object. **Your application owns the meaning** —
which user uploaded it, who may read it, what it is for. dedup4j deliberately
knows none of that.

## Content identity

Identity is `(algorithm, hash, sizeBytes)` — SHA-256 plus the byte count.

Not the filename, content type, metadata, uploader, or timestamp. Rename a
file and it is the same content. Change one byte and it is different content.

This is what makes deduplication safe to do automatically: identity is a
property of the data, not a claim by the caller.

## Modules

| Module | Responsibility |
|---|---|
| `dedup4j-core` | Content identity, contracts, the storage SPI. No Spring |
| `dedup4j-jpa` | Metadata entities and repositories |
| `dedup4j-storage-local` | Filesystem adapter |
| `dedup4j-storage-s3` | S3 and S3-compatible adapter |
| `dedup4j-storage-azure` | Azure Blob Storage adapter |
| `dedup4j-spring-boot-starter` | Auto-configuration, the facade, dedup logic |
| `dedup4j-spring-boot-management` | Management endpoints |
| `dedup4j-spring-boot-dashboard` | Embedded read-only dashboard |
| `dedup4j-spring-boot-observability` | Aggregate starter, dependencies only |
| `dedup4j-dashboard` | Standalone fleet dashboard application |

Dependencies point inward. `dedup4j-core` depends on no cloud SDK and no
Spring; each storage adapter depends only on core and its own SDK. You can
implement `BlobStorage` without inheriting anything else.

## Transaction ownership

**dedup4j does not own transactions. You do.**

It binds to your `DataSource`, and its writes join whatever transaction is
active. A dedup4j metadata write and your own write can commit or roll back
together.

`retain` and `release` take a pessimistic row lock held for the caller's
transaction, so concurrent operations on the same content serialise instead of
racing.

## The limit that matters: two systems, one operation

!!! danger "The database and the object store cannot commit together"
    A store touches an object store and a database. There is no shared
    transaction, and dedup4j does not implement a distributed one.

### What that means in practice

The write order is deliberate: **object store first, database second.**

```text
1. hash the content
2. look for existing content by identity
3. if new: write the object      ← object store
4. then: write the metadata row  ← database
```

A crash between steps 3 and 4 leaves bytes in the object store with no row
pointing at them. That is **wasted storage, not corruption** — the reverse
ordering would leave a row referencing an object that does not exist, and
every download of it would fail.

The failure mode was chosen. Orphaned bytes cost money and can be reconciled;
a dangling reference is a broken user-facing feature.

### Deletion has the same seam

The final `release` deletes the object and decrements the row in one
transaction. If that transaction rolls back **after** the delete, the row
returns and the bytes do not — see
[Retrieval, retain & release](guides/lifecycle.md#what-happens-at-zero).

Watch `dedup4j.storage.delete.failures`; nothing retries it.

## Concurrency

Two concurrent uploads of the same *new* content can both reach step 3. Both
write the same object key — which is safe, because the key derives from
content identity, so they write identical bytes to the same place.

At step 4 the database resolves it: one creates the row, the other retains the
existing one, enforced by a unique constraint on content identity.

This is why `ObjectKeyStrategy` must be deterministic. A strategy with
randomness in it turns a harmless duplicate write into two divergent objects.

## What dedup4j does not do

| Not provided | Why |
|---|---|
| Presigned URLs | Authorization is your model, not dedup4j's |
| Access control | It does not know your users |
| Virus scanning, transcoding, thumbnails | Out of scope; bytes are stored as given |
| Cross-system atomicity | Two systems, no shared transaction |
| Multi-region replication | Your object store's job |
| Automatic orphan cleanup | Reconciliation reports; repair is opt-in |

## Known limitations

- **Content is read into memory to hash it.** `max-upload-size` defaults to
  25 MB. Large files are a memory decision, not just a policy one.
- **The local provider assumes one node**, or a shared mount.
- **Reference counts can drift** from your records after a crash or a manual
  database edit. Reconciliation finds drift; it does not prevent it.
- **Four configuration properties bind but are never read.** See
  [Configuration properties](reference/configuration.md).
- **Deletion at zero is unconditional** and cannot currently be disabled.

## Design records

Decisions and their reasoning live in the repository rather than on this site:
the upload facade and batch behaviour, provider configuration, the single
generic starter, and Spring Boot auto-wiring.

## Next

- [Public API](reference/api.md)
- [Retrieval, retain & release](guides/lifecycle.md)
- [Contributing](contributing.md)
