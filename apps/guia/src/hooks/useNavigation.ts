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

const DEFAULT_SERIE = '6º Ano'
const DEFAULT_COMP  = 'Matemática'

const INITIAL_FILTERS: Record<TabId, Filters> = {
  comecar:     { serie: DEFAULT_SERIE, comp: DEFAULT_COMP, bim: '' },
  ae:          { serie: DEFAULT_SERIE, comp: DEFAULT_COMP, bim: '' },
  escopo:      { serie: DEFAULT_SERIE, comp: DEFAULT_COMP, bim: '1º Bimestre' },
  habilidades: { serie: DEFAULT_SERIE, comp: DEFAULT_COMP, bim: '' },
  matriz:      { serie: DEFAULT_SERIE, comp: DEFAULT_COMP, bim: '' },
}

/** Propaga série e componente para todas as outras abas, preservando o bim de cada uma. */
function propagateShared(prev: Record<TabId, Filters>, serie?: string, comp?: string): Record<TabId, Filters> {
  const next = { ...prev }
  for (const t of VALID_TABS) {
    next[t] = {
      ...prev[t],
      ...(serie !== undefined ? { serie } : {}),
      ...(comp  !== undefined ? { comp  } : {}),
    }
  }
  return next
}

export function useNavigation() {
  const isPopState  = useRef(false)
  const navReady    = useRef(false)
  const filtersRef  = useRef<Record<TabId, Filters>>(INITIAL_FILTERS)

  const [activeTab, setActiveTabInternal] = useState<TabId>(
    () => hashToTab(window.location.hash)
  )
  const [filtersPerTab, setFiltersPerTab] = useState<Record<TabId, Filters>>(INITIAL_FILTERS)

  // Sincroniza ref com o estado (para leitura fora de updaters)
  useEffect(() => { filtersRef.current = filtersPerTab }, [filtersPerTab])

  // Pusha estado no histórico quando a aba muda por navegação programática
  useEffect(() => {
    if (!navReady.current || isPopState.current) return
    const state: NavState = { tab: activeTab, filters: filtersRef.current[activeTab] }
    history.pushState(state, '', '#' + activeTab)
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Restore state on popstate (browser Back/Forward)
  useEffect(() => {
    const initialTab = hashToTab(window.location.hash)
    if (!history.state?.tab) {
      history.replaceState(
        { tab: initialTab, filters: INITIAL_FILTERS[initialTab] } as NavState,
        '',
        '#' + initialTab,
      )
    }
    navReady.current = true

    const handler = (e: PopStateEvent) => {
      const st = e.state as NavState | null
      if (!st?.tab) return
      isPopState.current = true
      setActiveTabInternal(st.tab)
      if (st.filters) {
        setFiltersPerTab(prev => ({ ...prev, [st.tab]: st.filters }))
      }
      setTimeout(() => { isPopState.current = false }, 0)
    }
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  const goToTab = useCallback((tab: TabId, filters?: Partial<Filters>) => {
    setFiltersPerTab(prev => {
      const updated = filters ? { ...prev[tab], ...filters } : prev[tab]
      const next = propagateShared(prev, updated.serie, updated.comp)
      next[tab] = updated
      return next
    })
    setActiveTabInternal(tab)
  }, [])

  const updateFilters = useCallback((tab: TabId, filters: Partial<Filters>) => {
    setFiltersPerTab(prev => {
      const updated = { ...prev[tab], ...filters }
      const next = propagateShared(
        prev,
        'serie' in filters ? filters.serie : undefined,
        'comp'  in filters ? filters.comp  : undefined,
      )
      next[tab] = updated
      return next
    })
    if (navReady.current && !isPopState.current) {
      const tab_ = tab
      setTimeout(() => {
        const state: NavState = { tab: tab_, filters: filtersRef.current[tab_] }
        history.replaceState(state, '', '#' + tab_)
      }, 0)
    }
  }, [])

  return { activeTab, goToTab, updateFilters, filtersPerTab }
}
