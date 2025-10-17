# Backend Architecture Specification

**Project**: Music Playground
**Version**: 1.0
**Date**: 2025-10-16
**Status**: Planning (Post-MVP)

---

## Executive Summary

This document defines the backend architecture for Music Playground, designed to enable **cloud sync, sharing, and collaboration** features after the MVP launches with localStorage-only persistence.

**Key Principle**: Start with localStorage MVP, add backend incrementally without breaking existing users.

---

## Current State (MVP)

**Storage**: localStorage only
**Data Models**: Loop, Song, IconSound, ChordCell, IconStep, TimelineBlock
**User Model**: Single anonymous user per browser
**Sharing**: None (local only)
**Collaboration**: None

**MVP Constraints** (from PRODUCT_SPEC.md line 660):
```
✅ LocalStorage for persistence (no backend MVP)
```

---

## Backend Requirements (Post-MVP)

### Phase 7-8: Basic Backend (Optional Sync)
- Anonymous users can sync localStorage → cloud backup
- Generate shareable links for loops/songs (read-only)
- Optional user accounts (Firebase Auth)
- Backward compatible: localStorage users don't break

### Phase 9: Sharing & Export
- Public shareable URLs: `musicplayground.app/loop/abc123`
- Embed widget: `<iframe src="musicplayground.app/embed/abc123">`
- View count tracking
- Fork/remix feature (clone public loops)

### Phase 10: Collaboration
- Async collaboration: Fork → Edit → Share back
- Real-time (defer): Live editing with presence indicators
- User profiles: Display name, avatar, bio
- Explore page: Browse public loops/songs

### Phase 8: Sample Storage
- User uploads WAV/MP3 samples (max 5 MB per file)
- CDN delivery for fast loading
- Storage quota: 100 MB free tier, upgrade for more

---

## Technology Stack

### Backend Framework
**Choice**: Node.js + Express.js + TypeScript

**Rationale**:
- Matches existing monorepo TypeScript stack
- Fast iteration, full control
- Can reuse data model types from frontend
- Easy to deploy to Render.com (free tier available)

**Alternative considered**: Supabase (instant APIs, but vendor lock-in)

### Database
**Choice**: PostgreSQL with Prisma ORM

**Rationale**:
- JSONB for complex nested objects (chord_progression, icon_sequence)
- Type-safe queries with Prisma (generates TypeScript types)
- Migrations built-in (version control schema changes)
- Render.com has free PostgreSQL tier

**Schema Philosophy**:
- Store complex objects as JSONB (don't over-normalize)
- Keep frontend data models as source of truth
- Use UUIDs for all IDs (distributed, collision-resistant)

### File Storage
**Choice**: Cloudflare R2 (S3-compatible)

**Rationale**:
- Free tier: 10 GB storage + 1M reads/month
- No egress fees (unlike AWS S3)
- Fast CDN distribution
- S3-compatible API (easy migration if needed)

**Alternative**: AWS S3 (more expensive) or Supabase Storage (vendor lock-in)

### Authentication
**Choice**: Firebase Auth (optional, anonymous-first)

**Rationale**:
- Users start anonymous, can upgrade to account later
- Social logins: Google, GitHub (no password management)
- JWT tokens work with Express middleware
- Free tier: 50K MAU

**Flow**:
1. User visits site → anonymous localStorage user
2. User clicks "Sync to cloud" → creates anonymous backend account
3. User optionally signs in → links anonymous account to identity
4. No data loss during account linking

### Deployment
**Choice**: Render.com (Web Service + PostgreSQL)

**Rationale**:
- Free tier: Web service + PostgreSQL database
- Auto-deploy from GitHub (CI/CD built-in)
- Familiar from existing research (MCP render docs)
- Scales to paid tier when needed

**Alternative**: Vercel (frontend) + Supabase (backend)

---

## Database Schema

### SQL Schema (Prisma)

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(uuid())
  firebaseUid   String?   @unique // null for anonymous
  username      String?   @unique
  email         String?   @unique
  displayName   String?
  avatarUrl     String?
  isAnonymous   Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  loops         Loop[]
  songs         Song[]
  samples       Sample[]

  @@index([firebaseUid])
  @@index([username])
}

