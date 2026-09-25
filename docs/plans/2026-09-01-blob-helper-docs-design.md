# Blob Helper Documentation Site — Design

**Status:** Approved design
**Date:** 2026-09-01
**Revised:** 2026-09-24 — scoped to a 13-page launch; see
[`2026-09-24-docs-site-and-release-alignment.md`](2026-09-24-docs-site-and-release-alignment.md)
**Project:** Blob Helper

## 1. Purpose

Create a standalone, public GitHub Pages documentation site for Blob Helper as
the library moves toward Maven Central publication. The site should help a
developer understand the problem quickly, add the correct Maven dependencies,
configure a provider, and complete a first deduplicated upload without reading
the source code.

The documentation site is the project home for the library. It is separate from
Edem's personal website; the personal website's `/projects` page will eventually
provide the story and link to the technical documentation.

## 2. Audience and documentation strategy

The primary audience is an application developer evaluating or integrating Blob
Helper into a Java or Spring Boot application.

Contributors are a secondary audience. Contributor material is present from the
beginning, but it follows the user journey rather than dominating the landing
page.

The documentation answers these questions in order:

1. What problem does Blob Helper solve?
2. Is it compatible with my application?
3. How do I install it from Maven Central?
4. How do I configure storage?
5. How does upload, deduplication, retain, and release work?
6. What should I do when something fails?
7. How can I extend or contribute to the project?

Every launch page traces to one of these seven questions. A proposed page that
does not is deferred.

## 3. Selected approach

### Repository

A separate repository, `blob-helper-docs`, keeps documentation deployment
independent from the Java multi-module repository and gives the project a stable
public documentation home. The library repository remains the source of truth for
implementation and tests; the documentation repository explains supported public
behavior.

Section 7 defines how the two repositories are kept honest, because separate
repositories are also the main drift risk.

### Site generator

MkDocs with the Material theme.

- Pages stay easy-to-edit Markdown.
- Navigation, search, code blocks, tables, and callouts work without building a
  frontend.
- Java, Maven, YAML, and shell examples are first-class.
- GitHub Actions builds and deploys to GitHub Pages.
- Versioned documentation can be adopted later via `mike` if releases require it.

Astro and Starlight are explicitly out of scope for this project.

## 4. Information architecture

The site launches with **13 pages** at **navigation depth 2**.

```text
Home                              index.md
Getting started
  Installation                    getting-started/installation.md
  Quick start                     getting-started/quick-start.md
Guides
  Spring Boot integration         guides/spring-boot.md
  Storage providers               guides/providers.md
  Uploading & deduplication       guides/uploading.md
  Retrieval, retain & release     guides/lifecycle.md
  Observability & dashboards      guides/observability.md
Reference
  Configuration properties        reference/configuration.md
  Public API                      reference/api.md
  Troubleshooting                 reference/troubleshooting.md
Architecture & limitations        architecture.md
Contributing                      contributing.md
```

Not published in navigation:

- `docs/includes/` — snippet fragments, included by pages, never browsed.
- `docs/plans/` — design and decision history.
- `docs/releases/publishing.md` — the maintainer release runbook.

Planning history stays in the repository as project record. It is not part of
the user journey.

### Page responsibilities

| Page | Answers | Must contain |
|---|---|---|
| Home | 1, 2, 3 | value sentence, compatibility line, dependency snippet, quick-start call to action, the presigned-URL and atomicity warning |
| Installation | 3 | Maven and Gradle snippets from the shared include, starter selection guidance, what each published artifact is for |
| Quick start | 5 | store, duplicate store, retrieve, retain, release against the local provider |
| Spring Boot integration | 4 | auto-configured beans, reusing the application `DataSource`, overriding defaults, `initialize-schema` modes |
| Storage providers | 4 | local, S3, Azure, and custom adapters as four sections on one page; development versus production credential handling |
| Uploading & deduplication | 5 | the `BlobHelper` facade, `store` / `storeAll`, `BlobReference`, what happens when identical bytes arrive twice |
| Retrieval, retain & release | 5 | reference counting, physical deletion, reconciliation, and why Blob Helper does not issue presigned URLs |
| Observability & dashboards | 5 | metrics, management endpoints, embedded versus standalone dashboard, the standalone dashboard's local-only security boundary |
| Configuration properties | 4 | every `blob-helper.*` property with default and example |
| Public API | 5 | public interfaces and immutable request/result models |
| Troubleshooting | 6 | domain exceptions, invalid-configuration behavior, expected caller response |
| Architecture & limitations | 1, 7 | content identity, module boundaries, transaction ownership, distributed-system limits |
| Contributing | 7 | editing docs, running library verification locally, adding a storage provider |

### Deliberately deferred

Splitting a page is justified when a topic becomes hard to scan, not because it
has several paragraphs. Deferred until that happens:

- Separate `local` / `s3` / `azure` / `custom` provider pages.
- A three-page architecture split (overview, modules, data flow).
- `mike` versioned documentation.
- Generated Javadoc as a navigation experience.
- A published copy of the release roadmap as a user-facing page.
- The personal website `/projects/blob-helper` page.

## 5. Landing page

The first screen carries, in order:

1. One value sentence: *store identical bytes once — deduplicated blob storage
   for Spring Boot, backed by your own database and object store.*
2. A compatibility line: Java version, tested Spring Boot version, license.
3. Copyable Maven and Gradle dependency snippets, tabbed, rendered from the
   shared include.
4. A prominent **Quick start** call to action.
5. Secondary links to providers, limitations, and source.
6. A visible warning that Blob Helper does not generate presigned URLs and
   cannot make database and object-store writes atomic.

