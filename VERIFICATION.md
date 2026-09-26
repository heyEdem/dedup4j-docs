# Post-Rename Verification

**Purpose:** every claim this documentation site makes about dedup4j that
depends on the library rename landing correctly. The docs were written against
the *agreed* names while `../blob-helper` was still being renamed, so this file
is the reconciliation between the two.

**Read this as:** the docs are currently ahead of the library. That is
deliberate (decision D3 — documentation ships before the release), but it means
nothing here is true until verified.

**Last reconciled:** 2026-09-26 (rename completed and verified; sections A and B closed)
**Library HEAD at reconciliation:** `ae945a5 refactor: rename facade to BlobStore and finish string-literal rename` (committed locally, not pushed)

Run everything from the library repository unless stated otherwise.

---

## A. Rename completeness

These are library-side. None are documentation problems; all of them make
documentation wrong if left undone.

| # | Item | Verify | Status |
|---|---|---|---|
| A1 | Facade renamed to `BlobStore` | directory now shows `BlobStore.java` | ✅ done |
| A2 | Implementation renamed | `DefaultBlobStore.java` present | ✅ done |
| A3 | Bean method renamed | now `BlobStore blobStore(...)` | ✅ done |
| A4 | All modules renamed | reactor is all `dedup4j-*`; a stray `blob-helper-dashboard/` dir holds only 2 untracked SQLite runtime files | ✅ done |
| A5 | Old package tree gone | 10 empty leftover dirs removed | ✅ done |
| A6 | Artifact IDs renamed | returns 0 | ✅ done |

## B. String literals

Identifier refactoring does not touch string bodies. Each of these is
user-visible, and the schema names become **immutable in practice** once
`0.1.0` publishes — changing them later is a breaking migration for every
consumer.

| # | Literal | Location | Impact | Status |
|---|---|---|---|---|
| B1 | `blob_helper_asset_content` | `dedup4j-jpa/.../AssetContent.java` | **Table name.** Highest stakes item in this file | ✅ done |
| B2 | `uk_blob_helper_asset_content_identity` | same | Unique constraint name | ✅ done |
| B3 | `idx_blob_helper_asset_content_{hash,object_key,ref_count}` | same | Index names | ✅ done |
| B4 | `classpath:db/blob-helper/db.changelog-master.yaml` | `Dedup4jSchemaValidator.java` | Liquibase changelog path | ✅ done |
| B5 | `Path.of("blob-helper-storage")` | `LocalBlobStorageProperties.java` | Default local storage directory | ✅ done |
| B6 | `./blob-helper-dashboard.sqlite` | dashboard `application.yaml`, `DashboardDatabaseProperties.java` | Default dashboard DB filename | ✅ done |
| B7 | `BLOB_HELPER_DATABASE_CHANGELOG` | `Dedup4jPersistenceAutoConfiguration` | **Liquibase changelog table.** Renaming after release strands migration history | ✅ done |
| B8 | `BLOB_HELPER_DATABASE_CHANGELOG_LOCK` | same | Liquibase lock table | ✅ done |
| B9 | `blob_helper_asset_content` in the schema-missing error message | `Dedup4jSchemaValidator` | User-facing error text | ✅ done |

One sweep covers the lot:

```bash
grep -rn "blob-helper\|blob_helper\|blobhelper" \
  --include="*.java" --include="*.sql" --include="*.yml" \
  --include="*.yaml" --include="*.properties" --include="*.imports" \
  --include="*.xml" . | grep -v "/target/"
```

> [!WARNING]
> `META-INF/spring/*.AutoConfiguration.imports` deserves specific attention.
> A stale entry silently disables auto-configuration, and `mvnw verify` can
> still pass if no test asserts bean presence.

## C. Claims made by the documentation site

Each row is something a published page asserts. If the library disagrees, the
page is wrong and must change — not the other way round.

