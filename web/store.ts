import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'dark' | 'light'
export type ViewMode = 'card' | 'list'

interface UIState {
  theme: Theme
  view: ViewMode
  activeFolderId: string | null
  sidebarOpen: boolean
  searchQuery: string
  setTheme: (t: Theme) => void
  setView: (v: ViewMode) => void
  setActiveFolderId: (id: string | null) => void
  setSidebarOpen: (open: boolean) => void
  setSearchQuery: (q: string) => void
  toggleTheme: () => void
}

export const useStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      view: 'card',
      activeFolderId: null,
      sidebarOpen: false,
      searchQuery: '',
      setTheme: (theme) => set({ theme }),
      setView: (view) => set({ view }),
      setActiveFolderId: (activeFolderId) => set({ activeFolderId }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
    }),
    {
      name: 'notes-ui',
      partialize: (state) => ({ theme: state.theme, view: state.view }),
    },
  ),
)
