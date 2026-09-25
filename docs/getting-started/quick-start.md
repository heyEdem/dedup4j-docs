# Quick start

--8<-- "not-on-central.md"

Store a file, store the same bytes again and watch dedup4j recognise them,
read the content back, then retain and release the reference. Everything here
runs against the local filesystem provider and an embedded database — no cloud
account and no external services.

Assumes you have already added the starter from
[Installation](installation.md).

## 1. Configure

```yaml title="application.yaml"
spring:
  datasource:
    url: jdbc:h2:mem:quickstart
    driver-class-name: org.h2.Driver

dedup4j:
  storage:
    provider: local
    local:
      root-directory: ./dedup4j-storage
```

Two things are happening:

- `provider: local` selects the filesystem adapter. The S3 and Azure adapters
  are on the classpath but stay inert — they construct no client and resolve no
  credentials.
- The schema is created for you. `dedup4j.persistence.initialize-schema`
  defaults to `EMBEDDED`, which initialises the schema **only** when the
  `DataSource` is an embedded database. Against Postgres or MySQL nothing is
  created unless you set `ALWAYS`.

!!! note "Set the storage directory explicitly"
    `root-directory` has a default, but naming it in configuration makes the
    location obvious to the next person reading your config.

## 2. Inject the two beans

dedup4j exposes its operations through two types.

```java
import com.edem.dedup4j.facade.BlobStore;
import com.edem.dedup4j.service.BlobDeduplicationService;

@Service
public class AttachmentService {

    private final BlobStore blobStore;                  // store, storeAll
    private final BlobDeduplicationService blobs;       // retain, release, get

    public AttachmentService(BlobStore blobStore, BlobDeduplicationService blobs) {
        this.blobStore = blobStore;
        this.blobs = blobs;
    }
}
```

`BlobStore` is the upload front door. Lifecycle operations — reference
counting and retrieval — live on `BlobDeduplicationService`. Both are
auto-configured; neither needs a `@Bean` method from you.

## 3. Store something

```java
BlobReference ref = blobStore.store("hello dedup4j".getBytes(UTF_8),
                                    "greeting.txt",
                                    "text/plain");

ref.assetContentId();   // UUID — the handle you keep
ref.contentHash();      // content identity, derived from the bytes
ref.duplicate();        // false: these bytes were new
```

Keep `assetContentId()`. That UUID is what you store on your own record — an
`Attachment`, a `Document`, whatever your domain calls it. dedup4j owns the
physical content; your application owns the meaning.

## 4. Store the same bytes again

```java
BlobReference again = blobStore.store("hello dedup4j".getBytes(UTF_8),
                                      "a-different-name.txt",
                                      "text/plain");

again.duplicate();                                  // true
again.assetContentId().equals(ref.assetContentId()); // true
```

Same bytes, different filename — dedup4j recognises the content, stores nothing
new, and returns a reference to the copy that already exists. **The filename is
metadata, not identity.** Identity comes from the bytes.

This is the whole point of the library, and it is worth confirming in your own
project before building on it.

## 5. Read the content back

`BlobResource` holds an open `InputStream` and implements `AutoCloseable`, so
use try-with-resources.

```java
try (BlobResource resource = blobs.get(ref.assetContentId())) {
    String body = new String(resource.content().readAllBytes(), UTF_8);
    resource.sizeBytes();
    resource.contentType();
}
```

!!! warning "Not a presigned URL"
    This streams bytes through your application. dedup4j does not issue
    time-limited direct-to-storage URLs — see
    [Retrieval, retain & release](../guides/lifecycle.md).

## 6. Retain and release

Two of your records can point at the same stored bytes. Reference counting is
how dedup4j knows when the content is genuinely unused.

```java
blobs.retain(ref.assetContentId());    // a second record now needs these bytes
blobs.release(ref.assetContentId());   // that record is gone
blobs.release(ref.assetContentId());   // the last user is gone
```

`retain` increments the count; `release` decrements it. When the count reaches
zero, **the stored object is deleted immediately**, inside the same transaction
as the decrement — see [Retrieval, retain & release](../guides/lifecycle.md).

!!! danger "The count is the only thing protecting your bytes"
    Releasing content that another record still needs deletes the bytes. The
    count is what dedup4j knows; your records are what is true.

    Note that `store` already counts for you — including a duplicate store, so
    step 4 above left the count at 2. Call `retain` only for a record created
    *without* a store call. Then `release` once per record.

    Releasing below zero is rejected with `ReferenceCountUnderflowException`
    rather than silently ignored.

## What you just proved

- Identical bytes are stored once, regardless of filename.
- The `assetContentId` UUID is the handle that joins your records to content.
- Retrieval streams through your application.
- Content lifetime is governed by reference counting, not by deletion calls.

## Next

| To | Read |
|---|---|
| Move off the local filesystem | [Storage providers](../guides/providers.md) |
| See every configuration key | [Configuration properties](../reference/configuration.md) |
| Understand the auto-configuration | [Spring Boot integration](../guides/spring-boot.md) |
| Handle failures | [Troubleshooting](../reference/troubleshooting.md) |
