# Blob Helper Documentation Site — Design and Roadmap

**Status:** Approved design
**Date:** 2026-09-01
**Project:** Blob Helper

## 1. Purpose

Create a standalone, public GitHub Pages documentation site for Blob Helper as
the library moves toward Maven Central publication. The site should help a
developer understand the problem quickly, add the correct Maven dependencies,
configure a provider, and complete a first deduplicated upload without reading
the source code.

The documentation site is a project home for the library. It is separate from
Edem's personal website, while the personal website's `/projects` page will
provide the story, project context, and a link to the technical documentation.

## 2. Audience and documentation strategy

The primary audience is an application developer evaluating or integrating
Blob Helper into a Java or Spring Boot application.

Contributors are a secondary audience. Contributor material will be present
from the beginning, but it will follow the user journey rather than dominate
the landing page.

The documentation should answer these questions in order:

1. What problem does Blob Helper solve?
2. Is it compatible with my application?
3. How do I install it from Maven Central?
4. How do I configure storage?
5. How does upload, deduplication, retain, and release work?
6. What should I do when something fails?
7. How can I extend or contribute to the project?

## 3. Selected approach

### Repository

Use a separate repository:

```text
blob-helper-docs/
```

This keeps documentation deployment independent from the Java multi-module
repository and gives the project a stable public documentation home. The
library repository remains the source of truth for implementation and tests;
the documentation repository explains the supported public behavior.

### Site generator

Use MkDocs with the Material theme.

Reasons for this choice:

- Documentation pages remain easy-to-edit Markdown.
- Navigation, search, code blocks, tables, and callouts are available without
  building a custom frontend.
- Java, Maven, YAML, and shell examples are first-class documentation needs.
- GitHub Actions can build and deploy the static site to GitHub Pages.
- The site can adopt versioned documentation later if releases require it.

### Relationship to the personal website

The personal website should contain a concise project page at a route such as:

```text
/projects/blob-helper
```

That page should link to the standalone documentation site, GitHub repository,
and Maven Central coordinates. It should not duplicate the complete technical
manual.

## 4. Information architecture

Initial site navigation:

```text
Home
Getting Started
  Installation
  Quick start
Guides
  Spring Boot setup
  Uploading and retrieving blobs
  Reference counting
  Metrics and management
Storage Providers
  Local filesystem
  AWS S3
  Azure Blob Storage
  Custom providers
Reference
  Public API
  Configuration properties
  Exceptions and failure behavior
Architecture
Contributing
Releases
```

The first release of the site should keep the navigation shallow. Pages should
be split when a topic becomes difficult to scan, not merely because a section
has several paragraphs.

## 5. Documentation roadmap

### Phase 1 — Site foundation

- Create the standalone `blob-helper-docs` repository.
- Add `mkdocs.yml` with the Material theme and initial navigation.
- Add GitHub Actions deployment to GitHub Pages.
- Add a simple project visual identity consistent with Blob Helper: calm,
  technical, storage-oriented, and readable.
- Add repository contribution instructions for editing documentation.
- Establish a link back to the source repository.

### Phase 2 — Developer quick start

- Explain the Blob Helper problem and the logical-asset/physical-content model.
- Document Maven Central coordinates once the release group and version are
  finalized.
- Show dependency snippets for Maven and Gradle.
- Document the minimum Spring Boot configuration.
- Walk through a first store, duplicate store, retrieve, retain, and release
  flow.
- Explain what happens when the same bytes are uploaded more than once.

### Phase 3 — Storage providers

- Document local filesystem setup for development.
- Document S3 configuration, endpoint overrides, and path-style access where
  relevant.
- Document Azure Blob Storage configuration.
- Document how to implement and register a custom `BlobStorage` adapter.
- Clearly separate development configuration from production credential
  handling.

### Phase 4 — Reference documentation

- Document the public core interfaces and immutable request/result models.
- Document Spring Boot properties with defaults and examples.
- Document provider selection and invalid-configuration behavior.
- Document domain exceptions and expected caller behavior.
- Document Micrometer metrics, management endpoints, and optional dashboard
  monitoring.

### Phase 5 — Architecture and contribution

