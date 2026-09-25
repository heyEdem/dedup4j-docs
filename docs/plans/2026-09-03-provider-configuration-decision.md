# Provider Configuration Decision

**Status:** Accepted  
**Date:** 2026-09-03  
**Project:** Blob Helper

## Provider client ownership

Blob Helper will reuse an application-provided provider SDK client when one is available. When no application client exists, provider auto-configuration will conditionally create the required client from the provider SDK's standard configuration chain.

For S3, this means an existing `S3Client` takes precedence. Otherwise, Blob Helper creates one using the normal AWS credential and region provider chains. Applications do not need to duplicate credentials in Blob Helper-specific properties.

## Minimal S3 configuration

Normal AWS S3 usage requires only:

```yaml
blob-helper:
  storage:
    provider: s3
    s3:
      bucket: my-images
```

The following remain optional overrides:

- `region` — override region-chain resolution.
- `endpoint` — use an S3-compatible endpoint such as MinIO.
- `path-style` — enable path-style addressing when required by the endpoint.

Provider clients and storage adapters are conditional defaults. Supplying a custom client must not require the application to recreate Blob Helper's hasher, key strategy, repositories, metrics, transaction boundary, or facade.

## Dashboard boundary

Dashboard and management modules remain separate and opt-in. They are not transitive dependencies of the generic upload starter because they add web endpoints, monitoring, and operational behavior rather than storage-provider capability.

## Consequences

- Common S3 setup is configuration-light and uses established AWS credential handling.
- Existing application cloud-client customization is preserved.
- MinIO and specialized endpoints remain supported without affecting AWS defaults.
- Secrets are not duplicated into a Blob Helper-specific configuration namespace.
