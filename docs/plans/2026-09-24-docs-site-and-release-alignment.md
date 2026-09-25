# Documentation Site and Release Alignment — Decision Record

**Status:** Accepted
**Date:** 2026-09-24
**Project:** Blob Helper
**Supersedes scope in:** `2026-09-01-blob-helper-docs-design.md` §4–§6, §9, §11
and `docs/releases/publishing.md` phase structure

## Context

The documentation roadmap (2026-09-01) and the Maven Central publishing roadmap
(2026-09-08) were written independently. Reviewed together against the actual
state of `../blob-helper`, they were circularly coupled, priced for a mature
project, and contained several technically incorrect instructions.

This record captures the review, the decisions taken, and what was deliberately
cut.

## Method

An adversarial review was run through Codex using `gpt-5.6-luna` at medium
reasoning effort, sandboxed read-only. (`gpt-5.6` was requested but is rejected
on a ChatGPT account.) Its verdict on the combined plans was **4/10**, with an
honest estimate of 80–156 focused hours for publishing plus 44–92 for
documentation.

Codex has no network access, so every factual claim it made about Sonatype
tooling was treated as a hypothesis and verified separately against Sonatype's
published documentation. Two of its suspicions were wrong and one was right; see
[Verified corrections](#verified-corrections).

## Measured ground truth

Taken from `../blob-helper` on 2026-09-24, not assumed:

- `./mvnw clean verify` → `BUILD SUCCESS`, 11/11 modules, **189 tests**, 22.6s.
- `groupId` is `com.edem`; `version` is `0.0.1-SNAPSHOT`. Both plans assumed
  `io.github.heyEdem` and `0.1.0-SNAPSHOT`.
- Spring Boot `4.1.1`, Java 21 — the compatibility claims are real, not aspirational.
- **No Javadoc plugin is configured in any module.** Javadoc JARs are mandatory
  for Central, and Java 21 Javadoc is strict by default.
- Root POM has empty `<url/>`, `<licenses/>`, `<developers/>`, `<scm/>` stubs.
- HEAD is a merge into `epic-006-structured-operational-logging`; `.DS_Store`,
  two SQLite files, and four ADR/PLAN files are untracked.

The green, fast reactor materially changes the estimate. Codex assumed 2–4 weeks
*after* the library became release-ready; the library is already green, which
moves the project toward the lower bound.

## Decisions

### D1 — Publish all ten components in `0.1.0`

Parent POM plus nine JARs, one release train, one version.
`blob-helper-dashboard` (the standalone executable) is excluded from Central and
distributed through GitHub Releases.

Considered and rejected: trimming to six modules. It would contradict ADR-007
(one generic starter, configuration selects the provider) and ADR-010 (combined
observability starter), and would orphan working, tested code. The cost is ten
Javadoc JARs to lint, which is mechanical work, not design risk.

Consequence: the [artifact manifest table](../releases/publishing.md#artifact-manifest)
becomes the single authority for what ships. Three artifacts share a
`blob-helper-spring-boot-*` prefix and a fourth is the similarly named standalone
executable, and `excludeArtifacts` matches on `artifactId` — so a bundle-manifest
verification step is kept even though comparable checks were cut.

### D2 — Aggressive ceremony cut

The publishing runbook was priced for a project with downstream consumers,
security review, and release automation. Blob Helper has none of those yet.

**Kept** — cheap insurance, each catching a failure that reaches users:
isolated Maven consumer test, minimal Gradle resolution test, bundle-manifest
check, reproducible build timestamp, build from the tagged commit, manual Portal
publication, public-key retrieval verification, a narrow dependency-convergence
check on the generic starter, and a one-page release record.

**Deferred** — with an explicit revival trigger recorded in the runbook:
release automation, protected GitHub Environments, SBOM, Revapi/japicmp,
`mike` versioning, per-module effective-POM review, the full dashboard test
suite, the key rotation runbook, formal vulnerability risk acceptance, the
dependency-review CI gate, hosted Javadoc, and the personal website page.

**Dropped:** the four-checksum policy as a project feature. It is plugin default
behavior, not something Blob Helper maintains.

The GitHub Environment deferral is a direct consequence of the first release
being performed manually: there is no CI holding Central credentials to protect.
It returns the moment automation does.

### D3 — Documentation ships before the release

The full 13-page site goes live on GitHub Pages **before** `0.1.0` is published,
with coordinates in a single include carrying a "not yet on Maven Central"
admonition. At release, gate G7 edits one file and CI redeploys.

This resolves the deadlock described in the docs design §7 and front-loads the
cheapest bug-finding available: writing documentation exposes API and naming
problems while they are still fixable, rather than after an immutable
publication.

Considered and rejected: publishing to Central first and documenting afterwards.
Central has no undo, and every flaw that doc-writing would have surfaced becomes
a `0.1.1`.

### D4 — Thirteen launch pages, navigation depth two

Codex proposed twelve and cut Troubleshooting. Restored, because the docs
strategy in §2 commits to answering *"What should I do when something fails?"*
and no other page answers it. Everything else in the cut stands: four provider
pages collapse into one, the three-page architecture split collapses into one,
and `mike`, hosted Javadoc, and the personal-site page are deferred.

### D5 — Risk-ordered release gates

Ten phases become seven gates, reordered so that mechanical unknowns run first.
Governance items — namespace, license, metadata — are decisions: fast and
predictable. Mechanics are discoveries: slow and surprising. The previous
ordering front-loaded governance and left Javadoc, signing, and bundle shape for
the end, which is backwards for risk.

The new **G0** exists to run `mvn javadoc:javadoc` on day one. Ten modules of
never-linted Javadoc against strict Java 21 doclint is the single largest hidden
cost in the runbook, and it is discoverable in two minutes.

## Verified corrections

Each was checked against Sonatype's published documentation for
`central-publishing-maven-plugin`, not inferred.

| Claim in the 2026-09-08 runbook | Status | Correction |
|---|---|---|
| Bundle appears in `target/central-staging` | **wrong** | `target/central-publishing/central-bundle.zip` |
| `skipPublishing=true` still builds an inspectable bundle | **correct** | Codex doubted this; Sonatype confirms it. The dry-run model survives intact. |
| `central-publishing-maven-plugin` `0.11.0` | **correct** | current as of 2026-09-24 |
| `publishingServerId`, `autoPublish`, `excludeArtifacts` are real keys | **correct** | `excludeArtifacts` matches on `artifactId` |
| Central mandates a published parent POM | **overstated** | Central has no such rule. Publishing the parent follows from Blob Helper's inheritance model. Flattened consumer POMs are a valid alternative, deliberately not adopted. |
| Default `all` checksums are a Central requirement | **misleading** | plugin default behavior; leave it alone |
| — | **missing** | `<extensions>true</extensions>` is required or the plugin never binds to `deploy` |
| — | **missing** | `maven.deploy.skip` must be set or `deploy` runs twice |
| — | **missing** | `waitUntil` (`uploaded` / `validated` / `published`) replaces "wait until available" |
| Spring Boot 4.1.x support | **confirmed** | the POM builds green against 4.1.1 |

One wording change follows from the last row: *"built and tested against Spring
Boot 4.1.1"* and *"compatible with every 4.1.x patch"* are different promises.
Only the first is published.

## Revised estimate

| Track | Before | After |
|---|---|---|
| Publishing | 80–156 focused hours | **30–52 focused hours** |
| Documentation | 44–92 focused hours | included in the interleaved schedule |
| Combined | 3–6 weeks after the library is release-ready | **~11 focused days**, starting now |

```text
Day 1      G0 unknowns   ─┬─ docs scaffold, mkdocs.yml, Pages workflow
Day 2-3    G1 clean       │  Home, Installation, Quick start
Day 4      G2 identity    │  Spring Boot, Providers
Day 5-6    G3 profile     │  Uploading, Lifecycle, Observability
Day 7      G4 signing     │  Configuration, API reference
Day 8      G5 dry run     │  Troubleshooting, Architecture, Contributing
Day 9-10   G6 consumers  ─┴─ ← the consumer project IS the snippet test
Day 11     G7 publish        edit coordinates.md → redeploy → announce
```

The two tracks interleave because they demand different kinds of attention. They
join at G6.

## Open risks

- **Javadoc debt is unquantified** until G0 runs. If ten modules produce
  hundreds of doclint errors, G3 grows. This is the plan's largest remaining
  unknown, and it is deliberately the first thing measured.
- **Specification drift in the library repository.** `README.md`,
  `docs/SPECIFICATION.md`, `docs/taskindex.md`, and the ADRs must agree with each
  other before the docs site can be true to any of them. G1 owns this; it is
  product triage, not a checkbox.
- **Provider isolation is a promise, not yet a proof.** ADR-007 requires that an
  unselected provider never constructs a client or resolves credentials. G6
  verifies it from an external consumer. If it fails there, it is an API problem,
  not a packaging problem.
- **Ten published artifacts is a permanent support surface.** Accepted under D1,
  but every one of them is immutable once published.