model Loop {
  id                String    @id @default(uuid())
  userId            String
  name              String
  length            Int       // 1, 2, 4, or 8 bars
  chordProgression  Json      // ChordCell[]
  iconSequence      Json      // IconStep[]
  color             String
  isPublic          Boolean   @default(false)
  viewCount         Int       @default(0)
  forkCount         Int       @default(0)
  forkedFrom        String?   // parent loop ID
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  sharedLinks       SharedLink[]

  @@index([userId])
  @@index([isPublic])
  @@index([createdAt])
}

model Song {
  id            String    @id @default(uuid())
  userId        String
  name          String
  bpm           Int
  timeSignature String    // "4/4" or "3/4"
  timeline      Json      // TimelineBlock[]
  totalBars     Int
  isPublic      Boolean   @default(false)
  viewCount     Int       @default(0)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  sharedLinks   SharedLink[]

  @@index([userId])
  @@index([isPublic])
}

model Sample {
  id            String    @id @default(uuid())
  userId        String
  name          String
  fileUrl       String    // Cloudflare R2 URL
  fileSize      Int       // bytes
  mimeType      String    // audio/wav, audio/mpeg
  duration      Float?    // seconds
  createdAt     DateTime  @default(now())

  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model SharedLink {
  id            String    @id @default(uuid())
  resourceType  String    // "loop" or "song"
  resourceId    String    // Loop.id or Song.id
  shareToken    String    @unique // random string for URL
  createdAt     DateTime  @default(now())
  expiresAt     DateTime? // null = never expires

  loop          Loop?     @relation(fields: [resourceId], references: [id], onDelete: Cascade)
  song          Song?     @relation(fields: [resourceId], references: [id], onDelete: Cascade)

  @@index([shareToken])
  @@index([resourceId])
}
```

### JSONB Structure

**chordProgression** (ChordCell[]):
```json
[
  { "bar": 0, "chord": "C maj7", "roman": "I", "root": "C", "quality": "maj7" },
  { "bar": 4, "chord": "G maj", "roman": "V", "root": "G", "quality": "maj" },
  { "bar": 8, "chord": "A min", "roman": "vi", "root": "A", "quality": "min" },
  { "bar": 12, "chord": "F maj", "roman": "IV", "root": "F", "quality": "maj" }
]
```

**iconSequence** (IconStep[]):
```json
[
  { "step": 0, "soundId": "synth-lead", "velocity": 0.8, "note": "C4" },
  { "step": 4, "soundId": "synth-lead", "velocity": 0.8, "note": "G4" },
  { "step": 8, "soundId": "synth-lead", "velocity": 0.8, "note": "A4" },
  { "step": 0, "soundId": "drum-kick", "velocity": 1.0 },
  { "step": 4, "soundId": "drum-kick", "velocity": 1.0 }
]
```

**timeline** (TimelineBlock[]):
```json
[
  { "id": "block-1", "loopId": "loop-abc", "startBar": 0, "duration": 4 },
  { "id": "block-2", "loopId": "loop-def", "startBar": 4, "duration": 8 },
  { "id": "block-3", "loopId": "loop-abc", "startBar": 12, "duration": 4 }
]
```

---

## REST API Design

### Base URL
```
Production: https://api.musicplayground.app
Development: http://localhost:3001
```

### Authentication
```
Authorization: Bearer <firebase-jwt-token>
```

Anonymous users get a server-generated token on first API call.

### Endpoints

#### **Loops**

```http
GET    /api/loops
List user's loops (paginated)

Query params:
  - page: number (default: 1)
  - limit: number (default: 20, max: 100)
  - public: boolean (filter public loops)

Response:
{
  "loops": Loop[],
  "total": number,
  "page": number,
  "hasMore": boolean
}
```

```http
POST   /api/loops
Create new loop

Body:
{
  "name": string,
  "length": 1 | 2 | 4 | 8,
  "chordProgression": ChordCell[],
  "iconSequence": IconStep[],
  "color": string,
  "isPublic": boolean
}

Response: Loop
```

```http
GET    /api/loops/:id
Get specific loop (auth required if private)

Response: Loop
```

```http
PATCH  /api/loops/:id
Update loop (auth required, must be owner)

Body: Partial<Loop>
Response: Loop
```

```http
DELETE /api/loops/:id
Delete loop (auth required, must be owner)

Response: { "success": true }
```

```http
POST   /api/loops/:id/fork
Fork public loop to user's library

Response: Loop (new copy)
```

```http
POST   /api/loops/:id/share
Generate shareable link

Body: { "expiresIn": number } // days, null = never

Response:
{
  "shareUrl": "https://musicplayground.app/loop/abc123xyz",
  "shareToken": "abc123xyz",
  "expiresAt": "2025-11-15T00:00:00Z"
}
```

#### **Songs**

```http
GET    /api/songs
List user's songs (paginated)

Response: { "songs": Song[], "total": number, ... }
```

```http
POST   /api/songs
Create new song

Body:
{
  "name": string,
  "bpm": number,
  "timeSignature": "4/4" | "3/4",
  "timeline": TimelineBlock[],
  "isPublic": boolean
}

Response: Song
```

```http
GET    /api/songs/:id
PATCH  /api/songs/:id
DELETE /api/songs/:id
POST   /api/songs/:id/share
Similar to loops endpoints
```

#### **Shared Resources**

```http
GET    /api/shared/:token
Access shared loop/song (public, no auth)

Response:
{
  "resourceType": "loop" | "song",
  "data": Loop | Song,
  "owner": { "displayName": string, "avatarUrl": string }
}
```

#### **Samples** (Phase 8)

```http
POST   /api/samples/upload
Upload audio sample

Content-Type: multipart/form-data
Body: { "file": File }

Response:
{
  "id": string,
  "name": string,
  "fileUrl": string,
  "fileSize": number,
  "duration": number
}
```

```http
GET    /api/samples
List user's samples

Response: { "samples": Sample[], "totalSize": number, "quota": number }
```

```http
DELETE /api/samples/:id
Delete sample

Response: { "success": true }
```

#### **Migration** (localStorage → Backend)

```http
POST   /api/migrate
Bulk upload localStorage data

Body:
{
  "loops": Loop[],  // from localStorage
  "songs": Song[]
}

Response:
{
  "loops": { "created": number, "failed": number },
  "songs": { "created": number, "failed": number },
  "idMapping": {  // old ID → new ID
    "loops": { "local-1": "uuid-abc", ... },
    "songs": { "local-2": "uuid-def", ... }
  }
}
```

This allows seamless migration from localStorage IDs to backend UUIDs.

#### **User Profile** (Phase 10)

```http
GET    /api/users/:username
Get public profile

Response:
{
  "username": string,
  "displayName": string,
  "avatarUrl": string,
  "publicLoops": Loop[],
  "publicSongs": Song[]
}
```

```http
PATCH  /api/users/me
Update own profile

Body: { "displayName": string, "avatarUrl": string }
Response: User
```

---

## Frontend Integration

### Service Layer (packages/api or apps/composer/src/api)

```typescript
// api/client.ts
import { getAuth } from 'firebase/auth'

class ApiClient {
  private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'

  private async getHeaders(): Promise<HeadersInit> {
    const auth = getAuth()
    const user = auth.currentUser
    const token = user ? await user.getIdToken() : null

    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  }

  async createLoop(data: CreateLoopDto): Promise<Loop> {
    const res = await fetch(`${this.baseUrl}/api/loops`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(data)
    })

    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
  }

  async getLoops(page = 1, limit = 20): Promise<PaginatedLoops> {
    const res = await fetch(
      `${this.baseUrl}/api/loops?page=${page}&limit=${limit}`,
      { headers: await this.getHeaders() }
    )

    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
  }

  // ... other methods
}

