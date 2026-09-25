# dedup4j

Store identical bytes once — deduplicated blob storage for Spring Boot, backed
by your own database and object store.

--8<-- "not-on-central.md"

When two users upload the same file, dedup4j recognises the content, stores the
bytes once, and hands back a reference to the single stored copy. Your
application keeps its own asset records; dedup4j owns the physical content and
counts who still needs it.

--8<-- "coordinates.md"

## Add the dependency

=== "Maven"

    --8<-- "dep-maven.md"

=== "Gradle"

    --8<-- "dep-gradle.md"

The starter auto-configures everything against your existing `DataSource`. It
does not open its own database connection pool or require a separate datastore.

[Quick start](getting-started/quick-start.md){ .md-button .md-button--primary }
[Installation](getting-started/installation.md){ .md-button }

## Two things dedup4j does not do

!!! warning "Read this before designing around it"
    **It does not generate presigned URLs.** dedup4j hands you a
    `BlobReference` and can stream content back to you, but issuing
    time-limited direct-to-storage URLs is your application's job. See
    [Retrieval, retain & release](guides/lifecycle.md).

    **It cannot make the database write and the object-store write atomic.**
    Two systems, no shared transaction. dedup4j is explicit about the ordering
    it chooses and what reconciliation exists for the gap. See
    [Architecture & limitations](architecture.md).

These are the two expectations most likely to be formed and then disappointed,
so they are stated before the installation instructions rather than after.

## Where to go next

| If you want to | Read |
|---|---|
| Add it to a project | [Installation](getting-started/installation.md) |
| See it work end to end | [Quick start](getting-started/quick-start.md) |
| Choose local, S3, or Azure | [Storage providers](guides/providers.md) |
| Understand reference counting | [Retrieval, retain & release](guides/lifecycle.md) |
| Know what it cannot promise | [Architecture & limitations](architecture.md) |

[Source on GitHub](https://github.com/heyEdem/dedup4j) ·
[Contributing](contributing.md)
