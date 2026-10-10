export function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement
    const dark =
      root.dataset.theme === 'dark' ||
      (root.dataset.theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    const next = dark ? 'light' : 'dark'
    root.dataset.theme = next
    try { localStorage.setItem('theme', next) } catch { /* storage blocked */ }
  }
  return (
    <button type="button" onClick={toggle} className="label border border-line px-3 py-2 hover:bg-tint" aria-label="Toggle colour theme">
      Theme
    </button>
  )
}
