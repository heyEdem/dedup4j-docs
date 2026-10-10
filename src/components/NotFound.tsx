import { Link } from 'react-router'

export function NotFound() {
  return (
    <section className="mx-auto max-w-2xl px-5 py-24">
      <div className="label text-cobalt">404</div>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Page not found</h1>
      <p className="mt-4 text-muted">That page doesn't exist.</p>
      <Link to="/docs" className="mt-6 inline-block text-cobalt underline underline-offset-4">Go to the docs</Link>
    </section>
  )
}
