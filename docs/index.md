# dedup4j

Store identical bytes once — deduplicated blob storage for Spring Boot, backed
by your own database and object store.

--8<-- "not-on-central.md"

--8<-- "coordinates.md"

## Add the dependency

=== "Maven"

    --8<-- "dep-maven.md"

=== "Gradle"

    --8<-- "dep-gradle.md"

[Quick start](getting-started/quick-start.md){ .md-button .md-button--primary }
[Installation](getting-started/installation.md){ .md-button }

!!! warning "Two things dedup4j does not do"
    It does not generate presigned URLs, and it cannot make the database write
    and the object-store write atomic. See
    [Retrieval, retain & release](guides/lifecycle.md) and
    [Architecture & limitations](architecture.md) before designing around it.

[Storage providers](guides/providers.md) ·
[Architecture & limitations](architecture.md) ·
[Source](https://github.com/heyEdem/dedup4j)

!!! note "Landing page not yet complete"
    The value sentence, compatibility line, dependency path, and warning above
    are in place. Remaining prose lands with the Day 2–3 content pass.
