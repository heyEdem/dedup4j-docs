# Uploading & deduplication

--8<-- "not-on-central.md"

`BlobStore` is the upload front door. It takes bytes in whatever form your
application already has them and returns a `BlobReference`.

## The facade

```java
public interface BlobStore {
    BlobReference store(MultipartFile file);
    BlobReference store(Path path);
    BlobReference store(byte[] content, String filename, String contentType);
    BlobReference store(InputStream content, long sizeBytes, String filename,
                        String contentType, Map<String, String> metadata);
    BatchStoreResult storeAll(MultipartFile[] files);
}
```

Four `store` overloads for the four shapes bytes usually arrive in — a web
upload, a file on disk, an in-memory array, or a stream you are already
holding.

!!! note "The stream overload needs the size up front"
    `sizeBytes` is a parameter because content length is part of content
    identity and dedup4j will not buffer an entire stream to discover it.

## What `store` returns

```java
public record BlobReference(
    UUID assetContentId,      // your handle — store this
    ContentHash contentHash,  // content identity
    String contentType,
    String storageProvider,
    String bucketOrContainer,
    String objectKey,
    boolean duplicate         // were these bytes already here?
) {}
```

`assetContentId` is the only field most applications persist. The rest
describe where the bytes landed and are useful for diagnostics and for
building your own download URLs via
[`location()`](lifecycle.md#retrieval).

## Content identity

```java
public record ContentHash(String algorithm, String hash, long sizeBytes) {}
```

Identity is the **triple**, not the hash alone. Size participates, so two
objects match only if the digest *and* the byte count agree — a cheap defence
that makes an accidental collision require matching both.

What identity is **not**:

- not the filename — `invoice.pdf` and `a-copy.pdf` with the same bytes are
  the same content
- not the content type
- not the metadata
- not the upload time or uploader

**Only the bytes decide.**

## Storing the same bytes twice

```java
BlobReference first  = blobStore.store(bytes, "invoice.pdf", "application/pdf");
BlobReference second = blobStore.store(bytes, "copy.pdf",    "application/pdf");

first.duplicate();   // false — new content
second.duplicate();  // true  — recognised

second.assetContentId().equals(first.assetContentId());  // true
```

On the second call dedup4j hashes the content, finds an existing row, uploads
nothing, and returns a reference to the object already stored.

!!! warning "A duplicate store does not increment the count"
    `store` returning `duplicate: true` tells you the *bytes* were already
    present. If that call represents a **new record** in your application,
    call [`retain`](lifecycle.md#retain-and-release) — otherwise the count
    understates how many of your records depend on the content, and a later
    release deletes bytes that are still in use.

That interaction is the single most important thing to get right when
integrating dedup4j.

## Batch uploads

```java
BatchStoreResult result = blobStore.storeAll(files);

result.allSucceeded();
result.successes();   // List<BlobStoreSuccess>
result.failures();    // List<BlobStoreFailure>
```

### Partial success is the normal case

`storeAll` is **not** all-or-nothing. Each file succeeds or fails
independently, and one bad file does not discard the rest.

The outcome type is a sealed interface, so the compiler can check you handled
both:

```java
public sealed interface BatchStoreOutcome
        permits BlobStoreSuccess, BlobStoreFailure {
    int index();
    String filename();
}
```

```java
for (BatchStoreOutcome outcome : result.outcomes()) {
    switch (outcome) {
        case BlobStoreSuccess s ->
            attach(s.reference().assetContentId());
        case BlobStoreFailure f ->
            report(f.index(), f.filename(), f.failure());
    }
}
```

`index()` is the file's position in the array you passed, so a failure maps
back to the exact input — necessary when several uploads share a filename or
when the filename is absent.

!!! danger "Check `failures()`"
    Treating a `BatchStoreResult` as success because the call returned is the
    easiest mistake to make here. The call returning means the *batch* ran, not
    that every file stored. Use `allSucceeded()` before assuming.

## What dedup4j does not do on upload

- **No virus scanning or content inspection.** Bytes are stored as given.
- **No image processing, transcoding, or thumbnails.**
- **No access control.** Anyone who can call `store` can store.
- **No atomicity with your own writes** across the database and the object
  store — see [Architecture & limitations](../architecture.md).

## Next

- [Retrieval, retain & release](lifecycle.md) — reading back and reference counting
- [Public API](../reference/api.md) — the full surface
- [Troubleshooting](../reference/troubleshooting.md) — when a store fails