export const api = new ApiClient()
```

### Storage Abstraction Layer

```typescript
// storage/storage.interface.ts
interface StorageAdapter {
  getLoops(): Promise<Loop[]>
  getLoop(id: string): Promise<Loop | null>
  saveLoop(loop: Loop): Promise<Loop>
  deleteLoop(id: string): Promise<void>

  getSongs(): Promise<Song[]>
  getSong(id: string): Promise<Song | null>
  saveSong(song: Song): Promise<Song>
  deleteSong(id: string): Promise<void>
}

// storage/localStorage.adapter.ts
class LocalStorageAdapter implements StorageAdapter {
  async getLoops(): Promise<Loop[]> {
    const data = localStorage.getItem('loops')
    return data ? JSON.parse(data) : []
  }

  async saveLoop(loop: Loop): Promise<Loop> {
    const loops = await this.getLoops()
    const existing = loops.findIndex(l => l.id === loop.id)

    if (existing >= 0) {
      loops[existing] = loop
    } else {
      loops.push(loop)
    }

    localStorage.setItem('loops', JSON.stringify(loops))
    return loop
  }

  // ... other methods
}

// storage/api.adapter.ts
class ApiStorageAdapter implements StorageAdapter {
  async getLoops(): Promise<Loop[]> {
    const { loops } = await api.getLoops()
    return loops
  }

