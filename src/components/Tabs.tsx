import { Children, isValidElement, useState, type ReactNode } from 'react'

export function Tabs({ children }: { children: ReactNode }) {
  const tabs = Children.toArray(children).filter(isValidElement) as {
    props: { 'data-title'?: string; children?: ReactNode }
  }[]
  const [active, setActive] = useState(0)
  return (
    <div className="tabs">
      <div role="tablist" className="tabs-list">
        {tabs.map((t, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === active}
            className="tabs-tab"
            onClick={() => setActive(i)}
          >
            {t.props['data-title']}
          </button>
        ))}
      </div>
      <div role="tabpanel">{tabs[active]?.props.children}</div>
    </div>
  )
}
