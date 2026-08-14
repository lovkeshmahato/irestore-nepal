import { useEffect, useState } from 'react'

/**
 * Tracks whether a CSS media query currently matches, updating on viewport
 * resize/orientation change. Used to thin out chart tick density and other
 * layout decisions that Tailwind's className breakpoints can't express
 * (e.g. recharts `interval` props, which need a JS boolean).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const listener = () => setMatches(mql.matches)
    listener()
    mql.addEventListener('change', listener)
    return () => mql.removeEventListener('change', listener)
  }, [query])

  return matches
}
