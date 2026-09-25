# Retrieval, retain & release

--8<-- "not-on-central.md"

Deduplication means one stored object can serve many of your records. That
raises a question the library has to answer: **when is content safe to
delete?** dedup4j answers it with reference counting.

## The model

dedup4j owns physical content. Your application owns meaning.

```text
your records                    dedup4j
─────────────────────────────────────────────────
Attachment  #1  ──┐
Attachment  #2  ──┼──►  assetContentId  ──►  one stored object
Document    #7  ──┘        refCount: 3
```

Three of your records, one copy of the bytes, one counter. The counter is
dedup4j's only knowledge of how many of your records exist.

## Retrieval

`BlobDeduplicationService` reads content back:

```java
try (BlobResource resource = blobs.get(assetContentId)) {
    resource.content();       // open InputStream — you close it
    resource.sizeBytes();
    resource.contentType();
    resource.metadata();
}
```

`BlobResource` implements `AutoCloseable` and holds an **open stream**. Use
try-with-resources; a leaked resource here is a leaked connection to your
object store.

For location without content:

```java
BlobLocation location = blobs.location(assetContentId);
location.storageProvider();
location.bucketOrContainer();
location.objectKey();
```

### Why there are no presigned URLs

!!! warning "dedup4j does not issue presigned URLs"
    Content streams through your application. There is no
    `getDownloadUrl(id)`.

This is a deliberate boundary, not a missing feature. A presigned URL is an
authorization decision — who may read this, for how long, under what audit
trail — and dedup4j does not know your authorization model. Issuing one on
your behalf would mean guessing it.

`location()` gives you everything needed to generate one with your provider's
SDK, at the point in your code where you *do* know who is asking.

The cost is real: streaming through the application uses application bandwidth
where a presigned URL would not. For large files behind an authorization
check, build the URL yourself from `location()`.

## Retain and release

```java
blobs.retain(assetContentId);    // +1
blobs.release(assetContentId);   // -1, deletes at zero
```

Both take a pessimistic row lock for the duration of the caller's transaction.
Two concurrent requests touching the same content serialise rather than race.

### What happens at zero

`release` decrements, and **when the count reaches zero it deletes the stored
object immediately**, within the same transaction as the decrement.

There is no grace period, no soft delete, and no background sweeper. A release
that takes the count to zero destroys the bytes.

!!! note "`dedup4j.cleanup.delete-physical-on-zero-references` does not change this"
    The property exists and binds, but nothing in the library reads it.
    Deletion at zero is currently unconditional. Do not rely on that property
    to keep bytes alive.

!!! danger "Rolling back does not restore the object"
    The delete goes to the object store, which has no transaction. If your
    transaction rolls back **after** the delete, the database row returns and
    the bytes do not.

    This is the same non-atomicity described in
    [Architecture & limitations](../architecture.md), seen from the deletion
    side.

### Under-release is rejected

Releasing content already at zero throws `ReferenceCountUnderflowException`
rather than silently doing nothing. A count that has lost track of reality is
a bug worth surfacing.

### The rule

**Every logical reference needs exactly one count.**

`store` already handles the common case: new content is created at a count of
one, and a duplicate store retains the existing content. So **one `store` = one
reference**, needing one `release` when that record goes away.

Call `retain` only when you create a record pointing at content you did **not**
just store — copying an existing attachment onto a second document, for
example.

| You did | Then |
|---|---|
| `store` (new or duplicate) | already counted — just `release` later |
| Added a record without storing | `retain` now, `release` later |
| Deleted a record | `release` |

Count too low and content is deleted while records still point at it. Count too
high and content accumulates that nothing will ever collect.

## Reconciliation

Counts drift. A crash between your write and your `retain`, a bug, a manual
database fix — and dedup4j's count no longer matches your records.

`ReconciliationService` compares the two.

!!! warning "Not auto-configured"
    Unlike `BlobStore` and `BlobDeduplicationService`, the starter does **not**
    register a `ReconciliationService` bean. You construct it yourself, which
    is also where you decide whether repair is enabled.

```java
@Bean
ReconciliationService reconciliationService(
        AssetContentRepository repository,
        ReferenceCountService referenceCountService) {
    return new ReconciliationService(repository, referenceCountService, false);
    //                                            repair enabled ─────┘
}
```

```java
ReconciliationReport report = reconciliationService.reconcile(source);
report.checkedContentCount();
report.mismatches();
```

You supply a `LogicalReferenceCountSource` — dedup4j cannot enumerate your
records, so you tell it what the counts *should* be.

!!! tip "Reporting is read-only by default"
    `reconcile` only reports. Repair is a separate operation, **disabled
    unless explicitly enabled** when the service is constructed.

    That default is deliberate: automatic repair against a faulty
    `LogicalReferenceCountSource` would corrupt correct counts at machine
    speed. Look at a report before enabling repair.

When repair is enabled, adjustments go through the same lock-aware
reference-count service, and the caller must keep a transaction open for the
duration.

## Next

- [Uploading & deduplication](uploading.md) — the store side
- [Observability & dashboards](observability.md) — watching counts and drift
- [Architecture & limitations](../architecture.md) — why atomicity is not offered
