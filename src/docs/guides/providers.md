---
title: Storage providers
description: Configure the filesystem, S3 or Azure storage provider.
category: Guides
order: 4
---
# Storage providers

--8<-- "not-on-central.md"

dedup4j ships three storage adapters and an SPI for writing your own. All
three adapters arrive with the starter; **configuration selects one**, and the
others stay inert.

```yaml
dedup4j:
  storage:
    provider: local   # local | s3 | azure
```

> [!TIP]
> **Unselected providers do nothing**
>
> An adapter that is not selected constructs no client and resolves no
> credentials. Having `dedup4j-storage-s3` on the classpath does not mean
> your application contacts AWS, and a missing AWS credential file is not an
> error when `provider` is `local`.
>
> This is a design commitment. It is verified from an external consumer
> project at release gate G6 rather than asserted here.

## Local filesystem

For development, tests, and single-node deployments.

```yaml
dedup4j:
  storage:
    provider: local
    local:
      root-directory: ./dedup4j-storage
```

| Property | Meaning |
|---|---|
| `root-directory` | Directory holding stored blobs |

> [!WARNING]
> **Intended for a single node**
>
> Nothing in the adapter prevents multi-node use, but two instances with
> separate filesystems share one database and two different sets of bytes.
> The database can say content exists while the disk of the node handling
> the request does not have it. Use object storage for anything multi-node,
> or give every node the same shared mount.

## Amazon S3

Also works with S3-compatible stores — MinIO, Cloudflare R2, Backblaze B2 —
via `endpoint`.

```yaml
dedup4j:
  storage:
    provider: s3
    s3:
      bucket: my-application-blobs
      region: eu-west-1
```

| Property | Meaning |
|---|---|
| `bucket` | Target bucket. Must already exist |
| `region` | AWS region |
| `endpoint` | Custom endpoint for S3-compatible stores |
| `path-style` | `true` for MinIO and most S3-compatible stores |

### Credentials

**There is no credentials property, deliberately.** dedup4j uses the AWS SDK's
default credential provider chain — environment variables, system properties,
the shared credentials file, then container and instance metadata.

That means in production you attach an IAM role and configure nothing. A
library that accepted `access-key` and `secret-key` as configuration would
invite them into `application.yaml`, and from there into version control.

::::tabs
:::tab{title="Development"}
```bash
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_REGION=eu-west-1
```
:::
:::tab{title="Production"}
Attach an IAM role to the task, pod, or instance. Set nothing.
:::
::::

### MinIO or other S3-compatible

```yaml
dedup4j:
  storage:
    provider: s3
    s3:
      bucket: blobs
      region: us-east-1
      endpoint: http://localhost:9000
      path-style: true
```

`path-style: true` is required by most S3-compatible stores, which do
not implement virtual-host-style bucket addressing.

## Azure Blob Storage

```yaml
dedup4j:
  storage:
    provider: azure
    azure:
      container: application-blobs
      endpoint: ${AZURE_BLOB_SAS_URL}   # or connection-string
```

`container` plus **one of** `endpoint` or `connection-string` is required.
With only `container` and `account-name`, startup fails with
`connectionString or endpoint must be configured`.

| Property | Meaning |
|---|---|
| `container` | Target container. Must already exist |
| `endpoint` | Service URL. dedup4j sets no credential, so it must carry a SAS token (or point at Azurite). Overrides the endpoint inside `connection-string` when both are set |
| `connection-string` | Full connection string, with an account key or a SAS |
| `account-name` | Accepted but **not used** in 0.1.0 |

### Authentication

dedup4j 0.1.0 does **not** configure a managed identity or any other Azure
credential for you. Three ways work:

1. **`connection-string`**: simplest; fine against Azurite.
2. **`endpoint` with a SAS token** in its query string.
3. **Your own client.** Declare a `BlobContainerClient` bean and dedup4j uses
   it instead of building one. This is how to use a managed identity today:

```java
@Bean
BlobContainerClient blobContainerClient() {
    return new BlobServiceClientBuilder()
            .endpoint("https://mystorageaccount.blob.core.windows.net")
            .credential(new DefaultAzureCredentialBuilder().build()) // azure-identity
            .buildClient()
            .getBlobContainerClient("application-blobs");
}
```

`container` is still required when you supply your own client.

> [!CAUTION]
> **Connection strings and SAS URLs are credentials**
>
> Both embed a secret in plaintext. Supply them from the environment or a
> secret store, never from a committed `application.yaml`.

## Custom providers

Implement `BlobStorage` from `dedup4j-core` — four methods:

```java
public interface BlobStorage {
    StoredBlob put(PutBlobRequest request);
    BlobResource get(String objectKey);
    void delete(String objectKey);
    boolean exists(String objectKey);
}
```

Register it as a bean and the built-in adapters step aside:

```java
@Configuration
public class GcsStorageConfiguration {

    @Bean
    BlobStorage blobStorage() {
        return new GcsBlobStorage(...);
    }
}
```

Your adapter handles bytes only. Content hashing, deduplication, reference
counting, and metadata stay in dedup4j — an adapter is a transport, not a
participant in the dedup decision.

Contract notes:

- `get` returns a `BlobResource` holding an **open** `InputStream`; the caller
  closes it.
- `exists` should be cheap — a metadata probe, not a download.
- `put` must be safe to call with content that already exists at that key.
  Deduplication reduces how often that happens; it does not guarantee it never
  will.

## Comparison

| | Local | S3 | Azure |
|---|---|---|---|
| Multi-node | ❌ | ✅ | ✅ |
| Credentials | none | default chain | connection string, SAS endpoint, or your own client |
| Custom endpoint | — | ✅ | ✅ |
| Best for | development, tests | production | production on Azure |

## Next

- [Uploading & deduplication](uploading.md) — what happens on `store`
- [Configuration properties](../reference/configuration.md) — every key
- [Troubleshooting](../reference/troubleshooting.md) — misconfiguration symptoms
