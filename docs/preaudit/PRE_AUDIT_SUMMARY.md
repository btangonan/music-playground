# Music Playground - Pre-Audit Summary

**Assessment Date**: 2025-10-20
**Repository Type**: Monorepo (pnpm + Turbo)
**Primary Language**: TypeScript
**Overall Maturity**: D+ (Early Stage) - Score 1.5/3

---

## Executive Summary

Music Playground is a web-based music creation tool built as a TypeScript monorepo with React frontend, Express API backend, and a headless audio engine. The codebase demonstrates **solid foundations** in secret management and persistence architecture, but has **critical gaps** in idempotency, testing, and code organization.

### Key Findings:
- ✅ **Secrets hygiene is strong** - No hardcoded credentials, env-based config with Zod validation
- ✅ **Durable persistence** - PostgreSQL + IndexedDB with proper schema design
- ⚠️ **Testing is weak** - Only 30-40% coverage, API routes completely untested
- ❌ **No idempotency** - Mutations not protected from duplicate requests
- ❌ **Large files** - 16 files exceed 300 LOC, violating Single Responsibility Principle

---

## Maturity Scores (0-3 Scale)

| Dimension | Score | Status | Target |
|-----------|-------|--------|--------|
| **LOC Discipline** | 1/3 | ⚠️ Needs Work | ≤5 files >300 LOC |
| **Validation Coverage** | 1/3 | ⚠️ Needs Work | ≥80% routes validated |
| **Secrets Hygiene** | 2/3 | ✅ Good | Production secret manager |
| **State & Persistence** | 2/3 | ✅ Good | Add idempotency + locking |
| **Errors/Retry/Idempotency** | 2/3 | ⚠️ Needs Work | Add idempotency keys |
| **Testing & CI/CD** | 1/3 | ⚠️ Needs Work | 70% coverage + full CI |

**Average Score**: 1.5/3 (50%)

---

## Top 3 Risks (Must Fix)

### 🔴 Risk #1: No Idempotency for Mutations
**Impact**: Network retries create duplicate loops/users
**Likelihood**: High (happens on poor network)
**Severity**: Critical (data corruption)

**Evidence**:
- `POST /api/loops` has no idempotency key
- `POST /api/auth/signup` relies on DB unique constraint (not idempotent)
- `PUT /api/loops/:id` has no optimistic locking

**Mitigation**:
```typescript
// Add Idempotency-Key header support
headers['Idempotency-Key'] = crypto.randomUUID()

// Server stores in idempotency_keys table
CREATE TABLE idempotency_keys (
  key UUID PRIMARY KEY,
  endpoint VARCHAR(255),
  response JSONB,
  expires_at TIMESTAMP
);
```

**Fix Estimate**: 1 PR, 2 files, 4 hours

---

### 🔴 Risk #2: API Routes Completely Untested
**Impact**: Bugs in production (auth failures, data loss)
**Likelihood**: Medium (no test coverage)
**Severity**: High (security + data loss)

**Evidence**:
- 0% coverage for `/api/auth/*` routes
- 0% coverage for `/api/loops/*` routes
- No integration tests for auth middleware
- CI only runs engine tests (skips API)

**Mitigation**:
```yaml
# Add to .github/workflows/ci.yml
- name: Test API
  run: cd apps/api && pnpm test
- name: Test Composer
  run: cd apps/composer && pnpm test
```

**Fix Estimate**: 1 PR, 3 files, 8 hours

---

### 🟡 Risk #3: Large Files Violate Single Responsibility
**Impact**: Hard to maintain, high bug risk
**Likelihood**: Medium (existing technical debt)
**Severity**: Medium (developer velocity impact)

**Evidence**:
- `packages/engine/src/audio-engine.ts` - 762 LOC (2.5x threshold)
- `apps/composer/src/components/IconSequencerWithDensity.tsx` - 726 LOC
- `apps/composer/src/components/ui/sidebar.tsx` - 726 LOC (duplicate)

**Mitigation**:
Split `audio-engine.ts` into:
- `audio-init.ts` - Context setup, IR loading (≤200 LOC)
- `audio-scheduler.ts` - Note scheduling, timing (≤250 LOC)
- `audio-fx.ts` - Effects routing, parameters (≤200 LOC)
- `audio-state.ts` - Playback state management (≤150 LOC)

**Fix Estimate**: 1 PR, 5 files, 6 hours

---

## Top 3 Strengths (Keep)

### ✅ Strength #1: Strong Secret Hygiene
**Evidence**:
- No hardcoded secrets found in source code
- Environment variables validated with Zod schemas
- `.env.example` present for documentation
- JWT secret length enforced (min 32 chars)

**Value**: Prevents credential leaks and security breaches

---

### ✅ Strength #2: Durable Persistence Architecture
**Evidence**:
- PostgreSQL with ACID transactions, foreign keys, triggers
- IndexedDB with versioned migrations
- Clear separation: server DB + client storage
- JSON flexibility for music data (JSONB columns)

