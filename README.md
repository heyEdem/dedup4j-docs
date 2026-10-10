# dedup4j documentation

Source for the dedup4j documentation site: a Vite + React app that renders the
Markdown pages in `src/docs/`, deployed to Vercel from `main`.

The library itself lives at [heyEdem/dedup4j](https://github.com/heyEdem/dedup4j).

## Local development

```bash
npm install
npm run dev      # dev server with live reload
npm test         # unit tests for the content pipeline
npm run build    # production build, prerender, internal link check
```

`npm run build` is the same command CI runs. It fails on a broken internal
link or a missing anchor.

## Writing pages

- Pages are `src/docs/**/*.md`. Each starts with frontmatter: `title`,
  `description`, `category`, `order`. A new file with those four fields appears
  in the sidebar, search and sitemap.
- Callouts use GitHub alert syntax with a bold first line as the title:
  `> [!NOTE]`, `TIP`, `IMPORTANT`, `WARNING` or `CAUTION`.
- Tabs use `::::tabs` containing `:::tab{title="…"}` blocks.
- Link to other pages with relative `.md` paths (`../guides/providers.md#credentials`).

## Coordinates are single-sourced

Group ID, artifact ID, and version appear in `src/docs/_includes/` and nowhere
else. Pages include those fragments with a `--8<-- "file.md"` line. No page
hardcodes a version. See §7 of
`docs/plans/2026-09-01-blob-helper-docs-design.md`.

## Design record

- `docs/plans/` — design and decision history, not published to the site.
- `docs/releases/publishing.md` — maintainer release runbook, not published.

## License

Apache License 2.0. See [LICENSE](LICENSE).
