import { useEffect } from 'react'
import { useStore } from '../store'

export function ThemeSync() {
  const theme = useStore(s => s.theme)
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme) }, [theme])
  return null
}
