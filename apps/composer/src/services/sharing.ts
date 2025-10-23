/**
 * Lean sharing via GitHub Gists
 * Zero infrastructure - uses GitHub's free API for storage
 * Rate limit: 60 requests/hour (unauthenticated)
 */

import type { Loop } from '@music/types/schemas'

const GITHUB_API = 'https://api.github.com'

export interface ShareResult {
  url: string
  gistId: string
  rawUrl: string
}

export interface ShareError {
  message: string
  retryable: boolean
}

/**
 * Share a loop by creating a public GitHub Gist
 * @returns Shareable URL and gist metadata
 * @throws ShareError if creation fails
 */
export async function shareLoop(loop: Loop): Promise<ShareResult> {
  try {
    const response = await fetch(`${GITHUB_API}/gists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        description: `Music Playground Loop: ${loop.name}`,
        public: true,
        files: {
          'loop.json': {
            content: JSON.stringify(loop, null, 2),
          },
          'README.md': {
            content: generateReadme(loop),
          },
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))

      // Handle rate limiting
      if (response.status === 403 && errorData.message?.includes('rate limit')) {
        throw {
          message: 'Rate limit exceeded. Please try again in a few minutes.',
          retryable: true,
        } as ShareError
      }

      throw {
        message: errorData.message || `Failed to create share link (${response.status})`,
        retryable: response.status >= 500,
      } as ShareError
    }

    const gist = await response.json()

    return {
      url: gist.html_url,
      gistId: gist.id,
      rawUrl: gist.files['loop.json'].raw_url,
    }
  } catch (error) {
    if ((error as ShareError).message) {
      throw error
    }

    throw {
      message: 'Network error. Please check your connection.',
      retryable: true,
    } as ShareError
  }
}

/**
 * Load a loop from a GitHub Gist
 * @param gistId - Gist ID (e.g., "abc123def456")
 * @returns Loop data
 * @throws ShareError if load fails
 */
export async function loadSharedLoop(gistId: string): Promise<Loop> {
  try {
    const response = await fetch(`${GITHUB_API}/gists/${gistId}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        throw {
          message: 'Shared loop not found. The link may be invalid or expired.',
          retryable: false,
        } as ShareError
      }

      throw {
        message: `Failed to load shared loop (${response.status})`,
        retryable: response.status >= 500,
      } as ShareError
    }

    const gist = await response.json()
    const loopFile = gist.files['loop.json']

    if (!loopFile) {
      throw {
        message: 'Invalid share format. Missing loop data.',
        retryable: false,
      } as ShareError
    }

    const loopData = JSON.parse(loopFile.content)
    return loopData as Loop
  } catch (error) {
    if ((error as ShareError).message) {
      throw error
    }

    throw {
      message: 'Network error. Please check your connection.',
      retryable: true,
    } as ShareError
  }
}

/**
 * Extract gist ID from various GitHub URL formats
 * Supports:
 * - https://gist.github.com/username/abc123
 * - https://gist.github.com/abc123
 * - abc123 (direct ID)
 */
export function extractGistId(input: string): string | null {
  // Direct gist ID (alphanumeric, typically 32 chars)
  if (/^[a-f0-9]{32}$/i.test(input)) {
    return input
  }

  // Full gist URL
  const match = input.match(/gist\.github\.com\/(?:[^/]+\/)?([a-f0-9]{32})/i)
  return match ? match[1] : null
}

/**
 * Check GitHub API rate limit status
 */
export async function checkRateLimit(): Promise<{
  limit: number
  remaining: number
  reset: Date
}> {
  try {
    const response = await fetch(`${GITHUB_API}/rate_limit`)
    const data = await response.json()

    return {
      limit: data.rate.limit,
      remaining: data.rate.remaining,
      reset: new Date(data.rate.reset * 1000),
    }
  } catch {
    // Return conservative estimates if check fails
    return {
      limit: 60,
      remaining: 30,
      reset: new Date(Date.now() + 60 * 60 * 1000),
    }
  }
}

/**
 * Generate README.md content for the gist
 */
function generateReadme(loop: Loop): string {
  return `# ${loop.name}

A loop created with [Music Playground](https://music-playground.onrender.com)

## Details
- **BPM:** ${loop.bpm}
- **Bars:** ${loop.bars}
- **Chords:** ${loop.chordProgression.length} chord changes
- **Icons:** ${loop.iconSequence.length} notes
- **Updated:** ${new Date(loop.updatedAt).toLocaleDateString()}

## Open in App
[Load this loop in Music Playground](https://music-playground.onrender.com?gist=${loop.id})

## Data
See \`loop.json\` for the complete loop data.
`
}

/**
 * Generate share URL for the app (not the gist)
 */
export function generateAppShareUrl(gistId: string): string {
  const baseUrl = window.location.origin
  return `${baseUrl}?gist=${gistId}`
}
