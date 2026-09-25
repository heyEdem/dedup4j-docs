# Upload Facade and Batch API Decision

**Status:** Accepted  
**Date:** 2026-09-03  
**Project:** Blob Helper

## Friendly facade

The Spring Boot integration will auto-configure a public `BlobHelper` facade. The normal single-upload path is:

```java
BlobReference reference = blobHelper.store(file);
```

The facade accepts `MultipartFile` directly and supports common non-HTTP sources such as `Path`, `byte[]`, and explicitly described `InputStream` content. It constructs `StoreBlobCommand` internally and delegates to the provider-neutral `BlobDeduplicationService`.

`StoreBlobCommand` and `BlobDeduplicationService` remain available as advanced APIs.

Blob Helper accepts arbitrary media bytes by default. Applications may configure content-type restrictions when required.

## Return and response ownership

Single-item storage returns a non-optional `BlobReference` for both new and duplicate content. Duplicate results identify the existing physical object and have `duplicate=true`.

The consuming application owns its HTTP response. It may retain the content ID, map selected fields, return its own DTO or URL, or ignore the result where lifecycle tracking is intentionally unnecessary. Blob Helper does not force `BlobReference` to become a controller response.

Blob Helper is the sole physical upload path. Consuming code must not call `S3Client.putObject(...)` after calling `store(...)`.

## Batch API

Spring MVC batch uploads accept `MultipartFile[]` directly:

```java
BatchStoreResult result = blobHelper.storeAll(files);
```

The batch operation:

- Processes every input item, sequentially by default.
- Continues after an individual item fails.
- Preserves input order in the reported results.
- Returns one indexed success or failure outcome per item.
- Applies hashing, physical deduplication, and reference counting independently to every item.
- Allows future configurable concurrency without changing result ordering.

The batch does not claim all-or-nothing atomicity because relational metadata and physical cloud storage cannot be rolled back as one transaction. Consuming applications create logical upload records for successful outcomes only. Every successful duplicate increments its Blob Helper reference count.

## Stable locations and access URLs

Blob Helper persists the stable provider, bucket/container, and object key. It does not persist expiring URLs and does not generate presigned URLs. Consuming applications generate presigned URLs when browser access to private content is required.
