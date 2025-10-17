/**
 * Base HTTP client with retry logic and error handling
 * Provides exponential backoff retry for transient errors
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const MAX_RETRIES = 3
const RETRY_DELAY_BASE = 1000 // 1 second

/**
 * Custom API error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public isRetryable: boolean = false
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Determines if an HTTP status code indicates a retryable error
 */
function isRetryableStatus(status: number): boolean {
  // Retry on server errors and service unavailable
  return status === 500 || status === 502 || status === 503
}

/**
 * Delays execution for specified milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Fetches with exponential backoff retry logic
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, options)

      // Return immediately if successful or non-retryable error
      if (response.ok || !isRetryableStatus(response.status)) {
        return response
      }

      // Retry with exponential backoff
      if (attempt < retries - 1) {
        const backoff = RETRY_DELAY_BASE * Math.pow(2, attempt)
        await delay(backoff)
        continue
      }

      // Last attempt failed
      return response
    } catch (error) {
      // Network error - retry with backoff
      if (attempt < retries - 1) {
        const backoff = RETRY_DELAY_BASE * Math.pow(2, attempt)
        await delay(backoff)
        continue
      }

      // All retries exhausted
      throw new ApiError('Network error', 0, true)
    }
  }

  // This should never be reached, but TypeScript needs it
  throw new ApiError('Max retries exceeded', 0, false)
}

/**
 * Makes an HTTP request with authentication and retry logic
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  // Get auth token from localStorage
  const token = localStorage.getItem('auth_token')

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetchWithRetry(url, {
    ...options,
    headers,
  })

  // Handle error responses
  if (!response.ok) {
    const isRetryable = isRetryableStatus(response.status)
    let message = `HTTP ${response.status}`

    try {
      const errorData = await response.json()
      message = errorData.error || errorData.message || message
    } catch {
      // Response body not JSON or empty
      message = response.statusText || message
    }

    throw new ApiError(message, response.status, isRetryable)
  }

  // Parse JSON response
  try {
    return await response.json()
  } catch (error) {
    throw new ApiError('Invalid JSON response', response.status, false)
  }
}

/**
 * HTTP client with convenience methods
 */
export const httpClient = {
  /**
   * GET request
   */
  get<T>(endpoint: string): Promise<T> {
    return request<T>(endpoint, { method: 'GET' })
  },

  /**
   * POST request
   */
  post<T>(endpoint: string, data: unknown): Promise<T> {
    return request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * PUT request
   */
  put<T>(endpoint: string, data: unknown): Promise<T> {
    return request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  /**
   * DELETE request
   */
  delete<T>(endpoint: string): Promise<T> {
    return request<T>(endpoint, { method: 'DELETE' })
  },
}
