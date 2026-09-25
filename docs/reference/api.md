# Public API

--8<-- "not-on-central.md"

The types dedup4j expects you to use. Everything here is in
`com.edem.dedup4j.*`.

!!! note "Records, not beans"
    Every model type is an immutable `record` with validation in its compact
    constructor. There are no setters, and an invalid instance cannot be
    constructed.

## Entry points

### `BlobStore`

The upload facade. Auto-configured by the starter.

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

See [Uploading & deduplication](../guides/uploading.md).

### `BlobDeduplicationService`

Retrieval and reference counting. Auto-configured.

```java
public interface BlobDeduplicationService {
    BlobReference store(StoreBlobCommand command);
    void retain(UUID assetContentId);
    void release(UUID assetContentId);
    BlobResource get(UUID assetContentId);
    BlobLocation location(UUID assetContentId);
}
```

Its `store` takes a `StoreBlobCommand` directly — the lower-level entry point
`BlobStore` delegates to. See
[Retrieval, retain & release](../guides/lifecycle.md).

## Models

### `BlobReference`

Returned by every `store`.

```java
public record BlobReference(
    UUID assetContentId,
    ContentHash contentHash,
    String contentType,
    String storageProvider,
    String bucketOrContainer,
    String objectKey,
    boolean duplicate
) {
    BlobLocation location();
}
```

`assetContentId` is the handle to persist. `duplicate` reports whether the
bytes already existed.

### `ContentHash`

```java
public record ContentHash(String algorithm, String hash, long sizeBytes) {}
```

Content identity is the whole triple. The algorithm is SHA-256.

### `BlobResource`

Returned by `get`. **Holds an open stream** and implements `AutoCloseable`.

```java
public record BlobResource(
    String objectKey,
    InputStream content,
    long sizeBytes,
    String contentType,
    Map<String, String> metadata
) implements AutoCloseable {}
```

```java
try (BlobResource resource = blobs.get(id)) { ... }
```

### `BlobLocation`

```java
public record BlobLocation(
    String provider,
    String bucketOrContainer,
    String objectKey
) {}
```

Note the component is `provider`, while `BlobReference` calls the same concept
`storageProvider`.

Everything needed to build a presigned URL with your provider's own SDK — see
[why dedup4j does not issue them](../guides/lifecycle.md#why-there-are-no-presigned-urls).

### `StoreBlobCommand`

```java
public record StoreBlobCommand(
    InputStream content,
    String filename,
    String contentType,
    long sizeBytes,
    Map<String, String> metadata
) {}
```

## Batch results

```java
public sealed interface BatchStoreOutcome
        permits BlobStoreSuccess, BlobStoreFailure {
    int index();
    String filename();
}

public record BlobStoreSuccess(int index, String filename, BlobReference reference)
        implements BatchStoreOutcome {}

public record BlobStoreFailure(int index, String filename, RuntimeException failure)
        implements BatchStoreOutcome {}

public record BatchStoreResult(List<BatchStoreOutcome> outcomes) {
    List<BlobStoreSuccess> successes();
    List<BlobStoreFailure> failures();
    boolean allSucceeded();
}
```

Sealed, so a `switch` over outcomes is exhaustively checked. `index()` maps
back to the position in the array you submitted.

## Extension points

Each is an auto-configured bean declared `@ConditionalOnMissingBean` — declare
your own and the default steps aside.

### `BlobStorage`

The storage SPI. Implement it to support a provider dedup4j does not ship.

```java
public interface BlobStorage {
    StoredBlob put(PutBlobRequest request);
    BlobResource get(String objectKey);
    void delete(String objectKey);
    boolean exists(String objectKey);
}
```

`delete` must be idempotent — an already-missing object counts as deleted.

```java
public record PutBlobRequest(
    String objectKey, InputStream content, long sizeBytes,
    String contentType, String originalFilename, Map<String, String> metadata
) {}

public record StoredBlob(
    String objectKey, String provider, String bucketOrContainer,
    long sizeBytes, String contentType, String checksum, Instant createdAt
) {}
```

See [custom providers](../guides/providers.md#custom-providers).

### `ObjectKeyStrategy`

Decides where content lands in the store.

```java
public interface ObjectKeyStrategy {
    String generateKey(ContentHash contentHash);
}
```

The key is derived from content identity alone — the same bytes always
produce the same key, which is what makes deduplication work. A strategy that
introduces randomness breaks that.

### `ContentHasher`

```java
public interface ContentHasher {
    ContentHash hash(InputStream inputStream) throws IOException;
}
```

!!! warning "Changing this orphans existing content"
    Identity is the hash. Existing rows keep hashes from the old algorithm,
    so previously stored content will never match again and will be stored a
    second time.

## Reconciliation

**Not auto-configured** — construct it yourself.

```java
public interface LogicalReferenceCountSource {
    Map<UUID, Long> countLogicalReferences();
}

public record ReconciliationMismatch(
    UUID assetContentId,
    long expectedReferenceCount,
    long actualReferenceCount
) {}

public record ReconciliationReport(
    long checkedContentCount,
    List<ReconciliationMismatch> mismatches
) {}
```

`LogicalReferenceCountSource` is a functional interface: you tell dedup4j what
the counts *should* be, because it cannot enumerate your records.

## Exceptions

All unchecked. See [Troubleshooting](troubleshooting.md).

```text
Dedup4jException
├── BlobValidationException
├── BlobStorageException
├── BlobHashingException
├── ContentNotFoundException
└── ReferenceCountUnderflowException

DuplicateContentIdentityException    ← extends RuntimeException directly
```