  async saveLoop(loop: Loop): Promise<Loop> {
    if (loop.id.startsWith('local-')) {
      // New loop, create on backend
      return api.createLoop(loop)
    } else {
      // Existing backend loop, update
      return api.updateLoop(loop.id, loop)
    }
  }

  // ... other methods
}

// storage/index.ts
export const storage: StorageAdapter =
  import.meta.env.VITE_USE_BACKEND === 'true'
    ? new ApiStorageAdapter()
    : new LocalStorageAdapter()
```

This abstraction allows switching between localStorage and backend without changing component code.

### Migration Flow (Frontend)

```typescript
// migration/migrate.ts
async function migrateToBackend() {
  const localLoops = JSON.parse(localStorage.getItem('loops') || '[]')
  const localSongs = JSON.parse(localStorage.getItem('songs') || '[]')

  const result = await api.migrate({ loops: localLoops, songs: localSongs })

  // Update local references with new UUIDs
  const newLoops = localLoops.map(loop => ({
    ...loop,
    id: result.idMapping.loops[loop.id]
  }))

  // Keep localStorage as cache
  localStorage.setItem('loops', JSON.stringify(newLoops))
  localStorage.setItem('migrated', 'true')
  localStorage.setItem('migratedAt', new Date().toISOString())

  // Switch to backend storage
  localStorage.setItem('useBackend', 'true')

  return result
}
```

---

## Security Considerations

### Authentication
- Anonymous users: Server-generated JWT with limited permissions
- Signed-in users: Firebase JWT with extended permissions
- Token expiry: 1 hour (refresh via Firebase SDK)

### Authorization
- Users can only CRUD their own loops/songs
- Public resources readable by anyone
- Shared links accessible with valid token (no auth)

### Rate Limiting
```typescript
// Rate limits per user per hour:
- GET requests: 1000
- POST/PATCH/DELETE: 100
- File uploads: 20
- Migration: 1 (one-time operation)
```

### File Upload Validation
```typescript
// Sample upload constraints:
- Max file size: 5 MB
- Allowed MIME types: audio/wav, audio/mpeg, audio/mp3
- Total quota per user: 100 MB (free tier)
- Scan for malware with ClamAV (optional)
```

### Input Validation
```typescript
// Validate all API inputs with Zod schemas:
const CreateLoopSchema = z.object({
  name: z.string().min(1).max(100),
  length: z.enum([1, 2, 4, 8]),
  chordProgression: z.array(ChordCellSchema),
  iconSequence: z.array(IconStepSchema),
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
  isPublic: z.boolean()
})
```

---

## Deployment Architecture

### Monorepo Structure (Post-Backend)

```
music-playground/
├── packages/
│   ├── engine/          # Audio engine (existing)
│   ├── ui/              # Neutralized (existing)
│   └── api/             # NEW: Express backend
│       ├── src/
│       │   ├── routes/
│       │   ├── middleware/
│       │   ├── services/
│       │   └── index.ts
│       ├── prisma/
│       │   └── schema.prisma
│       └── package.json
├── apps/
│   ├── composer/        # React app (existing)
│   └── lab/             # Experimental (existing)
└── package.json
```

### Environment Variables

**Backend** (`packages/api/.env`):
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/musicplayground
FIREBASE_PROJECT_ID=musicplayground-xyz
FIREBASE_SERVICE_ACCOUNT=./serviceAccountKey.json
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=musicplayground-samples
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://musicplayground.app
```