The warning belongs above the fold. It is the most likely false expectation a
reader forms, and the upload facade decision draws that boundary explicitly.

Project history, architecture diagrams, and roadmap material stay below the
installation path.

## 6. Repository structure

```text
blob-helper-docs/
├── docs/
│   ├── index.md
│   ├── architecture.md
│   ├── contributing.md
│   ├── getting-started/
│   │   ├── installation.md
│   │   └── quick-start.md
│   ├── guides/
│   │   ├── spring-boot.md
│   │   ├── providers.md
│   │   ├── uploading.md
│   │   ├── lifecycle.md
│   │   └── observability.md
│   ├── reference/
│   │   ├── configuration.md
│   │   ├── api.md
│   │   └── troubleshooting.md
│   ├── includes/
│   │   ├── coordinates.md        # group, artifacts, version, Java, Spring Boot
│   │   ├── dep-maven.md          # includes coordinates.md
│   │   └── dep-gradle.md         # includes coordinates.md
│   ├── plans/                    # design history, not in nav
│   └── releases/
│       └── publishing.md         # maintainer runbook, not in nav
├── mkdocs.yml
├── requirements.txt              # pinned mkdocs-material and plugins
└── .github/workflows/
    ├── docs-pr.yml
    └── docs-deploy.yml
```

## 7. Keeping the site true to the library

Two repositories mean two sources of truth unless the seams are designed. Three
mechanisms, in order of how much they are relied on:

### One coordinate source

`docs/includes/coordinates.md` is the **only** place a group ID, artifact ID, or
version appears. `dep-maven.md` and `dep-gradle.md` include it; every page that
shows a dependency includes one of those fragments. No page hardcodes a version.

Implemented with the `pymdownx.snippets` extension. Snippets are chosen over
`mkdocs-macros` deliberately: a fragment include is inert text, while macros add
a Jinja evaluation layer and a second way for a `--strict` build to fail.

### The consumer project is the snippet test

Release gate G6 builds isolated Maven and Gradle consumer projects outside both
repositories. Each fragment is a single fenced code block; the text inside that
fence must match the corresponding dependency declaration in the consumer's
`pom.xml` or `build.gradle` character for character. The fence markers and any
surrounding prose are the only difference.

Copy in one direction only — from the verified consumer into the docs fragment,
never the reverse. A snippet that no consumer compiled is not documented, it is
asserted.

### The deadlock this resolves

The site cannot show real coordinates before the release exists; the release is
not complete until the documentation is accurate. Reframing "docs are done" from
a content gate into a data gate collapses the cycle:

- The full 13-page site ships and goes live **before** the release, with the
  include carrying a `0.1.0-SNAPSHOT` value and a "not yet on Maven Central"
  admonition.
- Writing the documentation surfaces API and naming problems while they are
  still fixable, rather than after an immutable publication.
- At release, gate G7 edits one file and CI redeploys.

## 8. Build and deployment

Two workflows. Neither touches Central credentials; documentation deployment is
never coupled to library publication.

**Pull requests** — checkout, install pinned dependencies from
`requirements.txt`, `mkdocs build --strict`, internal link check.

**Default branch** — the same build, then `upload-pages-artifact` and
`deploy-pages`, with a concurrency group so an older run cannot overwrite a
newer deployment.

Strict mode catches configuration errors, unresolved internal references,
missing navigation targets, and broken snippet include paths. It does not
validate external URLs. External link checking runs **on a schedule, not on pull
requests** — a required gate that depends on third-party uptime blocks
documentation merges for reasons unrelated to the documentation.

Documentation pull requests should also confirm that navigation links resolve,
the site renders acceptably at mobile widths, and the home page still offers a
direct path to installation.

The site stays static and credential-free at runtime. It must never depend on a
running Blob Helper dashboard to render.

## 9. Out of scope for the first site version

- TypeScript or npm SDK documentation.
- A hosted Blob Helper service.
- Interactive API playgrounds.
- User accounts or comments.
- Generated Javadoc as the primary navigation experience.
- Duplicating project planning history on the public landing page.

## 10. Success criteria

- A Java or Spring Boot developer finds the Maven dependency in under a minute.
- A new user completes a local quick start without inspecting source code.
- Provider setup is easy to compare across local, S3, and Azure.
- Public API and configuration behavior are documented with examples that a
  consumer project actually compiled.
- A contributor understands module boundaries and can run verification locally.
- The personal website can link to one stable documentation URL.
- A release updates coordinates, compatibility, and changelog without
  restructuring the site.

## 11. Decisions still required during implementation

- Exact Maven Central namespace spelling as shown by the verified Central Portal
  account. Resolved in release gate G0.
- Final license. Apache License 2.0 is the recommended default; MIT is the
  simpler alternative. Resolved in release gate G0.
- Final public GitHub repository name and the GitHub Pages URL, needed before the
  URL is written into released POMs.
- Visual identity: calm, technical, storage-oriented, readable. Material's
  default palette with a single accent colour is sufficient for launch.

Resolved since the original draft: documentation versioning (no `mike` for
`0.1.0`), hosted Javadoc (deferred; Javadoc JARs remain mandatory for every
published artifact regardless), and the published artifact manifest (fixed in the
release runbook).

## 12. Relationship to the release runbook

Build sequence, dry-run safety, signing, artifact exclusions, isolated consumer
tests, the release record, failure rules, and the definition of done live in
[`docs/releases/publishing.md`](../releases/publishing.md).

The two tracks interleave rather than queue. Documentation work and release
mechanics demand different kinds of attention, and they join at gate G6, where
the consumer project validates the snippets the site ships.
