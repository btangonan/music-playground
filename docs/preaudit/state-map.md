# State & Persistence Architecture

## Backend Persistence (API)

### Database: PostgreSQL 15+
**Connection**: `pg` library, connection pooling
**Location**: `apps/api/src/db/`

#### Tables:
1. **users**
   - Primary key: UUID
   - Indexes: username, email
   - Constraints: email format, username length (3+ chars)
   - Cascade: DELETE → loops, songs, likes

2. **loops**
   - Primary key: UUID
   - Foreign keys: user_id → users, parent_loop_id → loops (remixes)
   - JSONB columns: chord_progression, icon_sequence
   - GIN indexes on JSONB for fast queries
   - Constraints: bars IN (1,2,4,8), bpm 40-300, color hex format
   - Social counters: plays_count, likes_count, remixes_count

3. **songs**
   - Primary key: UUID
   - Foreign keys: user_id → users
   - JSONB column: timeline (song arrangement)
   - Constraints: bpm 40-300, time_signature IN ('4/4', '3/4')

4. **loop_likes, song_likes**
   - Many-to-many join tables
   - Composite primary keys: (user_id, loop_id)

#### Triggers:
- `update_updated_at()` - Auto-update timestamps on UPDATE

#### State Characteristics:
- ✅ Durable persistence (PostgreSQL)
- ✅ ACID transactions
- ✅ Foreign key constraints enforced
- ✅ JSON schema flexibility for music data
- ❌ No idempotency keys detected
- ❌ No distributed locking

## Frontend Persistence (Composer App)

### Storage Adapters (Strategy Pattern)
**Location**: `apps/composer/src/storage/`

#### 1. IndexedDBAdapter (Primary)
- **Database**: `music-playground-v1`
- **Library**: `idb` (Promise-based wrapper)
- **Object Stores**: loops, songs, samples (Blob storage)
- **Key-value design**: Simple get/put/delete operations
- **Versioning**: DB_VERSION = 1, schema migrations on upgrade
- **State**: Client-side persistence, survives page refresh
- **Capacity**: ~50MB+ (browser-dependent)

#### 2. LocalStorageAdapter (Fallback)
- **Storage**: browser localStorage
- **Data**: JSON serialized
- **Capacity**: ~5-10MB limit
- **Use case**: Fallback for browsers without IndexedDB

#### 3. ApiSyncAdapter (Cloud Sync)
- **Backend**: Express API (/api/loops, /api/songs)
- **Authentication**: JWT bearer token
- **Sync pattern**: Manual push/pull (no real-time sync)
- **Conflict resolution**: Last-write-wins (updated_at timestamp)

### Migration System
**File**: `apps/composer/src/storage/migrate.ts`
- Schema versioning support
- Forward migrations only (no rollback)
- Applied on app initialization

## State Management (Frontend)

### React State
- **Component state**: useState for local UI state
- **Context API**: Auth context (user, token, login/logout)
- **No global store**: No Redux/Zustand detected
- **Form state**: react-hook-form for form management

### Transient State (Audio Engine)
**Location**: `packages/engine/src/audio-engine.ts`
- **In-memory only**: Tone.js audio graph, scheduled notes
- **Lifetime**: Page session (cleared on refresh)
- **Size**: 762 LOC (⚠️ needs refactoring)
- **Statefulness**:
  - Active synths, effects, reverb convolver
  - Scheduled Transport events
  - Macro parameter mappings
  - NO cross-request persistence

## Cross-Request State Analysis

### ✅ Stateless Components:
- **Express routes**: No in-memory state between requests
- **JWT auth**: Stateless token-based authentication
- **Database queries**: No connection state leaks

### ⚠️ Potential Issues:
- **Connection pool**: Shared pg connection pool
  - Could leak connections if queries don't close properly
  - Need connection timeout monitoring

- **Frontend storage**:
  - IndexedDB may have stale data if API updates elsewhere
  - No real-time sync or cache invalidation
  - Conflict potential with concurrent edits

### ❌ Missing Patterns:
- **No idempotency keys**: Loop/song creation not idempotent
  - Duplicate POST = duplicate resource
  - Risk: Network retry creates duplicates
- **No optimistic locking**: UPDATE without version checks
  - Risk: Lost updates with concurrent edits
- **No distributed state**: Single PostgreSQL instance
  - No Redis for caching or sessions
  - No pub/sub for real-time updates

## Persistence Maturity Score: 2/3

**Rationale:**
- ✅ Durable PostgreSQL with proper schema
- ✅ Client-side IndexedDB with migration support
- ✅ No cross-request in-memory state detected
- ⚠️ No idempotency keys for mutations
- ⚠️ No optimistic locking for concurrent updates
- ⚠️ Sync conflicts possible with ApiSyncAdapter

## Recommendations

### High Priority:
1. **Add idempotency keys** to POST /api/loops, POST /api/songs
   - Use client-generated UUID as idempotency-key header
   - Store in DB to detect retries

2. **Add optimistic locking** to PUT /api/loops/:id
   - Use `updated_at` timestamp as version
   - Return 409 Conflict if timestamps don't match

### Medium Priority:
3. **Add cache invalidation** to ApiSyncAdapter
   - Clear local IndexedDB when sync detects server changes
   - Or use ETags for conditional requests

4. **Connection pool monitoring**
   - Add pg pool metrics (active, idle, waiting)
   - Set max connections and timeouts

### Low Priority:
5. **Consider Redis** for:
   - Session storage (if JWT not sufficient)
   - Real-time loop play counters
   - Rate limiting per user
