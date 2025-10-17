/**
 * Authentication hook
 * Provides auth state and token management
 *
 * MVP: Uses hardcoded test token
 * Phase 4: Replace with real authentication UI
 */

import { useState, useEffect } from 'react'

/**
 * Test JWT token for MVP
 * Valid until: 2025-11-15
 * User: testuser (id: 0cdae54a-5bf1-4c0b-9c58-7241b3c0ff2f)
 *
 * Token payload:
 * {
 *   "id": "0cdae54a-5bf1-4c0b-9c58-7241b3c0ff2f",
 *   "email": "test@example.com",
 *   "username": "testuser",
 *   "iat": 1760648301,
 *   "exp": 1761253101
 * }
 */
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjBjZGFlNTRhLTViZjEtNGMwYi05YzU4LTcyNDFiM2MwZmYyZiIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInVzZXJuYW1lIjoidGVzdHVzZXIiLCJpYXQiOjE3NjA2NDgzMDEsImV4cCI6MTc2MTI1MzEwMX0.XOqfNUUod3BLKxFXYx2JyuCXiZSZ8mg42u8fqhHc-JE'

/**
 * Auth state interface
 */
interface AuthState {
  token: string | null
  isAuthenticated: boolean
  setToken: (token: string | null) => void
  logout: () => void
}

/**
 * Authentication hook
 * Manages auth token in localStorage
 *
 * @returns Auth state and methods
 */
export function useAuth(): AuthState {
  const [token, setToken] = useState<string | null>(() => {
    // Initialize from localStorage or use test token
    const stored = localStorage.getItem('auth_token')
    return stored || TEST_TOKEN
  })

  // Sync token to localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('auth_token', token)
    } else {
      localStorage.removeItem('auth_token')
    }
  }, [token])

  // Auto-set test token on first load if no token exists
  useEffect(() => {
    const stored = localStorage.getItem('auth_token')
    if (!stored) {
      localStorage.setItem('auth_token', TEST_TOKEN)
      setToken(TEST_TOKEN)
    }
  }, [])

  return {
    token,
    setToken,
    isAuthenticated: !!token,
    logout: () => setToken(null),
  }
}
