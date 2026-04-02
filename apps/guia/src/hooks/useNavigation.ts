import { useState, useEffect, useRef, useCallback } from 'react'

export type TabId = 'comecar' | 'ae' | 'escopo' | 'habilidades' | 'matriz'

const VALID_TABS: TabId[] = ['comecar','ae','escopo','habilidades','matriz']

function hashToTab(hash: string): TabId {
  const id = hash.replace('#','') as TabId
  return VALID_TABS.includes(id) ? id : 'comecar'
}

export interface Filters {
  serie: string
  comp: string
  bim: string
}

export interface NavState {
  tab: TabId
  filters: Filters
}

export function useNavigation() {
  const navReady = useRef(false)
  const [activeTab, setActiveTabInternal] = useState<TabId>(
    () => hashToTab(window.location.hash)
  )
  const [filtersPerTab, setFiltersPerTab] = useState<Record<TabId, Filters>>({
    comecar:     { serie: '', comp: '', bim: '' },
    ae:          { serie: '', comp: '', bim: '' },
    escopo:      { serie: '', comp: '', bim: '' },
    habilidades: { serie: '', comp: '', bim: '' },
    matriz:      { serie: '', comp: '', bim: '' },
  })

  // Restore state on popstate (browser Back)
  useEffect(() => {
    navReady.current = true
    const handler = (e: PopStateEvent) => {
      const st = e.state as NavState | null
      if (!st?.tab) return
      navReady.current = false
      setActiveTabInternal(st.tab)
      if (st.filters) {
        setFiltersPerTab(prev => ({ ...prev, [st.tab]: st.filters }))
      }
      setTimeout(() => { navReady.current = true }, 0)
    }
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  const goToTab = useCallback((tab: TabId, filters?: Partial<Filters>) => {
    setFiltersPerTab(prev => {
      const updated = filters ? { ...prev[tab], ...filters } : prev[tab]
      const next = { ...prev, [tab]: updated }
      if (navReady.current) {
        const state: NavState = { tab, filters: updated }
        history.pushState(state, '', '#' + tab)
      }
      return next
    })
    setActiveTabInternal(tab)
  }, [])

  const updateFilters = useCallback((tab: TabId, filters: Partial<Filters>) => {
    setFiltersPerTab(prev => {
      const updated = { ...prev[tab], ...filters }
      if (navReady.current) {
        const state: NavState = { tab, filters: updated }
        history.replaceState(state, '', '#' + tab)
      }
      return { ...prev, [tab]: updated }
    })
  }, [])

  return { activeTab, goToTab, updateFilters, filtersPerTab }
}
