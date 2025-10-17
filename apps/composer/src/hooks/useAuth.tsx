// Authentication state management hook
import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { api, TokenManager, type User } from '../services/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, username: string, password: string) => Promise<void>
  logout: () => void
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load user profile on mount if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (TokenManager.isAuthenticated()) {
        try {
          const { user } = await api.getProfile()
          setUser(user)
        } catch (error) {
          console.error('Failed to load user profile:', error)
          TokenManager.clearToken()
        }
      }
      setIsLoading(false)
    }

    loadUser()
  }, [])

  const login = async (email: string, password: string) => {
    const { user } = await api.login(email, password)
    setUser(user)
  }

  const signup = async (email: string, username: string, password: string) => {
    const { user } = await api.signup(email, username, password)
    setUser(user)
  }

  const logout = () => {
    setUser(null)
    api.logout()
  }

  const refreshProfile = async () => {
    const { user } = await api.getProfile()
    setUser(user)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
