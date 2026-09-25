# Library Rename: Blob Helper → dedup4j — Decision Record

**Status:** Accepted
**Date:** 2026-09-25
**Project:** dedup4j (formerly Blob Helper)
**Affects:** `2026-09-01-blob-helper-docs-design.md` §11, `docs/releases/publishing.md`
gate G0, and every module in `../blob-helper`

## Context

`blob-helper` names the category, not the differentiator. Deduplicated blob
storage is the product; "helper" says nothing and is unsearchable.

The rename had to happen now or never. Maven Central coordinates are immutable:
once `com.edem:blob-helper-core:0.1.0` exists it is permanent, and a later
rename means maintaining two artifact lineages forever. Nothing is published,
so the change currently costs a refactor rather than a support surface.

## Decision

The library is **`dedup4j`**.

| | Before | After |
|---|---|---|
| Repository | `heyEdem/blob-helper` | `heyEdem/dedup4j` |
| Docs repository | `blob-helper-docs` | `dedup4j-docs` |
| Pages URL | — | `heyEdem.github.io/dedup4j-docs/` |
| Base package | `com.edem.blobhelper` | `com.edem.dedup4j` |
| Artifact prefix | `blob-helper-*` | `dedup4j-*` |
| Facade interface | `BlobHelper` | `BlobStore` |

`groupId` stays `com.edem` pending namespace verification in gate G0.

The facade is deliberately **not** named `Dedup4j`. A version suffix reads badly
in application code; `blobStore.store(file)` states what the call does, and the
artifact name carries the branding.

## Availability

Checked against Maven Central and GitHub on 2026-09-25 before selection.
`dedup4j` returned zero Maven Central hits and the GitHub name was free.

Rejected on availability: `cairn` (1 Maven hit, GitHub name taken), `ingot`
(4 hits, taken), `bytevault` and `castore` (GitHub names taken).

Rejected on collision: `oncestore` — HPE ships **StoreOnce**, a commercial
deduplication appliance. The same two words in the same problem domain is a
search-result collision even though Central would permit it.

Considered and rejected: `sameblob` (more brandable, weaker on search terms)
and `blobdedup` (maximally literal, clumsy to say).

The `4j` suffix was judged live rather than dated — `resilience4j` (2016) is the
precedent, not `log4j`.

## Consequences

The rename is a separate execution pass in `../blob-helper` and must land
**before gate G0**, because G0 resolves the Central namespace and G0 onwards
treats coordinates as fixed. Scope:

- Ten module directories and ten `artifactId` values.
- The `com.edem.blobhelper` package tree across main and test sources.
- The `BlobHelper` facade interface and its implementation.
- `blob-helper.*` configuration property prefix → `dedup4j.*`.
- `README.md`, `docs/SPECIFICATION.md`, `docs/taskindex.md`, and the ADRs.

**Acceptance: `./mvnw clean verify` stays green at 11/11 modules and 189
tests.** A rename that changes the test count has changed behaviour.

The configuration property prefix is the one user-visible rename with no
migration path, and it is free only because there are no consumers yet.

## Open

The docs repository name `dedup4j-docs` follows from keeping documentation
deployment independent (design §3). Publishing Pages from the library repository
instead would free the `dedup4j` Pages URL, at the cost of coupling docs
deploys to the library repository. Not adopted; recorded as the live
alternative.