**Value**: Data safety, reliability, and schema evolution support

---

### ✅ Strength #3: Exponential Backoff Retry
**Evidence**:
```typescript
// apps/composer/src/services/httpClient.ts
MAX_RETRIES = 3
Backoff: 1s → 2s → 4s (exponential)
Retries: 500, 502, 503, network errors
```

**Value**: Resilience to transient errors and poor network conditions

---

## 2-PR Minimum Fix Plan

### PR #1: Add Idempotency Keys (High Priority)
**Goal**: Prevent duplicate resource creation from network retries

**Files Changed** (2):
- `apps/api/src/routes/loops.ts` - Add Idempotency-Key header handling
- `apps/api/src/db/schema.sql` - Add idempotency_keys table

**Acceptance Criteria**:
1. `POST /api/loops` accepts `Idempotency-Key` header
2. Server stores key + response in DB (24h TTL)
3. Duplicate POST with same key returns cached response
4. Test: Verify POST retry doesn't create duplicate loop

**Tests**: Add integration test for idempotency behavior
**Docs**: Update API.md with Idempotency-Key usage
**Estimate**: 4 hours

---

### PR #2: Add API Tests + Enable in CI (High Priority)
**Goal**: Prevent bugs from reaching production

**Files Changed** (3):
- `apps/api/src/__tests__/routes/auth.test.ts` - New file
- `apps/api/src/__tests__/routes/loops.test.ts` - New file
- `.github/workflows/ci.yml` - Add API test step

**Acceptance Criteria**:
1. Test all `/api/auth` routes (signup, login, me)
2. Test all `/api/loops` routes (CRUD + duplicate)
3. CI runs API tests and enforces pass
4. Coverage ≥60% for routes + services

**Tests**: 10+ route tests covering happy + error paths
**Docs**: Update DEVELOPMENT.md with test instructions
**Estimate**: 8 hours

---

## Detailed Findings by Stage

### Stage 0: Repo Probe ✅
**Type**: Monorepo (pnpm workspaces + Turbo)
**Workspaces**: 3 apps (composer, api, lab), 2 packages (engine, ui), 1 shared (types)
**Languages**: TypeScript 95%, TSX 5%
**Build**: Turbo orchestration, Vite for frontend, tsc for packages
**Total Files**: 280 source files

---

### Stage 1: LOC Discipline (Score: 1/3)
**Threshold**: 300 LOC per file
**Violations**: 16 files (5.7% of codebase)

**Critical Violations**:
1. `packages/engine/src/audio-engine.ts` - **762 LOC** (2.5x threshold)
   - Violates SRP: initialization, scheduling, effects, state
   - Recommendation: Split into 4 modules

2. `apps/composer/src/components/IconSequencerWithDensity.tsx` - **726 LOC**
   - Complex UI with density controls, grid rendering, drag/drop
   - Recommendation: Extract 3 sub-components

3. `apps/composer/src/components/ui/sidebar.tsx` - **726 LOC**
   - Duplicate of `packages/ui/src/components/sidebar.tsx` (637 LOC)
   - Recommendation: Consolidate to packages/ui

**Target**: Reduce to ≤5 files over 300 LOC (1.8%)

---

### Stage 2: Frameworks & Routes ✅
**Backend**: Express.js 4.18
**Frontend**: React 18.3 + Vite 5.4
**UI Library**: Radix UI + shadcn/ui
**Styling**: TailwindCSS 3.4

**API Routes** (10 total):
- `GET /health` - Health check
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User authentication
- `GET /api/auth/me` - Get current user
- `GET /api/loops` - List loops
- `GET /api/loops/:id` - Get specific loop
- `POST /api/loops` - Create loop
- `PUT /api/loops/:id` - Update loop
- `DELETE /api/loops/:id` - Delete loop
- `POST /api/loops/:id/duplicate` - Remix loop

---

### Stage 3: Validation Coverage (Score: 1/3)
**Library**: Zod 3.23
**Coverage**: 40% (4/10 routes have request validation)

**Validated Routes** (4):
- ✅ `POST /api/auth/signup` - signupSchema (email, username, password)
- ✅ `POST /api/auth/login` - loginSchema (email, password)
- ✅ `POST /api/loops` - LoopSchema (in service layer)
- ✅ `PUT /api/loops/:id` - LoopSchema (in service layer)

**Unvalidated Routes** (6):
- ❌ `GET /api/loops` - Query params not validated
- ❌ `GET /api/loops/:id` - No URL param validation
- ❌ `DELETE /api/loops/:id` - No URL param validation
- ❌ `POST /api/loops/:id/duplicate` - No validation
- ❌ `GET /api/auth/me` - JWT middleware only
- ❌ `GET /health` - N/A (acceptable)

**Weaknesses**:
- No response validation
- No query parameter schemas
- No URL parameter validation (UUID format)
- Validation inconsistent (some routes, some services)

**Target**: ≥80% routes with request+response validation

---

