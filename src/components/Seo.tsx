import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { getPageSeo } from '../seo'

export function Seo() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = getPageSeo(pathname).title
  }, [pathname])
  return null
}
