# dedup4j Maven Central Publishing Runbook

> **For agentic workers:** Work gate by gate. Do not publish, tag, commit, push,
> or change external state without Edem's explicit approval. Checkbox states are
> `[ ]` pending, `[~]` in progress, `[x]` complete.

**Status:** G0 complete; G1–G3 implemented on library branch
`chore/release-0.1.0-prep` (not pushed); G4–G6 passed locally; G7 not started
**Last reviewed:** 2026-10-20
**Project:** dedup4j (formerly Blob Helper)
**Canonical location:** `blob-helper-docs/docs/releases/publishing.md`
**Scope decision:** see
[`docs/plans/2026-09-24-docs-site-and-release-alignment.md`](../plans/2026-09-24-docs-site-and-release-alignment.md)
and the rename record
[`docs/plans/2026-09-25-library-rename-to-dedup4j.md`](../plans/2026-09-25-library-rename-to-dedup4j.md)

## Goal

Publish dedup4j as a normal Maven and Gradle dependency through the Sonatype
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

## Ground truth as of 2026-10-19

Measured from `../blob-helper` (`main` at `9a7d5b2`, plus the
`chore/release-0.1.0-prep` branch), not assumed:

| Fact | Current value | Target |
|---|---|---|
| Reactor build | `BUILD SUCCESS`, 11/11 modules, 303 tests, 0 failures | unchanged |
| `groupId` | `io.github.heyedem` on the prep branch (`com.edem` on `main`) | `io.github.heyedem` |
| `version` | `0.0.1-SNAPSHOT` | `0.1.0` (set in the G7 release commit) |
| Java | 21 | 21 |
| Spring Boot | 4.1.1 | 4.1.x |
| Maven (wrapper) | 3.9.16 | 3.9.x |
| Javadoc | 3.12.0, 0 errors, 453 warnings (G0, all 11 modules); attached in the `release` profile | attached to all published JARs |
| Root POM metadata | populated on the prep branch; developer `<name>` still missing | fully populated |
| License | Apache License 2.0, top-level `LICENSE` added on the prep branch | same |
| Branch | `main` at `9a7d5b2` (PR #62 merged); release prep on `chore/release-0.1.0-prep` | `main` |
| Working tree | clean; `.DS_Store`, SQLite and H2 files, `blob-helper-dashboard/` leftovers are ignored | clean |

The fast reactor build is an asset: re-running every gate from a release
candidate costs little, so "re-verify from the release commit" is affordable
rather than aspirational.

### Release plugin versions (verified on Maven Central 2026-10-19)

| Plugin | Version | Notes |
|---|---|---|
| `org.sonatype.central:central-publishing-maven-plugin` | `0.12.0` | released 2026-10-13; first version with `skipUpload` |
| `maven-source-plugin` | `3.4.0` | `jar-no-fork`; 4.0.0-beta targets Maven 4 |
| `maven-javadoc-plugin` | `3.12.0` | same version as the G0 count |
| `maven-gpg-plugin` | `3.2.8` | `bestPractices=true` |
| `maven-enforcer-plugin` | `3.6.3` | already used by the reactor |
| `maven-jar-plugin` | `3.5.0` (Maven 3.9.16 default binding) | static Javadoc JAR for the observability starter |

## Artifact manifest

This table is the single authority for what is published. `excludeArtifacts`
matches on `artifactId`, and two of these names share a prefix
(`dedup4j-dashboard`, `dedup4j-spring-boot-dashboard`), so ambiguity here is the
most likely way to publish the wrong thing to an immutable repository.

Verified 2026-10-19 by disassembling `central-publishing-maven-plugin` 0.12.0:
`excludeArtifacts` is checked with `List.contains(artifact.getArtifactId())`, an
**exact** match, so excluding `dedup4j-dashboard` cannot exclude
`dedup4j-spring-boot-dashboard`.

All coordinates use groupId `io.github.heyedem`.

| Artifact | Type | Contains | Central? |
|---|---|---|---|
| `dedup4j` | parent POM | properties, dependency management, build config | **yes** |
| `dedup4j-core` | library | content identity, dedup contracts, storage SPI | **yes** |
| `dedup4j-jpa` | library | metadata entities and repositories, upload history store | **yes** |
| `dedup4j-storage-local` | library | local filesystem adapter | **yes** |
| `dedup4j-storage-s3` | library | AWS S3 / S3-compatible adapter | **yes** |
| `dedup4j-storage-azure` | library | Azure Blob Storage adapter | **yes** |
| `dedup4j-spring-boot-starter` | starter | auto-configuration, `BlobStore` facade, Liquibase migrations, all providers | **yes** |
| `dedup4j-spring-boot-management` | library | management API and metrics endpoints | **yes** |
| `dedup4j-spring-boot-dashboard` | library | **embedded** read-only dashboard resources | **yes** |
| `dedup4j-spring-boot-observability` | aggregate starter | transitively pulls management + embedded dashboard | **yes** |
| `dedup4j-dashboard` | **executable application** | **standalone** fleet dashboard process | **no — GitHub Releases** |

Parent plus nine JARs form one release train at one version.

Why the parent is published: dedup4j's children inherit properties, dependency
management, and build configuration from it, so the POMs consumers receive
reference it and it must resolve. This is a consequence of the chosen
inheritance model, **not a Central rule** — Central does not universally require
a separately published parent. Flattened consumer POMs are a valid alternative
and are deliberately not adopted for `0.1.0`.

Why `dedup4j-spring-boot-observability` is a JAR despite having no code:
consumers install it as a normal starter dependency, so it still requires valid
sources and Javadoc classifier artifacts under Central's rules. Its sources JAR
carries a documented `package-info.java`
(`com.edem.dedup4j.observability.starter`); `javadoc` refuses to run on a module
with no public classes, so its release profile skips the Javadoc tool and packages
a static `src/main/javadoc/index.html` as the `-javadoc.jar` instead.

How `dedup4j-dashboard` is kept out, three independent layers:

1. Parent `excludeArtifacts` lists `dedup4j-dashboard` (exact match).
2. The module's own `release` profile sets a **literal**
   `<skipPublishing>true</skipPublishing>`, so no `-D` flag can re-include it.
3. The module sets `maven.source.skip`, `maven.javadoc.skip`, and `gpg.skip`, so
   it never produces sources, Javadoc, or signatures.

## Namespace and version

Verified namespace, exact Central Portal spelling:

```text
io.github.heyedem
```

The Portal spelling is lowercase and wins over the earlier `io.github.heyEdem`
proposal. Java packages stay `com.edem.dedup4j.*`; changing the Maven `groupId`
does not require renaming Java packages.

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
- dedup4j's public compatibility surface: public Java types, configuration
  property names and defaults, database migrations, management JSON, embedded
  dashboard paths, and documented exception behavior.
- An API compatibility baseline (Revapi or japicmp) is deferred; see
  [Deferred](#deferred-to-020-and-later). Breaking changes before `1.0.0` still
  require release notes and migration guidance.

---

## G0 — Resolve the unknowns first

**Effort: 2–4 hours.** Everything here is a discovery, not a decision. Run it on
day one so a surprise costs an afternoon instead of derailing a release week.

- [x] Count the Javadoc errors across every module:

```bash
./mvnw --batch-mode --no-transfer-progress \
  org.apache.maven.plugins:maven-javadoc-plugin:3.12.0:javadoc \
  -Dmaven.javadoc.failOnError=false
```

  Pin the plugin coordinate explicitly and do not rely on a bare
  `javadoc:javadoc`, which resolves whatever version Maven's default binding
  supplies. `failOnError=false` makes the run enumerate every error across all
  modules instead of stopping at the first.

  **Result (2026-10-19): all 11 modules walked, 0 errors, 453 warnings.** The
  `release` profile pins the same 3.12.0, and its per-module `javadoc:jar` run
  also finished with 0 errors.
- [x] Sign in to `https://central.sonatype.com` with the publishing GitHub
  identity and create or verify the namespace. **Exact Portal spelling:
  `io.github.heyedem`.**
- [x] Select the license. **Decision: Apache License 2.0** for its explicit
  patent grant.
- [x] Confirm the `central-publishing-maven-plugin` version. 0.11.0 was current
  on 2026-09-24; **0.12.0 (2026-10-13) is current on 2026-10-19 and is adopted**.
  It adds `skipUpload` and corrects the documented meaning of `skipPublishing`
  (see G3).

**Exit gate:** the Javadoc debt is a known number, the namespace is verified with
exact spelling, and the license is chosen. **Met.**

## G1 — Clean release inputs

**Effort: 4–8 hours.** Larger than it looks: "reconcile specification drift" is
product triage wearing a checkbox.

- [x] Land `epic-006-structured-operational-logging` (PR #46) and other `0.1.0`
  work on `main`. PR #46 and PR #62 are merged; `main` is at `9a7d5b2`.
- [x] Start release work from an up-to-date `main`, not an epic branch. Branch
  `chore/release-0.1.0-prep` was cut from `main` at `9a7d5b2`.
- [x] Ignore `.DS_Store`, SQLite databases with their journals and backups, H2
  files (`*.mv.db`, `*.trace.db`), and the pre-rename `/blob-helper-dashboard/`
  runtime directory in `.gitignore`. `git ls-files -ci --exclude-standard` shows
  no tracked file newly ignored.
- [x] Commit or discard the untracked planning files after review: `ADR-009`,
  `ADR-010`, `PLAN-012`, `PLAN-013`, `docs/integration-add-ons.md`, and
  `docs/plans/2026-09-03-zero-boilerplate-spring-integration-design.md` are all
  tracked on `main`.
- [x] Confirm no generated database, credential, IDE, or build output is tracked.
  Only `.idea/`, `.superpowers/`, `HELP.md`, `target/`, and the two
  `blob-helper-dashboard/*.sqlite*` files exist locally, and all are ignored.
  The root `src/` holds a leftover Spring Initializr `Dedup4jApplication` and
  test. It is tracked, but the parent has `pom` packaging, so it is never built or
  published. Edem should decide whether to delete it.
- [ ] Reconcile `README.md`, `docs/SPECIFICATION.md`, `docs/taskindex.md`, the
  ADRs, the changelog, and this docs repository so they describe the same
  shipped modules. Known drift: the library `README.md` and the site's
  `src/docs/_includes/coordinates.md`, `dep-maven.md`, and `dep-gradle.md` still
  show groupId `com.edem`. Update the site includes only from the verified G6
  consumer.
- [ ] Resolve known specification drift: registration provider/API-version
  fields, embedded dashboard history wording, current-process versus
  shared-database metric scope, and already-implemented Liquibase behavior.
- [x] Re-run the reactor and require `BUILD SUCCESS`: 303 tests, 0 failures,
  0 errors, on the prep branch (2026-10-19). Testcontainers needs Docker; with
  OrbStack, set
  `DOCKER_HOST=unix://$HOME/.orbstack/run/docker.sock TESTCONTAINERS_RYUK_DISABLED=true`.

```bash
./mvnw --batch-mode --no-transfer-progress clean verify
```

**Exit gate:** the intended release source is clean, reviewed, on `main`, and
every functional or specification issue accepted for `0.1.0` is resolved or
explicitly documented as a limitation.

## G2 — Release identity and project metadata

**Effort: 3–5 hours.** Merges the former Phases 1 and 2. These are decisions, so
they move fast once G0 supplied the namespace and license.

- [x] Change `groupId` from `com.edem` to `io.github.heyedem` in the parent, all
  children, and every internal dependency. `ProviderDependencyBoundaryTest`
  coordinates updated to match.
- [ ] Set the version to `0.1.0`. Deferred to the G7 release commit; the prep
  branch stays `0.0.1-SNAPSHOT`.
- [x] Replace the placeholder project name and description with values that
  read well on a Central search page (parent and every module).
- [x] Populate `<url>`. **Currently `https://github.com/heyEdem/dedup4j`.** The
  site's declared canonical domain `dedup4j.churchillakomaning.online` still
  resolves (CNAME `heyedem.github.io`) to the old GitHub Pages build, while the
  current React site is served at `dedup4j-docs.vercel.app`. Switch `<url>` to the
  docs domain once DNS points at Vercel, before the release commit.
- [x] Populate `<licenses>`: Apache License, Version 2.0,
  `https://www.apache.org/licenses/LICENSE-2.0.txt`, distribution `repo`.
- [~] Populate `<developers>`. A clearly marked placeholder with
  `<id>heyEdem</id>` and `<url>https://github.com/heyEdem</url>` is in place.
  **Release blocker:** Edem must add `<name>` (and any approved public email or
  organization). Central's component requirements call for developer
  information including a name; treat a nameless developer as a validation risk.
- [x] Populate `<scm>`:

```xml
<scm child.scm.connection.inherit.append.path="false"
     child.scm.developerConnection.inherit.append.path="false"
     child.scm.url.inherit.append.path="false">
    <connection>scm:git:https://github.com/heyEdem/dedup4j.git</connection>
    <developerConnection>scm:git:ssh://git@github.com/heyEdem/dedup4j.git</developerConnection>
    <tag>v${project.version}</tag>
    <url>https://github.com/heyEdem/dedup4j</url>
</scm>
```

  The `child.*.inherit.append.path="false"` attributes, plus
  `child.project.url.inherit.append.path="false"` on `<project>`, stop Maven
  appending `/<artifactId>` to inherited URLs. Without them every child would
  advertise a broken URL such as `…/dedup4j.git/dedup4j-core`.
- [x] Verify Maven interpolation resolves `<tag>` to a literal. The effective
  starter POM shows `<tag>v0.0.1-SNAPSHOT</tag>`, which becomes `v0.1.0` at
  release.
- [x] Add issue-management (GitHub Issues) and CI-management (GitHub Actions)
  URLs.
- [x] Give every module a meaningful `<name>` and `<description>`.
- [x] Add `project.reporting.outputEncoding` as UTF-8.
- [~] Set `project.build.outputTimestamp`. It is set to a fixed
  `2026-10-19T00:00:00Z`, so archives are already reproducible. Update it to the
  release commit's timestamp in the G7 release commit.
- [x] Confirm generated POMs contain no empty elements or private URLs. Effective
  POMs checked for the parent, `dedup4j-storage-s3`,
  `dedup4j-spring-boot-starter`, and `dedup4j-spring-boot-observability`: no
  empty elements, no unresolved `${…}`, and only public GitHub, Apache, and Maven
  Central URLs.
- [x] Confirm every internal dependency resolves to the same release version
  (all use `${project.version}`).

**Exit gate:** effective POMs for the parent and every published child contain
valid, public, non-placeholder metadata. **Open:** developer name, and the docs
URL decision.

## G3 — Build Central-compatible artifacts

**Effort: 4–8 hours.** The `release` profile in the parent POM is inactive
during ordinary development and pins every release plugin version. A default
`clean verify` produces no `-sources.jar` or `-javadoc.jar` (checked 2026-10-19).

- [x] Attach a sources JAR to every published JAR via `maven-source-plugin`
  3.4.0 (`jar-no-fork`).
- [x] Attach a Javadoc JAR to every published JAR via `maven-javadoc-plugin`
  3.12.0 (`jar`). The observability starter uses a static Javadoc JAR; see the
  [artifact manifest](#artifact-manifest).
- [x] Fix the Javadoc errors found in G0. There were none. Doclint is **not**
  disabled: warnings are allowed, errors fail the build.
- [~] Sign POMs, main JARs, sources JARs, and Javadoc JARs with
  `maven-gpg-plugin` 3.2.8 (`sign` at `verify`, `bestPractices=true`).
  Configured, but not yet exercised with a real key (G4).
  - Default signer `gpg`. It uses the local GnuPG keyring, with the passphrase
    from gpg-agent or the `MAVEN_GPG_PASSPHRASE` environment variable, and works
    non-interactively in batch mode.
  - Alternative: `-Dgpg.signer=bc`, Bouncy Castle with no GnuPG install. It
    needs the exported secret key (TSK format) in `MAVEN_GPG_KEY` plus
    `MAVEN_GPG_PASSPHRASE`, and `MAVEN_GPG_KEY_FINGERPRINT` if the key holds
    several subkeys.
  - `bestPractices=true` fails the build if the passphrase arrives through
    `-Dgpg.passphrase` or `settings.xml`.
- [x] Configure Maven Enforcer to reject snapshot project versions and snapshot
  dependencies in the release profile (`requireReleaseVersion` and
  `requireReleaseDeps`, execution `enforce-release-versions`). Verified live:
  `-Prelease validate` on `0.0.1-SNAPSHOT` fails with "Release builds must not
  use a SNAPSHOT project version." The rule has its own skip property,
  `-Drelease.enforcer.skip=true`, for snapshot dry runs. Never use
  `-Denforcer.skip`, which also disables the convergence and banned-dependency
  rules.
- [x] Add a narrow dependency-convergence check for the generic starter. This
  already exists as the parent's `provider-dependency-convergence` execution,
  covering Netty, Jackson, Reactor, Apache HttpClient 5, and SLF4J.
- [x] Configure `central-publishing-maven-plugin` `0.12.0`.

The plugin as configured. Two details here are easy to miss and both break the
release if omitted:

```xml
<plugin>
    <groupId>org.sonatype.central</groupId>
    <artifactId>central-publishing-maven-plugin</artifactId>
    <version>0.12.0</version>
    <!-- REQUIRED: without this the plugin does not bind to the deploy phase -->
    <extensions>true</extensions>
    <configuration>
        <publishingServerId>central</publishingServerId>
        <autoPublish>false</autoPublish>
        <waitUntil>validated</waitUntil>
        <skipUpload>${central.skipUpload}</skipUpload>
        <excludeArtifacts>
            <excludeArtifact>dedup4j-dashboard</excludeArtifact>
        </excludeArtifacts>
    </configuration>
</plugin>
```

Safe property defaults in the `release` profile. The dry run is safe because the
default is safe, not because the operator remembered a flag:

```xml
<properties>
    <central.skipUpload>true</central.skipUpload>
    <maven.deploy.skip>true</maven.deploy.skip>
    <release.enforcer.skip>false</release.enforcer.skip>
</properties>
```

**Correction (0.12.0 documentation, 2026-10-13):** `skipPublishing` does not
mean "build the bundle but don't upload". It **excludes the current module's
artifacts** from staging, and a skipped module produces no bundle. The earlier
revision used `-Dcentral.skipPublishing=true clean deploy` as the dry run; that
would have produced nothing. The bundle-only switch is `skipUpload`, which is new
in 0.12.0. `skipPublishing` is now used only as the literal per-module exclusion
in `dedup4j-dashboard`.

`autoPublish=false` and `waitUntil=validated` are literals, not properties, so
the command line cannot override them.

The current Central documentation does not mention `maven.deploy.skip`, and the
0.12.0 plugin classes contain no reference to it (checked by disassembly
2026-10-19), so it cannot skip the Central mojo. The lifecycle participant
disables `maven-deploy-plugin` itself (`maybeSkipMavenDeployPlugin`) and injects
its own `injected-central-publishing` execution. `maven.deploy.skip=true` is kept as
belt-and-braces against the stock deploy plugin and is never relied on for
module exclusion. It is set as a property only, and the `deploy` phase still
runs. That is why G5's first checkbox is the log line confirming the upload was
skipped: it is the only signal distinguishing "`skipUpload` worked" from "the
plugin never ran."

- [x] Leave `checksums` at its default. The plugin generates what Central
  requires; this is plugin behavior, not a dedup4j feature to maintain.
- [~] Add a bundle-manifest verification step comparing the generated components
  against the [artifact manifest](#artifact-manifest). The script below is
  written and tested against synthetic bundles (passes on the nine JARs plus
  parent, fails when `dedup4j-dashboard` is present), but not yet against a real
  bundle; run it in G5. This is
  the only check standing between a careless rename and a fat executable JAR
  published immutably to Central — keep it even though everything around it was
  cut.

```bash
# Run from the library root after the G5 dry run.
bundle=target/central-publishing/central-bundle.zip
expected="dedup4j dedup4j-core dedup4j-jpa dedup4j-storage-local dedup4j-storage-s3
dedup4j-storage-azure dedup4j-spring-boot-starter dedup4j-spring-boot-management
dedup4j-spring-boot-dashboard dedup4j-spring-boot-observability"
actual=$(unzip -Z1 "$bundle" | awk -F/ '$1=="io" && NF>=5 {print $4}' | sort -u)
diff <(tr ' ' '\n' <<<"$expected" | tr -s '\n' | sort) <(echo "$actual") \
  && echo "manifest OK" || { echo "MANIFEST MISMATCH"; exit 1; }
unzip -Z1 "$bundle" | grep -q '/dedup4j-dashboard/' && { echo "standalone dashboard present"; exit 1; } || true
```

- [x] Verify no dependency-reduced or repackaged executable replaces a library
  artifact. Only `dedup4j-dashboard` uses `spring-boot-maven-plugin` `repackage`,
  and no module uses the shade or assembly plugins.

Local verification (2026-10-19, no signing, no upload):

```bash
./mvnw -P release -Dgpg.skip=true -Drelease.enforcer.skip=true -DskipTests clean verify
```

`BUILD SUCCESS`. Each of the nine published modules has `<artifact>.jar`,
`-sources.jar`, and `-javadoc.jar` in `target/`. `dedup4j-dashboard` has only its
executable JAR. Effective-POM checks confirm `skipUpload=true` everywhere and
`skipPublishing=true` in `dedup4j-dashboard`.

**Exit gate:** one release build produces every required classifier and signature
for exactly the approved components, and excludes the standalone dashboard.
**Classifiers met; signatures and bundle contents are proven in G4/G5.**

## G4 — Portal credentials and signing

**Effort: 2–4 hours.**

- [x] Generate a Central Portal **user token**; never use the account password.
- [x] Add the token locally under server ID `central` in `~/.m2/settings.xml`:

```xml
<server>
    <id>central</id>
    <username>${env.CENTRAL_USERNAME}</username>
    <password>${env.CENTRAL_PASSWORD}</password>
</server>
```

- [x] Generate or select a passphrase-protected OpenPGP signing key.
- [x] Record the key fingerprint in private maintainer records
  (`~/Documents/dedup4j-0.1.0-release-roadmap.md`).
- [x] Publish the public key to a Central-supported server such as
  `keyserver.ubuntu.com`, `keys.openpgp.org`, or `pgp.mit.edu`.
- [x] **Verify the public key can be retrieved independently by fingerprint.**
  Cheap, and it is the only thing that proves your signatures are verifiable by
  anyone other than you.
- [x] Store the private key and passphrase outside source control. Supply the
  passphrase only through gpg-agent or `MAVEN_GPG_PASSPHRASE`. For the `bc`
  signer, also supply `MAVEN_GPG_KEY`. Never use `-Dgpg.passphrase` or
  `settings.xml`, which `bestPractices` rejects.

Environment variables must be supplied securely and must never be written into
the repository. CI secret handling, protected GitHub Environments, and the key
rotation runbook are deferred — the first release is performed manually by the
maintainer, so there is no CI holding publishing credentials to protect.

**Result (2026-10-20):** portal token in `~/.m2/settings.xml` (server id
`central`, mode 600); ed25519 key `1E7D14C37ABE8D6E5EDD0B05D0A31632E4C94CE3`,
expires 2028-10-19, published to `keyserver.ubuntu.com` and retrievable by
fingerprint.

**Exit gate:** the maintainer can sign artifacts and authenticate to Central with
no secret in any tracked file.

## G5 — Non-uploading dry run

**Effort: 3–5 hours.**

```bash
./mvnw --batch-mode --no-transfer-progress \
  -Prelease \
  -Drelease.enforcer.skip=true \
  clean deploy
```

`central.skipUpload` defaults to `true` in the `release` profile, so this
builds, signs, and bundles locally and skips both upload and publication. Pass
`-Drelease.enforcer.skip=true` only while the version is still a snapshot; drop
it for the release candidate. Never document a bare `mvn deploy` as local
validation.

- [x] Confirm the log explicitly reports that the upload was skipped and prints
  the bundle path.
- [x] Inspect the generated bundle at:

```text
target/central-publishing/central-bundle.zip
```

  Configurable via the plugin's `outputFilename` (and the `forced*Directory`
  options).
- [x] Confirm the parent POM is present.
- [x] Confirm all nine approved JAR modules are present (run the G3 manifest
  script).
- [x] Confirm `dedup4j-dashboard` is **absent**, and that skipping the last
  reactor module does not suppress the bundle.
- [x] Confirm every published JAR has matching sources and Javadoc JARs.
- [x] Confirm every POM, JAR, and classifier has its detached `.asc` signature.
- [x] Confirm checksums exist and validate.
- [x] Verify at least one signature using the independently retrieved public key.
- [x] Inspect JAR contents for secrets, SQLite files, IDE files, test fixtures,
  private configuration, or accidental executable nesting.
- [~] Run `mvn help:effective-pom` for the parent and two representative
  children (one provider, one starter). Done on the snapshot (parent,
  `dedup4j-storage-s3`, `dedup4j-spring-boot-starter`); repeat at `0.1.0`.
- [ ] Run a dependency vulnerability scan and review reachable high/critical
  findings. Block on genuinely relevant ones; do not build a formal
  risk-acceptance process for a project with no users yet. Not run locally;
  CI runs `dependency-review` on the release pull request.

**Result (2026-10-20):** dry run at a temporary `0.1.0` (reverted). Bundle
holds the parent and 9 artifacts, each with POM, JAR, sources and Javadoc;
37/37 signatures verify against the keyserver key; checksums match; no
secrets, databases, IDE files or test classes; `dedup4j-dashboard` absent.

**Exit gate:** the exact signed bundle is locally inspectable, contains only the
approved artifacts, and nothing in this gate uploads it.

## G6 — Isolated consumer verification

**Effort: 8–12 hours.** The most underestimated gate, and the one that earns its
keep. A reactor build proves almost nothing about an external consumer.

Create disposable consumer projects **outside both repositories**. Do not rely on
reactor resolution or a populated local Maven cache.

- [x] Build a Maven Spring Boot 4.1.x consumer depending only on
  `io.github.heyedem:dedup4j-spring-boot-starter`.
- [x] Verify local-provider startup, schema initialization, store, duplicate
  store, retrieve, retain, and release.
- [x] Verify S3 and Azure configurations bind **without initializing the
  unselected provider** — no credential discovery, no client construction. This
  is the core promise of ADR-007 and the most likely place for it to be false.
- [x] Verify `dedup4j-spring-boot-observability` transitively resolves the
  management and embedded-dashboard modules, and that the embedded dashboard's
  static resources and API route load.
- [x] Run a minimal **Gradle** consumer that resolves the same starter
  coordinate and compiles. Resolution smoke test only; full functional parity is
  not required, but the site promises a Gradle snippet, so the snippet must work.
- [x] Use a fresh temporary local repository so no installed artifact can mask a
  missing published parent or transitive module:

```bash
./mvnw --batch-mode --no-transfer-progress \
  -Dmaven.repo.local="$(mktemp -d)" \
  clean verify
```

- [x] **The consumer project is the snippet test.** Its `pom.xml` and
  `build.gradle` dependency blocks must be byte-identical to
  `blob-helper-docs/src/docs/_includes/dep-maven.md` and `dep-gradle.md`. Copy in
  one direction only, from the verified consumer into the docs fragment.
- [~] Record exact commands and results for the release record. Summarised
  in the result note below; the raw logs sit in a temporary session scratch
  directory and are not yet kept anywhere durable.

**Result (2026-10-20):** Maven consumer (store, dedupe, `UploadHistory`
totals), S3/Azure binding, observability starter and a Gradle consumer pass,
resolving only from the bundle (19/19 files sha1-identical). Docs defects
found: Azure minimal config fails without `endpoint` or `connection-string`;
management routes are under `/v1`; site coordinates still `com.edem`.

**Exit gate:** clean Maven and Gradle consumers resolve and exercise the public
installation paths with no reactor access, and the documented snippets are the
ones that were tested.

## G7 — Publish `0.1.0` and flip the documentation

**Effort: 4–6 hours plus Central propagation.**

- [ ] Freeze feature changes for the release candidate.
- [ ] Set all reactor components to `0.1.0`; confirm no `-SNAPSHOT` remains.
  In the same commit, set `project.build.outputTimestamp` to the release commit
  time.
- [ ] Update the changelog, compatibility matrix, and migration notes.
- [ ] Re-run G5 and G6 from the release commit, **without**
  `-Drelease.enforcer.skip`.
- [ ] **Obtain Edem's explicit approval before committing, tagging, pushing, or
  uploading.**
- [ ] Create the reviewed release commit and the `v0.1.0` tag.
- [ ] Build from the tagged commit, not from a later working tree.
- [ ] Upload deliberately:

```bash
./mvnw --batch-mode --no-transfer-progress \
  -Prelease \
  -Dcentral.skipUpload=false \
  clean deploy
```

  `autoPublish=false` is a literal in the POM, so this upload stops at
  `VALIDATED` and waits for manual Portal approval.
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
- [ ] **Flip the documentation.** Edit
  `blob-helper-docs/src/docs/_includes/coordinates.md` to the released version
  and groupId `io.github.heyedem`, sync `dep-maven.md` and `dep-gradle.md` from
  the G6 consumer, and remove the `not-on-central.md` admonition. CI redeploys
  the site.
- [ ] Publish the standalone `dedup4j-dashboard` executable JAR in the matching
  GitHub Release with a checksum and usage notes. Do not describe it as a Central
  library.
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
| Versioned documentation | at the first release that changes documented behavior |
| Per-module `help:effective-pom` review | on any release that changes the dependency graph materially |
| Full dashboard behavioral test suite | when the dashboard gains users beyond the maintainer |
| Key expiry and rotation runbook | before the signing key's first expiry, or on any key compromise |
| Formal vulnerability risk-acceptance process | when dedup4j has downstream consumers with security review |
| Dependency-review CI gate on pull requests | when automated dependency-update PRs are enabled |
| Hosted browsable Javadoc site | when the API reference page is no longer sufficient |
| Personal website `/projects/dedup4j` page | after the docs site is live and stable |

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

- [x] The exact namespace is verified with correct case (`io.github.heyedem`).
- [~] License, ownership, URLs, SCM, and required metadata are complete
  (developer name and final docs URL outstanding).
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
- [maven-gpg-plugin usage](https://maven.apache.org/plugins/maven-gpg-plugin/usage.html)

## Revision history

- **2026-10-19:** Renamed for dedup4j: artifact manifest, namespace
  `io.github.heyedem` (exact Portal spelling), Apache-2.0 decision. Recorded the
  G0 results (0 Javadoc errors, 453 warnings) and refreshed the ground truth
  (`main` at `9a7d5b2`, 303 tests). Adopted `central-publishing-maven-plugin`
  0.12.0 and corrected the dry run from `skipPublishing` to `skipUpload`, since
  `skipPublishing` excludes a module rather than skipping the upload. Verified
  that `excludeArtifacts` is an exact artifactId match. Recorded the pinned
  plugin versions, the gpg signer setup, the release-only enforcer with its own
  skip, the URL-append guards, the observability static Javadoc JAR, and the
  three-layer dashboard exclusion. Corrected the docs include paths to
  `src/docs/_includes/`. Ticked the G0–G3 work done on
  `chore/release-0.1.0-prep`.
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