| # | Claim | Page | Verify | Status |
|---|---|---|---|---|
| C1 | Users inject `BlobStore` | Quick start §2, §3 | type now exists; still not compiled by a consumer | ⬜ awaiting G6 |
| C2 | `BlobStore` exposes only `store` / `storeAll` | Quick start §2 | read the interface | ✅ true today |
| C3 | `retain` / `release` / `get` / `location` are on `BlobDeduplicationService` | Quick start §2, §6 | read the interface | ✅ true today |
| C4 | `BlobDeduplicationService` is an auto-configured public bean | Quick start §2 | `@ConditionalOnMissingBean` in `Dedup4jServiceAutoConfiguration` | ✅ verified |
| C5 | `BlobReference` exposes `assetContentId()`, `contentHash()`, `duplicate()` | Quick start §3, §4 | read the record | ✅ verified |
| C6 | `BlobResource` implements `AutoCloseable` | Quick start §5 | read the record | ✅ verified |
| C7 | `provider` accepts `local` / `s3` / `azure` | Quick start §1, Installation | `@ConditionalOnProperty havingValue` in the three storage auto-configurations | ✅ verified |
| C8 | `initialize-schema: EMBEDDED` initialises only for embedded datasources | Quick start §1 | `EmbeddedDatabaseConnection.isEmbedded(dataSource)` in `Dedup4jPersistenceAutoConfiguration` | ✅ verified |
| C9 | Config prefix is `dedup4j.*` | Quick start §1 | `@ConfigurationProperties(prefix = "dedup4j")` | ✅ verified |
| C10 | An unselected provider constructs no client and resolves no credentials | Installation, Quick start §1 | **must be proven from an external consumer** — gate G6 | ⬜ asserted, not proven |
| C11 | Ten artifacts publish to Central; `dedup4j-dashboard` does not | Installation | release runbook artifact manifest | ✅ matches manifest |
| C12 | Built and tested against Spring Boot 4.1.1 | Home, Installation | root POM `spring-boot.version` | ✅ verified |
| C13 | Java 21 or later | Home, Installation | root POM `java.version` | ✅ verified |
| C34 | Write order is object store first, database second | Architecture | `DefaultBlobDeduplicationService.storeNewContent` | ✅ verified |
| C35 | Concurrent identical uploads resolve via `createOrRetain` | Architecture | same method | ✅ verified |
| C36 | S3 keys are `dedup4j.storage.s3.endpoint` / `.path-style` | Providers, Configuration | `Dedup4jProperties.S3` + `S3BlobStorageAutoConfiguration` mapping | ✅ verified — **docs were wrong, corrected** |
| C37 | `BlobLocation` component is `provider` | API, Lifecycle | `BlobLocation` record | ✅ verified — **docs were wrong, corrected** |
| C38 | Missing bucket/container fails at startup with a named message | Troubleshooting | `IllegalStateException` in S3/Azure auto-config | ✅ verified |
| C39 | Schema is applied with Liquibase | Troubleshooting, Spring Boot | `SpringLiquibase` in persistence auto-config | ✅ verified |
| C40 | Build is 11 modules / **190** tests | Contributing | measured before and after the rename; the 189 in the alignment record is superseded | ✅ verified |
| C31 | Hash algorithm is SHA-256 | Uploading | `Sha256ContentHasher` | ✅ verified |
| C32 | `max-upload-size` defaults to 25 MB and is enforced | Uploading | `DefaultDedup4j` | ✅ verified |
| C33 | `ReconciliationService` needs manual construction | Lifecycle | no auto-configuration | ✅ verified |
| C14 | Final `release` deletes the object immediately, in-transaction | Quick start §6, Lifecycle | `ReferenceCountService.release` → `storage.delete` at zero | ✅ verified — **docs were wrong, corrected** |
| C15 | A duplicate `store` **increments** the reference count | Uploading, Lifecycle, Quick start | `DefaultBlobDeduplicationService.store` → `retainDuplicate` → `retain` | ✅ verified — **docs were wrong, corrected** |
| C16 | New content is created at `refCount = 1` | Uploading, Lifecycle | `AssetContent.refCount = 1L` | ✅ verified |
| C17 | Under-release throws `ReferenceCountUnderflowException` | Lifecycle, Quick start | `ReferenceCountService.release` guard | ✅ verified |
| C18 | `retain`/`release` hold a pessimistic row lock | Lifecycle | `findForUpdate`, class Javadoc | ✅ verified |
| C19 | Content identity is `(algorithm, hash, sizeBytes)` | Uploading | `ContentHash` record | ✅ verified |
| C20 | Six auto-configuration classes | Spring Boot | `META-INF/spring/*.AutoConfiguration.imports` | ✅ verified |
| C21 | Every bean is `@ConditionalOnMissingBean`-overridable | Spring Boot | `Dedup4jServiceAutoConfiguration` | ✅ verified |
| C22 | `reconcile` is read-only; repair is opt-in | Lifecycle | `ReconciliationService` Javadoc + `repairEnabled` | ✅ verified |
| C23 | Nine `dedup4j.*` metrics, names as listed | Observability | `Dedup4jMetrics` string literals | ✅ verified |
| C24 | `dedup4j.management.enabled` defaults to `false` | Observability | `Dedup4jManagementProperties` | ✅ verified |
| C25 | `dedup4j.dashboard.enabled` defaults to `true`, lookback `7d` | Observability | `Dedup4jDashboardProperties` | ✅ verified |
| C26 | Standalone dashboard binds `127.0.0.1`, no auth | Observability | `DEFAULT_ADDRESS`, `application.yaml` | ✅ verified |
| C27 | S3 adapter exposes no credentials property | Providers | `S3BlobStorageProperties` has no credential fields | ✅ verified |
| C28 | `BlobStorage` SPI is four methods | Providers | `dedup4j-core/.../BlobStorage.java` | ✅ verified |
| C29 | Local provider is intended for a single node | Providers | not code-enforced; page reworded to match this hedge | ✅ page matches evidence |
| C30 | `storeAll` is partial-success with a sealed outcome type | Uploading | `BatchStoreOutcome` sealed interface | ✅ verified |

