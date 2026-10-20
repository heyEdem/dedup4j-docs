---
title: Contributing
description: Build dedup4j from source and contribute changes.
category: Project
order: 12
---
# Contributing

dedup4j lives in two repositories:

| Repository | Contains |
|---|---|
| [`heyEdem/dedup4j`](https://github.com/heyEdem/dedup4j) | the library — implementation and tests |
| [`heyEdem/dedup4j-docs`](https://github.com/heyEdem/dedup4j-docs) | this site |

They are separate so that documentation deploys are not coupled to library
releases. The cost is drift, which is why the rules below about coordinates
exist.

## Editing the documentation

The site is a Vite + React app that renders the Markdown files in
`src/docs/`.

```bash
git clone https://github.com/heyEdem/dedup4j-docs
cd dedup4j-docs

npm install
npm run dev
```

The dev server reloads on every change. Before opening a pull request:

```bash
npm test
npm run build
```

This is the same pair of commands CI runs. The build fails on broken internal
links and missing anchors, so a red build means a page points somewhere that
does not exist.

Each page starts with frontmatter (`title`, `description`, `category`,
`order`); adding a file with those four fields adds a page to the sidebar.

### Never hardcode coordinates

Group ID, artifact ID, and version appear in `src/docs/_includes/` and nowhere
else. Pages include a fragment:

```markdown
--8<-- "dep-maven.md"
```

A release then updates one file instead of hunting through every page. A
pull request that types a version into a page will be asked to change it.

### Documentation must be true, not aspirational

Write what the code does, verified by reading the code. If a page and the
library disagree, the page is wrong.

`VERIFICATION.md` in the docs repository tracks every claim the site makes
about the library and whether it has been checked against source. Adding a
claim means adding a row.

> [!WARNING]
> **Examples must come from something that compiled**
>
> Dependency snippets are copied **from** a verified consumer project into
> the docs, never the reverse. A snippet nobody compiled is an assertion,
> not documentation.

## Working on the library

```bash
git clone https://github.com/heyEdem/dedup4j
cd dedup4j
./mvnw clean verify
```

Requires **Java 21**. A green build is 11 modules and 190 tests. Both numbers
matter: a change that alters the test count changed behaviour, whether or not
it was meant to.

Tests run without cloud credentials. Anything that needs a real S3 or Azure
account is not a unit test.

## Adding a storage provider

Implement four methods from `dedup4j-core`:

```java
public interface BlobStorage {
    StoredBlob put(PutBlobRequest request);
    BlobResource get(String objectKey);
    void delete(String objectKey);
    boolean exists(String objectKey);
}
```

The contract:

- **`delete` must be idempotent.** An already-missing object counts as
  deleted, not as an error.
- **`get` returns an open stream.** The caller closes it.
- **`exists` should be cheap** — a metadata probe, not a download.
- **`put` may be called with content already at that key.** Deduplication
  makes this rare, not impossible. Concurrent uploads of identical new content
  can both write the same key, with identical bytes.

An adapter moves bytes. Hashing, deduplication, reference counting, and
metadata stay in dedup4j — an adapter never participates in the dedup
decision.

### Wiring it

```java
@Configuration
public class MyStorageConfiguration {

    @Bean
    BlobStorage blobStorage() {
        return new MyBlobStorage(...);
    }
}
```

Every built-in adapter is `@ConditionalOnMissingBean(BlobStorage.class)`, so
yours wins by existing.

A provider contributed to the project itself should also:

- live in its own module, depending only on `dedup4j-core` and its SDK
- resolve credentials through its SDK's default chain, never through a
  `dedup4j.*` property
- construct no client unless its provider is selected

That last point is a project-wide commitment: an unselected provider must not
reach the network or read credentials.

## Reporting problems

[Open an issue](https://github.com/heyEdem/dedup4j/issues) against the library
repository for behaviour, and against the docs repository for the site.

A documentation issue is worth filing even when the code is fine. If a page
led you to the wrong conclusion, that is a defect.
