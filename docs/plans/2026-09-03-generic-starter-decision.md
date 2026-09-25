# Generic Blob Helper Starter — Dependency Decision

**Status:** Accepted  
**Date:** 2026-09-03  
**Project:** Blob Helper

## Decision

Publish `blob-helper-spring-boot-starter` as the single dependency required for the standard Spring Boot integration.

The starter will transitively provide Blob Helper's core, JPA integration, and local, S3, and Azure storage adapters. Those modules remain separate internally, but consuming developers do not have to understand or assemble the module graph.

The configured property selects the active provider:

```yaml
blob-helper:
  storage:
    provider: s3
```

Only the selected provider may create its client and `BlobStorage` bean. Merely having the other provider modules on the classpath must not initialize their clients, resolve credentials, or require their configuration.

The dashboard and management modules are not part of the generic upload starter. They remain separate, opt-in features because they add web and operational behavior rather than storage capability.

## Rationale

Blob Helper is intended to be a low-friction developer helper. Requiring both a base starter and a provider adapter exposes an internal packaging decision to every consumer. One generic dependency provides a simpler installation story, consistent quick starts, and configuration-driven provider selection.

With the versions evaluated when this decision was made, S3 resolved to approximately 55 runtime JARs/16.2 MiB, Azure to 51 runtime JARs/19.8 MiB, and both together to approximately 85 unique runtime JARs/30.5 MiB. Some of this classpath may already exist in a Spring Boot application. The additional footprint is accepted in exchange for the simpler default developer experience.

## Dependency-risk mitigation

The generic starter must include the following safeguards:

1. Import the official AWS and Azure SDK BOMs and test them with every supported Spring Boot dependency set.
2. Add Maven dependency-convergence checks for shared libraries that commonly cross SDK boundaries, especially Netty, Jackson, Reactor, HTTP clients, and SLF4J.
3. Add application-context tests with every provider module present, activating local, S3, and Azure one at a time.
4. Run provider contract tests and the full build whenever Spring Boot, a cloud SDK, or a shared networking dependency changes.
5. Enable automated vulnerability alerts and dependency-update pull requests.
6. Add dependency-review checks that prevent newly introduced high or critical vulnerabilities from entering the supported dependency set without explicit review.
7. Instantiate only the configured provider so unused SDKs do not perform credential discovery, network setup, or client initialization.

## Maintenance policy

Version differences in a transitive dependency graph are expected; actual incompatibility is not. Maven dependency management must resolve one tested version of each shared library.

Dependency updates should be reviewed regularly and grouped into deliberate maintenance releases. Blob Helper does not need a release for every upstream SDK release. An expedited patch release is required when a vulnerability is relevant to Blob Helper's reachable runtime behavior or when a supported application combination has a demonstrated compatibility failure.

Each Blob Helper release must publish its supported Java and Spring Boot versions and verify the bundled provider matrix before release.

## Consequences

- Standard consumers add one Maven or Gradle dependency.
- Configuration selects the provider; it does not alter the resolved classpath.
- Provider implementations remain modular for development and testing.
- Consuming applications carry unused provider SDKs in the standard packaged application.
- Blob Helper maintainers own compatibility testing and security monitoring for all bundled providers.
- Advanced lean/provider-specific packaging can be reconsidered later, but is not part of the initial public integration contract.
