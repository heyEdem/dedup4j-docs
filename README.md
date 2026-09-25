# dedup4j documentation

Source for the dedup4j documentation site, built with
[MkDocs](https://www.mkdocs.org/) and
[Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) and
deployed to GitHub Pages by GitHub Actions.

The library itself lives at [heyEdem/dedup4j](https://github.com/heyEdem/dedup4j).

## Local development

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/mkdocs serve
```

`mkdocs build --strict` is the same command CI runs. Treat a strict failure as
a broken build, not a warning.

## Coordinates are single-sourced

Group ID, artifact ID, and version appear in `docs/includes/` and nowhere else.
Pages include those fragments; no page hardcodes a version. See §7 of
`docs/plans/2026-09-01-blob-helper-docs-design.md`.

## Design record

- `docs/plans/` — design and decision history, not published to the site.
- `docs/releases/publishing.md` — maintainer release runbook, not published.

## License

Apache License 2.0. See [LICENSE](LICENSE).