- Explain content identity: hash algorithm, content hash, and byte size.
- Explain reference counting and final physical-object deletion.
- Explain the module boundaries and provider dependency isolation.
- Explain transaction ownership and concurrency behavior.
- Document the test strategy and local verification commands.
- Add a guide for adding a storage provider without coupling it to core.

### Phase 6 — Releases and maintenance

- Document the Maven Central publishing workflow.
- Define versioning and compatibility policy.
- Add a supported Java/Spring Boot matrix.
- Publish changelog and migration notes for each release.
- Add security reporting and support expectations.
- Add a documentation checklist to the release process so examples are tested
  against the released coordinates.

### Phase 7 — Personal website integration

- Add `/projects/blob-helper` to the personal website.
- Describe the motivation, design decisions, and current project status.
- Link to the standalone docs, GitHub repository, and Maven Central.
- Keep the personal page narrative and concise; keep installation and API
  details on the documentation site.

## 6. Proposed repository structure

```text
blob-helper-docs/
├── docs/
│   ├── index.md
│   ├── getting-started/
│   │   ├── installation.md
│   │   └── quick-start.md
│   ├── guides/
│   │   ├── spring-boot-setup.md
│   │   ├── uploading-and-retrieving.md
│   │   ├── reference-counting.md
│   │   └── observability.md
│   ├── providers/
│   │   ├── local.md
│   │   ├── s3.md
│   │   ├── azure.md
│   │   └── custom.md
│   ├── reference/
│   │   ├── api.md
│   │   ├── configuration.md
│   │   └── errors.md
│   ├── architecture/
│   │   ├── overview.md
│   │   ├── modules.md
│   │   └── data-flow.md
│   ├── contributing.md
│   └── releases.md
├── docs/plans/
│   └── 2026-09-01-blob-helper-docs-design.md
├── mkdocs.yml
└── .github/workflows/deploy.yml
```

The design document may remain in `docs/plans/` as project history. Published
navigation should prioritize user-facing documentation and should not expose
planning files as part of the main user journey unless useful.

## 7. Maven Central documentation requirements

The site should not publish installation instructions with placeholder values.
Before the first release, the project must settle:

- Public Maven `groupId`.
- Artifact naming for every published module.
- Initial release version.
- Java compatibility policy.
- Spring Boot compatibility policy.
- Which modules are public library artifacts versus development or standalone
  applications.
- Whether the parent POM is published and whether consumers need it.

Each release should include verified dependency snippets, for example:

```xml
<dependency>
    <groupId>...</groupId>
    <artifactId>blob-helper-spring-boot-starter</artifactId>
    <version>...</version>
</dependency>
```

The snippets should be checked against the actual published coordinates before
the release is announced.

## 8. Deployment and quality expectations

GitHub Actions should build the MkDocs site on pull requests and deploy the
approved default branch to GitHub Pages. Documentation pull requests should
verify at least:

- MkDocs build succeeds with strict link/configuration checks.
- Code blocks and configuration examples remain readable.
- Navigation links resolve.
- The site renders acceptably on desktop and mobile widths.
- The home page has a direct path to installation.

The site should remain static and credential-free at runtime. Maven Central,
GitHub, and source links may be external, but the documentation should not
depend on a running Blob Helper dashboard to render.

## 9. Out of scope for the first site version

- TypeScript or npm SDK documentation.
- A hosted Blob Helper service.
- Interactive API playgrounds.
- User accounts or comments.
- Automatically generated full JavaDoc as the primary navigation experience.
- Duplicating the entire project planning history on the public landing page.

## 10. Success criteria

The first public documentation release is successful when:

- A Java/Spring Boot developer can find the Maven dependency in under a
  minute.
- A new user can complete a local quick start without inspecting source code.
- Provider-specific setup is isolated and easy to compare.
- Public API and configuration behavior are documented with accurate examples.
- A contributor can understand module boundaries and run verification locally.
- The personal website can link to one stable project documentation URL.
- A release can update coordinates, compatibility, changelog, and migration
  notes without restructuring the site.

## 11. Decisions still required during implementation

- Final Maven Central namespace and project ownership metadata.
- Final public GitHub repository name and Pages URL.
- Whether documentation versions are needed at the first release or after the
  first breaking change.
- Exact visual branding and relationship to the personal website design.
- Whether JavaDoc should be generated and linked as a separate artifact site.
