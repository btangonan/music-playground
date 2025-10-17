// API client for backend communication
import type { Loop } from '@music/types/schemas'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// Types
export interface User {
  id: string
  email: string
  username: string
  display_name: string
  avatar_url?: string | null
  created_at: string
}

export interface AuthResponse {
  user: User
  token: string
}

export interface ApiError {
  error: string
  details?: unknown
}

// Token management
class TokenManager {
  private static readonly TOKEN_KEY = 'music_playground_token'

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY)
  }

  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token)
  }

  static clearToken(): void {
    localStorage.removeItem(this.TOKEN_KEY)
  }

  static isAuthenticated(): boolean {
    return !!this.getToken()
  }
}

// API Client
class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = TokenManager.getToken()

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    })

    const data = await response.json()

    if (!response.ok) {
      // Handle 401 - clear token and redirect to login
      if (response.status === 401) {
        TokenManager.clearToken()
        window.location.href = '/login'
      }

      throw new Error(data.error || `HTTP ${response.status}`)
    }

    return data
  }

  // Auth endpoints
  async signup(email: string, username: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    })

    TokenManager.setToken(response.token)
    return response
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    TokenManager.setToken(response.token)
    return response
  }

  async getProfile(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/me')
  }

  logout(): void {
    TokenManager.clearToken()
    window.location.href = '/login'
  }

  // Loop endpoints
  async createLoop(loop: Loop): Promise<{ loop: Loop }> {
    return this.request<{ loop: Loop }>('/loops', {
      method: 'POST',
      body: JSON.stringify(loop),
    })
  }

  async getLoop(id: string): Promise<{ loop: Loop }> {
    return this.request<{ loop: Loop }>(`/loops/${id}`)
  }

  async updateLoop(id: string, loop: Loop): Promise<{ loop: Loop }> {
    return this.request<{ loop: Loop }>(`/loops/${id}`, {
      method: 'PUT',
      body: JSON.stringify(loop),
    })
  }

  async deleteLoop(id: string): Promise<void> {
    await this.request<void>(`/loops/${id}`, {
      method: 'DELETE',
    })
  }

  async listLoops(filters?: {
    public?: boolean
    limit?: number
    offset?: number
  }): Promise<{ loops: Loop[] }> {
    const params = new URLSearchParams()
    if (filters?.public !== undefined) params.set('public', String(filters.public))
    if (filters?.limit) params.set('limit', String(filters.limit))
    if (filters?.offset) params.set('offset', String(filters.offset))

    const query = params.toString() ? `?${params.toString()}` : ''
    return this.request<{ loops: Loop[] }>(`/loops${query}`)
  }

  async duplicateLoop(id: string): Promise<{ loop: Loop }> {
    return this.request<{ loop: Loop }>(`/loops/${id}/duplicate`, {
      method: 'POST',
    })
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await fetch(`${API_URL.replace('/api', '')}/health`)
    return response.json()
  }
}

// Export singleton instance
export const api = new ApiClient()
export { TokenManager }
