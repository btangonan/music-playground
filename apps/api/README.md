# Music Playground API

Backend API for Music Playground - Loop creation and management service.

## Architecture

- **Framework**: Express.js + TypeScript
- **Database**: PostgreSQL 15+ with JSONB support
- **Authentication**: JWT-based stateless auth
- **Validation**: Zod schemas (reused from frontend)

## Project Structure

```
apps/api/
├── src/
│   ├── config/          # Configuration with Zod validation
│   ├── db/              # Database client and migrations
│   ├── middleware/      # Auth middleware
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic layer
│   └── index.ts         # Express app entry point
├── .env.example         # Environment variable template
├── package.json
└── tsconfig.json
```

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your configuration
# Required:
# - DATABASE_URL (PostgreSQL connection string)
# - JWT_SECRET (min 32 characters)
```

### 3. Create Database

```bash
# Create PostgreSQL database
createdb music_playground

# Or using psql:
psql -U postgres -c "CREATE DATABASE music_playground;"
```

### 4. Run Migrations

```bash
pnpm db:migrate
```

### 5. Start Development Server

```bash
pnpm dev
```

API will be available at `http://localhost:3001`

## API Endpoints

### Authentication

**POST /api/auth/signup**
```json
{
  "email": "user@example.com",
  "username": "musicmaker",
  "password": "securepassword"
}
```

**POST /api/auth/login**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**GET /api/auth/me** (requires JWT)
- Headers: `Authorization: Bearer <token>`

### Loops

**GET /api/loops** (optional auth)
- Query params: `public=true`, `limit=20`, `offset=0`

**GET /api/loops/:id** (optional auth)

**POST /api/loops** (requires JWT)
```json
{
  "id": "abc123",
  "name": "My Loop",
  "bars": 4,
  "color": "#FFD11A",
  "bpm": 120,
  "chordProgression": [...],
  "iconSequence": [...],
  "schemaVersion": 1,
  "updatedAt": "2025-01-15T12:00:00Z"
}
```

**PUT /api/loops/:id** (requires JWT, owner only)

**DELETE /api/loops/:id** (requires JWT, owner only)

**POST /api/loops/:id/duplicate** (requires JWT)
- Creates a copy of the loop owned by the authenticated user

## Idempotency

### What is Idempotency?

Idempotency ensures that retrying a POST request (e.g., due to network failure) doesn't create duplicate resources. If you retry a request with the same `Idempotency-Key`, the API returns the cached response instead of creating a duplicate.

### Supported Endpoints

The following POST endpoints support idempotency:
- `POST /api/loops` - Create loop
- `POST /api/loops/:id/duplicate` - Duplicate loop

### Usage

Include an `Idempotency-Key` header with a UUID v4 value:

```bash
curl -X POST http://localhost:3001/api/loops \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "name": "My Loop",
    "bars": 4,
    "color": "#FFD11A",
    "bpm": 120,
    "chordProgression": [],
    "iconSequence": [],
    "schemaVersion": 1,
    "updatedAt": "2025-01-15T12:00:00Z"
  }'
```

### Client Example

Generate a UUID v4 for each unique request:

```typescript
import { randomUUID } from 'crypto' // Node.js
// or
const uuid = crypto.randomUUID() // Browser

async function createLoop(loopData: Loop) {
  const idempotencyKey = randomUUID()

  const response = await fetch('/api/loops', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(loopData),
  })

  return response.json()
}
```

### Key Properties

- **Optional**: Idempotency-Key header is optional. Requests without it are processed normally.
- **TTL**: Idempotency keys expire after 24 hours.
- **User-scoped**: Keys are scoped per user for security (prevents cross-user replay attacks).
- **Format**: Must be a valid UUID v4. Invalid format returns 400 error.

### Behavior

**First Request** (creates resource):
```bash
POST /api/loops
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
→ 201 Created { loop: { id: "abc123", ... } }
```

**Retry** (returns cached response):
```bash
POST /api/loops
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
→ 201 Created { loop: { id: "abc123", ... } }  # Same response, no duplicate created
```

**Different Key** (creates new resource):
```bash
POST /api/loops
Idempotency-Key: 660e9500-f39c-52e5-b827-557766551111
→ 201 Created { loop: { id: "def456", ... } }  # New loop created
```

## Database Schema

See `src/db/schema.sql` for complete schema definition.

### Key Tables

- **users**: User accounts with authentication
- **loops**: Loop data with JSONB chord/icon storage
- **loop_likes**: Social features (optional)

## Development

```bash
# Development with auto-reload
pnpm dev

# Build for production
pnpm build

# Run production build
pnpm start

# Run tests
pnpm test
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SERVER_PORT` | API server port | `3001` |
| `CORS_ORIGIN` | Frontend origin for CORS | `http://localhost:5173` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/dbname` |
| `DATABASE_SSL` | Enable SSL for database | `false` (local), `true` (production) |
| `JWT_SECRET` | Secret key for JWT signing (min 32 chars) | `your-super-secret-key...` |
| `JWT_EXPIRES_IN` | JWT token expiration | `7d` |
| `NODE_ENV` | Environment mode | `development` or `production` |

## Deployment

### Railway

1. Create new project on Railway
2. Add PostgreSQL database service
3. Add environment variables from `.env.example`
4. Deploy from GitHub repository

### Render

1. Create new Web Service
2. Add PostgreSQL database
3. Set environment variables
4. Build command: `pnpm build`
5. Start command: `pnpm start`

## Security Notes

- JWT tokens expire after 7 days by default
- Passwords hashed with bcrypt (10 rounds)
- CORS configured for frontend origin only
- Helmet.js for security headers
- Input validation with Zod schemas

## Integration with Frontend

Frontend should:
1. Store JWT token in localStorage or secure cookie
2. Include token in Authorization header: `Bearer <token>`
3. Use same Zod schemas for client-side validation
4. Handle 401 (auth required) and 403 (forbidden) responses

Example frontend API client:

```typescript
const API_URL = 'http://localhost:3001/api'

async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('jwt_token')

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error)
  }

  return response.json()
}
```
