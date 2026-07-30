import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  theme: "dark" | "light";
  view: "list" | "card";
  activeFolder: string | null;
  selectedNoteId: string | null;
  showShared: boolean;
  sidebarOpen: boolean;
  searchQuery: string;
  toggleTheme: () => void;
  setView: (v: "list" | "card") => void;
  setActiveFolder: (f: string | null) => void;
  setSelectedNoteId: (id: string | null) => void;
  setShowShared: (v: boolean) => void;
  setSidebarOpen: (o: boolean | ((prev: boolean) => boolean)) => void;
  setSearchQuery: (q: string) => void;
}

const stored = typeof localStorage !== "undefined"
  ? (localStorage.getItem("theme") as "dark" | "light")
  : null;

export const useStore = create<UIState>()(
  persist(
    (set) => ({
      theme: stored || "dark",
      view: "list",
      activeFolder: null,
      selectedNoteId: null,
      showShared: false,
      sidebarOpen: false,
      searchQuery: "",
      toggleTheme: () =>
        set((s) => {
          const t = s.theme === "dark" ? "light" : "dark";
          document.documentElement.setAttribute("data-theme", t);
          return { theme: t };
        }),
      setView: (view) => set({ view }),
      setActiveFolder: (activeFolder) => set({ activeFolder }),
      setSelectedNoteId: (selectedNoteId) => set({ selectedNoteId }),
      setShowShared: (showShared) => set({ showShared }),
      setSidebarOpen: (sidebarOpen) =>
        set((s) => ({
          sidebarOpen: typeof sidebarOpen === "function" ? sidebarOpen(s.sidebarOpen) : sidebarOpen,
        })),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
    }),
    {
      name: "notes-ui",
      partialize: (s) => ({ theme: s.theme, view: s.view, activeFolder: s.activeFolder, selectedNoteId: s.selectedNoteId, showShared: s.showShared }),
    },
  ),
);
