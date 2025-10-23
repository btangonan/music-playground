# Lean Sharing Options for Music Playground

**Goal:** Enable loop sharing with minimal infrastructure

---

## Loop Data Analysis

**Typical Loop Size:**
```json
{
  "id": "uuid",
  "name": "My Beat",
  "bars": 4,
  "bpm": 120,
  "color": "#FFD11A",
  "chordProgression": [{"bar": 0, "chord": "Cmaj7"}, ...],  // ~10-20 items
  "iconSequence": [{"bar": 0, "row": 0, "soundId": "kick", ...}, ...],  // ~20-100 items
  "schemaVersion": 1,
  "updatedAt": "2025-10-23T..."
}
```

**Estimated size:** 500 bytes - 5 KB (compressed: 200 bytes - 2 KB)

---

## 🏆 RECOMMENDED: Option 1 - GitHub Gists (Free, Zero Setup)

### Why This Wins:
- ✅ **Completely free** (unlimited public gists)
- ✅ **Zero infrastructure** (GitHub provides storage + API)
- ✅ **Versioned** (see edit history)
- ✅ **Embeddable** (can display gist on other sites)
- ✅ **Simple API** (just REST calls, no server)
- ✅ **CDN-backed** (fast globally)
- ✅ **Optional auth** (can create anonymous gists without login)

### How It Works:
```
User clicks "Share Loop"
  ↓
Frontend creates GitHub Gist with loop JSON
  ↓
Returns shareable URL: https://gist.github.com/abc123
  ↓
Recipient opens URL → Frontend loads gist → Loop imported
```

### Implementation:
```typescript
// apps/composer/src/services/sharing.ts

const GITHUB_API = 'https://api.github.com'

interface ShareResult {
  url: string
  gistId: string
}

/**
 * Share loop via GitHub Gist (anonymous, no auth required)
 */
export async function shareLoop(loop: Loop): Promise<ShareResult> {
  const response = await fetch(`${GITHUB_API}/gists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: `Music Playground Loop: ${loop.name}`,
      public: true,
      files: {
        'loop.json': {
          content: JSON.stringify(loop, null, 2)
        }
      }
    })
  })

  if (!response.ok) throw new Error('Failed to create gist')

  const gist = await response.json()
  return {
    url: gist.html_url,
    gistId: gist.id
  }
}

/**
 * Load loop from GitHub Gist
 */
export async function loadSharedLoop(gistId: string): Promise<Loop> {
  const response = await fetch(`${GITHUB_API}/gists/${gistId}`)

  if (!response.ok) throw new Error('Failed to load gist')

  const gist = await response.json()
  const loopJson = gist.files['loop.json'].content

  return JSON.parse(loopJson)
}
```

### Usage:
```typescript
// Share button click
const { url, gistId } = await shareLoop(currentLoop)
navigator.clipboard.writeText(url)
alert(`Copied share link: ${url}`)

// Load from URL
const gistId = new URL(window.location).searchParams.get('gist')
if (gistId) {
  const loop = await loadSharedLoop(gistId)
  // Import into app
}
```

### Rate Limits:
- **Unauthenticated:** 60 requests/hour/IP (plenty for typical usage)
- **Authenticated:** 5,000 requests/hour (if you add GitHub OAuth)

### Deployment:
- **Static site only** - no backend needed!
- Works with current Render static site deployment

---

## Option 2: URL Hash Encoding (Zero Infrastructure)

### Why Consider:
- ✅ **Zero infrastructure** (everything in URL)
- ✅ **Instant** (no API calls)
- ✅ **Offline** (works without internet)
- ⚠️ **Limited** (URLs max ~2KB, ugly long URLs)

### How It Works:
```
User clicks "Share"
  ↓
Loop JSON → base64 encode → URL hash
  ↓
Share URL: https://app.com/#share=eyJpZCI6Ii4uLg==
  ↓
Recipient opens → Decode from URL → Load loop
```

### Implementation:
```typescript
// Encode loop to shareable URL
export function encodeLoopToURL(loop: Loop): string {
  const json = JSON.stringify(loop)
  const compressed = pako.deflate(json, { to: 'string' })
  const encoded = btoa(compressed)
  return `${window.location.origin}/#share=${encoded}`
}

