import { Link } from 'react-router'
import { includes } from '../lib/content'
import { expandIncludes } from '../lib/includes'
import { MarkdownRenderer } from './MarkdownRenderer'

const md = (s: string) => expandIncludes(s, includes)

const INSTALL = md(
  [
    '::::tabs',
    ':::tab{title="Maven"}',
    '--8<-- "dep-maven.md"',
    ':::',
    ':::tab{title="Gradle"}',
    '--8<-- "dep-gradle.md"',
    ':::',
    '::::',
  ].join('\n'),
)

const LIMITS = `> [!WARNING]
> **Read this before designing around it**
>
> **It does not generate presigned URLs.** dedup4j hands you a
> \`BlobReference\` and can stream content back to you, but issuing
> time-limited direct-to-storage URLs is your application's job. See
> [Retrieval, retain & release](guides/lifecycle.md).
>
> **It cannot make the database write and the object-store write atomic.**
> Two systems, no shared transaction. dedup4j is explicit about the ordering
> it chooses and what reconciliation exists for the gap. See
> [Architecture & limitations](architecture.md).

These are the two expectations most likely to be formed and then disappointed,
so they are stated up front rather than buried in the reference.`

const NEXT = `| If you want to | Read |
|---|---|
| Add it to a project | [Installation](getting-started/installation.md) |
| See it work end to end | [Quick start](getting-started/quick-start.md) |
| Choose local, S3, or Azure | [Storage providers](guides/providers.md) |
| Understand reference counting | [Retrieval, retain & release](guides/lifecycle.md) |
| Know what it cannot promise | [Architecture & limitations](architecture.md) |`

const FEATURES = [
  ['Store bytes once', 'When two users upload the same file, dedup4j recognises the content and stores the bytes once.'],
  ['Your database, your store', 'It reuses your existing DataSource and writes bytes to a filesystem directory, S3 or Azure. No separate datastore.'],
  ['Reference counted', 'Your application keeps its own asset records; dedup4j owns the physical content and counts who still needs it.'],
  ['Auto-configured', 'The starter wires everything against your existing DataSource. It does not open its own connection pool.'],
]

export function LandingPage() {
  return (
    <div>
      <section className="border-b border-line">
        <div className="mx-auto max-w-5xl px-5 py-20">
          <div className="label text-cobalt">Spring Boot starter</div>
          <h1 className="mt-4 text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl">
            Store identical bytes once.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted">
            Deduplicated blob storage for Spring Boot, backed by your own database and object store.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/docs/getting-started/quick-start" className="bg-cobalt px-5 py-3 text-sm font-semibold text-paper hover:opacity-90">Quick start</Link>
            <Link to="/docs/getting-started/installation" className="border border-line px-5 py-3 text-sm font-semibold hover:bg-tint">Installation</Link>
          </div>
          <div className="mt-10 max-w-2xl">
            <MarkdownRenderer body={INSTALL} fromId="" />
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-5xl gap-px border-x border-b border-line bg-line sm:grid-cols-2">
        {FEATURES.map(([title, text]) => (
          <div key={title} className="bg-paper p-8">
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="mt-2 text-muted">{text}</p>
          </div>
        ))}
      </section>
      <section className="mx-auto max-w-5xl px-5 py-12">
        <h2 className="text-2xl font-bold tracking-tight">Two things dedup4j does not do</h2>
        <MarkdownRenderer body={LIMITS} fromId="" />
      </section>
      <section className="mx-auto max-w-5xl px-5 pb-16">
        <h2 className="text-2xl font-bold tracking-tight">Where to go next</h2>
        <MarkdownRenderer body={NEXT} fromId="" />
      </section>
    </div>
  )
}
