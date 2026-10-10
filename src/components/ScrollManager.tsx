import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { scrollPlan } from '../lib/scroll'

// Client-side navigation keeps the previous scroll offset; land on the anchor
// (or the top) instead. Runs in an effect, so it never affects hydration.
export function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    const plan = scrollPlan(hash, (id) => document.getElementById(id) !== null)
    if (plan.to === 'id') document.getElementById(plan.id)?.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}
