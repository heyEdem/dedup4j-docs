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

!!! tip "Unselected providers do nothing"
    An adapter that is not selected constructs no client and resolves no
    credentials. Having `dedup4j-storage-s3` on the classpath does not mean
    your application contacts AWS, and a missing AWS credential file is not an
    error when `provider` is `local`.

    This is a design commitment. It is verified from an external consumer
    project at release gate G6 rather than asserted here.

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

!!! warning "Single-node only"
    Two application instances with separate filesystems will deduplicate
    against different content. The database says the bytes exist; the local
    disk of the node handling the request may disagree. Use object storage for
    anything multi-node.

## Amazon S3

Also works with S3-compatible stores — MinIO, Cloudflare R2, Backblaze B2 —
via `endpoint-override`.

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
| `endpoint-override` | Custom endpoint for S3-compatible stores |
| `path-style-access` | `true` for MinIO and most S3-compatible stores |

### Credentials

**There is no credentials property, deliberately.** dedup4j uses the AWS SDK's
default credential provider chain — environment variables, system properties,
the shared credentials file, then container and instance metadata.

That means in production you attach an IAM role and configure nothing. A
library that accepted `access-key` and `secret-key` as configuration would
invite them into `application.yaml`, and from there into version control.

=== "Development"

    ```bash
    export AWS_ACCESS_KEY_ID=...
    export AWS_SECRET_ACCESS_KEY=...
    export AWS_REGION=eu-west-1
    ```

=== "Production"

    Attach an IAM role to the task, pod, or instance. Set nothing.

### MinIO or other S3-compatible

```yaml
dedup4j:
  storage:
    provider: s3
    s3:
      bucket: blobs
      region: us-east-1
      endpoint-override: http://localhost:9000
      path-style-access: true
```

`path-style-access: true` is required by most S3-compatible stores, which do
not implement virtual-host-style bucket addressing.

## Azure Blob Storage

```yaml
dedup4j:
  storage:
    provider: azure
    azure:
      container: application-blobs
      account-name: mystorageaccount
```

| Property | Meaning |
|---|---|
| `container` | Target container. Must already exist |
| `account-name` | Storage account name |
| `endpoint` | Custom endpoint, e.g. Azurite |
| `connection-string` | Full connection string — **development only** |

!!! danger "connection-string carries an embedded key"
    A connection string contains an account key in plaintext. Use it against
    Azurite locally; in production prefer a managed identity and supply
    `account-name` and `endpoint`. A connection string in `application.yaml`
    is a credential in version control.

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
| Credentials | none | default chain | managed identity or connection string |
| Custom endpoint | — | ✅ | ✅ |
| Best for | development, tests | production | production on Azure |

## Next

- [Uploading & deduplication](uploading.md) — what happens on `store`
- [Configuration properties](../reference/configuration.md) — every key
- [Troubleshooting](../reference/troubleshooting.md) — misconfiguration symptoms