// Decode loop from URL
export function decodeLoopFromURL(url: string): Loop | null {
  const match = url.match(/#share=(.+)/)
  if (!match) return null

  const encoded = match[1]
  const compressed = atob(encoded)
  const json = pako.inflate(compressed, { to: 'string' })
  return JSON.parse(json)
}
```

### Pros/Cons:
- ✅ Works completely offline
- ✅ No API rate limits
- ❌ URLs can be very long (2KB+ for complex loops)
- ❌ No versioning or edit history
- ❌ Can't update shared loops

**Best for:** Quick sharing, simple loops, offline demos

---

## Option 3: Cloudflare Workers + KV (Minimal Backend)

### Why Consider:
- ✅ **Generous free tier** (100k reads/day, 1k writes/day)
- ✅ **Global edge network** (fast everywhere)
- ✅ **No database** (simple KV store)
- ✅ **Short URLs** (yourapp.com/s/abc123)
- ⚠️ **Slight complexity** (need to deploy worker)

### Architecture:
```
POST /share → Worker → Save to KV → Return short ID
GET /load/:id → Worker → Read from KV → Return loop JSON
```

### Implementation:
```typescript
// Cloudflare Worker (deploy to workers.cloudflare.com)
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // Share endpoint
    if (url.pathname === '/share' && request.method === 'POST') {
      const loop = await request.json()
      const id = generateShortId() // nanoid(8)

      await env.LOOPS.put(id, JSON.stringify(loop), {
        expirationTtl: 60 * 60 * 24 * 365 // 1 year
      })

      return Response.json({ id, url: `${url.origin}/s/${id}` })
    }

    // Load endpoint
    if (url.pathname.startsWith('/s/')) {
      const id = url.pathname.split('/')[2]
      const loop = await env.LOOPS.get(id)

      if (!loop) return new Response('Not found', { status: 404 })

      return Response.json(JSON.parse(loop))
    }

    return new Response('Not found', { status: 404 })
  }
}
```

### Deployment:
```bash
npm create cloudflare@latest -- share-api
cd share-api
wrangler publish
```

### Cost:
- **Free tier:** 100k reads/day, 1k writes/day, 1 GB storage
- **Paid:** $5/month for 10M reads, unlimited writes

---

## Option 4: Firebase Firestore (Managed Backend)

### Why Consider:
- ✅ **Generous free tier** (1 GB storage, 50k reads/day)
- ✅ **Real-time sync** (collaborative editing possible)
- ✅ **Built-in auth** (Google, email, anonymous)
- ✅ **Offline support** (built-in caching)
- ⚠️ **Vendor lock-in** (tied to Google)

### Setup:
```bash
npm install firebase
```

### Implementation:
```typescript
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "...",
  projectId: "music-playground"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Share loop
export async function shareLoop(loop: Loop): Promise<string> {
  const docRef = doc(db, 'shared-loops', loop.id)
  await setDoc(docRef, loop)
  return `https://yourapp.com/?loop=${loop.id}`
}

// Load loop
export async function loadLoop(id: string): Promise<Loop | null> {
  const docRef = doc(db, 'shared-loops', id)
  const docSnap = await getDoc(docRef)
  return docSnap.exists() ? docSnap.data() as Loop : null
}
```

### Cost:
- **Free:** 1 GB storage, 50k reads/day, 20k writes/day
- **Paid:** Pay-as-you-go after free tier

---

## Option 5: Keep Full Backend (Original Plan)

### If you want FULL features:
- ✅ User accounts + authentication
- ✅ Private loops + permissions
- ✅ Analytics + usage tracking
- ✅ Loop collections/playlists
- ✅ Comments + reactions
- ✅ Multi-device sync

**Then keep:** PostgreSQL + API as originally planned

**But simplify:** Use managed DB (Neon, PlanetScale, Supabase free tier)

---

## 📊 Comparison Table

| Option | Cost | Setup | Features | Scalability |
|--------|------|-------|----------|-------------|
| **GitHub Gists** | Free | 5 min | Share, versioning | ∞ (GitHub CDN) |
| **URL Encoding** | Free | 10 min | Instant, offline | ∞ (no server) |
| **Cloudflare Workers** | Free tier | 30 min | Short URLs, fast | 100k reads/day |
| **Firebase** | Free tier | 20 min | Realtime, auth | 50k reads/day |
| **Full Backend** | $14/mo | 2 hours | All features | Depends on tier |

---

## 🏆 FINAL RECOMMENDATION

### For "Lean + Sharing":

**Use GitHub Gists** because:
1. Zero cost forever
2. Zero infrastructure
3. Works today (no setup delays)
4. Can upgrade later without breaking shared links
5. Solves your actual need: "share loop with friend"

### Implementation Steps:

1. **Add share button** in composer UI
2. **Create gist** with loop JSON on share
3. **Copy URL** to clipboard
4. **Add import** from gist ID in URL params
5. **Deploy** (no backend changes needed!)

### Upgrade Path (Later):

If you outgrow gists:
- Keep gist URLs working (backward compat)
- Add your own backend for advanced features
- Migrate popular loops to your DB

---

## 🚀 Quick Start: GitHub Gists Implementation

**Time to implement:** ~30 minutes

1. Copy `sharing.ts` code from Option 1 above
2. Add "Share" button to UI
3. Add gist ID detection on page load
4. Test with a friend
5. Done!

**No backend deployment needed.** Works with static site only.

---

**Questions to decide:**

1. Do you need user accounts? (If no → Gists)
2. Do you need private sharing? (If no → Gists)
3. Do you need edit history? (If yes → Gists have this!)
4. Do you need collaborative editing? (If yes → Firebase)
5. Do you want shortest URLs? (If yes → Cloudflare Workers)

**Most likely answer:** Start with Gists, upgrade if needed later.

