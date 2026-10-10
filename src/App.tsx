import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router'
import { Navigation } from './components/Navigation'
import { Footer } from './components/Footer'
import { DocsPage } from './components/DocsPage'
import { LandingPage } from './components/LandingPage'
import { NotFound } from './components/NotFound'
import { SearchPalette } from './components/SearchPalette'
import { Seo } from './components/Seo'

export default function App() {
  const [searchOpen, setSearchOpen] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if ((e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') || (e.key === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <Seo />
      <Navigation onSearch={() => setSearchOpen(true)} />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/docs/*" element={<DocsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      {searchOpen && <SearchPalette onClose={() => setSearchOpen(false)} />}
    </div>
  )
}
