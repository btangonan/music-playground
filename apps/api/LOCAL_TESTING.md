# Local Backend Testing Guide

Complete guide to test the Music Playground API locally.

## Prerequisites

### 1. Install PostgreSQL

**macOS (via Homebrew)**:
```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Add to PATH (add to your ~/.zshrc or ~/.bashrc)
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"

# Reload shell
source ~/.zshrc
```

**Alternative: Postgres.app** (easier for macOS):
- Download from https://postgresapp.com/
- Drag to Applications folder
- Open and click "Initialize"
- Add to PATH: `sudo mkdir -p /etc/paths.d && echo /Applications/Postgres.app/Contents/Versions/latest/bin | sudo tee /etc/paths.d/postgresapp`

**Verify Installation**:
```bash
psql --version
# Should show: psql (PostgreSQL) 15.x
```

---

## Setup Steps

### 2. Create Database

```bash
# Create the database (uses your system username by default)
createdb music_playground

# Verify database was created
psql -l | grep music_playground
```

### 3. Configure Environment

```bash
cd apps/api

# Copy example env file
cp .env.example .env

# Edit .env file with your configuration
```

**Example `.env` configuration** (for local development):
```bash
# Server Configuration
SERVER_PORT=3001

# CORS Configuration (matches composer dev server)
CORS_ORIGIN=http://localhost:5173

# Database Configuration (adjust username if needed)
DATABASE_URL=postgresql://bradleytangonan:@localhost:5432/music_playground
DATABASE_SSL=false

# JWT Configuration (change in production!)
JWT_SECRET=local-dev-secret-key-min-32-chars-do-not-use-in-production-ok
JWT_EXPIRES_IN=7d

# Environment
NODE_ENV=development
```

**Note**: Replace `bradleytangonan` in DATABASE_URL with your macOS username if different.

### 4. Run Database Migration

```bash
cd apps/api

# Run migration script to create tables
pnpm db:migrate
```

**Expected output**:
```
🔄 Running database migrations...
✅ Database migrations completed successfully
```

### 5. Start Backend Server

```bash
# From apps/api directory
pnpm dev
```

**Expected output**:
```
🚀 API server running on port 3001
📍 Health check: http://localhost:3001/health
🔐 Auth endpoints: http://localhost:3001/api/auth
🎵 Loop endpoints: http://localhost:3001/api/loops
```

---

## Testing the API

### Test 1: Health Check

```bash
curl http://localhost:3001/health
```

**Expected response**:
```json
{"status":"ok","timestamp":"2025-10-16T..."}
```

### Test 2: User Signup

```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "testpass123"
  }'
```

**Expected response**:
```json
{
  "user": {
    "id": "...",
    "email": "test@example.com",
    "username": "testuser",
    "display_name": "testuser"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Save the token** for subsequent requests!

### Test 3: Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }'
```

### Test 4: Get Profile (requires token)

```bash
# Replace YOUR_TOKEN_HERE with actual token from signup/login
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test 5: Create Loop (requires token)

```bash
curl -X POST http://localhost:3001/api/loops \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "id": "test-loop-1",
    "name": "My First Loop",
    "bars": 4,
    "color": "#FFD11A",
    "bpm": 120,
    "chordProgression": [
      {"bar": 0, "chord": "Cmaj7"},
      {"bar": 1, "chord": "Am7"},
      {"bar": 2, "chord": "Dm7"},
      {"bar": 3, "chord": "G7"}
    ],
    "iconSequence": [
      {"bar": 0, "row": 0, "soundId": "kick", "velocity": 0.8},
      {"bar": 1, "row": 1, "soundId": "snare", "velocity": 0.7}
    ],
    "schemaVersion": 1,
    "updatedAt": "2025-10-16T12:00:00Z"
  }'
```

### Test 6: List Loops

```bash
# Public loops (no auth required)
curl http://localhost:3001/api/loops?public=true

# Your loops (requires auth)
curl http://localhost:3001/api/loops \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test 7: Get Specific Loop

```bash
curl http://localhost:3001/api/loops/test-loop-1 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test 8: Update Loop

```bash
curl -X PUT http://localhost:3001/api/loops/test-loop-1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "id": "test-loop-1",
    "name": "Updated Loop Name",
    "bars": 4,
    "color": "#FFD11A",
    "bpm": 130,
    "chordProgression": [{"bar": 0, "chord": "Cmaj7"}],
    "iconSequence": [],
    "schemaVersion": 1,
    "updatedAt": "2025-10-16T12:30:00Z"
  }'
```

### Test 9: Duplicate Loop

```bash
curl -X POST http://localhost:3001/api/loops/test-loop-1/duplicate \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test 10: Delete Loop

```bash
curl -X DELETE http://localhost:3001/api/loops/test-loop-1 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Troubleshooting

### Database Connection Error

**Error**: `connection refused` or `database does not exist`

**Solution**:
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# Start PostgreSQL if not running
brew services start postgresql@15

# Verify database exists
psql -l | grep music_playground

# If database doesn't exist, create it
createdb music_playground
```

### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3001`

**Solution**:
```bash
# Find process using port 3001
lsof -i :3001

# Kill the process (replace PID with actual process ID)
kill -9 PID

# Or change port in .env
SERVER_PORT=3002
```

### JWT Token Invalid

**Error**: `Invalid or expired token`

**Solution**:
- Ensure JWT_SECRET in .env is at least 32 characters
- Get a fresh token by logging in again
- Check Authorization header format: `Bearer <token>`

### Migration Already Run

**Error**: `relation "users" already exists`

**Solution**: This is expected if you've run migration before. Skip to starting the server.

To reset database:
```bash
# Drop and recreate database
dropdb music_playground
createdb music_playground
pnpm db:migrate
```

---

## Verify Everything Works

Run this complete test sequence:

```bash
# 1. Health check
curl http://localhost:3001/health

# 2. Signup
TOKEN=$(curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"testpass123"}' \
  | jq -r '.token')

# 3. Create loop
curl -X POST http://localhost:3001/api/loops \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "id": "test-1",
    "name": "Test Loop",
    "bars": 4,
    "bpm": 120,
    "chordProgression": [{"bar": 0, "chord": "C"}],
    "iconSequence": [],
    "schemaVersion": 1,
    "updatedAt": "2025-10-16T12:00:00Z"
  }'

# 4. List loops
curl http://localhost:3001/api/loops \
  -H "Authorization: Bearer $TOKEN"

# 5. Success!
echo "✅ All tests passed!"
```

---

## Next Steps After Local Testing

Once local testing is successful:

1. **Frontend Integration**: Create API client in composer app
2. **Deployment**: Deploy to Railway or Render
3. **Production Config**: Update JWT_SECRET and DATABASE_URL for production
4. **SSL**: Enable DATABASE_SSL=true for production database

---

## Database Inspection

View data directly in PostgreSQL:

```bash
# Connect to database
psql music_playground

# List tables
\dt

# View users
SELECT id, email, username FROM users;

# View loops
SELECT id, name, user_id, bars, bpm FROM loops;

# Exit psql
\q
```