## C-bis. Library findings surfaced by writing the docs

Not documentation bugs — library observations that writing the pages exposed.
Each is a decision for the maintainer, not something the site can fix.

| # | Finding | Evidence | Suggested action |
|---|---|---|---|
| F1 | `dedup4j.cleanup.*` is bound but **never read**. `delete-physical-on-zero-references` disables nothing; deletion at zero is unconditional | zero main-code readers of `getCleanup()` | wire it, or drop the properties before `0.1.0` freezes them |
| F2 | `dedup4j.deduplication.hash-algorithm` is bound but ignored — `contentHasher()` returns `new Sha256ContentHasher()` unconditionally | `Dedup4jServiceAutoConfiguration` | honour it, or remove it and document SHA-256 as fixed |
| F3 | `dedup4j.deduplication.strict-content-type-validation` has no main-code reader | grep | same as F1 |
| F4 | `ReconciliationService` is **not auto-configured** — no `@Bean` anywhere | no `new ReconciliationService` in main | add a conditional bean, or document manual construction (docs currently do the latter) |
| F5 | `max-upload-size` defaults to 25 MB and content is read fully into memory to hash | `DefaultDedup4j` line 113 | fine, but the memory cost should be stated in the docs |
| F6 | `DuplicateContentIdentityException` extends `RuntimeException`, not `Dedup4jException` | class declaration | make it consistent, or a blanket catch of `Dedup4jException` misses it |
| F7 | `BlobReference.storageProvider` vs `BlobLocation.provider` name the same concept differently | both records | harmless, but free to align before release |

> [!IMPORTANT]
> F1–F3 are **configuration properties that do nothing**. Published in `0.1.0`
> they become a permanent contract that the library does not honour. Removing
> them after publication is a breaking change; removing them now costs nothing.

## D. Acceptance gates

| # | Gate | Command | Status |
|---|---|---|---|
| D1 | Build stays green | `BUILD SUCCESS` on 2026-09-26 | ✅ verified |
| D2 | **Test count unchanged at 190** | 190 before the rename, 190 after, 0 failures | ✅ verified |
| D3 | Module count unchanged at 11 | reactor summary | ✅ verified |
| D4 | Site still builds | `mkdocs build --strict` in this repo | ✅ green |
| D5 | Examples actually compile | isolated consumer project — gate G6 | ⬜ not run |

## E. Documentation edits owed once the rename lands

Nothing here is blocked; all of it is mechanical once A and B are done.

- [x] Re-read every code example against the renamed source.
- [x] Re-run `./mvnw clean verify` — 11 modules / 190 tests, green.
- [x] `reference/configuration.md` now documents the renamed defaults.
- [ ] `guides/spring-boot.md` — confirm the auto-configuration class names.
- [ ] `docs/includes/coordinates.md` — `groupId` at gate G0.
- [ ] Remove the "not yet on Maven Central" admonition at gate G7.

---

## Legend

✅ verified against source · ❌ known outstanding · ⬜ unverified

A `✅` means someone read the code, not that it looked plausible.
