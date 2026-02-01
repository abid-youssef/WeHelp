"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react"
import type { User, Advisor } from "@/mocks/seed-data"
import { getUsers, getAdvisors } from "@/mocks/store"

// Session persistence key
const SESSION_KEY = "atb_life_companion_session"

interface PersistedSession {
  userId?: string
  advisorId?: string
  isAdvisorMode: boolean
  hasConsented: boolean
}

interface AppContextType {
  currentUser: User | null
  setCurrentUser: (user: User | null) => void
  currentAdvisor: Advisor | null
  setCurrentAdvisor: (advisor: Advisor | null) => void
  isAdvisorMode: boolean
  setIsAdvisorMode: (mode: boolean) => void
  hasConsented: boolean
  setHasConsented: (consent: boolean) => void
  refreshKey: number
  triggerRefresh: () => void
  logout: () => void
  isSessionLoaded: boolean
}

const AppContext = createContext<AppContextType | null>(null)

// Helper to get persisted session
function getPersistedSession(): PersistedSession | null {
  if (typeof window === "undefined") return null
  try {
    const stored = sessionStorage.getItem(SESSION_KEY)
    if (stored) return JSON.parse(stored)
  } catch {
    // Ignore parse errors
  }
  return null
}

// Helper to persist session
function persistSession(session: PersistedSession) {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // Ignore storage errors
  }
}

// Helper to clear session
function clearPersistedSession() {
  if (typeof window === "undefined") return
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // Ignore storage errors
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<User | null>(null)
  const [currentAdvisor, setCurrentAdvisorState] = useState<Advisor | null>(null)
  const [isAdvisorMode, setIsAdvisorModeState] = useState(false)
  const [hasConsented, setHasConsentedState] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isSessionLoaded, setIsSessionLoaded] = useState(false)

  // Load persisted session on mount
  useEffect(() => {
    const session = getPersistedSession()
    if (session) {
      if (session.isAdvisorMode && session.advisorId) {
        const advisor = getAdvisors().find(a => a.id === session.advisorId)
        if (advisor) {
          setCurrentAdvisorState(advisor)
          setIsAdvisorModeState(true)
        }
      } else if (session.userId) {
        const user = getUsers().find(u => u.id === session.userId)
        if (user) {
          setCurrentUserState(user)
          setHasConsentedState(session.hasConsented)
        }
      }
    }
    setIsSessionLoaded(true)
  }, [])

  // Wrapped setters that also persist
  const setCurrentUser = useCallback((user: User | null) => {
    setCurrentUserState(user)
    if (user) {
      persistSession({
        userId: user.id,
        isAdvisorMode: false,
        hasConsented: hasConsented,
      })
    }
  }, [hasConsented])

  const setCurrentAdvisor = useCallback((advisor: Advisor | null) => {
    setCurrentAdvisorState(advisor)
    if (advisor) {
      persistSession({
        advisorId: advisor.id,
        isAdvisorMode: true,
        hasConsented: false,
      })
    }
  }, [])

  const setIsAdvisorMode = useCallback((mode: boolean) => {
    setIsAdvisorModeState(mode)
  }, [])

  const setHasConsented = useCallback((consent: boolean) => {
    setHasConsentedState(consent)
    // Update persisted session with consent
    const session = getPersistedSession()
    if (session) {
      persistSession({ ...session, hasConsented: consent })
    }
  }, [])

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  const logout = useCallback(() => {
    setCurrentUserState(null)
    setCurrentAdvisorState(null)
    setIsAdvisorModeState(false)
    setHasConsentedState(false)
    clearPersistedSession()
  }, [])

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        currentAdvisor,
        setCurrentAdvisor,
        isAdvisorMode,
        setIsAdvisorMode,
        hasConsented,
        setHasConsented,
        refreshKey,
        triggerRefresh,
        logout,
        isSessionLoaded,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useApp must be used within AppProvider")
  }
  return context
}
