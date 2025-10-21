# Error Handling, Retries, and Idempotency Analysis

## Error Handling Patterns

### Backend (Express API)

#### Error Handling Approach:
- **Route-level try/catch**: Each route wrapped in try/catch
- **Global error handler**: Catches unhandled errors (apps/api/src/index.ts:39-44)
- **404 handler**: Dedicated handler for unknown routes
- **Status codes**: Appropriate HTTP status codes (400, 401, 403, 404, 500)
- **Error messages**: JSON format `{ error: "message" }` or `{ error: "...", details: [...] }`

#### Error Examples:
```typescript
// Validation errors (Zod)
if (error instanceof z.ZodError) {
  return res.status(400).json({ error: 'Validation error', details: error.errors })
}

// Business logic errors
throw new Error('Loop not found')  // Caught and returned as 404

// Generic errors
res.status(500).json({ error: error.message })
```

#### Strengths:
- ✅ Consistent JSON error format
- ✅ Global error handler prevents crashes
- ✅ Zod validation errors include details
- ✅ HTTP status codes semantic (400, 401, 403, 404, 500)

#### Weaknesses:
- ❌ No structured error types (not Problem+JSON RFC 7807)
- ❌ Error handling duplicated across routes
- ❌ No error logging/monitoring
- ❌ No error tracking IDs for debugging
- ❌ Stack traces in production (security concern)

### Frontend (Composer App)

#### Error Handling Approach:
- **Custom ApiError class**: Structured errors with statusCode, isRetryable
- **Error formatting**: User-friendly messages via `formatApiError()`
- **Retry classification**: Identifies retryable errors (500, 502, 503)
- **User messaging**: Maps status codes to friendly strings

#### Error Classes:
```typescript
class ApiError {
  message: string
  statusCode: number
  isRetryable: boolean  // ✅ Retry classification present
}

interface FormattedError {
  message: string
  isRetryable: boolean
  statusCode?: number
}
```

#### Strengths:
- ✅ User-friendly error messages
- ✅ Retry classification (isRetryable flag)
- ✅ Network error detection (statusCode === 0)
- ✅ Client error vs server error distinction

#### Weaknesses:
- ❌ No automatic retry in UI (only suggestion)
- ❌ No error reporting/telemetry
- ❌ No offline detection

## Retry Logic

### Frontend HTTP Client (apps/composer/src/services/httpClient.ts)

#### Retry Configuration:
```typescript
MAX_RETRIES = 3
RETRY_DELAY_BASE = 1000  // 1 second
Backoff strategy: Exponential (1s, 2s, 4s)
```

#### Retry Conditions:
- ✅ Network errors (fetch fails)
- ✅ HTTP 500 (Internal Server Error)
- ✅ HTTP 502 (Bad Gateway)
- ✅ HTTP 503 (Service Unavailable)
- ❌ HTTP 429 (Too Many Requests) - NOT retried
- ❌ HTTP 408 (Request Timeout) - NOT retried

#### Retry Logic:
```typescript
function isRetryableStatus(status: number): boolean {
  return status === 500 || status === 502 || status === 503
}

// Exponential backoff
const backoff = RETRY_DELAY_BASE * Math.pow(2, attempt)  // 1s, 2s, 4s
await delay(backoff)
```

#### Strengths:
- ✅ Exponential backoff implemented
- ✅ Network errors retried
- ✅ Max retries enforced (prevents infinite loops)
- ✅ Server errors (500, 502, 503) retried

#### Weaknesses:
- ❌ No jitter in backoff (thundering herd risk)
- ❌ HTTP 429 not retried (should respect Retry-After header)
- ❌ No circuit breaker pattern
- ❌ Retry logic only in frontend (backend doesn't retry DB/external calls)

### Backend Retry Logic:
- ❌ **No retry logic** for database operations
- ❌ **No retry logic** for external API calls
- ❌ PostgreSQL transient errors not retried
- ❌ No connection pool retry on exhaustion

## Idempotency

### Current State: ❌ NO IDEMPOTENCY KEYS

#### Mutations Without Idempotency:
1. **POST /api/auth/signup**
   - Risk: Network retry creates duplicate users
   - Current: Email unique constraint prevents duplicates (DB-level, not idempotent)

2. **POST /api/loops**
   - Risk: Network retry creates duplicate loops
   - Current: NO protection - duplicate POST = duplicate loop

3. **POST /api/loops/:id/duplicate**
   - Risk: Network retry creates multiple remixes
   - Current: NO protection

4. **PUT /api/loops/:id**
   - Risk: Concurrent updates cause lost writes
   - Current: Last-write-wins (no optimistic locking)

#### GET Requests (Naturally Idempotent):
- ✅ GET /api/loops
- ✅ GET /api/loops/:id
- ✅ GET /api/auth/me

#### DELETE Requests (Idempotent by SQL):
- ✅ DELETE /api/loops/:id
   - Multiple deletes safe (2nd returns 404, acceptable)

### Recommendations for Idempotency:

#### High Priority:
1. **Add Idempotency-Key header** for POST requests
   ```typescript
   // Client generates UUID
   headers['Idempotency-Key'] = crypto.randomUUID()

   // Server stores in DB
   CREATE TABLE idempotency_keys (
     key UUID PRIMARY KEY,
     endpoint VARCHAR(255),
     user_id UUID,
     response JSONB,
     created_at TIMESTAMP,
     expires_at TIMESTAMP
   );
   ```

2. **Add optimistic locking** for PUT requests
   ```typescript
   // Include version in request
   PUT /api/loops/:id
   Body: { ..., updatedAt: "2025-01-15T10:00:00Z" }

   // Check version before update
   UPDATE loops SET ... WHERE id = $1 AND updated_at = $2

   // Return 409 Conflict if version mismatch
   ```

#### Medium Priority:
3. **Idempotent loop creation**
   - Use client-generated UUIDs for loop IDs
   - Server checks if ID exists before INSERT

## Error Handling Maturity Score: 2/3

**Rationale:**
- ✅ Structured error handling (try/catch, global handler)
- ✅ Exponential backoff retry on frontend (500, 502, 503)
- ✅ User-friendly error messages
- ⚠️ No Problem+JSON standard
- ⚠️ No error logging/monitoring
- ❌ No idempotency keys
- ❌ No optimistic locking
- ❌ No backend retry for DB/external calls

## Comparison to VIBE Non-Negotiables

### ✅ Partial Compliance:
- Errors standardized (JSON format, status codes)
- Retries present (frontend HTTP client)
- Fail fast (validation errors return 400 immediately)

### ❌ Missing:
- **Not Problem+JSON** (RFC 7807)
- **No idempotency** keys for mutations
- **No DLQ** (Dead Letter Queue) for failed operations
- **No circuit breaker** for cascading failures

## Recommendations

### High Priority (Fix Now):
1. Add idempotency-key support to POST endpoints
2. Add optimistic locking to PUT endpoints
3. Add jitter to retry backoff to prevent thundering herd
4. Retry HTTP 429 with Retry-After header respect

### Medium Priority (Next Sprint):
5. Implement Problem+JSON error format (RFC 7807)
6. Add error logging/monitoring (Sentry, LogRocket, etc.)
7. Add unique request IDs for tracing
8. Retry database transient errors

### Low Priority (Future):
9. Circuit breaker pattern for external dependencies
10. Dead Letter Queue for failed async operations
11. Error budget tracking and alerting