**Frontend** (`apps/composer/.env`):
```bash
VITE_API_URL=https://api.musicplayground.app
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=musicplayground-xyz.firebaseapp.com
VITE_USE_BACKEND=true
```

### Render.com Deployment

**Web Service** (packages/api):
- Build Command: `pnpm -w -F @music/api build`
- Start Command: `pnpm -w -F @music/api start`
- Environment: Node 20
- Instance Type: Free tier (0.1 CPU, 512 MB RAM)
- Auto-deploy: main branch

**PostgreSQL Database**:
- Plan: Free tier (1 GB storage)
- Region: Same as web service (low latency)
- Connection: Internal URL (no public access)

**Static Site** (apps/composer):
- Build Command: `pnpm -w -F composer build`
- Publish Directory: `apps/composer/dist`
- Environment: Static site
- CDN: Automatic (Render CDN)

---

## Performance Considerations

### Database Indexing
```sql
-- Indexes defined in Prisma schema:
CREATE INDEX idx_loops_user_id ON loops(user_id);
CREATE INDEX idx_loops_is_public ON loops(is_public);
CREATE INDEX idx_loops_created_at ON loops(created_at DESC);
CREATE INDEX idx_shared_links_token ON shared_links(share_token);
```

### Caching Strategy
- **Redis** (optional, post-optimization):
  - Cache public loops (TTL: 5 minutes)
  - Cache shared link lookups (TTL: 1 hour)
  - Cache user profiles (TTL: 10 minutes)

- **CDN** (Cloudflare):
  - Cache static assets (frontend)
  - Cache R2 sample files (audio)
  - Cache public loop JSON (stale-while-revalidate)

### Query Optimization
```typescript
// Prisma includes/selects to reduce payload:
const loops = await prisma.loop.findMany({
  where: { userId },
  select: {
    id: true,
    name: true,
    length: true,
    color: true,
    updatedAt: true,
    // Exclude heavy JSONB fields for list view
  },
  orderBy: { updatedAt: 'desc' },
  take: limit,
  skip: (page - 1) * limit
})
```

---

## Migration Roadmap

### Phase 6.5: Backend Foundation (2-3 weeks)
**Goal**: Backend exists but optional (localStorage still works)

**Tasks**:
1. Add `packages/api` to monorepo
2. Set up Express + TypeScript + Prisma
3. Deploy to Render.com (free tier)
4. Implement core CRUD endpoints (loops, songs)
5. Add Firebase Auth (anonymous + social)
6. Create storage abstraction layer in frontend
7. Add migration endpoint + UI flow

