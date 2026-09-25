# Blob Helper Maven Central Publishing Runbook

> **For agentic workers:** Work gate by gate. Do not publish, tag, commit, push,
> or change external state without Edem's explicit approval. Checkbox states are
> `[ ]` pending, `[~]` in progress, `[x]` complete.

**Status:** Approved runbook; implementation not started
**Last reviewed:** 2026-09-24
**Project:** Blob Helper
**Canonical location:** `blob-helper-docs/docs/releases/publishing.md`
**Scope decision:** see
[`docs/plans/2026-09-24-docs-site-and-release-alignment.md`](../plans/2026-09-24-docs-site-and-release-alignment.md)

## Goal

Publish Blob Helper as a normal Maven and Gradle dependency through the Sonatype
Central Portal, with complete metadata, signed artifacts, an explicit artifact
boundary, verified consumer examples, and a release process that cannot upload
by accident.

The first public release is `0.1.0`. It communicates that the public API is
usable but may still evolve before `1.0.0`.

Realistic budget for this runbook: **30–52 focused hours**, roughly eleven
working days when interleaved with the documentation site. The earlier estimate
of 80–156 hours assumed enterprise release ceremony that this revision defers;
see [Deferred to 0.2.0 and later](#deferred-to-020-and-later).

## Release principles

- Maven Central releases are immutable. Never overwrite, delete, or move a
  published coordinate; publish a new version for every correction.
- A green reactor build is necessary but does not prove the generated Central
  bundle is valid or usable by an external consumer.
- Dry runs must be structurally incapable of uploading.
- The first release requires manual approval in Central Portal.
- Publishing runs from an exact reviewed commit with a matching version and tag.
- Secrets and private signing material stay outside both repositories.
- Documentation shows only coordinates verified from an isolated consumer build.
- **Order gates by risk, not by governance.** Decisions are fast and
  predictable; mechanics are slow and surprising. Run the mechanical unknowns
  first so they fail cheaply.

## Ground truth as of 2026-09-24

Measured from `../blob-helper`, not assumed:

| Fact | Current value | Target |
|---|---|---|
| Reactor build | `BUILD SUCCESS`, 11/11 modules, 189 tests, 22.6s | unchanged |
| `groupId` | `com.edem` | verified Central namespace |
| `version` | `0.0.1-SNAPSHOT` | `0.1.0` |
| Java | 21 | 21 |
| Spring Boot | 4.1.1 | 4.1.x |
| Javadoc plugin | **not configured anywhere** | attached to all published JARs |
| Root POM metadata | `<url/>`, `<licenses/>`, `<developers/>`, `<scm/>` are empty stubs | fully populated |
| Branch | HEAD is a merge into `epic-006-structured-operational-logging` | `main` |
| Working tree | `.DS_Store`, 2 sqlite files, 4 ADR/PLAN files untracked | clean |

The fast reactor build is an asset: re-running every gate from a release
candidate costs seconds, so "re-verify from the release commit" is affordable
rather than aspirational.

## Artifact manifest

This table is the single authority for what is published. `excludeArtifacts`
matches on `artifactId`, and three of these names share a prefix, so ambiguity
here is the most likely way to publish the wrong thing to an immutable
repository.

| Artifact | Type | Contains | Central? |
|---|---|---|---|
| `blob-helper` | parent POM | properties, dependency management, build config | **yes** |
| `blob-helper-core` | library | content identity, dedup contracts, storage SPI | **yes** |
| `blob-helper-jpa` | library | metadata entities and repositories | **yes** |
| `blob-helper-storage-local` | library | local filesystem adapter | **yes** |
| `blob-helper-storage-s3` | library | AWS S3 / S3-compatible adapter | **yes** |
| `blob-helper-storage-azure` | library | Azure Blob Storage adapter | **yes** |
| `blob-helper-spring-boot-starter` | starter | auto-configuration, `BlobHelper` facade, all providers | **yes** |
| `blob-helper-spring-boot-management` | library | management API and metrics endpoints | **yes** |
| `blob-helper-spring-boot-dashboard` | library | **embedded** read-only dashboard resources | **yes** |
| `blob-helper-spring-boot-observability` | aggregate starter | transitively pulls management + embedded dashboard | **yes** |
| `blob-helper-dashboard` | **executable application** | **standalone** fleet dashboard process | **no — GitHub Releases** |

Parent plus nine JARs form one release train at one version.

Why the parent is published: Blob Helper's children inherit properties,
dependency management, and build configuration from it, so the POMs consumers
receive reference it and it must resolve. This is a consequence of the chosen
inheritance model, **not a Central rule** — Central does not universally require
a separately published parent. Flattened consumer POMs are a valid alternative
and are deliberately not adopted for `0.1.0`.

Why `blob-helper-spring-boot-observability` is a JAR despite having no code:
consumers install it as a normal starter dependency, so it still requires valid
sources and Javadoc classifier artifacts under Central's rules.

## Namespace and version

Preferred namespace:

```text
io.github.heyEdem
```

Before changing any POM, sign in to Central Portal with the `heyEdem` GitHub
account and record the exact verified namespace, **including case**. The
Portal's value wins over the spelling above.

Do not use `com.edem` unless Edem owns the corresponding DNS domain and
deliberately verifies it. Changing the Maven `groupId` does not require renaming
Java packages.

Version moves `0.0.1-SNAPSHOT` → `0.1.0` for the release commit, then to the
next snapshot after publication (`0.1.1-SNAPSHOT` for a patch cycle, or
`0.2.0-SNAPSHOT` for a feature cycle).

## Compatibility policy for the first release

- Minimum Java version: **Java 21**.
- Tested Spring Boot line: **4.1.x** (built and tested against 4.1.1).
- Supported adapters: local filesystem, AWS S3 / S3-compatible endpoints, Azure
  Blob Storage.
- State the claim precisely. "Built and tested against Spring Boot 4.1.1" and
  "compatible with every 4.1.x patch" are different promises. Publish only the
  first.
- The local filesystem adapter targets development, tests, or a deliberately
  shared filesystem. Independent local disks are not a distributed production
  topology.
- Blob Helper's public compatibility surface: public Java types, configuration
  property names and defaults, database migrations, management JSON, embedded
  dashboard paths, and documented exception behavior.
- An API compatibility baseline (Revapi or japicmp) is deferred; see
  [Deferred](#deferred-to-020-and-later). Breaking changes before `1.0.0` still
  require release notes and migration guidance.

---

## G0 — Resolve the unknowns first

**Effort: 2–4 hours.** Everything here is a discovery, not a decision. Run it on
day one so a surprise costs an afternoon instead of derailing a release week.

- [ ] Count the Javadoc errors across every module:

```bash
./mvnw --batch-mode --no-transfer-progress \
  org.apache.maven.plugins:maven-javadoc-plugin:3.12.0:javadoc \
  -Dmaven.javadoc.failOnError=false
```

  Pin the plugin coordinate explicitly and do not rely on a bare
  `javadoc:javadoc`. No Javadoc plugin is configured in any module today, so a
  bare invocation resolves whatever version Maven's default binding supplies —
  which is not the version and doclint settings G3 will pin, and can report a
  clean module that later fails hard. `failOnError=false` makes the run
  enumerate every error across all ten modules instead of stopping at the first.

  Confirm the output walks all ten modules, then record the total. Java 21
  doclint is strict by default: missing `@param`/`@return`, malformed HTML, and
  broken `@link` references all fail. This is the single largest hidden cost in
  the runbook, and it is discoverable in two minutes.

  Use the same pinned version in G3 so the count stays comparable. Verify 3.12.0
  is still current at implementation time; it was current on 2026-09-24.
- [ ] Sign in to `https://central.sonatype.com` with the publishing GitHub
  identity and create or verify the `io.github.heyEdem` namespace. Record its
  exact Portal spelling.
- [ ] Select the license. Recommended default: **Apache License 2.0** for its
  explicit patent grant. Use MIT only if Edem deliberately prefers shorter terms.
- [ ] Confirm `central-publishing-maven-plugin` `0.11.0` is still current at
  implementation time. Verified current on 2026-09-24.

**Exit gate:** the Javadoc debt is a known number, the namespace is verified with
exact spelling, and the license is chosen.

## G1 — Clean release inputs

**Effort: 4–8 hours.** Larger than it looks: "reconcile specification drift" is
product triage wearing a checkbox.

- [ ] Land `epic-006-structured-operational-logging` (and any other `0.1.0`
  work, including PR #46) on `main`, or deliberately close it.
- [ ] Start release work from an up-to-date `main`, not an epic branch.
- [ ] Add `.DS_Store`, `blob-helper-dashboard/*.sqlite`, and SQLite backup or
  journal files to `.gitignore`.
- [ ] Commit or intentionally discard the untracked planning files after review:
  `ADR-009`, `ADR-010`, `PLAN-012`, `PLAN-013`,
  `docs/integration-add-ons.md`, and
  `docs/plans/2026-09-03-zero-boilerplate-spring-integration-design.md`.
- [ ] Confirm no generated database, credential, IDE, or build output is tracked.
- [ ] Reconcile `README.md`, `docs/SPECIFICATION.md`, `docs/taskindex.md`, the
  ADRs, the changelog, and this docs repository so they describe the same
  shipped modules. The library repo's own docs are the drift risk, not the site.
- [ ] Resolve known specification drift: registration provider/API-version
  fields, embedded dashboard history wording, current-process versus
  shared-database metric scope, and already-implemented Liquibase behavior.
- [ ] Re-run the reactor and require `BUILD SUCCESS`:

```bash
./mvnw --batch-mode --no-transfer-progress clean verify
```

**Exit gate:** the intended release source is clean, reviewed, on `main`, and
every functional or specification issue accepted for `0.1.0` is resolved or
explicitly documented as a limitation.

## G2 — Release identity and project metadata

**Effort: 3–5 hours.** Merges the former Phases 1 and 2. These are decisions, so
they move fast once G0 supplied the namespace and license.

- [ ] Change `groupId` from `com.edem` to the exact verified namespace.
- [ ] Set the version to `0.1.0`.
- [ ] Replace the placeholder project name and description
  (`<name>blob-helper</name>`, `<description>blob-helper</description>`) with
  values that read well on a Central search page.
- [ ] Populate the empty `<url/>` stub with the documentation site URL, once
  GitHub Pages ownership is confirmed.
- [ ] Populate the empty `<licenses/>` stub: name, URL, distribution.
- [ ] Populate the empty `<developers/>` stub: name and any approved public
  contact or organization data.
- [ ] Populate the empty `<scm/>` stub:

```xml
<scm>
    <connection>scm:git:https://github.com/heyEdem/blob-helper.git</connection>
    <developerConnection>scm:git:ssh://git@github.com/heyEdem/blob-helper.git</developerConnection>
    <tag>v${project.version}</tag>
    <url>https://github.com/heyEdem/blob-helper</url>
</scm>
```

- [ ] Verify Maven interpolation resolves `<tag>` to the literal `v0.1.0` in the
  generated POM rather than leaving an unresolved expression.
- [ ] Add issue-management and CI-management URLs.
- [ ] Give every module a meaningful `<name>` and `<description>`.
- [ ] Add `project.reporting.outputEncoding` as UTF-8
  (`project.build.sourceEncoding` is already set).
- [ ] Set `project.build.outputTimestamp` from the tagged commit, not the wall
  clock, so archives are reproducible.
- [ ] Confirm generated POMs contain no empty elements or private URLs.
- [ ] Confirm every internal dependency resolves to the same release version.

**Exit gate:** effective POMs for the parent and every published child contain
valid, public, non-placeholder metadata.

## G3 — Build Central-compatible artifacts

**Effort: 4–8 hours.** Create a `release` profile that is inactive during
ordinary development and pins every release plugin version.

- [ ] Attach a sources JAR to every published JAR via `maven-source-plugin`.
- [ ] Attach a Javadoc JAR to every published JAR via `maven-javadoc-plugin`.
- [ ] Fix the Javadoc errors found in G0. Do not disable doclint globally.
- [ ] Sign POMs, main JARs, sources JARs, and Javadoc JARs with
  `maven-gpg-plugin` during release builds.
- [ ] Configure Maven Enforcer to reject snapshot project versions and snapshot
  dependencies in the release profile.
- [ ] Add a narrow dependency-convergence check for the generic starter,
  covering the libraries that genuinely cross the AWS and Azure SDK boundary:
  Netty, Jackson, Reactor, HTTP clients, SLF4J. This is a targeted check, not a
  project-wide policy framework.
- [ ] Configure `central-publishing-maven-plugin` `0.11.0`.

Required plugin shape. Two details here are easy to miss and both break the
release if omitted:

```xml
<plugin>
    <groupId>org.sonatype.central</groupId>
    <artifactId>central-publishing-maven-plugin</artifactId>
    <version>0.11.0</version>
    <!-- REQUIRED: without this the plugin does not bind to the deploy phase -->
    <extensions>true</extensions>
    <configuration>
        <publishingServerId>central</publishingServerId>
        <autoPublish>${central.autoPublish}</autoPublish>
        <skipPublishing>${central.skipPublishing}</skipPublishing>
        <excludeArtifacts>blob-helper-dashboard</excludeArtifacts>
        <waitUntil>validated</waitUntil>
    </configuration>
</plugin>
```

Safe property defaults — the dry run is safe because the default is safe, not
because the operator remembered a flag:

```xml
<properties>
    <central.skipPublishing>true</central.skipPublishing>
    <central.autoPublish>false</central.autoPublish>
    <!-- REQUIRED: the Central plugin replaces deploy; without this it runs twice -->
    <maven.deploy.skip>true</maven.deploy.skip>
</properties>
```

`maven.deploy.skip` must disable `maven-deploy-plugin` only — never the `deploy`
phase itself, which is how the Central plugin's extension binding runs at all.
Setting it at the wrong scope produces a build that reaches `deploy`, uploads
nothing, and looks exactly like a successful dry run. That is why G5's first
checkbox is the log line confirming publishing was skipped: it is the only signal
distinguishing "`skipPublishing` worked" from "the plugin never ran."

- [ ] Leave `checksums` at its default. The plugin generates what Central
  requires; this is plugin behavior, not a Blob Helper feature to maintain.
- [ ] Add a bundle-manifest verification step comparing the generated components
  against the [artifact manifest](#artifact-manifest). Ten lines of shell. This
  is the only check standing between a careless rename and a fat executable JAR
  published immutably to Central — keep it even though everything around it was
  cut.
- [ ] Verify no dependency-reduced or repackaged executable replaces a library
  artifact.

**Exit gate:** one release build produces every required classifier and signature
for exactly the approved components, and excludes the standalone dashboard.

## G4 — Portal credentials and signing

**Effort: 2–4 hours.**

- [ ] Generate a Central Portal **user token**; never use the account password.
- [ ] Add the token locally under server ID `central` in `~/.m2/settings.xml`:

```xml
<server>
    <id>central</id>
    <username>${env.CENTRAL_USERNAME}</username>
    <password>${env.CENTRAL_PASSWORD}</password>
</server>
```

- [ ] Generate or select a passphrase-protected OpenPGP signing key.
- [ ] Record the key fingerprint in private maintainer records.
- [ ] Publish the public key to a Central-supported server such as
  `keyserver.ubuntu.com`, `keys.openpgp.org`, or `pgp.mit.edu`.
- [ ] **Verify the public key can be retrieved independently by fingerprint.**
  Cheap, and it is the only thing that proves your signatures are verifiable by
  anyone other than you.
- [ ] Store the private key and passphrase outside source control.

Environment variables must be supplied securely and must never be written into
the repository. CI secret handling, protected GitHub Environments, and the key
rotation runbook are deferred — the first release is performed manually by the
maintainer, so there is no CI holding publishing credentials to protect.

**Exit gate:** the maintainer can sign artifacts and authenticate to Central with
no secret in any tracked file.

## G5 — Non-uploading dry run

**Effort: 3–5 hours.**

```bash
./mvnw --batch-mode --no-transfer-progress \
  -Prelease \
  -Dcentral.skipPublishing=true \
  clean deploy
```

`skipPublishing=true` builds the bundle locally and skips both upload and
publication. This is the documented behavior of the Central plugin and is exactly
what a dry run needs. Never document a bare `mvn deploy` as local validation.

- [ ] Confirm the log explicitly reports that uploading and publishing were
  skipped.
- [ ] Inspect the generated bundle at:

```text
target/central-publishing/central-bundle.zip
```

  Configurable via the plugin's `outputDirectory` and `outputFilename`.
- [ ] Confirm the parent POM is present.
- [ ] Confirm all nine approved JAR modules are present.
- [ ] Confirm `blob-helper-dashboard` is **absent**.
- [ ] Confirm every published JAR has matching sources and Javadoc JARs.
- [ ] Confirm every POM, JAR, and classifier has its detached `.asc` signature.
- [ ] Confirm checksums exist and validate.
- [ ] Verify at least one signature using the independently retrieved public key.
- [ ] Inspect JAR contents for secrets, SQLite files, IDE files, test fixtures,
  private configuration, or accidental executable nesting.
- [ ] Run `mvn help:effective-pom` for the parent and two representative
  children (one provider, one starter). Full per-module review is deferred.
- [ ] Run a dependency vulnerability scan and review reachable high/critical
  findings. Block on genuinely relevant ones; do not build a formal
  risk-acceptance process for a project with no users yet.

**Exit gate:** the exact signed bundle is locally inspectable, contains only the
approved artifacts, and nothing in this gate uploads it.

## G6 — Isolated consumer verification

**Effort: 8–12 hours.** The most underestimated gate, and the one that earns its
keep. A reactor build proves almost nothing about an external consumer.

Create disposable consumer projects **outside both repositories**. Do not rely on
reactor resolution or a populated local Maven cache.

- [ ] Build a Maven Spring Boot 4.1.x consumer depending only on
  `blob-helper-spring-boot-starter`.
- [ ] Verify local-provider startup, schema initialization, store, duplicate
  store, retrieve, retain, and release.
- [ ] Verify S3 and Azure configurations bind **without initializing the
  unselected provider** — no credential discovery, no client construction. This
  is the core promise of ADR-007 and the most likely place for it to be false.
- [ ] Verify `blob-helper-spring-boot-observability` transitively resolves
  management and embedded-dashboard modules, and that the embedded dashboard's
  static resources and API route load.
- [ ] Run a minimal **Gradle** consumer that resolves the same starter
  coordinate and compiles. Resolution smoke test only; full functional parity is
  not required, but the site promises a Gradle snippet, so the snippet must work.
- [ ] Use a fresh temporary local repository so no installed artifact can mask a
  missing published parent or transitive module:

```bash
./mvnw --batch-mode --no-transfer-progress \
  -Dmaven.repo.local="$(mktemp -d)" \
  clean verify
```

- [ ] **The consumer project is the snippet test.** Its `pom.xml` and
  `build.gradle` dependency blocks must be byte-identical to
  `blob-helper-docs/docs/includes/dep-maven.md` and `dep-gradle.md`. Copy in one
  direction only, from the verified consumer into the docs fragment.
- [ ] Record exact commands and results for the release record.

**Exit gate:** clean Maven and Gradle consumers resolve and exercise the public
installation paths with no reactor access, and the documented snippets are the
ones that were tested.

## G7 — Publish `0.1.0` and flip the documentation

**Effort: 4–6 hours plus Central propagation.**

- [ ] Freeze feature changes for the release candidate.
- [ ] Set all reactor components to `0.1.0`; confirm no `-SNAPSHOT` remains.
- [ ] Update the changelog, compatibility matrix, and migration notes.
- [ ] Re-run G5 and G6 from the release commit. The reactor takes 23 seconds;
  there is no excuse for skipping this.
- [ ] **Obtain Edem's explicit approval before committing, tagging, pushing, or
  uploading.**
- [ ] Create the reviewed release commit and the `v0.1.0` tag.
- [ ] Build from the tagged commit, not from a later working tree.
- [ ] Upload deliberately:

```bash
./mvnw --batch-mode --no-transfer-progress \
  -Prelease \
  -Dcentral.skipPublishing=false \
  -Dcentral.autoPublish=false \
  clean deploy
```

- [ ] Capture the Central deployment ID and validation result.
- [ ] If validation fails: drop the unpublished deployment, fix the source,
  re-run every gate, and obtain approval before replacing any tag. Never publish
  a partially reviewed bundle.
- [ ] If validation succeeds: review the Portal component list against the
  [artifact manifest](#artifact-manifest).
- [ ] **Obtain explicit approval for the irreversible Portal Publish action.**
- [ ] Publish manually in Central Portal.
- [ ] Wait until every component resolves from Maven Central. Propagation to
  search indexes lags repository availability; verify against the repository
  URL, not the search UI.
- [ ] Re-run the Maven and Gradle consumer tests against Central with no staging
  or local repository override.
- [ ] **Flip the documentation.** Edit exactly one file —
  `blob-helper-docs/docs/includes/coordinates.md` — to the released version and
  remove the "not yet published" admonition. CI redeploys the site.
- [ ] Publish the standalone `blob-helper-dashboard` executable JAR in the
  matching GitHub Release with a checksum and usage notes. Do not describe it as
  a Central library.
- [ ] Publish GitHub release notes and documentation links.
- [ ] Advance `main` to the next snapshot in a separate post-release change.

**Exit gate:** `0.1.0` is immutable, resolvable from Central, independently
verified, and the live documentation site shows the coordinates that were tested.

---

## Slim release record

Keep **one page** in the library repository per release. Not an audit dossier.

- Release version, commit SHA, tag.
- Central deployment ID and final state.
- Component manifest as published.
- Reactor test count and result.
- Bundle, checksum, and signature verification result.
- Maven and Gradle consumer results.
- Dependency scan result and anything knowingly accepted.
- Documentation site URL and build result.
- GitHub Release URL for the standalone dashboard.
- Known limitations and the version that will address them.

The record must not contain credentials, private key material, token IDs, or
sensitive environment output.

## Deferred to 0.2.0 and later

Each item below was in the previous revision of this runbook and was cut for the
first release. Each has a trigger that should revive it. Nothing here is
abandoned; it is sequenced.

| Deferred item | Revive when |
|---|---|
| Release automation on tag push (old Phase 8) | after one manual release has been performed and reviewed |
| Protected GitHub Environment with required reviewers | when CI, not the maintainer, holds Central credentials |
| SBOM generation | a consumer asks, or a supply-chain policy requires one |
| Revapi / japicmp API baseline | before claiming stable binary compatibility, i.e. approaching `1.0.0` |
| `mike` versioned documentation | at the first release that changes documented behavior |
| Per-module `help:effective-pom` review | on any release that changes the dependency graph materially |
| Full dashboard behavioral test suite | when the dashboard gains users beyond the maintainer |
| Key expiry and rotation runbook | before the signing key's first expiry, or on any key compromise |
| Formal vulnerability risk-acceptance process | when Blob Helper has downstream consumers with security review |
| Dependency-review CI gate on pull requests | when automated dependency-update PRs are enabled |
| Hosted browsable Javadoc site | when the API reference page is no longer sufficient |
| Personal website `/projects/blob-helper` page | after the docs site is live and stable |

Javadoc **JARs** remain mandatory for every published JAR regardless of whether a
browsable Javadoc site is ever hosted.

## Failure and rollback rules

- Before Portal publication: drop the invalid deployment and fix the source.
- After Portal publication: never replace the component; release a corrected
  patch version.
- If only documentation is wrong: fix the site immediately and decide separately
  whether release notes need a patch. This is the main practical benefit of
  keeping coordinates in one include — a docs-only error is a one-file fix.
- If a signing key is compromised: revoke it, publish the revocation, rotate
  secrets, and use a new key going forward. Published artifacts remain immutable.
- If a critical vulnerability is found: document impact, prepare a fixed release,
  and do not silently remove the affected version.
- If Central is unavailable: stop after producing verified local artifacts. Do
  not switch to an unreviewed publishing mechanism.

## Definition of done

- [ ] The exact namespace is verified with correct case.
- [ ] License, ownership, URLs, SCM, and required metadata are complete.
- [ ] The parent and all nine approved JAR modules are published at one version.
- [ ] The standalone dashboard is absent from Central and available from the
  documented GitHub Release path.
- [ ] Sources, Javadocs, signatures, and checksums are present and valid.
- [ ] No secret or generated file is present in any artifact.
- [ ] Clean Maven and Gradle consumers resolve from Central.
- [ ] The documentation site shows tested coordinates and states compatibility
  and distributed-system limitations accurately.
- [ ] Changelog, release record, and GitHub release notes are published.
- [ ] `main` has advanced to the next snapshot.

## Official references

- [Register a Central Portal namespace](https://central.sonatype.org/register/namespace/)
- [Publish with Maven through Central Portal](https://central.sonatype.org/publish/publish-portal-maven/)
- [Maven Central component requirements](https://central.sonatype.org/publish/requirements/)
- [PGP signing and public-key distribution](https://central.sonatype.org/publish/requirements/gpg/)
- [Maven Central immutability policy](https://central.sonatype.org/publish/requirements/immutability/)

## Revision history

- **2026-09-24:** Restructured ten phases into seven risk-ordered gates.
  Corrected the bundle path to `target/central-publishing/central-bundle.zip`;
  added the required `<extensions>true</extensions>` and `maven.deploy.skip`;
  added `waitUntil`; softened the incorrect claim that Central mandates a
  published parent POM; removed the four-checksum policy as a project feature;
  added the artifact manifest table; added G0 to surface Javadoc debt on day one;
  recorded measured ground truth from the library repository; moved twelve items
  to a Deferred table with revival triggers; replaced the release-evidence
  dossier with a one-page record. Estimate revised from 80–156 to 30–52 focused
  hours.
- **2026-09-08:** Incorporated publication-readiness corrections: made the parent
  POM mandatory, added embedded-dashboard and observability artifacts, separated
  the standalone dashboard distribution, made dry-run upload safety explicit,
  added namespace verification, public-key distribution, reproducibility,
  isolated consumer tests, release evidence, automation safety, and immutable
  rollback rules.
