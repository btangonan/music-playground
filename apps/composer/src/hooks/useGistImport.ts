/**
 * Hook to handle importing loops from GitHub Gists via URL params
 * Automatically detects ?gist=xxx in URL and loads the loop
 */

import { useEffect, useState } from 'react'
import { loadSharedLoop, extractGistId, type ShareError } from '../services/sharing'
import type { Loop } from '@music/types/schemas'

interface GistImportState {
  isLoading: boolean
  loop: Loop | null
  error: string | null
  gistId: string | null
}

export function useGistImport(): GistImportState {
  const [state, setState] = useState<GistImportState>({
    isLoading: false,
    loop: null,
    error: null,
    gistId: null,
  })

  useEffect(() => {
    // Check URL params for gist ID
    const params = new URLSearchParams(window.location.search)
    const gistParam = params.get('gist')

    if (!gistParam) return

    const gistId = extractGistId(gistParam)

    if (!gistId) {
      setState({
        isLoading: false,
        loop: null,
        error: 'Invalid gist link format',
        gistId: null,
      })
      return
    }

    // Load the gist
    setState(prev => ({ ...prev, isLoading: true, gistId }))

    loadSharedLoop(gistId)
      .then(loop => {
        setState({
          isLoading: false,
          loop,
          error: null,
          gistId,
        })

        // Clean up URL (remove gist param after successful load)
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('gist')
        window.history.replaceState({}, '', newUrl.toString())
      })
      .catch((err: ShareError) => {
        setState({
          isLoading: false,
          loop: null,
          error: err.message,
          gistId,
        })
      })
  }, []) // Run once on mount

  return state
}
