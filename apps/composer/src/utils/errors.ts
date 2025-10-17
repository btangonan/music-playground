/**
 * Error handling utilities
 * Provides user-friendly error messages and retry classification
 */

import { ApiError } from '../services/httpClient'

/**
 * Formatted error for UI display
 */
export interface FormattedError {
  message: string
  isRetryable: boolean
  statusCode?: number
}

/**
 * Formats an error for user-friendly display
 * @param error - Error from API or other sources
 * @returns Formatted error with user-friendly message
 */
export function formatApiError(error: unknown): FormattedError {
  // Handle ApiError instances
  if (error instanceof ApiError) {
    return {
      message: getUserFriendlyMessage(error),
      isRetryable: error.isRetryable,
      statusCode: error.statusCode,
    }
  }

  // Handle generic Error instances
  if (error instanceof Error) {
    return {
      message: error.message || 'An unexpected error occurred',
      isRetryable: false,
    }
  }

  // Handle unknown error types
  return {
    message: 'An unexpected error occurred',
    isRetryable: false,
  }
}

/**
 * Converts API errors to user-friendly messages
 */
function getUserFriendlyMessage(error: ApiError): string {
  // Network errors
  if (error.statusCode === 0) {
    return 'Network error. Please check your connection and try again.'
  }

  // Client errors (400-499)
  switch (error.statusCode) {
    case 400:
      return 'Invalid data. Please check your inputs and try again.'
    case 401:
      return 'Authentication required. Please log in.'
    case 403:
      return 'You don\'t have permission to perform this action.'
    case 404:
      return 'Loop not found. It may have been deleted.'
    case 409:
      return 'Conflict detected. The loop may have been modified.'
    case 429:
      return 'Too many requests. Please wait a moment and try again.'
  }

  // Server errors (500-599)
  if (error.statusCode >= 500) {
    return 'Server error. Please try again in a moment.'
  }

  // Fallback to original error message
  return error.message || 'An error occurred'
}

/**
 * Checks if an error should trigger a retry suggestion
 */
export function shouldSuggestRetry(error: FormattedError): boolean {
  return error.isRetryable || (error.statusCode !== undefined && error.statusCode >= 500)
}