**Deliverable**: Users can sync localStorage to cloud

### Phase 7: Sharing (1-2 weeks)
**Goal**: Generate shareable links

**Tasks**:
1. Implement SharedLink model + endpoints
2. Add "Share" button to loop/song UI
3. Create public view page (`/loop/:token`)
4. Add view count tracking
5. Add embed widget (iframe)

**Deliverable**: Users can share loops via URL

### Phase 8: Samples (2-3 weeks)
**Goal**: Upload custom audio samples

**Tasks**:
1. Set up Cloudflare R2 bucket
2. Implement file upload endpoint + validation
3. Add sample browser UI in composer
4. Integrate samples with engine (Players)
5. Add storage quota tracking + warnings

**Deliverable**: Users can upload WAV/MP3 samples

### Phase 9: Collaboration (3-4 weeks)
**Goal**: Fork/remix public loops

**Tasks**:
1. Add "Fork" button to public loops
2. Implement user profiles page
3. Create explore/discover page
4. Add search/filter for public loops
5. Track fork lineage (forkedFrom)

**Deliverable**: Community can share and remix

### Phase 10: Real-time (4-6 weeks)
**Goal**: Live editing with collaborators (optional)

**Tasks**:
1. Add WebSocket server (Socket.IO)
2. Implement presence indicators
3. Add Operational Transform for conflict resolution
4. Add cursor tracking
5. Add chat/comments

**Deliverable**: Real-time collaboration

---

## Cost Estimates

### Free Tier (MVP → Phase 9)
- **Render.com Web Service**: Free (0.1 CPU, 512 MB RAM, sleeps after 15min idle)
- **Render.com PostgreSQL**: Free (1 GB storage, 97 connection limit)
- **Cloudflare R2**: Free (10 GB storage, 1M reads/month)
- **Firebase Auth**: Free (50K MAU)

**Total**: $0/month for <50K users with light usage

### Paid Tier (Growth)
- **Render.com Web Service**: $7/month (0.5 CPU, 512 MB RAM, always on)
- **Render.com PostgreSQL**: $7/month (10 GB storage, 97 connections)
- **Cloudflare R2**: $0.015/GB/month + $0.36/million reads (50 GB = ~$1/month)
- **Firebase Auth**: Free up to 50K MAU, then $0.0055/MAU

**Estimated at 10K active users**: ~$20-30/month

---

## Open Questions

1. **Anonymous account lifetime**: How long to keep anonymous users without sign-in? → 90 days of inactivity
2. **Storage quotas**: Free tier limits? → 100 MB samples, 1000 loops, 100 songs
3. **Moderation**: How to handle abusive public content? → Report button + manual review
4. **DMCA**: Sample uploads might violate copyright? → TOS disclaimer + takedown process
5. **Export format**: WAV, MP3, or both? → Start WAV (lossless), add MP3 later

---

## Success Metrics

### Backend Performance
- API response time (p95): < 200ms
- Database query time (p95): < 50ms
- File upload time: < 5s for 5 MB
- Uptime: > 99.5%

### User Adoption
- Migration rate: >50% of localStorage users sync to cloud
- Sharing rate: >20% of loops shared publicly
- Fork rate: >10% of public loops forked
- Sample upload rate: >5% of users upload samples

### Cost Efficiency
- Cost per active user: < $0.01/month
- Stay on free tier until 10K users
- Storage efficiency: < 10 KB per loop (JSONB compression)

---

## Approval Status

**Status**: Planning (awaiting user feedback)

**Next Steps**:
1. Get user approval on stack choices (Node + Prisma + Render)
2. Decide on migration timing (after MVP? after Phase 6?)
3. Create detailed backend implementation plan
4. Add backend tasks to project roadmap

---

**Document Owner**: Bradley Tangonan
**Last Updated**: 2025-10-16
**Version**: 1.0 (Initial Planning)