### Stage 4: Secrets Hygiene (Score: 2/3)
**Method**: dotenv + process.env + Zod validation

**Strengths**:
- ✅ No hardcoded secrets in code
- ✅ `.env.example` present
- ✅ Zod schema enforces types and min lengths
- ✅ JWT_SECRET min 32 chars enforced

**Weaknesses**:
- ⚠️ Weak JWT_SECRET fallback: `'change-me-in-production-min-32-chars-long'`
- ❌ No secret rotation mechanism
- ❌ No secret manager (AWS Secrets Manager, Vault)
- ❌ No runtime validation in production startup

**Recommendation**: Remove JWT_SECRET fallback, fail fast if not set

---

### Stage 5: State & Persistence (Score: 2/3)

**Backend (PostgreSQL)**:
- ✅ ACID transactions
- ✅ Foreign key constraints (CASCADE DELETE)
- ✅ JSONB for flexible music data
- ✅ GIN indexes for JSON queries
- ✅ Triggers for auto-update timestamps

**Frontend (IndexedDB)**:
- ✅ idb library (Promise-based)
- ✅ Schema versioning with migrations
- ✅ Object stores: loops, songs, samples
- ✅ Fallback to LocalStorage

**Gaps**:
- ❌ No idempotency keys
- ❌ No optimistic locking (PUT conflicts possible)
- ❌ ApiSyncAdapter can have sync conflicts

**Target**: Durable + idempotent + optimistic locking

---

### Stage 6: Errors/Retry/Idempotency (Score: 2/3)

**Error Handling**:
- ✅ Try/catch in routes
- ✅ Global error handler
- ✅ JSON error format `{ error: "message" }`
- ✅ HTTP status codes semantic (400, 401, 403, 404, 500)
- ✅ Zod validation errors include details

**Retry Logic**:
- ✅ Frontend exponential backoff (1s, 2s, 4s)
- ✅ Retries: 500, 502, 503, network errors
- ❌ No jitter (thundering herd risk)
- ❌ HTTP 429 not retried
- ❌ No backend retry for DB

**Idempotency**:
- ❌ No idempotency keys
- ❌ No optimistic locking
- ❌ Duplicate POST creates duplicate resources

**Target**: Problem+JSON + retries + idempotency + DLQ

---

### Stage 7: Testing & CI/CD (Score: 1/3)

**Test Framework**: Vitest 2.x
**Test Files**: 10
**Assertions**: 346+
**Estimated Coverage**: 30-40%

**Tested Areas**:
- ✅ Engine API surface (60%)
- ✅ Storage adapters
- ✅ Schema validation
- ✅ E2E loop API

**Untested Areas**:
- ❌ API routes (0%)
- ❌ API services (0%)
- ❌ React components (5%)
- ❌ Auth middleware
- ❌ Database queries

**CI/CD**:
- ✅ GitHub Actions on push/PR
- ✅ Build + test engine
- ✅ Bundle size gate (150 KB)
- ❌ API tests not run
- ❌ Composer tests not run
- ❌ No coverage reporting
- ❌ No lint/typecheck gates

**Target**: 70% coverage + all tests in CI

---

## Recommendations by Priority

### 🔴 Critical (Fix Immediately)
1. Add idempotency keys to POST endpoints
2. Add API route integration tests
3. Enable all tests in CI
4. Add coverage reporting

### 🟡 High (Next Sprint)
5. Refactor audio-engine.ts (762 LOC → 4 modules)
6. Add optimistic locking to PUT endpoints
7. Add query parameter validation
8. Add response validation

### 🟢 Medium (Future)
9. Add secret manager for production
10. Add Problem+JSON error format
11. Add jitter to retry backoff
12. Add React component tests
13. Add E2E tests to CI

### ⚪ Low (Nice to Have)
14. Performance testing
15. Visual regression testing
16. Accessibility testing
17. Deployment automation

---

## Next Steps

1. **Review this audit** with team
2. **Prioritize fixes** based on risk
3. **Execute PR #1** (Idempotency) - 4 hours
4. **Execute PR #2** (API Tests) - 8 hours
5. **Re-audit** after fixes to measure progress

---

## Artifacts Generated

All audit artifacts saved to `docs/preaudit/`:

1. `repo-shape.json` - Repository structure and frameworks
2. `oversized-files.json` - Files exceeding 300 LOC
3. `hotspots.md` - Top 20 files by LOC with refactoring recommendations
4. `frameworks.json` - Framework and API route mapping
5. `api-validation.json` - Validation coverage analysis
6. `secrets-findings.json` - Secret scanning results
7. `state-map.md` - Persistence architecture documentation
8. `error-surface.md` - Error handling and retry analysis
9. `test-landscape.md` - Testing coverage and CI/CD analysis
10. `maturity.json` - Maturity scores with evidence
11. `PRE_AUDIT_SUMMARY.md` - This executive summary

---

**End of Pre-Audit Summary**

For questions or clarifications, refer to individual artifact files in `docs/preaudit/`.
