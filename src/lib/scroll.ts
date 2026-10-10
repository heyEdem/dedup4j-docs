export type ScrollPlan = { to: 'id'; id: string } | { to: 'top' }

// Decides where a navigation should land: the heading named by the hash when it
// exists on the new page, otherwise the top of the page.
export function scrollPlan(hash: string, exists: (id: string) => boolean): ScrollPlan {
  if (!hash || hash === '#') return { to: 'top' }
  let id = hash.slice(1)
  try { id = decodeURIComponent(id) } catch { /* keep the raw id */ }
  return exists(id) ? { to: 'id', id } : { to: 'top' }
}
